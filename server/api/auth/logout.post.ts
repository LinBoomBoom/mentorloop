// 退出登录：清除 HttpOnly 鉴权 Cookie + 删除服务端会话
export default defineEventHandler((event) => {
  const token = getHeader(event, 'x-token')
  if (token) {
    try { sqlite.prepare('DELETE FROM sessions WHERE token=?').run(token) } catch { /* ignore */ }
  }
  clearAuthCookie(event)
  return json(event, 200, { ok: true })
})
