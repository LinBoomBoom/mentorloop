// 标记/取消某节「已掌握」
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const rl = rateLimit('progress-toggle', user.id, 60, 60_000)
  if (!rl.ok) return json(event, 429, { error: `操作过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const { moduleId, chapterId, sectionId, done } = await readBody(event)
  if (!moduleId || !chapterId || !sectionId) return json(event, 400, { error: '参数不全' })
  if (done) sqlite.prepare('INSERT OR REPLACE INTO progress (user_id,module_id,chapter_id,section_id,done_at) VALUES (?,?,?,?,?)').run(user.id, moduleId, chapterId, sectionId, Date.now())
  else sqlite.prepare('DELETE FROM progress WHERE user_id=? AND section_id=?').run(user.id, sectionId)
  const rows = sqlite.prepare('SELECT module_id,chapter_id,section_id,done_at FROM progress WHERE user_id=?').all(user.id)
  const progress: any = {}
  rows.forEach((r: any) => { progress[`${r.module_id}/${r.chapter_id}/${r.section_id}`] = r.done_at })
  return json(event, 200, { ok: true, progress })
})
