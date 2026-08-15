// 返回当前 provider 支持的全部音色与后端类型。
// 前端据此动态渲染音色下拉（含全部平台支持音色，3 个推荐人格标记 recommended）。
// 注：getTtsProviderName / listVoicesByProvider 由 Nitro 对 server/utils/* 的全局自动导入提供，
// 无需显式 import（与同目录 tts.get.ts 一致）。误用 '~/utils/speech' 会因 ~ 指向 app/ 而非 server/ 而 ENOENT。
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const provider = getTtsProviderName()
  // 顺带回报阿里云 key 配置状态，便于前端一眼看出 dev server 是否真正加载到 .env，
  // 避免「阿里云不可用却静默回退浏览器系统嗓音」时故障被藏起来。
  const key = dashscopeApiKey()
  const aliyunConfigured = !!key
  const aliyunKeyTail = aliyunConfigured ? key.slice(-4) : ''
  return { provider, voices: listVoicesByProvider(provider), aliyunConfigured, aliyunKeyTail }
})
