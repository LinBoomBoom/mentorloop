<template>
  <div>
    <div class="relative overflow-hidden rounded-3xl p-8 mb-7 text-white brand-gradient">
      <div class="aura !absolute"><div class="blob"></div></div>
      <div class="relative z-10">
        <div class="inline-flex items-center gap-2 chip !bg-white/20 !text-white mb-3"><Icon name="crown" :size="15" /> 会员中心</div>
        <h1 class="text-3xl font-extrabold">{{ auth.isVip ? '您已解锁全部专属特权' : '解锁专属特权' }}</h1>
        <p class="mt-2 text-white/80 max-w-md">{{ auth.isVip ? '高阶试卷、AI 模拟面试、学习路径已全部开放，前往下方继续学习或管理你的会员。' : 'VIP 专属高阶试卷、AI 深度模拟面试、学习路径定制，助你高效上岸。' }}</p>
        <div class="mt-4 inline-flex items-center gap-2 text-sm">当前身份：<b>{{ auth.isVip ? '👑 VIP 会员' : '免费用户' }}</b></div>
      </div>
    </div>

    <!-- 已开通：会员管理 -->
    <a-card v-if="auth.isLoggedIn && status" title="VIP 会员" class="mb-7 reveal">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Icon name="crown" :size="20" class="text-brand-coral" />
          <span class="text-lg font-extrabold">VIP 会员</span>
          <a-tag v-if="status.subscription" color="var(--brand)">{{ planName(status.subscription.planId) }}</a-tag>
          <a-tag v-else color="var(--brand)">VIP Lv.{{ status.vip?.level || '—' }}</a-tag>
        </div>
        <div class="text-sm text-muted">有效期至 <b class="text-ink">{{ fmtExpire(status.subscription?.expireAt ?? status.vip?.expireAt) }}</b></div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <a-tag color="default">自动续费：关闭（一次性付费，到期不扣款）</a-tag>
        <NuxtLink to="/account"><a-button>个人中心</a-button></NuxtLink>
      </div>
      <div v-if="status.orders?.length" class="mt-5 pt-4 border-t border-line">
        <h4 class="text-sm font-semibold mb-2 text-sub">订单记录</h4>
        <div class="space-y-2">
          <div v-for="o in status.orders" :key="o.id" class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span class="font-mono">{{ o.id }}</span>
            <span class="text-sub">{{ planName(o.planId) }} · ¥{{ (o.amount/100).toFixed(2) }}</span>
            <span :class="orderColor(o.status)">{{ statusText(o.status) }}</span>
            <NuxtLink v-if="o.status === 'pending'" :to="'/vip/pay/' + o.id"><a-button type="primary" size="small">继续支付</a-button></NuxtLink>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 套餐 -->
    <div v-if="!plans" class="grid md:grid-cols-3 gap-5"><div v-for="i in 3" :key="i" class="card h-64 shimmer"></div></div>
    <div v-else class="grid md:grid-cols-3 gap-5 stagger">
      <a-card v-for="p in plans" :key="p.id" hoverable class="flex flex-col"
              :class="p.popular ? '!border-brand-coral/40 ring-2 ring-brand-coral/40' : ''"
              :body-style="{ flex:'1 1 auto', display:'flex', flexDirection:'column', padding:'28px' }">
        <a-tag v-if="p.popular" color="var(--brand)" class="absolute -top-3 left-7 !px-3 z-10">最受欢迎</a-tag>
        <h3 class="text-xl font-extrabold">{{ p.name }}</h3>
        <div class="mt-3 flex items-end gap-1">
          <span class="text-4xl font-extrabold gradient-text">¥{{ p.price }}</span>
          <span class="text-muted mb-1">/ {{ Math.round(p.durationDays / 30) }} 个月</span>
        </div>
        <p class="mt-2 text-xs text-muted">{{ p.desc }} · 一次性开通，到期不自动扣款</p>
        <ul class="mt-5 space-y-2.5 flex-1">
          <li v-for="b in p.benefits" :key="b" class="flex items-start gap-2 text-sm text-sub">
            <Icon name="checkCircle" :size="17" class="text-emerald-500 shrink-0 mt-0.5" /> <span>{{ b }}</span>
          </li>
        </ul>
        <a-button type="primary" block class="mt-6" :disabled="!enabled || buying === p.id" @click="buy(p)">
          <template v-if="buying === p.id" #icon><Icon name="spinner" :size="16" class="animate-spin" /></template>
          {{ buyLabel(p) }}
        </a-button>
      </a-card>
    </div>

    <p v-if="plans && !enabled" class="text-center text-xs text-muted mt-5">支付能力正在接入中，当前为演示版本。</p>
    <a-alert v-if="err" type="error" :message="err" show-icon class="mt-4 max-w-xl mx-auto" />
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const auth = useAuthStore()
useSeoMeta({
  title: '会员中心',
  description: '开通 MentorLoop VIP：专属高阶模拟试卷、AI 深度模拟面试、学习路径定制，助你高效上岸。',
  ogTitle: '会员中心 · MentorLoop',
  ogType: 'website',
  ogUrl: safeOgUrl()
})

const { data: plansRes } = await useFetch('/api/vip/plans')
const plans = computed(() => plansRes.value?.plans || null)
const enabled = computed(() => !!plansRes.value?.enabled)

const status = ref<any>(null)
const buying = ref('')
const err = ref('')

onMounted(async () => {
  if (auth.isLoggedIn) {
    try { const r: any = await request('/api/vip/status'); status.value = r } catch { /* 未登录 */ }
  }
})

function planName(id?: string) {
  return plans.value?.find((p: any) => p.id === id)?.name || id || '—'
}
function statusText(s: string) { return s === 'paid' ? '已支付' : s === 'pending' ? '待支付' : s === 'expired' ? '已过期' : s === 'refunded' ? '已退款' : s }
function orderColor(s: string) { return s === 'paid' ? 'text-emerald-600' : s === 'pending' ? 'text-amber-500' : s === 'expired' ? 'text-rose-400' : 'text-muted' }
function fmtDate(ts?: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '—' }
function fmtExpire(ts?: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '长期有效' }
function buyLabel(p: any) {
  if (auth.isVip) return '续费 / 升级'
  return p.popular ? '立即开通' : '选择此套餐'
}
async function buy(p: any) {
  if (!auth.isLoggedIn) { await navigateTo('/login?redirect=/vip'); return }
  buying.value = p.id; err.value = ''
  try {
    const r: any = await request('/api/order/create', { method: 'POST', body: { planId: p.id } })
    await navigateTo('/vip/pay/' + r.orderId)
  } catch (e: any) { err.value = e.message || '创建订单失败' } finally { buying.value = '' }
}
</script>
