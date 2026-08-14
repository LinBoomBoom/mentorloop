// P4 数字人面试官：可插拔的「图 + 音频 → 口型」提供方。
//
// 本期默认 LocalSvgAvatar：纯前端 SVG 渲染，不发起任何服务端请求，零成本、零密钥、离线可用，
// 与「免费层极厚」基调一致。口型由前端 Web Audio 真实 RMS 驱动（见 app/utils/lipSync.ts + app/composables/useLipSync.ts）。
//
// SaaS 厂商（D-ID / HeyGen / 腾讯智影 / 硅基）仅留接口签名 + env 开关，验证业务后再接
// （需 API 密钥与资质，且按分钟计费，不在本期免费范围）。

export type AvatarGender = 'female' | 'male'

export interface DigitalHumanPortrait {
  id: string
  gender: AvatarGender
  label: string
}

export interface DigitalHumanResult {
  // 本地 SVG 方案无视频产物，videoUrl 为空；SaaS 方案返回口型视频 URL
  videoUrl?: string
  provider: 'local' | 'did' | 'heygen' | string
}

export interface DigitalHumanProvider {
  readonly kind: string
  // portrait: 本地方案按 gender 选内置 SVG；SaaS 方案用图片 URL / 上传肖像
  // audioUrl: 本地方案忽略（前端直接播放 + 动画）；SaaS 方案上传音频生成口型视频
  generate(portrait: DigitalHumanPortrait, audioUrl: string): Promise<DigitalHumanResult>
}

// 默认实现：不发起任何服务端请求，数字人完全在前端 SVG 渲染。
export class LocalSvgAvatar implements DigitalHumanProvider {
  readonly kind = 'local'
  async generate(_portrait: DigitalHumanPortrait, _audioUrl: string): Promise<DigitalHumanResult> {
    return { provider: 'local' }
  }
}

// 预留：SaaS 厂商占位（未实现，需密钥）。保留签名便于后续接入，误配时不崩溃而是回退 local。
export class SaaSAvatarProvider implements DigitalHumanProvider {
  readonly kind: string
  constructor(kind: string) {
    this.kind = kind
  }
  async generate(_portrait: DigitalHumanPortrait, _audioUrl: string): Promise<DigitalHumanResult> {
    throw new Error(`Avatar provider "${this.kind}" 未实现：需 API 密钥与资质，当前为 local 方案`)
  }
}

export function getAvatarProvider(): DigitalHumanProvider {
  const kind = (process.env.AVATAR_PROVIDER || 'local').toLowerCase()
  if (!kind || kind === 'local') return new LocalSvgAvatar()
  // 其他厂商暂未实现：统一回退 local 并标注，避免误配导致运行时崩溃
  return new SaaSAvatarProvider(kind)
}

// 供前端下拉选择的数字人肖像（按服务端 Piper 音色的 gender 对齐：华嫣/小雅=女、朝文=男）
export const DIGITAL_HUMAN_PORTRAITS: DigitalHumanPortrait[] = [
  { id: 'huayan', gender: 'female', label: '华嫣 · 温柔知性' },
  { id: 'xiao_ya', gender: 'female', label: '小雅 · 清亮自然' },
  { id: 'chaowen', gender: 'male', label: '朝文 · 沉稳磁性' }
]

export function portraitById(id: string): DigitalHumanPortrait {
  return DIGITAL_HUMAN_PORTRAITS.find((p) => p.id === id) || DIGITAL_HUMAN_PORTRAITS[0]
}
