// 统一请求封装：鉴权由 HttpOnly Cookie 自动携带，无需手动注入 token
export const useApi = () => {
  const request = async (url: string, opts: any = {}) => {
    const headers: any = { ...(opts.headers || {}) }
    try {
      return await $fetch(url, { ...opts, headers })
    } catch (e: any) {
      const data = e?.data || e?.response?._data
      const msg = data?.error || e?.statusMessage || '请求失败'
      const err: any = new Error(msg)
      err.status = e?.status
      throw err
    }
  }
  return { request }
}
