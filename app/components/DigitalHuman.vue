<script setup lang="ts">
// P4 数字人面试官：纯前端 SVG 角色，嘴型由父组件传入的真实音频 RMS（mouthOpen 0..1）驱动。
// 性别（gender）决定发型/配色；speaking 为真时头顶加说话光环。空闲时呼吸 + 偶尔眨眼微动画（纯 CSS）。
// 不发起任何网络请求、零密钥、离线可用，与「免费层极厚」基调一致。
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    mouthOpen?: number // 0..1，由 Web Audio 真实 RMS 驱动
    gender?: 'female' | 'male'
    portraitId?: string
    speaking?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { mouthOpen: 0, gender: 'female', portraitId: 'huayan', speaking: false, size: 'md' }
)

const skin = computed(() => (props.gender === 'male' ? '#e8b89c' : '#f6d2bf'))
const hair = computed(() => (props.gender === 'male' ? '#3a2c22' : '#5b3a29'))
const hairStyle = computed(() => (props.gender === 'male' ? 'short' : 'long'))
// 嘴部：mouthOpen=0 → ry≈2（闭嘴细线）；开口越大椭圆越高
const mouthRy = computed(() => 2 + props.mouthOpen * 16)
const sizePx = computed(() => ({ sm: 64, md: 132, lg: 200 }[props.size] || 132))
const ringClass = computed(() => (props.speaking ? 'avatar-ring avatar-ring--on' : 'avatar-ring'))
</script>

<template>
  <svg
    class="digital-human select-none"
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 200 200"
    role="img"
    :aria-label="`AI 面试官数字人${gender === 'male' ? '（男声）' : '（女声）'}`"
  >
    <defs>
      <radialGradient id="dh-bg" cx="50%" cy="38%" r="70%">
        <stop offset="0%" stop-color="#fff1f3" />
        <stop offset="100%" stop-color="#ffe4e9" />
      </radialGradient>
      <linearGradient id="dh-shoulder" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fb7185" />
        <stop offset="100%" stop-color="#e11d48" />
      </linearGradient>
    </defs>

    <!-- 说话光环 -->
    <circle :class="ringClass" cx="100" cy="100" r="92" fill="none" stroke="#e11d48" stroke-width="3" opacity="0" />

    <!-- 背景 -->
    <rect x="0" y="0" width="200" height="200" rx="20" fill="url(#dh-bg)" />

    <!-- 呼吸整体缩放 -->
    <g class="dh-breathe">
      <!-- 肩膀 / 躯干 -->
      <path d="M40 200 Q44 150 100 150 Q156 150 160 200 Z" fill="url(#dh-shoulder)" />

      <!-- 脖子 -->
      <rect x="88" y="132" width="24" height="24" rx="10" :fill="skin" />

      <!-- 头部 -->
      <ellipse cx="100" cy="92" rx="46" ry="50" :fill="skin" />

      <!-- 头发 -->
      <template v-if="hairStyle === 'long'">
        <path d="M54 92 Q50 38 100 36 Q150 38 146 92 Q146 70 130 60 Q138 78 132 96 L130 120 Q120 100 100 100 Q80 100 70 120 L70 96 Q64 78 72 60 Q54 70 54 92 Z" :fill="hair" />
        <path d="M54 92 Q56 60 100 56 Q144 60 146 92 L142 96 Q140 74 100 72 Q60 74 58 96 Z" :fill="hair" />
      </template>
      <template v-else>
        <path d="M56 86 Q56 40 100 38 Q144 40 144 86 Q140 60 118 56 Q132 70 128 90 L126 84 Q120 58 100 56 Q80 58 74 84 L72 90 Q68 70 82 56 Q60 60 56 86 Z" :fill="hair" />
      </template>

      <!-- 眼睛（眨眼动画） -->
      <g class="dh-eyes">
        <ellipse cx="82" cy="90" rx="7" ry="8.5" fill="#3a2a2a" />
        <ellipse cx="118" cy="90" rx="7" ry="8.5" fill="#3a2a2a" />
        <circle cx="84" cy="87" r="2" fill="#fff" opacity="0.85" />
        <circle cx="120" cy="87" r="2" fill="#fff" opacity="0.85" />
      </g>

      <!-- 眉毛 -->
      <path d="M73 78 Q82 74 91 78" stroke="#6b4a36" stroke-width="2.5" fill="none" stroke-linecap="round" />
      <path d="M109 78 Q118 74 127 78" stroke="#6b4a36" stroke-width="2.5" fill="none" stroke-linecap="round" />

      <!-- 鼻子 -->
      <path d="M100 96 L96 108 Q100 111 104 108" stroke="#d39b82" stroke-width="2" fill="none" stroke-linecap="round" />

      <!-- 嘴：真实 RMS 驱动开合 -->
      <g class="dh-mouth">
        <ellipse cx="100" cy="120" rx="14" :ry="mouthRy" fill="#7a2e2e" />
        <path d="M84 120 Q100 126 116 120" stroke="#b05a5a" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.digital-human {
  display: block;
}
/* 空闲呼吸：整体轻微缩放 */
.dh-breathe {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: dh-breathe 4.2s ease-in-out infinite;
}
@keyframes dh-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.018); }
}
/* 眨眼：眼组纵向快速压扁 */
.dh-eyes {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: dh-blink 5.4s infinite;
}
@keyframes dh-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}
/* 说话光环淡入脉冲 */
.avatar-ring {
  transition: opacity 200ms ease;
}
.avatar-ring--on {
  opacity: 0.5 !important;
  animation: dh-ring 1.6s ease-in-out infinite;
}
@keyframes dh-ring {
  0%, 100% { opacity: 0.22; }
  50% { opacity: 0.5; }
}
@media (prefers-reduced-motion: reduce) {
  .dh-breathe, .dh-eyes, .avatar-ring--on { animation: none; }
}
</style>
