// gen-learn.mjs —— 为「本站无体系化课程的细分赛道」批量生成学习章节
//
// 设计：
//  - 内容严格遵循现有 seed-content.json 的「心智模型」模板：
//      > 时效 | 核验=YYYY-MM-DD | 风险=低/高 | 来源=官方
//      ## 心智模型 / ## 核心知识点（锚定官方） / ## 为什么重要 / ## 常见坑 / ## 动手自测 / ## 面试视角
//  - 大纲(plan)由官方文档结构驱动（深度不套固定数量，由官方真实章节决定）。
//  - 正文(write)由 Deepseek 生成，锚定传入的官方 URL，引用真实出处。
//  - apply 把结果双写到 data/seed-content.json 与 data/devmentor.db（DB 已 seed 时 seedIfEmpty 不会重跑，必须显式插入）。
//
// 用法：
//  node scripts/gen-learn.mjs plan  <subtrackId> [--concurrency 3]
//  node scripts/gen-learn.mjs write <subtrackId> [--concurrency 5] [--limit N]
//  node scripts/gen-learn.mjs apply <subtrackId>
//  node scripts/gen-learn.mjs run   <subtrackId>   # plan + write 连续执行（write 可续跑）
//
// 续跑：write 用 .workbuddy/learn/<id>-done.json 记录已生成 section id，重跑只补缺失。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const ROOT = process.cwd()
const ENV = loadEnv()
const API_KEY = ENV.DEEPSEEK_API_KEY
const BASE = (ENV.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const MODEL = ENV.LLM_MODEL || 'deepseek-chat'
// 北京日期（环境时钟为 UTC，需 +8h 避免核验日期差一天）
const TODAY = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)

// ---------------- 细分赛道注册表（按批次扩展） ----------------
// label：章节标题前缀，也作为路线图按名称查章节的关键词（必须出现在章节标题里）
// prefix：章节/小节 id 前缀（确保不与现有 fe-/be-/op-/ai- 冲突）
export const SUBTRACKS = {
  harmonyos:   { module: 'frontend', label: '鸿蒙', prefix: 'hm', note: 'HarmonyOS / ArkTS / ArkUI',
    urls: ['https://developer.harmonyos.com/', 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/', 'https://developer.huawei.com/consumer/cn/doc/atomic-guides-V5/'] },
  native:      { module: 'frontend', label: '原生', prefix: 'nat', note: 'iOS / Android 原生客户端',
    urls: ['https://developer.apple.com/documentation/', 'https://developer.android.com/guide'] },
  'cross-platform': { module: 'frontend', label: '跨端', prefix: 'xp', note: 'Flutter / React Native 跨端',
    urls: ['https://docs.flutter.dev/', 'https://reactnative.dev/docs/getting-started'] },
  'uni-app':   { module: 'frontend', label: 'uni-app', prefix: 'ua', note: 'uni-app 跨端框架',
    urls: ['https://uniapp.dcloud.net.cn/', 'https://zh.uniapp.dcloud.net.cn/'] },
  miniprogram: { module: 'frontend', label: '小程序', prefix: 'mp', note: '微信小程序',
    urls: ['https://developers.weixin.qq.com/miniprogram/dev/framework/', 'https://developers.weixin.qq.com/miniprogram/dev/guide/'] },
  desktop:     { module: 'frontend', label: '桌面', prefix: 'dt', note: 'Electron / Tauri 桌面端',
    urls: ['https://www.electronjs.org/docs/latest', 'https://v2.tauri.app/'] },
  visualization: { module: 'frontend', label: '可视化', prefix: 'vz', note: 'ECharts / D3 / WebGL 可视化',
    urls: ['https://echarts.apache.org/', 'https://d3js.org/'] },
  // —— 后续批次（本次不跑，保留扩展位）——
  // bigdata: { module:'backend', label:'大数据', prefix:'bd', urls:[...] },
  // game: { module:'backend', label:'游戏服务端', prefix:'gm', urls:[...] },
  // search: { module:'backend', label:'搜索中间件', prefix:'sr', urls:[...] },
  // sdet: { module:'backend', label:'SDET', prefix:'sd', urls:[...] },
  // cloud: { module:'devops', label:'云平台', prefix:'cl', urls:[...] },
  // algo: { module:'ai', label:'算法', prefix:'al', urls:[...] },
  // mlops: { module:'ai', label:'MLOps', prefix:'ml', urls:[...] },
  // traindata: { module:'ai', label:'训练数据', prefix:'td', urls:[...] },
  // infr: { module:'ai', label:'AI Infra', prefix:'ai', urls:[...] },  // 注意 ai- 与现有 ai 模块前缀可能撞，apply 时另处理
  // edge: { module:'ai', label:'端侧AI', prefix:'ed', urls:[...] },
}

// ---------------- 基础设施 ----------------
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
      max_tokens: opts.maxTokens ?? 1400,
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
function extractJson(text) {
  const s = text.indexOf('{'); const e = text.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('无法从 LLM 输出提取 JSON')
  let raw = text.slice(s, e + 1)
  try { return JSON.parse(raw) } catch { /* 去掉可能的尾随逗号 */ }
  raw = raw.replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(raw)
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

// ---------------- 大纲生成（plan） ----------------
const PLAN_SYSTEM = `你是一位资深技术教育课程设计师。你会根据一个技术领域的官方学习路径，设计一套结构化的中文学习大纲。
要求：
1. 大纲必须"镜像"该技术的官方文档/学习路径的章节组织（从基础到进阶），不要随意编造顺序。
2. 章节数由官方内容体量决定（通常 5~10 章；体量小的 3~4 章也可），每章 3~6 个小节。
3. 每个小节给出：title（小节标题）、direction（用"能……"开头的掌握目标，一句话）、outline（2~4 个要点，说明这节要讲什么、锚定哪些官方主题）。
只输出 JSON，不要任何解释。`

function planUser(st) {
  return `技术领域：${st.note}
官方文档参考（请据此镜像章节结构）：
${st.urls.map((u, i) => `${i + 1}. ${u}`).join('\n')}

请输出该领域的完整学习大纲，严格按如下 JSON 结构：
{
  "chapters": [
    { "title": "章节标题", "goal": "本章掌握目标（一句话）",
      "sections": [
        { "title": "小节标题", "direction": "能……（掌握目标）", "outline": ["要点1","要点2","要点3"] }
      ]
    }
  ]
}`
}

// ---------------- 正文生成（write） ----------------
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

function writeUser(st, ch, sec) {
  return `技术：${st.note}（官方参考：${st.urls.join('、')}）
所属章节：${ch.title}（目标：${ch.goal}）
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

// ---------------- 主流程 ----------------
const WORK = path.join(ROOT, '.workbuddy/learn')
fs.mkdirSync(WORK, { recursive: true })

function draftPath(id) { return path.join(WORK, `${id}.json`) }
function donePath(id) { return path.join(WORK, `${id}-done.json`) }

function getSubtrack(id) {
  const st = SUBTRACKS[id]
  if (!st) { console.error('未知 subtrack:', id, '可选:', Object.keys(SUBTRACKS).join(', ')); process.exit(1) }
  return st
}

async function doPlan(id) {
  const st = getSubtrack(id)
  console.log(`[plan] ${id} (${st.note}) …`)
  const txt = await chat([{ role: 'system', content: PLAN_SYSTEM }, { role: 'user', content: planUser(st) }], { temperature: 0.4, maxTokens: 3000 })
  const plan = extractJson(txt)
  if (!plan.chapters || !plan.chapters.length) throw new Error('plan 未返回 chapters')
  fs.writeFileSync(draftPath(id), JSON.stringify(plan, null, 2))
  console.log(`[plan] 完成：${plan.chapters.length} 章 / ${plan.chapters.reduce((n, c) => n + (c.sections?.length || 0), 0)} 节 → ${draftPath(id)}`)
  // 打印大纲摘要便于抽查
  plan.chapters.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.title}  [${c.sections?.length || 0}节]`)
    ;(c.sections || []).forEach(s => console.log(`      - ${s.title}`))
  })
}

async function doWrite(id, concurrency, limit) {
  const st = getSubtrack(id)
  const plan = JSON.parse(fs.readFileSync(draftPath(id), 'utf8'))
  const doneFile = donePath(id)
  const done = fs.existsSync(doneFile) ? JSON.parse(fs.readFileSync(doneFile, 'utf8')) : {}
  // 展开所有 section 任务
  const tasks = []
  plan.chapters.forEach((c, ci) => (c.sections || []).forEach((s, si) => {
    const sid = `${st.prefix}-c${ci + 1}-s${si + 1}`
    tasks.push({ sid, ci, si, c, s })
  }))
  if (limit) tasks.length = Math.min(tasks.length, limit)
  const pending = tasks.filter(t => !done[t.sid])
  console.log(`[write] ${id}：共 ${tasks.length} 节，已生成 ${tasks.length - pending.length}，待生成 ${pending.length}`)
  let ok = 0, fail = 0
  await pool(pending, concurrency, async (t) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const content = await chat([{ role: 'system', content: WRITE_SYSTEM }, { role: 'user', content: writeUser(st, t.c, t.s) }], { temperature: 0.6, maxTokens: 1500 })
        // 规范化：确保以时效头开头
        let body = content
        if (!body.startsWith('> 时效')) body = `> 时效 | 核验=${TODAY} | 风险=低 | 来源=官方\n\n` + body
        done[t.sid] = { content: body, direction: t.s.direction || t.s.direction }
        ok++
        return
      } catch (e) {
        if (attempt === 3) { console.error(`  ✗ ${t.sid}: ${e.message}`); fail++; }
        else await sleep(800 * attempt)
      }
    }
  })
  // 合并回 plan 的 sections
  const full = JSON.parse(JSON.stringify(plan))
  full.chapters.forEach((c, ci) => (c.sections || []).forEach((s, si) => {
    const sid = `${st.prefix}-c${ci + 1}-s${si + 1}`
    if (done[sid]) { s.id = sid; s.content = done[sid].content; s.direction = done[sid].direction || s.direction }
  }))
  fs.writeFileSync(draftPath(id), JSON.stringify(full, null, 2))
  fs.writeFileSync(doneFile, JSON.stringify(done, null, 2))
  console.log(`[write] 完成：成功 ${ok}，失败 ${fail}。草稿 → ${draftPath(id)}`)
}

function doApply(id) {
  const st = getSubtrack(id)
  const full = JSON.parse(fs.readFileSync(draftPath(id), 'utf8'))
  // 组装章节对象（标题加赛道前缀）；统一核验日期为北京今天
  const normDate = (c) => (c || '').replace(/核验=\d{4}-\d{2}-\d{2}/g, `核验=${TODAY}`)
  const chapters = full.chapters.map((c, ci) => ({
    id: `${st.prefix}-c${ci + 1}`,
    title: `${st.label} · ${c.title}`,
    goal: c.goal,
    sections: (c.sections || []).map((s, si) => ({
      id: s.id || `${st.prefix}-c${ci + 1}-s${si + 1}`,
      title: s.title,
      direction: s.direction || '',
      content: normDate(s.content),
    })),
  }))

  // 1) 双写 seed-content.json
  const seedFile = path.join(ROOT, 'data/seed-content.json')
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
  const mod = seed.modules.find(m => m.id === st.module)
  if (!mod) throw new Error('seed 中找不到模块 ' + st.module)
  const existingIds = new Set(mod.chapters.map(c => c.id))
  let dup = 0
  for (const ch of chapters) {
    if (existingIds.has(ch.id)) { dup++; continue }
    mod.chapters.push(ch)
  }
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2))
  console.log(`[apply] seed-content.json：写入 ${chapters.length - dup} 章（跳过重复 ${dup}）`)

  // 2) 双写 data/devmentor.db（已 seed，需显式 INSERT）
  const dbFile = path.join(ROOT, 'data/devmentor.db')
  const db = new Database(dbFile)
  const maxPos = db.prepare('SELECT COALESCE(MAX(position),-1) AS p FROM chapters WHERE module_id=?').get(st.module).p
  const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position) VALUES (?,?,?,?,?)')
  const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const tx = db.transaction(() => {
    let pos = maxPos + 1
    for (const ch of chapters) {
      insCh.run(ch.id, st.module, ch.title, ch.goal, pos++)
      ch.sections.forEach((s, si) => insSec.run(s.id, ch.id, s.title, s.direction, s.content, si))
    }
  })
  tx()
  const cnt = db.prepare('SELECT COUNT(*) c FROM chapters WHERE module_id=? AND id LIKE ?').get(st.module, st.prefix + '-%').c
  console.log(`[apply] devmentor.db：写入章节计数(prefix=${st.prefix}) = ${cnt}`)
  db.close()
  console.log(`[apply] ${id} 完成。累计 token ≈ ${costTotal}`)
}

// ---------------- CLI ----------------
const [cmd, id, ...rest] = process.argv.slice(2)
function getOpt(name) {
  const i = rest.findIndex(a => a === name || a.startsWith(name + '='))
  if (i < 0) return null
  const a = rest[i]
  if (a.includes('=')) return a.split('=')[1]
  if (rest[i + 1] && !rest[i + 1].startsWith('--')) return rest[i + 1]
  return null
}
const concurrency = Number(getOpt('--concurrency')) || 5
const limit = Number(getOpt('--limit')) || 0
if (!cmd || !id) { console.error('用法: gen-learn.mjs <plan|write|apply|run> <subtrackId> [--concurrency N] [--limit N]'); process.exit(1) }

;(async () => {
  if (cmd === 'plan') await doPlan(id)
  else if (cmd === 'write') await doWrite(id, concurrency, limit)
  else if (cmd === 'apply') doApply(id)
  else if (cmd === 'run') { await doPlan(id); await doWrite(id, concurrency, limit) }
  else { console.error('未知命令', cmd); process.exit(1) }
  console.log(`=== 累计消耗 token ≈ ${costTotal} ===`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
