// 我的学习进度
export default defineEventHandler(async (event) => {
  const user = await getUser(event)
  if (!user) return json(event, 200, { progress: {}, loggedIn: false })
  const rows = await sqlite.prepare('SELECT module_id,chapter_id,section_id,done_at FROM progress WHERE user_id=?').all(user.id)
  const progress: any = {}
  rows.forEach((r: any) => { progress[`${r.module_id}/${r.chapter_id}/${r.section_id}`] = r.done_at })
  return json(event, 200, { progress })
})
