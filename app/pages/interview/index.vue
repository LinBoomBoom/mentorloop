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
      <!-- 技术二级筛选：由服务端按当前方向 + 搜索词归纳，带命中数 -->
      <div v-if="techOptions.length" class="flex gap-2 mb-4 flex-wrap items-center">
        <span class="text-xs text-muted mr-1">技术：</span>
        <button @click="setTech('')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
                :class="!techFilter ? 'border-brand-coral/50 text-brand-coral bg-brand-coral/5' : 'border-line text-sub'">全部</button>
        <button v-for="t in techOptions" :key="t.tech" @click="setTech(techFilter === t.tech ? '' : t.tech)"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
                :class="techFilter === t.tech ? 'border-brand-coral/50 text-brand-coral bg-brand-coral/5' : 'border-line text-sub'">{{ t.tech }} <span class="opacity-60">{{ t.count }}</span></button>
      </div>

      <!-- 题型切换 -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button @click="setTab('hot')" class="px-4 py-2 rounded-xl text-sm font-semibold transition border"
                :class="qTab === 'hot' ? 'border-brand-gold/50 text-brand-gold bg-brand-gold/5' : 'border-line text-sub'">
          <Icon name="star" :size="15" class="inline -mt-0.5" /> 高频必刷题（{{ counts.hot }}）
        </button>
        <button @click="setTab('special')" class="px-4 py-2 rounded-xl text-sm font-semibold transition border"
                :class="qTab === 'special' ? 'border-brand-pink/50 text-brand-pink bg-brand-pink/5' : 'border-line text-sub'">
          <Icon name="bolt" :size="15" class="inline -mt-0.5" /> 特殊场景题（{{ counts.special }}）
        </button>
      </div>

      <a-card v-if="total === 0" class="text-center" :body-style="{ padding: '32px' }">
        <span class="text-muted text-sm">没有匹配{{ q ? '「' + q + '」' : '' }}的题目</span>
        <!-- 命中落在另一题型时给出入口，避免用户误判「搜不到」 -->
        <div v-if="otherCount > 0" class="mt-3">
          <a-button type="link" size="small" @click="setTab(qTab === 'hot' ? 'special' : 'hot')">
            {{ qTab === 'hot' ? '特殊场景题' : '高频必刷题' }}中有 {{ otherCount }} 道匹配，去看看 →
          </a-button>
        </div>
      </a-card>
      <div v-else :class="pending ? 'opacity-60 transition-opacity' : 'transition-opacity'">
        <div class="space-y-2">
          <a-card v-for="item in items" :key="item.id" class="overflow-hidden" :body-style="{ padding: '0' }">
            <button class="w-full text-left p-4 flex items-center gap-3 hover:bg-ink/[.03] transition" @click="toggle(item.id)" :aria-expanded="openSet.has(item.id)">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" :class="qTab === 'hot' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-brand-pink/10 text-brand-pink'">{{ qTab === 'hot' ? 'Q' : 'S' }}</span>
              <span class="font-medium text-sm flex-1 pr-2 leading-snug">{{ item.q }}</span>
              <a-tag class="hidden sm:inline-block shrink-0 !text-[10px] !bg-ink/5 !text-sub" :bordered="false">{{ item.tech }}</a-tag>
              <a-tag class="shrink-0 !text-[10px]" :class="diffMeta(item.difficulty).cls" :bordered="false">{{ diffMeta(item.difficulty).label }}</a-tag>
              <Icon name="chevronRight" :size="16" class="text-muted transition-transform shrink-0" :class="openSet.has(item.id) ? 'rotate-90' : ''" />
            </button>
            <div v-if="openSet.has(item.id)" class="px-4 pb-4 pl-4 sm:pl-14">
              <!-- #151 答案清晰度：明确「参考答案」标签 + 区分度卡片 -->
              <div class="flex items-center gap-1.5 text-[11px] font-semibold text-brand-coral mb-1.5 mt-1">
                <Icon name="checkCircle" :size="13" /> 参考答案
              </div>
              <div class="rounded-r-lg border-l-2 border-brand-coral/60 bg-brand-coral/[.04] p-3.5 prose-dm" v-html="md(item.a)"></div>
              <div v-if="item.keywords && item.keywords.length" class="flex flex-wrap gap-1.5 mt-3">
                <a-tag v-for="k in item.keywords.slice(0, 8)" :key="k" class="!text-[10px] !bg-ink/5 !text-muted" :bordered="false">{{ k }}</a-tag>
              </div>
            </div>
          </a-card>
        </div>

        <!-- 分页：服务端分页，仅传输当前页题目 -->
        <div v-if="total > PAGE_SIZE" class="mt-5 flex justify-center">
          <a-pagination :current="page" :page-size="PAGE_SIZE" :total="total"
                        :show-size-changer="false" :hide-on-single-page="true"
                        @change="goPage" />
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
const VALID_TRACKS = ['frontend', 'backend', 'devops', 'ai']
const route = useRoute()
// 支持带查询参数跳入：?askTrack=（学习路径页答疑）/ ?track= + ?q=（站内搜索结果）
// 注意：必须在 useFetch 之前解析，否则 SSR 首次会先拉一遍 frontend 再重拉，白白多一次查询
const qAsk = route.query.askTrack
const pickTrack = (v: any) => (typeof v === 'string' && VALID_TRACKS.includes(v) ? v : '')
const initTrack = pickTrack(qAsk) || pickTrack(route.query.track) || 'frontend'
const initKw = typeof route.query.q === 'string' ? route.query.q.slice(0, 60) : ''
const activeTrack = ref(initTrack)

const PAGE_SIZE = 10
const qTab = ref<'hot' | 'special'>('hot')
const techFilter = ref('')
const page = ref(1)
const q = ref(initKw)
const qDebounced = ref(initKw) // 搜索防抖，避免每次按键都打服务端

// 服务端分页：题库扩到 2600+ 道后不能再整库下发，只取当前页
const { data: bankRes, pending } = await useFetch(() => '/api/interview/' + activeTrack.value, {
  query: { type: qTab, tech: techFilter, q: qDebounced, page, pageSize: PAGE_SIZE },
  watch: [activeTrack]
})
const bank = computed(() => bankRes.value?.bank || null)
const items = computed<any[]>(() => bank.value?.items || [])
const counts = computed(() => bank.value?.counts || { hot: 0, special: 0 })
const total = computed(() => bank.value?.total || 0)
const techOptions = computed<any[]>(() => bank.value?.techOptions || [])
const otherCount = computed(() => (qTab.value === 'hot' ? counts.value.special : counts.value.hot) || 0)

useSeoMeta({
  title: '面试题库 & AI 陪练',
  description: '前端/后端/运维高频必刷题与特殊场景题，按技术方向细分筛选，答案结构化含代码示例；也可直接向 AI 提问梳理思路。',
  ogTitle: '面试题库 · MentorLoop',
  ogDescription: '高频面试题 + 特殊场景题，按技术精确筛选，答案结构清晰。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
const openSet = ref(new Set<string>())

const askText = ref('')
const askTrack = ref(typeof qAsk === 'string' && VALID_TRACKS.includes(qAsk) ? qAsk : '')
const answer = ref<any>(null)
const asking = ref(false)
const askErr = ref('')

// 难度三档展示：常规/较难/困难（medium 为原被塌缩掉的「较难」中间档）
const DIFF_META: Record<string, { label: string; cls: string }> = {
  hard: { label: '困难', cls: '!bg-red-500/10 !text-red-500' },
  medium: { label: '较难', cls: '!bg-brand-gold/10 !text-brand-gold' },
  normal: { label: '常规', cls: '!bg-brand-coral/10 !text-brand-coral' }
}
function diffMeta(d: string) { return DIFF_META[d] || DIFF_META.normal }
function trackName(t: string) { return (tracks.find(x => x.id === t) || {}).name || t }
function toggle(id: string) {
  const s = new Set(openSet.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openSet.value = s
}
function loadTrack(t: string) {
  if (activeTrack.value === t) return
  page.value = 1
  techFilter.value = ''
  activeTrack.value = t
}
function setTech(t: string) { page.value = 1; techFilter.value = t }
function setTab(t: 'hot' | 'special') { if (qTab.value === t) return; page.value = 1; qTab.value = t }
function goPage(p: number) {
  page.value = p
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
// 搜索防抖 300ms：输入即请求会在 2600 道题的库上打出大量无效查询
let searchTimer: any = null
watch(q, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; qDebounced.value = v.trim() }, 300)
})
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
async function ask() {
  if (!askText.value) { askErr.value = '请先输入问题'; return }
  if (await guard()) return // 未登录 → 引导登录
  asking.value = true; askErr.value = ''
  try {
    answer.value = await request('/api/interview/ask', { method: 'POST', body: { track: askTrack.value || undefined, question: askText.value } })
  } catch (e: any) { askErr.value = e.message } finally { asking.value = false }
}
</script>
