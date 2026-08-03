// 健康检查接口：供负载均衡 / 监控探活（C2）
import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  try {
    sqlite.prepare('SELECT 1').get()
    return { ok: true, db: 'up', time: new Date().toISOString() }
  } catch (e: any) {
    return { ok: false, db: 'down', error: String(e?.message || e), time: new Date().toISOString() }
  }
})
