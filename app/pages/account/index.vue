<template>
  <!-- 用 flex 列容器 + gap 统一控距：antd 的 .ant-card 运行时会重置 margin，
       写在卡片上的 mb-5 会被覆盖导致贴死；容器 gap 是布局属性，不受子元素 margin 影响 -->
  <div class="max-w-2xl mx-auto flex flex-col gap-5">
    <h1 class="text-2xl font-extrabold">个人中心</h1>

    <a-card v-if="!isAuthed" class="text-center py-8">
      <p class="text-muted">请先登录后查看个人中心</p>
      <NuxtLink to="/login" class="inline-block mt-4"><a-button type="primary">登录 / 注册</a-button></NuxtLink>
    </a-card>

    <template v-else>
      <!-- 资料 -->
      <a-card>
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold" :style="{ background: avatarBg }">
            {{ avatarText }}
          </div>
          <div class="min-w-0">
            <div class="text-lg font-bold truncate">{{ currentUser?.nickname || '学员' }}</div>
            <div class="text-sm text-muted truncate">{{ currentUser?.email || currentUser?.phone || '—' }}</div>
          </div>
          <a-tag v-if="isVip" color="#ff5e7e" class="ml-auto !px-3 !text-sm">👑 VIP</a-tag>
          <a-tag v-else class="ml-auto" color="default">免费用户</a-tag>
        </div>
      </a-card>

      <!-- 会员 -->
      <a-card title="会员状态">
        <template #extra><NuxtLink to="/vip" class="text-sm text-brand-coral font-semibold">管理 / 开通 →</NuxtLink></template>
        <div v-if="status?.subscription" class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted">套餐</span><b>{{ planName(status.subscription.planId) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">等级</span><b>VIP Lv.{{ status.subscription.level }}</b></div>
          <div class="flex justify-between"><span class="text-muted">有效期至</span><b>{{ fmtExpire(status.subscription.expireAt) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">自动续费</span><b :class="status.subscription.autoRenew ? 'text-emerald-600' : 'text-muted'">{{ status.subscription.autoRenew ? '开启' : '关闭' }}</b></div>
        </div>
        <div v-else-if="status?.vip?.active || isVip" class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted">等级</span><b>VIP Lv.{{ status?.vip?.level ?? currentUser?.vip?.level ?? '—' }}</b></div>
          <div class="flex justify-between"><span class="text-muted">有效期至</span><b>{{ fmtExpire(status?.vip?.expireAt ?? currentUser?.vip?.expireAt) }}</b></div>
          <div class="flex justify-between"><span class="text-muted">开通方式</span><b class="text-muted">{{ status?.vip ? '平台授予' : '已开通会员' }}</b></div>
        </div>
        <p v-else class="text-sm text-muted">你当前为免费用户，开通会员解锁全部专属内容。</p>
      </a-card>

      <!-- VIP 专属功能 -->
      <div v-if="isVip" class="grid sm:grid-cols-2 gap-4">
        <NuxtLink to="/learn/path"><a-card hoverable><div class="flex items-center gap-2 mb-1.5"><Icon name="compass" :size="18" class="text-brand-coral" /><span class="font-bold">我的学习路径</span></div><p class="text-xs text-muted">基于薄弱点的 AI 定制进阶路线</p></a-card></NuxtLink>
        <NuxtLink to="/interview/sim"><a-card hoverable><div class="flex items-center gap-2 mb-1.5"><Icon name="sparkles" :size="18" class="text-brand-coral" /><span class="font-bold">AI 模拟面试</span></div><p class="text-xs text-muted">多轮实战 + 逐题评分反馈</p></a-card></NuxtLink>
        <NuxtLink to="/resume/diag"><a-card hoverable><div class="flex items-center gap-2 mb-1.5"><Icon name="document" :size="18" class="text-brand-coral" /><span class="font-bold">AI 简历诊断</span></div><p class="text-xs text-muted">AI 把脉简历亮点与短板</p></a-card></NuxtLink>
        <NuxtLink to="/referral"><a-card hoverable><div class="flex items-center gap-2 mb-1.5"><Icon name="briefcase" :size="18" class="text-brand-coral" /><span class="font-bold">内推资源库</span></div><p class="text-xs text-muted">VIP 专属内推岗位 + 申请</p></a-card></NuxtLink>
      </div>

      <!-- 订单 -->
      <a-card title="订单记录">
        <div v-if="status?.orders?.length" class="space-y-2">
          <div v-for="o in status.orders" :key="o.id" class="flex flex-wrap items-center justify-between gap-2 text-sm py-2 border-b border-line last:border-0">
            <span class="font-mono text-xs text-muted">{{ o.id }}</span>
            <span class="text-sub">{{ planName(o.planId) }} · ¥{{ (o.amount/100).toFixed(2) }}</span>
            <span :class="orderColor(o.status)">{{ statusText(o.status) }}</span>
            <NuxtLink v-if="o.status === 'pending'" :to="'/vip/pay/' + o.id"><a-button type="primary" size="small">继续支付</a-button></NuxtLink>
          </div>
        </div>
        <p v-else class="text-sm text-muted">暂无订单记录。</p>
      </a-card>

      <!-- 账号安全 -->
      <a-card title="账号安全" :body-style="{ borderColor: 'rgb(254 202 202)' }">
        <p class="text-sm text-muted mb-3">注销后将永久删除你的账号、学习进度与答卷记录，且不可恢复。</p>
        <a-button danger @click="showDelete = true">注销账号</a-button>

        <!-- 用 form 包裹并显式提供隐藏的 username 诱饵字段：
             否则浏览器密码管理器会在整个文档范围内寻找「用户名」输入框，
             把当前账号自动填进侧边导航的搜索框（type=search 被误判为账号字段）。 -->
        <a-modal v-model:open="showDelete" title="注销账号" ok-text="确认注销" cancel-text="取消"
                 :ok-button-props="{ danger: true }" :confirm-loading="deleteLoading" @ok="doDelete" @cancel="cancelDelete">
          <p class="text-sm text-muted mb-3">此操作不可恢复，请输入登录密码确认。</p>
          <input type="text" :value="currentUser?.email || currentUser?.phone || ''" autocomplete="username"
                 tabindex="-1" aria-hidden="true" readonly
                 style="position:absolute;opacity:0;height:0;width:0;pointer-events:none" />
          <a-input-password v-model:value="deletePwd" placeholder="请输入登录密码以确认" autocomplete="current-password" />
          <a-alert v-if="deleteError" type="error" :message="deleteError" class="mt-3" />
        </a-modal>
      </a-card>
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
