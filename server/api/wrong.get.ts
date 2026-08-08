// GET /api/wrong?due=1 —— 错题本（跨卷/练习错题 + SRS 到期过滤）
// 注：getUser/json/listWrongItems 均来自 server/utils 自动注入，严禁显式 import（Nitro 虚拟化会解析错位）
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const q = getQuery(event)
  const dueOnly = q.due === '1'
  return json(event, 200, { items: listWrongItems(user.id, dueOnly) })
})
