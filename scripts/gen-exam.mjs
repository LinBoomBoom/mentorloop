// gen-exam.mjs — 方向级选择题试卷生成（Phase 0 · C3）
//
// 用法:
//   node scripts/gen-exam.mjs <subtrack> <module> <label> [--dry-run]
//   node scripts/gen-exam.mjs --batch            # 跑预设的 10 个方向
//
// 说明:
//   - 调 Deepseek 为指定方向生成「基础卷 + 进阶卷」选择题（复用现有 exam_sets/exam_choices 体系）
//   - 写入 devmentor.db (exam_sets + exam_choices) 与 data/seed-content.json (examSets)
//   - track 填模块级（前端 getExamSets(track) 按模块分组），方向信息写进 name
//   - 选择题为 AI 生成的测试题（项目已有 19 套 AI 选择题先例），非"官方事实内容"，符合试卷性质

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import Database from 'better-sqlite3'
const require = createRequire(import.meta.url)
let _jsonrepair = null
try { _jsonrepair = require('jsonrepair') } catch {}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ---- 加载 .env ----
function loadEnv() {
  const p = resolve(ROOT, '.env')
  const env = {}
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return env
}
const ENV = loadEnv()
const API_KEY = ENV.DEEPSEEK_API_KEY || ENV.LLM_API_KEY
const BASE = ENV.LLM_BASE_URL || 'https://api.deepseek.com/v1'
const MODEL = ENV.LLM_MODEL || 'deepseek-chat'

// ---- LLM 调用 ----
async function callLLM(system, user, maxTokens = 8000) {
  const resp = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.3,
      max_tokens: maxTokens
    })
  })
  if (!resp.ok) {
    const t = await resp.text()
    throw new Error(`LLM HTTP ${resp.status}: ${t.slice(0, 300)}`)
  }
  const j = await resp.json()
  return j.choices[0].message.content
}

// ---- 解析试卷 JSON ----
function parseExam(text) {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  let obj
  const repair = _jsonrepair ? (_jsonrepair.default || _jsonrepair) : null
  try { obj = JSON.parse(t) }
  catch (e) { if (!repair) throw e; obj = JSON.parse(repair(t)) }
  if (!obj.basic || !obj.advanced) throw new Error('缺少 basic/advanced')
  const norm = (arr) => arr.map((q, i) => {
    if (!q.q || !Array.isArray(q.options) || q.options.length < 2) throw new Error(`第${i + 1}题结构不完整`)
    let ans = q.answer
    if (Array.isArray(ans)) ans = ans.map(String)
    else ans = [String(ans)]
    return {
      tag: q.tag || '综合',
      q: q.q,
      options: q.options,
      answer: ans,
      multi: q.multi ? 1 : 0,
      explain: q.explain || ''
    }
  })
  return { basic: norm(obj.basic), advanced: norm(obj.advanced) }
}

// ---- 生成 ----
async function genForSubtrack(subtrack, label) {
  const system = `你是资深技术面试官与出题专家。基于该方向的官方权威文档、官方最佳实践与真实工程经验出题。` +
    `题目必须技术准确、无歧义、选项有区分度，解析要讲清"为什么对、为什么错"。` +
    `禁止出超纲题、禁止事实性错误。基础卷覆盖核心概念与常见用法；进阶卷覆盖深层原理、陷阱、调优与生产实践。`
  const user = `为「${label}」(subtrack=${subtrack}) 方向生成两套选择题试卷，每套 15 道：
- 基础卷(basic)：核心概念、常见 API/命令、典型用法
- 进阶卷(advanced)：底层原理、边界陷阱、性能调优、生产排障
要求：
- 每题 4 个选项，单选为主(multi=false)；可含 1~2 道多选(multi=true)
- answer 用选项字母数组，如 ["B"] 或 ["A","C"]
- 每题含 tag(知识点)、q(题干)、options(4项)、answer、multi、explain(解析)
- 输出严格 JSON：{"basic":[...15题],"advanced":[...15题]}`
  const text = await callLLM(system, user, 9000)
  return parseExam(text)
}

// ---- 写入 ----
function writeSet(module, subtrack, levelKey, levelName, label, questions, dryRun) {
  const setId = `exam-${subtrack}-${levelKey}`
  const name = `${label} · 方向${levelKey === 'basic' ? '基础' : '进阶'}卷`
  const duration = 25
  const vipOnly = levelKey === 'basic' ? 0 : 1
  const choices = questions.map((q, i) => ({
    id: `${setId}-c${i + 1}`,
    tag: q.tag,
    q: q.q,
    options: q.options,        // seed 里是数组
    answer: q.answer,
    multi: q.multi,
    explain: q.explain,
    source: null
  }))

  if (dryRun) {
    console.log(`[dry-run] ${setId} (${name}) 题数=${choices.length} vipOnly=${vipOnly}`)
    console.log('  示例Q1:', choices[0].q)
    console.log('  示例Q1选项:', choices[0].options.join(' | '))
    console.log('  示例Q1答案:', choices[0].answer, '解析:', choices[0].explain.slice(0, 80))
    return { setId, name, count: choices.length }
  }

  // DB
  const db = new Database(resolve(ROOT, 'data/devmentor.db'))
  db.pragma('journal_mode = WAL')
  db.prepare('INSERT OR IGNORE INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)')
    .run(setId, name, module, levelName, duration, vipOnly)
  db.prepare('DELETE FROM exam_choices WHERE set_id=?').run(setId)
  const ins = db.prepare('INSERT INTO exam_choices (id,set_id,tag,q,options,answer,multi,explain,source) VALUES (?,?,?,?,?,?,?,?,?)')
  const tx = db.transaction(() => {
    for (const c of choices) {
      ins.run(c.id, setId, c.tag, c.q, JSON.stringify(c.options), JSON.stringify(c.answer), c.multi, c.explain, null)
    }
  })
  tx()
  db.close()

  // seed
  const seedPath = resolve(ROOT, 'data/seed-content.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  seed.examSets = (seed.examSets || []).filter(s => s.id !== setId)
  seed.examSets.push({
    id: setId, name, track: module, level: levelName, duration, vipOnly: vipOnly === 1,
    choices: choices.map(c => ({ id: c.id, tag: c.tag, q: c.q, options: c.options, answer: c.answer, explain: c.explain, source: null }))
  })
  writeFileSync(seedPath, JSON.stringify(seed))
  console.log(`[apply] ${setId} (${name}) 写入 ${choices.length} 题`)
  return { setId, name, count: choices.length }
}

const BATCH = [
  { subtrack: 'be-web', module: 'backend', label: 'Java 服务端' },
  { subtrack: 'be-micro', module: 'backend', label: '微服务 / 架构' },
  { subtrack: 'be-data', module: 'backend', label: '大数据 / 数仓' },
  { subtrack: 'be-db', module: 'backend', label: '数据库' },
  { subtrack: 'op-trad', module: 'devops', label: 'Linux / 网络' },
  { subtrack: 'op-sre', module: 'devops', label: 'SRE / 可观测' },
  { subtrack: 'op-k8s', module: 'devops', label: 'Kubernetes' },
  { subtrack: 'op-sec', module: 'devops', label: '安全运维' },
  { subtrack: 'fe-web', module: 'frontend', label: 'Web 前端' },
  { subtrack: 'ai-app', module: 'ai', label: 'AI 应用 / RAG' }
]

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const useBatch = args.includes('--batch')

  if (useBatch) {
    for (const cfg of BATCH) {
      const ex = await genForSubtrack(cfg.subtrack, cfg.label)
      writeSet(cfg.module, cfg.subtrack, 'basic', '初中级', cfg.label, ex.basic, dryRun)
      writeSet(cfg.module, cfg.subtrack, 'adv', '高级', cfg.label, ex.advanced, dryRun)
    }
    console.log('BATCH DONE' + (dryRun ? ' (dry-run)' : ''))
    return
  }

  const subtrack = args[0], module = args[1], label = args[2]
  if (!subtrack || !module || !label) {
    console.error('用法: gen-exam.mjs <subtrack> <module> <label> [--dry-run] | --batch')
    process.exit(1)
  }
  const ex = await genForSubtrack(subtrack, label)
  writeSet(module, subtrack, 'basic', '初中级', label, ex.basic, dryRun)
  writeSet(module, subtrack, 'adv', '高级', label, ex.advanced, dryRun)
  console.log('DONE' + (dryRun ? ' (dry-run)' : ''))
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
