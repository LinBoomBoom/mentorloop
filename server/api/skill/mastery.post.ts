// POST /api/skill/mastery —— 显式标记/取消「已掌握」（免费核心闭环钩子）
// body: { skillKey, track, subtrackId, skillName, marked }
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const body = await readBody(event)
  const { skillKey, track, subtrackId, skillName, marked } = body || {}
  if (!skillKey || !track || !subtrackId || !skillName) return json(event, 400, { error: '参数缺失' })
  setMark(user.id, String(skillKey), String(track), String(subtrackId), String(skillName), !!marked)
  return json(event, 200, { ok: true })
})
