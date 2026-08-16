// 语音识别（ASR）：前端 MediaRecorder 录音 → multipart 音频 → 服务端转写 → {text}
// 用于 Safari / Firefox 等不支持浏览器端 SpeechRecognition 的浏览器实现语音作答。
// 登录门禁；ASR 未配置/失败返回 503，前端据此降级为手动文字输入。
import { readMultipartFormData } from 'h3'

const MAX_AUDIO = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const rl = rateLimit('vip-asr', user.id, 60, 60_000)
  if (!rl.ok) return json(event, 429, { error: `语音识别请求过于频繁，请 ${rl.retryAfter} 秒后重试` })

  let parts: any[] = []
  try {
    parts = (await readMultipartFormData(event)) || []
  } catch {
    return json(event, 400, { error: '上传格式有误，请使用 multipart/form-data 上传音频' })
  }

  const part = parts.find((p: any) => p.name === 'audio') || parts.find((p: any) => p.data && p.data.length)
  if (!part || !part.data || part.data.length === 0) {
    return json(event, 400, { error: '未检测到音频数据' })
  }
  if (part.data.length > MAX_AUDIO) {
    return json(event, 413, { error: '音频过大，请控制在 10MB 以内（录音请尽量简短）' })
  }

  try {
    const r = await getAsr().transcribe(part.data, { contentType: part.type, filename: part.filename })
    return json(event, 200, { text: r.text })
  } catch (e: any) {
    const msg = e?.message || '语音识别失败'
    return json(event, /未配置/.test(msg) ? 503 : 500, { error: msg })
  }
})
