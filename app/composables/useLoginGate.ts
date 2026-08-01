// 行动前登录拦截：未登录则跳转到 /login?redirect=当前页，登录后自动回跳
// 用于「打卡完成 / 交卷 / AI 提问」等需要账号的写操作，避免"看不到内容"的围墙体验
export const useLoginGate = () => {
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  // 返回 true 表示已拦截（未登录，已跳转登录页）
  const guard = (): boolean => {
    if (auth.isLoggedIn) return false
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return true
  }

  return { guard }
}
