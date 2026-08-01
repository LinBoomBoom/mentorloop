import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    token: '' as string,
    loaded: false
  }),
  getters: {
    isLoggedIn: (s) => !!s.token && !!s.user,
    isVip: (s) => !!(s.user && s.user.vip && s.user.vip.level > 0)
  },
  actions: {
    init() {
      this.token = (typeof localStorage !== 'undefined' && localStorage.getItem('dm-token')) || ''
    },
    async fetchMe() {
      if (!this.token) return
      try {
        const { request } = useApi()
        const { user } = await request('/api/auth/me')
        this.user = user
        this.loaded = true
      } catch {
        this.logout()
      }
    },
    setSession(token: string, user: any) {
      this.token = token
      this.user = user
      if (typeof localStorage !== 'undefined') localStorage.setItem('dm-token', token)
    },
    logout() {
      this.token = ''
      this.user = null
      if (typeof localStorage !== 'undefined') localStorage.removeItem('dm-token')
    }
  }
})
