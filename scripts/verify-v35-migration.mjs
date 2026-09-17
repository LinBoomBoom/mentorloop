// 批次 2.3 验证：在真实库副本上执行 v35 迁移 + 新 INSERT 语句，确认不破坏既有数据。
// 不碰生产库，全程操作临时副本。
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SRC = 'E:/LsqCoding/MentorLoop/data/backups/2026-09-17T15-31-23-695Z/devmentor.db'
const TMP = path.join(os.tmpdir(), 'ml-v35-' + Date.now() + '.db')
fs.copyFileSync(SRC, TMP)
const db = new Database(TMP)

const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c

const beforeSec = count('sections')
const beforeQ = count('interview_questions')
console.log('迁移前:  sections=%d  questions=%d', beforeSec, beforeQ)

/* ---- 执行 v35（与 db.ts 中 MIGRATIONS 35 完全一致）---- */
const secCols = cols('sections')
const addSec = (col, ddl) => { if (!secCols.includes(col)) db.exec(`ALTER TABLE sections ADD COLUMN ${ddl}`) }
addSec('source_url', 'source_url TEXT')
addSec('source_type', 'source_type TEXT')
addSec('license', 'license TEXT')
addSec('rewrite_level', "rewrite_level TEXT DEFAULT 'paraphrased'")
addSec('status', "status TEXT DEFAULT 'published'")
addSec('reviewed_at', 'reviewed_at INTEGER')
addSec('version', 'version INTEGER DEFAULT 1')

const qCols = cols('interview_questions')
const addQ = (col, ddl) => { if (!qCols.includes(col)) db.exec(`ALTER TABLE interview_questions ADD COLUMN ${ddl}`) }
addQ('source_type', 'source_type TEXT')
addQ('license', 'license TEXT')
addQ('rewrite_level', "rewrite_level TEXT DEFAULT 'paraphrased'")
addQ('status', "status TEXT DEFAULT 'published'")
addQ('reviewed_at', 'reviewed_at INTEGER')
addQ('version', 'version INTEGER DEFAULT 1')

db.exec('CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status)')
db.exec('CREATE INDEX IF NOT EXISTS idx_questions_license ON interview_questions(license)')
db.exec('CREATE INDEX IF NOT EXISTS idx_questions_status ON interview_questions(status)')

console.log('\n===== 迁移后列检查 =====')
const need = ['source_url', 'source_type', 'license', 'rewrite_level', 'status', 'reviewed_at', 'version']
let ok = true
for (const c of need) {
  const has = cols('sections').includes(c)
  if (!has) ok = false
  console.log(`  sections.${c.padEnd(14)} ${has ? 'OK' : '❌ 缺失'}`)
}
for (const c of ['source', 'source_type', 'license', 'rewrite_level', 'status', 'reviewed_at', 'version']) {
  const has = cols('interview_questions').includes(c)
  if (!has) ok = false
  console.log(`  questions.${c.padEnd(13)} ${has ? 'OK' : '❌ 缺失'}`)
}

/* ---- 幂等性：再跑一次不应报错 ---- */
try {
  const secCols2 = cols('sections')
  for (const [col, ddl] of [['source_url', 'source_url TEXT'], ['license', 'license TEXT']]) {
    if (!secCols2.includes(col)) db.exec(`ALTER TABLE sections ADD COLUMN ${ddl}`)
  }
  console.log('\n  OK  重复执行幂等，未报错')
} catch (e) { ok = false; console.log('\n  ❌ 幂等失败:', e.message) }

/* ---- 新 INSERT 语句参数匹配验证 ---- */
console.log('\n===== 新 INSERT 参数匹配 =====')
const stmts = [
  ['sections(upsert)', 'INSERT OR REPLACE INTO sections (id,chapter_id,title,objective,content,position,source_url,source_type,license,rewrite_level,status,reviewed_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', 13],
  ['sections(insert)', 'INSERT OR IGNORE INTO sections (id,chapter_id,title,objective,content,position,source_url,source_type,license,rewrite_level,status,reviewed_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', 13],
  ['questions(insert)', 'INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords,weight,difficulty,tech,subtrack,skill,source,source_type,license,rewrite_level,status,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 17]
]
for (const [name, sql, n] of stmts) {
  const placeholders = (sql.match(/\?/g) || []).length
  const colCount = sql.slice(sql.indexOf('(') + 1, sql.indexOf(')')).split(',').length
  const match = placeholders === n && colCount === n
  if (!match) ok = false
  console.log(`  ${name.padEnd(18)} 列=${colCount} 占位符=${placeholders} 期望=${n}  ${match ? 'OK' : '❌'}`)
  // prepare 一次，确认 SQLite 接受
  try { db.prepare(sql); console.log(`    SQLite prepare: OK`) }
  catch (e) { ok = false; console.log(`    SQLite prepare ❌: ${e.message}`) }
}

/* ---- 实插一行验证写入 ---- */
try {
  db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,objective,content,position,source_url,source_type,license,rewrite_level,status,reviewed_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run('probe-s-1', 'fe-c1', '探针', '目标', '正文', 999, 'https://developer.mozilla.org/', 'official-docs', 'cc-by-sa', 'paraphrased', 'published', 1785628800000, 1)
  const row = db.prepare('SELECT source_url,source_type,license,rewrite_level,status,reviewed_at,version FROM sections WHERE id=?').get('probe-s-1')
  console.log('\n===== 写入回读 =====')
  console.log(' ', JSON.stringify(row))
  const good = row.license === 'cc-by-sa' && row.status === 'published' && row.version === 1
  if (!good) ok = false
  console.log(' ', good ? 'OK  字段写入正确' : '❌ 字段不符')
} catch (e) { ok = false; console.log(' ❌ 写入失败:', e.message) }

/* ---- 既有数据完整性 ---- */
const afterSec = count('sections')
const afterQ = count('interview_questions')
console.log('\n===== 既有数据 =====')
console.log(`  sections : ${beforeSec} → ${afterSec} ${afterSec === beforeSec + 1 ? 'OK（+1 为探针行）' : '❌'}`)
console.log(`  questions: ${beforeQ} → ${afterQ} ${afterQ === beforeQ ? 'OK 未变' : '❌'}`)
if (afterSec !== beforeSec + 1 || afterQ !== beforeQ) ok = false

db.close()
fs.unlinkSync(TMP)
console.log('\n===== 总判定 =====')
console.log(ok ? '  ✅ 批次 2.3 数据层改动验证通过' : '  ⚠️ 存在异常')
process.exit(ok ? 0 : 1)
