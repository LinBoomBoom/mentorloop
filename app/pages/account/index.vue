<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-6">个人中心</h1>

    <div v-if="!auth.isLoggedIn" class="card p-8 text-center">
      <p class="text-muted">请先登录后查看个人中心</p>
      <NuxtLink to="/login" class="btn btn-primary mt-4">登录 / 注册</NuxtLink>
    </div>

    <template v-else>
      <!-- 资料 -->
      <div class="card p-6 mb-5">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold" :style="{ background: avatarBg }">
            {{ avatarText }}
          </div>
          <div class="min-w-0">
            <div class="text-lg font-bold truncate">{{ auth.user?.nickname || '学员' }}</div>
            <div class="text-sm text-muted truncate">{{ auth.user?.email || auth.user?.phone || '—' }}</div>
          </div>
          <span v-if="auth.isVip" class="ml-auto tag tag-vip !px-3">👑 VIP</span>
          <span v-else class="ml-auto chip">免费用户</span>
        </div>
      </div>

      <!-- 会员 -->
      <div class="card p-6 mb-5">
        <div class="flex items-center justify-between">
          <h3 class="font-bold">会员状态</h3>
          <NuxtLink to="/vip" class="text-sm text-brand-coral font-semibold">管理 / 开通 →</NuxtLink>
        </div>
        <div v-if="status?.subscription" class="mt-3 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted">套餐</span><b>{{ planName(status.subscription.planId) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">等级</span><b>VIP Lv.{{ status.subscription.level }}</b></div>
          <div class="flex justify-between"><span class="text-muted">有效期至</span><b>{{ fmtDate(status.subscription.expireAt) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">自动续费</span><b :class="status.subscription.autoRenew ? 'text-emerald-600' : 'text-muted'">{{ status.subscription.autoRenew ? '开启' : '关闭' }}</b></div>
        </div>
        <p v-else class="mt-3 text-sm text-muted">你当前为免费用户，开通会员解锁全部专属内容。</p>
      </div>

      <!-- 订单 -->
      <div class="card p-6">
        <h3 class="font-bold mb-3">订单记录</h3>
        <div v-if="status?.orders?.length" class="space-y-2">
          <div v-for="o in status.orders" :key="o.id" class="flex items-center justify-between text-sm py-2 border-b border-line last:border-0">
            <span class="font-mono text-xs text-muted">{{ o.id }}</span>
            <span class="text-sub">{{ planName(o.planId) }} · ¥{{ (o.amount/100).toFixed(2) }}</span>
            <span :class="o.status === 'paid' ? 'text-emerald-600' : 'text-amber-500'">{{ statusText(o.status) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-muted">暂无订单记录。</p>
      </div>

      <!-- 账号安全 -->
      <div class="card p-6 border border-red-200/60">
        <h3 class="font-bold mb-2">账号安全</h3>
        <p class="text-sm text-muted mb-3">注销后将永久删除你的账号、学习进度与答卷记录，且不可恢复。</p>
        <button class="btn border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" @click="showDelete = true">注销账号</button>

        <div v-if="showDelete" class="mt-4 space-y-3">
          <input class="input" :type="showDelPwd?'text':'password'" v-model="deletePwd" placeholder="请输入登录密码以确认" />
          <div class="flex items-center gap-3">
            <button class="btn border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" :disabled="deleteLoading" @click="doDelete">{{ deleteLoading ? '处理中…' : '确认注销' }}</button>
            <button class="btn" @click="showDelete = false">取消</button>
          </div>
          <p v-if="deleteError" class="text-sm text-red-500">{{ deleteError }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const auth = useAuthStore()
const status = ref<any>(null)

useSeoMeta({ title: '个人中心 · MentorLoop', ogUrl: safeOgUrl() })

const avatarText = computed(() => (auth.user?.nickname || '学').slice(0, 1).toUpperCase())
const avatarBg = computed(() => auth.isVip
  ? 'linear-gradient(120deg,#ff5e7e,#ff8a5c 55%,#ffc24b)'
  : 'linear-gradient(120deg,#94a3b8,#64748b)')

function planName(id?: string) { return id || '—' }
function statusText(s: string) { return s === 'paid' ? '已支付' : s === 'pending' ? '待支付' : s === 'refunded' ? '已退款' : s }
function fmtDate(ts?: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '—' }

const showDelete = ref(false)
const deletePwd = ref('')
const showDelPwd = ref(false)
const deleteLoading = ref(false)
const deleteError = ref('')
async function doDelete() {
  if (!deletePwd.value) { deleteError.value = '请输入密码'; return }
  deleteLoading.value = true; deleteError.value = ''
  try {
    await request('/api/auth/delete', { method: 'POST', body: { password: deletePwd.value } })
    auth.logout()
    await navigateTo('/')
  } catch (e: any) { deleteError.value = e.message } finally { deleteLoading.value = false }
}

onMounted(async () => {
  if (auth.isLoggedIn) {
    try { const r: any = await request('/api/vip/status'); status.value = r } catch { /* ignore */ }
  }
})
</script>
