<template>
  <div>
    <Breadcrumb :items="[{ label: '学习中心', to: '/learn', icon: 'home' }, { label: module?.name || '' }]" />

    <a-card v-if="!module"><a-skeleton active :paragraph="{ rows: 6 }" /></a-card>
    <template v-else>
      <div>
        <h1 class="page-title">{{ module.name }}</h1>
        <p class="text-muted text-sm mt-1 mb-4">{{ module.desc }}</p>

        <div class="flex items-center gap-3 mb-5">
          <a-input v-model:value="q" class="max-w-md flex-1" :placeholder="searchPlaceholder" aria-label="搜索本节小节">
            <template #prefix><Icon name="search" :size="17" class="text-muted" /></template>
          </a-input>
          <a-button size="small" class="shrink-0" @click="toggleAll">{{ allCollapsed ? '展开全部' : '折叠全部' }}</a-button>
          <a-button size="small" class="shrink-0" @click="drawerOpen = true"><Icon name="menu" :size="16" /> 目录</a-button>
        </div>

        <!-- ========== 第一层：方向大类（可换行 chip，无横向滚动） ========== -->
        <div class="mb-4">
          <div class="text-xs text-muted mb-2">方向大类</div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="selectGroup('')"
              class="group-chip"
              :class="!activeGroupId ? 'group-chip-active' : ''"
              :style="!activeGroupId ? groupActiveStyle(null) : {}"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: module.color }"></span>
              全部
              <span class="text-xs text-muted">{{ module.chapters?.length || 0 }}</span>
            </button>
            <button
              v-for="g in groups"
              :key="g.id"
              @click="selectGroup(g.id)"
              class="group-chip"
              :class="activeGroupId === g.id ? 'group-chip-active' : ''"
              :style="activeGroupId === g.id ? groupActiveStyle(g.color) : {}"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: g.color }"></span>
              {{ g.name }}
              <span class="text-xs text-muted">{{ groupCount(g) }}</span>
            </button>
          </div>
        </div>

        <!-- ========== 第二层：当前大类的子方向 ========== -->
        <div v-if="activeGroupId && activeGroup" class="mb-5">
          <div class="text-xs text-muted mb-2">
            {{ activeGroup.name }} ·
            <span v-if="isFilterGroup">可多选筛选</span>
            <span v-else>选择子方向</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <!-- 大类「全部」：展示该大类下所有章节 -->
            <button
              @click="selectGroupAll"
              class="dir-chip"
              :class="isGroupAll ? 'dir-chip-active' : ''"
              :style="isGroupAll ? dirActiveStyle(activeGroup.color) : {}"
            >
              全部{{ activeGroup.name }}
            </button>

            <!-- filter 模式：多选 chip -->
            <template v-if="isFilterGroup">
              <button
                v-for="d in visibleDirections(activeGroup)"
                :key="d.id"
                @click="toggleFilter(d.id)"
                class="dir-chip"
                :class="filterIds.includes(d.id) ? 'dir-chip-active' : ''"
                :style="filterIds.includes(d.id) ? dirActiveStyle(activeGroup.color) : {}"
              >
                {{ d.name }}
                <span class="text-xs opacity-70">{{ dirCount(d) }}</span>
              </button>
            </template>

            <!-- nav 模式：单选 tab -->
            <template v-else>
              <button
                v-for="d in visibleDirections(activeGroup)"
                :key="d.id"
                @click="selectNav(d.id)"
                class="dir-chip"
                :class="navDirectionId === d.id ? 'dir-chip-active' : ''"
                :style="navDirectionId === d.id ? dirActiveStyle(activeGroup.color) : {}"
              >
                {{ d.name }}
                <span v-if="d.official" class="text-[10px] px-1 rounded !bg-ink/10">官方</span>
                <span v-else class="text-xs opacity-70">{{ dirCount(d) }}</span>
              </button>
            </template>
          </div>
        </div>

        <a-card v-if="browseMode" class="mb-5 !bg-brand-coral/5 !border-brand-coral/15" :body-style="{ padding: '16px' }">
          <div class="flex items-center gap-2 text-sm text-muted">
            <Icon name="eye" :size="16" class="text-brand-coral shrink-0" /> 浏览模式：未登录也能查看全部章节。登录后开启「打卡」即可记录已掌握，全部章节随时可自由阅读。
          </div>
        </a-card>
        <a-card v-else class="mb-5 !bg-brand-coral/5 !border-brand-coral/15" :body-style="{ padding: '16px' }">
          <div class="flex items-center gap-2 text-sm text-muted">
            <Icon name="compass" :size="16" class="text-brand-coral shrink-0" /> 全部章节均可自由阅读，勾选「已掌握」即记录进度，按你自己的节奏推进。
          </div>
        </a-card>

        <!-- 官方方向占位：无内置章节，引导到学习路线图 / 官方文档 -->
        <a-card v-if="officialPlaceholder" class="mb-5" :body-style="{ padding: '24px' }">
          <div class="flex items-start gap-3">
            <span class="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" :style="{ background: activeGroup?.color }"><Icon name="link" :size="20" /></span>
            <div class="flex-1 min-w-0">
              <div class="font-bold">{{ officialPlaceholder.name }}</div>
              <p class="text-sm text-muted mt-1">该方向以官方文档 / 学习路线图为主，平台暂未内置独立章节。建议结合下列权威资料系统学习。</p>
              <NuxtLink to="/roadmap" class="inline-flex items-center gap-1 mt-3 text-sm text-brand-coral font-medium hover:underline">
                前往学习路线图 <Icon name="arrowRight" :size="15" />
              </NuxtLink>
            </div>
          </div>
        </a-card>

        <a-card v-if="filteredChapters.length === 0 && !officialPlaceholder" class="text-center" :body-style="{ padding: '40px' }">
          <span class="text-muted text-sm">没有匹配「{{ q }}」的小节，换个关键词试试～</span>
        </a-card>

        <div v-else class="lg:grid lg:grid-cols-[minmax(0,1fr)_264px] lg:gap-6 items-start">
          <div class="min-w-0 order-1">
            <div class="space-y-5">
              <a-card v-for="(ch, ci) in filteredChapters" :key="ch.id" class="reveal" :body-style="{ padding: '24px' }">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                       :style="{ background: module.color }">{{ ci + 1 }}</div>
                  <button type="button" class="min-w-0 flex-1 text-left" @click="toggleChapter(ch.id)">
                    <h3 class="font-bold">{{ ch.title }}</h3>
                    <p class="text-xs text-muted line-clamp-1">{{ ch.goal }}</p>
                  </button>
                  <span class="text-xs text-muted shrink-0">{{ (ch.sections || []).length }} 节</span>
                  <button type="button" @click="toggleChapter(ch.id)" :aria-label="isCollapsed(ch.id) ? '展开章节' : '折叠章节'"
                          class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink/5 text-muted transition">
                    <Icon :name="isCollapsed(ch.id) ? 'chevronRight' : 'chevronDown'" :size="18" />
                  </button>
                </div>

                <div v-if="!isCollapsed(ch.id)" class="grid sm:grid-cols-2 gap-3">
                  <NuxtLink v-for="(s, si) in chapterSections(ch)" :key="s.id" :to="`/learn/${module.id}/${ch.id}/${s.id}`"
                            class="flex items-center gap-3 p-3 rounded-xl border transition"
                            :class="isDone(progress, module.id, ch.id, s.id)
                              ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                              : 'bg-white border-line hover:border-emerald-200'">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                         :class="isDone(progress, module.id, ch.id, s.id) ? 'bg-emerald-500 text-white' : 'bg-ink/8 text-muted'">
                      <Icon v-if="isDone(progress, module.id, ch.id, s.id)" name="check" :size="14" />
                    </div>
                    <span class="text-sm font-medium truncate"
                          :class="isDone(progress, module.id, ch.id, s.id) ? 'text-emerald-700' : 'text-sub'">{{ s.title }}</span>
                  </NuxtLink>
                </div>
              </a-card>
            </div>
          </div>

          <!-- 桌面端：本章目录（粘性侧栏） -->
          <aside class="hidden lg:block sticky top-6 order-2">
            <a-card :body-style="{ padding: '20px' }">
              <div class="text-sm font-bold mb-3 flex items-center gap-1.5"><Icon name="book" :size="15" class="text-brand-coral" /> 本章目录</div>
              <div class="space-y-3 max-h-[72vh] overflow-auto scrollbar-thin pr-1">
                <div v-for="(ch, ci) in filteredChapters" :key="ch.id" class="px-1 -mx-1">
                  <div class="text-xs font-semibold mb-1.5 leading-snug border-l-[3px] pl-2"
                       :class="ch.id === activeChapterId ? 'text-ink border-brand-coral' : 'text-sub border-transparent'">{{ ci + 1 }}. {{ ch.title }}</div>
                  <div class="space-y-0.5">
                    <NuxtLink v-for="s in (ch.sections || [])" :key="s.id" :to="`/learn/${module.id}/${ch.id}/${s.id}`"
                              class="flex items-center gap-2 text-xs py-1 px-2 rounded-lg hover:bg-ink/5 transition min-w-0"
                              :class="isDone(progress, module.id, ch.id, s.id) ? 'text-emerald-700 font-medium' : 'text-sub'">
                      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="isDone(progress, module.id, ch.id, s.id) ? 'bg-emerald-500' : 'bg-ink/20'"></span>
                      <span class="break-words min-w-0">{{ s.title }}</span>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </a-card>
          </aside>
        </div>
      </div>

      <a-drawer v-model:open="drawerOpen" title="章节目录" placement="left" :width="300">
        <div class="space-y-4">
          <div v-for="(ch, ci) in filteredChapters" :key="ch.id">
            <div class="font-semibold text-sm mb-1">{{ ci + 1 }}. {{ ch.title }}</div>
            <div class="space-y-0.5 pl-2">
              <NuxtLink v-for="s in (ch.sections || [])" :key="s.id" :to="`/learn/${module.id}/${ch.id}/${s.id}`"
                        @click="drawerOpen = false"
                        class="block text-xs py-1 px-2 rounded hover:bg-ink/5"
                        :class="isDone(progress, module.id, ch.id, s.id) ? 'text-emerald-700' : 'text-sub'">{{ s.title }}</NuxtLink>
            </div>
          </div>
        </div>
      </a-drawer>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  LEARNING_TAXONOMY,
  getGroups,
  getGroup,
  getDirection
} from '~/data/learningTaxonomy'

const route = useRoute()
const { request } = useApi()
const { isDone } = useLearning()
const auth = useAuthStore()
const browseMode = computed(() => !auth.isLoggedIn)

const mid = computed(() => route.params.module as string)
const groups = computed(() => LEARNING_TAXONOMY[mid.value] || [])

// 公开模块内容：SSR 加载
const { data: modRes } = await useFetch(() => '/api/modules/' + mid.value)
const module = ref<any>(null)
watch(modRes, (v: any) => { if (v?.module) module.value = v.module }, { immediate: true })

useSeoMeta({
  title: computed(() => module.value ? module.value.name + ' · 学习路径' : '学习路径'),
  description: computed(() => module.value ? module.value.desc : '按章节系统学习，免费浏览全部内容。'),
  ogTitle: computed(() => 'MentorLoop · ' + (module.value?.name || '学习')),
  ogDescription: computed(() => module.value?.desc || '系统学习路径'),
  ogType: 'website',
  ogUrl: safeOgUrl()
})

// 进度：仅登录后拉取（未登录可浏览）
const progress = ref<any>({})
watch(() => auth.isLoggedIn, async (v) => {
  if (v) { try { progress.value = (await request('/api/progress')).progress || {} } catch (e) {} }
}, { immediate: true })

// 章节折叠状态
const collapsed = reactive<Record<string, boolean>>({})
const drawerOpen = ref(false)
const isCollapsed = (id: string) => !!collapsed[id]
function toggleChapter(id: string) { collapsed[id] = !collapsed[id] }
const allCollapsed = computed(() => {
  const chs = (module.value?.chapters || []) as any[]
  return chs.length > 0 && chs.every((c) => collapsed[c.id])
})
function toggleAll() {
  const chs = (module.value?.chapters || []) as any[]
  const next = !allCollapsed.value
  chs.forEach((c) => { collapsed[c.id] = next })
}

// ===== 两层方向选择 =====
const activeGroupId = ref<string>('')           // '' = 全部
const navDirectionId = ref<string>('')          // nav 模式：单选
const filterIds = ref<string[]>([])             // filter 模式：多选

function initFromQuery() {
  const g = typeof route.query.group === 'string' ? route.query.group : ''
  const d = typeof route.query.direction === 'string' ? route.query.direction : ''
  activeGroupId.value = (g && getGroup(mid.value, g)) ? g : ''
  if (activeGroupId.value && d) {
    const grp = getGroup(mid.value, activeGroupId.value)!
    const ids = d.includes(',') ? d.split(',').filter(Boolean) : [d]
    const valid = ids.filter(id => grp.directions.some(x => x.id === id))
    if (valid.length) {
      if (grp.directions.every(x => x.select === 'filter')) {
        filterIds.value = valid
        navDirectionId.value = ''
      } else {
        navDirectionId.value = valid[0]
        filterIds.value = []
      }
    }
  }
}
initFromQuery()

const activeGroup = computed(() => getGroup(mid.value, activeGroupId.value) || null)
const isFilterGroup = computed(() => !!activeGroup.value && activeGroup.value.directions.every(d => d.select === 'filter'))
const isGroupAll = computed(() => {
  if (!activeGroup.value) return false
  if (isFilterGroup.value) return filterIds.value.length === 0
  return navDirectionId.value === ''
})

const subMap = computed(() => module.value?.subtracks || {})
function dirCount(d: any): number {
  return d.chapterSubtracks.reduce((s: number, st: string) => s + (subMap.value[st]?.chapterCount || 0), 0)
}
function dirSectionCount(d: any): number {
  return d.chapterSubtracks.reduce((s: number, st: string) => s + (subMap.value[st]?.sectionCount || 0), 0)
}
function groupCount(g: any): number {
  return g.directions.reduce((s: number, d: any) => s + dirCount(d), 0)
}
// phantom 隐藏：非官方且 0 章
function visibleDirections(g: any) {
  return g.directions.filter((d: any) => d.official || dirCount(d) > 0)
}

function groupActiveStyle(color: string | null) {
  const c = color || module.value?.color || '#D85A30'
  return { borderColor: c, background: c + '14', color: 'rgb(var(--ink))' }
}
function dirActiveStyle(color: string) {
  return { borderColor: color, background: color + '14', color: 'rgb(var(--ink))' }
}

function resetSelection() {
  navDirectionId.value = ''
  filterIds.value = []
}

function selectGroup(id: string) {
  activeGroupId.value = id
  resetSelection()
  updateUrl()
}
function selectGroupAll() {
  if (isFilterGroup.value) { filterIds.value = [] }
  else { navDirectionId.value = '' }
  updateUrl()
}
function selectNav(id: string) {
  navDirectionId.value = navDirectionId.value === id ? '' : id
  updateUrl()
}
function toggleFilter(id: string) {
  const i = filterIds.value.indexOf(id)
  if (i >= 0) filterIds.value.splice(i, 1)
  else filterIds.value.push(id)
  updateUrl()
}

// 当前选择命中的 subtrack 集合（null = 全部章节）
const activeSubtracks = computed<string[] | null>(() => {
  if (!activeGroupId.value || !activeGroup.value) return null
  const g = activeGroup.value
  if (isFilterGroup.value) {
    if (filterIds.value.length) {
      return filterIds.value.flatMap(id => getDirection(mid.value, id)?.chapterSubtracks || [])
    }
    return g.directions.flatMap((d: any) => d.chapterSubtracks)
  } else {
    if (navDirectionId.value) {
      return getDirection(mid.value, navDirectionId.value)?.chapterSubtracks || []
    }
    return g.directions.flatMap((d: any) => d.chapterSubtracks)
  }
})

// 官方方向占位：选中了单个 official 方向且无内置章节
const officialPlaceholder = computed(() => {
  if (!activeGroup.value || isFilterGroup.value || !navDirectionId.value) return null
  const d = getDirection(mid.value, navDirectionId.value)
  if (d?.official && dirCount(d) === 0) return d
  return null
})

const searchPlaceholder = computed(() => {
  if (officialPlaceholder.value) return '该方向暂无以小节形式组织的章节'
  const label = navDirectionId.value
    ? getDirection(mid.value, navDirectionId.value)?.name
    : activeGroup.value?.name
  return label ? `在 ${label} 中搜索…` : '搜索本节标题，如：事件循环、Flex…'
})

function updateUrl() {
  const query: Record<string, string> = {}
  if (activeGroupId.value) query.group = activeGroupId.value
  if (activeGroupId.value && !isGroupAll.value) {
    if (isFilterGroup.value) query.direction = filterIds.value.join(',')
    else if (navDirectionId.value) query.direction = navDirectionId.value
  }
  if (q.value) query.q = q.value
  navigateTo({ query }, { replace: true })
}

// ===== 章节/小节搜索过滤 =====
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const filteredChapters = computed(() => {
  let all = (module.value?.chapters || []) as any[]
  const subs = activeSubtracks.value
  if (subs) all = all.filter((ch: any) => subs.includes(ch.subtrack))
  const kw = q.value.trim().toLowerCase()
  if (!kw) return all
  return all.filter((ch: any) => ch.title.toLowerCase().includes(kw) || (ch.sections || []).some((s: any) => s.title.toLowerCase().includes(kw)))
})
const chapterSections = (ch: any) => {
  const kw = q.value.trim().toLowerCase()
  if (!kw) return ch.sections || []
  return (ch.sections || []).filter((s: any) => s.title.toLowerCase().includes(kw) || ch.title.toLowerCase().includes(kw))
}

// 当前学习章节：第一个未完成章节（侧栏粉色高亮）
const activeChapterId = computed(() => {
  const mod = module.value
  if (!mod || !auth.isLoggedIn) return null
  for (const ch of (mod.chapters || [])) {
    const secs = ch.sections || []
    if (secs.length === 0) continue
    const done = secs.filter((s: any) => isDone(progress.value, mod.id, ch.id, s.id)).length
    if (done < secs.length) return ch.id
  }
  return null
})

// 模块数据异步到达后，用真实 subtrack 计数重新初始化（保持 URL 选择有效）
watch(module, () => { initFromQuery() })
</script>

<style scoped>
/* 方向大类 chip */
.group-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 0.5px solid rgb(var(--line));
  background: #fff;
  font-size: 13px;
  color: rgb(var(--ink));
  transition: border-color 150ms ease, background-color 150ms ease;
}
.group-chip:hover { border-color: rgb(var(--brand-coral) / 0.4); }

.group-chip-active {
  border-width: 1px;
  font-weight: 600;
}

/* 子方向 chip（tab / 多选） */
.dir-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 0.5px solid rgb(var(--line));
  background: #fff;
  font-size: 13px;
  color: rgb(var(--sub));
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
}
.dir-chip:hover { border-color: rgb(var(--brand-coral) / 0.4); }

.dir-chip-active {
  border-width: 1px;
  font-weight: 600;
}
</style>
