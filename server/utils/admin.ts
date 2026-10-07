// 管理后台数据访问层（G 类：用户体系 / 内容 / 题库 / 订单 CRUD + 看板）
// 纯函数式助手，直接操作 sqlite；路由层只负责鉴权 + 包装响应。可被 vitest 直接测试。
import { sqlite, hashPwd, publicUser, uid, findBestSection } from './db'
import { trackName } from './interview'

/* ============ 用户体系 (G4) ============ */
export interface UserFilter { q?: string; role?: string; page?: number; pageSize?: number }
export async function listUsers(f: UserFilter = {}) {
  const where: string[] = []
  const params: any[] = []
  if (f.q) {
    const q = '%' + f.q + '%'
    where.push('(username LIKE ? OR email LIKE ? OR nickname LIKE ?)')
    params.push(q, q, q)
  }
  if (f.role) { where.push('role=?'); params.push(f.role) }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const total = (await sqlite.prepare(`SELECT COUNT(*) c FROM users ${w}`).get(...params) as any).c
  const page = Math.max(1, f.page || 1)
  const pageSize = Math.min(100, f.pageSize || 20)
  const rows = await sqlite.prepare(`SELECT * FROM users ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize)
  return { total, page, pageSize, items: rows.map((r: any) => publicUser(r)) }
}
export async function getUserById(id: string) {
  const u = await sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
  return u ? publicUser(u) : null
}

/* ============ 面试题库待补充池（收录自用户提问，经 LLM 语义化增强） ============ */
export interface UserQuestionFilter { status?: string; track?: string; page?: number; pageSize?: number }
export async function listUserQuestions(f: UserQuestionFilter = {}) {
  const where: string[] = []
  const params: any[] = []
  if (f.status) { where.push('status=?'); params.push(f.status) }
  if (f.track) { where.push('track=?'); params.push(f.track) }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const total = (await sqlite.prepare(`SELECT COUNT(*) c FROM user_questions ${w}`).get(...params) as any).c
  const page = Math.max(1, f.page || 1)
  const pageSize = Math.min(100, f.pageSize || 30)
  const rows = await sqlite.prepare(`SELECT * FROM user_questions ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize) as any[]
  const items = await Promise.all(rows.map(async (it: any) => {
    const safeTags = (() => { try { return JSON.parse(it.enhanced_tags || '[]') } catch { return [] } })()
    const base: any = { ...it, enhanced_tags: it.enhanced_tags || '[]' }
    if (it.status === 'pending') {
      // 待审核：预计算建议关联的小节，供审核页展示与一键采纳
      base.suggest = await findBestSection(it.track || 'frontend', it.enhanced_title || it.raw_question || '', safeTags)
    } else if (it.status === 'accepted' && it.result_question_id) {
      // 已采纳：回显实际关联的小节
      const iq = await sqlite.prepare('SELECT section_id FROM interview_questions WHERE id=?').get(it.result_question_id) as any
      if (iq && iq.section_id) {
        const s = await sqlite.prepare(`SELECT s.title, c.title AS chapter_title FROM sections s JOIN chapters c ON c.id=s.chapter_id WHERE s.id=?`).get(iq.section_id) as any
        if (s) base.section = { id: iq.section_id, title: s.title, chapterTitle: s.chapter_title }
      }
    }
    return base
  }))
  return { total, page, pageSize, items }
}

// 审核「待补充题库」中的用户提问。
// decision='reject'：仅置为 rejected，不入库。
// decision='accept'：将 LLM 增强后的标题/答案/标签写入正式面试题库（patch 可覆盖微调），
//   并回填 result_question_id、status='accepted'，便于后台追踪。已审过的不可重复审核。
export async function reviewUserQuestion(id: string, decision: string, patch: any = {}) {
  const uq = await sqlite.prepare('SELECT * FROM user_questions WHERE id=?').get(id) as any
  if (!uq) return null
  if (uq.status !== 'pending') throw new Error('ALREADY_REVIEWED')
  const now = Date.now()

  if (decision === 'reject') {
    await sqlite.prepare('UPDATE user_questions SET status=?, reviewed_at=?, updated_at=? WHERE id=?')
      .run('rejected', now, now, id)
    return { id, status: 'rejected' }
  }

  // accept：把增强结果转化为正式面试题
  let tags: string[] = []
  try { tags = JSON.parse(uq.enhanced_tags || '[]') } catch { tags = [] }
  const qText = ((patch.q ?? uq.enhanced_title) ?? (uq.raw_question || '')).toString().trim()
  const aText = (patch.a ?? uq.ai_answer ?? '').toString()
  const track = (patch.track ?? uq.track ?? 'frontend').toString()
  const type = (patch.type ?? 'hot').toString()
  const keywords = Array.isArray(patch.keywords) ? patch.keywords : tags

  // 自动关联：优先用管理员指定的小节，否则按方向 + 题干 + 标签自动匹配最相关小节
  const sectionId = patch.sectionId || await (await findBestSection(track, qText, keywords))?.id || null

  // 生成唯一且合规的正式题 ID；允许管理员显式指定，冲突则自动回退
  let nid = patch.id && /^[a-z0-9_-]{2,60}$/.test(String(patch.id)) ? String(patch.id) : ''
  if (!nid || await getInterviewQuestion(nid)) nid = uid('iq_')
  await createInterview({ id: nid, track, type, q: qText, a: aText, keywords, sectionId })

  await sqlite.prepare('UPDATE user_questions SET status=?, result_question_id=?, reviewed_at=?, updated_at=? WHERE id=?')
    .run('accepted', nid, now, now, id)
  return { id, status: 'accepted', questionId: nid, sectionId }
}
export async function updateUser(id: string, patch: any) {
  const u = await sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
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
  // P1#4：改密 / 封禁后即时撤销该用户全部会话，防止旧 token 续用（getUser 也会懒清理 banned，这里双保险且即时生效）
  const revoke = !!(patch.password || (patch.banned !== undefined && patch.banned))
  if (!sets.length) return publicUser(u)
  vals.push(id)
  await sqlite.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).run(...vals)
  if (revoke) {
    try { await sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(id) } catch { /* ignore */ }
  }
  return publicUser(await sqlite.prepare('SELECT * FROM users WHERE id=?').get(id))
}
export async function deleteUser(id: string) {
  const u = await sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
  if (!u) return false
  const tx = sqlite.transaction(async () => {
    await sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(id)
    await sqlite.prepare('DELETE FROM progress WHERE user_id=?').run(id)
    await sqlite.prepare('DELETE FROM exam_records WHERE user_id=?').run(id)
    await sqlite.prepare('DELETE FROM orders WHERE user_id=?').run(id)
    await sqlite.prepare('DELETE FROM subscriptions WHERE user_id=?').run(id)
    await sqlite.prepare('DELETE FROM users WHERE id=?').run(id)
  })
  await tx()
  return true
}
export async function createUser(data: any) {
  const username = String(data.username || '').trim()
  const email = String(data.email || '').trim()
  const password = String(data.password || '')
  if (!username && !email) throw new Error('INVALID_ID')
  if (username && (await sqlite.prepare('SELECT 1 FROM users WHERE username=?').get(username))) throw new Error('DUP_ID')
  if (email && (await sqlite.prepare('SELECT 1 FROM users WHERE lower(email)=?').get(email.toLowerCase()))) throw new Error('DUP_ID')
  if (!password || password.length < 8) throw new Error('WEAK_PASSWORD')
  const id = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  await sqlite.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,role,banned,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, username || null, data.nickname || username || email, hashPwd(password), email || null, null, '{}',
      JSON.stringify(data.vip || { level: 0, expireAt: null }), data.role === 'admin' ? 'admin' : 'user', data.banned ? 1 : 0, Date.now())
  return publicUser(await sqlite.prepare('SELECT * FROM users WHERE id=?').get(id))
}

/* ============ 内容：模块 (G2) ============ */
export async function listModules() { return await sqlite.prepare('SELECT * FROM modules ORDER BY position').all() }
export async function getModule(id: string) { return await sqlite.prepare('SELECT * FROM modules WHERE id=?').get(id) || null }
export async function createModule(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,40}$/.test(id)) throw new Error('INVALID_ID')
  if (await getModule(id)) throw new Error('DUP_ID')
  const pos = data.position ?? await (await listModules()).length
  await sqlite.prepare('INSERT INTO modules (id,name,icon,color,"desc",position) VALUES (?,?,?,?,?,?)')
    .run(id, data.name || id, data.icon || '📘', data.color || '#3b82f6', data.desc || '', pos)
  return await getModule(id)
}
export async function updateModule(id: string, patch: any) {
  const m = await getModule(id); if (!m) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.name !== undefined) { sets.push('name=?'); v.push(patch.name) }
  if (patch.icon !== undefined) { sets.push('icon=?'); v.push(patch.icon) }
  if (patch.color !== undefined) { sets.push('color=?'); v.push(patch.color) }
  if (patch.desc !== undefined) { sets.push('"desc"=?'); v.push(patch.desc) }
  if (patch.position !== undefined) { sets.push('position=?'); v.push(patch.position) }
  if (!sets.length) return m
  v.push(id); await sqlite.prepare(`UPDATE modules SET ${sets.join(',')} WHERE id=?`).run(...v)
  return await getModule(id)
}
export async function deleteModule(id: string) {
  const m = await getModule(id); if (!m) return false
  const chs = (await sqlite.prepare('SELECT id FROM chapters WHERE module_id=?').all(id) as any[]).map((r: any) => r.id)
  const tx = sqlite.transaction(async () => {
    for (const ch of chs) await sqlite.prepare('DELETE FROM sections WHERE chapter_id=?').run(ch)
    await sqlite.prepare('DELETE FROM chapters WHERE module_id=?').run(id)
    await sqlite.prepare('DELETE FROM modules WHERE id=?').run(id)
  })
  await tx()
  return true
}

/* ============ 内容：章节 (G2) ============ */
export async function listChapters(moduleId?: string) {
  if (moduleId) return await sqlite.prepare('SELECT * FROM chapters WHERE module_id=? ORDER BY position').all(moduleId)
  return await sqlite.prepare('SELECT * FROM chapters ORDER BY module_id, position').all()
}
export async function getChapter(id: string) { return await sqlite.prepare('SELECT * FROM chapters WHERE id=?').get(id) || null }
export async function createChapter(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (await getChapter(id)) throw new Error('DUP_ID')
  if (!await getModule(data.moduleId)) throw new Error('NO_MODULE')
  const pos = data.position ?? await (await listChapters(data.moduleId)).length
  await sqlite.prepare('INSERT INTO chapters (id,module_id,title,goal,position) VALUES (?,?,?,?,?)')
    .run(id, data.moduleId, data.title || id, data.goal || '', pos)
  return await getChapter(id)
}
export async function updateChapter(id: string, patch: any) {
  const c = await getChapter(id); if (!c) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.moduleId !== undefined) { if (!await getModule(patch.moduleId)) throw new Error('NO_MODULE'); sets.push('module_id=?'); v.push(patch.moduleId) }
  if (patch.title !== undefined) { sets.push('title=?'); v.push(patch.title) }
  if (patch.goal !== undefined) { sets.push('goal=?'); v.push(patch.goal) }
  if (patch.position !== undefined) { sets.push('position=?'); v.push(patch.position) }
  if (!sets.length) return c
  v.push(id); await sqlite.prepare(`UPDATE chapters SET ${sets.join(',')} WHERE id=?`).run(...v)
  return await getChapter(id)
}
export async function deleteChapter(id: string) {
  const c = await getChapter(id); if (!c) return false
  const tx = sqlite.transaction(async () => {
    await sqlite.prepare('DELETE FROM sections WHERE chapter_id=?').run(id)
    await sqlite.prepare('DELETE FROM chapters WHERE id=?').run(id)
  }); await tx()
  return true
}

/* ============ 内容：小节 (G2) ============ */
export async function listSections(chapterId?: string, track?: string) {
  if (chapterId) return await sqlite.prepare('SELECT * FROM sections WHERE chapter_id=? ORDER BY position').all(chapterId)
  if (track) return await sqlite.prepare(`SELECT s.id, s.title, c.title AS chapter_title FROM sections s JOIN chapters c ON c.id = s.chapter_id WHERE c.module_id=? ORDER BY c.title, s.position`).all(track)
  return await sqlite.prepare('SELECT * FROM sections ORDER BY chapter_id, position').all()
}
export async function getSection(id: string) { return await sqlite.prepare('SELECT * FROM sections WHERE id=?').get(id) || null }
/* ---------- 内容发布门禁（任务 2.5）----------
 * 规则：来源属「明示禁止再分发」或「未标注来源」的内容，不得发布。
 * 边界：只拦截「发布动作」——即 status 由非 published 跃迁到 published。
 *      已发布内容的日常编辑（改标题/正文等）不拦截，否则存量无源内容将完全无法维护。
 * 依据：docs/plans/task2-task3-execution-plan.md 批次 2.5
 */
const BLOCKED_LICENSES = new Set(['proprietary'])
function assertPublishable(kind: string, d: { license?: string | null; source_type?: string | null }) {
  if (BLOCKED_LICENSES.has(String(d.license || ''))) {
    throw new Error(`BLOCKED_PROPRIETARY_LICENSE: ${kind} 来源明示禁止再分发，不得发布`)
  }
  if (!d.source_type || d.source_type === 'unknown') {
    throw new Error(`BLOCKED_NO_SOURCE: ${kind} 未标注来源，补全 source_url/source_type 后方可发布`)
  }
}

export async function createSection(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,80}$/.test(id)) throw new Error('INVALID_ID')
  if (await getSection(id)) throw new Error('DUP_ID')
  if (!await getChapter(data.chapterId)) throw new Error('NO_CHAPTER')
  // 新内容默认 draft：必须补全来源后再显式发布，避免无源内容直接上线
  const status = data.status || 'draft'
  if (status === 'published') assertPublishable('section', data)
  const pos = data.position ?? await (await listSections(data.chapterId)).length
  await sqlite.prepare('INSERT INTO sections (id,chapter_id,title,objective,content,position,source_url,source_type,license,rewrite_level,status,reviewed_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, data.chapterId, data.title || id, data.objective ?? data.direction ?? '', data.content || '', pos,
      data.source_url ?? null, data.source_type ?? 'unknown', data.license ?? 'unknown',
      data.rewrite_level ?? 'paraphrased', status, data.reviewed_at ?? null, 1)
  return await getSection(id)
}
export async function updateSection(id: string, patch: any) {
  const s = await getSection(id); if (!s) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.chapterId !== undefined) { if (!await getChapter(patch.chapterId)) throw new Error('NO_CHAPTER'); sets.push('chapter_id=?'); v.push(patch.chapterId) }
  if (patch.title !== undefined) { sets.push('title=?'); v.push(patch.title) }
  if (patch.objective !== undefined) { sets.push('objective=?'); v.push(patch.objective) }
  if (patch.content !== undefined) { sets.push('content=?'); v.push(patch.content) }
  if (patch.position !== undefined) { sets.push('position=?'); v.push(patch.position) }
  // 2.5 合规字段（补全来源后才能发布）
  if (patch.sourceUrl !== undefined) { sets.push('source_url=?'); v.push(patch.sourceUrl) }
  if (patch.sourceType !== undefined) { sets.push('source_type=?'); v.push(patch.sourceType) }
  if (patch.license !== undefined) { sets.push('license=?'); v.push(patch.license) }
  if (patch.rewriteLevel !== undefined) { sets.push('rewrite_level=?'); v.push(patch.rewriteLevel) }
  if (patch.reviewedAt !== undefined) { sets.push('reviewed_at=?'); v.push(patch.reviewedAt) }
  if (patch.status !== undefined) {
    // 仅「发布动作」校验；已发布内容的日常编辑放行
    if (patch.status === 'published' && s.status !== 'published') {
      assertPublishable('section', {
        license: patch.license ?? s.license,
        source_type: patch.sourceType ?? s.source_type
      })
    }
    sets.push('status=?'); v.push(patch.status)
  }
  if (!sets.length) return s
  v.push(id); await sqlite.prepare(`UPDATE sections SET ${sets.join(',')} WHERE id=?`).run(...v)
  return await getSection(id)
}
export async function deleteSection(id: string) {
  const s = await getSection(id); if (!s) return false
  await sqlite.prepare('DELETE FROM sections WHERE id=?').run(id)
  return true
}

/* ============ 题库：试卷 + 选择题 + 笔试题 (G3) ============ */
export async function listExamSets(track?: string) {
  if (track) return await sqlite.prepare('SELECT * FROM exam_sets WHERE track=? ORDER BY level, name').all(track)
  return await sqlite.prepare('SELECT * FROM exam_sets ORDER BY track, level, name').all()
}
export async function getExamSet(id: string) { return await sqlite.prepare('SELECT * FROM exam_sets WHERE id=?').get(id) || null }
async function upsertChoices(setId: string, choices: any[] = []) {
  await sqlite.prepare('DELETE FROM exam_choices WHERE set_id=?').run(setId)
  const ins = await sqlite.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,"explain",multi) VALUES (?,?,?,?,?,?,?,?)')
  let n = 0
  for (const c of (choices || [])) {
    if (!c.id || !c.q) continue
    await ins.run(c.id, setId, c.tag || '', c.q, JSON.stringify(c.options || []), JSON.stringify(c.answer), c.explain || '', c.multi ? 1 : 0)
    n++
  }
  return n
}
async function upsertWritten(setId: string, written: any[] = []) {
  await sqlite.prepare('DELETE FROM exam_written WHERE set_id=?').run(setId)
  const ins = await sqlite.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference) VALUES (?,?,?,?,?)')
  let n = 0
  for (const w of (written || [])) {
    if (!w.id || !w.q) continue
    await ins.run(w.id, setId, w.q, JSON.stringify(w.points || []), w.reference || '')
    n++
  }
  return n
}
export async function getExamSetDetail(id: string) {
  const s = await getExamSet(id); if (!s) return null
  return {
    ...s,
    choices: await sqlite.prepare('SELECT * FROM exam_choices WHERE set_id=? ORDER BY id').all(id),
    written: await sqlite.prepare('SELECT * FROM exam_written WHERE set_id=? ORDER BY id').all(id)
  }
}
export async function createExamSet(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (await getExamSet(id)) throw new Error('DUP_ID')
  const tx = sqlite.transaction(async () => {
    await sqlite.prepare('INSERT INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)')
      .run(id, data.name || id, data.track || 'frontend', data.level || '初级', data.duration || 30, data.vipOnly ? 1 : 0)
    await upsertChoices(id, data.choices)
    await upsertWritten(id, data.written)
  }); await tx()
  return await getExamSetDetail(id)
}
export async function updateExamSet(id: string, patch: any) {
  const s = await getExamSet(id); if (!s) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.name !== undefined) { sets.push('name=?'); v.push(patch.name) }
  if (patch.track !== undefined) { sets.push('track=?'); v.push(patch.track) }
  if (patch.level !== undefined) { sets.push('level=?'); v.push(patch.level) }
  if (patch.duration !== undefined) { sets.push('duration=?'); v.push(patch.duration) }
  if (patch.vipOnly !== undefined) { sets.push('vip_only=?'); v.push(patch.vipOnly ? 1 : 0) }
  let detail: any = null
  const tx = sqlite.transaction(async () => {
    if (sets.length) { v.push(id); await sqlite.prepare(`UPDATE exam_sets SET ${sets.join(',')} WHERE id=?`).run(...v) }
    if (patch.choices !== undefined) await upsertChoices(id, patch.choices)
    if (patch.written !== undefined) await upsertWritten(id, patch.written)
    detail = await getExamSetDetail(id)
  }); await tx()
  return detail
}
export async function deleteExamSet(id: string) {
  const s = await getExamSet(id); if (!s) return false
  const tx = sqlite.transaction(async () => {
    await sqlite.prepare('DELETE FROM exam_choices WHERE set_id=?').run(id)
    await sqlite.prepare('DELETE FROM exam_written WHERE set_id=?').run(id)
    await sqlite.prepare('DELETE FROM exam_sets WHERE id=?').run(id)
  }); await tx()
  return true
}

/* ============ 题库：面试题 (G3) ============ */
export async function listInterview(track?: string, q?: string) {
  let rows: any[] = track
    ? await sqlite.prepare('SELECT * FROM interview_questions WHERE track=? ORDER BY id').all(track)
    : await sqlite.prepare('SELECT * FROM interview_questions ORDER BY track, id').all()
  if (q) {
    const kw = String(q).toLowerCase()
    rows = rows.filter((r: any) => (r.q || '').toLowerCase().includes(kw) || (r.a || '').toLowerCase().includes(kw))
  }
  return rows.map((r: any) => ({ ...r, keywords: JSON.parse(r.keywords || '[]') }))
}
export async function getInterviewQuestion(id: string) {
  const r = await sqlite.prepare('SELECT * FROM interview_questions WHERE id=?').get(id) as any
  return r ? { ...r, keywords: JSON.parse(r.keywords || '[]') } : null
}
export async function createInterview(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (await getInterviewQuestion(id)) throw new Error('DUP_ID')
  // 2.5：新题默认 draft，补全来源后方可发布
  const status = data.status || 'draft'
  if (status === 'published') assertPublishable('question', data)
  await sqlite.prepare('INSERT INTO interview_questions (id,track,type,q,a,keywords,section_id,source,source_type,license,rewrite_level,status,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, data.track || 'frontend', data.type || 'hot', data.q || '', data.a || '', JSON.stringify(data.keywords || []), data.sectionId || null,
      data.source ?? null, data.source_type ?? 'unknown', data.license ?? 'unknown',
      data.rewrite_level ?? 'paraphrased', status, 1)
  return await getInterviewQuestion(id)
}
export async function updateInterview(id: string, patch: any) {
  const r = await getInterviewQuestion(id); if (!r) return null
  const sets: string[] = []; const v: any[] = []
  if (patch.track !== undefined) { sets.push('track=?'); v.push(patch.track) }
  if (patch.type !== undefined) { sets.push('type=?'); v.push(patch.type) }
  if (patch.q !== undefined) { sets.push('q=?'); v.push(patch.q) }
  if (patch.a !== undefined) { sets.push('a=?'); v.push(patch.a) }
  if (patch.keywords !== undefined) { sets.push('keywords=?'); v.push(JSON.stringify(patch.keywords)) }
  if (patch.sectionId !== undefined) { sets.push('section_id=?'); v.push(patch.sectionId || null) }
  // 2.5 合规字段
  if (patch.source !== undefined) { sets.push('source=?'); v.push(patch.source) }
  if (patch.sourceType !== undefined) { sets.push('source_type=?'); v.push(patch.sourceType) }
  if (patch.license !== undefined) { sets.push('license=?'); v.push(patch.license) }
  if (patch.rewriteLevel !== undefined) { sets.push('rewrite_level=?'); v.push(patch.rewriteLevel) }
  if (patch.reviewedAt !== undefined) { sets.push('reviewed_at=?'); v.push(patch.reviewedAt) }
  if (patch.status !== undefined) {
    if (patch.status === 'published' && r.status !== 'published') {
      assertPublishable('question', {
        license: patch.license ?? r.license,
        source_type: patch.sourceType ?? r.source_type
      })
    }
    sets.push('status=?'); v.push(patch.status)
  }
  if (!sets.length) return r
  v.push(id); await sqlite.prepare(`UPDATE interview_questions SET ${sets.join(',')} WHERE id=?`).run(...v)
  return await getInterviewQuestion(id)
}
export async function deleteInterview(id: string) {
  const r = await getInterviewQuestion(id); if (!r) return false
  await sqlite.prepare('DELETE FROM interview_questions WHERE id=?').run(id)
  return true
}

/* ============ 订单 / 订阅 (G5) ============ */
export async function listOrders() { return await sqlite.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() }
export async function listSubscriptions() { return await sqlite.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all() }

/* ============ 数据看板 (G6) ============ */
export async function dashboardStats() {
  const c = async (sql: string, p: any[] = []) => (await sqlite.prepare(sql).get(...p) as any).c
  return {
    users: await c('SELECT COUNT(*) c FROM users'),
    admins: await c("SELECT COUNT(*) c FROM users WHERE role='admin'"),
    banned: await c('SELECT COUNT(*) c FROM users WHERE banned=1'),
    modules: await c('SELECT COUNT(*) c FROM modules'),
    chapters: await c('SELECT COUNT(*) c FROM chapters'),
    sections: await c('SELECT COUNT(*) c FROM sections'),
    examSets: await c('SELECT COUNT(*) c FROM exam_sets'),
    vipSets: await c('SELECT COUNT(*) c FROM exam_sets WHERE vip_only=1'),
    interview: await c('SELECT COUNT(*) c FROM interview_questions'),
    examRecords: await c('SELECT COUNT(*) c FROM exam_records'),
    orders: await c('SELECT COUNT(*) c FROM orders'),
    paidOrders: await c("SELECT COUNT(*) c FROM orders WHERE status='paid'"),
    revenue: (await sqlite.prepare("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid'").get() as any).s,
    activeSubs: await c('SELECT COUNT(*) c FROM subscriptions WHERE status=? AND expire_at>?', ['active', Date.now()])
  }
}

/* ============ 内推资源库管理 (H4，M4 维护) ============ */
export async function listReferralsAdmin(filter: { track?: string; city?: string; level?: string } = {}) {
  const where: string[] = []; const params: any[] = []
  if (filter.track) { where.push('track=?'); params.push(filter.track) }
  if (filter.city) { where.push('city=?'); params.push(filter.city) }
  if (filter.level) { where.push('level=?'); params.push(filter.level) }
  const sql = 'SELECT * FROM referrals' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY created_at DESC'
  return (await sqlite.prepare(sql).all(...params) as any[]).map((r: any) => ({ ...r, trackName: trackName(r.track) }))
}
export async function getReferral(id: string) { return await sqlite.prepare('SELECT * FROM referrals WHERE id=?').get(id) || null }
export async function createReferral(data: any) {
  const id = String(data.id || '').trim()
  if (!/^[a-z0-9_-]{2,60}$/.test(id)) throw new Error('INVALID_ID')
  if (await getReferral(id)) throw new Error('DUP_ID')
  await sqlite.prepare('INSERT INTO referrals (id,company,title,track,city,level,type,requirement,intro,contact,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, data.company || '', data.title || '', data.track || 'frontend', data.city || '', data.level || '',
      data.type || '社招', data.requirement || '', data.intro || '', data.contact || '', Date.now())
  return await getReferral(id)
}
export async function updateReferral(id: string, patch: any) {
  const r = await getReferral(id); if (!r) return null
  const sets: string[] = []; const v: any[] = []
  for (const f of ['company', 'title', 'track', 'city', 'level', 'type', 'requirement', 'intro', 'contact']) {
    if (patch[f] !== undefined) { sets.push(`${f}=?`); v.push(patch[f]) }
  }
  if (!sets.length) return r
  v.push(id); await sqlite.prepare(`UPDATE referrals SET ${sets.join(',')} WHERE id=?`).run(...v)
  return await getReferral(id)
}
export async function deleteReferral(id: string) {
  const r = await getReferral(id); if (!r) return false
  await sqlite.prepare('DELETE FROM referrals WHERE id=?').run(id)
  return true
}

export async function listReferralApplications(status?: string) {
  const where = status ? 'WHERE a.status=?' : ''
  const rows = await sqlite.prepare(
    `SELECT a.id,a.user_id,a.referral_id,a.name,a.contact,a.note,a.status,a.created_at,r.company,r.title,r.track
     FROM referral_applications a LEFT JOIN referrals r ON r.id=a.referral_id
     ${where} ORDER BY a.created_at DESC`
  ).all(...(status ? [status] : [])) as any[]
  return rows.map((r: any) => ({ ...r, trackName: trackName(r.track) }))
}
export async function updateReferralApplication(id: string, status: string) {
  const a = await sqlite.prepare('SELECT * FROM referral_applications WHERE id=?').get(id) as any
  if (!a) return null
  const ok = ['pending', 'contacted', 'done', 'rejected']
  if (!ok.includes(status)) throw new Error('BAD_STATUS')
  await sqlite.prepare('UPDATE referral_applications SET status=? WHERE id=?').run(status, id)
  return await sqlite.prepare('SELECT * FROM referral_applications WHERE id=?').get(id)
}
