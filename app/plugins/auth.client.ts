// 客户端启动：恢复登录态
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  auth.init()
  if (auth.token) await auth.fetchMe()
})
