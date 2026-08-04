// 登录态恢复（universal 插件）
//
// 为什么不再放在 .client 插件的 onNuxtReady 里：
//   旧方案 SSR 阶段完全不知道登录态 → 服务端按「未登录」出 HTML，客户端挂载后才异步补登录态。
//   于是（1）首屏有「登录/注册」闪烁；（2）更严重的是，8 个受保护页面在 onMounted 里同步调
//   guard()，此时登录态尚未判定完，已登录用户会被误判并踢回 /login —— 即「切页面丢登录态」。
//
// 现方案：SSR 阶段带着 cookie 同步判定完再渲染，结果随 Pinia payload 序列化给客户端；
// 客户端插件看到 authResolved 已为 true 就直接复用、不再发请求。
// 关键点：服务端 HTML 与客户端首屏读的是同一份状态，因此不会产生 hydration mismatch。
// （切忌改回「fire-and-forget 异步改 store」的写法，那会让 HTML 与 payload 不一致。）
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  // 客户端：状态已由 SSR payload 恢复，绝不能再拉一次并改状态（会引发 hydration mismatch）
  if (auth.authResolved) return
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  await auth.init(headers as any)
})
