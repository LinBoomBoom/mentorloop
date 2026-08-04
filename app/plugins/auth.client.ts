// 客户端启动：经 HttpOnly Cookie 恢复登录态
// 注意：必须在 hydration 之后再恢复。否则 SSR 阶段该插件不运行、store 始终为「未登录」，
// 而客户端在挂载前就 await 拉到用户信息、store 变成「已登录」，导致同一批 v-if 节点
// （登录/注册按钮、用户卡片、VIP 标签等）服务端是 <a>、客户端变成 <button>，触发 hydration mismatch。
import { onNuxtReady } from '#app'

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  onNuxtReady(() => { auth.init() })
})
