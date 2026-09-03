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

        <!-- ========== 第一层：技能赛道（单选，严格对齐路线图 track） ========== -->
        <div class="mb-4">
          <div class="text-xs text-muted mb-2">技能赛道</div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="selectTrack('')"
              class="group-chip"
              :class="!activeTrackId ? 'group-chip-active' : ''"
              :style="!activeTrackId ? groupActiveStyle(module.color) : {}"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: module.color }"></span>
              全部
              <span class="text-xs text-muted">{{ module.chapters?.length || 0 }}</span>
            </button>
            <button
              v-for="t in contentTracks"
              :key="t.id"
              @click="selectTrack(t.id)"
              class="group-chip"
              :class="activeTrackId === t.id ? 'group-chip-active' : ''"
              :style="activeTrackId === t.id ? groupActiveStyle(t.color) : {}"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: t.color }"></span>
              {{ t.name }}
              <span class="text-xs text-muted">{{ trackCount(t) }}</span>
            </button>
          </div>
        </div>

        <!-- ========== 第二层：当前赛道的子主题（单选） ========== -->
        <!-- 子主题只有一个时，合并为单个标准赛道名 chip，避免"全部XX"与"缩写子主题"并列的冗余/不标准问题 -->
        <div v-if="activeTrack && visibleSubTopics.length > 1" class="mb-5">
          <div class="text-xs text-muted mb-2">{{ activeTrack.name }} · 选择子主题</div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="selectSub('')"
              class="dir-chip"
              :class="!activeSubId ? 'dir-chip-active' : ''"
              :style="!activeSubId ? dirActiveStyle(activeTrack.color) : {}"
            >
              全部{{ activeTrack.name }}
            </button>
            <button
              v-for="s in visibleSubTopics"
              :key="s.id"
              @click="selectSub(s.chapterSubtrack)"
              class="dir-chip"
              :class="activeSubId === s.chapterSubtrack ? 'dir-chip-active' : ''"
              :style="activeSubId === s.chapterSubtrack ? dirActiveStyle(activeTrack.color) : {}"
            >
              {{ s.name }}
              <span class="text-xs opacity-70">{{ subCount(s.chapterSubtrack) }}</span>
            </button>
          </div>
        </div>
        <div v-else-if="activeTrack && visibleSubTopics.length === 1" class="mb-5">
          <div class="text-xs text-muted mb-2">{{ activeTrack.name }} · 子主题</div>
          <div class="flex flex-wrap gap-2">
            <button class="dir-chip dir-chip-active" :style="dirActiveStyle(activeTrack.color)">
              {{ activeTrack.name }}
              <span class="text-xs opacity-70">{{ subCount(visibleSubTopics[0].chapterSubtrack) }}</span>
            </button>
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

        <a-card v-if="filteredChapters.length === 0" class="text-center" :body-style="{ padding: '40px' }">
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
  getTracks,
  getTrack,
  trackHasChapterContent,
  trackSubTopics,
  type Track,
  type SubTopic
} from '~/data/learningTaxonomy'

const route = useRoute()
const { request } = useApi()
const { isDone } = useLearning()
const auth = useAuthStore()
const browseMode = computed(() => !auth.isLoggedIn)

const mid = computed(() => route.params.module as string)
const tracks = computed(() => getTracks(mid.value))
// 学习中心只展示有内置章节的赛道（空赛道隐藏，避免空壳干扰）
const contentTracks = computed(() => tracks.value.filter(trackHasChapterContent))

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

const progress = ref<any>({})
watch(() => auth.isLoggedIn, async (v) => {
  if (v) { try { progress.value = (await request('/api/progress')).progress || {} } catch (e) {} }
}, { immediate: true })

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

// ===== 两层单选：赛道 → 子主题 =====
const activeTrackId = ref<string>('')
const activeSubId = ref<string>('')   // 章节 subtrack 取值（子主题）

function initFromQuery() {
  const t = typeof route.query.group === 'string' ? route.query.group : ''
  const s = typeof route.query.direction === 'string' ? route.query.direction : ''
  activeTrackId.value = (t && getTrack(mid.value, t)) ? t : ''
  if (activeTrackId.value && s) {
    const tr = getTrack(mid.value, activeTrackId.value)!
    if (tr.chapterSubtracks.includes(s)) activeSubId.value = s
    else activeSubId.value = ''
  }
}
initFromQuery()

const activeTrack = computed<Track | null>(() => activeTrackId.value ? getTrack(mid.value, activeTrackId.value) : null)
const subTopics = computed<SubTopic[]>(() => activeTrack.value ? trackSubTopics(activeTrack.value) : [])
const visibleSubTopics = computed(() => subTopics.value.filter(s => subCount(s.chapterSubtrack) > 0))

const subMap = computed(() => module.value?.subtracks || {})
function subCount(st: string): number {
  return subMap.value[st]?.chapterCount || 0
}
function trackCount(t: Track): number {
  return t.chapterSubtracks.reduce((s: number, st: string) => s + subCount(st), 0)
}

function groupActiveStyle(color: string) {
  return { borderColor: color, background: color + '14', color: 'rgb(var(--ink))' }
}
function dirActiveStyle(color: string) {
  return { borderColor: color, background: color + '14', color: 'rgb(var(--ink))' }
}

function selectTrack(id: string) {
  activeTrackId.value = activeTrackId.value === id ? '' : id
  activeSubId.value = ''
  updateUrl()
}
function selectSub(id: string) {
  activeSubId.value = activeSubId.value === id ? '' : id
  updateUrl()
}

// 当前命中章节的 subtrack 集合（null = 全部章节）
const activeSubtracks = computed<string[] | null>(() => {
  if (!activeTrackId.value || !activeTrack.value) return null
  if (activeSubId.value) return [activeSubId.value]
  return activeTrack.value.chapterSubtracks
})

const searchPlaceholder = computed(() => {
  if (activeSubId.value) {
    const s = subTopics.value.find(x => x.chapterSubtrack === activeSubId.value)
    return s ? `在 ${s.name} 中搜索…` : '搜索本节标题…'
  }
  if (activeTrack.value) return `在 ${activeTrack.value.name} 中搜索…`
  return '搜索本节标题，如：事件循环、Flex…'
})

function updateUrl() {
  const query: Record<string, string> = {}
  if (activeTrackId.value) query.group = activeTrackId.value
  if (activeTrackId.value && activeSubId.value) query.direction = activeSubId.value
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

watch(module, () => { initFromQuery() })
</script>

<style scoped>
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
.group-chip-active { border-width: 1px; font-weight: 600; }

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
.dir-chip-active { border-width: 1px; font-weight: 600; }
</style>
