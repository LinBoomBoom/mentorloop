<template>
  <div>
    <h1 class="text-2xl font-extrabold mb-1">面试题库 &amp; AI 陪练</h1>
    <p class="text-muted text-sm mb-5">高频必刷题 + 特殊场景题，也能直接提问让 AI 帮你梳理思路。</p>

    <NuxtLink to="/interview/sim" class="card flex items-center gap-3 p-4 mb-6 border border-brand-coral/30 bg-brand-coral/5 reveal hover:-translate-y-0.5 transition">
      <span class="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral flex items-center justify-center shrink-0"><Icon name="sparkles" :size="20" /></span>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-sm">AI 深度模拟面试 <span class="chip bg-brand-coral/15 text-brand-coral !ml-1">VIP</span></div>
        <div class="text-xs text-muted truncate">多轮实战问答 + 逐题评分反馈，还原真实面试节奏</div>
      </div>
      <Icon name="arrowRight" :size="18" class="text-muted shrink-0" />
    </NuxtLink>

    <!-- 提问 -->
    <div class="card p-5 mb-6 reveal">
      <div class="flex flex-col sm:flex-row gap-2 mb-3">
        <select v-model="askTrack" class="input !w-full sm:!w-auto !py-2.5">
          <option value="">全部方向</option>
          <option value="frontend">前端</option>
          <option value="backend">后端</option>
          <option value="devops">运维</option>
          <option value="ai">AI 工程</option>
        </select>
        <input v-model="askText" class="input flex-1" placeholder="问我点什么？比如：Vue3 响应式原理、Redis 缓存击穿…" @keyup.enter="ask" />
        <button class="btn btn-primary shrink-0" @click="ask" :disabled="asking"><Icon name="sparkles" :size="16" /> 提问</button>
      </div>
      <div v-if="answer" class="rounded-xl p-4 mt-2" :class="answer.matched ? 'bg-brand-coral/5 border border-brand-coral/20' : 'bg-ink/5'">
        <div class="flex items-center gap-2 mb-2 text-xs font-semibold" :class="answer.matched ? 'text-brand-coral' : 'text-muted'">
          <Icon :name="answer.matched ? 'checkCircle' : 'sparkles'" :size="15" />
          {{ answer.matched ? ('匹配自题库' + (answer.track ? ' · ' + trackName(answer.track) : '')) : 'AI 提示' }}
        </div>
        <div class="prose-dm" v-html="md(answer.answer)"></div>
      </div>
      <p v-if="askErr" class="text-red-500 text-sm mt-2">{{ askErr }}</p>
    </div>

    <!-- 方向切换 -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button v-for="t in tracks" :key="t.id" @click="loadTrack(t.id)"
              class="px-4 py-2 rounded-xl text-sm font-semibold transition border"
              :class="activeTrack === t.id ? 'border-brand-coral/50 text-brand-coral bg-brand-coral/5' : 'border-line text-sub'">{{ t.name }}</button>
    </div>

    <div class="relative mb-5 max-w-md">
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" :size="17" /></span>
      <input v-model="q" class="input !pl-11" type="search" placeholder="搜索面试题，如：响应式、缓存击穿…" aria-label="搜索面试题" />
    </div>

    <div v-if="!bank" class="card h-40 shimmer"></div>
    <template v-else>
      <h3 class="section-title mb-3 flex items-center gap-2"><Icon name="star" :size="18" class="text-brand-gold" /> 高频必刷题（{{ filteredHot.length }}）</h3>
      <div v-if="filteredHot.length === 0" class="card p-8 text-center text-muted text-sm">没有匹配「{{ q }}」的题目</div>
      <div v-else class="space-y-2 mb-7">
        <div v-for="q in filteredHot" :key="q.id" class="card overflow-hidden">
          <button class="w-full text-left p-4 flex items-center gap-3 hover:bg-ink/[.03] transition" @click="toggle(q.id)" :aria-expanded="openSet.has(q.id)">
            <span class="w-7 h-7 rounded-lg bg-brand-coral/10 text-brand-coral flex items-center justify-center text-xs font-bold shrink-0">Q</span>
            <span class="font-medium text-sm flex-1 pr-2">{{ q.q }}</span>
            <Icon name="chevronRight" :size="16" class="text-muted transition-transform shrink-0" :class="openSet.has(q.id) ? 'rotate-90' : ''" />
          </button>
          <div v-if="openSet.has(q.id)" class="px-4 pb-4 pl-14 prose-dm"><div v-html="md(q.a)"></div></div>
        </div>
      </div>

      <h3 class="section-title mb-3 flex items-center gap-2"><Icon name="bolt" :size="18" class="text-brand-pink" /> 特殊场景题（{{ filteredSpecial.length }}）</h3>
      <div v-if="filteredSpecial.length === 0" class="card p-8 text-center text-muted text-sm">没有匹配「{{ q }}」的题目</div>
      <div v-else class="space-y-2">
        <div v-for="q in filteredSpecial" :key="q.id" class="card overflow-hidden">
          <button class="w-full text-left p-4 flex items-center gap-3 hover:bg-ink/[.03] transition" @click="toggle(q.id)" :aria-expanded="openSet.has(q.id)">
            <span class="w-7 h-7 rounded-lg bg-brand-pink/10 text-brand-pink flex items-center justify-center text-xs font-bold shrink-0">S</span>
            <span class="font-medium text-sm flex-1 pr-2">{{ q.q }}</span>
            <Icon name="chevronRight" :size="16" class="text-muted transition-transform shrink-0" :class="openSet.has(q.id) ? 'rotate-90' : ''" />
          </button>
          <div v-if="openSet.has(q.id)" class="px-4 pb-4 pl-14 prose-dm"><div v-html="md(q.a)"></div></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const { md } = useMarkdown()
const { guard } = useLoginGate()
const tracks = [{ id: 'frontend', name: '前端' }, { id: 'backend', name: '后端' }, { id: 'devops', name: '运维' }, { id: 'ai', name: 'AI 工程' }]
const activeTrack = ref('frontend')
const { data: bankRes } = await useFetch(() => '/api/interview/' + activeTrack.value, { watch: [activeTrack] })
const bank = computed(() => bankRes.value?.bank || null)

useSeoMeta({
  title: '面试题库 & AI 陪练',
  description: '前端/后端/运维高频必刷题与特殊场景题，答案结构化含代码示例；也可直接向 AI 提问梳理思路。',
  ogTitle: '面试题库 · MentorLoop',
  ogDescription: '高频面试题 + 特殊场景题，答案结构清晰，免费浏览。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
const openSet = ref(new Set<string>())
const q = ref('')
const filteredHot = computed(() => {
  const list = bank.value?.hot || []
  const kw = q.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter((x: any) => (x.q || '').toLowerCase().includes(kw) || (x.a || '').toLowerCase().includes(kw))
})
const filteredSpecial = computed(() => {
  const list = bank.value?.special || []
  const kw = q.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter((x: any) => (x.q || '').toLowerCase().includes(kw) || (x.a || '').toLowerCase().includes(kw))
})
const askText = ref('')
const askTrack = ref('')
const answer = ref<any>(null)
const asking = ref(false)
const askErr = ref('')

function trackName(t: string) { return (tracks.find(x => x.id === t) || {}).name || t }
function toggle(id: string) {
  const s = new Set(openSet.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openSet.value = s
}
function loadTrack(t: string) { activeTrack.value = t }
async function ask() {
  if (!askText.value) { askErr.value = '请先输入问题'; return }
  if (guard()) return // 未登录 → 引导登录
  asking.value = true; askErr.value = ''
  try {
    answer.value = await request('/api/interview/ask', { method: 'POST', body: { track: askTrack.value || undefined, question: askText.value } })
  } catch (e: any) { askErr.value = e.message } finally { asking.value = false }
}
</script>
