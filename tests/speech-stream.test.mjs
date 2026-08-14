import { describe, it, expect } from 'vitest'

// 离线测试：mock provider，验证 splitSentences 切分与 synthesizeStream 按句产出合法 WAV
process.env.TTS_PROVIDER = 'mock'
const { getTts, splitSentences } = await import('../server/utils/speech')

describe('speech synthesizeStream', () => {
  it('splitSentences 按句切分并保留句末标点', () => {
    expect(splitSentences('你好。世界！这是第三句？')).toEqual(['你好。', '世界！', '这是第三句？'])
  })

  it('splitSentences 无句末标点时整体作为一句', () => {
    expect(splitSentences('没有标点的一句话')).toEqual(['没有标点的一句话'])
  })

  it('synthesizeStream 按句产出合法 WAV 块', async () => {
    const chunks = []
    for await (const c of getTts().synthesizeStream('你好。世界！')) {
      chunks.push(c)
    }
    expect(chunks.length).toBe(2)
    for (const c of chunks) {
      expect(c.mime).toBe('audio/wav')
      expect(c.chunk.slice(0, 4).toString('ascii')).toBe('RIFF')
      expect(c.chunk.slice(8, 12).toString('ascii')).toBe('WAVE')
    }
  })

  it('synthesizeStream 单句时产出单个块', async () => {
    const chunks = []
    for await (const c of getTts().synthesizeStream('只有一句')) {
      chunks.push(c)
    }
    expect(chunks.length).toBe(1)
    expect(chunks[0].chunk.slice(0, 4).toString('ascii')).toBe('RIFF')
  })
})
