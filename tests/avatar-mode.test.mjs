// 数字人渲染模式解析（2D/3D 切换 + 回退）单测
// 纯函数 resolveEffectiveAvatarMode 不依赖 WebGL，可在沙箱内验证降级分支。
import { describe, it, expect } from 'vitest'

const { resolveEffectiveAvatarMode } = await import('../app/utils/avatarEngine')

describe('resolveEffectiveAvatarMode', () => {
  it('mode 非 3d 一律回退 2d（区分大小写，仅识别小写 3d）', () => {
    expect(resolveEffectiveAvatarMode('2d')).toBe('2d')
    expect(resolveEffectiveAvatarMode('')).toBe('2d')
    expect(resolveEffectiveAvatarMode('3D')).toBe('2d')
    expect(resolveEffectiveAvatarMode('auto')).toBe('2d')
  })

  it('mode=3d 且存在 VRM URL → 3d', () => {
    expect(resolveEffectiveAvatarMode('3d', { vrmUrl: '/avatars/a.vrm' })).toBe('3d')
    expect(resolveEffectiveAvatarMode('3d', { fallbackVrmUrl: '/avatars/default.vrm' })).toBe('3d')
  })

  it('mode=3d 但无任何 VRM URL → 直接 2d（避免无意义 WebGL 尝试与 404）', () => {
    expect(resolveEffectiveAvatarMode('3d', {})).toBe('2d')
    expect(resolveEffectiveAvatarMode('3d', { vrmUrl: '', fallbackVrmUrl: '' })).toBe('2d')
  })

  it('mode=3d 但 3D 加载失败(vrmFailed) → 回退 2d', () => {
    expect(resolveEffectiveAvatarMode('3d', { vrmUrl: '/a.vrm', vrmFailed: true })).toBe('2d')
    expect(resolveEffectiveAvatarMode('3d', { fallbackVrmUrl: '/default.vrm', vrmFailed: true })).toBe('2d')
  })

  it('显式 vrmUrl 优先于 fallbackVrmUrl', () => {
    expect(resolveEffectiveAvatarMode('3d', { vrmUrl: '/x.vrm', fallbackVrmUrl: '/y.vrm' })).toBe('3d')
  })
})
