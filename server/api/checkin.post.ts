// 每日打卡（幂等：同一天重复点击不重复计数）
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) throw createError({ statusCode: 401, message: '请先登录' })
  const rl = rateLimit('checkin', user.id, 20, 60_000)
  if (!rl.ok) return json(event, 429, { error: `操作过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const now = new Date()
  const checkDate = fmtDateLocal(now)
  const createdAt = now.getTime()
  const info = sqlite.prepare('INSERT OR IGNORE INTO checkins (user_id, check_date, created_at) VALUES (?,?,?)').run(user.id, checkDate, createdAt)
  const alreadyChecked = info.changes === 0
  const { current, longest } = computeStreak(user.id)
  return json(event, 200, {
    ok: true,
    alreadyChecked,
    checkedToday: true,
    streak: current,
    longest
  })
})
