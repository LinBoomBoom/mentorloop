import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    loaded: false,
    // 是否已挂载到客户端。SSR 与 hydration（首屏）期间为 false，
    // 让「已登录 / 未登录」条件渲染在服务端与客户端的首次渲染保持一致，消除 hydration mismatch。
    hydrated: false
  }),
  getters: {
    // 关键：未 hydrated 前一律按「未登录」处理，匹配 SSR 输出
    isLoggedIn: (s) => s.hydrated && !!s.user,
    isVip: (s) => s.hydrated && !!(s.user && s.user.vip && s.user.vip.active)
  },
  actions: {
    // 启动时经 HttpOnly Cookie 恢复登录态（客户端插件在挂载后才调用，见 auth.client.ts）
    async init() {
      await this.fetchMe()
      this.hydrated = true
    },
    async fetchMe() {
      try {
        const { request } = useApi()
        const { user } = await request('/api/auth/me')
        this.user = user
        this.loaded = true
      } catch {
        this.user = null
        this.loaded = true
      }
    },
    // 登录/注册成功后服务端已写入 HttpOnly Cookie，前端只需保存用户信息
    setSession(user: any) {
      this.user = user
      this.loaded = true
      this.hydrated = true
    },
    async logout() {
      try {
        const { request } = useApi()
        await request('/api/auth/logout', { method: 'POST' })
      } catch { /* ignore */ }
      this.user = null
      this.loaded = false
      this.hydrated = true
    }
  }
})
