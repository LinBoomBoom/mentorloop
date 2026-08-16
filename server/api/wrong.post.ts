// POST /api/wrong —— 错题本操作：review（SRS 排期下次）/ dismiss（移除）
// 注：getUser/json/actWrongItem 均来自 server/utils 自动注入，严禁显式 import（Nitro 虚拟化会解析错位）
// body: { id, action }
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const rl = rateLimit('wrong', user.id, 30, 60_000)
  if (!rl.ok) return json(event, 429, { error: `操作过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const body = await readBody(event)
  const { id, action } = body || {}
  if (!id || !action) return json(event, 400, { error: '参数缺失' })
  const r = actWrongItem(user.id, String(id), String(action))
  if (!r) return json(event, 404, { error: '未找到' })
  return json(event, 200, r)
})
