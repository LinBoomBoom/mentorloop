// MentorLoop - Nuxt 4 全栈工程化配置
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  // 默认开启 SSR（利于 SEO / 自然流量）。内容页公开可浏览，仅写操作（打卡/交卷/付费）才需登录。
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  // 按页面实际情况开启/关闭 SSR：内容公开，仅登录态相关的写操作才需鉴权
  routeRules: {
    // 公开落地页 + 列表页：开启 SSR 并预渲染为静态 HTML，最大化收录与自然流量
    '/login': { ssr: true, prerender: true },
    '/': { ssr: true, prerender: true },
    '/learn': { ssr: true, prerender: true },
    '/interview': { ssr: true, prerender: true },
    '/exam': { ssr: true, prerender: true },
    '/vip': { ssr: true, prerender: true },
    // 内容详情页：开启 SSR（按需服务端渲染，无需枚举预渲染）
    '/learn/**': { ssr: true },
    '/interview/**': { ssr: true },
    '/exam/**': { ssr: true }
  },
  tailwindcss: {
    configPath: '~/tailwind.config.js',
    cssPath: '~/assets/css/main.css'
  },
  app: {
    dir: {
      // Nuxt 4 静态资源目录：显式声明，确保 og-cover.png 等被复制进 .output 并由 Nitro 以 / 路径提供
      public: 'app/public'
    },
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: 'MentorLoop · 学面一体导师',
      titleTemplate: '%s · MentorLoop',
      meta: [
        { name: 'description', content: 'MentorLoop 是前端 / 后端 / 运维三方向的学习与面试一体化平台：系统学习路径、高频面试题库、模拟答卷与 AI 复盘，全部内容免费浏览。' },
        { property: 'og:site_name', content: 'MentorLoop' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap' }
      ],
      // 首屏前确定主题，避免明暗闪烁（FOUC）
      script: [
        {
          innerHTML:
            "try{var t=localStorage.getItem('dm-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}"
        }
      ]
    }
  },
  nitro: {
    // better-sqlite3 为原生模块，构建时需保持外部引用（dev 不受影响）
    externals: { inline: [] },
    // 显式声明静态资源目录，确保 og-cover.png 等被复制并由 Nitro 以 / 路径提供
    publicAssets: [
      { dir: 'app/public', baseURL: '/' }
    ]
  }
})
