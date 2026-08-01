// 安全获取当前页绝对 URL，用于 og:url。
// 预渲染（prerender）阶段没有 request event，useRequestURL 会抛错，
// 这里捕获降级为空串，避免整页 500（og:url 缺失不影响收录，sitemap 已提供 URL）。
export function safeOgUrl(): string {
  try {
    return useRequestURL().href
  } catch (e) {
    return ''
  }
}
