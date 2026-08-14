import { describe, it, expect } from 'vitest'
import { MockStreamAsr, getStreamAsr } from '../server/utils/asrStream'

describe('MockStreamAsr 确定性流式', () => {
  it('push 产出 interim，end 产出 final，之后迭代结束', async () => {
    const asr = new MockStreamAsr()
    const out = []
    asr.push(Buffer.from('a'))
    asr.push(Buffer.from('b'))
    asr.end()
    for await (const c of asr) out.push(c)

    const interims = out.filter((c) => !c.isFinal)
    const finals = out.filter((c) => c.isFinal)
    expect(interims.length).toBe(2) // 每块一个 interim 进度
    expect(interims[0].text).toContain('识别中 1')
    expect(interims[1].text).toContain('识别中 2')
    expect(finals.length).toBe(1)
    expect(finals[0].text).toBe('这是一段模拟的语音识别结果。')
  })

  it('可注入自定义 finalText', async () => {
    const asr = new MockStreamAsr({ finalText: '自定义结果。' })
    asr.push(Buffer.from('x'))
    asr.end()
    const collected = []
    for await (const c of asr) collected.push(c)
    const final = collected.find((c) => c.isFinal)
    expect(final.text).toBe('自定义结果。')
  })

  it('end 幂等：多次 end 不重复产出 final', async () => {
    const asr = new MockStreamAsr({ finalText: 'R。' })
    asr.end()
    asr.end()
    asr.end()
    const collected = []
    for await (const c of asr) collected.push(c)
    expect(collected.filter((c) => c.isFinal).length).toBe(1)
  })
})

describe('getStreamAsr 工厂', () => {
  it('无厂商 + 非生产 → 返回 MockStreamAsr 工厂（开发与测试默认）', () => {
    const saved = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    delete process.env.ASR_API_KEY
    delete process.env.ASR_MOCK
    try {
      const f = getStreamAsr()
      expect(f).not.toBeNull()
      expect(typeof f.create).toBe('function')
      expect(f.create()).toBeInstanceOf(MockStreamAsr)
    } finally {
      process.env.NODE_ENV = saved
    }
  })

  it('ASR_MOCK=1 强制 MockStreamAsr', () => {
    delete process.env.ASR_API_KEY
    process.env.ASR_MOCK = '1'
    try {
      expect(getStreamAsr()).not.toBeNull()
    } finally {
      delete process.env.ASR_MOCK
    }
  })

  it('生产环境无厂商 → null（客户端降级文字输入，不发假稿）', () => {
    const saved = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    delete process.env.ASR_API_KEY
    try {
      expect(getStreamAsr()).toBeNull()
    } finally {
      process.env.NODE_ENV = saved
    }
  })

  it('ASR_PROVIDER=aliyun 但缺 ALIYUN_* 凭证 → null（干净降级，不发假稿）', () => {
    const saved = process.env.NODE_ENV
    const savedKey = process.env.ASR_API_KEY
    process.env.NODE_ENV = 'test'
    delete process.env.ASR_API_KEY
    process.env.ASR_PROVIDER = 'aliyun'
    try {
      expect(getStreamAsr()).toBeNull()
    } finally {
      delete process.env.ASR_PROVIDER
      if (savedKey === undefined) delete process.env.ASR_API_KEY
      else process.env.ASR_API_KEY = savedKey
      process.env.NODE_ENV = saved
    }
  })

  it('仅配置 ASR_API_KEY（无流式 provider）→ 开发默认返回 MockStreamAsr（不降级为 null）', () => {
    const saved = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    process.env.ASR_API_KEY = 'fake'
    delete process.env.ASR_PROVIDER
    try {
      const f = getStreamAsr()
      expect(f).not.toBeNull()
      expect(f.create()).toBeInstanceOf(MockStreamAsr)
    } finally {
      delete process.env.ASR_API_KEY
      process.env.NODE_ENV = saved
    }
  })
})
