import { describe, it, expect } from 'vitest'
import { getLlm, llmEnabled } from '../server/utils/llm'

// 不联网：仅验证客户端装配与“无密钥即报错”的失败快速路径
describe('llm 子系统（决策 #2：Deepseek）', () => {
  it('getLlm 返回带 chat 方法的客户端', () => {
    const c = getLlm()
    expect(typeof c.chat).toBe('function')
    expect(typeof c.model).toBe('string')
    expect(c.model.length).toBeGreaterThan(0)
  })
  it('llmEnabled 与实际环境变量一致', () => {
    expect(llmEnabled()).toBe(!!process.env.DEEPSEEK_API_KEY)
  })
  it('无密钥调用 chat 应抛“未配置”而非静默（临时摘除 env 模拟）', async () => {
    const saved = process.env.DEEPSEEK_API_KEY
    delete process.env.DEEPSEEK_API_KEY
    try {
      await expect(getLlm().chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(/未配置/)
    } finally {
      if (saved !== undefined) process.env.DEEPSEEK_API_KEY = saved
    }
  })
})
