import { describe, it, expect } from 'vitest'
import { collectHealth } from '../server/utils/health'

describe('collectHealth (C6 组件级健康)', () => {
  it('返回结构化健康报告，含组件级状态', () => {
    const h = collectHealth()
    expect(['ok', 'degraded']).toContain(h.status)
    expect(h.components).toHaveProperty('db')
    expect(h.components).toHaveProperty('tts')
    expect(['ready', 'missing']).toContain(h.components.tts)
    expect(typeof h.components.diskFreePct).toBe('number')
    expect(h.memory).toHaveProperty('rssMb')
    expect(typeof h.uptime).toBe('number')
  })
})
