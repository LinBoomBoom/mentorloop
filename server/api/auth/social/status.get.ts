// 第三方登录：轮询状态
export default defineEventHandler((event) => {
  const qrToken = getQuery(event).qrToken as string
  const pa = pendingAuth.get(qrToken)
  if (!pa) return json(event, 404, { error: '登录态已失效，请刷新重试' })
  if (pa.status === 'confirmed') return json(event, 200, { status: 'confirmed', token: pa.token, user: publicUser(pa.user) })
  return json(event, 200, { status: 'pending' })
})
