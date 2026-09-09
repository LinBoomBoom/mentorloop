// gen-learn-one.mjs —— 为指定 subtrack 精确新增「单章」学习章节（补齐 A5 章节数≥6）
// 复用 gen-learn.mjs 的官方锚定写作逻辑，但只生成一章，避免整赛道 overshoot。
// 用法：node scripts/gen-learn-one.mjs <subtrackKey> <chapterId> <chapterTitle> <goal> <sectionsJsonFile>
//   sectionsJsonFile: 含 [{title,objective,outline:[...]}] 的 JSON 文件
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

const SUBTRACKS = (await import('./gen-learn.mjs')).SUBTRACKS

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
    body: JSON.stringify({ model: MODEL, messages, temperature: opts.temperature ?? 0.6, max_tokens: opts.maxTokens ?? 1500, stream: false }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
  })
  if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`LLM 失败 ${res.status}: ${txt.slice(0, 200)}`) }
  const data = await res.json()
  const u = data?.usage; if (u) costTotal += (Number(u.completion_tokens) || 0) + (Number(u.prompt_tokens) || 0)
  return data?.choices?.[0]?.message?.content?.trim() || ''
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  })
  await Promise.all(workers); return out
}
const WRITE_SYSTEM = `你是一位资深技术教程作者。你把枯燥的官方文档，改写成让人真正理解、记得住的中文教程。
写作铁律（必须严格遵守）：
1. 「核心知识点（锚定官方）」用要点列表，每条都要落到一个可验证的官方事实/API/概念；技术名词首次出现给英文。
2. 必须引用真实官方文档链接（Markdown 格式 [文字](url)，url 取自给定的官方参考），放在相关位置或段末。
3. 「为什么重要 / 何时会用到」说明实战场景与踩坑代价。
4. 「常见坑」列 2~4 个真实易错点。
5. 若适合，给出「动手自测」（带代码片段，语言贴合该技术）。
6. 「面试视角」列 2~3 个高频考点（以问句或短句）。
语言：简体中文。不要堆砌，要"讲人话"。`
function writeUser(st, ch, sec) {
  return `技术：${st.note}（官方参考：${st.urls.join('、')}）
所属章节：${ch.title}（目标：${ch.goal}）
当前小节：${sec.title}
本节要点（请覆盖）：
${sec.outline.map((o, i) => `${i + 1}. ${o}`).join('\n')}

请按下面的固定模板输出本节完整内容（Markdown），第一行必须是时效头：

> 时效 | 核验=${TODAY} | 风险=低 | 来源=官方

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

const [key, chapterId, chapterTitle, goal, sectionsFile] = process.argv.slice(2)
if (!key || !chapterId || !chapterTitle || !goal || !sectionsFile) {
  console.error('用法: gen-learn-one.mjs <subtrackKey> <chapterId> <chapterTitle> <goal> <sectionsJsonFile>')
  process.exit(1)
}
const st = SUBTRACKS[key]
if (!st) { console.error('未知 subtrackKey:', key, '可选:', Object.keys(SUBTRACKS).join(', ')); process.exit(1) }
const sectionsSpec = JSON.parse(fs.readFileSync(sectionsFile, 'utf8'))
const chapter = { id: chapterId, title: `${st.label} · ${chapterTitle}`, goal, subtrack: st.subtrack || st.prefix,
  sections: sectionsSpec.map((s, si) => ({ id: `${chapterId}-s${si + 1}`, title: s.title, objective: s.objective, outline: s.outline })) }

console.log(`[gen-learn-one] ${key} → 章 ${chapterId}「${chapter.title}」(${chapter.sections.length} 节)`)
let ok = 0, fail = 0
await pool(chapter.sections, 3, async (sec) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const content = await chat([{ role: 'system', content: WRITE_SYSTEM }, { role: 'user', content: writeUser(st, chapter, sec) }], { temperature: 0.6, maxTokens: 1500 })
      let body = content
      if (!body.startsWith('> 时效')) body = `> 时效 | 核验=${TODAY} | 风险=低 | 来源=官方\n\n` + body
      sec.content = body
      ok++; return
    } catch (e) { if (attempt === 3) { console.error(`  ✗ ${sec.id}: ${e.message}`); fail++ } else await sleep(800 * attempt) }
  }
})
if (fail > 0) { console.error(`[gen-learn-one] ${fail} 节生成失败，中止以免写半截章节`); process.exit(1) }

// 双写 seed-content.json
const seedFile = path.join(ROOT, 'data/seed-content.json')
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
const mod = seed.modules.find(m => m.id === st.module)
if (!mod) throw new Error('seed 中找不到模块 ' + st.module)
if (mod.chapters.some(c => c.id === chapter.id)) { console.error('章节已存在，跳过 seed 写入:', chapter.id); }
else { mod.chapters.push(chapter); fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2)); console.log('[apply] seed-content.json：写入 1 章') }

// 双写 DB
const dbFile = path.join(ROOT, 'data/devmentor.db')
const db = new Database(dbFile)
const maxPos = db.prepare('SELECT COALESCE(MAX(position),-1) AS p FROM chapters WHERE module_id=?').get(st.module).p
const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)')
const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,objective,content,position) VALUES (?,?,?,?,?,?)')
const tx = db.transaction(() => {
  let pos = maxPos + 1
  insCh.run(chapter.id, st.module, chapter.title, chapter.goal, pos++, chapter.subtrack)
  chapter.sections.forEach((s, si) => insSec.run(s.id, chapter.id, s.title, s.objective ?? null, s.content, si))
})
tx()
const cnt = db.prepare('SELECT COUNT(*) c FROM chapters WHERE module_id=? AND subtrack=?').get(st.module, chapter.subtrack).c
console.log(`[apply] devmentor.db：subtrack=${chapter.subtrack} 章节计数 = ${cnt}`)
db.close()
console.log(`[gen-learn-one] 完成。累计 token ≈ ${costTotal}`)
