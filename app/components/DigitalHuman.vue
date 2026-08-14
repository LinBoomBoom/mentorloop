<!--
  抽象 AI 摄像头脸 / 数字人面试官
  - 纯 SVG，零图片资源；不画人脸，避开恐怖谷
  - mouthOpen 控口型区亮度（黑→品牌红），避免"小丑嘴"
  - speaking 时眼镜环 + 频率条微闪
  - 空闲：缓慢呼吸（transform scale）+ 周期眨眼（眼睑高度过渡）
  - gender prop 仅决定配色（女=玫瑰红 / 男=钢青），不画人脸特征
-->
<template>
  <div
    class="relative inline-block select-none"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- 圆角矩形底座（柔和的胸像/底板），避开粉色"卡通贴纸" -->
    <svg
      :viewBox="`0 0 ${VB} ${VB}`"
      :width="size"
      :height="size"
      class="block"
      shape-rendering="geometricPrecision"
    >
      <!-- 渐变定义 -->
      <defs>
        <radialGradient :id="gradId('halo')" cx="50%" cy="42%" r="60%">
          <stop offset="0%" :stop-color="palette.haloIn" />
          <stop offset="100%" :stop-color="palette.haloOut" />
        </radialGradient>
        <linearGradient :id="gradId('face')" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="palette.faceTop" />
          <stop offset="100%" :stop-color="palette.faceBottom" />
        </linearGradient>
        <linearGradient :id="gradId('visor')" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="palette.visorTop" />
          <stop offset="100%" :stop-color="palette.visorBottom" />
        </linearGradient>
        <filter :id="gradId('soft')" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <!-- 圆角底板（带柔和光晕） -->
      <rect
        :x="2" :y="2" :width="VB - 4" :height="VB - 4"
        :rx="pad" :ry="pad"
        :fill="`url(#${gradId('halo')})`"
      />

      <!-- 胸像/底座（点阵带），品牌红细条 -->
      <g :opacity="speaking ? 0.95 : 0.7">
        <rect :x="cx - 26" :y="VB - 22" width="52" height="4" rx="2"
          :fill="speaking ? palette.accent : palette.dotDim" />
        <g :fill="palette.dot">
          <circle :cx="cx - 22" :cy="VB - 11" r="1.6" />
          <circle :cx="cx - 12" :cy="VB - 11" r="1.6" />
          <circle :cx="cx - 2" :cy="VB - 11" r="1.6" />
          <circle :cx="cx + 8" :cy="VB - 11" r="1.6" />
          <circle :cx="cx + 18" :cy="VB - 11" r="1.6" />
        </g>
      </g>

      <!-- 头部圆形（脸型用圆，避免下巴扭曲）+ 缓慢呼吸 scale -->
      <g :transform="`translate(${cx} ${cy}) scale(${breathScale}) translate(${-cx} ${-cy})`">
        <!-- 头部主体 -->
        <circle :cx="cx" :cy="cy" :r="headR"
          :fill="`url(#${gradId('face')})`"
          :stroke="palette.ring" stroke-width="1.5"
        />

        <!-- 顶部光线（科技感） -->
        <path :d="`M ${cx - 18} ${cy - headR + 4} Q ${cx} ${cy - headR - 8} ${cx + 18} ${cy - headR + 4}`"
          :stroke="palette.highlight" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.7" />

        <!-- 摄像头眼罩（横长椭圆，深色玻璃感） -->
        <rect :x="cx - 30" :y="cy - 18" width="60" height="22" rx="11" ry="11"
          :fill="`url(#${gradId('visor')})`" />

        <!-- 左眼（摄像头镜头）：瞳孔 + 镜面高光；speaking 时外环淡出 -->
        <g :class="speaking ? 'eye-pulse' : ''">
          <circle :cx="cx - 14" :cy="cy - 7" :r="8" :fill="palette.eyeBg" />
          <circle :cx="cx - 14" :cy="cy - 7" :r="5" :fill="palette.eyeCore" />
          <!-- 镜头反光 -->
          <circle :cx="cx - 16" :cy="cy - 9" r="1.6" fill="#ffffff" opacity="0.85" />
          <circle :cx="cx - 12" :cy="cy - 5" r="0.9" fill="#ffffff" opacity="0.55" />
          <!-- 眨眼时盖一层同色椭圆 -->
          <ellipse v-if="blinkClosed" :cx="cx - 14" :cy="cy - 7" :rx="9" :ry="1.6"
            :fill="palette.eyeLid" />
        </g>

        <!-- 右眼 -->
        <g :class="speaking ? 'eye-pulse' : ''">
          <circle :cx="cx + 14" :cy="cy - 7" :r="8" :fill="palette.eyeBg" />
          <circle :cx="cx + 14" :cy="cy - 7" :r="5" :fill="palette.eyeCore" />
          <circle :cx="cx + 12" :cy="cy - 9" r="1.6" fill="#ffffff" opacity="0.85" />
          <circle :cx="cx + 16" :cy="cy - 5" r="0.9" fill="#ffffff" opacity="0.55" />
          <ellipse v-if="blinkClosed" :cx="cx + 14" :cy="cy - 7" :rx="9" :ry="1.6"
            :fill="palette.eyeLid" />
        </g>

        <!-- 眼罩边框小灯（speaking 时亮起） -->
        <circle :cx="cx - 30" :cy="cy - 7" :r="1.6"
          :fill="speaking ? palette.accent : palette.dotDim" />
        <circle :cx="cx + 30" :cy="cy - 7" :r="1.6"
          :fill="speaking ? palette.accent : palette.dotDim" />

        <!-- 嘴型区：横向胶囊，颜色随 mouthOpen 从深灰 → 品牌红，避开"小丑嘴" -->
        <rect
          :x="cx - mouthW" :y="cy + 14"
          :width="mouthW * 2" :height="mouthH"
          rx="6" ry="6"
          :fill="mouthColor"
        />
        <!-- 嘴内频谱条（仅 speaking 时显示 3 条短竖条） -->
        <g v-if="speaking" :opacity="0.85">
          <rect :x="cx - 9" :y="cy + 17" width="2" :height="bars.h" rx="1" :fill="palette.bar" />
          <rect :x="cx - 1" :y="cy + 17" width="2" :height="bars.m" rx="1" :fill="palette.bar" />
          <rect :x="cx + 7" :y="cy + 17" width="2" :height="bars.h" rx="1" :fill="palette.bar" />
        </g>
      </g>

      <!-- 顶部状态点（speaking 时呼吸脉冲），角标化 -->
      <circle :cx="VB - 12" :cy="12" r="4"
        :fill="speaking ? palette.accent : palette.dotDim"
        :class="speaking ? 'breath-dot' : ''"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** 嘴部张开程度 0..1（由 RMS 驱动） */
  mouthOpen?: number
  /** 是否正在说话（影响眼镜外环/频谱条/角标） */
  speaking?: boolean
  /** 性别：影响配色，避免画人脸特征 */
  gender?: 'female' | 'male'
  /** 画布尺寸 px */
  size?: number
  /** 端口 ID（保留扩展位，目前仅记录在 aria-label） */
  portraitId?: string
}>(), {
  mouthOpen: 0,
  speaking: false,
  gender: 'female',
  size: 128,
  portraitId: 'default'
})

// 唯一 id 前缀（同一页面多次出现 SVG 渐变 id 不冲突）
const uid = Math.random().toString(36).slice(2, 9)
function gradId(k: string) { return `dh-${uid}-${k}` }

// SVG 视口（统一 100）
const VB = 100
const cx = VB / 2
const cy = VB / 2
const headR = 32
const pad = 18

// 呼吸缩放（缓慢正弦，speaking 时幅度更大）
const breathScale = ref(1)
let breathRaf = 0
let breathT = 0

// 眨眼：每隔 ~3.5 秒闭一下眼，闭眼持续 120ms
const blinkClosed = ref(false)
let blinkTimer: any = null
function scheduleBlink() {
  if (blinkTimer) return
  const delay = 2500 + Math.random() * 2200
  blinkTimer = setTimeout(() => {
    blinkClosed.value = true
    setTimeout(() => {
      blinkClosed.value = false
      blinkTimer = null
      scheduleBlink()
    }, 130)
  }, delay)
}

// 频谱条动画（speaking 时持续变化，闭口时归 0）
const bars = ref({ h: 2, m: 2 })
let barRaf = 0
let barT = 0

function loop() {
  // 呼吸：幅度根据 speaking 切换
  breathT += 1 / 60
  const amp = props.speaking ? 0.02 : 0.008
  const base = props.speaking ? 1.005 : 1.0
  breathScale.value = base + amp * Math.sin(breathT * 1.4)

  // 频谱条：mouthOpen 决定整体能量
  if (props.speaking) {
    barT += 1
    const energy = Math.max(0.05, Math.min(1, props.mouthOpen || 0))
    bars.value = {
      h: 2 + Math.abs(Math.sin(barT * 0.45)) * (4 + energy * 8),
      m: 2 + Math.abs(Math.cos(barT * 0.31)) * (4 + energy * 10)
    }
  } else if (bars.value.h !== 2 || bars.value.m !== 2) {
    bars.value = { h: 2, m: 2 }
  }
  breathRaf = requestAnimationFrame(loop)
}

// 配色：gender 仅决定色系，不画人脸
const palette = computed(() => {
  const female = props.gender !== 'male'
  return female
    ? {
        // 玫瑰红（华嫣/小雅）
        accent: '#e11d48',
        haloIn: '#fff1f3',
        haloOut: '#fde7eb',
        faceTop: '#f9e3e8',
        faceBottom: '#f3cfd6',
        visorTop: '#1f2937',
        visorBottom: '#0b1220',
        eyeBg: '#0b1220',
        eyeCore: '#e11d48',
        eyeLid: '#0b1220',
        ring: '#e11d48',
        highlight: '#ffffff',
        bar: '#e11d48',
        dot: '#e11d48',
        dotDim: '#cbd5e1'
      }
    : {
        // 钢青（朝文）
        accent: '#0ea5b7',
        haloIn: '#ecfeff',
        haloOut: '#cffafe',
        faceTop: '#dbeafe',
        faceBottom: '#bfdbfe',
        visorTop: '#0f172a',
        visorBottom: '#020617',
        eyeBg: '#020617',
        eyeCore: '#0ea5b7',
        eyeLid: '#020617',
        ring: '#0ea5b7',
        highlight: '#ffffff',
        bar: '#0ea5b7',
        dot: '#0ea5b7',
        dotDim: '#cbd5e1'
      }
})

// 嘴型胶囊尺寸（始终是窄长条，不变成"龇牙小丑嘴"）
const mouthW = computed(() => 10 + Math.min(1, Math.max(0, props.mouthOpen)) * 6) // 10..16
const mouthH = computed(() => 4 + Math.min(1, Math.max(0, props.mouthOpen)) * 4)  // 4..8

// 嘴型颜色：闭嘴深灰（自然闭口）→ 开口品牌红（说话时不显得惊悚）
const mouthColor = computed(() => {
  const o = Math.min(1, Math.max(0, props.mouthOpen))
  // 0..0.2 深灰；0.2..1 渐变到 accent
  const start = { r: 0x4b, g: 0x55, b: 0x63 } // slate-600
  const end = palette.value.accent.startsWith('#')
    ? {
        r: parseInt(palette.value.accent.slice(1, 3), 16),
        g: parseInt(palette.value.accent.slice(3, 5), 16),
        b: parseInt(palette.value.accent.slice(5, 7), 16)
      }
    : start
  const t = o < 0.2 ? 0 : (o - 0.2) / 0.8
  const r = Math.round(start.r + (end.r - start.r) * t)
  const g = Math.round(start.g + (end.g - start.g) * t)
  const b = Math.round(start.b + (end.b - start.b) * t)
  return `rgb(${r}, ${g}, ${b})`
})

const ariaLabel = computed(() => `AI 面试官数字人${props.speaking ? '（正在讲话）' : ''}`)

// 监听属性以保证循环启动一次
watch(() => props.speaking, (v) => {
  if (v) {
    if (!breathRaf) { breathT = 0; barT = 0; loop() }
  }
})

// 启动呼吸 + 眨眼循环
if (typeof window !== 'undefined') {
  scheduleBlink()
  loop()
}

onBeforeUnmount(() => {
  if (breathRaf) cancelAnimationFrame(breathRaf)
  if (blinkTimer) clearTimeout(blinkTimer)
  if (barRaf) cancelAnimationFrame(barRaf)
})
</script>

<style scoped>
.eye-pulse {
  animation: eyePulse 1.6s ease-in-out infinite;
  transform-origin: center;
}
@keyframes eyePulse {
  0%, 100% { filter: drop-shadow(0 0 0 transparent); }
  50% { filter: drop-shadow(0 0 2px currentColor); }
}
.breath-dot {
  animation: breathDot 1.2s ease-in-out infinite;
  transform-origin: center;
}
@keyframes breathDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}
</style>