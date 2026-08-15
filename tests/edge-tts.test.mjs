import { describe, it, expect, vi } from 'vitest'

// 隔离 edge-tts 模块，避免真实联网（沙箱无法访问微软端点 → 403）。
// 捕获 tts() 收到的 voice 参数，断言人格 id 已正确映射成微软神经嗓音名。
let captured = null
vi.mock('edge-tts/out/index.js', () => ({
  tts: async (_text, opts) => {
    captured = opts
    // 返回一段最小非空字节，供上层正常返回（不校验内容）
    return Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x01, 0x02, 0x03, 0x04])
  }
}))

// 必须在 import speech 之前设置 provider，使工厂返回 EdgeTtsProvider
process.env.TTS_PROVIDER = 'edge'
const { synthesizeWithCache, getTtsProviderName } = await import('../server/utils/speech')

describe('Edge TTS 音色映射', () => {
  it('当前 provider 为 edge', () => {
    expect(getTtsProviderName()).toBe('edge')
  })

  it('huayan → zh-CN-XiaoxiaoNeural（女·温柔知性）', async () => {
    captured = null
    await synthesizeWithCache('你好', { voice: 'huayan', cache: false })
    expect(captured.voice).toBe('zh-CN-XiaoxiaoNeural')
  })

  it('xiao_ya → zh-CN-XiaoyiNeural（女·清亮自然，区别于 Xiaoxiao）', async () => {
    captured = null
    await synthesizeWithCache('你好', { voice: 'xiao_ya', cache: false })
    expect(captured.voice).toBe('zh-CN-XiaoyiNeural')
  })

  it('chaowen → zh-CN-YunyangNeural（男·沉稳磁性）', async () => {
    captured = null
    await synthesizeWithCache('你好', { voice: 'chaowen', cache: false })
    expect(captured.voice).toBe('zh-CN-YunyangNeural')
  })

  it('未知人格 id 回退默认嗓音（XiaoxiaoNeural）', async () => {
    captured = null
    await synthesizeWithCache('你好', { voice: 'unknown_id', cache: false })
    expect(captured.voice).toBe('zh-CN-XiaoxiaoNeural')
  })

  it('直接传 Neural 名时原样透传（调试用）', async () => {
    captured = null
    await synthesizeWithCache('你好', { voice: 'zh-CN-YunxiNeural', cache: false })
    expect(captured.voice).toBe('zh-CN-YunxiNeural')
  })
})
