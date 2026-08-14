import { describe, it, expect, vi } from 'vitest'
import { AliyunStreamAsr } from '../server/utils/asrStreamVendor'

// ---- 测试替身：可注入的 WebSocket 与 fetch（不连真端点） ----
function makeFakeWs() {
  const instances = []
  class FakeWs {
    constructor(url, opts) {
      this.url = url
      this.opts = opts
      this.readyState = 0
      this.binaryType = ''
      this.sent = []
      this.onopen = null
      this.onmessage = null
      this.onerror = null
      this.onclose = null
      this._open = null
      this._err = null
      instances.push(this)
    }
    send(data) { this.sent.push(data) }
    close() { this.readyState = 3; this.onclose && this.onclose() }
    addEventListener(type, cb) {
      if (type === 'open') this._open = cb
      else if (type === 'error') this._err = cb
    }
    __open() { this.readyState = 1; this.onopen && this.onopen(); this._open && this._open() }
    __msg(obj) { this.onmessage && this.onmessage({ data: JSON.stringify(obj) }) }
    __close() { this.readyState = 3; this.onclose && this.onclose() }
    __error(e) { this.onerror && this.onerror(e); this._err && this._err(e) }
  }
  return { FakeWs, getInstances: () => instances }
}

function makeFakeFetch(ok = true) {
  let calls = 0
  const impl = async () => {
    calls++
    if (!ok) return { ok: false, status: 401, text: async () => 'unauthorized', json: async () => ({}) }
    return {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ Token: { Id: 'tok-' + calls, ExpireTime: Math.floor(Date.now() / 1000) + 7200 } })
    }
  }
  return { impl, calls: () => calls }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

// 4410 样本（100ms@44100）的 16-bit PCM，确保重采样后有非空前块
function pcmBuf() {
  const arr = new Int16Array(4410)
  for (let i = 0; i < arr.length; i++) arr[i] = ((i * 11) % 2000) - 1000
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
}

describe('AliyunStreamAsr', () => {
  it('push→open：发送 start(16k pcm) + 缓冲音频作为二进制帧', async () => {
    const { FakeWs, getInstances } = makeFakeWs()
    const fetchMock = makeFakeFetch()
    const asr = new AliyunStreamAsr({
      appKey: 'ak', accessKeyId: 'id', accessKeySecret: 'sec', inSampleRate: 44100,
      WebSocketCtor: FakeWs, fetchImpl: fetchMock.impl
    })
    asr[Symbol.asyncIterator]()
    asr.push(pcmBuf())
    await tick()
    const ws = getInstances()[0]
    expect(ws).toBeTruthy()
    ws.__open()
    await tick()
    expect(ws.sent.length).toBeGreaterThanOrEqual(2)
    const start = JSON.parse(ws.sent[0])
    expect(start.header.name).toBe('StartTranscription')
    expect(start.payload.format).toBe('pcm')
    expect(start.payload.sample_rate).toBe(16000)
    expect(Buffer.isBuffer(ws.sent[1])).toBe(true) // 音频二进制帧
  })

  it('interim/final 解析 + 结束帧序列正确', async () => {
    const { FakeWs, getInstances } = makeFakeWs()
    const fetchMock = makeFakeFetch()
    const asr = new AliyunStreamAsr({
      appKey: 'ak', accessKeyId: 'id', accessKeySecret: 'sec', inSampleRate: 44100,
      WebSocketCtor: FakeWs, fetchImpl: fetchMock.impl
    })
    const it = asr[Symbol.asyncIterator]()
    asr.push(pcmBuf())
    await tick()
    const ws = getInstances()[0]
    ws.__open()
    await tick()

    ws.__msg({ header: { name: 'TranscriptionResultChanged' }, payload: { result: '你好' } })
    const r1 = await it.next()
    expect(r1.done).toBe(false)
    expect(r1.value).toEqual({ text: '你好', isFinal: false })

    ws.__msg({ header: { name: 'SentenceEnd' }, payload: { result: '你好世界' } })
    const r2 = await it.next()
    expect(r2.value).toEqual({ text: '你好世界', isFinal: true })

    asr.end()
    const last = JSON.parse(ws.sent[ws.sent.length - 1])
    expect(last.header.name).toBe('StopTranscription')
    ws.__msg({ header: { name: 'TranscriptionClosed' } })
    const r3 = await it.next()
    expect(r3.done).toBe(true)
  })

  it('token 经 fetch 获取，且模块级缓存复用（两次连接仅取一次）', async () => {
    // 用全新模块实例，避免被本文件其它测试的模块级 token 缓存污染
    vi.resetModules()
    const mod = await import('../server/utils/asrStreamVendor')
    const { FakeWs, getInstances } = makeFakeWs()
    const fetchMock = makeFakeFetch()
    const a1 = new mod.AliyunStreamAsr({ appKey: 'ak', accessKeyId: 'id', accessKeySecret: 'sec', inSampleRate: 44100, WebSocketCtor: FakeWs, fetchImpl: fetchMock.impl })
    a1[Symbol.asyncIterator]()
    a1.push(pcmBuf())
    await tick(); getInstances()[0].__open(); await tick()
    expect(fetchMock.calls()).toBe(1)

    const a2 = new mod.AliyunStreamAsr({ appKey: 'ak', accessKeyId: 'id', accessKeySecret: 'sec', inSampleRate: 44100, WebSocketCtor: FakeWs, fetchImpl: fetchMock.impl })
    a2[Symbol.asyncIterator]()
    a2.push(pcmBuf())
    await tick(); getInstances()[1].__open(); await tick()
    expect(fetchMock.calls()).toBe(1) // 缓存命中，不再取 token
  })

  it('token 获取失败 → 迭代安全结束（不卡死、不发假稿）', async () => {
    const { FakeWs } = makeFakeWs()
    const fetchMock = makeFakeFetch(false)
    const asr = new AliyunStreamAsr({ appKey: 'ak', accessKeyId: 'id', accessKeySecret: 'sec', inSampleRate: 44100, WebSocketCtor: FakeWs, fetchImpl: fetchMock.impl })
    const it = asr[Symbol.asyncIterator]()
    asr.push(pcmBuf())
    const r = await it.next()
    expect(r.done).toBe(true)
  })

  it('48000 输入：start 帧仍为 16000（重采样契约）', async () => {
    const { FakeWs, getInstances } = makeFakeWs()
    const fetchMock = makeFakeFetch()
    const asr = new AliyunStreamAsr({ appKey: 'ak', accessKeyId: 'id', accessKeySecret: 'sec', inSampleRate: 48000, WebSocketCtor: FakeWs, fetchImpl: fetchMock.impl })
    asr[Symbol.asyncIterator]()
    const arr = new Int16Array(4800); for (let i = 0; i < arr.length; i++) arr[i] = ((i * 7) % 1500) - 750
    asr.push(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength))
    await tick(); getInstances()[0].__open(); await tick()
    const start = JSON.parse(getInstances()[0].sent[0])
    expect(start.payload.sample_rate).toBe(16000)
  })
})
