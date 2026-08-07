// 技能掌握度（P0）+ 错题本（P2）+ 技能→章节映射（P1a）服务端工具。
// 设计原则：服务端只做「信号计数 → 状态」的纯计算与持久化，不依赖客户端路线图数据；
// 方向 / 必会 等聚合由前端用已有 roadmap 树合并，避免 server↔client 数据耦合。
import { sqlite } from './db'
import crypto from 'node:crypto'

export function skillKey(track: string, subtrackId: string, name: string): string {
  return [track, subtrackId, name].join('::')
}

export type SkillStatus = 'new' | 'learning' | 'familiar' | 'mastered'

export interface SkillMasteryRow {
  skill_key: string
  marked: number
  practiced_correct: number
  practiced_total: number
  exam_correct: number
  exam_total: number
  learned_sections: number
  learned_total: number
}

// 由信号计数计算状态与掌握度（0-100）。阈值与方向无关，前端再叠加 must 聚合。
export function computeStatus(r: Partial<SkillMasteryRow>): { status: SkillStatus; mastery: number } {
  const marked = r.marked ? 1 : 0
  const pc = r.practiced_correct || 0
  const pt = r.practiced_total || 0
  const ec = r.exam_correct || 0
  const et = r.exam_total || 0
  const ls = r.learned_sections || 0
  const lt = r.learned_total || 0
  if (marked) return { status: 'mastered', mastery: 100 }
  const attempts = pt + et
  if (attempts === 0 && lt === 0) return { status: 'new', mastery: 0 }

  const pRatio = pt ? pc / pt : 0
  const eRatio = et ? ec / et : 0
  const examWeight = et ? 1.5 : 0
  const practiceWeight = pt ? 1 : 0
  const learnWeight = lt ? 0.5 : 0
  const denom = practiceWeight + examWeight + learnWeight
  let mastery: number
  if (denom === 0) {
    mastery = lt ? Math.round((ls / lt) * 60) : 0
  } else {
    const learnRatio = lt ? ls / lt : 0
    const acc = (pRatio * practiceWeight + eRatio * examWeight + learnRatio * learnWeight) / denom
    mastery = Math.round(acc * 100)
  }
  mastery = Math.max(0, Math.min(100, mastery))
  let status: SkillStatus
  if (mastery >= 90 && attempts >= 5) status = 'mastered'
  else if (mastery >= 55) status = 'familiar'
  else if (mastery > 0 || lt > 0) status = 'learning'
  else status = 'new'
  return { status, mastery }
}

// 读取某用户全部技能掌握度（skillKey → 状态/掌握度/信号计数）
export function getMasteryMap(userId: string): Record<string, any> {
  const rows = sqlite.prepare('SELECT * FROM user_skill_mastery WHERE user_id=?').all(userId) as any[]
  const map: Record<string, any> = {}
  for (const r of rows) {
    const { status, mastery } = computeStatus(r)
    map[r.skill_key] = {
      status,
      mastery,
      marked: !!r.marked,
      practiced_total: r.practiced_total || 0,
      exam_total: r.exam_total || 0,
      learned_total: r.learned_total || 0
    }
  }
  return map
}

function upsertMeta(stmt: any, userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, now: number) {
  stmt.run(userId, skillKey, track, subtrackId, skillName, now)
}

// 显式标记掌握 / 取消（免费核心闭环钩子）
export function setMark(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, marked: boolean) {
  const now = Date.now()
  upsertMeta(
    sqlite.prepare(`INSERT OR IGNORE INTO user_skill_mastery (user_id,skill_key,track,subtrack_id,skill_name,updated_at) VALUES (?,?,?,?,?,?)`),
    userId, skillKey, track, subtrackId, skillName, now
  )
  sqlite.prepare(`UPDATE user_skill_mastery SET marked=?, updated_at=? WHERE user_id=? AND skill_key=?`)
    .run(marked ? 1 : 0, now, userId, skillKey)
}

// 题库练习 / 模拟自测 信号累加。correct 表示本次作答是否正确。
export function recordPractice(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, correct: boolean) {
  bump(userId, skillKey, track, subtrackId, skillName, correct ? 'practiced_correct' : null, 'practiced_total')
}
export function recordExamSkill(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, correct: boolean) {
  bump(userId, skillKey, track, subtrackId, skillName, correct ? 'exam_correct' : null, 'exam_total')
}
function bump(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, correctCol: string | null, totalCol: string) {
  const now = Date.now()
  const cols = ['user_id', 'skill_key', 'track', 'subtrack_id', 'skill_name', totalCol]
  const vals = [userId, skillKey, track, subtrackId, skillName, 1]
  if (correctCol) { cols.push(correctCol); vals.push(1) }
  cols.push('updated_at'); vals.push(now)
  const ph = cols.map(() => '?').join(',')
  const colList = cols.join(',')
  const setParts = [`${totalCol}=${totalCol}+1`]
  if (correctCol) setParts.push(`${correctCol}=${correctCol}+1`)
  setParts.push('updated_at=excluded.updated_at')
  sqlite.prepare(
    `INSERT INTO user_skill_mastery (${colList}) VALUES (${ph})
     ON CONFLICT(user_id,skill_key) DO UPDATE SET ${setParts.join(', ')}`
  ).run(...vals)
}

/* ---------------- 技能 → 课程章节映射（P1a，按需计算并缓存） ----------------
 * 启发式：把技能名做字符级归一化后，与同方向 sections 的「标题 + 章节标题」做重叠计分，
 * 取分数最高的若干小节作为「去学习」入口。结果缓存到 skill_section_map（带 track/name 便于插入 mastery 行）。
 */
function normText(s: string) {
  return (s || '').toLowerCase().replace(/[\s,，。？?、；;：:！!().（）「」"'""'']/g, '')
}
export function mapSkillToSections(track: string, skillName: string, limit = 3): { id: string; title: string; chapterTitle: string; chapterId: string; moduleId: string; score: number }[] {
  const rows = sqlite.prepare(
    `SELECT s.id, s.title, c.id AS chapter_id, c.module_id AS module_id, c.title AS chapter_title
     FROM sections s JOIN chapters c ON c.id=s.chapter_id WHERE s.direction=?`
  ).all(track) as any[]
  if (!rows.length) return []
  const q = normText(skillName)
  const qTokens = q.length > 3 ? [q] : q.split('').filter(Boolean)
  let best: any[] = []
  for (const r of rows) {
    const head = normText(r.title) + ' ' + normText(r.chapter_title)
    let score = 0
    for (const t of qTokens) if (head.includes(t)) score += t.length >= 2 ? 3 : 1
    if (score > 0) best.push({ ...r, score })
  }
  best.sort((a, b) => b.score - a.score)
  best = best.slice(0, limit)
  // 缓存映射（带元数据，便于后续反向联动掌握度）
  const cache = sqlite.prepare(
    `INSERT OR REPLACE INTO skill_section_map (skill_key, section_id, track, subtrack_id, skill_name, score) VALUES (?,?,?,?,?,?)`
  )
  const key = skillKey(track, '', skillName)
  const tx = sqlite.transaction(() => { for (const b of best) cache.run(key, b.id, track, '', skillName, b.score) })()
  return best.map(({ id, title, chapterTitle, chapter_id, module_id, score }) => ({ id, title, chapterTitle, chapterId: chapter_id, moduleId: module_id, score }))
}

/* ---------------- 错题本（P2）+ 间隔复习 SRS ---------------- */
const SRS_INTERVALS = [1, 3, 7, 16, 30] // 天

export function recordWrongItem(userId: string, item: {
  source: string; itemId: string; track?: string; subtrackId?: string; skillKey?: string;
  q: string; userAnswer?: string; answer?: string
}) {
  const now = Date.now()
  const existing = sqlite.prepare('SELECT id, wrong_count FROM user_wrong_items WHERE user_id=? AND source=? AND item_id=?').get(userId, item.source, item.itemId) as any
  if (existing) {
    sqlite.prepare('UPDATE user_wrong_items SET wrong_count=wrong_count+1, created_at=? WHERE id=?').run(now, existing.id)
    return existing.id
  }
  const id = 'w_' + crypto.randomBytes(6).toString('hex')
  sqlite.prepare(
    `INSERT INTO user_wrong_items (id,user_id,source,item_id,track,subtrack_id,skill_key,q,user_answer,answer,next_review_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, userId, item.source, item.itemId, item.track || null, item.subtrackId || null, item.skillKey || null,
        item.q, item.userAnswer || null, item.answer || null, now, now)
  return id
}

export function listWrongItems(userId: string, dueOnly: boolean) {
  const now = Date.now()
  const rows = sqlite.prepare(
    `SELECT * FROM user_wrong_items WHERE user_id=? ORDER BY wrong_count DESC, created_at DESC`
  ).all(userId) as any[]
  return rows
    .filter(r => !dueOnly || r.next_review_at == null || r.next_review_at <= now)
    .map(r => ({ ...r, due: r.next_review_at == null || r.next_review_at <= now }))
}

// action: 'review' 排期下次复习（SRS，按错误次数递增间隔）；'dismiss' 移除该项
export function actWrongItem(userId: string, id: string, action: string) {
  const row = sqlite.prepare('SELECT * FROM user_wrong_items WHERE id=? AND user_id=?').get(id, userId) as any
  if (!row) return null
  if (action === 'dismiss') {
    sqlite.prepare('DELETE FROM user_wrong_items WHERE id=?').run(id)
    return { removed: true }
  }
  if (action === 'review') {
    const idx = Math.min(SRS_INTERVALS.length - 1, (row.wrong_count || 1) - 1)
    const next = Date.now() + SRS_INTERVALS[idx] * 86400000
    sqlite.prepare('UPDATE user_wrong_items SET next_review_at=?, reviewed_at=? WHERE id=?').run(next, Date.now(), id)
    return { next_review_at: next }
  }
  return null
}
