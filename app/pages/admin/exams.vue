<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <h1 class="text-2xl font-extrabold">试卷题库</h1>
      <button class="btn btn-primary" @click="openNew">+ 新建试卷</button>
    </div>
    <p class="text-muted mb-5">试卷与选择题 / 笔试题的增删改查。选择题选项与答案以英文逗号分隔。</p>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card p-4 lg:col-span-1">
        <h3 class="font-bold mb-3">试卷列表</h3>
        <ul class="space-y-1">
          <li v-for="s in sets" :key="s.id" @click="openEdit(s)" class="px-3 py-2 rounded-lg cursor-pointer text-sm"
              :class="selId === s.id ? 'bg-brand-coral/10 text-brand-coral' : 'hover:bg-slate-100 dark:hover:bg-slate-800'">
            <div class="flex justify-between">
              <span class="font-semibold truncate">{{ s.name }}</span>
              <span v-if="s.vip_only" class="tag tag-gold ml-2">VIP</span>
            </div>
            <div class="text-xs text-muted">{{ s.track }} · {{ s.level }} · {{ s.duration }}min</div>
          </li>
        </ul>
      </div>

      <div class="card p-5 lg:col-span-2" v-if="editor.open">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold">{{ editor.isNew ? '新建' : '编辑' }}试卷</h3>
          <button class="btn btn-ghost text-sm" @click="editor.open = false">关闭</button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label class="text-sm">ID<input v-model="ed.id" class="input" :disabled="!editor.isNew" /></label>
          <label class="text-sm col-span-2">名称<input v-model="ed.name" class="input" /></label>
          <label class="text-sm">方向
            <select v-model="ed.track" class="input"><option v-for="t in tracks" :key="t" :value="t">{{ t }}</option></select>
          </label>
          <label class="text-sm">级别
            <select v-model="ed.level" class="input"><option>初级</option><option>中级</option><option>高级</option></select>
          </label>
          <label class="text-sm">时长(分钟)<input v-model.number="ed.duration" type="number" class="input" /></label>
          <label class="text-sm flex items-center gap-2 mt-6">
            <input type="checkbox" v-model="ed.vipOnly" /> VIP 专属（付费可见）
          </label>
        </div>

        <h4 class="font-bold mt-5 mb-2">选择题</h4>
        <div v-for="(c, i) in ed.choices" :key="i" class="border border-line rounded-lg p-3 mb-2">
          <div class="flex gap-2 mb-2">
            <input v-model="c.id" class="input flex-1" placeholder="题ID" />
            <button class="btn btn-ghost text-rose-500 text-sm" @click="ed.choices.splice(i, 1)">删</button>
          </div>
          <input v-model="c.q" class="input mb-2" placeholder="题干" />
          <input v-model="c.optionsText" class="input mb-2" placeholder="选项,逗号分隔" />
          <div class="flex gap-2">
            <input v-model="c.answerText" class="input flex-1" placeholder="正确答案,逗号分隔" />
            <label class="text-sm flex items-center gap-1"><input type="checkbox" v-model="c.multi" /> 多选</label>
          </div>
          <input v-model="c.explain" class="input mt-2" placeholder="解析" />
        </div>
        <button class="btn btn-ghost text-sm" @click="addChoice">+ 添加选择题</button>

        <h4 class="font-bold mt-5 mb-2">笔试题</h4>
        <div v-for="(w, i) in ed.written" :key="i" class="border border-line rounded-lg p-3 mb-2">
          <div class="flex gap-2 mb-2">
            <input v-model="w.id" class="input flex-1" placeholder="题ID" />
            <button class="btn btn-ghost text-rose-500 text-sm" @click="ed.written.splice(i, 1)">删</button>
          </div>
          <input v-model="w.q" class="input mb-2" placeholder="题目" />
          <input v-model="w.pointsText" class="input mb-2" placeholder="得分点,逗号分隔" />
          <input v-model="w.reference" class="input" placeholder="参考答案" />
        </div>
        <button class="btn btn-ghost text-sm" @click="addWritten">+ 添加笔试题</button>

        <div class="mt-4 flex gap-2 items-center">
          <button class="btn btn-primary" :disabled="busy" @click="save">保存试卷</button>
          <button v-if="!editor.isNew" class="btn btn-ghost text-rose-500" @click="remove">删除试卷</button>
          <span v-if="msg" class="text-sm" :class="msgOk ? 'text-emerald-600' : 'text-rose-500'">{{ msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()
const tracks = ['frontend', 'backend', 'devops', 'ai']
const sets = ref<any[]>([])
const selId = ref('')
const busy = ref(false)
const msg = ref('')
const msgOk = ref(true)
const editor = ref({ open: false, isNew: true })

function blankSet() {
  return { id: '', name: '', track: 'frontend', level: '初级', duration: 30, vipOnly: false, choices: [], written: [] }
}
const ed = ref<any>(blankSet())

useSeoMeta({ title: '管理后台 · 试卷题库 · MentorLoop' })

function splitText(t: string) { return (t || '').split(',').map((s: string) => s.trim()).filter(Boolean) }
function addChoice() { ed.value.choices.push({ id: '', q: '', optionsText: '', answerText: '', explain: '', multi: false }) }
function addWritten() { ed.value.written.push({ id: '', q: '', pointsText: '', reference: '' }) }

async function load() {
  const r: any = await request('/api/admin/exam-sets')
  sets.value = r.items || []
}
function openNew() { editor.value = { open: true, isNew: true }; ed.value = blankSet(); msg.value = '' }
async function openEdit(s: any) {
  selId.value = s.id
  const r: any = await request(`/api/admin/exam-sets/${s.id}`)
  const d = r.data || r
  ed.value = {
    id: d.id, name: d.name, track: d.track, level: d.level, duration: d.duration, vipOnly: !!d.vip_only,
    choices: (d.choices || []).map((c: any) => ({
      id: c.id, q: c.q, optionsText: (JSON.parse(c.options || '[]')).join(','),
      answerText: (JSON.parse(c.answer || '[]')).join(','), explain: c.explain || '', multi: !!c.multi
    })),
    written: (d.written || []).map((w: any) => ({
      id: w.id, q: w.q, pointsText: (JSON.parse(w.points || '[]')).join(','), reference: w.reference || ''
    }))
  }
  editor.value = { open: true, isNew: false }
}
async function save() {
  busy.value = true; msg.value = ''
  const payload = {
    id: ed.value.id, name: ed.value.name, track: ed.value.track, level: ed.value.level,
    duration: ed.value.duration, vipOnly: ed.value.vipOnly,
    choices: ed.value.choices.map((c: any) => ({ id: c.id, q: c.q, options: splitText(c.optionsText), answer: splitText(c.answerText), explain: c.explain, multi: c.multi })),
    written: ed.value.written.map((w: any) => ({ id: w.id, q: w.q, points: splitText(w.pointsText), reference: w.reference }))
  }
  try {
    if (editor.value.isNew) await request('/api/admin/exam-sets', { method: 'POST', body: payload })
    else await request(`/api/admin/exam-sets/${ed.value.id}`, { method: 'PATCH', body: payload })
    msg.value = '已保存'; msgOk.value = true; editor.value.open = false; selId.value = ''
    await load()
  } catch (e: any) { msg.value = e.message || '保存失败'; msgOk.value = false }
  finally { busy.value = false }
}
async function remove() {
  if (!confirm('确认删除该试卷（含其选择题/笔试题）？')) return
  await request(`/api/admin/exam-sets/${ed.value.id}`, { method: 'DELETE' })
  editor.value.open = false; selId.value = ''; await load()
}

onMounted(load)
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-line bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-coral mt-1; }
</style>
