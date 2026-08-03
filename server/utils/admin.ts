// 管理后台数据访问层（G 类：用户体系 / 内容 / 题库 / 订单 CRUD + 看板）
// 纯函数式助手，直接操作 sqlite；路由层只负责鉴权 + 包装响应。可被 vitest 直接测试。
import { sqlite, hashPwd, publicUser } from './db'
import { trackName } from './referral'

/* ============ 用户体系 (G4) ============ */
export interface UserFilter { q?: string; role?: string; page?: number; pageSize?: number }
export function listUsers(f: UserFilter = {}) {
  const where: string[] = []
  const params: any[] = []
  if (f.q) {
    const q = '%' + f.q + '%'
    where.push('(username LIKE ? OR email LIKE ? OR nickname LIKE ?)')
    params.push(q, q, q)
  }
  if (f.role) { where.push('role=?'); params.push(f.role) }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const total = (sqlite.prepare(`SELECT COUNT(*) c FROM users ${w}`).get(...params) as any).c
  const page = Math.max(1, f.page || 1)
  const pageSize = Math.min(100, f.pageSize || 20)
  const rows = sqlite.prepare(`SELECT * FROM users ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize)
  return { total, page, pageSize, items: rows.map((r: any) => publicUser(r)) }
}
export function getUserById(id: string) {
  const u = sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
  return u ? publicUser(u) : null
}
export function updateUser(id: string, patch: any) {
  const u = sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
  if (!u) return null
  const sets: string[] = []; const vals: any[] = []
  if (patch.role !== undefined) { sets.push('role=?'); vals.push(patch.role === 'admin' ? 'admin' : 'user') }
  if (patch.nickname !== undefined) { sets.push('nickname=?'); vals.push(patch.nickname) }
  if (patch.password) { sets.push('password=?'); vals.push(hashPwd(patch.password)) }
  if (patch.banned !== undefined) { sets.push('banned=?'); vals.push(patch.banned ? 1 : 0) }
  if (patch.vip !== undefined) {
    const v = typeof patch.vip === 'object' ? JSON.stringify(patch.vip) : patch.vip
    sets.push('vip=?'); vals.push(v)
  }
  if (!sets.length) return publicUser(u)
  vals.push(id)
  sqlite.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).run(...vals)
  return publicUser(sqlite.prepare('SELECT * FROM users WHERE id=?').get(id))
}
export function deleteUser(id: string) {
  const u = sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
  if (!u) return false
  const tx = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM progress WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM exam_records WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM orders WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM subscriptions WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM users WHERE id=?').run(id)
  })
  tx()
  return true
}
export function createUser(data: any) {
  const username = String(data.username || '').trim()
  const email = String(data.email || '').trim()
  const password = String(data.password || '')
  if (!username && !email) throw new Error('INVALID_ID')
  if (username && (sqlite.prepare('SELECT 1 FROM users WHERE username=?').get(username))) throw new Error('DUP_ID')
  if (email && (sqlite.prepare('SELECT 1 FROM users WHERE lower(email)=?').get(email.toLowerCase()))) throw new Error('DUP_ID')
  if (!password || password.length < 8) throw new Error('WEAK_PASSWORD')
  const id = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  sqlite.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,role,banned,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, username || null, data.nickname || username || email, hashPwd(password), email || null, null, '{}',
      JSON.stringify(data.vip || { level: 0, expireAt: null }), data.role === 'admin' ? 'admin' : 'user', data.banned ? 1 : 0, Date.now())
  return publicUser(sqlite.prepare('SELECT * FROM users WHERE id=?').get(id))
}

/* ============ 内容：模块 (G2) ============ */
export function listModules() { return sqlite.prepare('SELECT * FROM modules ORDER BY position').all() }
export function getModule(id: string) { return sqlite.prepare('SELECT * FROM modules WHERE id=?').get(id) || null }
export function createModule(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,40}$/.test(id)) throw new Error('INVALID_ID')
  if (getModule(id)) throw new Error('DUP_ID')
  const pos = data.position ?? listModules().length
  sqlite.prepare('INSERT INTO modules (id,name,icon,color,"desc",position) VALUES (?,?,?,?,?,?)')
    .run(id, data.name || id, data.icon || '📘', data.color || '#3b82f6', data.desc || '', pos)
  return getModule(id)
}
export function updateModule(id: string, patch: any) {
  const m = getModule(id); if (!m) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.name !== undefined) { sets.push('name=?'); v.push(patch.name) }
  if (patch.icon !== undefined) { sets.push('icon=?'); v.push(patch.icon) }
  if (patch.color !== undefined) { sets.push('color=?'); v.push(patch.color) }
  if (patch.desc !== undefined) { sets.push('"desc"=?'); v.push(patch.desc) }
  if (patch.position !== undefined) { sets.push('position=?'); v.push(patch.position) }
  if (!sets.length) return m
  v.push(id); sqlite.prepare(`UPDATE modules SET ${sets.join(',')} WHERE id=?`).run(...v)
  return getModule(id)
}
export function deleteModule(id: string) {
  const m = getModule(id); if (!m) return false
  const chs = (sqlite.prepare('SELECT id FROM chapters WHERE module_id=?').all(id) as any[]).map((r: any) => r.id)
  const tx = sqlite.transaction(() => {
    for (const ch of chs) sqlite.prepare('DELETE FROM sections WHERE chapter_id=?').run(ch)
    sqlite.prepare('DELETE FROM chapters WHERE module_id=?').run(id)
    sqlite.prepare('DELETE FROM modules WHERE id=?').run(id)
  })
  tx()
  return true
}

/* ============ 内容：章节 (G2) ============ */
export function listChapters(moduleId?: string) {
  if (moduleId) return sqlite.prepare('SELECT * FROM chapters WHERE module_id=? ORDER BY position').all(moduleId)
  return sqlite.prepare('SELECT * FROM chapters ORDER BY module_id, position').all()
}
export function getChapter(id: string) { return sqlite.prepare('SELECT * FROM chapters WHERE id=?').get(id) || null }
export function createChapter(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (getChapter(id)) throw new Error('DUP_ID')
  if (!getModule(data.moduleId)) throw new Error('NO_MODULE')
  const pos = data.position ?? listChapters(data.moduleId).length
  sqlite.prepare('INSERT INTO chapters (id,module_id,title,goal,position) VALUES (?,?,?,?,?)')
    .run(id, data.moduleId, data.title || id, data.goal || '', pos)
  return getChapter(id)
}
export function updateChapter(id: string, patch: any) {
  const c = getChapter(id); if (!c) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.moduleId !== undefined) { if (!getModule(patch.moduleId)) throw new Error('NO_MODULE'); sets.push('module_id=?'); v.push(patch.moduleId) }
  if (patch.title !== undefined) { sets.push('title=?'); v.push(patch.title) }
  if (patch.goal !== undefined) { sets.push('goal=?'); v.push(patch.goal) }
  if (patch.position !== undefined) { sets.push('position=?'); v.push(patch.position) }
  if (!sets.length) return c
  v.push(id); sqlite.prepare(`UPDATE chapters SET ${sets.join(',')} WHERE id=?`).run(...v)
  return getChapter(id)
}
export function deleteChapter(id: string) {
  const c = getChapter(id); if (!c) return false
  const tx = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM sections WHERE chapter_id=?').run(id)
    sqlite.prepare('DELETE FROM chapters WHERE id=?').run(id)
  }); tx()
  return true
}

/* ============ 内容：小节 (G2) ============ */
export function listSections(chapterId?: string) {
  if (chapterId) return sqlite.prepare('SELECT * FROM sections WHERE chapter_id=? ORDER BY position').all(chapterId)
  return sqlite.prepare('SELECT * FROM sections ORDER BY chapter_id, position').all()
}
export function getSection(id: string) { return sqlite.prepare('SELECT * FROM sections WHERE id=?').get(id) || null }
export function createSection(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,80}$/.test(id)) throw new Error('INVALID_ID')
  if (getSection(id)) throw new Error('DUP_ID')
  if (!getChapter(data.chapterId)) throw new Error('NO_CHAPTER')
  const pos = data.position ?? listSections(data.chapterId).length
  sqlite.prepare('INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
    .run(id, data.chapterId, data.title || id, data.direction || '', data.content || '', pos)
  return getSection(id)
}
export function updateSection(id: string, patch: any) {
  const s = getSection(id); if (!s) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.chapterId !== undefined) { if (!getChapter(patch.chapterId)) throw new Error('NO_CHAPTER'); sets.push('chapter_id=?'); v.push(patch.chapterId) }
  if (patch.title !== undefined) { sets.push('title=?'); v.push(patch.title) }
  if (patch.direction !== undefined) { sets.push('direction=?'); v.push(patch.direction) }
  if (patch.content !== undefined) { sets.push('content=?'); v.push(patch.content) }
  if (patch.position !== undefined) { sets.push('position=?'); v.push(patch.position) }
  if (!sets.length) return s
  v.push(id); sqlite.prepare(`UPDATE sections SET ${sets.join(',')} WHERE id=?`).run(...v)
  return getSection(id)
}
export function deleteSection(id: string) {
  const s = getSection(id); if (!s) return false
  sqlite.prepare('DELETE FROM sections WHERE id=?').run(id)
  return true
}

/* ============ 题库：试卷 + 选择题 + 笔试题 (G3) ============ */
export function listExamSets(track?: string) {
  if (track) return sqlite.prepare('SELECT * FROM exam_sets WHERE track=? ORDER BY level, name').all(track)
  return sqlite.prepare('SELECT * FROM exam_sets ORDER BY track, level, name').all()
}
export function getExamSet(id: string) { return sqlite.prepare('SELECT * FROM exam_sets WHERE id=?').get(id) || null }
function upsertChoices(setId: string, choices: any[] = []) {
  sqlite.prepare('DELETE FROM exam_choices WHERE set_id=?').run(setId)
  const ins = sqlite.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,"explain",multi) VALUES (?,?,?,?,?,?,?,?)')
  let n = 0
  for (const c of (choices || [])) {
    if (!c.id || !c.q) continue
    ins.run(c.id, setId, c.tag || '', c.q, JSON.stringify(c.options || []), JSON.stringify(c.answer), c.explain || '', c.multi ? 1 : 0)
    n++
  }
  return n
}
function upsertWritten(setId: string, written: any[] = []) {
  sqlite.prepare('DELETE FROM exam_written WHERE set_id=?').run(setId)
  const ins = sqlite.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference) VALUES (?,?,?,?,?)')
  let n = 0
  for (const w of (written || [])) {
    if (!w.id || !w.q) continue
    ins.run(w.id, setId, w.q, JSON.stringify(w.points || []), w.reference || '')
    n++
  }
  return n
}
export function getExamSetDetail(id: string) {
  const s = getExamSet(id); if (!s) return null
  return {
    ...s,
    choices: sqlite.prepare('SELECT * FROM exam_choices WHERE set_id=? ORDER BY id').all(id),
    written: sqlite.prepare('SELECT * FROM exam_written WHERE set_id=? ORDER BY id').all(id)
  }
}
export function createExamSet(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (getExamSet(id)) throw new Error('DUP_ID')
  const tx = sqlite.transaction(() => {
    sqlite.prepare('INSERT INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)')
      .run(id, data.name || id, data.track || 'frontend', data.level || '初级', data.duration || 30, data.vipOnly ? 1 : 0)
    upsertChoices(id, data.choices)
    upsertWritten(id, data.written)
  }); tx()
  return getExamSetDetail(id)
}
export function updateExamSet(id: string, patch: any) {
  const s = getExamSet(id); if (!s) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.name !== undefined) { sets.push('name=?'); v.push(patch.name) }
  if (patch.track !== undefined) { sets.push('track=?'); v.push(patch.track) }
  if (patch.level !== undefined) { sets.push('level=?'); v.push(patch.level) }
  if (patch.duration !== undefined) { sets.push('duration=?'); v.push(patch.duration) }
  if (patch.vipOnly !== undefined) { sets.push('vip_only=?'); v.push(patch.vipOnly ? 1 : 0) }
  let detail: any = null
  const tx = sqlite.transaction(() => {
    if (sets.length) { v.push(id); sqlite.prepare(`UPDATE exam_sets SET ${sets.join(',')} WHERE id=?`).run(...v) }
    if (patch.choices !== undefined) upsertChoices(id, patch.choices)
    if (patch.written !== undefined) upsertWritten(id, patch.written)
    detail = getExamSetDetail(id)
  }); tx()
  return detail
}
export function deleteExamSet(id: string) {
  const s = getExamSet(id); if (!s) return false
  const tx = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM exam_choices WHERE set_id=?').run(id)
    sqlite.prepare('DELETE FROM exam_written WHERE set_id=?').run(id)
    sqlite.prepare('DELETE FROM exam_sets WHERE id=?').run(id)
  }); tx()
  return true
}

/* ============ 题库：面试题 (G3) ============ */
export function listInterview(track?: string, q?: string) {
  let rows: any[] = track
    ? sqlite.prepare('SELECT * FROM interview_questions WHERE track=? ORDER BY id').all(track)
    : sqlite.prepare('SELECT * FROM interview_questions ORDER BY track, id').all()
  if (q) {
    const kw = String(q).toLowerCase()
    rows = rows.filter((r: any) => (r.q || '').toLowerCase().includes(kw) || (r.a || '').toLowerCase().includes(kw))
  }
  return rows.map((r: any) => ({ ...r, keywords: JSON.parse(r.keywords || '[]') }))
}
export function getInterview(id: string) {
  const r = sqlite.prepare('SELECT * FROM interview_questions WHERE id=?').get(id) as any
  return r ? { ...r, keywords: JSON.parse(r.keywords || '[]') } : null
}
export function createInterview(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (getInterview(id)) throw new Error('DUP_ID')
  sqlite.prepare('INSERT INTO interview_questions (id,track,type,q,a,keywords) VALUES (?,?,?,?,?,?)')
    .run(id, data.track || 'frontend', data.type || 'hot', data.q || '', data.a || '', JSON.stringify(data.keywords || []))
  return getInterview(id)
}
export function updateInterview(id: string, patch: any) {
  const r = getInterview(id); if (!r) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.track !== undefined) { sets.push('track=?'); v.push(patch.track) }
  if (patch.type !== undefined) { sets.push('type=?'); v.push(patch.type) }
  if (patch.q !== undefined) { sets.push('q=?'); v.push(patch.q) }
  if (patch.a !== undefined) { sets.push('a=?'); v.push(patch.a) }
  if (patch.keywords !== undefined) { sets.push('keywords=?'); v.push(JSON.stringify(patch.keywords)) }
  if (!sets.length) return r
  v.push(id); sqlite.prepare(`UPDATE interview_questions SET ${sets.join(',')} WHERE id=?`).run(...v)
  return getInterview(id)
}
export function deleteInterview(id: string) {
  const r = getInterview(id); if (!r) return false
  sqlite.prepare('DELETE FROM interview_questions WHERE id=?').run(id)
  return true
}

/* ============ 订单 / 订阅 (G5) ============ */
export function listOrders() { return sqlite.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() }
export function listSubscriptions() { return sqlite.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all() }

/* ============ 数据看板 (G6) ============ */
export function dashboardStats() {
  const c = (sql: string, p: any[] = []) => (sqlite.prepare(sql).get(...p) as any).c
  return {
    users: c('SELECT COUNT(*) c FROM users'),
    admins: c("SELECT COUNT(*) c FROM users WHERE role='admin'"),
    banned: c('SELECT COUNT(*) c FROM users WHERE banned=1'),
    modules: c('SELECT COUNT(*) c FROM modules'),
    chapters: c('SELECT COUNT(*) c FROM chapters'),
    sections: c('SELECT COUNT(*) c FROM sections'),
    examSets: c('SELECT COUNT(*) c FROM exam_sets'),
    vipSets: c('SELECT COUNT(*) c FROM exam_sets WHERE vip_only=1'),
    interview: c('SELECT COUNT(*) c FROM interview_questions'),
    examRecords: c('SELECT COUNT(*) c FROM exam_records'),
    orders: c('SELECT COUNT(*) c FROM orders'),
    paidOrders: c("SELECT COUNT(*) c FROM orders WHERE status='paid'"),
    revenue: (sqlite.prepare("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid'").get() as any).s,
    activeSubs: c('SELECT COUNT(*) c FROM subscriptions WHERE status=? AND expire_at>?', ['active', Date.now()])
  }
}

/* ============ 内推资源库管理 (H4，M4 维护) ============ */
export function listReferralsAdmin(filter: { track?: string; city?: string; level?: string } = {}) {
  const where: string[] = []; const params: any[] = []
  if (filter.track) { where.push('track=?'); params.push(filter.track) }
  if (filter.city) { where.push('city=?'); params.push(filter.city) }
  if (filter.level) { where.push('level=?'); params.push(filter.level) }
  const sql = 'SELECT * FROM referrals' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY created_at DESC'
  return (sqlite.prepare(sql).all(...params) as any[]).map((r: any) => ({ ...r, trackName: trackName(r.track) }))
}
export function getReferral(id: string) { return sqlite.prepare('SELECT * FROM referrals WHERE id=?').get(id) || null }
export function createReferral(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (getReferral(id)) throw new Error('DUP_ID')
  sqlite.prepare('INSERT INTO referrals (id,company,title,track,city,level,type,requirement,intro,contact,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, data.company || '', data.title || '', data.track || 'frontend', data.city || '', data.level || '',
      data.type || '社招', data.requirement || '', data.intro || '', data.contact || '', Date.now())
  return getReferral(id)
}
export function updateReferral(id: string, patch: any) {
  const r = getReferral(id); if (!r) return null
  const sets: string[] = []; const v: any[] = []
  for (const f of ['company', 'title', 'track', 'city', 'level', 'type', 'requirement', 'intro', 'contact']) {
    if (patch[f] !== undefined) { sets.push(`${f}=?`); v.push(patch[f]) }
  }
  if (!sets.length) return r
  v.push(id); sqlite.prepare(`UPDATE referrals SET ${sets.join(',')} WHERE id=?`).run(...v)
  return getReferral(id)
}
export function deleteReferral(id: string) {
  const r = getReferral(id); if (!r) return false
  sqlite.prepare('DELETE FROM referrals WHERE id=?').run(id)
  return true
}

export function listReferralApplications(status?: string) {
  const where = status ? 'WHERE a.status=?' : ''
  const rows = sqlite.prepare(
    `SELECT a.id,a.user_id,a.referral_id,a.name,a.contact,a.note,a.status,a.created_at,r.company,r.title,r.track
     FROM referral_applications a LEFT JOIN referrals r ON r.id=a.referral_id
     ${where} ORDER BY a.created_at DESC`
  ).all(...(status ? [status] : [])) as any[]
  return rows.map((r: any) => ({ ...r, trackName: trackName(r.track) }))
}
export function updateReferralApplication(id: string, status: string) {
  const a = sqlite.prepare('SELECT * FROM referral_applications WHERE id=?').get(id) as any
  if (!a) return null
  const ok = ['pending', 'contacted', 'done', 'rejected']
  if (!ok.includes(status)) throw new Error('BAD_STATUS')
  sqlite.prepare('UPDATE referral_applications SET status=? WHERE id=?').run(status, id)
  return sqlite.prepare('SELECT * FROM referral_applications WHERE id=?').get(id)
}
