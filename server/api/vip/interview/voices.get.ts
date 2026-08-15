// 返回当前 provider 支持的全部音色与后端类型。
// 前端据此动态渲染音色下拉（含全部平台支持音色，3 个推荐人格标记 recommended）。
import { getTtsProviderName, listVoicesByProvider } from '~/utils/speech'
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const provider = getTtsProviderName()
  return { provider, voices: listVoicesByProvider(provider) }
})
