<template>
  <div class="min-h-screen">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// 根组件：SPA 渲染，主题由 nuxt.config 中的内联脚本在首屏前确定
useHead({ titleTemplate: '%s · MentorLoop' })
// OG 分享图：优先用部署域名 SITE_URL（生产正确绝对地址），本地开发回退到请求 host
let ogOrigin = (process.env.SITE_URL as string) || ''
if (!ogOrigin) { try { const u = useRequestURL(); ogOrigin = u.protocol + '//' + u.host } catch (e) { /* prerender 无 event */ } }
if (!ogOrigin) ogOrigin = 'https://mentorloop.example.com'
useHead({ meta: [{ property: 'og:image', content: ogOrigin + '/og-cover.png' }] })
// 注意：登录态恢复「不可」在此处（setup 会随 SSR 一起在服务端执行）。
// 若在此 fire-and-forget 调用 auth.init()，其内部的异步 fetchMe 会在 HTML 已按「未登录」渲染后、
// 却在 Nuxt 序列化 __NUXT_DATA__ 之前 resolve，把 user+hydrated 写进 payload；
// 客户端据此首屏即「已登录」，与服务端 HTML（未登录）不符 → hydration mismatch。
// 因此登录态恢复统一放在 plugins/auth.client.ts 的 onNuxtReady（仅客户端、挂载后执行，不污染 payload）。
</script>
