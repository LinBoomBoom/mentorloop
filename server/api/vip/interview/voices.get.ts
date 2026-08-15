// 返回当前真正可用的面试官音色列表与后端类型。
// 前端据此动态渲染音色下拉，避免列出未下载的模型或任何"假音色"。
// 不同 provider 暴露不同音色集：aliyun/edge 用云端预置音色，piper 用本地模型。
import { getTtsProviderName, listPiperVoices, listAliyunVoices, EDGE_VOICES } from '~/utils/speech'
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const provider = getTtsProviderName()
  const voices = provider === 'aliyun'
    ? listAliyunVoices()
    : provider === 'edge'
      ? EDGE_VOICES
      : listPiperVoices()
  return { provider, voices }
})
