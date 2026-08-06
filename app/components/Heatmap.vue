<template>
  <div class="w-full max-w-full">
    <!-- 月份标签行：与下方周列一一对齐，方便快速定位「上月 / 本月」 -->
    <div class="flex gap-[4px] mb-2 h-4 text-[11px] font-medium text-muted select-none">
      <div v-for="(w, wi) in weeks" :key="'m' + wi" class="flex-1 relative">
        <span v-if="monthLabels[wi]" class="absolute left-0 top-0 whitespace-nowrap">{{ monthLabels[wi] }}</span>
      </div>
    </div>

    <!-- 周列用 flex-1 均分横向空间；单元格 aspect-square 铺满宽度，避免盒子右侧大片留空 -->
    <div class="flex gap-[4px]">
      <div v-for="(week, wi) in weeks" :key="wi" class="flex-1 flex flex-col gap-[4px]">
        <div v-for="(day, di) in week" :key="di"
             class="aspect-square rounded-[4px] transition-transform"
             :class="day ? 'hover:scale-110' : ''"
             :style="cellStyle(day)"
             :title="day ? cellTitle(day) : ''"></div>
      </div>
    </div>

    <div class="flex items-center flex-wrap gap-x-4 gap-y-2 mt-4 text-[11px] text-muted">
      <div class="flex items-center gap-1.5">
        <span>少</span>
        <span v-for="n in 5" :key="n" class="w-3.5 h-3.5 rounded-[3px]" :style="{ background: color(n - 1) }"></span>
        <span>多</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3.5 h-3.5 rounded-[3px] border border-dashed" style="border-color:rgb(var(--muted)/.45);background:transparent"></span>
        <span>未到来</span>
      </div>
      <span class="ml-auto">{{ rangeLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
type Day = { date: string; count: number }
const props = defineProps<{ days?: Day[] }>()

// 周一为每周起始；将首个日期按星期补齐前导空格，使每一列 = 一个自然周
function dow(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7 // 0=周一 … 6=周日
}
const list = computed<Day[]>(() => (props.days || []).filter((d) => d && d.date))

const weeks = computed(() => {
  const arr: (Day | null)[] = [...list.value]
  if (arr.length && arr[0]) {
    const lead = dow(arr[0]!.date)
    for (let i = 0; i < lead; i++) arr.unshift(null)
  }
  // 尾部补齐到整周，避免最后一列高度塌陷导致底部对不齐
  while (arr.length % 7 !== 0) arr.push(null)
  const w: (Day | null)[][] = []
  for (let i = 0; i < arr.length; i += 7) w.push(arr.slice(i, i + 7))
  return w
})

// 每列取首个有效日期的月份；与上一列不同则在该列上方打月份标
const monthLabels = computed(() => {
  let prev = -1
  return weeks.value.map((week) => {
    const first = week.find((d) => !!d)
    if (!first) return ''
    const m = Number(first.date.split('-')[1])
    if (m === prev) return ''
    prev = m
    return m + '月'
  })
})

const rangeLabel = computed(() => {
  const arr = list.value
  if (!arr.length) return ''
  const first = arr[0]!.date.split('-')
  const last = arr[arr.length - 1]!.date.split('-')
  return `${Number(first[1])}月 – ${Number(last[1])}月`
})

function color(c: number) {
  if (!c) return 'rgb(var(--line))'
  const t = Math.min(1, c / 4)
  return `rgba(255,94,126,${0.22 + t * 0.78})`
}
function cellStyle(day: Day | null) {
  if (!day) return { background: 'transparent' }
  // count = -1 表示当月尚未到来的日期：留空心虚线格，暗示「还能被点亮」
  if (day.count < 0) return { background: 'transparent', border: '1px dashed rgb(var(--muted) / .35)' }
  return { background: color(day.count) }
}
function cellTitle(day: Day) {
  if (day.count < 0) return `${day.date} · 尚未到来`
  return day.count > 0 ? `${day.date} · ${day.count} 次学习/打卡` : `${day.date} · 未活跃`
}
</script>
