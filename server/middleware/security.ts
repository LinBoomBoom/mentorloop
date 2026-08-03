// 全局安全响应头（A11）：CSP / 防嗅探 / 防点击劫持 / 引荐策略 等
// Nitro 中间件：每个请求自动执行。
import { setResponseHeader } from 'h3'

// 基线 CSP：self 优先；允许 Google Fonts（nuxt.config 已引入）；
// 因 Nuxt 首屏内联主题脚本需要 'unsafe-inline'，待接入 nonce 方案后可收紧。
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Security-Policy', CSP)
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
})
