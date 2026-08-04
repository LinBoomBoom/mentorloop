<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="section-title mb-0.5">每日打卡</h3>
        <p class="text-[11px] text-muted">坚持学习，点亮你的成长轨迹</p>
      </div>
      <a-button type="primary" :disabled="checkedToday" :loading="submitting" @click="checkIn">
        <template #icon><Icon name="flame" :size="15" /></template>
        {{ checkedToday ? '今日已打卡' : '立即打卡' }}
      </a-button>
    </div>

    <div class="flex items-center gap-6 mb-4">
      <a-statistic title="连续打卡" :value="streak" suffix="天" :value-style="{ color: '#ff5e7e', fontWeight: 700 }" />
      <a-statistic title="累计打卡" :value="totalDays" suffix="天" />
      <a-statistic title="最长连续" :value="longest" suffix="天" />
    </div>

    <ClientOnly>
      <a-calendar v-if="loaded" :date-cell-render="dateCellRender" />
      <template #fallback>
        <div class="h-[320px] shimmer rounded-xl"></div>
      </template>
    </ClientOnly>

    <p class="text-[11px] text-muted mt-2">完成课程小节学习或每日打卡，都会点亮首页「学习热力图」对应日期。</p>
  </div>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
const { request } = useApi()

const data = ref<any>(null)
const loaded = ref(false)
const submitting = ref(false)

const datesSet = computed(() => new Set((data.value?.dates) || []))
const checkedToday = computed(() => !!data.value?.checkedToday)
const streak = computed(() => data.value?.streak || 0)
const longest = computed(() => data.value?.longest || 0)
const totalDays = computed(() => data.value?.totalDays || 0)

function dateCellRender(info: any) {
  const ds = info.current.format('YYYY-MM-DD')
  const checked = datesSet.value.has(ds)
  return checked
    ? h('div', { class: 'w-1.5 h-1.5 rounded-full mx-auto mt-1', style: { background: '#ff5e7e' } })
    : null
}

async function load() {
  try {
    data.value = await request('/api/checkin')
  } catch (e) {
    data.value = { dates: [], checkedToday: false, streak: 0, longest: 0, totalDays: 0 }
  } finally {
    loaded.value = true
  }
}

async function checkIn() {
  submitting.value = true
  try {
    const r = await request('/api/checkin', { method: 'POST' })
    message.success(r.alreadyChecked ? '今天已经打卡啦～' : '打卡成功，连续 +1 🔥')
    await load()
  } catch (e: any) {
    message.error(e?.message || '打卡失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
