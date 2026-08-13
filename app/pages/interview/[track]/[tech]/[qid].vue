<template>
  <div v-if="q">
    <nav class="text-sm text-muted mb-3 flex items-center gap-1.5 flex-wrap" aria-label="面包屑">
      <NuxtLink to="/interview" class="hover:text-ink transition inline-flex items-center gap-1"><Icon name="home" :size="14" /> 面试题库</NuxtLink>
      <Icon name="chevronRight" :size="14" class="opacity-60" />
      <NuxtLink :to="`/interview/${track}`" class="hover:text-ink transition">{{ trackName }}面试题</NuxtLink>
      <Icon name="chevronRight" :size="14" class="opacity-60" />
      <NuxtLink :to="`/interview/${track}/${techSlug}`" class="hover:text-ink transition">{{ tech }} 面试题</NuxtLink>
    </nav>

    <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 items-start">
      <article class="max-w-3xl">
        <!-- 题目标签（含所属技术标签，明确父级归属） -->
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          <a-tag :class="typeMeta.cls" :bordered="false">{{ typeMeta.label }}</a-tag>
          <a-tag class="!text-[11px]" :class="diffMeta(difficulty).cls" :bordered="false">{{ diffMeta(difficulty).label }}</a-tag>
          <a-tag class="!text-[11px] !bg-brand-coral/10 !text-brand-coral" :bordered="false">{{ tech }}</a-tag>
          <a-tag v-if="skill" class="!text-[11px] !bg-ink/5 !text-sub" :bordered="false">{{ skill }}</a-tag>
        </div>

        <h1 class="text-xl sm:text-2xl font-bold leading-snug mb-4">{{ q }}</h1>

        <!-- 参考答案 -->
        <div class="flex items-center gap-1.5 text-[13px] font-semibold text-brand-coral mb-2">
          <Icon name="checkCircle" :size="15" /> 参考答案
        </div>
        <div class="rounded-r-lg border-l-2 border-brand-coral/60 bg-brand-coral/[.04] p-4 prose-dm" v-html="md(a)"></div>

        <!-- 关键词 -->
        <div v-if="keywords.length" class="flex flex-wrap gap-1.5 mt-4">
          <a-tag v-for="k in keywords.slice(0, 10)" :key="k" class="!text-[11px] !bg-ink/5 !text-muted" :bordered="false">{{ k }}</a-tag>
        </div>

        <!-- 关联学习章节（学→问闭环） -->
        <div v-if="sectionTitle" class="mt-4 text-sm text-muted flex items-center gap-1.5">
          <Icon name="book" :size="14" /> 关联学习章节：
          <NuxtLink :to="`/learn?q=${encodeURIComponent(sectionTitle)}`" class="text-brand-coral hover:underline font-medium">
            {{ chapterTitle ? chapterTitle + ' · ' : '' }}{{ sectionTitle }}
          </NuxtLink>
        </div>

        <!-- 内链：上一题 / 下一题（强化站内抓取与停留） -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
          <NuxtLink v-if="prev" :to="adjUrl(prev.id)" class="rounded-xl border border-line p-3 hover:border-brand-coral/50 hover:bg-brand-coral/[.03] transition">
            <div class="text-xs text-muted mb-1">← 上一题</div>
            <div class="text-sm font-medium line-clamp-2">{{ prev.q }}</div>
          </NuxtLink>
          <NuxtLink v-if="next" :to="adjUrl(next.id)" class="rounded-xl border border-line p-3 hover:border-brand-coral/50 hover:bg-brand-coral/[.03] transition sm:col-start-2">
            <div class="text-xs text-muted mb-1">下一题 →</div>
            <div class="text-sm font-medium line-clamp-2">{{ next.q }}</div>
          </NuxtLink>
        </div>

        <div class="mt-8 pt-4 border-t border-line">
          <NuxtLink :to="`/interview/${track}/${techSlug}`" class="text-sm text-brand-coral hover:underline">← 返回「{{ tech }}」题列表</NuxtLink>
        </div>
      </article>

      <!-- 侧边：同标签（父级技术）其他面试题导航 -->
      <aside class="mt-8 lg:mt-0">
        <div class="lg:sticky lg:top-24">
          <div class="text-sm font-semibold mb-3 flex items-center gap-1.5 text-ink">
            <Icon name="layers" :size="15" /> 同标签「{{ tech }}」其他面试题
          </div>
          <ul class="space-y-1.5">
            <li v-for="s in siblings" :key="s.id">
              <NuxtLink :to="`/interview/${track}/${techSlug}/${s.id}`"
                class="block text-sm text-sub hover:text-brand-coral hover:bg-brand-coral/[.04] rounded-lg px-2.5 py-2 leading-snug transition line-clamp-2"
                :class="s.id === qid ? 'bg-brand-coral/10 text-brand-coral font-medium' : ''">
                {{ s.q }}
              </NuxtLink>
            </li>
          </ul>
          <NuxtLink :to="`/interview/${track}/${techSlug}`" class="mt-3 inline-block text-xs text-brand-coral hover:underline">查看全部「{{ tech }}」面试题 →</NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TRACK_NAMES, isTrack, slugToTech, techToSlug } from '~~/server/utils/interviewSlugs'

const route = useRoute()
const track = computed(() => route.params.track as string)
const slugParam = computed(() => route.params.tech as string)
const qid = computed(() => route.params.qid as string)

if (!isTrack(track.value)) {
  throw createError({ statusCode: 404, statusMessage: '题库不存在' })
}
const resolvedTech = slugToTech(slugParam.value)
if (!resolvedTech) {
  throw navigateTo('/interview/' + track.value, { redirectCode: 301 })
}
const tech = resolvedTech
const techSlug = computed(() => techToSlug(tech))

const trackName = computed(() => TRACK_NAMES[track.value as keyof typeof TRACK_NAMES])
const { md } = useMarkdown()

// 单题数据（SSR 期间即拉取，保证首屏与 SEO 文本在服务端渲染）
const { data, error } = await useFetch(() => '/api/interview/question/' + encodeURIComponent(qid.value))

// 不存在 → 404；存在但 URL 的 track/tech 与真实归属不一致 → 301 到规范 URL（防重复收录）
if (error.value && error.value.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: '题目不存在' })
}
if (data.value && (data.value.track !== track.value || data.value.tech !== tech)) {
  throw navigateTo(`/interview/${data.value.track}/${techToSlug(data.value.tech)}/${data.value.id}`, { redirectCode: 301 })
}

const q = computed(() => data.value?.q || '')
const a = computed(() => data.value?.a || '')
const keywords = computed<any[]>(() => data.value?.keywords || [])
const difficulty = computed(() => data.value?.difficulty || 'normal')
const skill = computed(() => data.value?.skill || null)
const sectionTitle = computed(() => data.value?.sectionTitle || null)
const chapterTitle = computed(() => data.value?.chapterTitle || null)
const prev = computed(() => data.value?.prev || null)
const next = computed(() => data.value?.next || null)
const siblings = computed(() => data.value?.siblings || [])
const isSpecial = computed(() => data.value?.type === 'special')

// 同(方向,技术)内相邻题链接
function adjUrl(id: string) {
  return `/interview/${track.value}/${techSlug.value}/${id}`
}

// ===== SEO =====
const canonicalUrl = useCanonicalUrl()
useHead(() => ({ link: canonicalUrl ? [{ rel: 'canonical', href: canonicalUrl }] : [] }))

const descText = computed(() => {
  const kw = keywords.value.slice(0, 4).join('、')
  const base = q.value.length > 42 ? q.value.slice(0, 42) + '…' : q.value
  return `${base} 参考答案与解析${kw ? '，涵盖 ' + kw : ''}。免费浏览 ${trackName.value} 方向「${tech}」高频面试真题。`
})

useSeoMeta({
  title: computed(() => (q.value.length > 58 ? q.value.slice(0, 58) + '…' : q.value) + ' · ' + trackName.value + '面试题'),
  description: descText,
  ogTitle: computed(() => (q.value.length > 48 ? q.value.slice(0, 48) + '…' : q.value)),
  ogDescription: descText,
  ogType: 'article',
  ogUrl: canonicalUrl
})

// QAPage 结构化数据：最大化每题在搜索结果中的富摘要机会
function stripMarkdown(s: string): string {
  return (s || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
useHead(() => {
  if (!q.value) return {}
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: q.value,
      text: q.value,
      answerCount: 1,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripMarkdown(a.value).slice(0, 600),
        author: { '@type': 'Organization', name: 'MentorLoop' },
        publisher: { '@type': 'Organization', name: 'MentorLoop' }
      }
    }
  }
  // 转义 < 防止答案中的 HTML/代码块提前闭合 script 标签
  return { script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(ld).replace(/</g, '\\u003c') }] }
})

// 题型 / 难度展示元数据
const TYPE_META: Record<string, { label: string; cls: string }> = {
  hot: { label: '高频必刷题', cls: '!bg-amber-500/15 !text-amber-600' },
  special: { label: '特殊场景题', cls: '!bg-brand-coral/10 !text-brand-coral' }
}
function typeMeta() { return (isSpecial.value ? TYPE_META.special : TYPE_META.hot) }
const DIFF_META: Record<string, { label: string; cls: string }> = {
  hard: { label: '困难', cls: '!bg-red-500/10 !text-red-500' },
  medium: { label: '较难', cls: '!bg-amber-500/15 !text-amber-600' },
  normal: { label: '常规', cls: '!bg-brand-coral/10 !text-brand-coral' }
}
function diffMeta(d: string) { return DIFF_META[d] || DIFF_META.normal }
</script>
