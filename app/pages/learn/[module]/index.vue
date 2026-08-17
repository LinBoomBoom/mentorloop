<template>
  <div>
    <Breadcrumb :items="[{ label: '学习中心', to: '/learn', icon: 'home' }, { label: module?.name || '' }]" />

    <a-card v-if="!module"><a-skeleton active :paragraph="{ rows: 6 }" /></a-card>
    <template v-else>
      <!-- ========== 移动端：方向选择页（未选方向时） ========== -->
      <div v-if="!subtrack" class="lg:hidden">
        <h1 class="page-title">选择技术方向</h1>
        <p class="text-muted text-sm mt-1 mb-6">先选一个方向，再专注学习该方向下的章节</p>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="st in mobileSubtracks"
            :key="st.id"
            @click="pickSubtrack(st.id)"
            class="text-left rounded-2xl border border-line bg-white p-4 transition hover:border-brand-coral/40 hover:bg-brand-coral/[.03]"
          >
            <div class="w-8 h-8 rounded-lg mb-3" :style="{ background: st.color }"></div>
            <div class="font-bold text-sm">{{ st.name }}</div>
            <div class="text-xs text-muted mt-1">{{ st.chapterCount }} 章 · {{ st.sectionCount }} 节</div>
          </button>
        </div>
      </div>

      <!-- ========== 移动端：章节列表页（已选方向时） ========== -->
      <div v-else class="lg:hidden">
        <!-- 顶部导航 -->
        <div class="flex items-center justify-between mb-4">
          <button @click="clearSubtrack" class="flex items-center gap-1 text-sm text-muted">
            <Icon name="arrowLeft" :size="16" /> 方向
          </button>
          <div class="font-bold text-sm">{{ currentSubtrackName }}</div>
          <button @click="mobileSearchOpen = !mobileSearchOpen" class="text-sm text-muted">
            <Icon name="search" :size="16" />
          </button>
        </div>

        <!-- 当前方向信息条 -->
        <div class="flex items-center gap-3 mb-5 p-3 rounded-xl bg-ink/5">
          <div class="w-8 h-8 rounded-lg shrink-0" :style="{ background: currentSubtrackColor }"></div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm">{{ currentSubtrackName }}</div>
            <div class="text-xs text-muted">{{ currentSubtrackCount.chapterCount }} 章 · {{ currentSubtrackCount.sectionCount }} 节</div>
          </div>
          <button @click="clearSubtrack" class="text-xs text-brand-coral font-medium shrink-0">切换</button>
        </div>

        <!-- 移动端搜索框 -->
        <div v-if="mobileSearchOpen" class="mb-4">
          <a-input v-model:value="q" placeholder="搜索本节标题…" aria-label="搜索本节小节">
            <template #prefix><Icon name="search" :size="17" class="text-muted" /></template>
          </a-input>
        </div>

        <!-- 章节列表 -->
        <a-card v-if="filteredChapters.length === 0" class="text-center" :body-style="{ padding: '40px' }">
          <span class="text-muted text-sm">没有匹配的小节，换个关键词试试～</span>
        </a-card>
        <div v-else class="space-y-5">
          <a-card v-for="(ch, ci) in filteredChapters" :key="ch.id" class="reveal" :body-style="{ padding: '20px' }">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                   :style="{ background: module.color }">{{ ci + 1 }}</div>
              <button type="button" class="min-w-0 flex-1 text-left" @click="toggleChapter(ch.id)">
                <h3 class="font-bold text-sm">{{ ch.title }}</h3>
                <p class="text-xs text-muted line-clamp-1">{{ ch.goal }}</p>
              </button>
              <span class="text-xs text-muted shrink-0">{{ (ch.sections || []).length }} 节</span>
              <button type="button" @click="toggleChapter(ch.id)" :aria-label="isCollapsed(ch.id) ? '展开章节' : '折叠章节'"
                      class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink/5 text-muted transition">
                <Icon :name="isCollapsed(ch.id) ? 'chevronRight' : 'chevronDown'" :size="18" />
              </button>
            </div>

            <div v-if="!isCollapsed(ch.id)" class="space-y-2">
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

      <!-- ========== 桌面端：同页方向筛选 + 章节列表 ========== -->
      <div class="hidden lg:block">
        <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_264px] lg:gap-6 items-start">
          <div class="min-w-0">
            <h1 class="page-title">{{ module.name }}</h1>
            <p class="text-muted text-sm mt-1 mb-4">{{ module.desc }}</p>

            <div class="flex items-center gap-3 mb-5">
              <a-input v-model:value="q" class="max-w-md flex-1" :placeholder="searchPlaceholder" aria-label="搜索本节小节">
                <template #prefix><Icon name="search" :size="17" class="text-muted" /></template>
              </a-input>
              <a-button size="small" class="shrink-0" @click="toggleAll">{{ allCollapsed ? '展开全部' : '折叠全部' }}</a-button>
              <a-button size="small" class="shrink-0" @click="drawerOpen = true"><Icon name="menu" :size="16" /> 目录</a-button>
            </div>

            <!-- 桌面端方向卡片条：横向滚动 + 左右箭头（鼠标无横向滚轮，必须有按钮） -->
            <div class="mb-5 min-w-0">
              <div class="text-xs text-muted mb-2">技术方向</div>
              <div class="relative min-w-0">
                <div ref="dirScroller" @scroll.passive="updateDirScroll"
                     class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth">
                  <button
                    @click="subtrack = ''"
                    class="direction-card shrink-0"
                    :class="!subtrack ? 'direction-card-active' : ''"
                  >
                    <div class="w-6 h-6 rounded-md shrink-0" style="background: #D85A30"></div>
                    <div class="text-left">
                      <div class="font-medium text-sm">全部</div>
                      <div class="text-xs text-muted">{{ module.chapters?.length || 0 }} 章 · {{ totalSectionCount }} 节</div>
                    </div>
                  </button>
                  <button
                    v-for="st in availableSubtracks"
                    :key="st.id"
                    @click="subtrack = st.id"
                    class="direction-card shrink-0"
                    :class="subtrack === st.id ? 'direction-card-active' : ''"
                  >
                    <div class="w-6 h-6 rounded-md shrink-0" :style="{ background: st.color }"></div>
                    <div class="text-left">
                      <div class="font-medium text-sm">{{ st.name }}</div>
                      <div class="text-xs text-muted">{{ st.chapterCount }} 章 · {{ st.sectionCount }} 节</div>
                    </div>
                  </button>
                </div>

                <!-- 左右渐变遮罩：仅在该侧还有内容时出现 -->
                <div v-show="dirCanLeft" class="dir-fade dir-fade-left"></div>
                <div v-show="dirCanRight" class="dir-fade dir-fade-right"></div>

                <!-- 左右滚动按钮 -->
                <button v-show="dirCanLeft" @click="scrollDir(-1)" class="dir-nav dir-nav-left" aria-label="向左滚动方向列表">
                  <Icon name="chevronLeft" :size="16" />
                </button>
                <button v-show="dirCanRight" @click="scrollDir(1)" class="dir-nav dir-nav-right" aria-label="向右滚动方向列表">
                  <Icon name="chevronRight" :size="16" />
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

            <div v-else class="space-y-5">
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
          <aside class="hidden lg:block sticky top-6">
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
import { MODULE_SUBTRACKS } from '~/data/moduleSubtracks'

const route = useRoute()
const { request } = useApi()
const { isDone, chapterUnlocked: cu, sectionUnlocked: su } = useLearning()
const auth = useAuthStore()
const browseMode = computed(() => !auth.isLoggedIn)
const isAdmin = computed(() => auth.user?.role === 'admin')
const mid = computed(() => route.params.module as string)

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

// 章节折叠状态（默认全展开；SSR/CSR 初值一致，无 hydration mismatch）
const collapsed = reactive<Record<string, boolean>>({})
const drawerOpen = ref(false)
const mobileSearchOpen = ref(false)
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

// 技术方向筛选
const subtrack = ref(typeof route.query.subtrack === 'string' ? route.query.subtrack : '')

const availableSubtracks = computed(() => {
  const conf = MODULE_SUBTRACKS[module.value?.id] || []
  const counts = module.value?.subtracks || {}
  return conf
    .filter((s) => counts[s.id])
    .map((s) => ({ ...s, ...counts[s.id] }))
    .sort((a, b) => a.order - b.order)
})

const totalSectionCount = computed(() => {
  return (module.value?.chapters || []).reduce((sum: number, ch: any) => sum + (ch.sections || []).length, 0)
})

const mobileSubtracks = computed(() => {
  const all = {
    id: '',
    name: '全部',
    color: '#D85A30',
    chapterCount: module.value?.chapters?.length || 0,
    sectionCount: totalSectionCount.value,
    order: -1
  }
  return [all, ...availableSubtracks.value]
})

const currentSubtrack = computed(() => {
  if (!subtrack.value) return null
  return availableSubtracks.value.find((s) => s.id === subtrack.value) || null
})

const currentSubtrackName = computed(() => currentSubtrack.value?.name || '全部')
const currentSubtrackColor = computed(() => currentSubtrack.value?.color || '#D85A30')
const currentSubtrackCount = computed(() => {
  if (currentSubtrack.value) return { chapterCount: currentSubtrack.value.chapterCount, sectionCount: currentSubtrack.value.sectionCount }
  return { chapterCount: module.value?.chapters?.length || 0, sectionCount: totalSectionCount.value }
})

const searchPlaceholder = computed(() => {
  return subtrack.value ? `在 ${currentSubtrackName.value} 中搜索…` : '搜索本节标题，如：事件循环、Flex…'
})

function pickSubtrack(id: string) {
  subtrack.value = id
  updateUrl()
}

function clearSubtrack() {
  subtrack.value = ''
  updateUrl()
}

function updateUrl() {
  const query: Record<string, string> = {}
  if (subtrack.value) query.subtrack = subtrack.value
  if (q.value) query.q = q.value
  navigateTo({ query }, { replace: true })
}

// 章节/小节搜索过滤（客户端，数据量小）
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const filteredChapters = computed(() => {
  let all = module.value?.chapters || []
  if (subtrack.value) {
    all = all.filter((ch: any) => ch.subtrack === subtrack.value)
  }
  const kw = q.value.trim().toLowerCase()
  if (!kw) return all
  return all.filter((ch: any) => ch.title.toLowerCase().includes(kw) || (ch.sections || []).some((s: any) => s.title.toLowerCase().includes(kw)))
})
const chapterSections = (ch: any) => {
  const kw = q.value.trim().toLowerCase()
  if (!kw) return ch.sections || []
  return (ch.sections || []).filter((s: any) => s.title.toLowerCase().includes(kw) || ch.title.toLowerCase().includes(kw))
}

// 当前学习章节：第一个未完成章节（侧栏粉色高亮）。未登录无进度时不高亮。
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

// ===== 桌面端方向条横向滚动控制 =====
// 滚动条已隐藏，鼠标只有垂直滚轮，因此必须提供左右按钮才能真正滚动。
// dirCanLeft / dirCanRight 同时驱动按钮与渐变遮罩的显隐，避免无内容一侧仍出现遮罩。
const dirScroller = ref<HTMLElement | null>(null)
const dirCanLeft = ref(false)
const dirCanRight = ref(false)

function updateDirScroll() {
  const el = dirScroller.value
  if (!el) return
  dirCanLeft.value = el.scrollLeft > 4
  dirCanRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function scrollDir(delta: number) {
  const el = dirScroller.value
  if (!el) return
  el.scrollBy({ left: delta * Math.max(220, el.clientWidth * 0.7), behavior: 'smooth' })
}

let dirRo: ResizeObserver | null = null
onMounted(async () => {
  await nextTick()
  updateDirScroll()
  if (typeof ResizeObserver !== 'undefined' && dirScroller.value) {
    dirRo = new ResizeObserver(() => updateDirScroll())
    dirRo.observe(dirScroller.value)
  }
})
onBeforeUnmount(() => { dirRo?.disconnect(); dirRo = null })

// 模块数据异步到达 / 方向数量变化后需重新测量
watch(availableSubtracks, async () => { await nextTick(); updateDirScroll() })
</script>

<style scoped>
.direction-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 0.5px solid rgb(var(--line));
  background: #fff;
  transition: border-color 150ms ease, background-color 150ms ease;
  min-width: 132px;
}
.direction-card:hover {
  border-color: rgb(var(--brand-coral) / 0.4);
  background: rgb(var(--brand-coral) / 0.03);
}
.direction-card-active {
  border-color: rgb(var(--brand-coral));
  background: rgb(var(--brand-coral) / 0.08);
}

/* 隐藏横向滚动条，保留滚动功能 */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* 两侧渐变遮罩：用 --canvas 变量，自动跟随亮/暗主题 */
.dir-fade {
  position: absolute;
  top: 0;
  bottom: 4px;
  width: 48px;
  pointer-events: none;
  z-index: 1;
}
.dir-fade-left {
  left: 0;
  background: linear-gradient(to right, rgb(var(--canvas)), rgb(var(--canvas) / 0));
}
.dir-fade-right {
  right: 0;
  background: linear-gradient(to left, rgb(var(--canvas)), rgb(var(--canvas) / 0));
}

/* 左右滚动按钮 */
.dir-nav {
  position: absolute;
  top: calc(50% - 2px);
  transform: translateY(-50%);
  z-index: 2;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #fff;
  border: 0.5px solid rgb(var(--line));
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
  color: rgb(var(--muted));
  transition: color 150ms ease, border-color 150ms ease;
}
.dir-nav:hover {
  color: rgb(var(--brand-coral));
  border-color: rgb(var(--brand-coral) / 0.4);
}
.dir-nav-left { left: 0; }
.dir-nav-right { right: 0; }
</style>
