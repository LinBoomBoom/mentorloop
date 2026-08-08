<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <h1 class="page-title">面试题库</h1>
      <a-button type="primary" @click="openNew">+ 新建题目</a-button>
    </div>
    <p class="text-muted mb-4">面试题增删改查。关键词以英文逗号分隔。</p>

    <div class="flex gap-2 mb-4 items-center flex-wrap">
      <select v-model="track" class="input w-44" @change="load">
        <option value="">全部方向</option>
        <option v-for="t in tracks" :key="t" :value="t">{{ t }}</option>
      </select>
      <input v-model="q" class="input flex-1" placeholder="搜索题干" @keyup.enter="load" />
      <a-button @click="load">搜索</a-button>
    </div>

    <a-card :body-style="{ padding: '0' }" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-left text-muted border-b border-line">
          <th class="p-3">ID</th><th class="p-3">方向</th><th class="p-3">类型</th><th class="p-3">题干</th><th class="p-3 text-right">操作</th>
        </tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="border-b border-line last:border-0">
            <td class="p-3 font-mono text-xs text-muted">{{ item.id }}</td>
            <td class="p-3">{{ item.track }}</td>
            <td class="p-3"><a-tag :color="item.type==='special' ? 'gold' : 'green'">{{ item.type }}</a-tag></td>
            <td class="p-3 max-w-md truncate">{{ item.q }}</td>
            <td class="p-3 text-right whitespace-nowrap">
              <a-button type="link" size="small" @click="openEdit(item)">编辑</a-button>
              <a-button type="link" size="small" danger @click="remove(item)">删除</a-button>
            </td>
          </tr>
          <tr v-if="!items.length"><td colspan="5" class="p-6 text-center text-muted">暂无题目</td></tr>
        </tbody>
      </table>
    </a-card>

    <a-card v-if="editor.open" :body-style="{ padding: '24px' }" class="mt-5">
      <h3 class="font-bold mb-3">{{ editor.isNew ? '新建' : '编辑' }}题目</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label class="text-sm">ID<input v-model="ed.id" class="input" :disabled="!editor.isNew" /></label>
        <label class="text-sm">方向<select v-model="ed.track" class="input"><option v-for="t in tracks" :key="t" :value="t">{{ t }}</option></select></label>
        <label class="text-sm">类型<select v-model="ed.type" class="input"><option value="hot">hot</option><option value="special">special</option></select></label>
      </div>
      <label class="text-sm block mt-3">题干<textarea v-model="ed.q" class="input" rows="2"></textarea></label>
      <label class="text-sm block mt-3">答案<textarea v-model="ed.a" class="input" rows="4"></textarea></label>
      <label class="text-sm block mt-3">关键词（逗号分隔）<input v-model="ed.keywordsText" class="input" /></label>
      <div class="mt-3 flex gap-2 items-center">
        <a-button type="primary" :disabled="busy" @click="save">保存</a-button>
        <a-button v-if="!editor.isNew" danger @click="remove(ed)">删除</a-button>
        <span v-if="msg" class="text-sm" :class="msgOk ? 'text-emerald-600' : 'text-rose-500'">{{ msg }}</span>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()
const tracks = ['frontend', 'backend', 'devops', 'ai']
const items = ref<any[]>([])
const track = ref('')
const q = ref('')
const busy = ref(false)
const msg = ref('')
const msgOk = ref(true)
const editor = ref({ open: false, isNew: true })
const ed = ref<any>({ id: '', track: 'frontend', type: 'hot', q: '', a: '', keywordsText: '' })

useSeoMeta({ title: '管理后台 · 面试题库 · MentorLoop' })

function splitText(t: string) { return (t || '').split(',').map((s: string) => s.trim()).filter(Boolean) }
async function load() {
  const qs = `?track=${encodeURIComponent(track.value)}&q=${encodeURIComponent(q.value)}`
  const r: any = await request(`/api/admin/interview${qs}`)
  items.value = r.items || []
}
function openNew() { editor.value = { open: true, isNew: true }; ed.value = { id: '', track: 'frontend', type: 'hot', q: '', a: '', keywordsText: '' }; msg.value = '' }
function openEdit(item: any) {
  editor.value = { open: true, isNew: false }
  ed.value = { id: item.id, track: item.track, type: item.type, q: item.q, a: item.a, keywordsText: (item.keywords || []).join(',') }
}
async function save() {
  busy.value = true; msg.value = ''
  const payload = { id: ed.value.id, track: ed.value.track, type: ed.value.type, q: ed.value.q, a: ed.value.a, keywords: splitText(ed.value.keywordsText) }
  try {
    if (editor.value.isNew) await request('/api/admin/interview', { method: 'POST', body: payload })
    else await request(`/api/admin/interview/${ed.value.id}`, { method: 'PATCH', body: payload })
    msg.value = '已保存'; msgOk.value = true; editor.value.open = false; await load()
  } catch (e: any) { msg.value = e.message || '保存失败'; msgOk.value = false }
  finally { busy.value = false }
}
async function remove(item: any) {
  if (!confirm('确认删除该面试题？')) return
  await request(`/api/admin/interview/${item.id}`, { method: 'DELETE' })
  editor.value.open = false; await load()
}

onMounted(load)
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-line bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-coral mt-1; }
</style>
