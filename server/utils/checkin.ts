// 打卡相关服务端工具：本地日期、连续天数计算
export function fmtDateLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function parseDS(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function isNextDay(prev: string, cur: string): boolean {
  const diff = (parseDS(cur).getTime() - parseDS(prev).getTime()) / 86400000
  return Math.round(diff) === 1
}

// 连续天数：从今天起往前数连续打卡天数（今天未打卡则从昨天起算）；
// 同时返回历史最长连续。dates 为 checkins.check_date 集合。
export function computeStreak(userId: string): { current: number; longest: number } {
  const rows = sqlite.prepare('SELECT check_date FROM checkins WHERE user_id=? ORDER BY check_date DESC').all(userId) as any[]
  const set = new Set(rows.map((r: any) => r.check_date))
  let current = 0
  const d = new Date()
  if (!set.has(fmtDateLocal(d))) d.setDate(d.getDate() - 1) // 今天没打，从昨天起算
  while (set.has(fmtDateLocal(d))) {
    current++
    d.setDate(d.getDate() - 1)
  }
  let longest = 0
  let run = 0
  let prev: string | null = null
  ;[...set].sort().forEach((date: string) => {
    run = prev && isNextDay(prev, date) ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = date
  })
  return { current, longest }
}
