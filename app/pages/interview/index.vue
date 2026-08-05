<template>
  <div>
    <h1 class="text-2xl font-extrabold mb-1">面试题库 &amp; AI 陪练</h1>
    <p class="text-muted text-sm mb-5">高频必刷题 + 特殊场景题，按技术方向精确定位；也能直接提问让 AI 帮你梳理思路。</p>

    <NuxtLink to="/interview/sim" class="block mb-6">
      <a-card class="reveal hover:-translate-y-0.5 transition !border-brand-coral/30 !bg-brand-coral/5" :body-style="{ padding: '16px' }">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral flex items-center justify-center shrink-0"><Icon name="sparkles" :size="20" /></span>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm">AI 深度模拟面试 <a-tag class="!bg-brand-coral/15 !text-brand-coral !ml-1" :bordered="false">VIP</a-tag></div>
            <div class="text-xs text-muted truncate">多轮实战问答 + 逐题评分反馈，还原真实面试节奏</div>
          </div>
          <Icon name="arrowRight" :size="18" class="text-muted shrink-0" />
        </div>
      </a-card>
    </NuxtLink>

    <!-- 提问 -->
    <a-card class="mb-6" :body-style="{ padding: '20px' }">
      <div class="flex flex-col sm:flex-row gap-2 mb-3">
        <select v-model="askTrack" class="input !w-full sm:!w-auto !py-2.5">
          <option value="">全部方向</option>
          <option value="frontend">前端</option>
          <option value="backend">后端</option>
          <option value="devops">运维</option>
          <option value="ai">AI 工程</option>
        </select>
        <input v-model="askText" class="input flex-1" placeholder="问我点什么？比如：Vue3 响应式原理、Redis 缓存击穿…" @keyup.enter="ask" />
        <a-button type="primary" class="shrink-0" @click="ask" :disabled="asking"><Icon name="sparkles" :size="16" /> 提问</a-button>
      </div>
      <div v-if="answer" class="rounded-xl p-4 mt-2" :class="answer.matched ? 'bg-brand-coral/5 border border-brand-coral/20' : 'bg-ink/5'">
        <div class="flex items-center gap-2 mb-2 text-xs font-semibold" :class="answer.matched ? 'text-brand-coral' : 'text-muted'">
          <Icon :name="answer.matched ? 'checkCircle' : 'sparkles'" :size="15" />
          {{ answer.matched ? ('匹配自题库' + (answer.track ? ' · ' + trackName(answer.track) : '')) : 'AI 提示' }}
        </div>
        <div class="prose-dm" v-html="md(answer.answer)"></div>
      </div>
      <p v-if="askErr" class="text-red-500 text-sm mt-2">{{ askErr }}</p>
    </a-card>

    <!-- 方向切换 -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button v-for="t in tracks" :key="t.id" @click="loadTrack(t.id)"
              class="px-4 py-2 rounded-xl text-sm font-semibold transition border"
              :class="activeTrack === t.id ? 'border-brand-coral/50 text-brand-coral bg-brand-coral/5' : 'border-line text-sub'">{{ t.name }}</button>
    </div>

    <a-input v-model:value="q" class="mb-4 max-w-md" placeholder="搜索面试题，如：响应式、缓存击穿…" aria-label="搜索面试题">
      <template #prefix><Icon name="search" :size="17" class="text-muted" /></template>
    </a-input>

    <a-card v-if="!bank"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    <template v-else>
      <!-- 技术二级筛选：从当前方向题库自动归纳子类 -->
      <div v-if="techOptions.length" class="flex gap-2 mb-4 flex-wrap items-center">
        <span class="text-xs text-muted mr-1">技术：</span>
        <button @click="techFilter = ''" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
                :class="!techFilter ? 'border-brand-coral/50 text-brand-coral bg-brand-coral/5' : 'border-line text-sub'">全部</button>
        <button v-for="t in techOptions" :key="t" @click="techFilter = (techFilter === t ? '' : t)"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
                :class="techFilter === t ? 'border-brand-coral/50 text-brand-coral bg-brand-coral/5' : 'border-line text-sub'">{{ t }}</button>
      </div>

      <!-- 题型切换 -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button @click="qTab = 'hot'; page = 1" class="px-4 py-2 rounded-xl text-sm font-semibold transition border"
                :class="qTab === 'hot' ? 'border-brand-gold/50 text-brand-gold bg-brand-gold/5' : 'border-line text-sub'">
          <Icon name="star" :size="15" class="inline -mt-0.5" /> 高频必刷题（{{ filteredHot.length }}）
        </button>
        <button @click="qTab = 'special'; page = 1" class="px-4 py-2 rounded-xl text-sm font-semibold transition border"
                :class="qTab === 'special' ? 'border-brand-pink/50 text-brand-pink bg-brand-pink/5' : 'border-line text-sub'">
          <Icon name="bolt" :size="15" class="inline -mt-0.5" /> 特殊场景题（{{ filteredSpecial.length }}）
        </button>
      </div>

      <a-card v-if="activeList.length === 0" class="text-center" :body-style="{ padding: '32px' }">
        <span class="text-muted text-sm">没有匹配「{{ q }}」的题目</span>
      </a-card>
      <div v-else>
        <div class="space-y-2">
          <a-card v-for="q in pageList" :key="q.id" class="overflow-hidden" :body-style="{ padding: '0' }">
            <button class="w-full text-left p-4 flex items-center gap-3 hover:bg-ink/[.03] transition" @click="toggle(q.id)" :aria-expanded="openSet.has(q.id)">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" :class="qTab === 'hot' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-brand-pink/10 text-brand-pink'">{{ qTab === 'hot' ? 'Q' : 'S' }}</span>
              <span class="font-medium text-sm flex-1 pr-2 leading-snug">{{ q.q }}</span>
              <a-tag class="hidden sm:inline-block shrink-0 !text-[10px] !bg-ink/5 !text-sub" :bordered="false">{{ q.tech }}</a-tag>
              <a-tag shrink-0 !text-[10px] :class="q.difficulty === 'hard' ? '!bg-red-500/10 !text-red-500' : '!bg-brand-coral/10 !text-brand-coral'" :bordered="false">{{ q.difficulty === 'hard' ? '较难' : '常规' }}</a-tag>
              <Icon name="chevronRight" :size="16" class="text-muted transition-transform shrink-0" :class="openSet.has(q.id) ? 'rotate-90' : ''" />
            </button>
            <div v-if="openSet.has(q.id)" class="px-4 pb-4 pl-4 sm:pl-14">
              <!-- #151 答案清晰度：明确「参考答案」标签 + 区分度卡片 -->
              <div class="flex items-center gap-1.5 text-[11px] font-semibold text-brand-coral mb-1.5 mt-1">
                <Icon name="checkCircle" :size="13" /> 参考答案
              </div>
              <div class="rounded-r-lg border-l-2 border-brand-coral/60 bg-brand-coral/[.04] p-3.5 prose-dm" v-html="md(q.a)"></div>
              <div v-if="q.keywords && q.keywords.length" class="flex flex-wrap gap-1.5 mt-3">
                <a-tag v-for="k in q.keywords.slice(0, 8)" :key="k" class="!text-[10px] !bg-ink/5 !text-muted" :bordered="false">{{ k }}</a-tag>
              </div>
            </div>
          </a-card>
        </div>

        <!-- 分页：长列表分段，避免一次性铺满 -->
        <div v-if="activeList.length > PAGE_SIZE" class="mt-5 flex justify-center">
          <a-pagination :current="page" :page-size="PAGE_SIZE" :total="activeList.length"
                        :show-size-changer="false" :hide-on-single-page="true"
                        @change="(p:number)=>page=p" />
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
  description: '前端/后端/运维高频必刷题与特殊场景题，按技术方向细分筛选，答案结构化含代码示例；也可直接向 AI 提问梳理思路。',
  ogTitle: '面试题库 · MentorLoop',
  ogDescription: '高频面试题 + 特殊场景题，按技术精确筛选，答案结构清晰。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
const openSet = ref(new Set<string>())
const qTab = ref<'hot' | 'special'>('hot')
const techFilter = ref('')
const page = ref(1)
const PAGE_SIZE = 10
const q = ref('')

// 当前方向题库归纳出的技术子类（去重排序），用于二级筛选 chips
const techOptions = computed(() => {
  const set = new Set<string>()
  const list = [...(bank.value?.hot || []), ...(bank.value?.special || [])]
  list.forEach((x: any) => x.tech && set.add(x.tech))
  return Array.from(set).sort()
})

const filteredHot = computed(() => {
  const list = bank.value?.hot || []
  const kw = q.value.trim().toLowerCase()
  const tf = techFilter.value
  return list.filter((x: any) =>
    (!tf || x.tech === tf) &&
    (!kw || (x.q || '').toLowerCase().includes(kw) || (x.a || '').toLowerCase().includes(kw) || (x.keywords || []).some((k: string) => k.toLowerCase().includes(kw)))
  )
})
const filteredSpecial = computed(() => {
  const list = bank.value?.special || []
  const kw = q.value.trim().toLowerCase()
  const tf = techFilter.value
  return list.filter((x: any) =>
    (!tf || x.tech === tf) &&
    (!kw || (x.q || '').toLowerCase().includes(kw) || (x.a || '').toLowerCase().includes(kw) || (x.keywords || []).some((k: string) => k.toLowerCase().includes(kw)))
  )
})
const activeList = computed(() => (qTab.value === 'hot' ? filteredHot.value : filteredSpecial.value))
const pageList = computed(() => activeList.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

const askText = ref('')
const askTrack = ref('')
// 支持从学习路径页带 ?askTrack= 跳入，自动选中对应方向的答疑与题库
const route = useRoute()
const VALID_TRACKS = ['frontend', 'backend', 'devops', 'ai']
const qAsk = route.query.askTrack
if (typeof qAsk === 'string' && VALID_TRACKS.includes(qAsk)) { activeTrack.value = qAsk; askTrack.value = qAsk }
const answer = ref<any>(null)
const asking = ref(false)
const askErr = ref('')

function trackName(t: string) { return (tracks.find(x => x.id === t) || {}).name || t }
function toggle(id: string) {
  const s = new Set(openSet.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openSet.value = s
}
function loadTrack(t: string) {
  activeTrack.value = t
  page.value = 1
  techFilter.value = ''
}
// 搜索 / 技术筛选变化时回到第一页，避免停留在越界页
watch([q, techFilter], () => { page.value = 1 })
async function ask() {
  if (!askText.value) { askErr.value = '请先输入问题'; return }
  if (await guard()) return // 未登录 → 引导登录
  asking.value = true; askErr.value = ''
  try {
    answer.value = await request('/api/interview/ask', { method: 'POST', body: { track: askTrack.value || undefined, question: askText.value } })
  } catch (e: any) { askErr.value = e.message } finally { asking.value = false }
}
</script>
