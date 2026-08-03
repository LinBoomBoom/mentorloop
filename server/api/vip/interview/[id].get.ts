// H1 · 获取单场面试会话详情（含逐题消息流）
export default defineEventHandler((event) => {
  const user = requireVipUser(event)
  const id = event.context.params?.id
  const sess = getInterview(id, user.id)
  if (!sess) return json(event, 404, { error: '会话不存在' })
  return json(event, 200, { session: sess })
})
