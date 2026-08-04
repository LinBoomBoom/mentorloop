// 时间格式化工具：统一输出「年月日 时分秒」中文可读性格式（本地时区、补零）。
// 使用处：最近答卷、打卡记录、面试历史等需要精确到秒的场景。
export function fmtDateTime(ts: string | number | Date | null | undefined): string {
  if (ts == null) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日 ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 仅日期：YYYY年MM月DD日
export function fmtDate(ts: string | number | Date | null | undefined): string {
  if (ts == null) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日`
}
