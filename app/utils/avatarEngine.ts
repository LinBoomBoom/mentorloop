// DiceBear v9 本地头像引擎
// 零外网、零图片资源；SSR 友好（同步）；可单测。
//
// 关键：DiceBear 在 backgroundType:'solid' 模式下会退化为极简图标（不依赖 seed），
// 因此我们不传 backgroundType，让底图为透明，再由外层组件用 CSS 画底板。
//
// 三种"好看的二次元人物"风格覆盖三种声音：
//   lorelei       — 温柔女（华嫣）
//   personas      — 活力女/职业风（小雅）
//   openPeeps     — 可爱插画人物（朝文）

import { createAvatar } from '@dicebear/core'
import { lorelei, personas, openPeeps } from '@dicebear/collection'

export type AvatarStyle = 'lorelei' | 'personas' | 'openPeeps'

export interface AvatarOptions {
  /** 种子（不同 seed → 不同脸） */
  seed: string
  /** 风格 */
  style: AvatarStyle
  /** 圆角（0..50 对应 viewBox 比例），默认 50（完全圆角矩形） */
  radius?: number
}

export interface AvatarPortraitMeta {
  /** 给 DigitalHuman 的 portraitId，传给调用方 */
  portraitId: string
  /** 头像 SVG 字符串 */
  svg: string
  /** viewBox（用来定位嘴部光斑） */
  viewBox: { x: number; y: number; w: number; h: number }
}

/** 各风格嘴部中心位置（基于 viewBox 0..1 归一化坐标）。 */
export const MOUTH_ANCHORS: Record<AvatarStyle, { x: number; y: number; rx: number; ry: number }> = {
  lorelei:   { x: 0.5, y: 0.71, rx: 0.05,  ry: 0.012 },
  personas:  { x: 0.5, y: 0.66, rx: 0.06,  ry: 0.014 },
  openPeeps: { x: 0.5, y: 0.62, rx: 0.08,  ry: 0.018 }
}

/** voiceId -> { seed, style }。seed 不重复且稳定，方便 SSR 缓存命中。 */
export const VOICE_PORTRAITS: Record<string, { seed: string; style: AvatarStyle; gender: 'female' | 'male' }> = {
  huayan:  { seed: 'huayan-ml-01',  style: 'lorelei',   gender: 'female' },
  xiao_ya: { seed: 'xiao-ya-ml-02', style: 'personas',  gender: 'female' },
  chaowen: { seed: 'chaowen-ml-03', style: 'openPeeps', gender: 'male' }
}

const STYLE_FN: Record<AvatarStyle, any> = { lorelei, personas, openPeeps }

function extractViewBox(svg: string): { x: number; y: number; w: number; h: number } {
  const m = svg.match(/viewBox="([^"]+)"/)
  if (m) {
    const parts = m[1].split(/\s+/).map(Number)
    if (parts.length === 4 && parts.every(n => Number.isFinite(n))) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
    }
  }
  return { x: 0, y: 0, w: 980, h: 980 }
}

/**
 * 渲染一张头像（同步、SSR 友好）。
 * 透明背景：外层用 CSS 画底板。
 */
export function renderAvatar(opts: AvatarOptions): AvatarPortraitMeta {
  const styleFn = STYLE_FN[opts.style]
  // 故意不传 backgroundType：DiceBear v9 在 'solid' 模式下会忽略 seed、输出固定图标。
  const svg = createAvatar(styleFn, {
    seed: opts.seed,
    radius: opts.radius ?? 50,
    randomizeMode: 'default'
  }).toString()

  return {
    portraitId: `${opts.style}:${opts.seed}`,
    svg,
    viewBox: extractViewBox(svg)
  }
}

/** 由 voiceId 直接渲染（薄封装）。找不到时回落 lorelei + voiceId 当 seed。 */
export function renderAvatarForVoice(voiceId: string): AvatarPortraitMeta {
  const preset = VOICE_PORTRAITS[voiceId] || { seed: `ml-${voiceId}`, style: 'lorelei' as AvatarStyle, gender: 'female' as const }
  return renderAvatar({ seed: preset.seed, style: preset.style })
}