<template>
  <div>
    <div class="max-w-xl w-full">
      <!-- 返回链接 -->
      <NuxtLink to="/vip" class="inline-flex items-center gap-1.5 text-sm text-sub hover:text-brand-coral transition mb-5">
        <Icon name="arrowLeft" :size="16" /> 返回会员中心
      </NuxtLink>

      <!-- 加载态 -->
      <a-card v-if="phase === 'loading'" class="shadow-card">
        <a-skeleton active :paragraph="{ rows: 5 }" />
      </a-card>

      <!-- 支付卡片 -->
      <a-card v-else-if="phase === 'pay'" class="shadow-card overflow-hidden">
        <!-- 顶部装饰条 -->
        <div class="h-1.5 brand-gradient -mt-6 -mx-6 mb-6"></div>

        <!-- 订单标题 -->
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <div class="text-xs text-muted mb-1">订单支付</div>
            <h1 class="text-xl font-extrabold text-ink">{{ order.planName }}</h1>
          </div>
          <a-tag :color="order.status === 'paid' ? 'green' : 'orange'" class="!px-3 !py-0.5 !text-xs shrink-0">
            {{ order.status === 'paid' ? '已支付' : '待支付' }}
          </a-tag>
        </div>

        <!-- 价格 -->
        <div class="rounded-2xl bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div class="text-sm text-sub">应付金额</div>
            <div class="text-4xl font-extrabold gradient-text mt-1">
              ¥{{ (order.amount / 100).toFixed(2) }}
            </div>
          </div>
          <div class="flex items-center gap-3 text-xs text-muted">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-line">
              <Icon name="shield" :size="12" /> 安全加密
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-line">
              <Icon name="refresh" :size="12" /> 自动到账
            </span>
          </div>
        </div>

        <!-- 沙箱演示通道 -->
        <div v-if="provider === 'sandbox'" class="rounded-2xl border border-dashed border-line bg-canvas p-6 text-center">
          <div class="mx-auto w-20 h-20 rounded-2xl bg-brand-coral/10 flex items-center justify-center mb-4">
            <Icon name="wallet" :size="36" class="text-brand-coral" />
          </div>
          <h3 class="font-bold text-ink mb-1">演示环境收银台</h3>
          <p class="text-sm text-muted mb-5">当前未接入真实支付，点击下方按钮即可模拟完成支付并开通 VIP。</p>
          <a-button type="primary" block size="large" :loading="paying" @click="simulatePay" class="!h-12 !text-base !font-bold">
            模拟支付成功
          </a-button>
        </div>

        <!-- 真实通道 -->
        <div v-else class="rounded-2xl border border-line bg-canvas p-6 text-center">
          <p class="text-sm text-sub mb-4">请使用 {{ provider === 'wechat' ? '微信' : '支付宝' }} 扫码完成支付</p>

          <div class="mx-auto w-48 h-48 rounded-2xl bg-white border-2 border-line flex items-center justify-center p-3 shadow-sm">
            <div v-if="qrContent" class="w-full h-full flex items-center justify-center">
              <!-- 真实场景可放 QR 图片，这里用等宽字符占位 -->
              <div class="font-mono text-[10px] leading-none text-ink break-all text-center select-all">{{ qrContent }}</div>
            </div>
            <div v-else class="text-center">
              <Icon name="scan" :size="40" class="text-muted mb-2" />
              <div class="text-xs text-muted">等待收银台…</div>
            </div>
          </div>

          <a :href="payUrl" target="_blank" v-if="payUrl" class="block mt-5">
            <a-button type="primary" block size="large" class="!h-12 !text-base !font-bold">
              打开{{ provider === 'wechat' ? '微信' : '支付宝' }}收银台
            </a-button>
          </a>

          <div class="mt-4 flex items-center justify-center gap-4 text-xs text-muted">
            <span class="flex items-center gap-1"><Icon name="refresh" :size="12" class="animate-spin" /> 自动检测支付结果</span>
            <span class="flex items-center gap-1"><Icon name="shield" :size="12" /> 资金安全</span>
          </div>
        </div>

        <p class="text-center text-xs text-muted mt-5">订单号 {{ order.id }} · 15 分钟内有效</p>
        <a-alert v-if="err" type="error" :message="err" show-icon class="mt-4" />
      </a-card>

      <!-- 订单过期 -->
      <a-card v-else-if="phase === 'expired'" class="shadow-card text-center py-8">
        <div class="mx-auto w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
          <Icon name="clock" :size="32" class="text-rose-500" />
        </div>
        <h2 class="text-xl font-extrabold text-ink mb-2">订单已过期</h2>
        <p class="text-sm text-muted mb-6 max-w-xs mx-auto">该订单超过支付时限（15 分钟），已自动取消。如需开通会员，请重新下单。</p>
        <NuxtLink to="/vip"><a-button type="primary" size="large">重新开通</a-button></NuxtLink>
      </a-card>

      <!-- 支付成功 -->
      <a-card v-else-if="phase === 'success'" class="shadow-card overflow-hidden">
        <div class="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-8"></div>

        <div class="text-center relative">
          <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-full flex justify-center gap-2 opacity-60">
            <Icon name="sparkles" :size="18" class="text-emerald-500" />
            <Icon name="sparkles" :size="14" class="text-brand-coral" />
            <Icon name="sparkles" :size="18" class="text-emerald-500" />
          </div>
          <div class="mx-auto w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5 shadow-sm">
            <Icon name="checkCircle" :size="44" class="text-emerald-500" />
          </div>
          <h1 class="text-2xl font-extrabold text-ink mb-2">支付成功</h1>
          <p class="text-sm text-muted">VIP 权益已开通，正在跳转会员中心…</p>
        </div>

        <div class="mt-6 rounded-2xl bg-surface p-5">
          <div class="flex items-center justify-between text-sm mb-3 pb-3 border-b border-line">
            <span class="text-sub">开通套餐</span>
            <b class="text-ink">{{ order.planName }}</b>
          </div>
          <div class="flex items-center justify-between text-sm mb-3 pb-3 border-b border-line">
            <span class="text-sub">支付金额</span>
            <b class="text-ink">¥{{ (order.amount / 100).toFixed(2) }}</b>
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
            <span class="text-sub">订单号</span>
            <span class="font-mono text-xs text-muted break-all text-left sm:text-right">{{ order.id }}</span>
          </div>
        </div>

        <div class="mt-6">
          <h4 class="text-sm font-bold text-ink mb-3">已解锁权益</h4>
          <ul class="grid sm:grid-cols-2 gap-2.5">
            <li v-for="b in unlockedBenefits" :key="b" class="flex items-center gap-2 text-sm text-sub">
              <Icon name="checkCircle" :size="16" class="text-emerald-500 shrink-0" />
              <span>{{ b }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-7 flex flex-col sm:flex-row gap-3">
          <NuxtLink to="/learn" class="flex-1">
            <a-button type="primary" block size="large" class="!h-12 !text-base !font-bold">开始学习</a-button>
          </NuxtLink>
          <NuxtLink to="/vip" class="flex-1">
            <a-button block size="large" class="!h-12 !text-base">查看会员中心</a-button>
          </NuxtLink>
        </div>

        <p class="text-center text-xs text-muted mt-5">{{ redirectSeconds }} 秒后自动跳转</p>
      </a-card>

      <!-- 其他错误 -->
      <a-card v-else class="shadow-card text-center py-8">
        <div class="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <Icon name="alertTriangle" :size="32" class="text-amber-500" />
        </div>
        <h2 class="text-xl font-extrabold text-ink mb-2">{{ err || '订单不存在' }}</h2>
        <NuxtLink to="/vip" class="mt-4 inline-block"><a-button type="primary">返回会员中心</a-button></NuxtLink>
      </a-card>
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
let redirectTimer: any = null
const redirectSeconds = ref(3)

const unlockedBenefits = [
  '高阶模拟试卷',
  'AI 深度模拟面试',
  '学习路径定制',
  'AI 简历诊断',
  'VIP 专属题库',
  '内推资源库'
]

useSeoMeta({ title: '订单支付 · MentorLoop', ogUrl: safeOgUrl() })

async function load() {
  try {
    const r: any = await request('/api/order/' + route.params.id)
    order.value = r.order
    provider.value = r.order.provider
    payUrl.value = r.payUrl || ''
    qrContent.value = r.qrContent || ''
    if (r.order.status === 'paid') { onPaid() }
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
      else if (r.order?.status === 'expired') { order.value = r.order; stopPoll(); phase.value = 'expired' }
    } catch { /* ignore */ }
  }, 2000)
}
function stopPoll() { if (timer) { clearInterval(timer); timer = null } }

function startRedirectCountdown() {
  redirectSeconds.value = 3
  redirectTimer = setInterval(() => {
    redirectSeconds.value -= 1
    if (redirectSeconds.value <= 0) {
      clearInterval(redirectTimer)
      router.replace('/vip')
    }
  }, 1000)
}

async function onPaid() {
  phase.value = 'success'
  try { await auth.fetchMe() } catch { /* ignore */ }
  startRedirectCountdown()
}

async function simulatePay() {
  paying.value = true; err.value = ''
  try {
    await request('/api/payment/sandbox/confirm', { method: 'POST', body: { orderId: order.value.id } })
    // 轮询会很快拿到 paid 状态
  } catch (e: any) { err.value = e.message; paying.value = false }
}

onMounted(load)
onBeforeUnmount(() => { stopPoll(); if (redirectTimer) clearInterval(redirectTimer) })
</script>

<style scoped>
.shadow-card {
  box-shadow: 0 10px 40px -12px rgba(0, 0, 0, .08);
}
</style>
