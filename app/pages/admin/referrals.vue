<template>
  <div>
    <h1 class="page-title mb-1">内推资源库</h1>
    <p class="text-muted mb-5">维护内推岗位，并处理学员的内推申请（H4 管理端）。</p>

    <div class="flex gap-2 mb-5">
      <a-button :type="tab === 'jobs' ? 'primary' : 'default'" @click="tab = 'jobs'">内推岗位（{{ jobs.length }}）</a-button>
      <a-button :type="tab === 'apps' ? 'primary' : 'default'" @click="tab = 'apps'">申请处理（{{ apps.length }}）</a-button>
    </div>

    <!-- 岗位管理 -->
    <template v-if="tab === 'jobs'">
      <div class="flex justify-end mb-3">
        <a-button type="primary" @click="openNew">+ 新建岗位</a-button>
      </div>
      <a-card :body-style="{ padding: '0' }" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-muted border-b border-line">
            <th class="p-3">公司 / 职位</th><th class="p-3">方向</th><th class="p-3">城市</th><th class="p-3">级别</th><th class="p-3 text-right">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="j in jobs" :key="j.id" class="border-b border-line last:border-0">
              <td class="p-3"><div class="font-bold">{{ j.title }}</div><div class="text-xs text-muted">{{ j.company }}</div></td>
              <td class="p-3">{{ j.trackName }}</td>
              <td class="p-3">{{ j.city || '—' }}</td>
              <td class="p-3">{{ j.level || '—' }}</td>
              <td class="p-3 text-right whitespace-nowrap">
                <a-button type="link" size="small" @click="openEdit(j)">编辑</a-button>
                <a-button type="link" size="small" danger @click="remove(j)">删除</a-button>
              </td>
            </tr>
            <tr v-if="!jobs.length"><td colspan="5" class="p-6 text-center text-muted">暂无岗位</td></tr>
          </tbody>
        </table>
      </a-card>

      <a-card v-if="editor.open" :body-style="{ padding: '24px' }" class="mt-5">
        <h3 class="font-bold mb-3">{{ editor.isNew ? '新建' : '编辑' }}岗位</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="text-sm">ID（小写字母/数字/连字符）<input v-model="editor.data.id" class="input" :disabled="!editor.isNew" /></label>
          <label class="text-sm">公司<input v-model="editor.data.company" class="input" /></label>
          <label class="text-sm">职位<input v-model="editor.data.title" class="input" /></label>
          <label class="text-sm">方向
            <select v-model="editor.data.track" class="input">
              <option value="frontend">前端</option><option value="backend">后端</option>
              <option value="devops">运维/DevOps</option><option value="ai">AI 工程</option>
            </select>
          </label>
          <label class="text-sm">城市<input v-model="editor.data.city" class="input" /></label>
          <label class="text-sm">级别<input v-model="editor.data.level" class="input" placeholder="如 初中级 / 高级" /></label>
          <label class="text-sm">类型<input v-model="editor.data.type" class="input" placeholder="社招 / 校招 / 实习" /></label>
          <label class="text-sm">联系方式<input v-model="editor.data.contact" class="input" placeholder="HR 邮箱 / 内推码" /></label>
          <label class="text-sm md:col-span-2">要求<textarea v-model="editor.data.requirement" class="input" rows="2"></textarea></label>
          <label class="text-sm md:col-span-2">简介<textarea v-model="editor.data.intro" class="input" rows="2"></textarea></label>
        </div>
        <div class="mt-3 flex gap-2 items-center">
          <a-button type="primary" :disabled="busy" @click="save">保存</a-button>
          <a-button @click="editor.open = false">关闭</a-button>
          <span v-if="msg" class="text-sm" :class="msgOk ? 'text-emerald-600' : 'text-rose-500'">{{ msg }}</span>
        </div>
      </a-card>
    </template>

    <!-- 申请处理 -->
    <template v-else>
      <a-card :body-style="{ padding: '0' }" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-muted border-b border-line">
            <th class="p-3">申请人</th><th class="p-3">岗位</th><th class="p-3">联系方式</th><th class="p-3">备注</th><th class="p-3">状态</th><th class="p-3 text-right">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="a in apps" :key="a.id" class="border-b border-line last:border-0">
              <td class="p-3"><div class="font-bold">{{ a.name }}</div></td>
              <td class="p-3"><div>{{ a.title || '—' }}</div><div class="text-xs text-muted">{{ a.company }}</div></td>
              <td class="p-3 text-xs">{{ a.contact }}</td>
              <td class="p-3 text-xs text-muted max-w-[200px] truncate">{{ a.note || '—' }}</td>
              <td class="p-3"><a-tag :color="statusClass(a.status)">{{ statusText(a.status) }}</a-tag></td>
              <td class="p-3 text-right whitespace-nowrap">
                <select class="input inline-block w-28 py-1" :value="a.status" @change="setStatus(a, ($event.target as HTMLSelectElement).value)">
                  <option value="pending">待处理</option>
                  <option value="contacted">已联系</option>
                  <option value="done">已内推</option>
                  <option value="rejected">未通过</option>
                </select>
              </td>
            </tr>
            <tr v-if="!apps.length"><td colspan="6" class="p-6 text-center text-muted">暂无申请</td></tr>
          </tbody>
        </table>
      </a-card>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()

const tab = ref<'jobs' | 'apps'>('jobs')
const jobs = ref<any[]>([])
const apps = ref<any[]>([])
const busy = ref(false)
const msg = ref('')
const msgOk = ref(true)

const editor = ref({ open: false, isNew: true, data: {} as any })

useSeoMeta({ title: '管理后台 · 内推资源 · MentorLoop' })

async function loadJobs() {
  const r: any = await request('/api/admin/referrals')
  jobs.value = r.items || []
}
async function loadApps() {
  const r: any = await request('/api/admin/referral-applications')
  apps.value = r.items || []
}
function blank() {
  return { id: '', company: '', title: '', track: 'frontend', city: '', level: '', type: '社招', requirement: '', intro: '', contact: '' }
}
function openNew() { editor.value = { open: true, isNew: true, data: blank() }; msg.value = '' }
function openEdit(j: any) { editor.value = { open: true, isNew: false, data: { ...j } }; msg.value = '' }
async function save() {
  busy.value = true; msg.value = ''
  const { isNew, data } = editor.value
  try {
    if (isNew) await request('/api/admin/referrals', { method: 'POST', body: data })
    else await request(`/api/admin/referrals/${data.id}`, { method: 'PATCH', body: data })
    msg.value = '已保存'; msgOk.value = true; editor.value.open = false
    await loadJobs()
  } catch (e: any) { msg.value = e.message || '保存失败'; msgOk.value = false }
  finally { busy.value = false }
}
async function remove(j: any) {
  if (!confirm(`确认删除岗位「${j.title}」？`)) return
  await request(`/api/admin/referrals/${j.id}`, { method: 'DELETE' })
  await loadJobs()
}
async function setStatus(a: any, status: string) {
  try {
    await request(`/api/admin/referral-applications/${a.id}`, { method: 'PATCH', body: { status } })
    a.status = status
  } catch (e: any) { alert(e.message || '更新失败') }
}
function statusText(s: string) { return ({ pending: '待处理', contacted: '已联系', done: '已内推', rejected: '未通过' } as any)[s] || s }
function statusClass(s: string) { return ({ pending: 'default', contacted: 'gold', done: 'green', rejected: 'default' } as any)[s] || 'default' }

watch(tab, (t) => { if (t === 'jobs') loadJobs(); else loadApps() })
onMounted(loadJobs)
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-line bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-coral mt-1; }
</style>
