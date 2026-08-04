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

    <!-- 近 7 天迷你打卡条 -->
    <div class="flex items-center gap-1.5 mt-3">
      <div
        v-for="d in last7"
        :key="d.date"
        class="flex-1 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold transition"
        :class="d.active ? 'text-white' : 'text-muted'"
        :style="{ background: d.active ? '#ea580c' : 'rgb(var(--line))' }"
        :title="`${d.date}${d.active ? ' · 已活跃' : ' · 未活跃'}`"
      >{{ d.label }}</div>
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

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
// 近 7 天活跃情况直接复用看板 heatmap，避免额外请求
const last7 = computed(() => {
  const src = (props.heatmap || []).slice(-7)
  return src.map((h) => {
    const [y, m, d] = h.date.split('-').map(Number)
    return { date: h.date, label: WEEK[new Date(y, m - 1, d).getDay()], active: h.count > 0 }
  })
})

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

onMounted(load)
</script>
