<template>
  <NuxtLayout name="default">
    <div class="min-h-[60vh] flex items-center justify-center px-4">
      <div class="card p-8 md:p-12 max-w-lg w-full text-center reveal">
        <div class="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center text-white mx-auto mb-6 shadow-glow">
          <Icon name="alertTriangle" :size="32" />
        </div>
        <h1 class="text-4xl font-extrabold gradient-text mb-2">{{ statusCode }}</h1>
        <p class="text-lg font-bold mb-2">{{ title }}</p>
        <p class="text-sm text-muted mb-8 leading-relaxed">{{ message }}</p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button class="btn btn-primary" @click="handleError"><Icon name="arrowLeft" :size="16" /> 返回首页</button>
          <NuxtLink to="/exam" class="btn btn-ghost">去模拟答卷</NuxtLink>
          <NuxtLink to="/interview" class="btn btn-ghost">去面试题库</NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const props = defineProps({ error: { type: Object, required: true } })
const statusCode = computed(() => props.error?.statusCode || 500)
const title = computed(() => statusCode.value === 404 ? '页面未找到' : '出错了')
const message = computed(() => {
  if (statusCode.value === 404) return '你访问的页面不存在或已被移除。可以返回首页，或去题库、试卷页继续学习。'
  return props.error?.message || '服务器暂时遇到一点问题，请稍后再试。'
})
function handleError() {
  clearError({ redirect: '/' })
}
useSeoMeta({
  title: computed(() => `${statusCode.value} · MentorLoop`),
  description: '页面访问异常，返回 MentorLoop 首页继续学习。'
})
</script>
