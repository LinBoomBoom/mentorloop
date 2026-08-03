// 全局路由守卫（内容公开、行动才登录的体验模型）
// - 内容页（首页/学习/面试/答卷/VIP）全部公开可浏览，不再强制登录
// - 仅当已登录用户访问 /login 时跳回首页（或 redirect 目标）
// 登录态由 useAuthStore 经 /api/auth/me（HttpOnly Cookie）恢复，不再读取 localStorage。
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (to.path === '/login') {
    if (auth.isLoggedIn) {
      const redirect = (to.query.redirect as string) || '/'
      return navigateTo(redirect)
    }
  }
})
