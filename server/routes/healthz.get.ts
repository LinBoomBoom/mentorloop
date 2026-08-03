// 健康检查端点（C2）：供反代/外部监控（UptimeRobot 等）探活。
// 不依赖登录态；轻量探测 DB 可达性，失败不阻断（返回 db:'down' 便于告警）。
export default defineEventHandler(() => {
  let db = 'down'
  try {
    sqlite.prepare('SELECT 1').get()
    db = 'up'
  } catch {
    /* 仅标记，不影响 200 返回，便于监控区分 */
  }
  return {
    status: 'ok',
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    db,
    memory: { rssMb: Math.round(process.memoryUsage().rss / 1048576) }
  }
})
