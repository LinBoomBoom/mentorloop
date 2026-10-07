// H1 · 当前用户的面试历史列表
export default defineEventHandler(async (event) => {
  const user = await requireVipUser(event)
  return json(event, 200, { list: await listInterviews(user.id) })
})
