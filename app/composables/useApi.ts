// 统一请求封装：自动携带 token，统一错误提示
export const useApi = () => {
  const request = async (url: string, opts: any = {}) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('dm-token') : ''
    const headers: any = { ...(opts.headers || {}) }
    if (token) headers['x-token'] = token
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
