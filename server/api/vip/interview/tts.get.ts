// 语音面试：文本 → 音频（默认本地 Piper 离线神经网络；TTS_PROVIDER=edge/mock 可切换）
// 登录门禁；TTS 不可用时返回 503，前端据此降级为纯文字展示。
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const q = getQuery(event)
  const text = typeof q.text === 'string' ? q.text : ''
  if (!text.trim()) return json(event, 400, { error: '缺少 text' })
  const cache = String(q.cache ?? '1') !== '0'
  // 音色与语速透传：不同 voice/rate 在 synthesizeWithCache 内按 key 分文件缓存
  const opts: any = { cache }
  if (typeof q.voice === 'string' && q.voice.trim()) opts.voice = q.voice.trim()
  if (typeof q.rate === 'string' && q.rate.trim()) opts.rate = q.rate.trim()
  try {
    const res = await synthesizeWithCache(text.slice(0, 2000), opts)
    setHeader(event, 'Content-Type', res.mime)
    setHeader(event, 'x-tts-provider', getTtsProviderName())
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    return res.audio
  } catch (e: any) {
    return json(event, 503, { error: e?.message || 'TTS 当前不可用' })
  }
})
