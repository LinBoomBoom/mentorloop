import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    loaded: false,
    // 是否已挂载到客户端。SSR 与 hydration（首屏）期间为 false，
    // 让「已登录 / 未登录」条件渲染在服务端与客户端的首次渲染保持一致，消除 hydration mismatch。
    hydrated: false,
    // 登录态是否已「判定完成」。SSR 插件会在渲染前 await 判定并把结果序列化进 payload，
    // 客户端 hydration 直接复用，因此首屏不会再出现「先未登录、后变已登录」的抖动。
    authResolved: false,
    session: null as any
  }),
  getters: {
    // 关键：未 hydrated 前一律按「未登录」处理，匹配 SSR 输出
    isLoggedIn: (s) => s.hydrated && !!s.user,
    isVip: (s) => s.hydrated && !!(s.user && s.user.vip && s.user.vip.active)
  },
  actions: {
    // 由 plugins/auth.ts 在 SSR（带 cookie 透传）与客户端兜底时调用
    async init(headers?: Record<string, string>) {
      await this.fetchMe(headers)
      this.hydrated = true
      this.authResolved = true
    },
    async fetchMe(headers?: Record<string, string>) {
      try {
        const { request } = useApi()
        const r: any = await request('/api/auth/me', headers ? { headers } : {})
        this.user = r.user
        this.session = r.session || null
        this.loaded = true
      } catch (e: any) {
        // 只有明确 401（会话失效 / 未登录）才清空登录态；
        // 网络抖动、超时、500 等一律保留现有登录态，避免「切页面就掉登录」的误判。
        if (e?.status === 401) {
          this.user = null
          this.session = null
        }
        this.loaded = true
      }
    },
    // 等待登录态判定完成。受保护页面在 onMounted 里必须先 await 它再做跳转判断，
    // 否则会在判定完成前误判为未登录并把已登录用户踢去登录页。
    whenReady(timeoutMs = 5000): Promise<void> {
      if (this.authResolved) return Promise.resolve()
      return new Promise<void>((resolve) => {
        let done = false
        const finish = () => { if (!done) { done = true; stop(); clearTimeout(t); resolve() } }
        const stop = watch(() => this.authResolved, (v) => { if (v) finish() })
        const t = setTimeout(finish, timeoutMs) // 兜底：判定异常也不永久挂起
      })
    },
    // 登录/注册成功后服务端已写入 HttpOnly Cookie，前端只需保存用户信息
    setSession(user: any) {
      this.user = user
      this.loaded = true
      this.hydrated = true
      this.authResolved = true
    },
    async logout() {
      try {
        const { request } = useApi()
        await request('/api/auth/logout', { method: 'POST' })
      } catch { /* ignore */ }
      this.user = null
      this.session = null
      this.loaded = false
      this.hydrated = true
      this.authResolved = true
    }
  }
})
