<template>
  <div>
    <div class="mb-1">
      <h1 class="text-2xl font-extrabold">待补充题库</h1>
      <p class="text-muted text-sm mt-1">收录自用户提问中「题库未命中」的问题，已由大模型做语义化增强。审核通过即回流进正式面试题库并自动关联最相关章节；无收录价值的直接驳回。</p>
    </div>

    <div class="flex gap-2 mb-4 items-center flex-wrap">
      <select v-model="status" class="input w-36" @change="load">
        <option value="">全部状态</option>
        <option value="pending">待审核</option>
        <option value="accepted">已采纳</option>
        <option value="rejected">已驳回</option>
      </select>
      <select v-model="track" class="input w-44" @change="load">
        <option value="">全部方向</option>
        <option v-for="t in tracks" :key="t" :value="t">{{ t }}</option>
      </select>
      <input v-model="q" class="input flex-1" placeholder="搜索原始提问 / 增强标题" @keyup.enter="load" />
      <a-button @click="load">搜索</a-button>
    </div>

    <div v-if="selectedCount" class="flex items-center gap-2 mb-3">
      <span class="text-sm text-muted">已选 {{ selectedCount }} 项</span>
      <a-button type="primary" size="small" :disabled="busy" @click="batchReview('accept')">批量采纳</a-button>
      <a-button danger size="small" :disabled="busy" @click="batchReview('reject')">批量驳回</a-button>
      <a-button size="small" @click="clearSelection">取消选择</a-button>
    </div>

    <a-card :body-style="{ padding: '0' }" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-left text-muted border-b border-line">
          <th class="p-3 w-10"><input type="checkbox" :checked="allSel" @change="toggleAll" aria-label="全选" /></th>
          <th class="p-3">状态</th><th class="p-3">方向</th><th class="p-3">原始提问</th>
          <th class="p-3">增强标题</th><th class="p-3">标签</th><th class="p-3">AI 答案预览</th>
          <th class="p-3">关联章节</th><th class="p-3 text-right">操作</th>
        </tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="border-b border-line last:border-0 align-top" :class="isSel(item.id) ? 'bg-brand-coral/[.04]' : ''">
            <td class="p-3">
              <input v-if="item.status === 'pending'" type="checkbox" :checked="isSel(item.id)" @change="toggleSel(item.id)" :aria-label="'选择 ' + item.raw_question" />
            </td>
            <td class="p-3 whitespace-nowrap">
              <a-tag :color="statusColor(item.status)">{{ statusText(item.status) }}</a-tag>
            </td>
            <td class="p-3 whitespace-nowrap">{{ item.track || '-' }}</td>
            <td class="p-3 max-w-xs"><div class="truncate" :title="item.raw_question">{{ item.raw_question }}</div></td>
            <td class="p-3 max-w-xs"><div class="truncate" :title="item.enhanced_title">{{ item.enhanced_title || '-' }}</div></td>
            <td class="p-3 max-w-[10rem]">
              <span v-for="t in parseTags(item.enhanced_tags)" :key="t" class="chip bg-ink/5 text-sub mr-1 mb-1 inline-block">{{ t }}</span>
            </td>
            <td class="p-3 max-w-xs"><div class="line-clamp-2 text-muted text-xs" :title="item.ai_answer">{{ item.ai_answer || '-' }}</div></td>
            <td class="p-3 max-w-[12rem] text-xs">
              <span v-if="item.section" class="text-emerald-600">✓ {{ item.section.chapterTitle }} / {{ item.section.title }}</span>
              <span v-else-if="item.suggest" class="text-sub">{{ item.suggest.chapterTitle }} / {{ item.suggest.title }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="p-3 text-right whitespace-nowrap">
              <template v-if="item.status === 'pending'">
                <a-button type="link" size="small" @click="openAccept(item)">采纳</a-button>
                <a-button type="link" size="small" danger @click="reject(item)">驳回</a-button>
              </template>
              <span v-else-if="item.status === 'accepted'" class="text-xs text-emerald-600">
                已入库{{ item.result_question_id ? ' · ' + item.result_question_id : '' }}
              </span>
              <span v-else class="text-xs text-muted">已驳回</span>
            </td>
          </tr>
          <tr v-if="!items.length"><td colspan="9" class="p-6 text-center text-muted">暂无数据</td></tr>
        </tbody>
      </table>
    </a-card>

    <a-card v-if="editor.open" :body-style="{ padding: '24px' }" class="mt-5">
      <h3 class="font-bold mb-1">采纳并录入题库</h3>
      <p class="text-xs text-muted mb-3">以下为 AI 语义化增强后的内容，可在采纳前微调。确认后写入正式面试题库，并自动关联下方所选章节。</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label class="text-sm">方向<select v-model="ed.track" class="input"><option v-for="t in tracks" :key="t" :value="t">{{ t }}</option></select></label>
        <label class="text-sm">类型<select v-model="ed.type" class="input"><option value="hot">hot</option><option value="special">special</option></select></label>
        <label class="text-sm">题号 ID（可选）<input v-model="ed.id" class="input" placeholder="留空自动生成" /></label>
      </div>
      <label class="text-sm block mt-3">关联章节
        <select v-model="ed.sectionId" class="input">
          <option value="">（不指定 · 由系统按方向+标签自动关联）</option>
          <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.chapter_title }} / {{ s.title }}</option>
        </select>
      </label>
      <label class="text-sm block mt-3">题干<textarea v-model="ed.q" class="input" rows="2"></textarea></label>
      <label class="text-sm block mt-3">答案<textarea v-model="ed.a" class="input" rows="5"></textarea></label>
      <label class="text-sm block mt-3">关键词（逗号分隔）<input v-model="ed.keywordsText" class="input" /></label>
      <div class="mt-3 flex gap-2 items-center">
        <a-button type="primary" :disabled="busy" @click="confirmAccept">确认采纳</a-button>
        <a-button @click="editor.open = false">取消</a-button>
        <span v-if="msg" class="text-sm" :class="msgOk ? 'text-emerald-600' : 'text-rose-500'">{{ msg }}</span>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { request } = useApi()
const auth = useAuthStore()
const tracks = ['frontend', 'backend', 'devops', 'ai']
const items = ref<any[]>([])
const status = ref('')
const track = ref('')
const q = ref('')
const busy = ref(false)
const msg = ref('')
const msgOk = ref(true)
const editor = ref({ open: false, id: '' })
const ed = ref<any>({ id: '', track: 'frontend', type: 'hot', q: '', a: '', keywordsText: '', sectionId: '' })
const sections = ref<any[]>([])

// 批量选择
const selected = ref<Set<string>>(new Set())
const selectedCount = computed(() => selected.value.size)
const pendingIds = computed(() => items.value.filter((i: any) => i.status === 'pending').map((i: any) => i.id))
const allSel = computed(() => pendingIds.value.length > 0 && pendingIds.value.every((id: string) => selected.value.has(id)))
function isSel(id: string) { return selected.value.has(id) }
function toggleSel(id: string) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selected.value = s
}
function toggleAll() {
  const s = new Set(selected.value)
  if (allSel.value) pendingIds.value.forEach((id) => s.delete(id))
  else pendingIds.value.forEach((id) => s.add(id))
  selected.value = s
}
function clearSelection() { selected.value = new Set() }

useSeoMeta({ title: '管理后台 · 待补充题库 · MentorLoop' })

function statusColor(s: string) {
  return s === 'pending' ? 'gold' : s === 'accepted' ? 'green' : 'default'
}
function statusText(s: string) {
  return s === 'pending' ? '待审核' : s === 'accepted' ? '已采纳' : '已驳回'
}
function parseTags(s: string): string[] {
  try { return JSON.parse(s || '[]') } catch { return [] }
}
function splitText(t: string) { return (t || '').split(',').map((s: string) => s.trim()).filter(Boolean) }

async function load() {
  if (!auth.isLoggedIn || auth.user?.role !== 'admin') return
  try {
    const qs = `?status=${encodeURIComponent(status.value)}&track=${encodeURIComponent(track.value)}&q=${encodeURIComponent(q.value)}`
    const r: any = await request(`/api/admin/user-questions${qs}`)
    items.value = (r.items || []).map((it: any) => ({ ...it, enhanced_tags: it.enhanced_tags || '[]' }))
  } catch (e: any) {
    // 未授权 / 网络异常时静默，避免未捕获异常污染控制台
  }
}
async function loadSections(t: string) {
  try {
    const r: any = await request(`/api/admin/sections?track=${encodeURIComponent(t)}`)
    sections.value = r.items || []
  } catch { sections.value = [] }
}
function openAccept(item: any) {
  editor.value = { open: true, id: item.id }
  ed.value = {
    id: '',
    track: item.track || 'frontend',
    type: 'hot',
    q: item.enhanced_title || item.raw_question || '',
    a: item.ai_answer || '',
    keywordsText: parseTags(item.enhanced_tags).join(','),
    sectionId: item.suggest?.id || ''
  }
  msg.value = ''
  loadSections(ed.value.track)
}
async function confirmAccept() {
  busy.value = true; msg.value = ''
  const payload = {
    decision: 'accept',
    id: ed.value.id || undefined,
    track: ed.value.track,
    type: ed.value.type,
    q: ed.value.q,
    a: ed.value.a,
    keywords: splitText(ed.value.keywordsText),
    sectionId: ed.value.sectionId || undefined
  }
  try {
    await request(`/api/admin/user-questions/${editor.value.id}`, { method: 'PATCH', body: payload })
    msg.value = '已采纳并录入题库'; msgOk.value = true
    editor.value.open = false; await load()
  } catch (e: any) { msg.value = e.message || '采纳失败'; msgOk.value = false }
  finally { busy.value = false }
}
async function reject(item: any) {
  if (!confirm('确认驳回该提问？驳回后不再录入题库。')) return
  await request(`/api/admin/user-questions/${item.id}`, { method: 'PATCH', body: { decision: 'reject' } })
  await load()
}
async function batchReview(decision: 'accept' | 'reject') {
  if (!selectedCount.value) return
  busy.value = true; msg.value = ''
  try {
    const r: any = await request('/api/admin/user-questions/batch', { method: 'POST', body: { ids: Array.from(selected.value), decision } })
    const failed = (r.failed || []).length
    msg.value = `已处理 ${r.okCount}/${r.total} 项` + (failed ? `，${failed} 项失败` : '')
    msgOk.value = !failed
    clearSelection(); await load()
  } catch (e: any) { msg.value = e.message || '批量操作失败'; msgOk.value = false }
  finally { busy.value = false }
}

onMounted(() => {
  // 等待登录态判定完成再加载，避免未授权时发出请求
  const stop = watch(
    () => auth.loaded,
    (v) => { if (v) { load(); stop() } },
    { immediate: true }
  )
})
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-line bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-coral mt-1; }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
