/** @type {import('tailwindcss').Config} */
export default {
  // 让 Tailwind utilities 在 #__nuxt 作用域内带 !important，覆盖 antd cssinjs 注入的 .hash a { color: brand } 等高优先级全局规则
  important: '#__nuxt',
  content: [
    './app/**/*.{vue,js,ts,jsx,tsx}',
    './server/**/*.{js,ts}',
    './pages/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 日落暖色品牌色（UI 审计 P5：coral 改为主题感知变量，浅色更深、深色更亮，提升对比度）
        brand: {
          coral: 'rgb(var(--brand-coral) / <alpha-value>)',
          pink: '#be185d',   /* 加深到 pink-700：白字压其上 4.7:1 过 AA，同时修复「选中项白字压浅粉」不可读 */
          gold: '#d97706',   /* 加深到 amber-600：金/奖杯/必会星等金色文字从 ~1.9:1 提升到可读 */
          deep: '#e11d48'
        },
        // 四方向主色
        track: {
          fe: '#ff5e7e', // 前端
          be: '#14b8a6', // 后端
          op: '#f59e0b', // 运维
          ai: '#8b5cf6' // AI 工程
        },
        // 语义令牌（随明暗主题切换，见 main.css 变量）
        ink: 'rgb(var(--ink) / <alpha-value>)',
        sub: 'rgb(var(--sub) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        canvas: 'rgb(var(--canvas) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        soft: '0 22px 55px -22px rgba(225, 29, 72, 0.25)',
        card: '0 2px 8px rgba(60, 45, 40, 0.05), 0 14px 36px -14px rgba(60, 45, 40, 0.14)',
        glow: '0 0 36px -10px rgba(225, 29, 72, 0.4)'
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem'
      },
      keyframes: {
        aurora: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(6%, -8%) scale(1.15)' },
          '66%': { transform: 'translate(-7%, 5%) scale(0.95)' }
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        aurora: 'aurora 18s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        fadeUp: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        reveal: 'reveal 0.7s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.6s infinite'
      }
    }
  },
  plugins: []
}
