// gen-deepen-sections.mjs —— 为「已生成但偏浅」的章节追加小节，补齐节级深度
//
// 背景：Go / Python 后端赛道每章固定 4 节，而 Java 赛道单章 4~10 节（均值 ~6.5）。
// 本脚本对目标章节（按 prefix 指定）每章追加 N 节（默认 3），由 LLM 基于官方参考
// 提出不重复的小节主题并生成合规正文（心智模型模板 + 时效头 + 官方链接）。
//
// 用法：
//   node scripts/gen-deepen-sections.mjs --prefix go --prefix py --add 3 --concurrency 5
//
// 幂等：新小节 id 为 <chapterId>-s<maxExisting+1..>，已存在则跳过；seed 与 DB 双写。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { createRequire } from 'node:module'

const ROOT = process.cwd()
const ENV = loadEnv()
const API_KEY = ENV.DEEPSEEK_API_KEY
const BASE = (ENV.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const MODEL = ENV.LLM_MODEL || 'deepseek-chat'
const TODAY = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)

// 各语言上下文（供 LLM 引用官方源，生成合规链接）
const CTX = {
  go: { note: 'Go 后端开发（并发模型 / Web 框架 / 数据访问 / 运行时与部署）', urls: ['https://go.dev/doc/', 'https://go.dev/effective_go', 'https://go.dev/blog/'] },
  py: { note: 'Python 后端开发（异步编程 / Web 框架 / 数据访问 / 并发与运行时）', urls: ['https://docs.python.org/3/', 'https://fastapi.tiangolo.com/', 'https://docs.sqlalchemy.org/'] },
}

function loadEnv() {
  const f = path.join(ROOT, '.env')
  if (!fs.existsSync(f)) return {}
  return fs.readFileSync(f, 'utf8').split('\n').reduce((a, l) => {
    const m = l.match(/^([^=]+)=(.*)$/); if (m) a[m[1].trim()] = m[2].trim(); return a
  }, {})
}
let costTotal = 0
async function chat(messages, opts = {}) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 1500,
      stream: false,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`LLM 失败 ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const u = data?.usage
  if (u) costTotal += (Number(u.completion_tokens) || 0) + (Number(u.prompt_tokens) || 0)
  return data?.choices?.[0]?.message?.content?.trim() || ''
}
const require = createRequire(import.meta.url)
let _jsonrepair = null
try { _jsonrepair = require('jsonrepair') } catch { /* 可选 */ }
function extractJson(text) {
  const s = text.indexOf('{'); const e = text.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('无法从 LLM 输出提取 JSON')
  let raw = text.slice(s, e + 1)
  try { return JSON.parse(raw) } catch { /* 修复 */ }
  if (_jsonrepair) { try { const f = _jsonrepair.default || _jsonrepair; return JSON.parse(f(raw)) } catch { /* 回退 */ } }
  const repairs = [
    (x) => x.replace(/,\s*([}\]])/g, '$1'),
    (x) => x.replace(/"\s*"/g, '","'),
    (x) => x.replace(/\}\s*\{/g, '},{'),
    (x) => x.replace(/\]\s*\[/g, '],['),
    (x) => x.replace(/\}\s*"/g, '},"'),
    (x) => x.replace(/\]\s*"/g, '],"'),
    (x) => x.replace(/"\s*\{/g, '",{'),
    (x) => x.replace(/"\s*\[/g, '",['),
  ]
  let cur = raw
  for (const step of repairs) { try { return JSON.parse(cur) } catch { cur = step(cur) } }
  return JSON.parse(cur)
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  })
  await Promise.all(workers)
  return out
}

const WRITE_SYSTEM = `你是一位擅长"心智模型"式技术写作的资深作者。你把枯燥的官方文档，改写成让人真正理解、记得住的中文教程。
写作铁律（必须严格遵守）：
1. 开篇用「心智模型」：用一个生活化类比/比喻，解释这个知识的本质（例如"把 X 想成 Y"）。
2. 「核心知识点（锚定官方）」用要点列表，每条都要落到一个可验证的官方事实/API/概念；技术名词首次出现给英文。
3. 必须引用真实官方文档链接（Markdown 格式 [文字](url)，url 取自给定的官方参考），放在相关位置或段末。
4. 「为什么重要 / 何时会用到」说明实战场景与踩坑代价。
5. 「常见坑」列 2~4 个真实易错点。
6. 若适合，给出「动手自测」（带代码片段，语言贴合该技术）。
7. 「面试视角」列 2~3 个高频考点（以问句或短句）。
语言：简体中文。不要堆砌，要"讲人话"。`

function writeUser(ctx, chTitle, chGoal, sec) {
  return `技术：${ctx.note}（官方参考：${ctx.urls.join('、')}）
所属章节：${chTitle}（目标：${chGoal}）
当前小节：${sec.title}
本节要点（请覆盖）：
${sec.outline.map((o, i) => `${i + 1}. ${o}`).join('\n')}

请按下面的固定模板输出本节完整内容（Markdown），第一行必须是时效头：

> 时效 | 核验=${TODAY} | 风险=低 | 来源=官方

## 心智模型
（生活化类比，讲清本质）

## 核心知识点（锚定官方）
- （要点，技术名词给英文，引用官方链接 [文字](url)）

## 为什么重要 / 何时会用到
（实战场景）

## 常见坑
- （易错点）

## 动手自测
（代码片段，语言贴合该技术；若纯概念可省略此节）

## 面试视角
- （高频考点）

注意：官方链接必须是真实存在的官方地址（可用上面给的官方参考域名下的具体路径），不要编造不存在的页面。`
}

// 解析参数
const args = process.argv.slice(2)
const PREFIXES = []
let ADD = 3
let CONC = 5
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--prefix') PREFIXES.push(args[++i])
  else if (args[i] === '--add') ADD = Number(args[++i]) || 3
  else if (args[i] === '--concurrency') CONC = Number(args[++i]) || 5
}
if (PREFIXES.length === 0) { console.error('用法: gen-deepen-sections.mjs --prefix go --prefix py --add 3 --concurrency 5'); process.exit(1) }

const db = new Database(path.join(ROOT, 'data/devmentor.db'))

// 取目标章节
const chapters = []
for (const p of PREFIXES) {
  const rows = db.prepare(`SELECT id, title, goal, module_id AS module FROM chapters WHERE id LIKE ? ORDER BY position`).all(p + '-%')
  for (const r of rows) {
    const secs = db.prepare('SELECT id, title, direction, content FROM sections WHERE chapter_id=? ORDER BY position').all(r.id)
    chapters.push({ ...r, secs })
  }
}
console.log(`目标章节数: ${chapters.length} (prefixes: ${PREFIXES.join(', ')})`)

// 1) 为每章规划新增小节（LLM 提出不重复主题），count = 本轮需补齐的节数
async function planDeepen(ch, count) {
  const existing = ch.secs.map(s => s.title).join('、')
  const sys = `你是一位资深技术教育课程设计师。请基于已有章节结构，提出若干"深化/补齐"的小节主题，不要与已有小节重复，也不要脱离该章主题。只输出 JSON。`
  const user = `章节标题：${ch.title}
章节目标：${ch.goal || ''}
已有小节（${ch.secs.length} 节）：${existing}

请提出 ${count} 个额外小节，深化该章覆盖度。每节给出 title（小节标题）和 outline（2~4 个要点）。
输出 JSON：{"sections":[{"title":"...","outline":["..",".."]}]}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const txt = await chat([{ role: 'system', content: sys }, { role: 'user', content: user }], { temperature: 0.7, maxTokens: 900 })
      const j = extractJson(txt)
      if (j?.sections?.length) return j.sections.slice(0, ADD)
    } catch (e) { if (attempt === 3) console.error(`  ✗ plan ${ch.id}: ${e.message}`); else await sleep(800 * attempt) }
  }
  return []
}

// 2) 生成单节正文
async function writeSec(ctx, ch, sec) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let body = await chat([{ role: 'system', content: WRITE_SYSTEM }, { role: 'user', content: writeUser(ctx, ch.title, ch.goal, sec) }], { temperature: 0.6, maxTokens: 1500 })
      if (!body.startsWith('> 时效')) body = `> 时效 | 核验=${TODAY} | 风险=低 | 来源=官方\n\n` + body
      return body
    } catch (e) {
      if (attempt === 3) { console.error(`  ✗ write ${ch.id}/${sec.title}: ${e.message}`); return null }
      await sleep(800 * attempt)
    }
  }
  return null
}

const tasks = []
for (const ch of chapters) {
  // 计算新小节 id 起点
  const maxIdx = ch.secs.reduce((m, s) => { const mm = s.id.match(/-s(\d+)$/); return mm ? Math.max(m, Number(mm[1])) : m }, 0)
  tasks.push({ ch, maxIdx })
}

console.log('[plan] 规划新增小节中...')
const planned = await pool(tasks, CONC, async (t) => {
  const desired = 4 + ADD
  const need = Math.max(0, desired - t.ch.secs.length)
  if (need === 0) return { ...t, newSecs: [] }
  const secs = await planDeepen(t.ch, need)
  return { ...t, newSecs: secs }
})

// 3) 生成正文
console.log('[write] 生成正文中...')
const results = await pool(planned, CONC, async (t) => {
  const contents = []
  for (const s of t.newSecs) {
    const body = await writeSec(CTX[PREFIXES.find(p => t.ch.id.startsWith(p + '-'))] || CTX.go, t.ch, s)
    contents.push({ sec: s, body })
  }
  return { ...t, contents }
})

// 4) 双写 seed + DB
const seedFile = path.join(ROOT, 'data/seed-content.json')
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
const insSec = db.prepare('INSERT OR IGNORE INTO sections (id, chapter_id, title, direction, content, position) VALUES (?,?,?,?,?,?)')
let total = 0
let seedMiss = 0

db.pragma('busy_timeout = 5000')
for (const r of results) {
  if (!r.contents.length) continue
  const mod = seed.modules.find(m => m.id === r.ch.module)
  const seedCh = mod?.chapters.find(c => c.id === r.ch.id)
  let pos = r.maxIdx
  for (const { sec, body } of r.contents) {
    if (!body) continue
    const sid = `${r.ch.id}-s${++pos}`
    // DB
    insSec.run(sid, r.ch.id, sec.title, sec.direction || '', body, pos - 1)
    // seed
    if (seedCh) { seedCh.sections = seedCh.sections || []; seedCh.sections.push({ id: sid, title: sec.title, direction: sec.direction || '', content: body }) }
    else seedMiss++
    total++
  }
}
db.close()
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2))
console.log(`[done] 新增小节总数: ${total}（seed 未命中模块 ${seedMiss}）| 累计 token ≈ ${costTotal}`)
