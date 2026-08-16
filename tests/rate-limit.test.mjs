import { describe, it, expect } from 'vitest'
import { rateLimit } from '../server/utils/security'

// A5 / P1#5 接口限流：基于内存滑动窗口，纯函数验证（端点已在各 handler 内调用 rateLimit）。
describe('A5/P1#5 接口限流 rateLimit', () => {
  it('超过阈值后返回 ok:false 并带 retryAfter', () => {
    const scope = 'test-burst'
    const key = 'u_' + Date.now() + '_' + Math.random()
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(scope, key, 5, 60_000).ok).toBe(true)
    }
    const over = rateLimit(scope, key, 5, 60_000)
    expect(over.ok).toBe(false)
    expect(over.retryAfter).toBeGreaterThan(0)
  })

  it('不同 scope/key 互不干扰', () => {
    const k1 = 'u_' + Date.now() + '_a'
    const k2 = 'u_' + Date.now() + '_b'
    rateLimit('test-iso', k1, 1, 60_000)
    expect(rateLimit('test-iso', k2, 1, 60_000).ok).toBe(true) // 不同 key 不受影响
    expect(rateLimit('test-iso', k1, 1, 60_000).ok).toBe(false) // 同 key 触发拒绝
  })

  it('窗口过期后允许再次请求', async () => {
    const scope = 'test-reset'
    const key = 'k_' + Date.now() + '_' + Math.random()
    expect(rateLimit(scope, key, 1, 1).ok).toBe(true) // 第 1 次放行
    expect(rateLimit(scope, key, 1, 1).ok).toBe(false) // 超阈值拒绝
    await new Promise((r) => setTimeout(r, 5)) // 等待 1ms 窗口过期
    expect(rateLimit(scope, key, 1, 1).ok).toBe(true) // 重置后再次放行
  })
})
