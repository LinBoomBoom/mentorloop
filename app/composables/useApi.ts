// 统一请求封装：鉴权由 HttpOnly Cookie 自动携带，无需手动注入 token
export const useApi = () => {
  const request = async (url: string, opts: any = {}) => {
    const headers: any = { ...(opts.headers || {}) }
    try {
      return await $fetch(url, { ...opts, headers })
    } catch (e: any) {
      const data = e?.data || e?.response?._data
      // Nitro 500 包装为 { error: true, message: '...' }；自有接口为 { error: '...' }
      const msg = (data?.error === true && data?.message)
        ? data.message
        : (typeof data?.error === 'string' ? data.error : (data?.message || e?.statusMessage || '请求失败'))
      const err: any = new Error(msg)
      err.status = e?.status
      // 透传后端业务码（如 VIP_REQUIRED），供前端按 code 精准引导
      if (data?.code) err.code = data.code
      throw err
    }
  }
  return { request }
}
