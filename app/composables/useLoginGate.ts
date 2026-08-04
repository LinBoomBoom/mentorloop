// 行动前登录拦截：未登录则跳转到 /login?redirect=当前页，登录后自动回跳
// 用于「打卡完成 / 交卷 / AI 提问」等需要账号的写操作，避免"看不到内容"的围墙体验
//
// 注意：guard() 是 **异步** 的，调用处必须 `if (await guard()) return`。
// 原因：登录态由插件判定（SSR 通常已判定完，但客户端硬导航/异常兜底时可能还在进行中），
// 若不等判定完成就下结论，已登录用户会被误判成未登录并踢回登录页。
export const useLoginGate = () => {
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  // 返回 true 表示已拦截（未登录，已跳转登录页）
  const guard = async (): Promise<boolean> => {
    await auth.whenReady()
    if (auth.isLoggedIn) return false
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return true
  }

  return { guard }
}
