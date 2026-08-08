<template>
  <div>
    <h1 class="page-title mb-1">内容管理</h1>
    <p class="text-muted mb-5">模块 / 章节 / 小节 的增删改查。小节内容请遵循六段式（首行 <code>&gt; 时效</code> 标记）。</p>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 模块 -->
      <a-card :body-style="{ padding: '16px' }">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold">模块</h3>
          <a-button size="small" @click="openNew('module')">+ 新建</a-button>
        </div>
        <ul class="space-y-1">
          <li v-for="m in modules" :key="m.id" @click="selectModule(m)" class="px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold"
              :class="selModule?.id === m.id ? 'bg-brand-coral/10 text-brand-coral' : 'hover:bg-slate-100 dark:hover:bg-slate-800'">
            {{ m.icon }} {{ m.name }}
          </li>
        </ul>
      </a-card>

      <!-- 章节 -->
      <a-card :body-style="{ padding: '16px' }">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold">章节</h3>
          <a-button size="small" :disabled="!selModule" @click="openNew('chapter')">+ 新建</a-button>
        </div>
        <p v-if="!selModule" class="text-sm text-muted">请先选择左侧模块</p>
        <ul v-else class="space-y-1">
          <li v-for="c in chapters" :key="c.id" @click="selectChapter(c)" class="px-3 py-2 rounded-lg cursor-pointer text-sm"
              :class="selChapter?.id === c.id ? 'bg-brand-coral/10 text-brand-coral' : 'hover:bg-slate-100 dark:hover:bg-slate-800'">
            {{ c.title }}
          </li>
          <li v-if="!chapters.length" class="text-sm text-muted px-3">暂无章节</li>
        </ul>
      </a-card>

      <!-- 小节 -->
      <a-card :body-style="{ padding: '16px' }">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold">小节</h3>
          <a-button size="small" :disabled="!selChapter" @click="openNew('section')">+ 新建</a-button>
        </div>
        <p v-if="!selChapter" class="text-sm text-muted">请先选择章节</p>
        <ul v-else class="space-y-1 max-h-80 overflow-auto">
          <li v-for="s in sections" :key="s.id" @click="openEdit('section', s)" class="px-3 py-2 rounded-lg cursor-pointer text-sm flex justify-between hover:bg-slate-100 dark:hover:bg-slate-800">
            <span class="truncate">{{ s.title }}</span>
            <span class="text-muted text-xs ml-2">{{ s.id }}</span>
          </li>
          <li v-if="!sections.length" class="text-sm text-muted px-3">暂无小节</li>
        </ul>
      </a-card>
    </div>

    <!-- 编辑器 -->
    <a-card v-if="editor.open" class="mt-5" :body-style="{ padding: '20px' }">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold">{{ editor.isNew ? '新建' : '编辑' }} · {{ kindLabel }}</h3>
        <a-button size="small" @click="editor.open = false">关闭</a-button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label class="text-sm">ID（小写字母/数字/连字符）<input v-model="editor.data.id" class="input" :disabled="!editor.isNew" /></label>
        <label v-if="editor.kind==='module'" class="text-sm">名称<input v-model="editor.data.name" class="input" /></label>
        <label v-if="editor.kind==='module'" class="text-sm">图标<input v-model="editor.data.icon" class="input" placeholder="📘" /></label>
        <label v-if="editor.kind==='module'" class="text-sm">主题色<input v-model="editor.data.color" class="input" placeholder="#3b82f6" /></label>
        <label v-if="editor.kind==='chapter'" class="text-sm">标题<input v-model="editor.data.title" class="input" /></label>
        <label v-if="editor.kind==='chapter'" class="text-sm">目标(goal)<input v-model="editor.data.goal" class="input" /></label>
        <label v-if="editor.kind==='section'" class="text-sm">标题<input v-model="editor.data.title" class="input" /></label>
        <label v-if="editor.kind==='section'" class="text-sm">方向(direction)<input v-model="editor.data.direction" class="input" /></label>
        <label v-if="editor.kind==='module'" class="text-sm md:col-span-2">描述<textarea v-model="editor.data.desc" class="input" rows="2"></textarea></label>
        <label v-if="editor.kind==='section'" class="text-sm md:col-span-2">内容（Markdown，首行需 <code>&gt; 时效</code>）
          <textarea v-model="editor.data.content" class="input font-mono" rows="10"></textarea>
        </label>
      </div>

      <div class="mt-3 flex gap-2 items-center">
        <a-button type="primary" :disabled="busy" @click="save">保存</a-button>
        <a-button v-if="!editor.isNew" danger @click="remove">删除</a-button>
        <span v-if="msg" class="text-sm" :class="msgOk ? 'text-emerald-600' : 'text-rose-500'">{{ msg }}</span>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()

const modules = ref<any[]>([])
const chapters = ref<any[]>([])
const sections = ref<any[]>([])
const selModule = ref<any>(null)
const selChapter = ref<any>(null)
const busy = ref(false)
const msg = ref('')
const msgOk = ref(true)

const editor = ref({ open: false, isNew: true, kind: 'module', data: {} as any })
const kindLabel = computed(() => ({ module: '模块', chapter: '章节', section: '小节' }[editor.value.kind]))

useSeoMeta({ title: '管理后台 · 内容管理 · MentorLoop' })

async function loadModules() {
  const r: any = await request('/api/admin/modules')
  modules.value = r.items || []
}
async function selectModule(m: any) {
  selModule.value = m; selChapter.value = null; sections.value = []
  const r: any = await request(`/api/admin/chapters?moduleId=${m.id}`)
  chapters.value = r || []
}
async function selectChapter(c: any) {
  selChapter.value = c
  const r: any = await request(`/api/admin/sections?chapterId=${c.id}`)
  sections.value = r || []
}
function blank(kind: string) {
  if (kind === 'module') return { id: '', name: '', icon: '📘', color: '#3b82f6', desc: '' }
  if (kind === 'chapter') return { id: '', title: '', goal: '', moduleId: selModule.value?.id }
  return { id: '', title: '', direction: '', content: '> 时效 | 核验= | 风险=中 | 版本= | 来源=\n\n## 心智模型\n\n## 核心知识点（锚定官方）\n\n## 为什么重要 / 何时会用到\n\n## 常见坑\n\n## 动手自测\n\n## 面试视角\n\n## 相关知识图谱\n', chapterId: selChapter.value?.id }
}
function openNew(kind: string) {
  editor.value = { open: true, isNew: true, kind, data: blank(kind) }
  msg.value = ''
}
function openEdit(kind: string, item: any) {
  editor.value = { open: true, isNew: false, kind, data: { ...item } }
  msg.value = ''
}
async function save() {
  busy.value = true; msg.value = ''
  const { kind, isNew, data } = editor.value
  const base = `/api/admin/${kind === 'module' ? 'modules' : kind === 'chapter' ? 'chapters' : 'sections'}`
  try {
    if (isNew) await request(base, { method: 'POST', body: data })
    else await request(`${base}/${data.id}`, { method: 'PATCH', body: data })
    msg.value = '已保存'; msgOk.value = true
    editor.value.open = false
    await loadModules()
    if (selModule.value) await selectModule(selModule.value)
    if (selChapter.value) await selectChapter(selChapter.value)
  } catch (e: any) {
    msg.value = e.message || '保存失败'; msgOk.value = false
  } finally { busy.value = false }
}
async function remove() {
  const { kind, data } = editor.value
  if (!confirm('确认删除？删除章节/模块会级联删除其下内容。')) return
  const base = `/api/admin/${kind === 'module' ? 'modules' : kind === 'chapter' ? 'chapters' : 'sections'}`
  await request(`${base}/${data.id}`, { method: 'DELETE' })
  editor.value.open = false
  await loadModules()
  selModule.value = null; selChapter.value = null; chapters.value = []; sections.value = []
}

onMounted(loadModules)
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-line bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-coral mt-1; }
</style>
