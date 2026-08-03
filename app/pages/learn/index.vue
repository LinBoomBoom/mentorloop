<template>
  <div>
    <h1 class="text-2xl font-extrabold mb-1">学习中心</h1>
    <p class="text-muted text-sm mb-6">选择方向，按章节系统学习，完成打卡解锁下一章。</p>

    <NuxtLink to="/learn/path" class="card flex items-center gap-3 p-4 mb-6 border border-brand-coral/30 bg-brand-coral/5 reveal hover:-translate-y-0.5 transition">
      <span class="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral flex items-center justify-center shrink-0"><Icon name="compass" :size="20" /></span>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-sm">AI 个性化学习路径 <span class="chip bg-brand-coral/15 text-brand-coral !ml-1">VIP</span></div>
        <div class="text-xs text-muted truncate">基于你的模拟考试薄弱点，由大模型定制专属进阶路线</div>
      </div>
      <Icon name="arrowRight" :size="18" class="text-muted shrink-0" />
    </NuxtLink>

    <div v-if="!modules" class="grid md:grid-cols-3 gap-5 stagger"><div v-for="i in 3" :key="i" class="card h-48 shimmer"></div></div>

    <div v-else class="grid md:grid-cols-3 gap-5 stagger">
      <NuxtLink v-for="m in modules" :key="m.id" :to="`/learn/${m.id}`"
                class="card p-6 hover:-translate-y-1 transition cursor-pointer group reveal">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-soft" :style="{ background: m.color }">
          <Icon name="layers" :size="24" />
        </div>
        <h3 class="font-bold text-lg">{{ m.name }}</h3>
        <p class="text-sm text-muted mt-1.5 line-clamp-2 min-h-[40px]">{{ m.desc }}</p>
        <div class="flex gap-2 mt-4 text-xs">
          <span class="chip" :style="{ background: m.color + '1a', color: m.color }">{{ m.chapterCount }} 章</span>
          <span class="chip bg-ink/5 text-sub">{{ m.sectionCount }} 节</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data } = await useFetch('/api/modules')
const modules = computed(() => data.value?.modules || null)

useSeoMeta({
  title: '学习中心',
  description: '前端、后端、运维三大方向系统学习路径，按章节循序渐进，完成打卡解锁进阶内容。',
  ogTitle: '学习中心 · MentorLoop',
  ogDescription: '三方向系统学习路径，免费浏览全部课程章节。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
</script>
