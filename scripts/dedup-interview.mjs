// MentorLoop · 面试题库去重合并执行器（rq- 审计的 remediation 步骤）
//
// 背景：audit-interview.mjs 审计发现 13 道同赛道近义/同义重复题（2 精确簇 + 11 近邻改写对），
// 每对保留「答案更完整（更长）」的一条。本脚本一次性把被删除的一方从「在线库」与「种子真源」两处移除，
// 保持 seed↔DB 一致、且后续全新安装不会再被 seedIfEmpty 重新引入。
//
// 与 server/utils/db.ts 的 v23 迁移共享同一 DROP 清单（确定性、可重跑、零 LLM）。
//
// 用法：
//   node scripts/dedup-interview.mjs            # 执行合并（写库 + 写种子）
//   node scripts/dedup-interview.mjs --dry-run  # 仅打印将删除的条目数，不落盘
//
// 注意：本脚本直接写 data/devmentor.db 与 data/seed-content.json，执行前请确认无未提交的重要数据。
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const DB_PATH = path.join(root, 'data', 'devmentor.db')
const SEED_PATH = path.join(root, 'data', 'seed-content.json')

// 与 db.ts v23 迁移完全一致的 drop 清单。
// 精确簇（仅全/半角引号差异）保留较小 id：xq-f-27、xq-b-127。
// 近邻改写对保留答案更长的一方：xq-b-923 / xq-b-472 / xq-f-956 / xq-b-488 / xq-o-298 / xq-o-45 / xq-b-23 / xq-o-33 / xq-o-649 / xq-f-645 / xq-b-56。
const DROP = new Set([
  'xq-f-28', 'xq-b-128', // 精确簇
  'xq-b-924', 'xq-b-471', 'xq-f-957', 'xq-b-487', 'xq-o-299', 'xq-o-44',
  'xq-b-22', 'xq-o-34', 'xq-o-650', 'xq-f-646', 'xq-b-55' // 近邻改写对
])

const dry = process.argv.includes('--dry-run')

// ---- 种子真源 ----
const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
let seedBefore = 0
let seedRemoved = 0
let seedRemovedIds = []
for (const bank of Object.values(seed.interview || {})) {
  for (const key of ['hot', 'special']) {
    const arr = bank[key]
    if (!Array.isArray(arr)) continue
    seedBefore += arr.length
    const kept = []
    for (const q of arr) {
      if (DROP.has(q.id)) { seedRemoved++; seedRemovedIds.push(q.id) }
      else kept.push(q)
    }
    bank[key] = kept
  }
}
if (!dry) fs.writeFileSync(SEED_PATH, JSON.stringify(seed))

// ---- 在线库 ----
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')
const dbBefore = db.prepare('SELECT COUNT(*) c FROM interview_questions').get().c
let dbRemoved = 0
if (!dry) {
  const delQ = db.prepare('DELETE FROM interview_questions WHERE id=?')
  let delWI = null
  try { delWI = db.prepare('DELETE FROM user_wrong_items WHERE item_id=?') } catch { /* 表/列不存在则跳过 */ }
  const tx = db.transaction(() => {
    for (const id of DROP) {
      dbRemoved += delQ.run(id).changes
      if (delWI) delWI.run(id)
    }
  })
  tx()
}
const dbAfter = db.prepare('SELECT COUNT(*) c FROM interview_questions').get().c
db.close()

console.log('[seed] before=%d removed=%d after=%d', seedBefore, seedRemoved, seedBefore - seedRemoved)
console.log('[db]   before=%d removed=%d after=%d', dbBefore, dbRemoved, dbAfter)
if (seedRemovedIds.length) console.log('[removed ids]', seedRemovedIds.join(', '))
console.log(dry ? 'DRY-RUN：未写入任何文件。' : 'APPLIED：已合并去重。')
