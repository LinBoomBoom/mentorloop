<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <h1 class="page-title">用户体系</h1>
      <a-button type="primary" @click="showCreate = !showCreate">+ 新建用户</a-button>
    </div>
    <p class="text-muted mb-5">用户列表、角色、VIP 与封禁管理。封禁后该账号将无法登录。</p>

    <!-- 新建 -->
    <a-card v-if="showCreate" class="mb-5" :body-style="{ padding: '20px' }">
      <h3 class="font-bold mb-3">新建用户</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input v-model="form.username" class="input" placeholder="用户名" />
        <input v-model="form.email" class="input" placeholder="邮箱" />
        <input v-model="form.password" type="text" class="input" placeholder="密码(≥6位)" />
        <select v-model="form.role" class="input">
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
        </select>
      </div>
      <div class="mt-3 flex gap-2">
        <a-button type="primary" :disabled="busy" @click="createUser">创建</a-button>
        <a-button @click="showCreate = false">取消</a-button>
        <span v-if="msg" class="text-sm self-center" :class="msgOk ? 'text-emerald-600' : 'text-rose-500'">{{ msg }}</span>
      </div>
    </a-card>

    <!-- 搜索 -->
    <div class="flex gap-2 mb-4">
      <input v-model="q" class="input flex-1" placeholder="搜索用户名 / 邮箱 / 昵称" @keyup.enter="load(1)" />
      <a-button @click="load(1)">搜索</a-button>
    </div>

    <div v-if="loading" class="text-muted">加载中…</div>
    <a-card v-else-if="!items.length" class="text-center" :body-style="{ padding: '32px' }"><span class="text-muted">暂无用户</span></a-card>
    <a-card v-else class="overflow-x-auto" :body-style="{ padding: '0' }">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted border-b border-line">
            <th class="p-3">昵称 / 账号</th><th class="p-3">角色</th><th class="p-3">VIP</th><th class="p-3">状态</th><th class="p-3">注册时间</th><th class="p-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u.id" class="border-b border-line last:border-0">
            <td class="p-3">
              <div class="font-bold">{{ u.nickname || '—' }}</div>
              <div class="text-xs text-muted">{{ u.email || u.username }}</div>
            </td>
            <td class="p-3">
              <a-tag :color="u.role === 'admin' ? '#ff5e7e' : ''">{{ u.role }}</a-tag>
            </td>
            <td class="p-3">
              <a-tag v-if="u.vip?.active" color="gold">Lv.{{ u.vip.level }}</a-tag>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="p-3">
              <a-tag v-if="u.banned" :bordered="false" style="background:rgba(244,63,94,.15);color:#f43f5e">已封禁</a-tag>
              <a-tag v-else color="green">正常</a-tag>
            </td>
            <td class="p-3 text-muted">{{ fmt(u.createdAt) }}</td>
            <td class="p-3 text-right whitespace-nowrap">
              <a-button type="link" size="small" @click="toggleRole(u)">{{ u.role === 'admin' ? '降为普通' : '设管理员' }}</a-button>
              <a-button type="link" size="small" @click="toggleBan(u)">{{ u.banned ? '解封' : '封禁' }}</a-button>
              <a-button type="link" size="small" danger @click="remove(u)">删除</a-button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="flex items-center justify-between p-3 text-sm text-muted">
        <span>共 {{ total }} 条</span>
        <div class="flex gap-2">
          <a-button size="small" :disabled="page <= 1" @click="load(page - 1)">上一页</a-button>
          <span>第 {{ page }} 页</span>
          <a-button size="small" :disabled="items.length < pageSize" @click="load(page + 1)">下一页</a-button>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()
const auth = useAuthStore()

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const q = ref('')
const loading = ref(false)
const busy = ref(false)
const showCreate = ref(false)
const msg = ref('')
const msgOk = ref(true)
const form = ref({ username: '', email: '', password: '', role: 'user' })

useSeoMeta({ title: '管理后台 · 用户体系 · MentorLoop' })

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const r: any = await request(`/api/admin/users?q=${encodeURIComponent(q.value)}&page=${p}&pageSize=${pageSize}`)
    items.value = r.items || []
    total.value = r.total || 0
  } catch (e: any) {
    items.value = []
  } finally {
    loading.value = false
  }
}
function fmt(ts?: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '—' }
async function toggleRole(u: any) {
  await request(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { role: u.role === 'admin' ? 'user' : 'admin' } })
  load(page.value)
}
async function toggleBan(u: any) {
  await request(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { banned: !u.banned } })
  load(page.value)
}
async function remove(u: any) {
  if (!confirm(`确认删除用户 ${u.nickname || u.username}？其订单/进度/记录会一并清除。`)) return
  await request(`/api/admin/users/${u.id}`, { method: 'DELETE' })
  load(page.value)
}
async function createUser() {
  busy.value = true; msg.value = ''
  try {
    await request('/api/admin/users', { method: 'POST', body: { ...form.value } })
    msg.value = '已创建'; msgOk.value = true
    form.value = { username: '', email: '', password: '', role: 'user' }
    showCreate.value = false
    load(1)
  } catch (e: any) {
    msg.value = e.message || '创建失败'; msgOk.value = false
  } finally { busy.value = false }
}

onMounted(() => load(1))
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-line bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-coral; }
</style>
