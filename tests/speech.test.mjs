import { describe, it, expect } from 'vitest'

// 离线/测试走 mock provider，避免依赖网络与 edge-tts 包
process.env.TTS_PROVIDER = 'mock'
const { getTts, synthesizeWithCache } = await import('../server/utils/speech')

describe('speech subsystem', () => {
  it('factory returns mock provider when TTS_PROVIDER=mock', () => {
    expect(getTts().name).toBe('mock')
  })

  it('synthesize produces a valid WAV (RIFF/WAVE header)', async () => {
    const r = await getTts().synthesize('你好，请做一下自我介绍。')
    expect(r.mime).toBe('audio/wav')
    expect(r.audio.slice(0, 4).toString('ascii')).toBe('RIFF')
    expect(r.audio.slice(8, 12).toString('ascii')).toBe('WAVE')
  })

  it('synthesizeWithCache returns identical bytes on repeat (cached)', async () => {
    const text = '缓存测试题目：讲讲事件循环。'
    const a = await synthesizeWithCache(text, { cache: true })
    const b = await synthesizeWithCache(text, { cache: true })
    expect(Buffer.compare(a.audio, b.audio)).toBe(0)
  })

  it('cache=false always re-synthesizes (deterministic mock → same bytes)', async () => {
    const text = '不缓存题目：讲讲闭包。'
    const a = await synthesizeWithCache(text, { cache: false })
    const b = await synthesizeWithCache(text, { cache: false })
    expect(Buffer.compare(a.audio, b.audio)).toBe(0)
  })
})
