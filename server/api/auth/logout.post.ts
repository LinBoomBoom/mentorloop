// 退出登录：清除 HttpOnly 鉴权 Cookie + 删除服务端会话
export default defineEventHandler((event) => {
  // A11：鉴权已迁移至 HttpOnly Cookie；必须读取 Cookie 中的 token 才能撤销服务端会话
  const token = getCookie(event, AUTH_COOKIE)
  if (token) {
    try { sqlite.prepare('DELETE FROM sessions WHERE token=?').run(token) } catch { /* ignore */ }
  }
  clearAuthCookie(event)
  return json(event, 200, { ok: true })
})
