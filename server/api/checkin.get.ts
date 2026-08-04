// 打卡状态：今日是否已打卡、连续/最长/累计天数、全部打卡日期（供日历高亮）
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 200, { loggedIn: false })
  const rows = sqlite.prepare('SELECT check_date FROM checkins WHERE user_id=?').all(user.id) as any[]
  const dates = rows.map((r: any) => r.check_date)
  const { current, longest } = computeStreak(user.id)
  const today = fmtDateLocal(new Date())
  return json(event, 200, {
    loggedIn: true,
    checkedToday: dates.includes(today),
    streak: current,
    longest,
    totalDays: dates.length,
    dates
  })
})
