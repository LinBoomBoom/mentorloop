<template>
  <div>
    <h1 class="page-title mb-1">面试题库 &amp; AI 陪练</h1>
    <p class="text-muted text-sm mb-5">前端 / 后端 / 运维 / AI 工程四方向高频必刷题与特殊场景题，按技术精确筛选；也可直接提问，让 AI 帮你梳理思路。选择下方方向进入对应题库。</p>

    <!-- AI 提问（保留原入口，支持 ?askTrack= 深链） -->
    <InterviewAsk />

    <!-- 模拟面试入口 -->
    <NuxtLink to="/interview/sim" class="block mb-6">
      <a-card class="hover:-translate-y-0.5 transition !border-brand-coral/30 !bg-brand-coral/5" :body-style="{ padding: '16px' }">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral flex items-center justify-center shrink-0"><Icon name="sparkles" :size="20" /></span>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm">AI 深度模拟面试 <a-tag class="!bg-brand-coral/15 !text-brand-coral !ml-1" :bordered="false">VIP</a-tag></div>
            <div class="text-xs text-muted truncate">多轮实战问答 + 逐题评分反馈，还原真实面试节奏</div>
          </div>
          <Icon name="arrowRight" :size="18" class="text-muted shrink-0" />
        </div>
      </a-card>
    </NuxtLink>

    <!-- 方向入口：每个方向独立可索引路由 /interview/[track]，SEO 主战场 -->
    <h3 class="section-title mb-3">按方向刷题</h3>
    <a-card v-if="!overview"><a-skeleton active :paragraph="{ rows: 3 }" /></a-card>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
      <NuxtLink v-for="t in TRACKS" :key="t" :to="`/interview/${t}`"
                class="reveal group rounded-2xl border border-line p-5 hover:border-brand-coral/50 hover:shadow-[0_10px_30px_-18px_rgba(225,29,72,.6)] transition">
        <div class="flex items-center gap-3 mb-3">
          <span class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" :style="{ background: TRACK_COLORS[t] }">{{ TRACK_NAMES[t][0] }}</span>
          <div class="font-bold text-[15px] text-ink">{{ TRACK_NAMES[t] }}面试题</div>
        </div>
        <p class="text-xs text-muted mb-3 leading-relaxed">
          高频必刷题 {{ (overview.tracks[t]?.hot || 0) }} 道 · 特殊场景题 {{ (overview.tracks[t]?.special || 0) }} 道
        </p>
        <div class="text-xs font-semibold text-brand-coral group-hover:underline">进入题库 →</div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TRACKS, TRACK_NAMES, TRACK_COLORS, isTrack } from '~~/server/utils/interviewSlugs'
import { roadmap } from '~/data/skillRoadmap'
const route = useRoute()
const router = useRouter()

// 旧深链兼容：/interview?track=xxx → /interview/[track]；?mode=tree&subtrack= → 解析方向后跳转
// 客户端重定向（用户/爬虫从站内搜索、路线图跳转进入时仍可达正确方向页）
onMounted(() => {
  const q = route.query
  if (typeof q.track === 'string' && isTrack(q.track)) {
    // 仅透传搜索/筛选态（?q/?type/?page，用户主动输入，标准 query 语义）；技术分类已是路由段，不再以 ?tech= 透传
    return router.replace(buildTarget('/interview/' + q.track, ['q', 'type', 'page']))
  }
  if (q.mode === 'tree' && typeof q.subtrack === 'string') {
    const dir = roadmap.find(d => d.subTracks.some(st => st.id === q.subtrack))
    if (dir) return router.replace('/interview/' + dir.id)
  }
})
function buildTarget(base: string, keys: string[]): string {
  const params = new URLSearchParams()
  for (const k of keys) {
    const v = route.query[k]
    if (typeof v === 'string' && v) params.set(k, v)
  }
  const s = params.toString()
  return s ? base + '?' + s : base
}

const { data: ovRes } = await useFetch('/api/interview/overview')
const overview = computed(() => ovRes.value || null)

// canonical：枢纽页规范 URL（预渲染阶段无 request event 时降级为空，由 sitemap 提供 URL）
const canonicalUrl = useCanonicalUrl()
useHead(() => ({ link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [] }))

useSeoMeta({
  title: '面试题库 & AI 陪练',
  description: '前端/后端/运维/AI 工程四方向高频必刷题与特殊场景题，按技术精确筛选，答案结构化含代码示例；也可直接向 AI 提问梳理思路。',
  ogTitle: '面试题库 · MentorLoop',
  ogDescription: '高频面试题 + 特殊场景题，按技术精确筛选，答案结构清晰。',
  ogType: 'website',
  ogUrl: canonicalUrl.value
})
</script>
