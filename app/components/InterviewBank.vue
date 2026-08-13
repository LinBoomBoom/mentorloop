<template>
  <div>
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
              <span v-if="s.must" class="text-amber-600">★</span>{{ s.name }}
              <span class="opacity-60 ml-0.5">{{ skillCount(treeSubtrack, s.name) }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- 技术二级筛选：由服务端按当前方向 + 搜索词归纳，带命中数 -->
      <!-- 方向页与技术页共用同一行 chip：方向页"全部"高亮，技术页当前技术高亮，二者视觉一致 -->
      <div v-else-if="techOptions.length" class="flex gap-2 mb-4 flex-wrap items-center">
        <span class="text-xs text-muted mr-1">技术：</span>
        <NuxtLink :to="`/interview/${activeTrack}/`" class="chip-tab chip-tab-sm" :class="!techFilter ? 'chip-tab-active' : ''">全部</NuxtLink>
        <NuxtLink v-for="t in techOptions" :key="t.tech"
                  :to="`/interview/${activeTrack}/${techToSlug(t.tech)}${t.tech === techFilter ? '' : '?tech=' + encodeURIComponent(t.tech)}`"
                  class="chip-tab chip-tab-sm"
                  :class="t.tech === techFilter ? 'chip-tab-active' : ''">{{ t.tech }} <span class="opacity-60">{{ t.count }}</span></NuxtLink>
      </div>

      <!-- 题目区：技能树模式需先选定赛道，避免一上来就平铺全量题目淹没导航 -->
      <template v-if="browseMode === 'tech' || treeSubtrack">
      <!-- 题型切换 -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button @click="setTab('hot')" class="chip-tab"
                :class="qTab === 'hot' ? 'chip-tab-active' : ''">
          <Icon name="star" :size="15" class="inline -mt-0.5" /> 高频必刷题（{{ counts.hot }}）
        </button>
        <button @click="setTab('special')" class="chip-tab"
                :class="qTab === 'special' ? 'chip-tab-active' : ''">
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
          <NuxtLink v-for="item in items" :key="item.id"
                    :to="`/interview/${activeTrack}/${techToSlug(item.tech)}/${item.id}`"
                    class="block rounded-xl border border-line p-4 hover:border-brand-coral/50 hover:bg-brand-coral/[.03] transition group">
            <div class="flex items-start gap-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" :class="qTab === 'hot' ? 'bg-amber-500/15 text-amber-600' : 'bg-brand-coral/10 text-brand-coral'">{{ qTab === 'hot' ? 'Q' : 'S' }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm leading-snug line-clamp-2 md:line-clamp-none group-hover:text-brand-coral transition">{{ item.q }}</div>
                <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                  <a-tag class="!text-[10px]" :class="diffMeta(item.difficulty).cls" :bordered="false">{{ diffMeta(item.difficulty).label }}</a-tag>
                  <a-tag class="!text-[10px] !bg-ink/5 !text-sub" :bordered="false">{{ item.tech }}</a-tag>
                  <a-tag v-if="item.skill" class="!text-[10px] !bg-brand-coral/10 !text-brand-coral" :bordered="false">{{ item.skill }}</a-tag>
                  <span class="text-[11px] text-muted ml-auto opacity-0 group-hover:opacity-100 transition whitespace-nowrap">查看解析 →</span>
                </div>
              </div>
            </div>
          </NuxtLink>
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
import { techToSlug } from '~~/server/utils/interviewSlugs'
const props = defineProps<{ track: string; lockedTech?: string }>()
const { request } = useApi()

// track 由页面校验后传入，固定不变（方向切换交由上级路由 /interview/[track]）
const activeTrack = ref(props.track)

const PAGE_SIZE = 10
const qTab = ref<'hot' | 'special'>('hot')
const techFilter = ref(props.lockedTech || '')
const page = ref(1)
const route = useRoute()
const q = ref(typeof route.query.q === 'string' ? route.query.q.slice(0, 60) : '')
const qDebounced = ref(q.value) // 搜索防抖，避免每次按键都打服务端

// ===== 技能树浏览模式 =====
// 浏览方式：tech=按技术子类（全库）/ tree=按路线图赛道+技能点（仅路线图专属题 rq-）
// 深链：/interview/[track]?mode=tree&subtrack=xxx&skill=yyy（由 /roadmap 技能抽屉「去题库练习」跳转）
const browseMode = ref(route.query.mode === 'tree' ? 'tree' : 'tech')
const treeSubtrack = ref(typeof route.query.subtrack === 'string' ? route.query.subtrack : '')
const treeSkill = ref(typeof route.query.skill === 'string' ? route.query.skill : '')

// 当前方向下的赛道列表（静态路线图数据，前端已内置）
const curSubtracks = computed<SubTrack[]>(() => {
  const dir = roadmap.find(d => d.id === activeTrack.value)
  return dir ? dir.subTracks : []
})
const curSubtrackObj = computed<SubTrack | null>(() => {
  if (!treeSubtrack.value) return null
  return curSubtracks.value.find(s => s.id === treeSubtrack.value) || null
})

// 技能树题数聚合（每赛道 / 每「赛道|技能」的题数，供徽标展示）
const { data: treeRes } = await useFetch(() => '/api/interview/tree/' + activeTrack.value)
const treeAgg = computed<any>(() => treeRes.value?.tree || { bySubtrack: {}, bySkill: {} })
function subCount(id: string): number { return treeAgg.value.bySubtrack?.[id] || 0 }
function skillCount(sub: string, name: string): number { return treeAgg.value.bySkill?.[`${sub}|${name}`] || 0 }
function stSkillCount(st: SubTrack): number { return st.levels.reduce((n, l) => n + l.skills.length, 0) }
function stMustCount(st: SubTrack): number { return st.levels.reduce((n, l) => n + l.skills.filter(s => s.must).length, 0) }

function setMode(m: 'tech' | 'tree') {
  browseMode.value = m
  if (m === 'tech') { treeSubtrack.value = ''; treeSkill.value = '' }
}
function pickSubtrack(id: string) { page.value = 1; treeSubtrack.value = id; treeSkill.value = '' }
function clearSubtrack() { page.value = 1; treeSubtrack.value = ''; treeSkill.value = '' }
function pickSkill(name: string) { page.value = 1; treeSkill.value = treeSkill.value === name ? '' : name }

// 服务端分页：题库扩到 2600+ 道后不能再整库下发，只取当前页
const { data: bankRes, pending } = await useFetch(() => '/api/interview/' + activeTrack.value, {
  query: { type: qTab, tech: techFilter, q: qDebounced, page, pageSize: PAGE_SIZE, subtrack: treeSubtrack, skill: treeSkill }
})
const bank = computed(() => bankRes.value?.bank || null)
const items = computed<any[]>(() => bank.value?.items || [])
const counts = computed(() => bank.value?.counts || { hot: 0, special: 0 })
const total = computed(() => bank.value?.total || 0)
const techOptions = computed<any[]>(() => bank.value?.techOptions || [])
const otherCount = computed(() => (qTab.value === 'hot' ? counts.value.special : counts.value.hot) || 0)

// 难度三档展示：常规/较难/困难（medium 为原被塌缩掉的「较难」中间档）
const DIFF_META: Record<string, { label: string; cls: string }> = {
  hard: { label: '困难', cls: '!bg-red-500/10 !text-red-500' },
  medium: { label: '较难', cls: '!bg-amber-500/15 !text-amber-600' },
  normal: { label: '常规', cls: '!bg-brand-coral/10 !text-brand-coral' }
}
function diffMeta(d: string) { return DIFF_META[d] || DIFF_META.normal }
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
</script>
