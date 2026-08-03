// M5 扩建/治理核心逻辑（被 CLI 与测试复用）
import { vipSets, interviewNew } from './m5-data.mjs'

// 数据治理：清理明确脏数据（e1 空卷、m1 重复前端模块）
export function cleanupOrphans(db) {
  const log = []
  const e1 = db.prepare("SELECT id FROM exam_sets WHERE id='e1'").get()
  if (e1) {
    db.prepare("DELETE FROM exam_choices WHERE set_id='e1'").run()
    db.prepare("DELETE FROM exam_written WHERE set_id='e1'").run()
    db.prepare("DELETE FROM exam_sets WHERE id='e1'").run()
    log.push('deleted e1 empty set')
  }
  const m1 = db.prepare("SELECT id FROM modules WHERE id='m1'").get()
  if (m1) {
    db.prepare("DELETE FROM sections WHERE chapter_id IN (SELECT id FROM chapters WHERE module_id='m1')").run()
    db.prepare("DELETE FROM chapters WHERE module_id='m1'").run()
    db.prepare("DELETE FROM modules WHERE id='m1'").run()
    log.push('deleted m1 duplicate module (with its chapter/section)')
  }
  return log
}

// 题库扩建：插入 4 套 VIP 卷 + 35 道面试题（幂等：固定 id 前缀 + INSERT OR IGNORE）
export function expandContent(db) {
  // 兼容尚未跑 db.ts v6 迁移的生产库：确保面试表含权重列（幂等）
  const cols = db.prepare('PRAGMA table_info(interview_questions)').all().map((c) => c.name)
  if (!cols.includes('weight')) db.prepare('ALTER TABLE interview_questions ADD COLUMN weight INTEGER DEFAULT 3').run()
  if (!cols.includes('difficulty')) db.prepare("ALTER TABLE interview_questions ADD COLUMN difficulty TEXT DEFAULT 'normal'").run()

  let setsAdded = 0, choicesAdded = 0, writtenAdded = 0, iqAdded = 0
  const insSet = db.prepare('INSERT OR IGNORE INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)')
  const insChoice = db.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,"explain",multi) VALUES (?,?,?,?,?,?,?,?)')
  const insWritten = db.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference) VALUES (?,?,?,?,?)')
  const insIq = db.prepare('INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords,weight,difficulty) VALUES (?,?,?,?,?,?,?,?)')

  const tx = db.transaction(() => {
    for (const s of vipSets) {
      if (insSet.run(s.id, s.name, s.track, s.level, s.duration, s.vip ? 1 : 0).changes) setsAdded++
      for (const c of s.choices) {
        if (insChoice.run(c.id, s.id, c.tag, c.q, JSON.stringify(c.options), JSON.stringify(c.answer), c.explain, c.multi ? 1 : 0).changes) choicesAdded++
      }
      for (const w of s.written) {
        if (insWritten.run(w.id, s.id, w.q, JSON.stringify(w.points), w.reference).changes) writtenAdded++
      }
    }
    for (const iq of interviewNew) {
      if (insIq.run(iq.id, iq.track, iq.type, iq.q, iq.a, JSON.stringify(iq.keywords), iq.weight ?? 3, iq.difficulty ?? 'normal').changes) iqAdded++
    }
    // 回填权重：存量 + 新增中未带 weight 的（幂等）
    db.prepare("UPDATE interview_questions SET weight=CASE WHEN type='special' THEN 5 ELSE 3 END, difficulty=CASE WHEN type='special' THEN 'hard' ELSE 'normal' END WHERE weight IS NULL").run()
  })
  tx()
  return { setsAdded, choicesAdded, writtenAdded, iqAdded }
}
