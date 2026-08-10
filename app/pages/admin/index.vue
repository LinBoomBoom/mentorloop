<template>
  <div>
    <h1 class="page-title mb-1">数据看板</h1>
    <p class="text-muted mb-6">平台核心指标一览（实时读取生产库）。</p>

    <div v-if="loading" class="text-muted">加载中…</div>
    <a-card v-else-if="err" class="text-center" :body-style="{ padding: '24px' }"><span class="text-muted">{{ err }}</span></a-card>
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <a-card v-for="s in stats" :key="s.label" :body-style="{ padding: '20px' }">
          <div class="text-3xl font-extrabold brand-gradient-text">{{ s.value }}</div>
          <div class="text-sm text-muted mt-1">{{ s.label }}</div>
        </a-card>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <a-card :body-style="{ padding: '20px' }">
          <h3 class="font-bold mb-3">内容与题库</h3>
          <ul class="space-y-2 text-sm">
            <li class="flex justify-between"><span class="text-muted">模块 / 章节 / 小节</span><b>{{ d.modules }} / {{ d.chapters }} / {{ d.sections }}</b></li>
            <li class="flex justify-between"><span class="text-muted">试卷（VIP 专属）</span><b>{{ d.examSets }}（{{ d.vipSets }}）</b></li>
            <li class="flex justify-between"><span class="text-muted">面试题</span><b>{{ d.interview }}</b></li>
            <li class="flex justify-between"><span class="text-muted">考试记录</span><b>{{ d.examRecords }}</b></li>
          </ul>
        </a-card>
        <a-card :body-style="{ padding: '20px' }">
          <h3 class="font-bold mb-3">用户与付费</h3>
          <ul class="space-y-2 text-sm">
            <li class="flex justify-between"><span class="text-muted">注册用户（管理员）</span><b>{{ d.users }}（{{ d.admins }}）</b></li>
            <li class="flex justify-between"><span class="text-muted">封禁用户</span><b :class="d.banned ? 'text-rose-500' : ''">{{ d.banned }}</b></li>
            <li class="flex justify-between"><span class="text-muted">有效订阅</span><b>{{ d.activeSubs }}</b></li>
            <li class="flex justify-between"><span class="text-muted">订单 / 已支付</span><b>{{ d.orders }} / {{ d.paidOrders }}</b></li>
            <li class="flex justify-between"><span class="text-muted">累计实收</span><b class="text-emerald-600">¥{{ ((d.revenue || 0) / 100).toFixed(2) }}</b></li>
          </ul>
        </a-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()
const loading = ref(true)
const err = ref('')
const d = ref<any>({})

const stats = computed(() => [
  { label: '注册用户', value: d.value.users },
  { label: '管理员', value: d.value.admins },
  { label: '封禁', value: d.value.banned },
  { label: '模块', value: d.value.modules },
  { label: '章节', value: d.value.chapters },
  { label: '小节', value: d.value.sections },
  { label: '试卷', value: d.value.examSets },
  { label: '面试题', value: d.value.interview },
  { label: '考试记录', value: d.value.examRecords },
  { label: '有效订阅', value: d.value.activeSubs },
  { label: '已支付订单', value: d.value.paidOrders },
  { label: '累计实收(元)', value: ((d.value.revenue || 0) / 100).toFixed(0) }
])

useSeoMeta({ title: '管理后台 · 数据看板 · MentorLoop' })

onMounted(async () => {
  try {
    const r: any = await request('/api/admin/dashboard')
    d.value = r.data || {}
  } catch (e: any) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.brand-gradient-text { background: linear-gradient(120deg, #e11d48, #be185d); -webkit-background-clip: text; background-clip: text; color: transparent; }
</style>
