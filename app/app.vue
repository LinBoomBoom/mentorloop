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
// 启动时经 HttpOnly Cookie 恢复登录态（含 role），刷新后管理员/会员身份不丢失
const auth = useAuthStore()
auth.init()
</script>
