// 健康检查端点（C2 / C6）：供反代 / 外部监控（UptimeRobot 等）探活。
// 不依赖登录态；返回组件级状态，整体 status 为 ok|degraded。
// db 不可达或磁盘 <10% 时标 degraded，但仍返回 200，便于监控区分"活但异常"。
// collectHealth 由 Nitro 从 server/utils 自动导入（路由文件禁止相对 import server/utils）
export default defineEventHandler(async () => await collectHealth())
