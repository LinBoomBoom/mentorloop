// P4 口型映射（纯函数，无 DOM 依赖，可在 node/vitest 单测）：
// 把 Web Audio 取到的 RMS（0..1 振幅）映射为嘴部开合度 mouthOpen（0..1）。
//
// 真实音频 RMS 通常很小（人声 ≈ 0.02~0.25），用阈值 + 线性做「开口即明显、静音即闭合」的观感。

export const MOUTH_OPEN_THRESHOLD = 0.015 // 低于此视为静音（闭嘴）
export const MOUTH_OPEN_FULL = 0.22 // 达到此 RMS 即视为完全开口

// 原始映射（无状态）。返回 0..1，供调用方做指数平滑避免抖动。
export function rmsToMouth(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) return 0
  if (rms <= MOUTH_OPEN_THRESHOLD) return 0
  const span = MOUTH_OPEN_FULL - MOUTH_OPEN_THRESHOLD
  const t = (rms - MOUTH_OPEN_THRESHOLD) / span
  return Math.max(0, Math.min(1, t))
}

// 指数平滑：attack 快（开口）、release 慢（闭嘴），避免嘴部高频抖动。
// 返回新的平滑值；prev 为上一帧 mouthOpen，target 为 rmsToMouth 结果。
export function smoothMouth(prev: number, target: number, attack = 0.45, release = 0.18): number {
  const k = target > prev ? attack : release
  const next = prev + (target - prev) * k
  return Math.max(0, Math.min(1, next))
}
