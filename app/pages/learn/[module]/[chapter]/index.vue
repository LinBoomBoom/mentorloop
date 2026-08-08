<template>
  <div>
    <NuxtLink :to="`/learn/${mid}`" class="text-sm text-muted mb-3 inline-flex items-center gap-1 hover:text-ink transition">
      <Icon name="arrowLeft" :size="14" /> 返回 {{ module?.name }}
    </NuxtLink>

    <a-card v-if="!chapter"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    <template v-else>
      <h1 class="page-title">{{ chapter.title }}</h1>
      <p class="text-muted text-sm mt-1 mb-4">{{ chapter.goal }}</p>
      <a-card :body-style="{ padding: '24px' }">
        <div class="space-y-3">
          <NuxtLink v-for="s in chapter.sections" :key="s.id" :to="`/learn/${mid}/${chapter.id}/${s.id}`"
                    class="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-brand-coral/40 transition">
            <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                 :class="isDone(progress, mid, chapter.id, s.id) ? 'bg-emerald-500 text-white' : 'bg-ink/8 text-muted'">
              <Icon v-if="isDone(progress, mid, chapter.id, s.id)" name="check" :size="14" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-sm">{{ s.title }}</div>
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
</script>
