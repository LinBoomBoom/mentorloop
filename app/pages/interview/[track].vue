<template>
  <!-- 技术子类页（/interview/[track]/[tech]）通过 <NuxtPage> 接管整页渲染 -->
  <NuxtPage v-if="route.params.tech" />
  <!-- 方向页（/interview/[track]，无 child 段）展示方向级内容 -->
  <div v-else>
    <nav class="text-sm text-muted mb-3 flex items-center gap-1.5 flex-wrap" aria-label="面包屑">
      <NuxtLink to="/interview" class="hover:text-ink transition inline-flex items-center gap-1"><Icon name="home" :size="14" /> 面试题库</NuxtLink>
      <Icon name="chevronRight" :size="14" class="opacity-60" />
      <span class="text-ink font-medium">{{ trackName }}面试题</span>
    </nav>

    <div class="flex items-center gap-3 mb-1">
      <span class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0" :style="{ background: TRACK_COLORS[track] }">{{ trackName[0] }}</span>
      <h1 class="page-title">{{ trackName }}面试题库</h1>
    </div>
    <p class="text-muted text-sm mb-5">{{ trackName }}方向高频必刷题与特殊场景题，按技术子类精确筛选，答案结构化含代码示例；也可直接向 AI 提问梳理思路。</p>

    <InterviewAsk />

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

    <InterviewBank :track="track" />
  </div>
</template>

<script setup lang="ts">
import { TRACK_NAMES, TRACK_COLORS, isTrack } from '~~/server/utils/interviewSlugs'
const route = useRoute()
const track = computed(() => route.params.track as string)
if (!isTrack(track.value)) {
  throw createError({ statusCode: 404, statusMessage: '题库不存在' })
}
// 技术分类完全是路由段 /interview/[track]/[tech]（英文 slug），不再有任何 ?tech= 查询参数。
const trackName = computed(() => TRACK_NAMES[track.value as keyof typeof TRACK_NAMES])

// 方向页 SEO（技术子类页由 [tech].vue 自行设置，避免父级 meta 覆盖子页）
if (!route.params.tech) {
  // canonical：方向页规范 URL（不含分页/筛选查询参数），防止查询变体被重复收录
  const canonicalUrl = useCanonicalUrl()
  useHead(() => ({ link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [] }))

  useSeoMeta({
    title: computed(() => trackName.value + '面试题库 · 高频必刷题与特殊场景题'),
    description: computed(() => trackName.value + '方向高频面试题与特殊场景题，按技术子类精确筛选，答案结构化含代码示例，免费浏览。'),
    ogTitle: computed(() => 'MentorLoop · ' + trackName.value + '面试题'),
    ogDescription: computed(() => trackName.value + '面试题库，按技术精确筛选，答案结构清晰。'),
    ogType: 'article',
    ogUrl: canonicalUrl.value
  })
}
</script>
