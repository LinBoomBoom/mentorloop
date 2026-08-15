<template>
  <div>
    <NuxtLink :to="`/learn/${mid}`" class="text-sm text-muted mb-3 inline-flex items-center gap-1 hover:text-ink transition">
      <Icon name="arrowLeft" :size="14" /> 返回 {{ module?.name }}
    </NuxtLink>

    <a-card v-if="!chapter"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    <template v-else>
      <h1 class="page-title flex items-center gap-2">
        {{ chapter.title }}
        <span v-if="auth.isLoggedIn" class="text-xs font-medium px-2 py-0.5 rounded-full"
              :class="chapterMastered ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-coral/10 text-brand-coral'">
          {{ chapterMastered ? '已掌握' : '学习中' }}
        </span>
      </h1>
      <p class="text-muted text-sm mt-1 mb-4">{{ chapter.goal }}</p>
      <a-card :body-style="{ padding: '24px' }">
        <div class="space-y-3">
          <NuxtLink v-for="s in chapter.sections" :key="s.id" :to="`/learn/${mid}/${chapter.id}/${s.id}`"
                    class="flex items-center gap-3 p-4 rounded-xl border transition"
                    :class="isDone(progress, mid, chapter.id, s.id)
                      ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                      : 'bg-white border-line hover:border-emerald-200'">
            <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                 :class="isDone(progress, mid, chapter.id, s.id) ? 'bg-emerald-500 text-white' : 'bg-ink/8 text-muted'">
              <Icon v-if="isDone(progress, mid, chapter.id, s.id)" name="check" :size="14" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-sm" :class="isDone(progress, mid, chapter.id, s.id) ? 'text-emerald-700' : 'text-sub'">{{ s.title }}</div>
              <div class="text-xs text-muted line-clamp-1">{{ s.direction }}</div>
            </div>
            <Icon name="chevronRight" :size="16" class="ml-auto text-muted shrink-0" />
          </NuxtLink>
        </div>
      </a-card>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { request } = useApi()
const { isDone } = useLearning()
const auth = useAuthStore()
const mid = computed(() => route.params.module as string)
const chapter = computed(() => module.value?.chapters.find((c: any) => c.id === route.params.chapter))

// 公开模块内容：SSR 加载
const { data: modRes } = await useFetch(() => '/api/modules/' + mid.value)
const module = ref<any>(null)
watch(modRes, (v: any) => { if (v?.module) module.value = v.module }, { immediate: true })

useSeoMeta({
  title: computed(() => (chapter.value ? chapter.value.title : '章节学习') + (module.value ? ' · ' + module.value.name : '')),
  description: computed(() => chapter.value?.goal || '按章节系统学习，免费浏览全部内容。'),
  ogTitle: computed(() => 'MentorLoop · ' + (chapter.value?.title || '章节学习')),
  ogDescription: computed(() => chapter.value?.goal || '系统学习路径'),
  ogType: 'article',
  ogUrl: safeOgUrl()
})

// 进度：仅登录后拉取
const progress = ref<any>({})
watch(() => auth.isLoggedIn, async (v) => {
  if (v) { try { progress.value = (await request('/api/progress')).progress || {} } catch (e) {} }
}, { immediate: true })

// 当前章节是否全部掌握（标题徽章：已掌握=绿 / 学习中=粉）
const chapterMastered = computed(() => {
  const ch = chapter.value
  if (!ch || !auth.isLoggedIn) return false
  const secs = ch.sections || []
  if (secs.length === 0) return false
  return secs.every((s: any) => isDone(progress.value, mid.value, ch.id, s.id))
})
</script>
