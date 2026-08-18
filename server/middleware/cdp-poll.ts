// 拦截 Chrome DevTools Protocol（CDP）轮询端点，避免浏览器/WebView2 的调试探测请求
// 进入 Vue Router，造成大量 [VUE_ROUTER_R0004] / unhandled_error 404 日志噪音。
// 常见触发源：Electron/Edge WebView2、VS Code 内置浏览器、Chrome 扩展、其他 CDP 客户端。
const CDP_PATHS = new Set(['/json/version', '/json/list'])

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (CDP_PATHS.has(path)) {
    // 返回最小 CDP 兼容响应：空列表，告诉探测端这里没有调试目标。
    // 204 也可以，但某些 CDP 客户端期望 JSON；空数组最稳妥。
    setResponseStatus(event, 200)
    setResponseHeader(event, 'Content-Type', 'application/json')
    return []
  }
})
