// 全局 SEO 增强：把 nuxt.config 中配置的相对 og:image 补成绝对 URL，
// 确保社交分享卡片（微信、Twitter、LinkedIn、飞书等）能正确抓取封面图。
// 优先读取 .env 注入的 SITE_URL；未配置时回退到当前请求 origin。
export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig().public
  let origin = cfg.siteUrl as string

  if (!origin) {
    if (import.meta.server) {
      try {
        origin = useRequestURL().origin
      } catch {
        origin = ''
      }
    } else {
      origin = window.location.origin
    }
  }

  if (!origin) return

  const ogImage = `${origin}/og-cover.png`

  useHead({
    meta: [
      { property: 'og:image', content: ogImage },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:alt', content: 'MentorLoop · 学面一体 · 智能导师' },
      { name: 'twitter:image', content: ogImage },
      { name: 'twitter:image:alt', content: 'MentorLoop · 学面一体 · 智能导师' }
    ]
  })
})
