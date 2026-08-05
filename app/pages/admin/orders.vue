<template>
  <div>
    <h1 class="text-2xl font-extrabold mb-1">订单 / 订阅</h1>
    <p class="text-muted mb-5">付费订单与会员订阅记录（只读）。</p>

    <h3 class="font-bold mb-2">订单（{{ orders.length }}）</h3>
    <a-card class="overflow-x-auto mb-6" :body-style="{ padding: '0' }">
      <table class="w-full text-sm">
        <thead><tr class="text-left text-muted border-b border-line">
          <th class="p-3">订单号</th><th class="p-3">用户</th><th class="p-3">套餐</th><th class="p-3">金额</th><th class="p-3">状态</th><th class="p-3">创建时间</th>
        </tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" class="border-b border-line last:border-0">
            <td class="p-3 font-mono text-xs text-muted">{{ o.id }}</td>
            <td class="p-3">{{ short(o.user_id) }}</td>
            <td class="p-3">{{ o.plan_id }}</td>
            <td class="p-3">¥{{ (o.amount / 100).toFixed(2) }}</td>
            <td class="p-3"><a-tag :color="o.status==='paid'?'green':o.status==='refunded'?'gold':''">{{ statusText(o.status) }}</a-tag></td>
            <td class="p-3 text-muted">{{ fmt(o.created_at) }}</td>
          </tr>
          <tr v-if="!orders.length"><td colspan="6" class="p-6 text-center text-muted">暂无订单</td></tr>
        </tbody>
      </table>
    </a-card>

    <h3 class="font-bold mb-2">订阅（{{ subs.length }}）</h3>
    <a-card class="overflow-x-auto" :body-style="{ padding: '0' }">
      <table class="w-full text-sm">
        <thead><tr class="text-left text-muted border-b border-line">
          <th class="p-3">订阅号</th><th class="p-3">用户</th><th class="p-3">套餐</th><th class="p-3">等级</th><th class="p-3">状态</th><th class="p-3">到期</th><th class="p-3">自动续费</th>
        </tr></thead>
        <tbody>
          <tr v-for="s in subs" :key="s.id" class="border-b border-line last:border-0">
            <td class="p-3 font-mono text-xs text-muted">{{ s.id }}</td>
            <td class="p-3">{{ short(s.user_id) }}</td>
            <td class="p-3">{{ s.plan_id }}</td>
            <td class="p-3">Lv.{{ s.level }}</td>
            <td class="p-3"><a-tag :color="s.status==='active'?'green':''">{{ s.status }}</a-tag></td>
            <td class="p-3 text-muted">{{ fmt(s.expire_at) }}</td>
            <td class="p-3">{{ s.auto_renew ? '开启' : '关闭' }}</td>
          </tr>
          <tr v-if="!subs.length"><td colspan="7" class="p-6 text-center text-muted">暂无订阅</td></tr>
        </tbody>
      </table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()
const orders = ref<any[]>([])
const subs = ref<any[]>([])

useSeoMeta({ title: '管理后台 · 订单订阅 · MentorLoop' })

function short(id?: string) { return id ? id.slice(0, 10) + '…' : '—' }
function fmt(ts?: number) { return ts ? new Date(ts).toLocaleString('zh-CN') : '—' }
function statusText(s: string) { return s === 'paid' ? '已支付' : s === 'pending' ? '待支付' : s === 'refunded' ? '已退款' : s }

onMounted(async () => {
  const [o, s]: any[] = await Promise.all([
    request('/api/admin/orders').catch(() => ({ items: [] })),
    request('/api/admin/subscriptions').catch(() => ({ items: [] }))
  ])
  orders.value = o.items || []
  subs.value = s.items || []
})
</script>
