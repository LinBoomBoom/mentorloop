// 管理后台统一路由（catch-all）。鉴权 + 事件解析后委托 server/utils/adminDispatch.ts。
import { defineEventHandler, getMethod, getRouterParams, getQuery, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event) // 401 / 403 统一拦
  const method = getMethod(event)
  // Nitro 对 catch-all 路由的 slug 在不同版本下可能是字符串或数组，统一规整为数组。
  const rawSlug = getRouterParams(event).slug
  const seg: string[] = typeof rawSlug === 'string'
    ? rawSlug.split('/').filter(Boolean)
    : Array.isArray(rawSlug) ? rawSlug.filter(Boolean) : []
  const body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) ? (await readBody(event).catch(() => ({})) || {}) : {}
  const q = getQuery(event) as any
  try {
    return adminDispatch(admin, method, seg, q, body)
  } catch (e: any) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, statusMessage: e.message })
    throw e
  }
})
