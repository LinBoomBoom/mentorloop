<template>
  <div>
    <!-- 英雄区（公开，始终可见） -->
    <section class="relative overflow-hidden rounded-3xl card !p-0 mb-7">
      <div class="aura !absolute"><div class="blob"></div></div>
      <div class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent z-[5]"></div>
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
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 stagger">
        <!-- 总进度：各方向明细收进悬停/点击浮层，避免首页再铺一整块「方向进度」 -->
        <a-popover placement="bottomLeft" :trigger="['hover', 'click']" :mouse-enter-delay="0.05" overlay-class-name="dash-breakdown">
          <template #content>
            <div class="w-[292px]">
              <div class="text-[12px] font-bold mb-3">各方向进度明细</div>
              <div class="space-y-3">
                <div v-for="m in stats.modules" :key="m.id">
                  <div class="flex items-center justify-between text-[12px] mb-1">
                    <span class="font-semibold flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: m.color }"></span>{{ m.name }}
                    </span>
                    <span class="text-muted">{{ m.done }}/{{ m.total }} · {{ m.percent }}%</span>
                  </div>
                  <div class="h-2 rounded-full bg-ink/10 overflow-hidden">
                    <!-- 用直角小段而非 rounded-full：百分比很低时不会缩成一个圆点 -->
                    <div class="h-full rounded-[2px] transition-all duration-700"
                         :style="{ width: m.percent + '%', minWidth: m.percent > 0 ? '6px' : '0', background: m.color }"></div>
                  </div>
                </div>
              </div>
              <div class="mt-3 pt-2.5 border-t border-line text-[11px] text-muted">
                点击方向名可直接进入对应学习路径
              </div>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <NuxtLink v-for="m in stats.modules" :key="'l' + m.id" :to="`/learn/${m.id}`"
                          class="text-[11px] px-2 py-1 rounded-lg border border-line hover:border-brand-coral/50 hover:text-brand-coral transition">
                  {{ m.name }}
                </NuxtLink>
              </div>
            </div>
          </template>
          <div class="card p-6 flex items-center gap-5 cursor-pointer hover:border-brand-coral/40 transition h-full">
            <ProgressRing :value="stats.overall.percent" :size="108" :stroke="11" color="#e11d48" label="总进度" />
            <div class="min-w-0">
              <div class="text-sm text-muted">已掌握</div>
              <div class="text-xl font-extrabold">{{ stats.overall.done }}<span class="text-muted text-sm font-normal"> / {{ stats.overall.total }} 节</span></div>
              <div class="text-[12px] text-muted mt-1">还差 {{ stats.overall.total - stats.overall.done }} 节</div>
              <div class="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-brand-coral border-b border-dashed border-brand-coral/50">
                <Icon name="chart" :size="12" /> 查看各方向明细
              </div>
            </div>
          </div>
        </a-popover>
        <CheckinCard
          :streak="stats.streak.current"
          :longest="stats.streak.longest"
          :total-days="stats.streak.totalDays"
          :heatmap="stats.heatmap"
          @refresh="loadStats"
        />
        <!-- 最强方向：不止展示一个数字，而是把「优势 + 最大短板 + 下一步去补强」串起来，更有行动指导意义 -->
        <div class="card p-6 flex flex-col">
          <div class="flex items-center justify-between mb-2">
            <h3 class="section-title">最强方向</h3>
            <span class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(217,119,6,.1);color:#d97706"><Icon name="target" :size="20" /></span>
          </div>
          <div class="text-2xl font-extrabold" style="color:#d97706">{{ stats.radarInsight?.strong.axis || '—' }}</div>
          <div class="text-[12px] text-muted mt-1">综合 {{ stats.radarInsight?.strong.value ?? '—' }} 分 · 你当前最拿手的方向</div>
          <div v-if="stats.radarInsight" class="mt-3 rounded-xl bg-amber-400/[0.10] border border-amber-400/20 p-3">
            <div class="text-[12px] font-semibold text-amber-600 dark:text-amber-400">建议优先补强</div>
            <div class="text-[12px] text-sub leading-relaxed mt-0.5">「{{ stats.radarInsight.weak.axis }}」仅 {{ stats.radarInsight.weak.value }} 分，是最大短板；补强它比巩固优势更能抬升整体水平。</div>
          </div>
          <div v-if="stats.radarInsight" class="mt-auto pt-4">
            <NuxtLink :to="`/learn/${stats.radarInsight.weak.key || ''}`" class="btn btn-primary btn-block">
              去补强 {{ stats.radarInsight.weak.axis }} <Icon name="arrowRight" :size="15" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-7 stagger">
        <div class="card p-6 flex flex-col">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
              <h3 class="section-title">能力雷达</h3>
              <a-popover title="雷达解读" placement="bottomRight" :trigger="['hover', 'click']">
                <template #content>
                  <div class="w-[260px]">
                    <p class="text-[12px] text-sub leading-relaxed">{{ stats.radarInsight?.advice }}</p>
                    <NuxtLink v-if="stats.radarInsight" :to="stats.radarInsight.actionTo"
                              class="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-brand-coral hover:underline">
                      {{ stats.radarInsight.actionText }} <Icon name="arrowRight" :size="12" />
                    </NuxtLink>
                  </div>
                </template>
                <button class="w-5 h-5 rounded-full bg-ink/5 text-muted text-[11px] font-bold leading-none flex items-center justify-center hover:bg-brand-coral/10 hover:text-brand-coral transition" aria-label="雷达解读">?</button>
              </a-popover>
            </div>
            <NuxtLink v-if="stats.resume" :to="stats.resume.path"
                      class="inline-flex items-center gap-1 max-w-[155px] truncate text-[12px] font-semibold text-brand-coral hover:underline"
                      :title="`继续学习：${stats.resume.sectionTitle}`">
              继续：{{ stats.resume.sectionTitle }} <Icon name="arrowRight" :size="12" />
            </NuxtLink>
          </div>
          <p class="text-xs text-muted mb-2">
            四个方向按「学习完成度 + 该方向答卷正确率」各半合成，另含学习节奏与实战强度；悬停任意顶点可看算法说明。
          </p>
          <div class="h-[280px] shrink-0"><RadarChart :data="stats.radar" /></div>
        </div>

        <div class="card p-6 flex flex-col">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
              <h3 class="section-title">学习热力图</h3>
              <a-popover title="点亮规则" placement="bottomRight" :trigger="['hover', 'click']">
                <template #content>
                  <div class="w-[260px] text-[12px] text-sub leading-relaxed">
                    每完成 1 节课程学习、或每日打卡 1 次，对应日期即点亮；颜色越深表示当日学习 / 打卡越活跃。连续活跃天数会在「连续学习」中累计。
                  </div>
                </template>
                <button class="w-5 h-5 rounded-full bg-ink/5 text-muted text-[11px] font-bold leading-none flex items-center justify-center hover:bg-brand-coral/10 hover:text-brand-coral transition" aria-label="点亮规则">?</button>
              </a-popover>
            </div>
            <span class="text-[12px] text-muted">{{ heatRangeLabel }}</span>
          </div>
          <Heatmap :days="stats.heatmap" class="mt-2" />
        </div>

        <div class="card p-6 lg:col-span-2 xl:col-span-1 flex flex-col">
          <h3 class="section-title mb-4">最近答卷</h3>
          <div v-if="!stats.exams.recent.length" class="flex-1 flex items-center justify-center text-sm text-muted py-8 text-center">还没有答卷记录</div>
          <div v-else class="space-y-3">
            <NuxtLink v-for="r in stats.exams.recent" :key="r.recordId" :to="`/exam/sets/${r.setId}?record=${r.recordId}`"
                      class="flex items-center justify-between gap-3 p-3 rounded-xl bg-ink/5 border border-transparent hover:bg-brand-coral/5 hover:border-brand-coral/30 transition">
              <div class="min-w-0">
                <div class="text-sm font-semibold truncate">{{ r.name }}</div>
                <div class="text-[11px] text-muted" :title="fmtDateTime(r.createdAt)">{{ fmtDateTime(r.createdAt) }}</div>
              </div>
              <div class="text-lg font-extrabold shrink-0" :class="r.score>=70?'text-emerald-500':r.score>=50?'text-amber-500':'text-red-500'">{{ r.score }}</div>
            </NuxtLink>
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
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <NuxtLink v-for="m in modules" :key="m.id" :to="`/learn/${m.id}`" class="card p-6 overflow-hidden hover:-translate-y-1 transition reveal group">
          <div class="h-1.5 -mx-6 -mt-6 mb-4" :style="{ background: `linear-gradient(90deg, ${m.color}, ${m.color}55)` }"></div>
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
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div v-for="q in featuredQuestions" :key="q.id" class="card p-5 reveal">
          <div class="flex items-start gap-3">
            <Icon name="chat" :size="18" class="text-brand-coral mt-0.5 shrink-0"/>
            <div class="min-w-0">
              <div class="text-sm font-semibold leading-snug line-clamp-2">{{ q.q }}</div>
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
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        <NuxtLink v-for="s in sets" :key="s.id" :to="`/exam/sets/${s.id}`" class="card p-6 overflow-hidden hover:-translate-y-1 transition reveal">
          <div class="h-1.5 -mx-6 -mt-6 mb-4" :style="{ background: `linear-gradient(90deg, ${trackMeta[s.track]?.color || '#94a3b8'}, ${(trackMeta[s.track]?.color || '#94a3b8')}55)` }"></div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="trackBadge(s.track)">{{ trackName(s.track) }}</span>
            <span v-if="s.vipOnly" class="text-xs text-amber-500 font-semibold">VIP</span>
          </div>
          <h3 class="font-bold line-clamp-2">{{ s.name }}</h3>
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

// 精选面试题：单次轻量请求（每方向 1 高频 + 1 特殊，仅题干与关键词，不含答案正文）
const { data: featRes } = await useFetch('/api/interview/featured')
const featuredQuestions = computed(() => (featRes.value?.questions || []).slice(0, 8))

const { data: setRes } = await useFetch('/api/exam/sets')
// 首页试卷：每个方向各取一套代表卷，保证 AI 工程始终有曝光（避免 .slice(0,3) 只取到前三个非 AI 卷）
const sets = computed(() => {
  const all = setRes.value?.sets || []
  const byTrack: Record<string, any> = {}
  for (const s of all) if (!byTrack[s.track]) byTrack[s.track] = s
  return (['frontend', 'backend', 'devops', 'ai'] as const)
    .map((t) => byTrack[t]).filter(Boolean)
})

// 个性化看板：仅登录后拉取（避免 SSR 拿不到 token）
const stats = ref<any>(null)
const statsLoading = ref(false)
const showDash = computed(() => auth.isLoggedIn && !!stats.value?.modules?.length)
async function loadStats(showSkeleton = false) {
  if (!auth.isLoggedIn) return
  if (showSkeleton) statsLoading.value = true
  try { stats.value = await request('/api/stats') } catch (e) { if (showSkeleton) stats.value = null } finally { statsLoading.value = false }
}
watch(() => auth.isLoggedIn, (v) => { if (v) loadStats(true) }, { immediate: true })

const trackName = (t: string) => trackMeta[t]?.name || t

// 热力图月份区间标签（如「7月 – 8月」），显示在卡片标题右侧
const heatRangeLabel = computed(() => {
  const r = stats.value?.heatmapRange
  if (!r) return ''
  const s = r.start.split('-'), e = r.end.split('-')
  return `${Number(s[1])}月 – ${Number(e[1])}月`
})</script>
