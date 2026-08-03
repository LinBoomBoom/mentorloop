// 客户端启动：经 HttpOnly Cookie 恢复登录态
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  await auth.init()
})
