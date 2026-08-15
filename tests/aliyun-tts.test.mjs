import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 阿里云 DashScope CosyVoice Provider 单测：mock 全局 fetch，断言音色映射 / 取字节 / 错误处理，
// 全程不联网。真实可用性由 scripts/check-aliyun-tts.mjs 在本机跑（需 DASHSCOPE_API_KEY）。
process.env.TTS_PROVIDER = 'aliyun'
process.env.DASHSCOPE_API_KEY = 'sk-test'
const { getTts } = await import('../server/utils/speech')

describe('Aliyun TTS provider', () => {
  let realFetch
  beforeEach(() => { realFetch = globalThis.fetch })
  afterEach(() => { vi.stubGlobal('fetch', realFetch); process.env.DASHSCOPE_API_KEY = 'sk-test' })

  function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
  }
  function wavResponse() {
    // 最小合法 WAV 头 + 一点数据，仅用于验证"拿到字节"
    const buf = Buffer.alloc(44 + 8)
    buf.write('RIFF', 0); buf.write('WAVE', 8)
    return new Response(buf, { status: 200, headers: { 'content-type': 'audio/wav' } })
  }

  it('getTts() 在 TTS_PROVIDER=aliyun 时返回 aliyun provider', () => {
    expect(getTts().name).toBe('aliyun')
  })

  it('huayan 映射到 longxiaochun 并取回音频字节', async () => {
    const provider = getTts()
    const cap = {}
    const fetchMock = vi.fn(async (url, init) => {
      if (String(url).includes('/SpeechSynthesizer')) {
        cap.url = url; cap.body = JSON.parse(init.body)
        cap.auth = init.headers.Authorization
        return jsonResponse({ output: { audio: 'https://dashscope-result.example.com/a.wav' } })
      }
      return wavResponse()
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await provider.synthesize('你好，请做一下自我介绍。', { voice: 'huayan' })
    expect(cap.body.input.voice).toBe('longxiaochun')
    expect(cap.body.model).toBe('cosyvoice-v3-flash')
    expect(cap.body.input.format).toBe('wav')
    expect(cap.auth).toBe('Bearer sk-test')
    expect(r.ext).toBe('wav')
    expect(r.mime).toBe('audio/wav')
    expect(r.audio.length).toBeGreaterThan(44)
    // 第二次 fetch 下载音频 URL
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('xiao_ya→longxiaoxia、chaowen→longwan', async () => {
    const provider = getTts()
    const pairs = [['xiao_ya', 'longxiaoxia'], ['chaowen', 'longwan']]
    for (const [id, expectVoice] of pairs) {
      const cap = {}
      const fetchMock = vi.fn(async (url, init) => {
        if (String(url).includes('/SpeechSynthesizer')) { cap.body = JSON.parse(init.body); return jsonResponse({ output: { audio: 'https://x/y.wav' } }) }
        return wavResponse()
      })
      vi.stubGlobal('fetch', fetchMock)
      await provider.synthesize('测试', { voice: id })
      expect(cap.body.input.voice).toBe(expectVoice)
    }
  })

  it('音频以 base64 内联时直接解码，不二次下载', async () => {
    const provider = getTts()
    const sample = Buffer.from('RIFFwavepayload').toString('base64')
    const fetchMock = vi.fn(async () => jsonResponse({ output: { audio: sample } }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await provider.synthesize('测试', { voice: 'huayan' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(r.audio.toString()).toContain('RIFFwavepayload')
  })

  it('缺 DASHSCOPE_API_KEY 抛清晰错误', async () => {
    const provider = getTts()
    delete process.env.DASHSCOPE_API_KEY
    await expect(provider.synthesize('测试', { voice: 'huayan' }))
      .rejects.toThrow(/DASHSCOPE_API_KEY/)
  })

  it('HTTP 非 200 透出阿里云错误信息', async () => {
    const provider = getTts()
    const fetchMock = vi.fn(async () => jsonResponse({ code: 'InvalidApiKey', message: 'API key invalid' }, 401))
    vi.stubGlobal('fetch', fetchMock)
    await expect(provider.synthesize('测试', { voice: 'huayan' }))
      .rejects.toThrow(/API key invalid/)
  })

  it('返回音频 URL 但下载为空抛错', async () => {
    const provider = getTts()
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/SpeechSynthesizer')) return jsonResponse({ output: { audio: 'https://x/y.wav' } })
      return new Response(Buffer.alloc(0), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(provider.synthesize('测试', { voice: 'huayan' }))
      .rejects.toThrow(/空音频/)
  })
})
