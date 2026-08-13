// 返回当前真正可用的面试官音色列表（仅 Piper 离线神经网络嗓音）与后端类型。
// 前端据此动态渲染音色下拉，避免列出未下载的模型或任何"假音色"。
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  return {
    provider: getTtsProviderName(),
    voices: listPiperVoices()
  }
})
