// admin 区域前置守卫：未登录 / 非管理员不得进入后台
// 用 SSR 可靠的 useFetch('/api/auth/me') 判定（不依赖 auth store 在 SSR 阶段的同步状态），
// 避免未授权访问触发子页面 onMounted 里的 401、未捕获异常与 NUXT_E4011 类噪声。
// - 未登录 → 跳转登录页（携带 redirect，登录后回跳）
// - 已登录但非 admin → 回首页（避免与 auth.global 的「已登录跳回」形成重定向循环）
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return
  // 注意：/api/auth/me 的响应体是 { user, session }，角色在 me.user.role —— 不是 me.role。
  // 早期误写成 me.role 时恒为 undefined，导致管理员访问 /admin 也被判定为「已登录非管理员」而弹回首页。
  const { data } = await useFetch('/api/auth/me', {
    key: 'admin-guard-me',
    server: true,
    lazy: false,
    // 客户端路由跳转时 useFetch 会复用 SSR payload；管理员刚登录完再进 /admin 会读到旧的未登录快照，
    // 因此显式透传 cookie 并在每次进入 admin 区时重新取，保证判定基于最新会话。
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    getCachedData: () => undefined
  })
  const me: any = data.value
  const role = me?.user?.role
  if (role !== 'admin') {
    return navigateTo(me?.user ? '/' : `/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
