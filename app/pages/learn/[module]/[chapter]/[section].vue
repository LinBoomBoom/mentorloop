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

    <a-card v-if="!section"><a-skeleton active :paragraph="{ rows: 8 }" /></a-card>
    <template v-else>
      <div class="lg:grid lg:grid-cols-[1fr_264px] lg:gap-6 items-start">
        <!-- 主内容 -->
        <div class="min-w-0">
          <!-- 移动端本章目录 -->
          <div class="lg:hidden mb-4">
            <a-button type="text" block class="!flex !justify-between !items-center" @click="tocOpen = !tocOpen" :aria-expanded="tocOpen">
              <span class="flex items-center gap-1.5"><Icon name="list" :size="16" class="text-brand-coral" /> 本章目录（{{ chapter?.sections.length }}）</span>
              <Icon name="chevronRight" :size="16" class="transition-transform" :class="tocOpen ? 'rotate-90' : ''" />
            </a-button>
            <a-card v-if="tocOpen" class="mt-2" :body-style="{ padding: '12px' }">
              <div class="space-y-0.5">
                <NuxtLink v-for="s in (chapter?.sections || [])" :key="s.id" :to="`/learn/${route.params.module}/${chapter.id}/${s.id}`"
                          class="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg border-l-[3px] border-transparent transition min-w-0"
                          :class="route.params.section === s.id ? 'border-brand-coral bg-ink/5 text-ink font-medium'
                            : (isDone(progress, module.id, chapter.id, s.id) ? 'text-emerald-700 font-medium' : 'text-sub')">
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="isDone(progress, module.id, chapter.id, s.id) ? 'bg-emerald-500' : 'bg-ink/20'"></span>
                  <span class="break-words min-w-0">{{ s.title }}</span>
                </NuxtLink>
              </div>
            </a-card>
          </div>

          <div class="text-xs text-muted mb-1">{{ chapter?.title }}</div>
          <h1 class="page-title">{{ section.title }}</h1>

      <a-card class="mt-5" :body-style="{ padding: '24px' }">
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
      </a-card>

      <a-card v-if="browseMode" class="mt-4 !bg-brand-coral/5 !border-brand-coral/15" :body-style="{ padding: '16px' }">
        <div class="flex items-center gap-2 text-sm text-muted">
          <Icon name="eye" :size="16" class="text-brand-coral shrink-0" /> 浏览模式：登录后即可「打卡」记录已掌握，全部小节随时可自由阅读。
        </div>
      </a-card>

      <a-card class="mt-4" :body-style="{ padding: '20px' }">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <!-- 「已掌握」是本页最重要的动作，必须一眼看出可点：
               实心按钮外观 + 复选框图标 + 内嵌说明文案，而不是一个和正文同色的小圆点 -->
          <button type="button" role="checkbox" :aria-checked="done"
                  :aria-label="done ? '取消标记已掌握本节' : '标记已掌握本节'"
                  class="mark-done group flex items-center gap-3 select-none text-left rounded-xl border-2 px-4 py-2.5 transition duration-200"
                  :class="done
                    ? 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15'
                    : 'border-brand-coral bg-brand-coral/[0.07] hover:bg-brand-coral/15 hover:-translate-y-0.5 shadow-[0_6px_18px_-10px_rgba(255,94,126,.9)]'"
                  @click="toggleDone">
            <span class="w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition"
                  :class="done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-brand-coral/70 bg-surface text-transparent group-hover:text-brand-coral/40'">
              <Icon name="check" :size="15" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-bold leading-snug" :class="done ? 'text-emerald-600' : 'text-brand-coral'">
                {{ done ? '已掌握本节 · 点击可取消' : '点击标记「我已掌握本节」' }}
              </span>
              <span class="block text-[11px] text-muted mt-0.5">
                {{ done ? '进度已保存，可在首页看板查看' : '勾选即记录进度，自动保存' }}
              </span>
            </span>
          </button>
          <div class="flex gap-2">
            <a-button v-if="prev" @click="navTo(prev)">上一节</a-button>
            <a-button v-if="next" type="primary" @click="navTo(next)">下一节 <Icon name="arrowRight" :size="15" /></a-button>
            <a-tag v-else color="gold" class="!px-4 !py-2.5 m-0">🎉 已是本模块最后一节</a-tag>
          </div>
        </div>
      </a-card>

      <!-- 本节相关面试题（学→问闭环：已被采纳并关联到本小节的面试题直接挂在此处） -->
      <a-card v-if="section && (relatedQ.length || relatedLoading)" class="mt-4" :body-style="{ padding: '20px' }">
        <div class="flex items-center gap-2 mb-3 text-sm font-bold">
          <Icon name="clipboard" :size="16" class="text-brand-coral" /> 本节相关面试题
          <span class="text-xs font-normal text-muted">（已采纳题优先，无时按本节内容自动匹配相关面试题）</span>
        </div>
        <a-skeleton v-if="relatedLoading && !relatedQ.length" active :paragraph="{ rows: 3 }" />
        <div v-else class="space-y-2">
          <NuxtLink v-for="iq in relatedQ" :key="iq.id" :to="detailUrl(iq)"
                    class="block rounded-xl border border-ink/10 p-3.5 hover:border-brand-coral/50 hover:bg-brand-coral/[.03] transition group">
            <div class="flex items-start gap-2">
              <Icon name="arrowRight" :size="15" class="text-brand-coral mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              <span class="min-w-0 flex-1">
                <span class="font-medium leading-snug">{{ iq.q }}</span>
                <span class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <a-tag :bordered="false" class="!text-[10px]" :color="iq.difficulty === 'hard' ? 'red' : iq.difficulty === 'medium' ? 'gold' : 'default'">{{ iq.difficulty === 'hard' ? '困难' : iq.difficulty === 'medium' ? '较难' : '常规' }}</a-tag>
                  <a-tag v-if="iq.tech && iq.tech !== '综合'" :bordered="false" class="!text-[10px] !bg-ink/5 !text-muted">{{ iq.tech }}</a-tag>
                </span>
              </span>
            </div>
          </NuxtLink>
          <NuxtLink to="/interview" class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-coral hover:underline mt-1">
            <Icon name="arrowRight" :size="13" /> 去面试题库做更多练习
          </NuxtLink>
        </div>
      </a-card>
        </div>

        <!-- 桌面端：本章目录（粘性侧栏） -->
        <aside class="hidden lg:block sticky top-6">
          <a-card :body-style="{ padding: '20px' }">
            <div class="text-sm font-bold mb-3 flex items-center gap-1.5"><Icon name="list" :size="15" class="text-brand-coral" /> 本章目录</div>
            <div class="space-y-0.5 max-h-[72vh] overflow-auto scrollbar-thin pr-1">
              <NuxtLink v-for="s in (chapter?.sections || [])" :key="s.id" :to="`/learn/${route.params.module}/${chapter.id}/${s.id}`"
                        class="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg border-l-[3px] border-transparent transition min-w-0"
                        :class="route.params.section === s.id ? 'border-brand-coral bg-ink/5 text-ink font-medium'
                          : (isDone(progress, module.id, chapter.id, s.id) ? 'text-emerald-700 font-medium' : 'text-sub')">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="isDone(progress, module.id, chapter.id, s.id) ? 'bg-emerald-500' : 'bg-ink/20'"></span>
                <span class="break-words min-w-0">{{ s.title }}</span>
              </NuxtLink>
            </div>
          </a-card>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { techToSlug } from '~~/server/utils/interviewSlugs'
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
// 本节相关面试题（学→问闭环）：小节加载后，拉取关联到本节的已采纳面试题
const relatedQ = ref<any[]>([])
const relatedLoading = ref(false)
async function loadRelated() {
  const sid = section.value?.id
  if (!sid) { relatedQ.value = []; return }
  relatedLoading.value = true
  try {
    const r: any = await $fetch('/api/interview/by-section?sectionId=' + encodeURIComponent(sid))
    relatedQ.value = (r.items || [])
  } catch (e) {
    relatedQ.value = []
  } finally { relatedLoading.value = false }
}
watch(section, (s) => { if (s?.id) loadRelated() }, { immediate: true })

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

// 相关面试题 → 独立详情页（去除抽屉，强化学↔问闭环与站内抓取）
function detailUrl(iq: any) {
  return '/interview/' + iq.track + '/' + techToSlug(iq.tech || '综合') + '/' + iq.id
}

async function toggleDone() {
  if (!module.value || !section.value) return
  if (await guard()) return // 未登录 → 引导登录
  try {
    const r: any = await request('/api/progress/toggle', {
      method: 'POST',
      body: { moduleId: module.value.id, chapterId: chapter.value.id, sectionId: section.value.id, done: !done.value }
    })
    progress.value = r.progress || {}
  } catch (e) { /* ignore */ }
}
</script>
