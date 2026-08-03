import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    loaded: false
  }),
  getters: {
    isLoggedIn: (s) => !!s.user,
    isVip: (s) => !!(s.user && s.user.vip && s.user.vip.active)
  },
  actions: {
    // 启动时恢复登录态：服务端通过 HttpOnly Cookie 鉴权，无需前端持有 token
    async init() {
      await this.fetchMe()
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
    },
    async logout() {
      try {
        const { request } = useApi()
        await request('/api/auth/logout', { method: 'POST' })
      } catch { /* ignore */ }
      this.user = null
      this.loaded = false
    }
  }
})
