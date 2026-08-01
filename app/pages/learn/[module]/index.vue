<template>
  <div>
    <nav class="text-sm text-muted mb-3 flex items-center gap-1.5 flex-wrap" aria-label="面包屑">
      <NuxtLink to="/learn" class="hover:text-ink transition inline-flex items-center gap-1"><Icon name="home" :size="14" /> 学习中心</NuxtLink>
      <Icon name="chevronRight" :size="14" class="opacity-60" />
      <span class="text-ink font-medium">{{ module?.name }}</span>
    </nav>

    <div v-if="!module" class="card h-64 shimmer"></div>
    <template v-else>
      <div class="lg:grid lg:grid-cols-[1fr_264px] lg:gap-6 items-start">
      <div>
      <h1 class="text-2xl font-extrabold">{{ module.name }}</h1>
      <p class="text-muted text-sm mt-1 mb-4">{{ module.desc }}</p>

      <div class="relative mb-5 max-w-md">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" :size="17" /></span>
        <input v-model="q" class="input !pl-11" type="search" placeholder="搜索本节标题，如：事件循环、Flex…" aria-label="搜索本节小节" />
      </div>

      <div v-if="browseMode" class="card !p-4 mb-5 flex items-center gap-2 text-sm text-muted bg-brand-coral/5 border border-brand-coral/15">
        <Icon name="eye" :size="16" class="text-brand-coral shrink-0" /> 浏览模式：未登录也能查看全部章节。登录后开启「打卡」即可记录已掌握，全部章节随时可自由阅读。
      </div>
      <div v-else class="card !p-4 mb-5 flex items-center gap-2 text-sm text-muted bg-brand-coral/5 border border-brand-coral/15">
        <Icon name="compass" :size="16" class="text-brand-coral shrink-0" /> 全部章节均可自由阅读，勾选「已掌握」即记录进度，按你自己的节奏推进。
      </div>

      <div v-if="filteredChapters.length === 0" class="card p-10 text-center text-muted text-sm">
        没有匹配「{{ q }}」的小节，换个关键词试试～
      </div>

      <div v-else class="space-y-5">
        <div v-for="(ch, ci) in filteredChapters" :key="ch.id" class="card p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                 :style="{ background: module.color }">{{ ci + 1 }}</div>
            <div class="min-w-0">
              <h3 class="font-bold">{{ ch.title }}</h3>
              <p class="text-xs text-muted line-clamp-1">{{ ch.goal }}</p>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <NuxtLink v-for="(s, si) in chapterSections(ch)" :key="s.id" :to="`/learn/${module.id}/${ch.id}/${s.id}`"
                      class="flex items-center gap-3 p-3 rounded-xl border border-line transition hover:border-brand-coral/40">
              <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                   :class="isDone(progress, module.id, ch.id, s.id) ? 'bg-emerald-500 text-white' : 'bg-ink/8 text-muted'">
                <Icon v-if="isDone(progress, module.id, ch.id, s.id)" name="check" :size="14" />
              </div>
              <span class="text-sm font-medium truncate">{{ s.title }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
      </div>
        <!-- 桌面端：本章目录（粘性侧栏） -->
        <aside class="hidden lg:block sticky top-6">
          <div class="card p-5">
            <div class="text-sm font-bold mb-3 flex items-center gap-1.5"><Icon name="book" :size="15" class="text-brand-coral" /> 本章目录</div>
            <div class="space-y-3 max-h-[72vh] overflow-auto scrollbar-thin pr-1">
              <div v-for="(ch, ci) in (module.chapters || [])" :key="ch.id">
                <div class="text-xs font-semibold text-sub mb-1.5 leading-snug">{{ ci + 1 }}. {{ ch.title }}</div>
                <div class="space-y-0.5">
                  <NuxtLink v-for="s in (ch.sections || [])" :key="s.id" :to="`/learn/${module.id}/${ch.id}/${s.id}`"
                            class="flex items-center gap-2 text-xs py-1 px-2 rounded-lg hover:bg-brand-coral/5 transition truncate"
                            :class="isDone(progress, module.id, ch.id, s.id) ? 'text-emerald-600 font-medium' : 'text-muted'">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="isDone(progress, module.id, ch.id, s.id) ? 'bg-emerald-500' : 'bg-ink/20'"></span>
                    <span class="truncate">{{ s.title }}</span>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { request } = useApi()
const { isDone, chapterUnlocked: cu, sectionUnlocked: su } = useLearning()
const auth = useAuthStore()
const browseMode = computed(() => !auth.isLoggedIn)
const isAdmin = computed(() => auth.user?.role === 'admin')
const mid = computed(() => route.params.module as string)

// 公开模块内容：SSR 加载
const { data: modRes } = await useFetch(() => '/api/modules/' + mid.value)
const module = ref<any>(null)
watch(modRes, (v: any) => { if (v?.module) module.value = v.module }, { immediate: true })

useSeoMeta({
  title: computed(() => module.value ? module.value.name + ' · 学习路径' : '学习路径'),
  description: computed(() => module.value ? module.value.desc : '按章节系统学习，免费浏览全部内容。'),
  ogTitle: computed(() => 'MentorLoop · ' + (module.value?.name || '学习')),
  ogDescription: computed(() => module.value?.desc || '系统学习路径'),
  ogType: 'website',
  ogUrl: safeOgUrl()
})

// 进度：仅登录后拉取（未登录可浏览）
const progress = ref<any>({})
watch(() => auth.isLoggedIn, async (v) => {
  if (v) { try { progress.value = (await request('/api/progress')).progress || {} } catch (e) {} }
}, { immediate: true })

// 章节/小节搜索过滤（客户端，数据量小）
const q = ref('')
const filteredChapters = computed(() => {
  const all = module.value?.chapters || []
  const kw = q.value.trim().toLowerCase()
  if (!kw) return all
  return all.filter((ch: any) => ch.title.toLowerCase().includes(kw) || (ch.sections || []).some((s: any) => s.title.toLowerCase().includes(kw)))
})
const chapterSections = (ch: any) => {
  const kw = q.value.trim().toLowerCase()
  if (!kw) return ch.sections || []
  return (ch.sections || []).filter((s: any) => s.title.toLowerCase().includes(kw) || ch.title.toLowerCase().includes(kw))
}
</script>
