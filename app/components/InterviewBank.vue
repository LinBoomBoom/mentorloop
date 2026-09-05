<template>
  <div>
    <!-- 第一层：技能赛道（单选，严格对齐路线图 track） -->
    <div class="flex gap-2 mb-4 flex-wrap items-center">
      <span class="text-xs text-muted mr-1">技能赛道：</span>
      <button v-for="t in tracks" :key="t.id" @click="selectTrack(t.id)"
              class="chip-tab chip-tab-sm"
              :class="activeTrackId === t.id ? 'chip-tab-active' : ''"
              :style="activeTrackId === t.id ? { color: t.color, borderColor: t.color } : {}">
        {{ t.name }}
      </button>
      <button @click="selectTrack('')" class="chip-tab chip-tab-sm"
              :class="!activeTrackId ? 'chip-tab-active' : ''">全部</button>
    </div>
    <div v-if="activeSubDetail" class="flex gap-2 mb-3 flex-wrap items-center">
      <span class="text-xs text-muted mr-1">子主题筛选：</span>
      <button class="chip-tab chip-tab-sm chip-tab-active" @click="clearSubDetail()">
        {{ SUBTRACK_DISPLAY[activeSubDetail] || activeSubDetail }} <span class="ml-1 opacity-70">✕</span>
      </button>
    </div>

    <a-input v-model:value="q" class="mb-4 max-w-md" placeholder="搜索面试题，如：响应式、缓存击穿…" aria-label="搜索面试题">
      <template #prefix><Icon name="search" :size="17" class="text-muted" /></template>
    </a-input>

    <a-card v-if="!bank"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    <template v-else>
      <!-- 第二层：当前赛道下的技术方向（单选） -->
      <div v-if="activeTrack" class="mb-4">
        <div class="text-xs text-muted mb-2">{{ activeTrack.name }} · 按技术筛选</div>
        <div class="flex gap-2 flex-wrap">
          <button @click="selectTech('')"
                  class="chip-tab chip-tab-sm"
                  :class="!activeTech ? 'chip-tab-active' : ''">全部{{ activeTrack.name }}</button>
          <button v-for="tc in activeTrack.techNames" :key="tc" @click="selectTech(tc)"
                  class="chip-tab chip-tab-sm"
                  :class="activeTech === tc ? 'chip-tab-active' : ''">{{ tc }}</button>
        </div>
      </div>

      <!-- 题目区 -->
      <template v-if="total > 0">
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

        <div :class="pending ? 'opacity-60 transition-opacity' : 'transition-opacity'">
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

      <a-card v-else class="text-center" :body-style="{ padding: '32px' }">
        <span class="text-muted text-sm">没有匹配{{ q ? '「' + q + '」' : '' }}的题目</span>
        <div v-if="otherCount > 0" class="mt-3">
          <a-button type="link" size="small" @click="setTab(qTab === 'hot' ? 'special' : 'hot')">
            {{ qTab === 'hot' ? '特殊场景题' : '高频必刷题' }}中有 {{ otherCount }} 道匹配，去看看 →
          </a-button>
        </div>
      </a-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { getTracks, SUBTRACK_DISPLAY, type Track } from '~/data/learningTaxonomy'
import { techToSlug } from '~~/server/utils/interviewSlugs'

const props = defineProps<{ track: string }>()
const activeTrackParam = ref(props.track)

const PAGE_SIZE = 10
const qTab = ref<'hot' | 'special'>('hot')
const page = ref(1)
const route = useRoute()
const q = ref(typeof route.query.q === 'string' ? route.query.q.slice(0, 60) : '')
const qDebounced = ref(q.value)

const tracks = computed<Track[]>(() => getTracks(activeTrackParam.value))

const activeTrackId = ref(typeof route.query.group === 'string' ? route.query.group : '')
const activeTech = ref(typeof route.query.direction === 'string' ? route.query.direction : '')
// 子主题级过滤（学→练闭环 deep-link：从学习章节页「做更多练习」带 ?sd=go 进入）
const activeSubDetail = ref(typeof route.query.sd === 'string' ? route.query.sd : '')

const activeTrack = computed<Track | null>(() => activeTrackId.value ? tracks.value.find(t => t.id === activeTrackId.value) || null : null)

// 过滤参数：赛道 → subtrack；技术 → tech（均单选）
const apiSubtrack = computed(() => activeTrackId.value)
const apiTech = computed(() => activeTech.value)

const { data: bankRes, pending } = await useFetch(() => '/api/interview/' + activeTrackParam.value, {
  query: { type: qTab, subtrack: apiSubtrack, tech: apiTech, sd: activeSubDetail, q: qDebounced, page, pageSize: PAGE_SIZE }
})
const bank = computed(() => bankRes.value?.bank || null)
const items = computed<any[]>(() => bank.value?.items || [])
const counts = computed(() => bank.value?.counts || { hot: 0, special: 0 })
const total = computed(() => bank.value?.total || 0)
const otherCount = computed(() => (qTab.value === 'hot' ? counts.value.special : counts.value.hot) || 0)

watch([activeTrackId, activeTech, qTab, qDebounced], () => { page.value = 1 })

function selectTrack(id: string) {
  if (activeTrackId.value === id) { activeTrackId.value = ''; activeTech.value = ''; return }
  activeTrackId.value = id; activeTech.value = ''
  updateUrl()
}
function selectTech(tc: string) {
  activeTech.value = activeTech.value === tc ? '' : tc
  updateUrl()
}
function updateUrl() {
  const query: Record<string, string> = {}
  if (activeTrackId.value) query.group = activeTrackId.value
  if (activeTrackId.value && activeTech.value) query.direction = activeTech.value
  if (activeSubDetail.value) query.sd = activeSubDetail.value
  if (q.value) query.q = q.value
  navigateTo({ query }, { replace: true })
}
function clearSubDetail() {
  if (!activeSubDetail.value) return
  activeSubDetail.value = ''
  page.value = 1
  updateUrl()
}

const DIFF_META: Record<string, { label: string; cls: string }> = {
  hard: { label: '困难', cls: '!bg-red-500/10 !text-red-500' },
  medium: { label: '较难', cls: '!bg-amber-500/15 !text-amber-600' },
  easy: { label: '常规', cls: '!bg-brand-coral/10 !text-brand-coral' }
}
function diffMeta(d: string) { return DIFF_META[d] || DIFF_META.easy }
function setTab(t: 'hot' | 'special') { if (qTab.value === t) return; page.value = 1; qTab.value = t }
function goPage(p: number) {
  page.value = p
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
let searchTimer: any = null
watch(q, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; qDebounced.value = v.trim() }, 300)
})
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>
