<template>
  <div class="w-full max-w-full">
    <div class="flex gap-[3px] overflow-x-auto scrollbar-thin pb-1">
      <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-[3px]">
        <div v-for="(day, di) in week" :key="di"
             class="w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125"
             :style="{ background: day ? color(day.count) : 'rgb(var(--line))' }"
             :title="day ? `${day.date} · ${day.count} 次学习/打卡` : ''"></div>
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

// 周一为每周起始；将首个日期按星期补齐前导空格，使每一列 = 一个自然周
function dow(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return (dt.getDay() + 6) % 7 // 0=周一 … 6=周日
}
const weeks = computed(() => {
  const arr = [...(props.days as any[])]
  if (arr.length && arr[0] && arr[0].date) {
    const lead = dow(arr[0].date)
    for (let i = 0; i < lead; i++) arr.unshift(null as any)
  }
  const w: any[] = []
  for (let i = 0; i < arr.length; i += 7) w.push(arr.slice(i, i + 7))
  return w
})
function color(c: number) {
  if (!c) return 'rgb(var(--line))'
  const t = Math.min(1, c / 4)
  return `rgba(255,94,126,${0.18 + t * 0.82})`
}
</script>
