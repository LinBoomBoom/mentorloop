<template>
  <div>
    <div class="relative overflow-hidden rounded-3xl p-8 mb-7 text-white brand-gradient">
      <div class="aura !absolute"><div class="blob"></div></div>
      <div class="relative z-10">
        <div class="inline-flex items-center gap-2 chip !bg-white/20 !text-white mb-3"><Icon name="crown" :size="15" /> 会员中心</div>
        <h1 class="text-3xl font-extrabold">解锁专属特权</h1>
        <p class="mt-2 text-white/80 max-w-md">VIP 专属试卷、AI 深度模拟面试、学习路径定制，助你高效上岸。</p>
        <div class="mt-4 inline-flex items-center gap-2 text-sm">当前身份：<b>{{ auth.isVip ? '👑 VIP 会员' : '免费用户' }}</b></div>
      </div>
    </div>

    <div v-if="!plans" class="grid md:grid-cols-2 gap-5"><div v-for="i in 2" :key="i" class="card h-64 shimmer"></div></div>
    <div v-else class="grid md:grid-cols-2 gap-5 stagger">
      <div v-for="p in plans" :key="p.id" class="card p-7 relative" :class="p.id === 'yearly' ? 'ring-2 ring-brand-coral/40' : ''">
        <span v-if="p.id === 'yearly'" class="absolute -top-3 left-7 tag tag-vip !px-3">最受欢迎</span>
        <h3 class="text-xl font-extrabold">{{ p.name }}</h3>
        <div class="mt-3 flex items-end gap-1">
          <span class="text-4xl font-extrabold gradient-text">¥{{ p.price }}</span>
          <span class="text-muted mb-1">/ {{ p.id === 'yearly' ? '年' : '月' }}</span>
        </div>
        <ul class="mt-5 space-y-2.5">
          <li v-for="b in p.benefits" :key="b" class="flex items-center gap-2 text-sm text-sub">
            <Icon name="checkCircle" :size="17" class="text-emerald-500" /> {{ b }}
          </li>
        </ul>
        <button class="btn btn-primary btn-block mt-6" :disabled="!enabled" @click="buy(p)">
          {{ enabled ? '立即开通' : '敬请期待 · 即将上线' }}
        </button>
        <div v-if="!enabled" class="mt-4 pt-4 border-t border-line">
          <p class="text-xs text-muted text-center mb-2">支付即将上线，留邮箱第一时间通知你</p>
          <div v-if="submitted" class="text-center text-sm text-emerald-600 font-semibold">✓ 已记录，上线第一时间通知你</div>
          <form v-else class="flex gap-2" @submit.prevent="notify">
            <input v-model="email" type="email" required placeholder="you@example.com" class="input !py-2.5 text-sm" aria-label="邮箱" />
            <button class="btn btn-ghost shrink-0" :disabled="!email" type="submit">通知我</button>
          </form>
        </div>
      </div>
    </div>
    <p v-if="plans && !enabled" class="text-center text-xs text-muted mt-5">支付能力正在接入中，当前为演示版本，套餐与权益已就绪。也可先去 <NuxtLink to="/exam" class="text-brand-coral font-semibold">浏览免费试卷 →</NuxtLink></p>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const auth = useAuthStore()
useSeoMeta({
  title: '会员中心',
  description: '开通 MentorLoop VIP：专属模拟试卷、AI 深度模拟面试、学习路径定制，助你高效上岸。',
  ogTitle: '会员中心 · MentorLoop',
  ogDescription: 'VIP 专属试卷、AI 模拟面试与学习路径定制。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
const { data: plansRes } = await useFetch('/api/vip/plans')
const plans = computed(() => plansRes.value?.plans || null)
const enabled = computed(() => !!plansRes.value?.enabled)
const notice = ref('')
const email = ref('')
const submitted = ref(false)
function buy(_p: any) { notice.value = '支付能力即将上线，敬请期待'; setTimeout(() => notice.value = '', 2600) }
function notify() {
  if (!email.value) return
  // 演示环境：仅本地记录意向，接入支付后改为写入订阅表并发送通知
  submitted.value = true
}
</script>
