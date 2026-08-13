import { describe, it, expect, beforeAll } from 'vitest'
import { getAsr, asrEnabled, OpenAiWhisperProvider } from '../server/utils/asr'

describe('ASR 可插拔工厂', () => {
  beforeAll(() => { process.env.ASR_PROVIDER = 'mock' })

  it('mock provider 转写返回非空文本', async () => {
    const p = getAsr()
    expect(p.name).toBe('mock')
    const r = await p.transcribe(Buffer.from('dummy-audio'), { contentType: 'audio/webm' })
    expect(typeof r.text).toBe('string')
    expect(r.text.length).toBeGreaterThan(0)
  })

  it('ASR_PROVIDER=mock 时 asrEnabled 为 true', () => {
    expect(asrEnabled()).toBe(true)
  })
})

describe('OpenAI Whisper provider 降级', () => {
  it('未配置 ASR_API_KEY 时 transcribe 抛出「未配置」', async () => {
    delete process.env.ASR_API_KEY
    delete process.env.ASR_PROVIDER
    const p = new OpenAiWhisperProvider()
    await expect(p.transcribe(Buffer.from('x'), { contentType: 'audio/webm' })).rejects.toThrow(/未配置/)
  })

  it('未配置 key 时 asrEnabled 为 false', () => {
    delete process.env.ASR_API_KEY
    delete process.env.ASR_PROVIDER
    expect(asrEnabled()).toBe(false)
  })
})
