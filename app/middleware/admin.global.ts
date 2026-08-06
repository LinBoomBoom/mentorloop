// admin 区域前置守卫：未登录 / 非管理员不得进入后台
// 用 SSR 可靠的 useFetch('/api/auth/me') 判定（不依赖 auth store 在 SSR 阶段的同步状态），
// 避免未授权访问触发子页面 onMounted 里的 401、未捕获异常与 NUXT_E4011 类噪声。
// - 未登录 → 跳转登录页（携带 redirect，登录后回跳）
// - 已登录但非 admin → 回首页（避免与 auth.global 的「已登录跳回」形成重定向循环）
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return
  const { data } = await useFetch('/api/auth/me', { server: true, lazy: false })
  const me: any = data.value
  if (!me || me.role !== 'admin') {
    return navigateTo(me ? '/' : `/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
