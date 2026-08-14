// P3 Step8：真实流式 ASR 厂商 —— 阿里云 NLS 实时语音识别（SpeechTranscriber）。
// 接入后，realtime 模式在 Safari / Firefox（无 Web Speech）下也能获得真·中文实时转写，
// 复用既有 StreamingAsr 接口与 ws 的 audio_chunk 链路；interviewRealtime.ts / ws.ts 零改动。
//
// 协议要点（详见阿里云 NLS 文档）：
// - 连接：wss://nls-gateway-<region>.aliyuncs.com/ws/v1?appkey=<APPKEY>，并带请求头 X-NLS-Token。
// - token：经 REST CreateToken（AccessKeyId/Secret）获取，带 TTL，模块级缓存复用。
// - 控制帧（文本 JSON）：StartTranscription / StopTranscription。
// - 音频帧：重采样到 16k 的 16-bit PCM 二进制帧。
// - 结果帧：TranscriptionResultChanged（interim）/ SentenceEnd（final）/ TranscriptionClosed（结束）。
//
// 可测试性：WebSocket 与 fetch 均可注入（WebSocketCtor / fetchImpl），单测不连真端点。
// 用 Node 22 全局 WebSocket（undici 实现，构造函数支持 headers 选项），无新增依赖。

import { LinearResampler } from './asrResample'
import type { StreamingAsr, AsrChunk } from './asrStream'

export interface AliyunStreamAsrOptions {
  appKey: string
  accessKeyId: string
  accessKeySecret: string
  region?: string
  inSampleRate: number          // 浏览器采集率（audioCtx.sampleRate，通常 44100/48000）
  outSampleRate?: number        // 厂商要求（默认 16000）
  WebSocketCtor?: any           // 注入用（测试）
  fetchImpl?: any               // 注入用（测试）
  tokenUrl?: string             // 注入用（测试）
}

// token 缓存（模块级，同进程多连接复用，避免每轮重新申请）
let cachedToken: { id: string; expireAt: number } | null = null

function rid(): string {
  const c: any = (globalThis as any).crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// 把 16-bit 小端 PCM 的 Buffer 安全转为 Int16Array（逐样本读，避免子缓冲对齐问题）
function toInt16(b: Buffer): Int16Array {
  const n = Math.floor(b.length / 2)
  const out = new Int16Array(n)
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(i * 2)
  return out
}

export class AliyunStreamAsr implements StreamingAsr {
  private ws: any = null
  private rs: LinearResampler
  private outRate: number
  private region: string
  private pending: (AsrChunk | null)[] = []
  private waiters: ((r: IteratorResult<AsrChunk>) => void)[] = []
  private opened = false
  private opening: Promise<void> | null = null
  private ended = false
  private audioBuffer: Buffer[] = [] // open 之前的音频暂存
  private WebSocketCtor: any
  private fetchImpl: any

  constructor(private opts: AliyunStreamAsrOptions) {
    this.outRate = opts.outSampleRate || 16000
    this.region = opts.region || 'cn-shanghai'
    this.rs = new LinearResampler(opts.inSampleRate, this.outRate)
    this.WebSocketCtor = opts.WebSocketCtor || (globalThis as any).WebSocket
    this.fetchImpl = opts.fetchImpl || (globalThis as any).fetch
  }

  // ---- 异步迭代（interim/final + 终止）----
  private enqueue(v: AsrChunk | null) {
    this.pending.push(v)
    this.drain()
  }
  private drain() {
    while (this.waiters.length && this.pending.length) {
      const resolve = this.waiters.shift()!
      const v = this.pending.shift()!
      resolve(v === null ? { done: true, value: undefined } : { done: false, value: v })
    }
  }
  next(): Promise<IteratorResult<AsrChunk>> {
    if (this.pending.length) {
      const v = this.pending.shift()!
      return Promise.resolve(v === null ? { done: true, value: undefined } : { done: false, value: v })
    }
    return new Promise((resolve) => this.waiters.push(resolve))
  }
  [Symbol.asyncIterator]() { return this }

  // ---- token ----
  private async ensureToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    if (cachedToken && cachedToken.expireAt > now + 60) return cachedToken.id
    const url = this.opts.tokenUrl || 'https://nls-meta.cn-shanghai.aliyuncs.com/'
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        AccessKeyId: this.opts.accessKeyId,
        AccessKeySecret: this.opts.accessKeySecret,
        Action: 'CreateToken',
        Version: '2019-02-28'
      }
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`阿里云 ASR token 获取失败 ${res.status}: ${t.slice(0, 200)}`)
    }
    const json = await res.json().catch(() => ({}))
    const token = json?.Token?.Id
    const expire = json?.Token?.ExpireTime
    if (!token) throw new Error('阿里云 ASR token 返回为空')
    cachedToken = { id: token, expireAt: typeof expire === 'number' ? expire : now + 2 * 3600 }
    return token
  }

  // ---- 连接 + start ----
  private async ensureOpen(): Promise<void> {
    if (this.opened) return
    if (this.opening) return this.opening
    this.opening = (async () => {
      const token = await this.ensureToken()
      const url = `wss://nls-gateway-${this.region}.aliyuncs.com/ws/v1?appkey=${encodeURIComponent(this.opts.appKey)}`
      const ws: any = new this.WebSocketCtor(url, {
        headers: { 'X-NLS-Token': token, 'Content-Type': 'application/json' }
      })
      this.ws = ws
      ws.onmessage = (ev: any) => this.onMessage(ev)
      ws.onerror = (ev: any) => this.onFatal(ev)
      ws.onclose = () => this.onClosed()
      await new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('阿里云 ASR WS 连接超时')), 10000)
        ws.addEventListener('open', () => { clearTimeout(to); resolve() })
        ws.addEventListener('error', (e: any) => { clearTimeout(to); reject(new Error('阿里云 ASR WS 连接错误: ' + (e?.message || 'unknown'))) })
      })
      this.opened = true
      this.sendStart()
      for (const b of this.audioBuffer) this.sendAudio(b)
      this.audioBuffer = []
    })()
    return this.opening
  }

  private sendStart() {
    const frame = {
      header: {
        message_id: rid(),
        task_id: rid(),
        namespace: 'SpeechTranscriber',
        name: 'StartTranscription',
        appkey: this.opts.appKey,
        status: 20000000
      },
      payload: {
        format: 'pcm',
        sample_rate: this.outRate,
        enable_intermediate_result: true,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true
      }
    }
    this.ws.send(JSON.stringify(frame))
  }

  private sendAudio(buf: Buffer) {
    if (!this.ws || this.ws.readyState !== 1) return
    this.ws.send(buf)
  }

  // ---- StreamingAsr 接口 ----
  push(chunk: Buffer) {
    if (this.ended) return
    const rs = this.rs.process(toInt16(chunk))
    if (!rs.length) return
    const out = Buffer.from(rs)
    if (!this.opened) {
      this.audioBuffer.push(out)
      if (!this.opening) this.ensureOpen().catch((e) => this.onFatal(e))
      return
    }
    this.sendAudio(out)
  }

  private onMessage(ev: any) {
    const data = ev?.data
    if (typeof data !== 'string') return // 二进制帧是音频回执，忽略
    let msg: any
    try { msg = JSON.parse(data) } catch { return }
    const name = msg?.header?.name
    const payload = msg?.payload || {}
    if (name === 'TranscriptionResultChanged') {
      const text = (payload.result || '').toString()
      if (text) this.enqueue({ text, isFinal: false })
    } else if (name === 'SentenceEnd') {
      const text = (payload.result || '').toString()
      this.enqueue({ text, isFinal: true })
    } else if (name === 'TranscriptionClosed' || name === 'TaskFailed') {
      this.enqueue(null)
    }
    // TranscriptionStarted / TranscriptionCompleted 忽略
  }

  private onClosed() { this.enqueue(null) }
  private onFatal(_e: any) { this.enqueue(null) } // 连接失败：结束迭代，绝不发假稿

  end() {
    if (this.ended) return
    this.ended = true
    if (!this.opened || !this.ws) { this.enqueue(null); return }
    const frame = {
      header: {
        message_id: rid(),
        task_id: rid(),
        namespace: 'SpeechTranscriber',
        name: 'StopTranscription',
        appkey: this.opts.appKey,
        status: 20000000
      },
      payload: {}
    }
    try { this.ws.send(JSON.stringify(frame)) } catch { /* ignore */ }
    if (this.ws.readyState >= 2) this.enqueue(null) // 已关闭则直接结束
  }
}

// 供 asrStream.ts 工厂按 env 构造（读取 ALIYUN_* 变量）。
export function createAliyunStreamAsr(inSampleRate: number): AliyunStreamAsr {
  return new AliyunStreamAsr({
    appKey: process.env.ALIYUN_ASR_APP_KEY || '',
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    region: process.env.ALIYUN_ASR_REGION || 'cn-shanghai',
    inSampleRate
  })
}
