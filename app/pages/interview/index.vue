<template>
  <div>
    <h1 class="page-title mb-1">面试题库 &amp; AI 陪练</h1>
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
        <a-button type="primary" class="shrink-0 !h-[42px]" @click="ask" :disabled="asking"><Icon name="sparkles" :size="16" /> 提问</a-button>
      </div>
      <!-- 生成中过渡块：LLM 推理可能需要数秒，给出可见反馈，避免用户以为卡死而反复点击/刷新 -->
      <div v-if="generating" class="rounded-xl p-4 mt-2 bg-ink/5 border border-dashed border-brand-coral/30">
        <div class="flex items-center gap-2 mb-3 text-xs font-semibold text-brand-coral">
          <Icon name="spinner" :size="16" class="animate-spin" /> AI 模型生成中…（基于大模型推理，通常需要几秒，请稍候）
        </div>
        <div class="space-y-2">
          <div class="h-3 rounded bg-ink/10 animate-pulse"></div>
          <div class="h-3 rounded bg-ink/10 animate-pulse w-5/6"></div>
          <div class="h-3 rounded bg-ink/10 animate-pulse w-2/3"></div>
          <div class="h-3 rounded bg-ink/10 animate-pulse w-1/2"></div>
        </div>
      </div>
      <div v-else-if="answer" class="rounded-xl p-4 mt-2" :class="answer.matched ? 'bg-brand-coral/5 border border-brand-coral/20' : 'bg-ink/5'">
        <div class="flex items-center gap-2 mb-2 text-xs font-semibold" :class="answer.matched ? 'text-brand-coral' : 'text-muted'">
          <Icon :name="answer.matched ? 'checkCircle' : 'sparkles'" :size="15" />
          {{ answer.matched ? ('匹配自题库' + (answer.track ? ' · ' + trackName(answer.track) : '')) : 'AI 提示' }}
        </div>
        <!-- 「题库未命中」是影响用户预期的重要信息（答案来自模型推理而非人工审校题库），
             必须放在答案正文之前——放在最底部用户往往滚不到就走了 -->
        <div v-if="!answer.matched"
             class="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/[0.12] px-3.5 py-3">
          <div class="flex items-start gap-2">
            <Icon name="database" :size="15" class="text-amber-600 mt-0.5 shrink-0" />
            <div class="min-w-0 text-xs leading-relaxed">
              <div class="font-bold text-amber-700 dark:text-amber-400">这道题目前不在面试题库中</div>
              <p class="text-sub mt-1">
                下方答案由 AI 现场推理生成，尚未经过人工审校。<template v-if="answer.collected">我们已把它收录到「待补充题库」，后续会经 AI 语义化增强、由管理员审核后回流进正式题库。</template><template v-else>我们会结合 AI 增强后收录到「待补充题库」，供管理员审核补充。</template>
              </p>
            </div>
          </div>
        </div>
        <div class="prose-dm" v-html="md(answer.answer)"></div>
      </div>
      <p v-if="askErr" class="text-red-500 text-sm mt-2">{{ askErr }}</p>
    </a-card>

    <!-- 方向切换 -->
    <div class="flex gap-2 mb-4 flex-wrap mt-3">
      <button v-for="t in tracks" :key="t.id" @click="loadTrack(t.id)"
              class="chip-tab"
              :class="activeTrack === t.id ? 'chip-tab-active' : ''">{{ t.name }}</button>
    </div>

    <!-- 浏览模式：按技术子类筛选（全库）/ 按技能路线图导航（路线图专属题） -->
    <div class="flex gap-2 mb-4 flex-wrap items-center">
      <span class="text-xs text-muted mr-1">浏览方式：</span>
      <button @click="setMode('tech')" class="chip-tab chip-tab-sm"
              :class="browseMode === 'tech' ? 'chip-tab-active' : ''">
        <Icon name="search" :size="14" class="inline -mt-0.5" /> 按技术筛选
      </button>
      <button @click="setMode('tree')" class="chip-tab chip-tab-sm"
              :class="browseMode === 'tree' ? 'chip-tab-active' : ''">
        <Icon name="target" :size="14" class="inline -mt-0.5" /> 按技能树
      </button>
    </div>

    <a-input v-model:value="q" class="mb-4 max-w-md" placeholder="搜索面试题，如：响应式、缓存击穿…" aria-label="搜索面试题">
      <template #prefix><Icon name="search" :size="17" class="text-muted" /></template>
    </a-input>

    <a-card v-if="!bank"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    <template v-else>
      <!-- 技能树导航：赛道卡片 → 技能点 chips，结构与 /roadmap 路线图一致 -->
      <template v-if="browseMode === 'tree'">
        <!-- 未选赛道：展示该方向下全部赛道及其专属题数 -->
        <div v-if="!treeSubtrack" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <button v-for="st in curSubtracks" :key="st.id" @click="pickSubtrack(st.id)"
                  class="text-left rounded-xl border border-line p-4 hover:border-brand-coral/50 hover:bg-brand-coral/[.03] transition">
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <span class="font-bold text-sm leading-snug">{{ st.name }}</span>
              <span class="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-coral/10 text-brand-coral">{{ subCount(st.id) }} 题</span>
            </div>
            <div class="text-xs text-muted">{{ stSkillCount(st) }} 个技能点 · {{ stMustCount(st) }} 个必会</div>
          </button>
        </div>

        <!-- 已选赛道：面包屑 + 分层技能点 -->
        <div v-else class="mb-5">
          <div class="flex items-center gap-2 mb-3 flex-wrap text-sm">
            <button @click="clearSubtrack" class="text-brand-coral font-semibold hover:underline">← 全部赛道</button>
            <span class="text-muted">/</span>
            <span class="font-bold">{{ curSubtrackObj && curSubtrackObj.name }}</span>
            <template v-if="treeSkill">
              <span class="text-muted">/</span>
              <span class="font-semibold text-brand-coral">{{ treeSkill }}</span>
              <button @click="pickSkill(treeSkill)" class="text-xs text-muted hover:text-brand-coral">✕ 取消</button>
            </template>
          </div>
          <div v-for="lv in ((curSubtrackObj && curSubtrackObj.levels) || [])" :key="lv.level" class="mb-2.5 flex items-start gap-2 flex-wrap">
            <span class="text-[11px] font-bold px-2 py-1 rounded-md shrink-0 mt-0.5"
                  :style="{ background: levelColor[lv.level] + '1a', color: levelColor[lv.level] }">{{ levelLabel[lv.level] }}</span>
            <button v-for="s in lv.skills" :key="s.name" @click="pickSkill(s.name)"
                    class="chip-tab chip-tab-sm"
                    :class="treeSkill === s.name ? 'chip-tab-active' : ''">
              <span v-if="s.must" class="text-brand-gold">★</span>{{ s.name }}
              <span class="opacity-60 ml-0.5">{{ skillCount(treeSubtrack, s.name) }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- 技术二级筛选：由服务端按当前方向 + 搜索词归纳，带命中数 -->
      <div v-else-if="techOptions.length" class="flex gap-2 mb-4 flex-wrap items-center">
        <span class="text-xs text-muted mr-1">技术：</span>
        <button @click="setTech('')" class="chip-tab chip-tab-sm"
                :class="!techFilter ? 'chip-tab-active' : ''">全部</button>
        <button v-for="t in techOptions" :key="t.tech" @click="setTech(techFilter === t.tech ? '' : t.tech)"
                class="chip-tab chip-tab-sm"
                :class="techFilter === t.tech ? 'chip-tab-active' : ''">{{ t.tech }} <span class="opacity-60">{{ t.count }}</span></button>
      </div>

      <!-- 题目区：技能树模式需先选定赛道，避免一上来就平铺全量题目淹没导航 -->
      <template v-if="browseMode === 'tech' || treeSubtrack">
      <!-- 题型切换 -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button @click="setTab('hot')" class="chip-tab"
                :class="qTab === 'hot' ? 'chip-tab-active !bg-amber-600' : ''">
          <Icon name="star" :size="15" class="inline -mt-0.5" /> 高频必刷题（{{ counts.hot }}）
        </button>
        <button @click="setTab('special')" class="chip-tab"
                :class="qTab === 'special' ? 'chip-tab-active !bg-orange-600' : ''">
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
            <button class="w-full text-left p-4 flex items-start gap-3 hover:bg-ink/[.03] transition" @click="toggle(item.id)" :aria-expanded="openSet.has(item.id)">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" :class="qTab === 'hot' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-brand-pink/10 text-brand-pink'">{{ qTab === 'hot' ? 'Q' : 'S' }}</span>
              <span class="font-medium text-sm flex-1 min-w-0 pr-1 leading-snug">{{ item.q }}</span>
              <a-tag class="hidden sm:inline-block shrink-0 !text-[10px] !bg-ink/5 !text-sub" :bordered="false">{{ item.tech }}</a-tag>
              <a-tag v-if="item.skill" class="hidden md:inline-block shrink-0 !text-[10px] !bg-brand-coral/10 !text-brand-coral" :bordered="false">{{ item.skill }}</a-tag>
              <a-tag class="shrink-0 !text-[10px]" :class="diffMeta(item.difficulty).cls" :bordered="false">{{ diffMeta(item.difficulty).label }}</a-tag>
              <Icon name="chevronRight" :size="16" class="text-muted transition-transform shrink-0" :class="openSet.has(item.id) ? 'rotate-90' : ''" />
            </button>
            <div v-if="openSet.has(item.id)" class="px-4 pb-4 pl-4 sm:pl-14">
              <!-- #151 答案清晰度：明确「参考答案」标签 + 区分度卡片 -->
              <div class="flex items-center gap-1.5 text-[11px] font-semibold text-brand-coral mb-1.5 mt-1">
                <Icon name="checkCircle" :size="13" /> 参考答案
              </div>
              <div class="rounded-r-lg border-l-2 border-brand-coral/60 bg-brand-coral/[.04] p-3.5 prose-dm" v-html="md(item.a)"></div>
              <div v-if="item.sectionTitle" class="flex items-center gap-1.5 mt-3 text-xs text-muted">
                <Icon name="book" :size="13" /> 关联章节：<span class="font-medium text-sub">{{ item.sectionTitle }}</span>
              </div>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { roadmap, levelColor, levelLabel } from '~/data/skillRoadmap'
import type { SubTrack } from '~/data/skillRoadmap'
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

// ===== 技能树浏览模式 =====
// 浏览方式：tech=按技术子类（全库）/ tree=按路线图赛道+技能点（仅路线图专属题 rq-）
// 深链：/interview?mode=tree&subtrack=xxx&skill=yyy（由 /roadmap 技能抽屉「去题库练习」跳转）
const browseMode = ref(route.query.mode === 'tree' ? 'tree' : 'tech')
const treeSubtrack = ref(typeof route.query.subtrack === 'string' ? route.query.subtrack : '')
const treeSkill = ref(typeof route.query.skill === 'string' ? route.query.skill : '')

// 当前方向下的赛道列表（静态路线图数据，前端已内置）
const curSubtracks = computed<SubTrack[]>(() => {
  const dir = roadmap.find(d => d.id === activeTrack.value)
  return dir ? dir.subTracks : []
})
// 当前已选赛道对象（用于面包屑名称与分层技能点渲染）
const curSubtrackObj = computed<SubTrack | null>(() => {
  if (!treeSubtrack.value) return null
  return curSubtracks.value.find(s => s.id === treeSubtrack.value) || null
})

// 技能树题数聚合（每赛道 / 每「赛道|技能」的题数，供徽标展示）
const { data: treeRes } = await useFetch(() => '/api/interview/tree/' + activeTrack.value, {
  watch: [activeTrack]
})
const treeAgg = computed<any>(() => treeRes.value?.tree || { bySubtrack: {}, bySkill: {} })
function subCount(id: string): number { return treeAgg.value.bySubtrack?.[id] || 0 }
function skillCount(sub: string, name: string): number { return treeAgg.value.bySkill?.[`${sub}|${name}`] || 0 }
function stSkillCount(st: SubTrack): number { return st.levels.reduce((n, l) => n + l.skills.length, 0) }
function stMustCount(st: SubTrack): number { return st.levels.reduce((n, l) => n + l.skills.filter(s => s.must).length, 0) }

function setMode(m: 'tech' | 'tree') {
  browseMode.value = m
  // 切回技术筛选时清空技能树选择，避免「技术筛选」仍附带赛道/技能点限定而出人意料地收窄结果
  if (m === 'tech') { treeSubtrack.value = ''; treeSkill.value = '' }
}
function pickSubtrack(id: string) { page.value = 1; treeSubtrack.value = id; treeSkill.value = '' }
function clearSubtrack() { page.value = 1; treeSubtrack.value = ''; treeSkill.value = '' }
function pickSkill(name: string) { page.value = 1; treeSkill.value = treeSkill.value === name ? '' : name }

// 服务端分页：题库扩到 2600+ 道后不能再整库下发，只取当前页
// 技能树模式通过在 query 里带 subtrack/skill 实现精确挂载筛选（空值表示不限）
const { data: bankRes, pending } = await useFetch(() => '/api/interview/' + activeTrack.value, {
  query: { type: qTab, tech: techFilter, q: qDebounced, page, pageSize: PAGE_SIZE, subtrack: treeSubtrack, skill: treeSkill },
  watch: [activeTrack, treeSubtrack, treeSkill]
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
const generating = ref(false) // 延迟 300ms 后才显示「生成中」过渡块，避免题库命中时的快速闪烁
const genTimer: any = null
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
  // 赛道 id 是方向内的，切方向必须清空技能树选择，否则会残留上一个方向的赛道筛选
  treeSubtrack.value = ''
  treeSkill.value = ''
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
// BUG-3：用户手动清空提问输入框时，同步隐藏上次 AI/题库结果组件
watch(askText, (v) => {
  if (!v.trim()) { answer.value = null; askErr.value = '' }
})
onBeforeUnmount(() => { if (genTimer) clearTimeout(genTimer) })
async function ask() {
  if (!askText.value) { askErr.value = '请先输入问题'; return }
  if (await guard()) return // 未登录 → 引导登录
  asking.value = true; askErr.value = ''; answer.value = null
  // 延迟 300ms 显示「生成中」过渡块：题库命中等快速响应不会出现闪烁，
  // 而 LLM 推理（通常数秒）期间能给出明确反馈，避免用户误以为卡死而反复点击/刷新
  if (genTimer) clearTimeout(genTimer)
  const timer = setTimeout(() => { if (asking.value) generating.value = true }, 300)
  try {
    answer.value = await request('/api/interview/ask', { method: 'POST', body: { track: askTrack.value || undefined, question: askText.value } })
  } catch (e: any) { askErr.value = e.message } finally {
    clearTimeout(timer)
    asking.value = false
    generating.value = false
  }
}
</script>
