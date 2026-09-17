#!/usr/bin/env node
// 批次 2.4：把 seed-content.json（事实源）的合规字段同步进 SQLite。
//
// 为什么需要单独同步：db.ts 的 refreshContentIfNeeded 只 upsert modules/chapters/sections，
// **不刷 interview_questions**；题库字段必须靠本脚本同步。sections 这里也一并同步，
// 避免依赖服务重启才生效。
//
// 用法：node scripts/sync-content-license.mjs
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DB_PATH = path.join(ROOT, 'data', 'devmentor.db')
const SEED = path.join(ROOT, 'data', 'seed-content.json')

if (!fs.existsSync(DB_PATH)) { console.error('找不到 DB:', DB_PATH); process.exit(1) }
const db = new Database(DB_PATH)
db.pragma('busy_timeout = 5000')

const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)

/* ---------- 0. 确保迁移 v35 已应用（幂等，与 db.ts 中定义保持一致） ---------- */
const secCols = cols('sections')
const addSec = (col, ddl) => { if (!secCols.includes(col)) { db.exec(`ALTER TABLE sections ADD COLUMN ${ddl}`); console.log(`  + sections.${col}`) } }
addSec('source_url', 'source_url TEXT')
addSec('source_type', 'source_type TEXT')
addSec('license', 'license TEXT')
addSec('rewrite_level', "rewrite_level TEXT DEFAULT 'paraphrased'")
addSec('status', "status TEXT DEFAULT 'published'")
addSec('reviewed_at', 'reviewed_at INTEGER')
addSec('version', 'version INTEGER DEFAULT 1')
const qCols = cols('interview_questions')
const addQ = (col, ddl) => { if (!qCols.includes(col)) { db.exec(`ALTER TABLE interview_questions ADD COLUMN ${ddl}`); console.log(`  + interview_questions.${col}`) } }
addQ('source_type', 'source_type TEXT')
addQ('license', 'license TEXT')
addQ('rewrite_level', "rewrite_level TEXT DEFAULT 'paraphrased'")
addQ('status', "status TEXT DEFAULT 'published'")
addQ('reviewed_at', 'reviewed_at INTEGER')
addQ('version', 'version INTEGER DEFAULT 1')

/* ---------- 1. 读 seed ---------- */
const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'))
console.log(`\nseedVersion=${seed.seedVersion}`)

/* ---------- 2. 同步 sections ---------- */
const upSec = db.prepare(`UPDATE sections SET source_url=?, source_type=?, license=?, rewrite_level=?, status=?, reviewed_at=?, version=? WHERE id=?`)
let secDone = 0, secMissing = 0
const syncSections = db.transaction(() => {
  for (const m of seed.modules || []) {
    for (const ch of m.chapters || []) {
      for (const s of ch.sections || []) {
        const r = upSec.run(
          s.source_url ?? null, s.source_type ?? null, s.license ?? null,
          s.rewrite_level ?? 'paraphrased', s.status ?? 'published',
          s.reviewed_at ?? null, s.version ?? 1, s.id
        )
        if (r.changes) secDone++; else secMissing++
      }
    }
  }
})
syncSections()

/* ---------- 3. 同步 questions ---------- */
const upQ = db.prepare(`UPDATE interview_questions SET source=?, source_type=?, license=?, rewrite_level=?, status=?, version=? WHERE id=?`)
let qDone = 0, qMissing = 0
const syncQuestions = db.transaction(() => {
  for (const [track, bank] of Object.entries(seed.interview || {})) {
    for (const arr of [bank.hot || [], bank.special || []]) {
      for (const q of arr) {
        const r = upQ.run(
          q.source ?? null, q.source_type ?? null, q.license ?? null,
          q.rewrite_level ?? 'paraphrased', q.status ?? 'published', q.version ?? 1, q.id
        )
        if (r.changes) qDone++; else qMissing++
      }
    }
  }
})
syncQuestions()

console.log(`\n===== 同步结果 =====`)
console.log(`  sections   更新 ${secDone}，库中无匹配 ${secMissing}`)
console.log(`  questions  更新 ${qDone}，库中无匹配 ${qMissing}`)

/* ---------- 4. 校验：DB 与 seed 分布是否一致 ---------- */
console.log(`\n===== DB 当前分布（校验）=====`)
const lic = db.prepare('SELECT license, COUNT(*) c FROM interview_questions GROUP BY license ORDER BY c DESC').all()
const st = db.prepare('SELECT status, COUNT(*) c FROM interview_questions GROUP BY status ORDER BY c DESC').all()
console.log('  questions license:', lic.map(r => `${r.license}=${r.c}`).join('  '))
console.log('  questions status :', st.map(r => `${r.status}=${r.c}`).join('  '))
const slic = db.prepare('SELECT license, COUNT(*) c FROM sections GROUP BY license ORDER BY c DESC').all()
const sst = db.prepare('SELECT status, COUNT(*) c FROM sections GROUP BY status ORDER BY c DESC').all()
console.log('  sections  license:', slic.map(r => `${r.license}=${r.c}`).join('  '))
console.log('  sections  status :', sst.map(r => `${r.status}=${r.c}`).join('  '))

const rows = db.prepare(`SELECT id,source_url,license,status FROM sections WHERE license='proprietary' LIMIT 2`).all()
console.log('\n  红灯 section 样例:')
rows.forEach(r => console.log(`    [${r.id}] ${r.source_url} → ${r.license}/${r.status}`))
const qrows = db.prepare(`SELECT id,q,source,license,status FROM interview_questions WHERE license='proprietary' LIMIT 2`).all()
console.log('  红灯 question 样例:')
qrows.forEach(r => console.log(`    [${r.id}] ${(r.q || '').slice(0, 26)} src=${r.source} → ${r.license}/${r.status}`))

const totalQ = db.prepare('SELECT COUNT(*) c FROM interview_questions').get().c
const totalS = db.prepare('SELECT COUNT(*) c FROM sections').get().c
console.log(`\n  总数校验: questions=${totalQ}（应为 16453） sections=${totalS}（应为 1810）`)
const ok = totalQ === 16453 && totalS === 1810 && qMissing === 0 && secMissing === 0
console.log(ok ? '\n  ✅ 批次 2.4 同步通过' : '\n  ⚠️ 存在未匹配或数量异常')
db.close()
process.exit(ok ? 0 : 1)
