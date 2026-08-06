<template>
  <div class="relative w-full h-full">
    <svg viewBox="0 0 260 260" class="w-full h-full">
      <g transform="translate(130,128)">
        <!-- 刻度环 + 25/50/75/100 标尺 -->
        <polygon v-for="lvl in levels" :key="lvl" :points="ring(lvl)" fill="none" stroke="rgb(var(--line))" stroke-width="1" />
        <text v-for="lvl in levels" :key="'s' + lvl" x="3" :y="-RADIUS * lvl + 1"
              class="fill-current text-muted" style="font-size:8px;opacity:.65">{{ Math.round(lvl * 100) }}</text>

        <line v-for="(d, i) in data" :key="'l' + i" x1="0" y1="0" :x2="axisPt(i).x" :y2="axisPt(i).y"
              stroke="rgb(var(--line))" stroke-width="1" />

        <polygon :points="polyPoints" fill="rgba(255,94,126,.18)" :stroke="color" stroke-width="2" stroke-linejoin="round" />

        <!-- 顶点：未经答卷验证的方向画空心点，一眼区分「学过」与「练过」 -->
        <circle v-for="(d, i) in data" :key="'p' + i"
                :cx="pt(d.value, i).x" :cy="pt(d.value, i).y"
                :r="hover === i ? 5.5 : 4"
                :fill="d.verified === false ? 'rgb(var(--surface))' : (d.color || color)"
                :stroke="d.color || color" stroke-width="2"
                class="transition-all cursor-pointer"
                @mouseenter="hover = i" @mouseleave="hover = null" />

        <!-- 轴标签：名称 + 分值，分值才是用户真正要看的 -->
        <g v-for="(d, i) in data" :key="'t' + i" @mouseenter="hover = i" @mouseleave="hover = null" style="cursor:pointer">
          <text :x="labelPt(i).x" :y="labelPt(i).y" text-anchor="middle"
                class="fill-current" :class="hover === i ? 'text-ink' : 'text-sub'"
                style="font-size:10.5px;font-weight:700">{{ d.axis }}</text>
          <text :x="labelPt(i).x" :y="labelPt(i).y + 11" text-anchor="middle"
                :fill="d.color || color" style="font-size:10px;font-weight:800">{{ d.value }}</text>
        </g>
      </g>
    </svg>

    <!-- 悬停解释：说明这条轴是怎么算出来的（雷达的「用处」在于可解释） -->
    <div v-if="hovered"
         class="absolute left-1/2 -translate-x-1/2 bottom-0 w-[92%] rounded-xl border border-line bg-surface/95 backdrop-blur px-3 py-2 shadow-card pointer-events-none">
      <div class="text-[11px] font-bold" :style="{ color: hovered.color || color }">
        {{ hovered.axis }} · {{ hovered.value }} 分
        <span v-if="hovered.verified === false" class="ml-1 font-medium text-muted">（未实战验证）</span>
      </div>
      <div class="text-[11px] text-muted leading-relaxed mt-0.5">{{ hovered.hint }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Axis = { axis: string; value: number; hint?: string; color?: string; verified?: boolean }
const props = defineProps({
  data: { type: Array as () => Axis[], default: () => [] },
  color: { type: String, default: '#ff5e7e' }
})
const RADIUS = 86
const levels = [0.25, 0.5, 0.75, 1]
const hover = ref<number | null>(null)
const hovered = computed(() => (hover.value === null ? null : props.data[hover.value] || null))

const N = computed(() => props.data.length || 1)
const angle = (i: number) => -Math.PI / 2 + i * (2 * Math.PI / N.value)
const pt = (v: number, i: number) => {
  const rad = RADIUS * (Math.max(0, Math.min(100, v)) / 100)
  return { x: Math.cos(angle(i)) * rad, y: Math.sin(angle(i)) * rad }
}
const axisPt = (i: number) => ({ x: Math.cos(angle(i)) * RADIUS, y: Math.sin(angle(i)) * RADIUS })
const ring = (lvl: number) => props.data
  .map((_d, i) => { const rad = RADIUS * lvl; return `${Math.cos(angle(i)) * rad},${Math.sin(angle(i)) * rad}` })
  .join(' ')
const labelPt = (i: number) => {
  const rad = RADIUS + 20
  const y = Math.sin(angle(i)) * rad
  // 顶部标签往上让一点、底部往下让一点，避免与图形顶点粘连
  return { x: Math.cos(angle(i)) * rad, y: y + (y < -40 ? -2 : y > 40 ? 9 : 3) }
}
const polyPoints = computed(() => props.data.map((d, i) => { const p = pt(d.value, i); return `${p.x},${p.y}` }).join(' '))
</script>
