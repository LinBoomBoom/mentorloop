// 仅对 SSR 返回的 HTML 响应设置 no-cache，避免浏览器缓存旧的 index.html
// （旧 HTML 会引用已被重建删除的旧 chunk，导致应用起不来/白屏）。
// 静态资源(_nuxt)保持 immutable 长缓存，不受此插件影响。
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response: any, { event }: any) => {
    if (!response?.headers) return
    const ct = response.headers.get?.('content-type') || ''
    if (ct.includes('text/html')) {
      response.headers.set('cache-control', 'no-cache')
    }
  })
})
