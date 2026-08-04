// 会话滑动续期中间件：活跃用户的登录有效期从「最后一次访问」起重新计算 7 天。
// 放在中间件里执行，是因为只有真实请求的 event 才能把新的 Set-Cookie（maxAge）写回浏览器；
// SSR 内部 $fetch 造出来的 event 无法把 Cookie 透传给外层文档响应。
export default defineEventHandler((event) => {
  const p = event.path || ''
  // 静态资源与探活接口无需续期，避免无谓的库查询
  if (p.startsWith('/_nuxt') || p.startsWith('/__nuxt') || p.startsWith('/healthz') || p === '/favicon.ico') return
  touchSession(event)
})
