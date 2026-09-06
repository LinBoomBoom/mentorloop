// fill-missing-blocks.mjs —— 基于已有「核心知识点」补齐缺失的教学块（为什么重要/常见坑/动手自测/面试视角）与 direction
//
// 设计原则（对齐用户硬规则：内容必须官方锚定、严禁虚构）：
//  - 不给 LLM 任何外部资料，只喂该小节「已有的、已核实的内容」（核心知识点等）。
//  - 明确要求 LLM 仅从给定内容中提炼/改写/举例，严禁引入任何外部新知识或新事实。
//  - 只生成【缺失】的块；已存在的 核心知识点 / 其他块（含相关知识图谱）一律原样保留，绝不覆盖或丢弃。
//  - 不生成「相关知识图谱」（跨链增强，可选，不在补齐范围）。
//
// 用法：
//  node scripts/fill-missing-blocks.mjs gen   [--concurrency 6] [--limit N] [--only why|pit|quiz|iv|dir]
//  node scripts/fill-missing-blocks.mjs apply
//  node scripts/fill-missing-blocks.mjs run                       # gen + apply 连续
//  node scripts/fill-missing-blocks.mjs check                     # 仅统计缺失数量
//
// 说明：
//  - gen 阶段把结果写入 data/.learn-fill-patch.json（按 section id 幂等覆盖，可续跑）。
//  - apply 阶段把 patch 同步写入 seed-content.json / devmentor.db / release/win-unpacked 三处。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const ROOT = process.cwd()
// 环境变量优先于 .env：支持在不改动 .env 的情况下临时切换通道
//   例如用 DashScope 百炼作为备用：
//   LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
//   LLM_MODEL=qwen-plus DEEPSEEK_API_KEY=$DASHSCOPE_API_KEY node scripts/fill-missing-blocks.mjs run
const ENV = { ...loadEnv(), ...Object.fromEntries(
  Object.entries(process.env).filter(([k]) => ['DEEPSEEK_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL'].includes(k))
) }
const API_KEY = ENV.DEEPSEEK_API_KEY
const BASE = (ENV.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const MODEL = ENV.LLM_MODEL || 'deepseek-chat'

// 必填块（除去核心知识点与可选的相关知识图谱）
const REQUIRED = [
  { key: 'why', label: '为什么重要 / 何时会用到', rx: /为什么重要|何时会用到/ },
  { key: 'pit', label: '常见坑', rx: /常见坑/ },
  { key: 'quiz', label: '动手自测', rx: /动手自测/ },
  { key: 'iv', label: '面试视角', rx: /面试视角/ },
]
const CANON = ['core', 'why', 'pit', 'quiz', 'iv'] // 拼接顺序（core 必在）

function loadEnv() {
  const f = path.join(ROOT, '.env')
  if (!fs.existsSync(f)) return {}
  return fs.readFileSync(f, 'utf8').split('\n').reduce((a, l) => {
    const m = l.match(/^([^=]+)=(.*)$/); if (m) a[m[1].trim()] = m[2].trim(); return a
  }, {})
}

// ---------- 文本解析（preamble 原样保留 + 各 ##/### 段落独立标注 key） ----------
function parseSegments(content) {
  const lines = (content || '').split('\n')
  let meta = ''
  const bodyLines = []
  for (const ln of lines) {
    if (!meta && ln.startsWith('> 时效')) { meta = ln.trim(); continue }
    bodyLines.push(ln)
  }
  const body = bodyLines.join('\n')
  // 把“第一个 ##/### 标题之前的所有内容”当作 preamble，原样保留（可能是导语/引用块等）
  const headingRe = /^(#{2,3})\s+/m
  const hm = body.match(headingRe)
  let preamble = ''
  let rest = body
  if (hm) { preamble = body.slice(0, hm.index); rest = body.slice(hm.index) }
  else { preamble = body; rest = '' }
  const segs = []
  if (rest) {
    const parts = rest.split(/^(#{2,3})\s+/m)
    for (const p of parts) {
      if (!p.trim()) continue
      const nl = p.indexOf('\n')
      const head = (nl === -1 ? p : p.slice(0, nl)).trim()
      const txt = (nl === -1 ? '' : p.slice(nl + 1)).trim()
      let key = 'other'
      if (/核心知识点/.test(head)) key = 'core'
      else if (/相关知识图谱/.test(head)) key = 'graph'
      else {
        const m = REQUIRED.find(r => r.rx.test(head))
        if (m) key = m.key
      }
      segs.push({ key, head, text: `${p.startsWith('###') ? '###' : '##'} ${head}\n${txt}` })
    }
  }
  return { meta, preamble, segs }
}

function missingBlocks(section) {
  const { meta, preamble, segs } = parseSegments(section.content || '')
  const present = new Set(segs.map(s => s.key))
  const miss = REQUIRED.filter(r => !present.has(r.key)).map(r => r.key)
  const dirMiss = !(section.direction && section.direction.trim())
  return { meta, preamble, segs, miss, dirMiss }
}

// ---------- LLM ----------
let costTotal = 0
async function chat(messages, opts = {}) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 900,
      stream: false,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`LLM ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const u = data?.usage
  if (u) costTotal += (Number(u.completion_tokens) || 0) + (Number(u.prompt_tokens) || 0)
  return data?.choices?.[0]?.message?.content?.trim() || ''
}

const FILL_SYSTEM = `你是一位严谨的技术内容编辑。下面会给你一段【已有的、已核实】技术小节内容（含「核心知识点」等）。
你的任务：仅基于这段【已有内容】，补充缺失的段落。铁律：
1. 严禁引入任何外部新知识、新事实、新 API 或外部链接——只能从给定内容中提炼、改写、举例、设问。
2. 不写「核心知识点」块（那部分已存在，不要重复）。
3. 不写「心智模型」块。
4. 语言简体中文，讲人话，与原文风格一致。
5. 只输出要求的缺失段落，每个段落以 "## 标题" 开头；最后用一行 "方向：能……（一句话掌握目标）" 给出掌握目标（若要求）。`

function fillUser(existingContent, missKeys, needDir) {
  const reqList = REQUIRED.filter(r => missKeys.includes(r.key)).map(r => `- ${r.label}`).join('\n')
  if (missKeys.length === 0 && needDir) {
    // 仅缺 direction：要求只输出一行掌握目标
    return `【已有内容】
${existingContent}

【任务】仅需补全该小节的「掌握目标」（不要改动上面已有内容，也不要写任何 ## 段落）：
用一行给出，以“能”开头，例如：能解释 X 的原理并能在 Y 场景中使用。
只输出这一行，格式：方向：能……`
  }
  const dirLine = needDir ? '\n另请在末尾用一行给出掌握目标：方向：能……（一句话，以“能”开头）' : ''
  return `【已有内容】
${existingContent}

【请仅补充以下缺失段落（不要写已存在的部分）】
${reqList}${dirLine}

要求：每个段落以 "## 标题" 开头，内容只从上面「已有内容」中提炼，不得编造外部事实。`
}

function parseResponse(text, missKeys, needDir) {
  let t = (text || '').trim()
  t = t.replace(/^```(?:markdown)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const out = { blocks: {}, direction: null }
  const segs = t.split(/^##\s+/m).slice(1)
  for (const seg of segs) {
    const nl = seg.indexOf('\n')
    const head = (nl === -1 ? seg : seg.slice(0, nl)).trim()
    if (!head) continue // 防御：丢弃空标题段（LLM 偶发在块间多打一行 "## "）
    const body = (nl === -1 ? '' : seg.slice(nl + 1)).trim()
    const matched = REQUIRED.find(r => r.rx.test(head))
    if (matched && missKeys.includes(matched.key)) {
      // 防御：截断到下一个标题（防止 LLM 把 相关知识图谱/进阶 等内容 spill 进本块）
      const cut = body.search(/\n#{2,3}\s|#{2,3}\s/)
      out.blocks[matched.key] = (cut >= 0 ? body.slice(0, cut) : body).trim()
    }
  }
  if (needDir) {
    // 多种写法兼容：方向：... / 掌握目标：... / 单独一行以"能"开头
    let dm = t.match(/方向\s*[:：]\s*(.+)$/m) || t.match(/掌握目标\s*[:：]\s*(.+)$/m)
    if (dm) out.direction = dm[1].trim()
    else {
      const line = t.split('\n').map(s => s.trim()).find(s => /^能/.test(s))
      if (line) out.direction = line
    }
  }
  return out
}

// 手术式重组：preamble 原样保留 + 各段按规范顺序，仅在正确位置插入缺失的必填块
function reassemble(meta, preamble, segs, generated) {
  const present = new Set(segs.map(s => s.key))
  const out = segs.map(s => ({ ...s }))
  let anchor = -1
  for (const k of CANON) {
    if (k === 'core') { anchor = present.has('core') ? out.findIndex(s => s.key === 'core') : anchor; continue }
    if (present.has(k)) { anchor = out.findIndex(s => s.key === k) }
    else if (generated[k]) {
      const label = REQUIRED.find(r => r.key === k).label
      out.splice(anchor + 1, 0, { key: k, head: label, text: `## ${label}\n${generated[k]}` })
      anchor += 1
    }
  }
  const parts = [meta, preamble.trim(), ...out.map(s => s.text)].filter(Boolean)
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ---------- 收集不完整小节 ----------
function collectIncomplete(only) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seed-content.json'), 'utf8'))
  const list = []
  for (const m of seed.modules) {
    for (const c of m.chapters || []) {
      for (const s of c.sections || []) {
        const { miss, dirMiss } = missingBlocks(s)
        let want = miss.slice()
        let wantDir = dirMiss
        if (only && only !== 'dir') {
          if (!miss.includes(only)) continue        // 仅处理缺失该块的小节
          want = [only]
          wantDir = dirMiss
        }
        if (only === 'dir') { want = []; wantDir = dirMiss }
        if (want.length || wantDir) list.push({ sid: s.id, sec: s, want, wantDir })
      }
    }
  }
  return list
}

// ---------- 阶段：gen ----------
const PATCH = path.join(ROOT, 'data/.learn-fill-patch.json')
function loadPatch() { return fs.existsSync(PATCH) ? JSON.parse(fs.readFileSync(PATCH, 'utf8')) : {} }
function savePatch(p) { fs.writeFileSync(PATCH, JSON.stringify(p, null, 2)) }

function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  })
  return Promise.all(workers).then(() => out)
}

async function doGen(concurrency, limit, only) {
  const tasks = collectIncomplete(only)
  if (limit) tasks.length = Math.min(tasks.length, limit)
  const patch = loadPatch()
  const pending = tasks.filter(t => !(patch[t.sid] && patch[t.sid].content))
  console.log(`[gen] 总不完整 ${tasks.length}，已 patch ${tasks.length - pending.length}，待生成 ${pending.length}`)
  let ok = 0, fail = 0, dirOk = 0, flush = 0
  await pool(pending, concurrency, async (t) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { meta, preamble, segs, miss, dirMiss } = missingBlocks(t.sec)
        const maxTok = 260 * t.want.length + (t.wantDir ? 140 : 0) + 240
        const resp = await chat([
          { role: 'system', content: FILL_SYSTEM },
          { role: 'user', content: fillUser(t.sec.content || '', t.want, t.wantDir) },
        ], { temperature: 0.5, maxTokens: Math.min(maxTok, 1600) })
        const parsed = parseResponse(resp, t.want, t.wantDir)
        // 必须至少补回一个请求的块（或 direction），否则视为失败
        const gotAny = t.want.some(k => parsed.blocks[k]) || (t.wantDir && parsed.direction)
        if (!gotAny) throw new Error('未生成任何请求内容')
        // direction-only 小节：内容已完整，绝不重排，仅补 direction 元数据
        let newContent
        if (t.want.length === 0) {
          newContent = t.sec.content || ''
        } else {
          newContent = reassemble(meta, preamble, segs, parsed.blocks)
          if (!newContent || newContent === (t.sec.content || '').trim()) throw new Error('空生成')
        }
        const newDir = (t.wantDir && parsed.direction) ? parsed.direction : (t.sec.direction || '')
        patch[t.sid] = { content: newContent, direction: newDir }
        ok++; if (t.wantDir && parsed.direction) dirOk++
        if (++flush % 25 === 0) savePatch(patch)
        return
      } catch (e) {
        if (attempt === 3) { console.error(`  ✗ ${t.sid}: ${e.message}`); fail++ }
        else await new Promise(r => setTimeout(r, 800 * attempt))
      }
    }
  })
  savePatch(patch)
  console.log(`[gen] 完成：成功 ${ok}，方向补齐 ${dirOk}，失败 ${fail}。patch → ${PATCH}`)
  console.log(`[gen] 累计 token ≈ ${costTotal}`)
}

// ---------- 阶段：apply ----------
function doApply() {
  if (!fs.existsSync(PATCH)) { console.error('无 patch 文件，先 run gen'); process.exit(1) }
  const patch = loadPatch()
  const ids = Object.keys(patch)
  console.log(`[apply] patch 条目：${ids.length}`)

  const seedFile = path.join(ROOT, 'data/seed-content.json')
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
  let nSeed = 0
  for (const m of seed.modules) for (const c of m.chapters || []) for (const s of c.sections || []) {
    if (patch[s.id]) { s.content = patch[s.id].content; if (patch[s.id].direction) s.direction = patch[s.id].direction; nSeed++ }
  }
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2))
  console.log(`[apply] seed-content.json 更新 ${nSeed} 节`)

  const dbFile = path.join(ROOT, 'data/devmentor.db')
  const db = new Database(dbFile)
  db.pragma('busy_timeout = 30000')
  const upd = db.prepare('UPDATE sections SET content=?, direction=? WHERE id=?')
  const tx = db.transaction(() => { for (const id of ids) { const p = patch[id]; if (p) upd.run(p.content, p.direction || '', id) } })
  tx()
  db.close()
  console.log(`[apply] devmentor.db 更新 ${ids.length} 节`)

  const relFile = path.join(ROOT, 'release/win-unpacked/resources/data/seed-content.json')
  if (fs.existsSync(relFile)) {
    const rel = JSON.parse(fs.readFileSync(relFile, 'utf8'))
    let nRel = 0
    for (const m of rel.modules) for (const c of m.chapters || []) for (const s of c.sections || []) {
      if (patch[s.id]) { s.content = patch[s.id].content; if (patch[s.id].direction) s.direction = patch[s.id].direction; nRel++ }
    }
    fs.writeFileSync(relFile, JSON.stringify(rel, null, 2))
    console.log(`[apply] release/win-unpacked 更新 ${nRel} 节`)
  } else console.log('[apply] release 文件不存在，跳过')

  const re = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
  let mx = 0
  for (const m of re.modules) for (const c of m.chapters || []) for (const s of c.sections || [])
    if ((s.content || '').includes('## 心智模型')) mx++
  console.log(`[apply] 校验：seed 中心智模型残留 ${mx}`)
}

function doCheck() {
  const tasks = collectIncomplete()
  const byKey = { why: 0, pit: 0, quiz: 0, iv: 0, dir: 0 }
  for (const t of tasks) { for (const k of t.want) byKey[k]++; if (t.wantDir) byKey.dir++ }
  console.log('缺失统计（去重后，按小节计）：')
  console.log('  为什么重要/何时会用到:', byKey.why)
  console.log('  常见坑:', byKey.pit)
  console.log('  动手自测:', byKey.quiz)
  console.log('  面试视角:', byKey.iv)
  console.log('  direction:', byKey.dir)
  console.log('  需处理的小节总数:', tasks.length)
}

// ---------- CLI ----------
const [cmd, ...rest] = process.argv.slice(2)
function getOpt(name) {
  const i = rest.findIndex(a => a === name || a.startsWith(name + '='))
  if (i < 0) return null
  const a = rest[i]; if (a.includes('=')) return a.split('=')[1]
  if (rest[i + 1] && !rest[i + 1].startsWith('--')) return rest[i + 1]
  return null
}
const concurrency = Number(getOpt('--concurrency')) || 6
const limit = Number(getOpt('--limit')) || 0
const only = getOpt('--only') || null

if (!cmd) { console.error('用法: fill-missing-blocks.mjs <gen|apply|run|check> [--concurrency N] [--limit N] [--only why|pit|quiz|iv|dir]'); process.exit(1) }
;(async () => {
  if (cmd === 'check') doCheck()
  else if (cmd === 'gen') await doGen(concurrency, limit, only)
  else if (cmd === 'apply') doApply()
  else if (cmd === 'run') { await doGen(concurrency, limit, only); doApply() }
  else { console.error('未知命令', cmd); process.exit(1) }
  console.log(`=== 累计 token ≈ ${costTotal} ===`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
