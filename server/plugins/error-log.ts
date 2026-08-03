// 全局错误捕获（C5）：未处理异常统一结构化记录，便于生产排障。
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('error', (error: any, event?: any) => {
    const url = event?.node?.req?.url || '-'
    const method = event?.node?.req?.method || '-'
    logError('unhandled_error', {
      method,
      url,
      status: error?.statusCode || null,
      message: error?.message || String(error),
      stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack
    })
  })
})
