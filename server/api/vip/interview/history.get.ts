// H1 · 当前用户的面试历史列表
export default defineEventHandler((event) => {
  const user = requireVipUser(event)
  return json(event, 200, { list: listInterviews(user.id) })
})
