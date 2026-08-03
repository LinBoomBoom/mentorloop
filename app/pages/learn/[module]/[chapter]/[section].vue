<template>
  <div>
    <nav class="text-sm text-muted mb-3 flex items-center gap-1.5 flex-wrap" aria-label="面包屑">
      <NuxtLink to="/learn" class="hover:text-ink transition inline-flex items-center gap-1"><Icon name="home" :size="14" /> 学习中心</NuxtLink>
      <Icon name="chevronRight" :size="14" class="opacity-60" />
      <NuxtLink :to="`/learn/${route.params.module}`" class="hover:text-ink transition max-w-[40%] truncate">{{ module?.name }}</NuxtLink>
      <Icon name="chevronRight" :size="14" class="opacity-60" />
      <span class="text-ink font-medium truncate">{{ chapter?.title }}</span>
    </nav>

    <!-- 阅读进度条 -->
    <div class="h-1 rounded-full bg-ink/8 overflow-hidden mb-4" aria-hidden="true">
      <div class="h-full bg-brand-coral transition-[width] duration-150" :style="{ width: readPct + '%' }"></div>
    </div>

    <div v-if="!section" class="card h-72 shimmer"></div>
    <template v-else>
      <div class="lg:grid lg:grid-cols-[1fr_264px] lg:gap-6 items-start">
        <!-- 主内容 -->
        <div class="min-w-0">
          <!-- 移动端本章目录 -->
          <div class="lg:hidden mb-4">
            <button class="btn btn-ghost w-full !justify-between" @click="tocOpen = !tocOpen" :aria-expanded="tocOpen">
              <span class="flex items-center gap-1.5"><Icon name="list" :size="16" class="text-brand-coral" /> 本章目录（{{ chapter?.sections.length }}）</span>
              <Icon name="chevronRight" :size="16" class="transition-transform" :class="tocOpen ? 'rotate-90' : ''" />
            </button>
            <div v-if="tocOpen" class="card mt-2 p-3 space-y-0.5">
              <NuxtLink v-for="s in (chapter?.sections || [])" :key="s.id" :to="`/learn/${route.params.module}/${chapter.id}/${s.id}`"
                        class="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition truncate"
                        :class="route.params.section === s.id ? 'bg-brand-coral/10 text-brand-coral font-semibold'
                          : (isDone(progress, module.id, chapter.id, s.id) ? 'text-emerald-600' : 'text-muted')">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="isDone(progress, module.id, chapter.id, s.id) ? 'bg-emerald-500' : 'bg-ink/20'"></span>
                <span class="truncate">{{ s.title }}</span>
              </NuxtLink>
            </div>
          </div>

          <div class="text-xs text-muted mb-1">{{ chapter?.title }}</div>
          <h1 class="text-2xl font-extrabold">{{ section.title }}</h1>

      <div class="card p-6 mt-5">
        <div class="flex items-start gap-3 mb-5 p-4 rounded-xl" style="background:linear-gradient(120deg,rgba(255,94,126,.1),rgba(255,194,75,.1))">
          <Icon name="compass" :size="20" class="text-brand-coral mt-0.5 shrink-0" />
          <div>
            <div class="text-xs font-bold text-brand-coral mb-0.5">学习方向</div>
            <div class="text-sm text-sub">{{ section.direction }}</div>
          </div>
        </div>
        <!-- 保鲜徽章（活运营宪章 第 4.1 条）：知识点的核验日期 / 过期风险 / 锚定版本 -->
        <div v-if="fresh" class="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
          <span class="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold"
                :style="riskStyle">
            <Icon name="shield" :size="12" /> {{ fresh.风险 || '中' }}风险
          </span>
          <span class="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-muted">
            核验 {{ fresh.核验 }}
          </span>
          <span v-if="fresh.版本" class="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-muted">
            {{ fresh.版本 }}
          </span>
          <span v-if="fresh.来源" class="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-muted">
            锚定{{ fresh.来源 }}
          </span>
          <span v-if="freshState?.overdue" class="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-amber-600 bg-amber-500/10">
            已超复核期 {{ -freshState.left }} 天
          </span>
          <span v-else-if="freshState?.soon" class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted">
            {{ freshState.left }} 天后复核
          </span>
        </div>
        <div class="prose-dm" v-html="contentHtml"></div>
      </div>

      <div v-if="browseMode" class="card !p-4 flex items-center gap-2 text-sm text-muted bg-brand-coral/5 border border-brand-coral/15">
        <Icon name="eye" :size="16" class="text-brand-coral shrink-0" /> 浏览模式：登录后即可「打卡」记录已掌握，全部小节随时可自由阅读。
      </div>

      <div class="card p-5 mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" role="checkbox" :aria-checked="done" :aria-label="done ? '取消标记已掌握本节' : '标记已掌握本节'"
                class="flex items-center gap-3 cursor-pointer select-none text-left bg-transparent border-0 p-0" @click="toggleDone">
          <div class="w-7 h-7 rounded-full flex items-center justify-center transition"
               :class="done ? 'bg-emerald-500 text-white' : 'bg-ink/8 text-muted'">
            <Icon v-if="done" name="check" :size="16" />
          </div>
          <span class="font-semibold" :class="done ? 'text-emerald-600' : 'text-sub'">{{ done ? '已掌握本节' : '我已完成学习并掌握本节' }}</span>
        </button>
        <div class="flex gap-2">
          <button v-if="prev" @click="navTo(prev)" class="btn btn-ghost">上一节</button>
          <button v-if="next" @click="navTo(next)" class="btn btn-primary">下一节 <Icon name="arrowRight" :size="15" /></button>
          <span v-else class="tag tag-gold px-4 py-2.5">🎉 已是本模块最后一节</span>
        </div>
      </div>
      <p v-if="auth.isLoggedIn && !done" class="text-xs text-muted mt-2 text-right">勾选即记录已掌握，进度自动保存</p>
        </div>

        <!-- 桌面端：本章目录（粘性侧栏） -->
        <aside class="hidden lg:block sticky top-6">
          <div class="card p-5">
            <div class="text-sm font-bold mb-3 flex items-center gap-1.5"><Icon name="list" :size="15" class="text-brand-coral" /> 本章目录</div>
            <div class="space-y-0.5 max-h-[72vh] overflow-auto scrollbar-thin pr-1">
              <NuxtLink v-for="s in (chapter?.sections || [])" :key="s.id" :to="`/learn/${route.params.module}/${chapter.id}/${s.id}`"
                        class="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition truncate"
                        :class="route.params.section === s.id ? 'bg-brand-coral/10 text-brand-coral font-semibold'
                          : (isDone(progress, module.id, chapter.id, s.id) ? 'text-emerald-600' : 'text-muted')">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="isDone(progress, module.id, chapter.id, s.id) ? 'bg-emerald-500' : 'bg-ink/20'"></span>
                <span class="truncate">{{ s.title }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const { isDone } = useLearning()
const { md, splitFreshness, freshnessState } = useMarkdown()

const auth = useAuthStore()
const { guard } = useLoginGate()
const browseMode = computed(() => !auth.isLoggedIn)
const isAdmin = computed(() => auth.user?.role === 'admin')
const tocOpen = ref(false)

// 公开模块内容：SSR 加载
const { data: modRes } = await useFetch(() => '/api/modules/' + route.params.module)
const module = ref<any>(null)
watch(modRes, (v: any) => { if (v?.module) module.value = v.module }, { immediate: true })

// 进度：仅登录后拉取（未登录可浏览全文）
const progress = ref<any>({})
watch(() => auth.isLoggedIn, async (v) => {
  if (v) { try { progress.value = (await request('/api/progress')).progress || {} } catch (e) {} }
}, { immediate: true })

const ci = computed(() => module.value?.chapters.findIndex((c: any) => c.id === route.params.chapter))
const chapter = computed(() => module.value?.chapters[ci.value])
const si = computed(() => chapter.value?.sections.findIndex((s: any) => s.id === route.params.section))
const section = computed(() => chapter.value?.sections[si.value])
const done = computed(() => module.value && section.value ? isDone(progress.value, module.value.id, chapter.value.id, section.value.id) : false)
// 时效元数据与正文分离（宪章 4.1）：时效以徽章呈现，不混入 markdown 正文
const parsed = computed(() => splitFreshness(section.value?.content || ''))
const fresh = computed(() => parsed.value.fresh)
const freshState = computed(() => freshnessState(fresh.value))
const contentHtml = computed(() => section.value ? md(parsed.value.body) : '')
const riskStyle = computed(() => {
  const r = fresh.value?.风险
  if (r === '高') return 'background:rgba(245,158,11,.12);color:#d97706'
  if (r === '低') return 'background:rgba(20,184,166,.12);color:#0d9488'
  return 'background:rgba(99,102,241,.12);color:#6366f1'
})

// 阅读进度（P2-5）：根据页面滚动位置计算阅读百分比
const readPct = ref(0)
function onScroll() {
  const doc = document.documentElement
  const h = doc.scrollHeight - window.innerHeight
  readPct.value = h > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / h) * 100))) : 0
}
onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll() })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

useSeoMeta({
  title: computed(() => section.value ? section.value.title + (module.value ? ' · ' + module.value.name : '') : '学习详情'),
  description: computed(() => section.value?.direction || '免费浏览完整学习内容，登录后打卡记录已掌握。'),
  ogTitle: computed(() => 'MentorLoop · ' + (section.value?.title || '学习详情')),
  ogDescription: computed(() => section.value?.direction || '系统学习内容'),
  ogType: 'article',
  ogUrl: safeOgUrl()
})

const flat = computed(() => {
  const arr: any[] = []
  if (!module.value) return arr
  module.value.chapters.forEach((c: any, ci: number) => c.sections.forEach((s: any, si: number) => arr.push({ cid: c.id, sid: s.id })))
  return arr
})
const curIdx = computed(() => flat.value.findIndex((f: any) => f.cid === route.params.chapter && f.sid === route.params.section))
const prev = computed(() => (curIdx.value > 0 ? flat.value[curIdx.value - 1] : null))
const next = computed(() => (curIdx.value >= 0 && curIdx.value < flat.value.length - 1 ? flat.value[curIdx.value + 1] : null))

function navTo(f: any) { router.push(`/learn/${route.params.module}/${f.cid}/${f.sid}`) }

async function toggleDone() {
  if (!module.value || !section.value) return
  if (guard()) return // 未登录 → 引导登录
  try {
    const r: any = await request('/api/progress/toggle', {
      method: 'POST',
      body: { moduleId: module.value.id, chapterId: chapter.value.id, sectionId: section.value.id, done: !done.value }
    })
    progress.value = r.progress || {}
  } catch (e) { /* ignore */ }
}
</script>
