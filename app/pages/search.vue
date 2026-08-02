<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-extrabold gradient-text mb-4">站内搜索</h1>
      <SearchBar placeholder="搜索：事件循环、RAG、DORA、面试题…" />
    </div>

    <div v-if="!q" class="card p-8 text-center text-muted">
      <Icon name="search" :size="32" class="mx-auto mb-3 opacity-60" />
      <p>输入关键词，跨「学习小节 / 章节 / 面试题 / 模拟答卷」全文检索。</p>
      <div class="flex flex-wrap gap-2 justify-center mt-4">
        <button v-for="k in hot" :key="k" class="tag cursor-pointer hover:bg-brand-coral/10 hover:text-brand-coral"
                @click="run(k)">{{ k }}</button>
      </div>
    </div>

    <div v-else-if="loading" class="card p-8 text-center text-muted">搜索中…</div>

    <div v-else-if="res && res.total === 0" class="card p-8 text-center text-muted">
      未找到与「{{ q }}」相关的内容，换个关键词试试。
    </div>

    <div v-else-if="res" class="space-y-6">
      <p class="text-sm text-muted">「{{ q }}」共找到 <b class="text-ink">{{ res.total }}</b> 条结果</p>

      <section v-if="res.sections.length">
        <h2 class="section-title"><Icon name="book" :size="16" /> 学习小节 <span class="count">{{ res.sections.length }}</span></h2>
        <NuxtLink v-for="s in res.sections" :key="s.id" :to="s.href"
                  class="card block p-4 mb-2 hover:border-brand-coral/50 transition">
          <div class="font-semibold">{{ s.title }}</div>
          <div class="text-xs text-muted mt-0.5">{{ s.chapterTitle }} · {{ s.snippet }}</div>
        </NuxtLink>
      </section>

      <section v-if="res.chapters.length">
        <h2 class="section-title"><Icon name="layers" :size="16" /> 章节 <span class="count">{{ res.chapters.length }}</span></h2>
        <NuxtLink v-for="c in res.chapters" :key="c.id" :to="c.href"
                  class="card block p-4 mb-2 hover:border-brand-coral/50 transition">
          <div class="font-semibold">{{ c.title }}</div>
        </NuxtLink>
      </section>

      <section v-if="res.questions.length">
        <h2 class="section-title"><Icon name="chat" :size="16" /> 面试题 <span class="count">{{ res.questions.length }}</span></h2>
        <NuxtLink v-for="q in res.questions" :key="q.id" :to="q.href"
                  class="card block p-4 mb-2 hover:border-brand-coral/50 transition">
          <div class="font-semibold">{{ q.q }}</div>
          <div class="text-xs text-muted mt-0.5 uppercase">{{ q.track }} · {{ q.type }}</div>
        </NuxtLink>
      </section>

      <section v-if="res.exams.length">
        <h2 class="section-title"><Icon name="clipboard" :size="16" /> 模拟答卷 <span class="count">{{ res.exams.length }}</span></h2>
        <NuxtLink v-for="e in res.exams" :key="e.id" :to="e.href"
                  class="card block p-4 mb-2 hover:border-brand-coral/50 transition">
          <div class="font-semibold">{{ e.name }}</div>
          <div class="text-xs text-muted mt-0.5 uppercase">{{ e.track }} · {{ e.level }}</div>
        </NuxtLink>
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

async function run(keyword: string) {
  q.value = keyword
  if (!keyword.trim()) { res.value = null; return }
  loading.value = true
  try {
    res.value = await $fetch('/api/search', { query: { q: keyword } }) as any
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
