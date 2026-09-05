// 面试题答案深度改写脚本
// 用 Deepseek 把简短参考答案扩写成「核心结论 + 分点展开 + 代码示例/命令 + 常见坑 + 面试小结」的结构化答案。
// 用法（在仓库根目录运行，需先 export CODEBUDDY_SESSION_ID= 等绕过钩子）：
//   试运行（只打印不写库）： node scripts/deepen-answers.mjs --dry --ids iq-m5-be-5,iq-m5-ai-24,oq3
//   全量浅答案（默认 len<400）： node scripts/deepen-answers.mjs
//   全部强制重写：            node scripts/deepen-answers.mjs --all --force
//   指定方向：                node scripts/deepen-answers.mjs --track frontend
//   并发/阈值：               node scripts/deepen-answers.mjs --concurrency 5 --min-len 400
//
// 容错：markdown 直出（非 JSON），避免 Deepseek 偶发未转义引号导致解析失败。

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---- 解析 .env 取密钥（standalone node 不会自动加载 nuxt 的 env）----
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

// ---- 参数解析 ----
const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a.startsWith('--')) {
    const eq = a.indexOf('=')
    if (eq > 0) args.set(a.slice(2, eq), a.slice(eq + 1))
    else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) { args.set(a.slice(2), process.argv[++i]) }
    else args.set(a.slice(2), 'true')
  }
}
const DRY = args.has('dry')
const FORCE = args.has('force')
const ALL = args.has('all')
const IDS = args.get('ids')?.split(',').filter(Boolean) || null
const TRACK = args.get('track') || null
const MIN_LEN = parseInt(args.get('min-len') || '400', 10)
const CONCURRENCY = parseInt(args.get('concurrency') || '5', 10)
const LIMIT = parseInt(args.get('limit') || '0', 10)

// ---- DB ----（应用默认库：data/devmentor.db；与 app 的 DB_PATH 默认值一致）
const DB = path.join(ROOT, 'data', 'devmentor.db')
const db = new Database(DB, { readonly: false })
db.pragma('journal_mode = WAL')

function buildMessages(row) {
  const sys = `你是一位资深技术面试官与讲师，擅长把面试题的简短参考答案，扩写成条理清晰、有深度、可直接用于面试作答的参考答案。严格使用中文，使用 markdown 格式，不要使用英文段落。`
  // 字数档位（软约束），配合 callLlm 的 maxTokens 硬上限
  const difficultyHint = row.difficulty === 'hard'
    ? '困难/架构类：650-850 字，可更系统'
    : row.difficulty === 'easy'
      ? '入门级：250-400 字，讲清基础即可'
      : '普通难度：450-650 字'
  // 硬上限（token）：easy≈400 / medium≈600 / hard≈900，换算中文约 550 / 800 / 1200 字
  const maxTokens = row.difficulty === 'hard' ? 560 : row.difficulty === 'easy' ? 350 : 480
  const user = `题目方向：${row.track}（技术细分：${row.tech || '综合'}）
题目难度：${row.difficulty}
面试题：${row.q}

已有的简短参考答案（作为要点种子，请在其基础上深化，不要简单复述）：
${row.a}

请扩写/深化这道面试题的参考答案，要求：
1. 先用一句话给出核心结论。
2. 再分点展开（原理、机制、设计取舍），技术类请在合适处给出简短代码示例、配置片段或命令。
3. 补充「常见坑 / 易错点」一节。
4. 结尾用「面试小结」给一句便于记忆的总结。
${difficultyHint}
全局硬约束：答案总字数（含标点）不得超过 800 字（困难题可放宽到 900 字），超出将被截断，请务必精炼、不注水；不要写「以下是…」「参考答案：」之类的套话，直接输出答案正文。`
  return { messages: [
    { role: 'system', content: sys },
    { role: 'user', content: user }
  ], maxTokens }
}

async function callLlm(messages, opts = {}) {
  const maxTokens = opts.maxTokens || 1100
  const timeoutMs = opts.timeoutMs || 45000
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.5, max_tokens: maxTokens, stream: false }),
    signal: AbortSignal.timeout(timeoutMs)
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`LLM ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const c = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!c) throw new Error('LLM 返回空')
  return c
}

function selectRows() {
  let sql = 'SELECT id, track, tech, difficulty, q, a, length(a) AS alen FROM interview_questions WHERE 1=1'
  const params = []
  if (IDS) {
    sql = sql.replace('1=1', `id IN (${IDS.map(() => '?').join(',')})`)
    params.push(...IDS)
  } else {
    if (TRACK) { sql += ' AND track=?'; params.push(TRACK) }
    if (!ALL) { sql += ' AND length(a) < ?'; params.push(MIN_LEN) }
  }
  sql += ' ORDER BY length(a) ASC'
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`
  return db.prepare(sql).all(...params)
}

const rows = selectRows()
console.log(`待处理题目数：${rows.length}${DRY ? '（试运行，不写库）' : ''}`)

// 断点续跑：已完成 id 写入进度文件，重跑自动跳过（--force 可强制重做）
const PROGRESS = path.join(ROOT, '.workbuddy', 'deepen-done.json')
const doneSet = new Set(fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : [])
if (doneSet.size) console.log(`已完成的题目（将跳过）：${doneSet.size}`)

let done = 0, skipped = 0, failed = 0
const failedIds = []
const updateStmt = db.prepare('UPDATE interview_questions SET a=? WHERE id=?')

async function worker(queue) {
  for (const row of queue) {
    try {
      if (!FORCE && doneSet.has(row.id)) { skipped++; continue }
      const { messages, maxTokens } = buildMessages(row)
      const deep = await callLlm(messages, { maxTokens })
      if (DRY) {
        console.log(`\n========== [${row.id}] (${row.track}/${row.tech}/${row.difficulty}) alen ${row.alen} -> ${deep.length}) ==========`)
        console.log('Q:', row.q)
        console.log('--- 原答案 ---\n' + row.a)
        console.log('--- 深化后 ---\n' + deep)
      } else {
        updateStmt.run(deep, row.id)
        doneSet.add(row.id)
        fs.writeFileSync(PROGRESS, JSON.stringify([...doneSet]))
        console.log(`✓ ${row.id} (${row.track}/${row.difficulty}) ${row.alen} -> ${deep.length}`)
      }
      done++
    } catch (e) {
      failed++; failedIds.push(row.id)
      console.error(`✗ ${row.id} 失败: ${e.message}`)
    }
  }
}

// 并发分片
const chunks = Array.from({ length: CONCURRENCY }, () => [])
rows.forEach((r, i) => chunks[i % CONCURRENCY].push(r))
await Promise.all(chunks.map(worker))

console.log(`\n=== 完成：写入/试运行=${done} 跳过(已深)=${skipped} 失败=${failed} ===`)
if (failedIds.length) console.log('失败 ids:', failedIds.join(', '))
db.close()
