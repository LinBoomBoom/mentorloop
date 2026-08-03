<template>
  <div>
    <!-- 英雄区（公开，始终可见） -->
    <section class="relative overflow-hidden rounded-3xl card !p-0 mb-7">
      <div class="aura !absolute"><div class="blob"></div></div>
      <div class="relative z-10 p-8 md:p-12 text-white brand-gradient">
        <span class="inline-flex items-center gap-2 text-sm font-semibold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full">🌱 学习 & 面试一体化导师</span>
        <h1 class="text-[34px] md:text-[46px] font-extrabold leading-tight mt-5 max-w-2xl">把「学」与「面」<br/>练成一条线</h1>
        <p class="mt-4 text-white/90 text-[15px] md:text-base max-w-xl leading-relaxed">
          前端 / 后端 / 运维 / AI 工程四方向系统学习路径，配套高频面试题、模拟答卷与 AI 复盘。
          无需登录即可浏览全部课程与题库，注册后开启打卡与智能复盘。
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <NuxtLink to="/learn" class="btn !bg-white !text-brand-coral hover:!bg-white/90 !font-bold"><Icon name="book" :size="18"/> 免费开始学习</NuxtLink>
          <NuxtLink v-if="!auth.isLoggedIn" to="/login" class="btn !border-white/40 !text-white hover:!bg-white/10"><Icon name="user" :size="18"/> 登录 / 注册</NuxtLink>
          <NuxtLink v-else to="/exam" class="btn !border-white/40 !text-white hover:!bg-white/10"><Icon name="clipboard" :size="18"/> 去模拟答卷</NuxtLink>
        </div>
      </div>
    </section>

    <!-- 登录用户：个人看板 -->
    <div v-if="auth.isLoggedIn && statsLoading" class="grid grid-cols-1 md:grid-cols-3 gap-4 stagger mb-7">
      <div v-for="i in 3" :key="i" class="card h-32 shimmer"></div>
    </div>
    <template v-else-if="showDash">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4 stagger">
        <div class="card p-6 flex items-center gap-5 col-span-1 lg:col-span-1">
          <ProgressRing :value="stats.overall.percent" :size="108" :stroke="11" color="#ff5e7e" label="总进度" />
          <div>
            <div class="text-sm text-muted">已掌握</div>
            <div class="text-xl font-extrabold">{{ stats.overall.done }}<span class="text-muted text-sm font-normal"> / {{ stats.overall.total }} 节</span></div>
            <div class="text-[12px] text-muted mt-1">距离学完还差 {{ stats.overall.total - stats.overall.done }} 节</div>
          </div>
        </div>
        <StatCard title="连续学习" :value="stats.streak.current + ' 天'" :sub="`最长 ${stats.streak.longest} 天 · 累计 ${stats.streak.totalDays} 天`" icon="flame" color="#ff8a5c" />
        <StatCard title="答卷均分" :value="stats.exams.avg" :sub="stats.exams.count ? `共 ${stats.exams.count} 套 · 最高 ${stats.exams.best} 分` : '还没有答卷记录，去试试'" icon="chart" color="#14b8a6" />
        <StatCard title="能力雷达" :value="stats.radar.filter((r:any)=>r.value>=60).length + '/6'" :sub="'笔试能力 ' + stats.exams.avg + ' 分'" icon="target" color="#ffc24b" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 stagger">
        <div class="card p-6">
          <h3 class="section-title mb-1">能力雷达</h3>
          <p class="text-xs text-muted mb-3">六维能力分布，越高越稳</p>
          <div class="h-[260px]"><RadarChart :data="stats.radar" /></div>
        </div>
        <div class="card p-6">
          <h3 class="section-title mb-1">学习热力图</h3>
          <p class="text-xs text-muted mb-3">近 20 周打卡密度</p>
          <Heatmap :days="stats.heatmap" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger mb-7">
        <div class="card p-6 lg:col-span-2">
          <h3 class="section-title mb-4">方向进度</h3>
          <div class="space-y-4">
            <div v-for="m in stats.modules" :key="m.id">
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="font-semibold flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" :style="{background:m.color}"></span>{{ m.name }}
                </span>
                <span class="text-muted">{{ m.done }}/{{ m.total }} · {{ m.percent }}%</span>
              </div>
              <div class="h-2.5 rounded-full bg-ink/8 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-1000" :style="{ width: m.percent+'%', background: m.color }"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <h3 class="section-title mb-4">最近答卷</h3>
          <div v-if="!stats.exams.recent.length" class="text-sm text-muted py-8 text-center">还没有答卷记录</div>
          <div v-else class="space-y-3">
            <div v-for="r in stats.exams.recent" :key="r.createdAt" class="flex items-center justify-between p-3 rounded-xl bg-ink/5">
              <div class="min-w-0">
                <div class="text-sm font-semibold truncate">{{ r.name }}</div>
                <div class="text-[11px] text-muted">{{ new Date(r.createdAt).toLocaleDateString() }}</div>
              </div>
              <div class="text-lg font-extrabold" :class="r.score>=70?'text-emerald-500':r.score>=50?'text-amber-500':'text-red-500'">{{ r.score }}</div>
            </div>
          </div>
          <NuxtLink to="/exam" class="btn btn-ghost btn-block mt-4">查看全部试卷</NuxtLink>
        </div>
      </div>
    </template>

    <div v-if="auth.isLoggedIn && !statsLoading && !showDash" class="card p-8 text-center text-muted mb-7">
      看板暂时无法加载，请稍后重试
    </div>

    <!-- 三方向学习路径（公开） -->
    <section class="mb-7">
      <div class="flex items-end justify-between mb-4">
        <h2 class="text-xl font-extrabold">学习路径</h2>
        <NuxtLink to="/learn" class="text-sm text-brand-coral font-semibold">全部方向 →</NuxtLink>
      </div>
      <div v-if="!modules.length" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="card h-40 shimmer"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NuxtLink v-for="m in modules" :key="m.id" :to="`/learn/${m.id}`" class="card p-6 hover:-translate-y-1 transition reveal group">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" :style="{background:m.color+'1a',color:m.color}"><Icon :name="m.icon" :size="24"/></div>
          <h3 class="font-bold text-lg">{{ m.name }}</h3>
          <p class="text-sm text-muted mt-1 line-clamp-2">{{ m.desc }}</p>
          <div class="flex gap-4 mt-4 text-xs text-muted">
            <span>{{ m.chapterCount }} 章</span><span>{{ m.sectionCount }} 节</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- 精选面试题（公开） -->
    <section class="mb-7">
      <div class="flex items-end justify-between mb-4">
        <h2 class="text-xl font-extrabold">精选面试题</h2>
        <NuxtLink to="/interview" class="text-sm text-brand-coral font-semibold">进入题库 →</NuxtLink>
      </div>
      <div v-if="!featuredQuestions.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="card h-24 shimmer"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="q in featuredQuestions" :key="q.id" class="card p-5 reveal">
          <div class="flex items-start gap-3">
            <Icon name="chat" :size="18" class="text-brand-coral mt-0.5 shrink-0"/>
            <div class="min-w-0">
              <div class="text-sm font-semibold leading-snug">{{ q.q }}</div>
              <div class="flex flex-wrap items-center gap-1.5 mt-2">
                <span class="chip" :class="trackBadge(q.track)">{{ trackName(q.track) }}</span>
                <span v-for="k in (q.keywords||[]).slice(0,3)" :key="k" class="chip">{{ k }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 模拟试卷（公开） -->
    <section class="mb-2">
      <div class="flex items-end justify-between mb-4">
        <h2 class="text-xl font-extrabold">模拟试卷</h2>
        <NuxtLink to="/exam" class="text-sm text-brand-coral font-semibold">全部试卷 →</NuxtLink>
      </div>
      <div v-if="!sets.length" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="card h-32 shimmer"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NuxtLink v-for="s in sets" :key="s.id" :to="`/exam/sets/${s.id}`" class="card p-6 hover:-translate-y-1 transition reveal">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="trackBadge(s.track)">{{ trackName(s.track) }}</span>
            <span v-if="s.vipOnly" class="text-xs text-amber-500 font-semibold">VIP</span>
          </div>
          <h3 class="font-bold">{{ s.name }}</h3>
          <p class="text-xs text-muted mt-1">{{ s.choiceCount }} 选择 · {{ s.writtenCount }} 笔试 · 约 {{ s.duration }} 分钟</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { trackMeta, trackBadge } from '~/composables/useTrack'
const { request } = useApi()
const auth = useAuthStore()

useSeoMeta({
  title: '学面一体导师平台',
  description: '前端/后端/运维/AI 四方向系统学习路径，配套高频面试题、模拟答卷与 AI 复盘。无需登录即可浏览全部课程与题库。',
  ogTitle: 'MentorLoop · 学面一体导师平台',
  ogDescription: '四方向系统学习路径 + 高频面试题库 + 模拟答卷，全部内容免费浏览。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})

// 公开内容：服务端渲染（SSR）即带数据，利于 SEO 与首屏
const { data: modRes } = await useFetch('/api/modules')
const modules = computed(() => modRes.value?.modules || [])

const { data: feRes } = await useFetch('/api/interview/frontend')
const { data: beRes } = await useFetch('/api/interview/backend')
const { data: deRes } = await useFetch('/api/interview/devops')
const featuredQuestions = computed(() => {
  const merged: any[] = []
  const pushBank = (bank: any, track: string) => {
    if (!bank) return
    ;[...(bank.hot || []).slice(0, 1), ...(bank.special || []).slice(0, 1)]
      .forEach((q: any) => merged.push({ ...q, track }))
  }
  pushBank(feRes.value?.bank, 'frontend')
  pushBank(beRes.value?.bank, 'backend')
  pushBank(deRes.value?.bank, 'devops')
  return merged.slice(0, 6)
})

const { data: setRes } = await useFetch('/api/exam/sets')
const sets = computed(() => (setRes.value?.sets || []).slice(0, 3))

// 个性化看板：仅登录后拉取（避免 SSR 拿不到 token）
const stats = ref<any>(null)
const statsLoading = ref(false)
const showDash = computed(() => auth.isLoggedIn && !!stats.value?.modules?.length)
watch(() => auth.isLoggedIn, async (v) => {
  if (!v) return
  statsLoading.value = true
  try { stats.value = await request('/api/stats') } catch (e) { stats.value = null } finally { statsLoading.value = false }
}, { immediate: true })

const trackName = (t: string) => trackMeta[t]?.name || t
</script>
