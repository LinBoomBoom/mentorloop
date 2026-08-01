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
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const { isDone } = useLearning()
const { md } = useMarkdown()

const auth = useAuthStore()
const { guard } = useLoginGate()
const browseMode = computed(() => !auth.isLoggedIn)
const isAdmin = computed(() => auth.user?.role === 'admin')

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
const contentHtml = computed(() => section.value ? md(section.value.content) : '')

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
