// 全局路由守卫（内容公开、行动才登录的体验模型）
// - 内容页（首页/学习/面试/答卷/VIP）全部公开可浏览，不再强制登录
// - 仅当已登录用户访问 /login 时跳回首页（或 redirect 目标）
// - 打卡 / 交卷 / AI 提问等"行动"由 useLoginGate 在具体按钮处拦截
export default defineNuxtRouteMiddleware((to) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('dm-token') : ''
  const auth = useAuthStore()
  if (to.path === '/login') {
    if (token && auth.isLoggedIn) {
      const redirect = (to.query.redirect as string) || '/'
      return navigateTo(redirect)
    }
    return
  }
})
