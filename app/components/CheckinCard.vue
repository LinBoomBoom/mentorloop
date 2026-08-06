<template>
  <!-- 「连续学习 + 每日打卡」合并卡片：与其它 StatCard 等高，不再单独占一整行 -->
  <div class="card p-5 reveal flex flex-col">
    <div class="flex items-center justify-between">
      <div class="min-w-0">
        <div class="text-[12px] text-muted font-medium">连续学习</div>
        <div class="text-2xl font-extrabold mt-1.5 truncate" style="color:#ea580c">{{ streak }} 天</div>
      </div>
      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style="background:#ea580c1a;color:#ea580c">
        <Icon name="flame" :size="21" />
      </div>
    </div>

    <!-- 本周打卡条：周一 → 周日完整一周，未来几天以虚线占位，让人清楚「还剩几天可打」 -->
    <div class="flex items-center justify-between mt-3.5 mb-1.5">
      <span class="text-[11px] font-semibold text-sub">本周</span>
      <span class="text-[11px] text-muted">已活跃 {{ weekActive }}/7 天</span>
    </div>
    <div class="flex items-stretch gap-1.5">
      <div
        v-for="d in thisWeek"
        :key="d.date"
        class="flex-1 rounded-md py-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition"
        :class="cellClass(d)"
        :style="cellStyle(d)"
        :title="cellTitle(d)"
      >
        <span class="leading-none">{{ d.label }}</span>
        <span class="leading-none text-[9px] opacity-80">{{ d.dayNum }}</span>
      </div>
    </div>

    <div class="text-[12px] text-muted mt-2.5 leading-relaxed">
      最长 {{ longest }} 天 · 累计 {{ totalDays }} 天
    </div>

    <a-button
      class="!mt-3 w-full"
      size="small"
      :type="checkedToday ? 'default' : 'primary'"
      :disabled="checkedToday || !loaded"
      :loading="submitting"
      @click="checkIn"
    >
      {{ checkedToday ? '今日已打卡 ✓' : '立即打卡' }}
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'

const props = defineProps<{
  streak?: number
  longest?: number
  totalDays?: number
  heatmap?: { date: string; count: number }[]
}>()
const emit = defineEmits<{ (e: 'refresh'): void }>()

const { request } = useApi()
const loaded = ref(false)
const submitting = ref(false)
const checkedToday = ref(false)

const streak = computed(() => props.streak ?? 0)
const longest = computed(() => props.longest ?? 0)
const totalDays = computed(() => props.totalDays ?? 0)

const WEEK = ['一', '二', '三', '四', '五', '六', '日']
const ymd = (d: Date) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

// 服务端热力图转成「日期 → 次数」，本周的格子直接查表，未覆盖到的日期按 0 处理
const countMap = computed(() => {
  const m: Record<string, number> = {}
  for (const h of props.heatmap || []) m[h.date] = h.count
  return m
})

// 本周 = 周一 → 周日（含今天之后的日期），而不是「最近 7 天」，
// 否则用户永远看不到本周还剩几天可以打卡。
// SSR 与客户端都用同一套本地日期算法，避免 hydration mismatch。
const todayKey = ref('')
const thisWeek = computed(() => {
  const base = todayKey.value ? new Date(todayKey.value + 'T00:00:00') : new Date()
  const monday = new Date(base)
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    const date = ymd(dt)
    const c = countMap.value[date]
    return {
      date,
      label: WEEK[i],
      dayNum: dt.getDate(),
      active: (c ?? 0) > 0,
      isToday: date === todayKey.value,
      future: !!todayKey.value && date > todayKey.value
    }
  })
})
const weekActive = computed(() => thisWeek.value.filter((d) => d.active).length)

function cellClass(d: any) {
  if (d.active) return 'text-white'
  if (d.future) return 'text-muted/70 border border-dashed'
  return 'text-muted'
}
function cellStyle(d: any) {
  if (d.active) return { background: '#ea580c' }
  if (d.future) return { background: 'transparent', borderColor: 'rgb(var(--line))' }
  if (d.isToday) return { background: 'rgb(var(--line))', boxShadow: 'inset 0 0 0 1.5px #ea580c' }
  return { background: 'rgb(var(--line))' }
}
function cellTitle(d: any) {
  if (d.future) return `${d.date} · 还没到，届时可打卡`
  if (d.active) return `${d.date} · 已活跃`
  return `${d.date}${d.isToday ? ' · 今天还没打卡' : ' · 未活跃'}`
}

async function load() {
  try {
    const r: any = await request('/api/checkin')
    checkedToday.value = !!r?.checkedToday
  } catch {
    checkedToday.value = false
  } finally {
    loaded.value = true
  }
}

async function checkIn() {
  if (submitting.value) return
  submitting.value = true
  try {
    const r: any = await request('/api/checkin', { method: 'POST' })
    checkedToday.value = true
    message.success(r?.alreadyChecked ? '今天已经打卡啦～' : '打卡成功，连续 +1 🔥')
    emit('refresh')
  } catch (e: any) {
    message.error(e?.message || '打卡失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  // 「今天」只在客户端确定：服务端与浏览器时区可能不一致，SSR 阶段先渲染无高亮的一周骨架
  todayKey.value = ymd(new Date())
  load()
})
</script>
