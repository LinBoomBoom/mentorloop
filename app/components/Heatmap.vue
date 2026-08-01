<template>
  <div class="w-full">
    <div class="flex gap-[3px] overflow-x-auto scrollbar-thin pb-1">
      <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-[3px]">
        <div v-for="(day, di) in week" :key="di"
             class="w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125"
             :style="{ background: color(day && day.count ? day.count : 0) }"
             :title="day ? `${day.date} · ${day.count} 次学习` : ''"></div>
      </div>
    </div>
    <div class="flex items-center gap-1.5 mt-3 text-[11px] text-muted">
      <span>少</span>
      <span v-for="n in 5" :key="n" class="w-3.5 h-3.5 rounded-[3px]" :style="{ background: color((n - 1) * 1) }"></span>
      <span>多</span>
      <span class="ml-auto">近 20 周</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({ days: { type: Array, default: () => [] } })
const weeks = computed(() => {
  const w: any[] = []
  for (let i = 0; i < props.days.length; i += 7) w.push(props.days.slice(i, i + 7))
  return w
})
function color(c: number) {
  if (!c) return 'rgb(var(--line))'
  const t = Math.min(1, c / 4)
  return `rgba(255,94,126,${0.18 + t * 0.82})`
}
</script>
