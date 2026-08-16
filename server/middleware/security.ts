// 全局安全响应头（A11）：CSP / 防嗅探 / 防点击劫持 / 引荐策略 等
// Nitro 中间件：每个请求自动执行。
import { setResponseHeader } from 'h3'

// 基线 CSP：self 优先；字体已全面改用系统字体栈（见 main.css / nuxt.config），不依赖任何外部字体 CDN，
//   故 img-src / font-src 不再放行 Google Fonts 域名（P1#7 收口，消除国内 FOUC 与外部依赖）。
// 因 Nuxt 首屏内联主题脚本需要 'unsafe-inline'，待接入 nonce 方案后可收紧。
// worker-src 'self' blob:：DiceBear v9 浏览器端会 fork Web Worker（blob: URL）异步生成头像，
//   没显式声明 worker-src 时浏览器会把 worker-src 回退到 script-src 兜底，进而触发 CSP 拦截警告。
// img-src 'self' data: blob:：头像 SVG（data URI / blob）/ 动态头像资源允许。
// media-src / connect-src 'self'：本地 Piper 音频（/api/vip/interview/tts）播放 + ws 实时面试连接。
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self' ws: wss:",
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
