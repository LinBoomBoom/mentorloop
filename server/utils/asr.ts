// 语音识别（ASR）子系统：可插拔工厂，沿用 speech.ts 的惰性 env 读取 + 工厂模式。
// 目的：让 Safari / Firefox 等不支持浏览器端 Web Speech 识别的浏览器，也能通过
// 「前端 MediaRecorder 录音 → 服务端 ASR 转写」实现语音作答，从而兼容全平台。
// 默认 MVP：OpenAI 兼容 Whisper 端点（可经 env 指向任意兼容服务：OpenAI / 硅基流动 / Groq / 本地 whisper-server）。
// 注：Node 22 全局已提供 FormData / File，直接使用 globalThis 以避免打包器对 node: 前缀的解析差异。

export interface AsrResult { text: string }
export interface AsrOptions { contentType?: string; filename?: string; language?: string }

export interface AsrProvider {
  name: string
  transcribe(audio: Buffer, opts?: AsrOptions): Promise<AsrResult>
}

// ---- 文件扩展名推断（Whisper 按扩展名选解码器更稳） ----
function extOf(contentType?: string): string {
  const t = (contentType || '').toLowerCase()
  if (t.includes('webm')) return 'webm'
  if (t.includes('mp4') || t.includes('m4a')) return 'mp4'
  if (t.includes('ogg')) return 'ogg'
  if (t.includes('mpeg') || t.includes('mp3')) return 'mp3'
  if (t.includes('wav')) return 'wav'
  if (t.includes('flac')) return 'flac'
  return 'webm'
}

// ---- Mock ASR（离线/测试用，返回确定文本，保证链路可跑、可单测） ----
class MockAsrProvider implements AsrProvider {
  name = 'mock'
  async transcribe(_audio: Buffer, _opts?: AsrOptions): Promise<AsrResult> {
    return { text: '这是模拟语音识别结果：我认为这道题的核心在于理解其底层原理，并结合实际场景分析权衡。' }
  }
}

// ---- OpenAI 兼容 Whisper（生产默认；读 ASR_API_KEY，可经 ASR_BASE_URL 指向任意兼容端点） ----
export class OpenAiWhisperProvider implements AsrProvider {
  name = 'openai-whisper'
  private baseUrl: string
  private apiKey: string
  private model: string
  private lang: string
  constructor() {
    this.apiKey = process.env.ASR_API_KEY || ''
    this.baseUrl = (process.env.ASR_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
    this.model = process.env.ASR_MODEL || 'whisper-1'
    this.lang = process.env.ASR_LANG || 'zh'
  }
  async transcribe(audio: Buffer, opts?: AsrOptions): Promise<AsrResult> {
    if (!this.apiKey) throw new Error('ASR 未配置（缺少 ASR_API_KEY；可在 .env 配置 OpenAI 兼容 Whisper 端点的密钥，或设 ASR_PROVIDER=mock 跑通链路）')
    const ext = opts?.filename ? (opts.filename.split('.').pop() || extOf(opts.contentType)) : extOf(opts?.contentType)
    const fname = `audio.${ext}`
    const ctype = opts?.contentType || (ext === 'mp4' ? 'audio/mp4' : ext === 'webm' ? 'audio/webm' : ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : 'application/octet-stream')
    const form: any = new (globalThis as any).FormData()
    form.append('file', new (globalThis as any).File([audio as any], fname, { type: ctype }), fname)
    form.append('model', this.model)
    if (this.lang) form.append('language', this.lang)
    form.append('response_format', 'json')
    let res: any
    try {
      res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form
      })
    } catch (e: any) {
      throw new Error('ASR 网络请求失败：' + (e?.message || e))
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`ASR 请求失败 ${res.status}：${t.slice(0, 200)}`)
    }
    const json = await res.json().catch(() => ({}))
    const text = (json?.text || '').toString().trim()
    if (!text) throw new Error('ASR 返回空文本')
    return { text }
  }
}

// ---- 工厂（惰性 env 读取） ----
let _asr: AsrProvider | null = null
export function getAsr(): AsrProvider {
  if (_asr) return _asr
  const p = (process.env.ASR_PROVIDER || 'openai').toLowerCase()
  _asr = p === 'mock' ? new MockAsrProvider() : new OpenAiWhisperProvider()
  return _asr
}
export function asrEnabled(): boolean {
  return !!(process.env.ASR_API_KEY || (process.env.ASR_PROVIDER || 'openai').toLowerCase() === 'mock')
}
