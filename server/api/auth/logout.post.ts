// 退出登录
export default defineEventHandler((event) => {
  const token = getHeader(event, 'x-token')
  if (token) sqlite.prepare('DELETE FROM sessions WHERE token=?').run(token)
  return json(event, 200, { ok: true })
})
