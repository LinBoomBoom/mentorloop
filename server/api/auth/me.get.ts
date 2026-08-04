// 当前用户信息（附带会话有效期，便于前端提示「登录将于 X 过期」）
import { getCookie, getHeader } from 'h3'

export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const token = getCookie(event, 'ml_token') || getHeader(event, 'x-token')
  const row = token
    ? (sqlite.prepare('SELECT expires_at FROM sessions WHERE token=?').get(token) as any)
    : null
  return json(event, 200, {
    user: publicUser(user),
    session: {
      expiresAt: row?.expires_at || null,
      ttlDays: Math.round(SESSION_TTL_MS / 86400000),
      sliding: true // 活跃即自动续期
    }
  })
})
