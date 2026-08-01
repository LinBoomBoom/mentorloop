/** @type {import('tailwindcss').Config} */
export default {
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
        // 日落暖色品牌色
        brand: {
          coral: '#ff5e7e',
          pink: '#ff8a5c',
          gold: '#ffc24b',
          deep: '#ff4d6d'
        },
        // 三方向主色
        track: {
          fe: '#ff5e7e', // 前端
          be: '#14b8a6', // 后端
          op: '#f59e0b' // 运维
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
        sans: ['Sora', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(255, 94, 126, 0.25)',
        card: '0 8px 30px -10px rgba(15, 23, 42, 0.18)',
        glow: '0 0 40px -8px rgba(255, 138, 92, 0.5)'
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
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
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
