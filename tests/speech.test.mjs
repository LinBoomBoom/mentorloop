import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// 离线/测试走 mock provider，避免依赖网络与 edge-tts 包
process.env.TTS_PROVIDER = 'mock'
const { getTts, synthesizeWithCache, ttsCacheKey, TTS_CACHE_DIR } = await import('../server/utils/speech')

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

  it('ttsCacheKey 含 provider 维度，piper/edge/mock 互不命中', () => {
    const text = '题目', voice = 'huayan'
    const kPiper = ttsCacheKey(text, voice, 'piper')
    const kEdge = ttsCacheKey(text, voice, 'edge')
    const kMock = ttsCacheKey(text, voice, 'mock')
    expect(kPiper).not.toBe(kEdge)
    expect(kPiper).not.toBe(kMock)
    expect(kEdge).not.toBe(kMock)
    // 空 provider（旧命名空间）也要与新命名空间区分，避免读旧污染缓存
    expect(ttsCacheKey(text, voice, '')).not.toBe(kPiper)
  })

  it('mock provider 不写磁盘缓存（防生产缓存污染 → 噪音回归）', async () => {
    const dir = TTS_CACHE_DIR
    const before = new Set(fs.existsSync(dir) ? fs.readdirSync(dir) : [])
    const text = '防污染断言题：讲讲 TCP 三次握手。'
    // 测试环境 provider=mock，synthesizeWithCache 必须直接返回且不落盘
    const r = await synthesizeWithCache(text, { cache: true })
    expect(r.mime).toBe('audio/wav')
    const after = new Set(fs.existsSync(dir) ? fs.readdirSync(dir) : [])
    const added = [...after].filter((f) => !before.has(f))
    expect(added).toEqual([])
  })
})
