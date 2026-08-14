// DiceBear 头像引擎单测
// SSR 同步、纯函数、稳定、可注入。
import { describe, it, expect } from 'vitest'

const {
  renderAvatar,
  renderAvatarForVoice,
  VOICE_PORTRAITS,
  MOUTH_ANCHORS
} = await import('../app/utils/avatarEngine')

const STYLES = ['lorelei', 'personas', 'openPeeps']

describe('avatarEngine', () => {
  it('lorelei/personas/openPeeps 三个 style 都能渲染 SVG', () => {
    for (const style of STYLES) {
      const out = renderAvatar({ seed: 'test-seed', style })
      expect(out.svg).toMatch(/^<svg /)
      expect(out.svg).toMatch(/viewBox=/)
      expect(out.viewBox.w).toBeGreaterThan(0)
      expect(out.viewBox.h).toBeGreaterThan(0)
    }
  })

  it('同 seed 同 style 输出严格一致（SSR 缓存命中）', () => {
    for (const style of STYLES) {
      const a = renderAvatar({ seed: 'x', style })
      const b = renderAvatar({ seed: 'x', style })
      expect(a.svg).toBe(b.svg)
      expect(a.portraitId).toBe(b.portraitId)
    }
  })

  it('不同 seed 输出不同（关键：DiceBear 默认不传 backgroundType 才个性化）', () => {
    for (const style of STYLES) {
      const a = renderAvatar({ seed: 'x', style })
      const b = renderAvatar({ seed: 'y', style })
      expect(a.svg).not.toBe(b.svg)
      expect(a.portraitId).not.toBe(b.portraitId)
    }
  })

  it('SVG 大小合理（lorelei < 8KB、personas < 5KB、openPeeps < 15KB）', () => {
    const budgets = { lorelei: 8192, personas: 5120, openPeeps: 15360 }
    for (const style of STYLES) {
      const out = renderAvatar({ seed: 's', style })
      expect(out.svg.length).toBeLessThan(budgets[style])
    }
  })

  it('renderAvatarForVoice 按 voiceId 派发 portrait', () => {
    for (const vid of ['huayan', 'xiao_ya', 'chaowen']) {
      const out = renderAvatarForVoice(vid)
      expect(out.svg).toMatch(/^<svg /)
      expect(out.portraitId).toContain(VOICE_PORTRAITS[vid].style)
      expect(out.portraitId).toContain(VOICE_PORTRAITS[vid].seed)
    }
  })

  it('未知 voiceId 回落 lorelei + voiceId 当 seed', () => {
    const out = renderAvatarForVoice('totally-unknown')
    expect(out.svg).toMatch(/^<svg /)
    expect(out.portraitId.startsWith('lorelei:')).toBe(true)
    expect(out.portraitId).toContain('totally-unknown')
  })

  it('VOICE_PORTRAITS 覆盖三个 Piper 真实音色', () => {
    expect(VOICE_PORTRAITS.huayan).toBeTruthy()
    expect(VOICE_PORTRAITS.xiao_ya).toBeTruthy()
    expect(VOICE_PORTRAITS.chaowen).toBeTruthy()
    expect(VOICE_PORTRAITS.chaowen.gender).toBe('male')
  })

  it('MOUTH_ANCHORS 三个 style 都定义合理坐标（中心、半径）', () => {
    for (const style of STYLES) {
      const a = MOUTH_ANCHORS[style]
      expect(a.x).toBeGreaterThan(0.3); expect(a.x).toBeLessThan(0.7)
      expect(a.y).toBeGreaterThan(0.5); expect(a.y).toBeLessThan(0.8)
      expect(a.rx).toBeGreaterThan(0); expect(a.ry).toBeGreaterThan(0)
    }
  })
})