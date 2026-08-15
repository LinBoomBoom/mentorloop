<!--
  AI 数字人面试官（统一入口，按 avatarMode 切换渲染器）
  - 2D（默认）：DiceBear 二次元人物（lorelei/personas/openPeeps），透明背景 + CSS 底板 + 嘴型光斑；
  - 3D：本地 three-vrm 加载 VRM 半身像（离线、免密钥、MorphTarget 接现有 RMS 嘴型 + 眨眼）。
  - 3D 加载失败（VRM 缺失 / WebGL 不可用）→ 自动回退 2D，保证面试页永远有可见数字人。

  SSR 注意事项：DiceBear 在浏览器端会 fork Web Worker（blob: URL）做异步渲染优化，
  且 SSR/CSR 节点结构不同 → hydration mismatch。修复：DiceBear 头像层用 <ClientOnly> 包裹。
  3D 的 WebGL 仅客户端可用，故 <VrmAvatar> 也用 <ClientOnly> 包裹，SSR 输出等尺寸占位。
-->
<template>
  <div
    class="relative inline-block select-none"
    :style="{ width: `${sizePx}px`, height: `${sizePx}px` }"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- 圆角底板 + 品牌色光晕 -->
    <div
      class="absolute inset-0 rounded-3xl shadow-sm transition-transform"
      :style="{
        background: palette.gradient,
        transform: `scale(${breathScale})`,
        transformOrigin: 'center'
      }"
    >
      <!-- 顶装饰横线 + 点阵带 -->
      <div class="absolute left-1/2 -translate-x-1/2 top-3 flex items-center gap-1.5" :opacity="0.4">
        <span class="block w-8 h-1 rounded-full" :style="{ background: palette.accent }" />
        <span class="block w-1 h-1 rounded-full" :style="{ background: palette.dot }" />
        <span class="block w-1 h-1 rounded-full" :style="{ background: palette.dot }" />
        <span class="block w-1 h-1 rounded-full" :style="{ background: palette.dot }" />
        <span class="block w-8 h-1 rounded-full" :style="{ background: palette.accent }" />
      </div>
      <!-- 底装饰点（胸像点阵） -->
      <div class="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center gap-1">
        <span v-for="i in 5" :key="i" class="block w-1.5 h-1.5 rounded-full"
          :style="{ background: speaking ? palette.accent : palette.dotDim, opacity: 0.7 }" />
      </div>

      <!-- 3D 本地数字人（three-vrm）；加载失败经 @error 置 vrmFailed → 回退 2D。
           WebGL 仅客户端可用，故用 <ClientOnly> 包裹，SSR 输出等尺寸占位避免 hydration mismatch。 -->
      <ClientOnly v-if="effectiveMode === '3d'">
        <VrmAvatar
          :mouth-open="mouthOpen"
          :speaking="speaking"
          :size="sizePx"
          :vrm-url="vrmUrl || ''"
          @error="onVrmError"
        />
        <template #fallback>
          <div class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span class="block w-12 h-12 rounded-full bg-white/40" />
          </div>
        </template>
      </ClientOnly>

      <!-- DiceBear 二次元头像（2D 默认 / 3D 回退）。透明背景，外层 CSS 控底色。
           SSR 输出等尺寸占位（hydration 友好），客户端 mount 后再插入头像 SVG。
           这样 SSR/CSR 节点结构完全一致，从根本上避免 hydration mismatch。 -->
      <ClientOnly v-else>
        <div
          v-if="avatarSvg"
          class="absolute inset-0 flex items-center justify-center"
          v-html="avatarSvg"
        />
        <div
          v-else
          class="absolute inset-0 flex items-center justify-center animate-pulse"
          aria-hidden="true"
        >
          <span class="text-xs text-brand-coral/60">人像加载中…</span>
        </div>
        <template #fallback>
          <div class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span class="block w-12 h-12 rounded-full bg-white/40" />
          </div>
        </template>
      </ClientOnly>

      <!-- 嘴型光斑（仅 2D；mouthOpen 控制亮度和大小） -->
      <div
        v-show="effectiveMode !== '3d' && mouthOpen > 0.02"
        class="absolute pointer-events-none transition-opacity"
        :style="mouthGlowStyle"
        aria-hidden="true"
      />
    </div>

    <!-- 顶部角标：speaking 时呼吸脉冲 -->
    <span
      class="absolute right-2 top-2 block w-2.5 h-2.5 rounded-full"
      :class="speaking ? 'breath-dot' : ''"
      :style="{ background: speaking ? palette.accent : palette.dotDim }"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import { useRuntimeConfig } from '#imports'
import {
  renderAvatarForVoice,
  resolveEffectiveAvatarMode,
  MOUTH_ANCHORS,
  type AvatarStyle
} from '~/utils/avatarEngine'

const props = withDefaults(defineProps<{
  /** 嘴部张开程度 0..1（由 RMS 驱动） */
  mouthOpen?: number
  /** 是否正在说话（影响整体浮动 / 角标 / 底排点） */
  speaking?: boolean
  /** 性别：决定配色 + 选中风格（female/male） */
  gender?: 'female' | 'male'
  /** 画布尺寸：接受 px 数字或简写（sm=80/md=128/lg=192/xl=240） */
  size?: number | string
  /** 端口 ID（决定 seed）：取 Piper voiceId，如 huayan/xiao_ya/chaowen/默认 */
  portraitId?: string
  /** 3D 模式下加载的 VRM 模型 URL；不传则用运行时配置 avatarVrmUrl */
  vrmUrl?: string
}>(), {
  mouthOpen: 0,
  speaking: false,
  gender: 'female',
  size: 128,
  portraitId: 'huayan',
  vrmUrl: ''
})

/** size 接受 px 数字或 sm/md/lg/xl 简写。 */
const sizePx = computed(() => {
  const s = props.size
  if (typeof s === 'number') return s
  const table: Record<string, number> = { sm: 80, md: 128, lg: 192, xl: 240 }
  return table[String(s)] || 128
})

// 数字人渲染模式（2D/3D）解析：由 runtimeConfig.public.avatarMode 决定；
// 3D 加载失败（VRM 缺失 / WebGL 不可用）时 vrmFailed=true → 回退 2D。
// 纯函数 resolveEffectiveAvatarMode 已单测覆盖（见 tests/avatar-mode.test.mjs）。
const runtime = useRuntimeConfig()
const configMode = computed(() => String((runtime.public && (runtime.public as any).avatarMode) || '2d'))
const configVrmUrl = computed(() => String((runtime.public && (runtime.public as any).avatarVrmUrl) || ''))
const vrmFailed = ref(false)
function onVrmError() { vrmFailed.value = true }
const effectiveMode = computed<'2d' | '3d'>(() =>
  resolveEffectiveAvatarMode(configMode.value, {
    vrmUrl: props.vrmUrl || undefined,
    fallbackVrmUrl: configVrmUrl.value || undefined,
    vrmFailed: vrmFailed.value
  })
)

// 由 portraitId（= voiceId）渲染头像：支持任意音色，稳定且可区分。
// 已知 3 个人格用既定 seed+风格；未知音色按 id 哈希出稳定 seed + 按 gender 选风格。
// 注意：必须用块体箭头（匹配静态防护测试的结构断言）；SSR 下不渲染由外层 <ClientOnly> 兜底。
const portraitMeta = computed(() => {
  return renderAvatarForVoice(props.portraitId, props.gender)
})

const avatarSvg = computed(() => portraitMeta.value.svg)

const mouthAnchor = computed(() => {
  // MOUTH_ANCHORS key 是 AvatarStyle，直接取
  const style = (portraitMeta.value.portraitId.split(':')[0]) as AvatarStyle
  return MOUTH_ANCHORS[style] || MOUTH_ANCHORS.lorelei
})

// 配色：gender 仅决定色系
const palette = computed(() => {
  const female = props.gender !== 'male'
  return female
    ? {
        accent: '#e11d48',
        gradient: 'linear-gradient(160deg, #fff1f3 0%, #fde7eb 55%, #fcd5db 100%)',
        dot: '#e11d48',
        dotDim: '#cbd5e1'
      }
    : {
        accent: '#0ea5b7',
        gradient: 'linear-gradient(160deg, #ecfeff 0%, #cffafe 55%, #a5f3fc 100%)',
        dot: '#0ea5b7',
        dotDim: '#cbd5e1'
      }
})

// 呼吸缩放：缓慢正弦，speaking 时幅度更大
const breathScale = ref(1)
let breathT = 0
let breathRaf = 0
function loop() {
  breathT += 1 / 60
  const amp = props.speaking ? 0.025 : 0.012
  const base = props.speaking ? 1.01 : 1.0
  breathScale.value = base + amp * Math.sin(breathT * 1.4)
  breathRaf = requestAnimationFrame(loop)
}
onMounted(() => { loop() })
onBeforeUnmount(() => { if (breathRaf) cancelAnimationFrame(breathRaf) })

// 嘴型光斑：在 viewBox 中心坐标系下定位，但实际渲染在头像层上方。
// 简化：百分比定位到头像中心区域，mouthOpen 决定尺寸/不透明度/颜色。
const mouthGlowStyle = computed(() => {
  const o = Math.max(0, Math.min(1, props.mouthOpen))
  const a = mouthAnchor.value
  const leftPct = a.x * 100
  const topPct = a.y * 100
  // 视觉尺寸（像素）按 size 缩放
  const baseSize = sizePx.value * 0.18
  // 注意：变量名不能叫 sizePx——会与外层 computed 同名造成 TDZ，
  // 在 const 声明前的 sizePx.value 访问会抛 ReferenceError，整页渲染中断。
  const glowSize = baseSize * (1 + o * 1.8)
  const opacity = 0.15 + o * 0.55
  return {
    left: `calc(${leftPct}% - ${glowSize / 2}px)`,
    top: `calc(${topPct}% - ${glowSize / 2}px)`,
    width: `${glowSize}px`,
    height: `${glowSize}px`,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${palette.value.accent}cc 0%, ${palette.value.accent}55 35%, transparent 75%)`,
    opacity: String(opacity),
    filter: 'blur(3px)',
    mixBlendMode: 'screen'
  }
})

const ariaLabel = computed(() => `AI 面试官数字人${props.speaking ? '（正在讲话）' : ''}`)
</script>

<style scoped>
.breath-dot {
  animation: breathDot 1.2s ease-in-out infinite;
}
@keyframes breathDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}
</style>