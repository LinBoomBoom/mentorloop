// 返回当前页的绝对规范 URL（不含查询参数），用于 <link rel="canonical"> 与 og:url。
// 目的：防止分页 / 筛选查询参数（?page= ?type= ?q= ?tech=）造成的内容重复收录（cannibalization）。
// 预渲染（prerender）阶段没有 request event，useRequestURL 会抛错，这里捕获降级为空串，
// 由 sitemap.xml 提供正确 URL，缺失 canonical 不影响核心收录。
export function useCanonicalUrl(): string {
  try {
    const u = useRequestURL()
    return u.origin + u.pathname
  } catch (e) {
    return ''
  }
}
