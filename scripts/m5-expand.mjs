// M5 题库扩建 CLI：生产库执行（先备份 → 治理 → 扩建 → 报告）
// 用法：node scripts/m5-expand.mjs   （DB_PATH 默认 data/devmentor.db）
import Database from 'better-sqlite3'
import { copyFileSync } from 'fs'
import { cleanupOrphans, expandContent } from './m5-expand-lib.mjs'

const DB = process.env.DB_PATH || 'data/devmentor.db'

// 1. 备份
const bak = `${DB}.bak-${Date.now()}`
try { copyFileSync(DB, bak); console.log('[backup]', bak) }
catch (e) { console.error('[backup failed]', e); process.exit(1) }

// 2. 删除前安全核查（有引用则中止，绝不冒险）
const db0 = new Database(DB, { readonly: true })
const e1Ref = db0.prepare('SELECT COUNT(*) n FROM exam_records WHERE set_id=?').get('e1').n
const m1Sec = db0.prepare("SELECT GROUP_CONCAT(id) ids FROM sections WHERE chapter_id IN (SELECT id FROM chapters WHERE module_id='m1')").get()
const m1Prog = m1Sec.ids ? db0.prepare(`SELECT COUNT(*) n FROM progress WHERE section_id IN (${m1Sec.ids.split(',').map(() => '?').join(',')})`).all(m1Sec.ids.split(',')).reduce((a, r) => a + r.n, 0) : 0
db0.close()
if (e1Ref > 0 || m1Prog > 0) {
  console.error(`[ABORT] 存在引用：e1 records=${e1Ref}, m1 progress=${m1Prog}。终止以避免破坏数据。`)
  process.exit(1)
}
console.log('[precheck] e1 records=0, m1 progress=0 → 可安全清理')

// 3. 治理 + 扩建
const db = new Database(DB)
db.pragma('foreign_keys = ON')
console.log('[cleanup]', cleanupOrphans(db))
console.log('[expand]', expandContent(db))

// 4. 报告
const report = {
  exam_sets: db.prepare('SELECT COUNT(*) n FROM exam_sets').get().n,
  vip_sets: db.prepare('SELECT COUNT(*) n FROM exam_sets WHERE vip_only=1').get().n,
  interview: db.prepare('SELECT COUNT(*) n FROM interview_questions').get().n,
  interview_no_weight: db.prepare('SELECT COUNT(*) n FROM interview_questions WHERE weight IS NULL').get().n,
  modules: db.prepare("SELECT COUNT(*) n FROM modules WHERE id IN ('frontend','backend','devops','ai')").get().n,
  e1_exists: db.prepare("SELECT COUNT(*) n FROM exam_sets WHERE id='e1'").get().n,
  m1_exists: db.prepare("SELECT COUNT(*) n FROM modules WHERE id='m1'").get().n
}
console.log('[report]', JSON.stringify(report))
db.close()
