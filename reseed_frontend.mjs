// 合并前端知识树分片并重新灌库（保留 users / sessions / auth_codes）
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const ROOT = 'E:/LsqCoding/MentorLoop'
const WS = 'C:/Users/13057/WorkBuddy/2026-07-31-00-01-27'
const seedPath = path.join(ROOT, 'data/seed-content.json')
const dbPath = path.join(ROOT, 'data/devmentor.db')

// 1) 加载种子 + 三个分片
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
const A = JSON.parse(fs.readFileSync(path.join(WS, 'fe_part_a.json'), 'utf-8'))
const B = JSON.parse(fs.readFileSync(path.join(WS, 'fe_part_b.json'), 'utf-8'))
const C = JSON.parse(fs.readFileSync(path.join(WS, 'fe_part_c.json'), 'utf-8'))

const newChapters = [...A.chapters, ...B.chapters, ...C.chapters]
const fe = seed.modules.find((m) => m.id === 'frontend')
if (!fe) throw new Error('frontend module not found')
fe.chapters = newChapters

// 2) 写回种子（保留 backend / devops 不变）
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2), 'utf-8')
console.log(`[merge] frontend chapters=${fe.chapters.length}, sections=${fe.chapters.reduce((n, c) => n + c.sections.length, 0)}`)

// 3) 重新灌库
const fresh = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 先清内容表（子表先于父表，避免 FK 冲突）；保留 users/sessions/auth_codes
const tables = ['exam_records', 'progress', 'exam_written', 'exam_choices', 'exam_sets', 'interview_questions', 'sections', 'chapters', 'modules']
for (const t of tables) {
  db.exec(`DELETE FROM ${t}`)
}
console.log('[reseed] content tables cleared')

const insMod = db.prepare('INSERT OR IGNORE INTO modules (id,name,icon,color,desc,position) VALUES (?,?,?,?,?,?)')
const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position) VALUES (?,?,?,?,?)')
const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
const insQ = db.prepare('INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords) VALUES (?,?,?,?,?,?)')
const insSet = db.prepare('INSERT OR IGNORE INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)')
const insC = db.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,explain,multi) VALUES (?,?,?,?,?,?,?,?)')
const insW = db.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference) VALUES (?,?,?,?,?)')

const tx = db.transaction(() => {
  fresh.modules.forEach((m, mi) => {
    insMod.run(m.id, m.name, m.icon, m.color, m.desc, mi)
    m.chapters.forEach((ch, ci) => {
      insCh.run(ch.id, m.id, ch.title, ch.goal, ci)
      ch.sections.forEach((s, si) => {
        insSec.run(s.id, ch.id, s.title, s.direction, s.content, si)
      })
    })
  })
  Object.entries(fresh.interview).forEach(([track, bank]) => {
    ;[...bank.hot, ...bank.special].forEach((q) => {
      insQ.run(q.id, track, q.id[1] === 's' ? 'special' : 'hot', q.q, q.a, JSON.stringify(q.keywords || []))
    })
  })
  fresh.examSets.forEach((set) => {
    insSet.run(set.id, set.name, set.track, set.level, set.duration, set.vipOnly ? 1 : 0)
    set.choices.forEach((c) => insC.run(c.id, set.id, c.tag, c.q, JSON.stringify(c.options), JSON.stringify(c.answer), c.explain, c.multi ? 1 : 0))
    set.written.forEach((w) => insW.run(w.id, set.id, w.q, JSON.stringify(w.points), w.reference))
  })
})
tx()

const count = (t) => db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c
console.log('[reseed] modules=%d chapters=%d sections=%d questions=%d examSets=%d choices=%d written=%d users=%d',
  count('modules'), count('chapters'), count('sections'), count('interview_questions'),
  count('exam_sets'), count('exam_choices'), count('exam_written'), count('users'))
db.close()
console.log('[done] reseed complete')
