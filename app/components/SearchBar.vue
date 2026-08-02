<template>
  <div class="relative w-full" ref="root">
    <div class="relative">
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
        <Icon name="search" :size="17" />
      </span>
      <input
        ref="input"
        v-model="kw"
        type="search"
        :placeholder="placeholder"
        aria-label="站内搜索"
        class="input !pl-11 !pr-9"
        @focus="open = true"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="close()"
        @keydown.enter="onEnter"
      />
      <button
        v-if="kw"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
        @click="clear()" aria-label="清空"
      ><Icon name="close" :size="15" /></button>
    </div>

    <!-- 结果下拉 -->
    <transition name="fade">
      <div
        v-if="open && (kw.length >= 1)"
        class="absolute z-50 mt-2 w-full max-h-[70vh] overflow-y-auto glass border border-line rounded-2xl shadow-glow p-2"
      >
        <div v-if="loading" class="px-3 py-6 text-center text-sm text-muted">搜索中…</div>

        <template v-else>
          <div v-if="!result || result.total === 0" class="px-3 py-6 text-center text-sm text-muted">
            未找到与「{{ kw }}」相关的内容
          </div>

          <template v-else>
            <div v-if="result.sections.length" class="mb-1">
              <div class="px-3 pt-2 pb-1 text-[11px] font-bold text-muted uppercase tracking-wide">学习小节</div>
              <button
                v-for="(s, i) in result.sections" :key="'s'+s.id"
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-brand-coral/8 flex items-start gap-2"
                :class="activeIndex === i ? 'bg-brand-coral/12' : ''"
                @mouseenter="activeIndex = i" @click="go(s.href, i)"
              >
                <Icon name="book" :size="15" class="mt-0.5 text-brand-coral shrink-0" />
                <span class="min-w-0">
                  <span class="block text-sm font-semibold truncate">{{ s.title }}</span>
                  <span class="block text-[11px] text-muted truncate">{{ s.chapterTitle }} · {{ s.snippet }}</span>
                </span>
              </button>
            </div>

            <div v-if="result.chapters.length" class="mb-1">
              <div class="px-3 pt-2 pb-1 text-[11px] font-bold text-muted uppercase tracking-wide">章节</div>
              <button
                v-for="(c, i) in result.chapters" :key="'c'+c.id"
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-brand-coral/8 flex items-start gap-2"
                :class="activeIndex === i ? 'bg-brand-coral/12' : ''"
                @mouseenter="activeIndex = i" @click="go(c.href, i)"
              >
                <Icon name="layers" :size="15" class="mt-0.5 text-brand-coral shrink-0" />
                <span class="min-w-0"><span class="block text-sm font-semibold truncate">{{ c.title }}</span></span>
              </button>
            </div>

            <div v-if="result.questions.length" class="mb-1">
              <div class="px-3 pt-2 pb-1 text-[11px] font-bold text-muted uppercase tracking-wide">面试题</div>
              <button
                v-for="(q, i) in result.questions" :key="'q'+q.id"
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-brand-coral/8 flex items-start gap-2"
                :class="activeIndex === i ? 'bg-brand-coral/12' : ''"
                @mouseenter="activeIndex = i" @click="go(q.href, i)"
              >
                <Icon name="chat" :size="15" class="mt-0.5 text-brand-coral shrink-0" />
                <span class="min-w-0"><span class="block text-sm font-semibold truncate">{{ q.q }}</span>
                  <span class="block text-[11px] text-muted uppercase">{{ q.track }} · {{ q.type }}</span></span>
              </button>
            </div>

            <div v-if="result.exams.length" class="mb-1">
              <div class="px-3 pt-2 pb-1 text-[11px] font-bold text-muted uppercase tracking-wide">模拟答卷</div>
              <button
                v-for="(e, i) in result.exams" :key="'e'+e.id"
                class="w-full text-left px-3 py-2 rounded-xl hover:bg-brand-coral/8 flex items-start gap-2"
                :class="activeIndex === i ? 'bg-brand-coral/12' : ''"
                @mouseenter="activeIndex = i" @click="go(e.href, i)"
              >
                <Icon name="clipboard" :size="15" class="mt-0.5 text-brand-coral shrink-0" />
                <span class="min-w-0"><span class="block text-sm font-semibold truncate">{{ e.name }}</span>
                  <span class="block text-[11px] text-muted uppercase">{{ e.track }} · {{ e.level }}</span></span>
              </button>
            </div>

            <NuxtLink
              v-if="result && result.total > 0"
              :to="'/search?q=' + encodeURIComponent(kw)" class="block text-center text-xs text-brand-coral font-semibold py-2 hover:underline"
              @click="close()"
            >查看全部 {{ result.total }} 条结果 ↗</NuxtLink>
          </template>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ placeholder?: string }>()
const placeholder = props.placeholder || '搜索：事件循环、RAG、DORA、面试题…'

const kw = ref('')
const open = ref(false)
const loading = ref(false)
const result = ref<any>(null)
const activeIndex = ref(-1)
const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)

let timer: any = null
let reqId = 0

const flatItems = computed(() => {
  if (!result.value) return []
  return [
    ...result.value.sections,
    ...result.value.chapters,
    ...result.value.questions,
    ...result.value.exams
  ]
})

watch(kw, (v) => {
  open.value = true
  result.value = null
  activeIndex.value = -1
  if (!v || !v.trim()) { loading.value = false; return }
  loading.value = true
  clearTimeout(timer)
  timer = setTimeout(() => run(v.trim()), 220)
})

async function run(q: string) {
  const id = ++reqId
  try {
    const data = await $fetch('/api/search', { query: { q } }) as any
    if (id !== reqId) return // 丢弃过期请求
    result.value = data
  } catch (e) {
    if (id !== reqId) return
    result.value = { q, total: 0, sections: [], chapters: [], questions: [], exams: [] }
  } finally {
    if (id === reqId) loading.value = false
  }
}

function move(d: number) {
  const n = flatItems.value.length
  if (!n) return
  activeIndex.value = (activeIndex.value + d + n) % n
}
function onEnter() {
  const items = flatItems.value
  if (!items.length) { navigateTo('/search?q=' + encodeURIComponent(kw.value)); return }
  const idx = activeIndex.value < 0 ? 0 : activeIndex.value
  go(items[idx].href, idx)
}
function go(href: string, _i: number) {
  close()
  navigateTo(href)
}
function clear() {
  kw.value = ''
  result.value = null
  open.value = false
  input.value?.focus()
}
function close() {
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) close()
}
</script>
