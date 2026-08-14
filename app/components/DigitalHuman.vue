<!--
  AI 数字人面试官（v2：本地上色的二次元人物）
  - 用 DiceBear 生成不同 seed 的稳定人脸（lorelei/personas/openPeeps）作底图
  - 头像透明背景，外层用 CSS 画圆角矩形 + 品牌色光晕 + 装饰点
  - 在嘴部中心点叠一个"嘴型光斑"，mouthOpen 驱动亮度和大小
  - speaking 时整体微微浮动 + 角标呼吸点

  SSR 注意事项：DiceBear 在浏览器端会 fork Web Worker（blob: URL）做异步渲染优化，
  即便最终回退到同步路径，Worker 创建仍会被当前 CSP 的 script-src 兜底规则拦截，
  且 SSR/CSR 节点结构不同 → hydration mismatch。
  修复：DiceBear 头像层用 <ClientOnly> 包裹，SSR 输出等尺寸占位，客户端 mount 后再渲染头像。
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

      <!-- DiceBear 二次元头像（透明背景，外层 CSS 控底色）。
           SSR 输出等尺寸占位（hydration 友好），客户端 mount 后再插入头像 SVG。
           这样 SSR/CSR 节点结构完全一致，从根本上避免 hydration mismatch。 -->
      <ClientOnly>
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

      <!-- 嘴型光斑（mouthOpen 控制亮度和大小） -->
      <div
        v-show="props.mouthOpen > 0.02"
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
import {
  renderAvatar,
  VOICE_PORTRAITS,
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
}>(), {
  mouthOpen: 0,
  speaking: false,
  gender: 'female',
  size: 128,
  portraitId: 'huayan'
})

/** size 接受 px 数字或 sm/md/lg/xl 简写。 */
const sizePx = computed(() => {
  const s = props.size
  if (typeof s === 'number') return s
  const table: Record<string, number> = { sm: 80, md: 128, lg: 192, xl: 240 }
  return table[String(s)] || 128
})

// 由 portraitId 选定 seed/style（portraitId 与 voiceId 同步）
const portraitMeta = computed(() => {
  const preset = VOICE_PORTRAITS[props.portraitId]
  if (preset) {
    return renderAvatar({ seed: preset.seed, style: preset.style })
  }
  // 默认按 gender 选：female→lorelei male→openPeeps；seed 直接用 portraitId
  const style: AvatarStyle = props.gender === 'male' ? 'openPeeps' : 'lorelei'
  return renderAvatar({ seed: `ml-${props.portraitId}`, style })
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