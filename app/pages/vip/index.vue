<template>
  <div>
    <div class="relative overflow-hidden rounded-3xl p-8 mb-7 text-white brand-gradient">
      <div class="aura !absolute"><div class="blob"></div></div>
      <div class="relative z-10">
        <div class="inline-flex items-center gap-2 chip !bg-white/20 !text-white mb-3"><Icon name="crown" :size="15" /> 会员中心</div>
        <h1 class="text-3xl font-extrabold">解锁专属特权</h1>
        <p class="mt-2 text-white/80 max-w-md">VIP 专属高阶试卷、AI 深度模拟面试、学习路径定制，助你高效上岸。</p>
        <div class="mt-4 inline-flex items-center gap-2 text-sm">当前身份：<b>{{ auth.isVip ? '👑 VIP 会员' : '免费用户' }}</b></div>
      </div>
    </div>

    <!-- 已开通：会员管理 -->
    <div v-if="auth.isLoggedIn && status" class="card p-6 mb-7 reveal">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Icon name="crown" :size="20" class="text-brand-coral" />
          <span class="text-lg font-extrabold">VIP 会员</span>
          <span class="chip bg-brand-coral/10 text-brand-coral">{{ planName(status.subscription?.planId) }}</span>
        </div>
        <div class="text-sm text-muted">有效期至 <b class="text-ink">{{ fmtDate(status.subscription?.expireAt) }}</b></div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <span class="chip" :class="status.subscription?.autoRenew ? 'bg-emerald-500/10 text-emerald-600' : 'bg-ink/5 text-muted'">
          自动续费：{{ status.subscription?.autoRenew ? '开启' : '关闭' }}
        </span>
        <button class="btn btn-ghost !py-2" :disabled="toggling" @click="toggleRenew">
          {{ status.subscription?.autoRenew ? '取消自动续费' : '开启自动续费' }}
        </button>
        <NuxtLink to="/account" class="btn btn-ghost !py-2">个人中心</NuxtLink>
      </div>
      <div v-if="status.orders?.length" class="mt-5 pt-4 border-t border-line">
        <h4 class="text-sm font-semibold mb-2 text-sub">订单记录</h4>
        <div class="space-y-1.5">
          <div v-for="o in status.orders" :key="o.id" class="flex items-center justify-between text-xs text-muted">
            <span class="font-mono">{{ o.id }}</span>
            <span>{{ planName(o.planId) }} · ¥{{ (o.amount/100).toFixed(2) }}</span>
            <span :class="o.status==='paid' ? 'text-emerald-600' : 'text-amber-500'">{{ statusText(o.status) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 套餐 -->
    <div v-if="!plans" class="grid md:grid-cols-3 gap-5"><div v-for="i in 3" :key="i" class="card h-64 shimmer"></div></div>
    <div v-else class="grid md:grid-cols-3 gap-5 stagger">
      <div v-for="p in plans" :key="p.id" class="card p-7 relative" :class="p.popular ? 'ring-2 ring-brand-coral/40' : ''">
        <span v-if="p.popular" class="absolute -top-3 left-7 tag tag-vip !px-3">最受欢迎</span>
        <h3 class="text-xl font-extrabold">{{ p.name }}</h3>
        <div class="mt-3 flex items-end gap-1">
          <span class="text-4xl font-extrabold gradient-text">¥{{ p.price }}</span>
          <span class="text-muted mb-1">/ {{ p.durationDays >= 360 ? '年' : (p.durationDays >= 90 ? '季' : '月') }}</span>
        </div>
        <p class="mt-2 text-xs text-muted">{{ p.desc }}</p>
        <ul class="mt-5 space-y-2.5">
          <li v-for="b in p.benefits" :key="b" class="flex items-start gap-2 text-sm text-sub">
            <Icon name="checkCircle" :size="17" class="text-emerald-500 shrink-0 mt-0.5" /> <span>{{ b }}</span>
          </li>
        </ul>
        <button class="btn btn-primary btn-block mt-6" :disabled="!enabled || buying === p.id" @click="buy(p)">
          <Icon v-if="buying === p.id" name="spinner" :size="16" class="animate-spin" />
          {{ buyLabel(p) }}
        </button>
      </div>
    </div>

    <p v-if="plans && !enabled" class="text-center text-xs text-muted mt-5">支付能力正在接入中，当前为演示版本。</p>
    <p v-if="err" class="text-center text-sm text-rose-500 mt-4">{{ err }}</p>
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
const toggling = ref(false)
const err = ref('')

onMounted(async () => {
  if (auth.isLoggedIn) {
    try { const r: any = await request('/api/vip/status'); status.value = r } catch { /* 未登录 */ }
  }
})

function planName(id?: string) {
  return plans.value?.find((p: any) => p.id === id)?.name || id || '—'
}
function statusText(s: string) { return s === 'paid' ? '已支付' : s === 'pending' ? '待支付' : s === 'refunded' ? '已退款' : s }
function fmtDate(ts?: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '—' }
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
async function toggleRenew() {
  if (!status.value?.subscription) return
  toggling.value = true
  try {
    const action = status.value.subscription.autoRenew ? 'cancel' : 'enable'
    const r: any = await request('/api/subscription', { method: 'POST', body: { action } })
    status.value.subscription.autoRenew = r.subscription.autoRenew
  } catch (e: any) { err.value = e.message } finally { toggling.value = false }
}
</script>
