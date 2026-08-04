<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-6">个人中心</h1>

    <div v-if="!isAuthed" class="card p-8 text-center">
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
            <div class="text-lg font-bold truncate">{{ currentUser?.nickname || '学员' }}</div>
            <div class="text-sm text-muted truncate">{{ currentUser?.email || currentUser?.phone || '—' }}</div>
          </div>
          <span v-if="isVip" class="ml-auto tag tag-vip !px-3">👑 VIP</span>
          <span v-else class="ml-auto chip">免费用户</span>
        </div>
      </div>

      <!-- 会员 -->
      <div class="card p-6 mb-5">
        <div class="flex items-center justify-between">
          <h3 class="font-bold">会员状态</h3>
          <NuxtLink to="/vip" class="text-sm text-brand-coral font-semibold">管理 / 开通 →</NuxtLink>
        </div>
        <!-- 有订阅记录：完整展示；仅有 vip 等级（如后台直接授予）：降级展示；auth store 已知的 VIP 兜底展示，
             避免 status API 尚未返回时截屏/首屏出现「免费用户」闪烁。 -->
        <div v-if="status?.subscription" class="mt-3 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted">套餐</span><b>{{ planName(status.subscription.planId) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">等级</span><b>VIP Lv.{{ status.subscription.level }}</b></div>
          <div class="flex justify-between"><span class="text-muted">有效期至</span><b>{{ fmtExpire(status.subscription.expireAt) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">自动续费</span><b :class="status.subscription.autoRenew ? 'text-emerald-600' : 'text-muted'">{{ status.subscription.autoRenew ? '开启' : '关闭' }}</b></div>
        </div>
        <div v-else-if="status?.vip?.active || isVip" class="mt-3 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted">等级</span><b>VIP Lv.{{ status?.vip?.level ?? currentUser?.vip?.level ?? '—' }}</b></div>
          <div class="flex justify-between"><span class="text-muted">有效期至</span><b>{{ fmtExpire(status?.vip?.expireAt ?? currentUser?.vip?.expireAt) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">开通方式</span><b class="text-muted">{{ status?.vip ? '平台授予' : '已开通会员' }}</b></div>
        </div>
        <p v-else class="mt-3 text-sm text-muted">你当前为免费用户，开通会员解锁全部专属内容。</p>
      </div>

      <!-- VIP 专属功能 -->
      <div v-if="isVip" class="grid sm:grid-cols-2 gap-4 mb-5">
        <NuxtLink to="/learn/path" class="card p-5 hover:-translate-y-0.5 transition group">
          <div class="flex items-center gap-2 mb-1.5"><Icon name="compass" :size="18" class="text-brand-coral" /><span class="font-bold">我的学习路径</span></div>
          <p class="text-xs text-muted">基于薄弱点的 AI 定制进阶路线</p>
        </NuxtLink>
        <NuxtLink to="/interview/sim" class="card p-5 hover:-translate-y-0.5 transition group">
          <div class="flex items-center gap-2 mb-1.5"><Icon name="sparkles" :size="18" class="text-brand-coral" /><span class="font-bold">AI 模拟面试</span></div>
          <p class="text-xs text-muted">多轮实战 + 逐题评分反馈</p>
        </NuxtLink>
        <NuxtLink to="/resume/diag" class="card p-5 hover:-translate-y-0.5 transition group">
          <div class="flex items-center gap-2 mb-1.5"><Icon name="document" :size="18" class="text-brand-coral" /><span class="font-bold">AI 简历诊断</span></div>
          <p class="text-xs text-muted">AI 把脉简历亮点与短板</p>
        </NuxtLink>
        <NuxtLink to="/referral" class="card p-5 hover:-translate-y-0.5 transition group">
          <div class="flex items-center gap-2 mb-1.5"><Icon name="briefcase" :size="18" class="text-brand-coral" /><span class="font-bold">内推资源库</span></div>
          <p class="text-xs text-muted">VIP 专属内推岗位 + 申请</p>
        </NuxtLink>
      </div>

      <!-- 订单 -->
      <div class="card p-6 mb-5">
        <h3 class="font-bold mb-3">订单记录</h3>
        <div v-if="status?.orders?.length" class="space-y-2">
          <div v-for="o in status.orders" :key="o.id" class="flex flex-wrap items-center justify-between gap-2 text-sm py-2 border-b border-line last:border-0">
            <span class="font-mono text-xs text-muted">{{ o.id }}</span>
            <span class="text-sub">{{ planName(o.planId) }} · ¥{{ (o.amount/100).toFixed(2) }}</span>
            <span :class="orderColor(o.status)">{{ statusText(o.status) }}</span>
            <NuxtLink v-if="o.status === 'pending'" :to="'/vip/pay/' + o.id" class="btn btn-primary !py-1 !px-3 !text-xs">继续支付</NuxtLink>
          </div>
        </div>
        <p v-else class="text-sm text-muted">暂无订单记录。</p>
      </div>

      <!-- 账号安全 -->
      <div class="card p-6 border border-red-200/60 mb-5">
        <h3 class="font-bold mb-2">账号安全</h3>
        <p class="text-sm text-muted mb-3">注销后将永久删除你的账号、学习进度与答卷记录，且不可恢复。</p>
        <button class="btn border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" @click="showDelete = true">注销账号</button>

        <!-- 用 form 包裹并显式提供隐藏的 username 诱饵字段：
             否则浏览器密码管理器会在整个文档范围内寻找「用户名」输入框，
             把当前账号自动填进侧边导航的搜索框（type=search 被误判为账号字段）。 -->
        <form v-if="showDelete" class="mt-4 space-y-3" autocomplete="off" @submit.prevent="doDelete">
          <input type="text" :value="currentUser?.email || currentUser?.phone || ''" autocomplete="username"
                 tabindex="-1" aria-hidden="true" readonly
                 style="position:absolute;opacity:0;height:0;width:0;pointer-events:none" />
          <input class="input" :type="showDelPwd?'text':'password'" v-model="deletePwd"
                 placeholder="请输入登录密码以确认" autocomplete="current-password" name="ml-delete-pwd" />
          <div class="flex items-center gap-3">
            <button type="submit" class="btn border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" :disabled="deleteLoading">{{ deleteLoading ? '处理中…' : '确认注销' }}</button>
            <button type="button" class="btn" @click="cancelDelete">取消</button>
          </div>
          <p v-if="deleteError" class="text-sm text-red-500">{{ deleteError }}</p>
        </form>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const auth = useAuthStore()

// 个人中心必须 SSR 感知登录态：Pinia auth store 在 SSR 阶段未填充（它在 onNuxtReady 才 init），
// 若页面用 auth.isLoggedIn 做渲染闸门，服务端会永远输出「请先登录」的骨架。
// 这里直接通过 HttpOnly cookie 在 setup/SSR 阶段拉取 /api/auth/me 与 /api/vip/status，
// 用本地 ref 驱动首屏，避免闪烁与 hydration mismatch。
const { data: me } = await useFetch('/api/auth/me', { server: true, default: () => null })
const { data: status } = await useFetch('/api/vip/status', { server: true, default: () => null })
const isAuthed = computed(() => !!me.value || auth.isLoggedIn)
const currentUser = computed(() => me.value?.user || auth.user)
const isVip = computed(() => status.value?.vip?.active || auth.isVip)

useSeoMeta({ title: '个人中心 · MentorLoop', ogUrl: safeOgUrl() })

const avatarText = computed(() => (currentUser.value?.nickname || '学').slice(0, 1).toUpperCase())
const avatarBg = computed(() => isVip.value
  ? 'linear-gradient(120deg,#ff5e7e,#ff8a5c 55%,#ffc24b)'
  : 'linear-gradient(120deg,#94a3b8,#64748b)')

const { data: plansRes } = await useFetch('/api/vip/plans')
function planName(id?: string) { return plansRes.value?.plans?.find((p: any) => p.id === id)?.name || id || '—' }
function statusText(s: string) { return s === 'paid' ? '已支付' : s === 'pending' ? '待支付' : s === 'expired' ? '已过期' : s === 'refunded' ? '已退款' : s }
function orderColor(s: string) { return s === 'paid' ? 'text-emerald-600' : s === 'pending' ? 'text-amber-500' : s === 'expired' ? 'text-rose-400' : 'text-muted' }
function fmtDate(ts?: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '—' }
// 无到期时间 = 平台授予的长期会员，展示「长期有效」而非空白/破折号
function fmtExpire(ts?: number | null) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '长期有效' }

const showDelete = ref(false)
const deletePwd = ref('')
const showDelPwd = ref(false)
const deleteLoading = ref(false)
const deleteError = ref('')
function cancelDelete() { showDelete.value = false; deletePwd.value = ''; deleteError.value = '' }
async function doDelete() {
  if (deleteLoading.value) return
  if (!deletePwd.value) { deleteError.value = '请输入密码'; return }
  deleteLoading.value = true; deleteError.value = ''
  try {
    await request('/api/auth/delete', { method: 'POST', body: { password: deletePwd.value } })
    auth.logout()
    await navigateTo('/')
  } catch (e: any) { deleteError.value = e.message } finally { deleteLoading.value = false }
}

</script>
