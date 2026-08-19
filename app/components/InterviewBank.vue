<template>
  <div>
    <!-- 方向大类（flex-wrap 换行，无横向滚动条） -->
    <div class="flex gap-2 mb-4 flex-wrap items-center">
      <span class="text-xs text-muted mr-1">方向大类：</span>
      <button v-for="g in groups" :key="g.id" @click="setGroup(g.id)"
              class="chip-tab chip-tab-sm"
              :class="activeGroupId === g.id ? 'chip-tab-active' : ''"
              :style="activeGroupId === g.id ? { color: g.color, borderColor: g.color } : {}">
        {{ g.name }}
      </button>
      <button @click="clearAll" class="chip-tab chip-tab-sm"
              :class="!activeGroupId && !activeDirectionId && !filterIds.length ? 'chip-tab-active' : ''">全部</button>
    </div>

    <a-input v-model:value="q" class="mb-4 max-w-md" placeholder="搜索面试题，如：响应式、缓存击穿…" aria-label="搜索面试题">
      <template #prefix><Icon name="search" :size="17" class="text-muted" /></template>
    </a-input>

    <a-card v-if="!bank"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    <template v-else>
      <!-- 子方向：随大类切换（nav 单选 / filter 多选） -->
      <div v-if="activeGroup" class="mb-4">
        <div class="text-xs text-muted mb-2">{{ activeGroup.name }} · {{ activeGroup.directions.length }} 个方向</div>
        <div class="flex gap-2 flex-wrap">
          <template v-if="activeGroup.directions.every(d => d.select === 'filter')">
            <button v-for="d in activeGroup.directions" :key="d.id" @click="toggleFilter(d)"
                    class="chip-tab chip-tab-sm"
                    :class="filterIds.includes(d.id) ? 'chip-tab-active' : ''">{{ d.name }}</button>
          </template>
          <template v-else>
            <button v-for="d in activeGroup.directions" :key="d.id" @click="setNav(d)"
                    class="chip-tab chip-tab-sm"
                    :class="activeDirectionId === d.id ? 'chip-tab-active' : ''">{{ d.name }}</button>
          </template>
        </div>
      </div>

      <!-- official 方向占位（无内部章节/题目的方向） -->
      <a-card v-if="isOfficialPlaceholder" class="text-center mb-4" :body-style="{ padding: '24px' }">
        <div class="text-sm text-muted mb-2">「{{ activeDirection?.name }}」方向以官方文档 / 学习路线图为主，题库持续建设中</div>
        <NuxtLink :to="`/learn/${track}`" class="text-brand-coral font-semibold hover:underline">前往学习路线图 →</NuxtLink>
      </a-card>

      <!-- 题目区 -->
      <template v-else>
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
          <div v-if="otherCount > 0" class="mt-3">
            <a-button type="link" size="small" @click="setTab(qTab === 'hot' ? 'special' : 'hot')">
              {{ qTab === 'hot' ? '特殊场景题' : '高频必刷题' }}中有 {{ otherCount }} 道匹配，去看看 →
            </a-button>
          </div>
        </a-card>
        <div v-else :class="pending ? 'opacity-60 transition-opacity' : 'transition-opacity'">
          <div class="space-y-2">
            <NuxtLink v-for="item in items" :key="item.id"
                      :to="`/interview/${track}/${techToSlug(item.tech)}/${item.id}`"
                      class="block rounded-xl border border-line p-4 hover:border-brand-coral/50 hover:bg-brand-coral/[.03] transition group">
              <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      :class="qTab === 'hot' ? 'bg-amber-500/15 text-amber-600' : 'bg-brand-coral/10 text-brand-coral'">{{ qTab === 'hot' ? 'Q' : 'S' }}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm leading-snug line-clamp-2 md:line-clamp-none text-ink group-hover:text-brand-coral transition">{{ item.q }}</div>
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
import { getGroups, getGroup, getDirection, getAllDirections, type Direction } from '~/data/learningTaxonomy'
import { techToSlug } from '~~/server/utils/interviewSlugs'

const props = defineProps<{ track: string; lockedTech?: string }>()
const activeTrack = ref(props.track)

const PAGE_SIZE = 10
const qTab = ref<'hot' | 'special'>('hot')
const page = ref(1)
const route = useRoute()
const q = ref(typeof route.query.q === 'string' ? route.query.q.slice(0, 60) : '')
const qDebounced = ref(q.value)

const groups = computed(() => getGroups(activeTrack.value))
const lockedTech = ref(props.lockedTech || '')

const activeGroupId = ref(typeof route.query.group === 'string' ? route.query.group : '')
const activeDirectionId = ref(typeof route.query.direction === 'string' ? route.query.direction : '')
const filterIds = ref<string[]>([])

// 初始化：route.direction / lockedTech 优先定位到对应方向，并反查所属大类
if (activeDirectionId.value) {
  const d = getDirection(activeTrack.value, activeDirectionId.value)
  if (d) activeGroupId.value = groups.value.find(g => g.directions.some(x => x.id === d.id))?.id || ''
  else activeDirectionId.value = ''
} else if (lockedTech.value) {
  const d = getAllDirections(activeTrack.value).find(x => x.techName === lockedTech.value)
  if (d) {
    activeDirectionId.value = d.id
    activeGroupId.value = groups.value.find(g => g.directions.some(x => x.id === d.id))?.id || ''
  }
}
if (activeGroupId.value && !getGroup(activeTrack.value, activeGroupId.value)) activeGroupId.value = ''

const activeGroup = computed(() => getGroup(activeTrack.value, activeGroupId.value) || null)
const activeDirection = computed(() => activeDirectionId.value ? getDirection(activeTrack.value, activeDirectionId.value) : null)

// official 方向且无任何可筛选维度（无章节/题库）→ 占位提示
const isOfficialPlaceholder = computed(() =>
  !!activeDirection.value?.official && !activeDirection.value?.skillSubtrack && !activeDirection.value?.techName
)

// 当前生效的方向集合 → 推导 API 过滤参数
const effectiveDirections = computed<Direction[]>(() => {
  if (activeDirectionId.value && activeDirection.value) return [activeDirection.value]
  if (filterIds.value.length) return filterIds.value.map(id => getDirection(activeTrack.value, id)).filter(Boolean) as Direction[]
  if (activeGroup.value) return activeGroup.value.directions
  return []
})
const apiSubtrack = computed(() => effectiveDirections.value.map(d => d.skillSubtrack).filter(Boolean).join(','))
const apiTech = computed(() => {
  const parts = effectiveDirections.value.map(d => d.techName).filter(Boolean) as string[]
  if (lockedTech.value && !parts.includes(lockedTech.value)) parts.push(lockedTech.value)
  return parts.join(',')
})

const { data: bankRes, pending } = await useFetch(() => '/api/interview/' + activeTrack.value, {
  query: { type: qTab, subtrack: apiSubtrack, tech: apiTech, q: qDebounced, page, pageSize: PAGE_SIZE }
})
const bank = computed(() => bankRes.value?.bank || null)
const items = computed<any[]>(() => bank.value?.items || [])
const counts = computed(() => bank.value?.counts || { hot: 0, special: 0 })
const total = computed(() => bank.value?.total || 0)
const otherCount = computed(() => (qTab.value === 'hot' ? counts.value.special : counts.value.hot) || 0)

// 任何过滤条件变化都回到第一页
watch([activeGroupId, activeDirectionId, filterIds, qTab, qDebounced], () => { page.value = 1 })

function setGroup(id: string) {
  if (activeGroupId.value === id) { activeGroupId.value = ''; activeDirectionId.value = ''; filterIds.value = []; return }
  activeGroupId.value = id; activeDirectionId.value = ''; filterIds.value = []
}
function clearAll() { activeGroupId.value = ''; activeDirectionId.value = ''; filterIds.value = [] }
function setNav(d: Direction) { page.value = 1; activeDirectionId.value = activeDirectionId.value === d.id ? '' : d.id; filterIds.value = [] }
function toggleFilter(d: Direction) {
  page.value = 1
  const i = filterIds.value.indexOf(d.id)
  if (i >= 0) filterIds.value.splice(i, 1); else filterIds.value.push(d.id)
}

// 难度三档展示：常规/较难/困难
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
// 搜索防抖 300ms
let searchTimer: any = null
watch(q, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; qDebounced.value = v.trim() }, 300)
})
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>
