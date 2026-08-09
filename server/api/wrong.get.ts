// GET /api/wrong?due=1&page=2 —— 错题本（跨卷/练习错题 + SRS 到期过滤 + 分页，每页 20）
// 注：getUser/json/listWrongItemsPaginated 均来自 server/utils 自动注入，严禁显式 import（Nitro 虚拟化会解析错位）
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const q = getQuery(event)
  const dueOnly = q.due === '1'
  const page = Math.max(1, parseInt(q.page as string) || 1)
  const r = listWrongItemsPaginated(user.id, dueOnly, page, 20)
  return json(event, 200, { items: r.items, total: r.total, dueTotal: r.dueTotal, page: r.page, pageSize: r.pageSize })
})
