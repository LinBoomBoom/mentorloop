<template>
  <svg viewBox="0 0 240 240" class="w-full h-full">
    <g transform="translate(120,120)">
      <polygon v-for="lvl in levels" :key="lvl" :points="ring(lvl)" fill="none" stroke="rgb(var(--line))" stroke-width="1" />
      <line v-for="(d, i) in data" :key="'l' + i" x1="0" y1="0" :x2="pt(d.value, i).x" :y2="pt(d.value, i).y" stroke="rgb(var(--line))" stroke-width="1" />
      <polygon :points="polyPoints" fill="rgba(255,94,126,.16)" :stroke="color" stroke-width="2" />
      <circle v-for="(d, i) in data" :key="'p' + i" :cx="pt(d.value, i).x" :cy="pt(d.value, i).y" r="3" :fill="color" />
      <text v-for="(d, i) in data" :key="'t' + i" :x="labelPt(i).x" :y="labelPt(i).y" text-anchor="middle" class="fill-sub" style="font-size:10px;font-weight:600">{{ d.axis }}</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps({ data: { type: Array, default: () => [] }, color: { type: String, default: '#ff5e7e' } })
const levels = [0.25, 0.5, 0.75, 1]
const N = computed(() => props.data.length || 1)
const angle = (i: number) => -Math.PI / 2 + i * (2 * Math.PI / N.value)
const pt = (v: number, i: number) => {
  const rad = 88 * (Math.min(100, v) / 100)
  return { x: Math.cos(angle(i)) * rad, y: Math.sin(angle(i)) * rad }
}
const ring = (lvl: number) => props.data
  .map((_d: any, i: number) => { const rad = 88 * lvl; return `${Math.cos(angle(i)) * rad},${Math.sin(angle(i)) * rad}` })
  .join(' ')
const labelPt = (i: number) => { const rad = 106; return { x: Math.cos(angle(i)) * rad, y: Math.sin(angle(i)) * rad + 3 } }
const polyPoints = computed(() => props.data.map((d: any, i: number) => { const p = pt(d.value, i); return `${p.x},${p.y}` }).join(' '))
</script>
