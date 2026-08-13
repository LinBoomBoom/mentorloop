// 面试题库回填脚本：对现有题目逐题调用 Deepseek 重判「难度三档」+「技术子类」。
// 背景：gen-interview.mjs 早期把 LLM 的 常规/较难/困难 塌缩成 2 档存储（较难丢失），
//       且技术子类用关键词 classifyTech 命中，约 20% 落入「综合」兜底。
//       本脚本用 LLM 基于 (题干+答案) 直接判难度与技术，修复这两点。
// 重要：同时 UPDATE DB 与 seed-content.json（遵循持久化铁律），结束做全量对账保证两者一致。
//
// 用法（仓库根目录）：
//   node scripts/reclassify.mjs                 # 全量重判（默认并发 8）
//   node scripts/reclassify.mjs --concurrency 5
//   node scripts/reclassify.mjs --dry           # 试运行，不写库/种子
//   node scripts/reclassify.mjs --limit 30      # 只处理前 30 道（调试）

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[m[1]] = v
    }
  }
}
loadEnv()

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const MODEL = process.env.LLM_MODEL || 'deepseek-chat'
if (!DEEPSEEK_KEY) { console.error('缺少 DEEPSEEK_API_KEY'); process.exit(1) }

const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a.startsWith('--')) {
    const eq = a.indexOf('=')
    if (eq > 0) args.set(a.slice(2, eq), a.slice(eq + 1))
    else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) args.set(a.slice(2), process.argv[++i])
    else args.set(a.slice(2), 'true')
  }
}
const DRY = args.has('dry')
const LIMIT = parseInt(args.get('limit') || '0', 10)
const CONCURRENCY = Math.min(parseInt(args.get('concurrency') || '8', 10), 10)

const DB_PATH = path.join(ROOT, 'data', 'devmentor.db')
const SEED_PATH = path.join(ROOT, 'data', 'seed-content.json')
const PROGRESS = path.join(ROOT, '.workbuddy', 'reclassify-done.json')
const LOCK = path.join(ROOT, '.workbuddy', 'reclassify.lock')

// 各方向合法技术子类（用于校验 LLM 输出）
const TECH_NAMES = {
  frontend: ['JavaScript', 'TypeScript', 'Vue', 'React', 'CSS', 'HTML', '浏览器/渲染', '网络/HTTP', '性能优化', '安全', '工程化/构建'],
  backend: ['Java/Spring', 'MySQL/数据库', 'Redis/缓存', '并发/多线程', '分布式/微服务', '消息队列', '网络/TCP', '系统设计'],
  devops: ['Linux/排查', '网络/TCP/HTTPS', 'Nginx/网关', '容器/Docker', 'Kubernetes', 'CI/CD/发布', '监控/SRE'],
  ai: ['提示工程/Prompt', 'RAG', 'Embedding/向量', '评估/Eval', 'Agent/工具调用', '模型基础/训练', '应用与部署']
}

const db = new Database(DB_PATH, { readonly: false })
db.pragma('journal_mode = WAL')

// 种子加载 + 建索引
const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'))
const seedIdx = new Map() // id -> { arr, idx }
for (const t of Object.keys(TECH_NAMES)) {
  const bank = seed.interview?.[t] || {}
  for (const arrName of ['hot', 'special']) {
    const arr = bank[arrName] || []
    arr.forEach((x, idx) => seedIdx.set(x.id, { arr, idx }))
  }
}

// 单实例锁
if (!DRY) {
  if (fs.existsSync(LOCK)) {
    const pid = fs.readFileSync(LOCK, 'utf8').trim()
    let alive = false
    try { process.kill(Number(pid), 0); alive = true } catch { /* dead */ }
    if (alive) { console.error(`已有实例在运行（pid ${pid}），已退出。`); process.exit(1) }
    console.warn(`发现残留锁（pid ${pid} 已退出），继续。`)
  }
  fs.writeFileSync(LOCK, String(process.pid))
  const clean = () => { try { fs.unlinkSync(LOCK) } catch { /* */ } }
  process.on('exit', clean)
  process.on('SIGINT', () => { clean(); process.exit(130) })
  process.on('SIGTERM', () => { clean(); process.exit(143) })
}

// 断点续跑
const doneSet = new Set(fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : [])
if (doneSet.size) console.log(`已完成（将跳过）：${doneSet.size}`)

// 读全部题目
let questions = db.prepare('SELECT id, track, type, q, a, tech, difficulty FROM interview_questions').all()
if (LIMIT > 0) questions = questions.slice(0, LIMIT)
const todo = questions.filter((r) => !doneSet.has(r.id))
console.log(`待处理：${todo.length}（总 ${questions.length}）${DRY ? '（试运行）' : ''} 并发=${CONCURRENCY}`)

// LLM
async function callLlm(messages, opts = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0, max_tokens: opts.maxTokens || 200, stream: false }),
    signal: AbortSignal.timeout(opts.timeoutMs || 30000)
  })
  if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`LLM ${res.status}: ${txt.slice(0, 160)}`) }
  const data = await res.json()
  const c = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!c) throw new Error('LLM 返回空')
  return c
}

function buildMessages(track, q, a) {
  const list = TECH_NAMES[track].join('、')
  const sys = '你是资深技术面试官。只依据给定题目与参考答案判断，不要发散。'
  const user = `方向：${track}\n题目：${q}\n参考答案（节选）：${(a || '').slice(0, 1100)}\n\n请判断：\n1) 难度：常规 / 较难 / 困难\n2) 技术子类：只能从下列选一个最贴合的 —— ${list}\n\n严格只输出两行，不要任何其它文字：\n难度：<常规|较难|困难>\n技术：<列表中的一项>`
  return [{ role: 'system', content: sys }, { role: 'user', content: user }]
}

function parseOut(text) {
  const dm = text.match(/难度[：:]\s*([\s\S]*?)(?=\n|$)/)
  const tm = text.match(/技术[：:]\s*([\s\S]*?)(?=\n|$)/)
  const dRaw = (dm ? dm[1].trim() : '').replace(/[。.]$/, '')
  const tRaw = (tm ? tm[1].trim() : '').replace(/[。.]$/, '')
  return { dRaw, tRaw }
}

const updStmt = db.prepare('UPDATE interview_questions SET difficulty=?, tech=? WHERE id=?')

let processed = 0, changed = 0, failed = 0

function applyRow(row, dRaw, tRaw) {
  // 难度：special 行固定 hard（维持 困难→special 的 type 耦合）；hot 行按 LLM 重分，困难钳为 medium 留在 hot
  let newDiff
  if (row.type === 'special') newDiff = 'hard'
  else newDiff = dRaw === '困难' ? 'medium' : (dRaw === '较难' ? 'medium' : 'normal')
  if (dRaw !== '常规' && dRaw !== '较难' && dRaw !== '困难') newDiff = row.difficulty // LLM 异常则保留原值

  // 技术：校验是否在合法列表，否则保留原值（含 综合）
  const valid = TECH_NAMES[row.track] || []
  const newTech = valid.includes(tRaw) ? tRaw : row.tech

  if (!DRY) {
    updStmt.run(newDiff, newTech, row.id)
    const ref = seedIdx.get(row.id)
    if (ref) { ref.arr[ref.idx].difficulty = newDiff; ref.arr[ref.idx].tech = newTech }
  }
  if (newDiff !== row.difficulty || newTech !== row.tech) changed++
  return { newDiff, newTech }
}

function flushSeed() {
  if (DRY) return
  const tmp = SEED_PATH + '.reclassify.tmp'
  fs.writeFileSync(tmp, JSON.stringify(seed, null, 1))
  fs.renameSync(tmp, SEED_PATH)
}
function saveProgress() {
  if (DRY) return
  fs.writeFileSync(PROGRESS, JSON.stringify([...doneSet]))
}

async function worker(queue) {
  for (const row of queue) {
    try {
      const raw = await callLlm(buildMessages(row.track, row.q, row.a), { maxTokens: 200 })
      const { dRaw, tRaw } = parseOut(raw)
      applyRow(row, dRaw, tRaw)
      doneSet.add(row.id)
      processed++
      if (processed % 50 === 0) {
        console.log(`  进度 ${processed}/${todo.length} 已变更 ${changed}`)
        flushSeed(); saveProgress()
      }
    } catch (e) {
      failed++
      console.error(`✗ ${row.id} 失败: ${e.message}`)
    }
  }
}

const chunks = Array.from({ length: CONCURRENCY }, () => [])
todo.forEach((r, i) => chunks[i % CONCURRENCY].push(r))
await Promise.all(chunks.map(worker))

// 收尾：全量对账，保证 DB 与 seed 完全一致（覆盖任何未 flush 的中间态）
console.log('全量对账 seed ← DB ...')
if (!DRY) {
  const all = db.prepare('SELECT id, difficulty, tech FROM interview_questions').all()
  const tx = db.transaction(() => {
    for (const r of all) {
      const ref = seedIdx.get(r.id)
      if (ref) { ref.arr[ref.idx].difficulty = r.difficulty; ref.arr[ref.idx].tech = r.tech }
      updStmt.run(r.difficulty, r.tech, r.id)
    }
  })
  tx()
  flushSeed()
  saveProgress()
}

// 结果汇总
const dist = db.prepare('SELECT difficulty, count(*) c FROM interview_questions GROUP BY difficulty').all()
const zong = db.prepare("SELECT count(*) c FROM interview_questions WHERE tech='综合'").get().c
const total = db.prepare('SELECT count(*) c FROM interview_questions').get().c
console.log(`\n=== 完成：处理 ${processed} 变更 ${changed} 失败 ${failed} ===`)
console.log('难度分布:', dist.map((d) => `${d.difficulty}:${d.c}`).join('  '))
console.log(`综合兜底：${zong}/${total}（${((zong / total) * 100).toFixed(1)}%）`)
if (failed) console.log('提示：失败题已跳过，重跑本脚本会自动续跑。')
db.close()
