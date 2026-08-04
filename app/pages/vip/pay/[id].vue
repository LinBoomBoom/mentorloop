<template>
  <div class="max-w-lg mx-auto">
    <NuxtLink to="/vip" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand-coral transition mb-5">
      <Icon name="arrowLeft" :size="16" /> 返回会员中心
    </NuxtLink>

    <div v-if="phase === 'loading'" class="card h-64 shimmer"></div>

    <div v-else-if="phase === 'pay'" class="card p-7 reveal">
      <h1 class="text-xl font-extrabold">订单支付</h1>
      <div class="mt-4 flex items-end justify-between">
        <div>
          <div class="text-sm text-muted">{{ order.planName }}</div>
          <div class="text-3xl font-extrabold gradient-text mt-1">¥{{ (order.amount / 100).toFixed(2) }}</div>
        </div>
        <span class="chip" :class="order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'">
          {{ order.status === 'paid' ? '已支付' : '待支付' }}
        </span>
      </div>

      <!-- 沙箱演示通道：模拟支付 -->
      <div v-if="provider === 'sandbox'" class="mt-6 rounded-2xl border border-dashed border-line p-6 text-center">
        <div class="mx-auto w-32 h-32 rounded-2xl bg-ink/[.03] flex items-center justify-center mb-4">
          <Icon name="scan" :size="40" class="text-muted" />
        </div>
        <p class="text-sm text-muted mb-4">演示环境无真实收银台，点击下方按钮模拟完成支付</p>
        <button class="btn btn-primary btn-block" :disabled="paying" @click="simulatePay">
          <Icon v-if="paying" name="spinner" :size="16" class="animate-spin" />
          模拟支付成功
        </button>
      </div>

      <!-- 真实通道：展示二维码 / 跳转收银台 -->
      <div v-else class="mt-6 text-center">
        <p class="text-sm text-muted mb-3">请使用{{ provider === 'wechat' ? '微信' : '支付宝' }}扫码完成支付</p>
        <div class="mx-auto w-44 h-44 rounded-2xl bg-surface-2 border border-line flex items-center justify-center font-mono text-xs break-all p-3">
          {{ qrContent || '等待收银台…' }}
        </div>
        <a v-if="payUrl" :href="payUrl" target="_blank" class="btn btn-primary btn-block mt-4">打开收银台</a>
      </div>

      <p class="text-center text-xs text-muted mt-5">页面将自动刷新支付状态…</p>
      <p v-if="err" class="text-center text-sm text-rose-500 mt-3">{{ err }}</p>
    </div>

    <div v-else-if="phase === 'expired'" class="card p-8 text-center reveal">
      <div class="mx-auto w-16 h-16 rounded-full bg-rose-500/15 flex items-center justify-center mb-4">
        <Icon name="alertTriangle" :size="32" class="text-rose-500" />
      </div>
      <h1 class="text-xl font-extrabold">订单已过期</h1>
      <p class="text-muted mt-2">该订单超过支付时限（15 分钟），已自动取消。如需开通会员，请重新下单。</p>
      <div class="flex items-center justify-center gap-3 mt-5">
        <NuxtLink to="/vip" class="btn btn-primary">重新开通</NuxtLink>
      </div>
    </div>

    <div v-else-if="phase === 'success'" class="card p-8 text-center reveal">
      <div class="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
        <Icon name="check" :size="32" class="text-emerald-500" />
      </div>
      <h1 class="text-2xl font-extrabold">支付成功 🎉</h1>
      <p class="text-muted mt-2">VIP 权益已开通，正在跳转…</p>
    </div>

    <div v-else class="card p-8 text-center">
      <p class="text-rose-500">{{ err || '订单不存在' }}</p>
      <NuxtLink to="/vip" class="btn btn-ghost mt-4">返回会员中心</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const phase = ref('loading')
const order = ref<any>(null)
const provider = ref('sandbox')
const payUrl = ref('')
const qrContent = ref('')
const paying = ref(false)
const err = ref('')
let timer: any = null

useSeoMeta({ title: '订单支付 · MentorLoop', ogUrl: safeOgUrl() })

async function load() {
  try {
    const r: any = await request('/api/order/' + route.params.id)
    order.value = r.order
    provider.value = r.order.provider
    payUrl.value = r.payUrl || ''
    qrContent.value = r.qrContent || ''
    if (r.order.status === 'paid') { phase.value = 'success'; onPaid() }
    else if (r.order.status === 'expired') { phase.value = 'expired'; stopPoll() }
    else { phase.value = 'pay'; startPoll() }
  } catch (e: any) { err.value = e.message || '加载订单失败'; phase.value = 'error' }
}

function startPoll() {
  stopPoll()
  timer = setInterval(async () => {
    try {
      const r: any = await request('/api/order/' + route.params.id)
      if (r.order?.status === 'paid') { order.value = r.order; stopPoll(); onPaid() }
    } catch { /* ignore */ }
  }, 2000)
}
function stopPoll() { if (timer) { clearInterval(timer); timer = null } }

async function onPaid() {
  phase.value = 'success'
  try { await auth.fetchMe() } catch { /* ignore */ }
  setTimeout(() => router.replace('/vip'), 1600)
}

async function simulatePay() {
  paying.value = true; err.value = ''
  try {
    await request('/api/payment/sandbox/confirm', { method: 'POST', body: { orderId: order.value.id } })
    // 轮询会很快拿到 paid 状态
  } catch (e: any) { err.value = e.message; paying.value = false }
}

onMounted(load)
onBeforeUnmount(stopPoll)
</script>
