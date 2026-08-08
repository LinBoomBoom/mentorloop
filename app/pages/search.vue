<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-6">
      <h1 class="page-title mb-4">站内搜索</h1>
      <SearchBar placeholder="搜索：事件循环、RAG、DORA、面试题…" />
    </div>

    <a-card v-if="!q" class="text-center" :body-style="{ padding: '32px' }">
      <Icon name="search" :size="32" class="mx-auto mb-3 opacity-60" />
      <p class="text-muted">输入关键词，跨「学习小节 / 章节 / 面试题 / 模拟答卷」全文检索。</p>
      <div class="flex flex-wrap gap-2 justify-center mt-4">
        <a-tag v-for="k in hot" :key="k" class="cursor-pointer hover:!bg-brand-coral/10 hover:!text-brand-coral" :bordered="false" @click="run(k)">{{ k }}</a-tag>
      </div>
    </a-card>

    <a-card v-else-if="loading" class="text-center" :body-style="{ padding: '32px' }">
      <span class="text-muted">搜索中…</span>
    </a-card>

    <a-card v-else-if="res && res.total === 0" class="text-center" :body-style="{ padding: '32px' }">
      <span class="text-muted">未找到与「{{ q }}」相关的内容，换个关键词试试。</span>
    </a-card>

    <div v-else-if="res" class="space-y-6">
      <p class="text-sm text-muted">「{{ q }}」共找到 <b class="text-ink">{{ res.total }}</b> 条结果</p>

      <section v-if="res.sections.length">
        <h2 class="section-title"><Icon name="book" :size="16" /> 学习小节 <span class="count">{{ res.sections.length }}</span></h2>
        <NuxtLink v-for="s in shown('sections')" :key="s.id" :to="s.href">
          <a-card class="block mb-2 hover:!border-brand-coral/50 transition" :body-style="{ padding: '16px' }">
            <div class="font-semibold">{{ s.title }}</div>
            <div class="text-xs text-muted mt-0.5">{{ s.chapterTitle }} · {{ s.snippet }}</div>
          </a-card>
        </NuxtLink>
        <div v-if="hasMore('sections')" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="loadMore('sections')">加载更多（剩 {{ res.sections.length - pages.sections * PAGE }} 条）</a-button>
        </div>
        <div v-else-if="res.sections.length > PAGE" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="collapse('sections')">收起</a-button>
        </div>
      </section>

      <section v-if="res.chapters.length">
        <h2 class="section-title"><Icon name="layers" :size="16" /> 章节 <span class="count">{{ res.chapters.length }}</span></h2>
        <NuxtLink v-for="c in shown('chapters')" :key="c.id" :to="c.href">
          <a-card class="block mb-2 hover:!border-brand-coral/50 transition" :body-style="{ padding: '16px' }">
            <div class="font-semibold">{{ c.title }}</div>
          </a-card>
        </NuxtLink>
        <div v-if="hasMore('chapters')" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="loadMore('chapters')">加载更多（剩 {{ res.chapters.length - pages.chapters * PAGE }} 条）</a-button>
        </div>
        <div v-else-if="res.chapters.length > PAGE" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="collapse('chapters')">收起</a-button>
        </div>
      </section>

      <section v-if="res.questions.length">
        <h2 class="section-title"><Icon name="chat" :size="16" /> 面试题 <span class="count">{{ res.questions.length }}</span></h2>
        <NuxtLink v-for="qq in shown('questions')" :key="qq.id" :to="qq.href">
          <a-card class="block mb-2 hover:!border-brand-coral/50 transition" :body-style="{ padding: '16px' }">
            <div class="font-semibold">{{ qq.q }}</div>
            <div class="text-xs text-muted mt-0.5 uppercase">{{ qq.track }} · {{ qq.type }}</div>
          </a-card>
        </NuxtLink>
        <div v-if="hasMore('questions')" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="loadMore('questions')">加载更多（剩 {{ res.questions.length - pages.questions * PAGE }} 条）</a-button>
        </div>
        <div v-else-if="res.questions.length > PAGE" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="collapse('questions')">收起</a-button>
        </div>
      </section>

      <section v-if="res.exams.length">
        <h2 class="section-title"><Icon name="clipboard" :size="16" /> 模拟答卷 <span class="count">{{ res.exams.length }}</span></h2>
        <NuxtLink v-for="e in shown('exams')" :key="e.id" :to="e.href">
          <a-card class="block mb-2 hover:!border-brand-coral/50 transition" :body-style="{ padding: '16px' }">
            <div class="font-semibold">{{ e.name }}</div>
            <div class="text-xs text-muted mt-0.5 uppercase">{{ e.track }} · {{ e.level }}</div>
          </a-card>
        </NuxtLink>
        <div v-if="hasMore('exams')" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="loadMore('exams')">加载更多（剩 {{ res.exams.length - pages.exams * PAGE }} 条）</a-button>
        </div>
        <div v-else-if="res.exams.length > PAGE" class="mt-1">
          <a-button type="link" size="small" class="!py-2" @click="collapse('exams')">收起</a-button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const q = ref((route.query.q as string) || '')
const loading = ref(false)
const res = ref<any>(null)
const hot = ['事件循环', 'RAG', 'DORA', '闭包', '索引', 'CSS 居中', 'K8s', '提示注入']

// 搜索结果按类分页（客户端，数据量小）：每类每页 PAGE 条，可加载更多 / 收起
const PAGE = 8
const pages = reactive({ sections: 1, chapters: 1, questions: 1, exams: 1 })
type GroupKey = 'sections' | 'chapters' | 'questions' | 'exams'
function shown(key: GroupKey) { return (res.value?.[key] || []).slice(0, pages[key] * PAGE) }
function hasMore(key: GroupKey) { return (res.value?.[key]?.length || 0) > pages[key] * PAGE }
function loadMore(key: GroupKey) { pages[key]++ }
function collapse(key: GroupKey) { pages[key] = 1 }

async function run(keyword: string) {
  q.value = keyword
  if (!keyword.trim()) { res.value = null; return }
  loading.value = true
  try {
    res.value = await $fetch('/api/search', { query: { q: keyword } }) as any
    pages.sections = 1; pages.chapters = 1; pages.questions = 1; pages.exams = 1
  } finally {
    loading.value = false
  }
}

watch(() => route.query.q, (v) => run((v as string) || ''))
onMounted(() => { if (q.value) run(q.value) })
</script>

<style scoped>
.section-title { @apply flex items-center gap-2 font-bold text-lg mb-2; }
.section-title .count { @apply text-xs font-semibold text-muted bg-ink/5 rounded-full px-2 py-0.5; }
</style>
