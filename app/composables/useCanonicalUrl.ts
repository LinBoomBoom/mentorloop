// 返回当前页的绝对规范 URL（不含查询参数），用于 <link rel="canonical"> 与 og:url。
// 目的：防止分页 / 筛选查询参数（?page= ?type= ?q=）造成的内容重复收录（cannibalization）。
// 注：技术分类（tech）已是路由段 /interview/[track]/[tech]，不进入查询参数，故不在列表内。
// 预渲染（prerender）阶段没有 request event，useRequestURL 会抛错，这里捕获降级为空串，
// 由 sitemap.xml 提供正确 URL，缺失 canonical 不影响核心收录。
//
// 关键改动：返回响应式 ComputedRef 而非静态字符串。
// 题目 / 技术 / 方向页在 Nuxt 中会因「同一组件仅路由参数变化」而被复用、不重新执行 setup；
// 若返回静态字符串，canonical 会串到首次进入的页面。改为随 route 实时计算，复用后也不串题。
export function useCanonicalUrl() {
  const route = useRoute()
  return computed(() => {
    if (import.meta.server) {
      try {
        const u = useRequestURL()
        return u.origin + u.pathname
      } catch (e) {
        return ''
      }
    }
    return window.location.origin + route.path
  })
}
