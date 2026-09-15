/**
 * 全库 L4 标签重打标（LLM 判别 + 受控词表闸门）。
 *
 * 为什么需要：题库里存在大量「老分类器遗留错标」。早期 TECH_MAP 每个模块只有
 * 六七个候选标签，不在专业领域内的题统统落进最近的桶：
 *   - be-data  的 Spark DataFrame 题 → 标「微服务」（题面命中率 2%）
 *   - fe-harmony 的 UIAbility 生命周期题 → 标「JavaScript」（4%）
 *   - op-trad  的变更窗口/配置管理题 → 标「CI/CD」（0%）
 * 这类题在赛道归属（subtrack）上是对的，只有 L4 标签错，因此重打标只在赛道内重选。
 *
 * 为什么用 LLM 而不是纯关键词：关键词探针有双向失败——既会把「讲深拷贝但不写
 * JavaScript 的题」误判为错标，也会漏掉「讲 Spark 但没写 Spark 的题」。
 * 让 LLM 在受控候选集内重选，两种情况都能正确处理。
 *
 * 安全设计：
 *   - 只处理显式命中的「赛道 × 原标签」桶，范围外题目零改动
 *   - LLM 返回值必须落在受控候选集内，否则保留原标签（不允许 LLM 造新标签）
 *   - 写库前自动备份，全量走单事务
 *
 * 用法：
 *   node scripts/retag-llm.mjs                 # dry-run，输出判定分布与抽样
 *   node scripts/retag-llm.mjs --apply         # 写库
 *   node scripts/retag-llm.mjs --rate 0.6      # 命中率阈值放宽到 60%
 *   node scripts/retag-llm.mjs --samples 5     # 每桶抽样条数
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const getArg = (k, d) => {
  const i = process.argv.indexOf('--' + k)
  return i > 0 ? process.argv[i + 1] : d
}
const APPLY = args.has('--apply')
const RATE = Number(getArg('rate', 0.5))
const SAMPLES = Number(getArg('samples', 3))
const BATCH = Number(getArg('batch', 12))
const CONC = Number(getArg('concurrency', 5))

const DB_FILE = path.join(ROOT, 'data', 'devmentor.db')

function loadTs (rel, expr) {
  const code = `import('./${rel}').then(m => console.log(JSON.stringify(${expr})))`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '-e', code], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  }).trim().split('\n').pop())
}

const TAXONOMY = loadTs('app/data/learningTaxonomy.ts', 'm.LEARNING_TAXONOMY')
const VOCAB = loadTs('app/data/techVocabulary.ts', 'm.TECH_VOCABULARY')

const MODULE_OF = {}
const TRACK_BY_ID = {}
for (const [mod, tracks] of Object.entries(TAXONOMY)) {
  for (const t of tracks) { MODULE_OF[t.id] = mod; TRACK_BY_ID[t.id] = t }
}
/** 赛道允许的受控标签名 */
function vocabAllows (module, trackId) {
  return VOCAB.filter(v => v.module === module && (v.allowTracks === '*' || v.allowTracks.includes(trackId))).map(v => v.name)
}

import { PROBE } from './tech-probe.mjs'


const KEY = process.env.DEEPSEEK_API_KEY
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const MODEL = process.env.LLM_MODEL || 'deepseek-chat'
if (!KEY) { console.error('缺少 DEEPSEEK_API_KEY'); process.exit(1) }

async function callLlm (messages, opts = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0, max_tokens: opts.maxTokens || 1200, stream: false }),
    signal: AbortSignal.timeout(opts.timeoutMs || 60000)
  })
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`LLM ${res.status}: ${t.slice(0, 160)}`) }
  const d = await res.json()
  const c = d?.choices?.[0]?.message?.content?.trim() || ''
  if (!c) throw new Error('LLM 返回空')
  return c
}

function extractJson (txt) {
  const s = txt.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
  const i = s.indexOf('['); const j = s.lastIndexOf(']')
  if (i >= 0 && j > i) { try { return JSON.parse(s.slice(i, j + 1)) } catch { /* fallthrough */ } }
  const a = s.indexOf('{'); const b = s.lastIndexOf('}')
  if (a >= 0 && b > a) { try { const o = JSON.parse(s.slice(a, b + 1)); return Object.values(o)[0] } catch { /* fallthrough */ } }
  return null
}

const db = new Database(DB_FILE)

// ---- 1. 筛选疑似错标的桶 ----
const buckets = []
for (const [mod, tracks] of Object.entries(TAXONOMY)) {
  for (const t of tracks) {
    const tid = t.id
    const dist = db.prepare('select tech, count(*) c from interview_questions where subtrack = ? group by tech').all(tid)
    for (const { tech, c } of dist) {
      if (c < 5) continue
      const re = PROBE[tech]
      if (re === undefined) continue       // 未登记探针 → 不做判断
      if (re === null) continue            // 无稳定特征 → 跳过
      const qs = db.prepare('select q, a from interview_questions where subtrack = ? and tech = ?').all(tid, tech)
      const hit = qs.filter(r => re.test((r.q || '') + ' ' + (r.a || ''))).length
      if (hit / qs.length < RATE) buckets.push({ mod, tid, trackName: t.name, tech, n: qs.length, hit, rate: hit / qs.length })
    }
  }
}
buckets.sort((a, b) => a.rate - b.rate)

console.log(`疑似错标桶：${buckets.length} 个，涉及 ${buckets.reduce((a, b) => a + b.n, 0)} 题（阈值 ${RATE}）`)
console.log(APPLY ? '模式：写库' : '模式：dry-run（加 --apply 写库）')

// ---- 2. 逐桶 LLM 重打 ----
const log = []
let changed = 0
let kept = 0
let failed = 0

async function processBucket (b) {
  const cands = vocabAllows(b.mod, b.tid)
  if (cands.length < 2) return { bucket: b, results: [] }
  const rows = db.prepare('select id, q from interview_questions where subtrack = ? and tech = ?').all(b.tid, b.tech)
  const results = []

  for (let i = 0; i < rows.length; i += BATCH) {
    const part = rows.slice(i, i + BATCH)
    const listed = part.map((r, k) => `${k + 1}. ${String(r.q).slice(0, 110)}`).join('\n')
    const sys = `你是技术内容分类专家。下面是一批「${b.trackName}」赛道的面试题题干，它们当前都被打上了「${b.tech}」标签，但其中很多其实属于别的方向，需要你重新判定。

可选标签（只能从下列值中选，禁止自造）：
${cands.map((c, k) => `${k + 1}. ${c}`).join('\n')}

判定规则：
- 依据题干考察的核心技术/方向选择最贴切的一个标签。
- 若题干确实是在考察「${b.tech}」，就继续选「${b.tech}」，不要为了改动而改动。
- 「综合应用」用于跨方向、方法论、软技能或确实无法归入任何具体技术的题目，不要滥用。
- 严格按序号输出，每条只能选一个标签。

输出格式（纯 JSON 数组，不要解释、不要代码块）：
[{"i":1,"tech":"标签名"},{"i":2,"tech":"标签名"}]`
    const user = `题干列表：\n${listed}\n\n请输出 ${part.length} 个判定结果。`
    let arr = null
    for (let retry = 0; retry < 2 && !arr; retry++) {
      try { arr = extractJson(await callLlm([{ role: 'system', content: sys }, { role: 'user', content: user }])) } catch (e) { arr = null }
    }
    if (!Array.isArray(arr)) { failed += part.length; for (const r of part) results.push({ id: r.id, to: b.tech, src: 'fail' }); continue }
    const map = new Map()
    for (const o of arr) if (o && o.i && typeof o.tech === 'string') map.set(Number(o.i), String(o.tech).trim())
    for (let k = 0; k < part.length; k++) {
      const picked = map.get(k + 1)
      // 闸门：LLM 自造标签或越界 → 保留原标签
      const to = cands.includes(picked) ? picked : b.tech
      results.push({ id: part[k].id, from: b.tech, to, src: to === b.tech ? 'keep' : 'llm' })
    }
  }
  return { bucket: b, results }
}

/** 固定并发池，避免一次性打满 LLM 配额 */
async function runPool (items, worker, conc) {
  const out = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      out[i] = await worker(items[i])
    }
  })
  await Promise.all(runners)
  return out
}

const jobs = await runPool(buckets, processBucket, CONC)

// ---- 3. 汇总与写库 ----
const lines = []
lines.push(`# L4 标签重打标报告（${APPLY ? '已写库' : 'dry-run'}）\n`)
lines.push(`阈值：题面命中率 < ${RATE}；涉及 ${buckets.length} 个桶 / ${buckets.reduce((a, b) => a + b.n, 0)} 题\n`)
lines.push('\n## 各桶重打结果\n')
lines.push('| 赛道 | 原标签 | 题数 | 原命中率 | 变更后主要去向 |')
lines.push('|---|---|---|---|---|')

const allUpdates = []
for (const { bucket, results } of jobs) {
  if (!results?.length) continue
  const diff = results.filter(r => r.to !== bucket.tech)
  const tally = {}
  for (const r of diff) tally[r.to] = (tally[r.to] || 0) + 1
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([k, v]) => `${k} ${v}`).join('、') || '（无变更）'
  lines.push(`| ${bucket.trackName} (\`${bucket.tid}\`) | ${bucket.tech} | ${bucket.n} | ${(bucket.rate * 100).toFixed(0)}% | ${top} |`)
  allUpdates.push(...diff)
  // 抽样
  if (SAMPLES > 0 && diff.length) {
    lines.push('')
    for (const r of diff.slice(0, SAMPLES)) {
      const q = db.prepare('select q from interview_questions where id = ?').get(r.id)?.q || ''
      lines.push(`  - \`${bucket.tech}\` → \`${r.to}\`：${String(q).slice(0, 72)}`)
    }
    lines.push('')
  }
}
changed = allUpdates.length

lines.push('\n## 汇总\n')
lines.push(`- 判定失败（保留原标签）：${failed}`)
lines.push(`- 需要变更：${changed}`)

if (APPLY && allUpdates.length) {
  const bak = DB_FILE + '.bak-' + Date.now()
  fs.copyFileSync(DB_FILE, bak)
  lines.push(`- 数据库备份：\`${path.basename(bak)}\``)
  const up = db.prepare('update interview_questions set tech = ? where id = ?')
  const tx = db.transaction((rows) => { for (const r of rows) up.run(r.to, r.id) })
  tx(allUpdates)
  lines.push(`- 已更新：${allUpdates.length} 题`)
}

const outPath = path.join(ROOT, '.workbuddy', '_retag-llm.md')
fs.writeFileSync(outPath, lines.join('\n'))
console.log(lines.filter(l => /^\||^- /.test(l)).join('\n'))
console.log('\n[written] ' + outPath)
if (!APPLY) console.log('\n确认无误后加 --apply 写库。')
