import { describe, it, expect } from 'vitest'

// 口型映射纯函数（与前端 Web Audio RMS 解耦，便于无浏览器单测）
const { rmsToMouth, smoothMouth, MOUTH_OPEN_THRESHOLD, MOUTH_OPEN_FULL } = await import('../app/utils/lipSync')

describe('rmsToMouth', () => {
  it('静音（0 / 负值 / 非有限）映射为 0', () => {
    expect(rmsToMouth(0)).toBe(0)
    expect(rmsToMouth(-0.1)).toBe(0)
    expect(rmsToMouth(NaN)).toBe(0)
  })

  it('低于阈值映射为 0（闭嘴）', () => {
    expect(rmsToMouth(MOUTH_OPEN_THRESHOLD - 0.001)).toBe(0)
  })

  it('达到 FULL 阈值映射为 1（完全开口）', () => {
    expect(rmsToMouth(MOUTH_OPEN_FULL)).toBe(1)
  })

  it('中间值线性映射并收敛到 [0,1]', () => {
    const mid = (MOUTH_OPEN_THRESHOLD + MOUTH_OPEN_FULL) / 2
    const m = rmsToMouth(mid)
    expect(m).toBeGreaterThan(0)
    expect(m).toBeLessThan(1)
    // 明显高于 FULL 的值被钳制到 1
    expect(rmsToMouth(MOUTH_OPEN_FULL * 3)).toBe(1)
  })
})

describe('smoothMouth', () => {
  it('attack 比 release 快：上升一步幅度 > 下降同幅', () => {
    const up = smoothMouth(0, 1, 0.45, 0.18) // 0 -> 1
    const down = smoothMouth(1, 0, 0.45, 0.18) // 1 -> 0
    expect(up).toBeGreaterThan(-down) // up 为正且幅度 > |down|
  })

  it('钳制到 [0,1]', () => {
    expect(smoothMouth(0.9, 1, 0.9, 0.9)).toBeLessThanOrEqual(1)
    expect(smoothMouth(0.1, 0, 0.9, 0.9)).toBeGreaterThanOrEqual(0)
  })
})
