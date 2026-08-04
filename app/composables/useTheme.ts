import { onMounted } from 'vue'

// 明暗主题切换（首屏由 nuxt.config 内联脚本预置，避免闪烁）
export const useTheme = () => {
  // 初始值固定为 false，与 SSR（无 document）保持一致；挂载后再读取真实主题，
  // 避免 SSR 渲染月亮图标、客户端渲染太阳图标导致的 hydration 不匹配。
  const isDark = ref(false)
  onMounted(() => {
    if (typeof document !== 'undefined') {
      isDark.value = document.documentElement.classList.contains('dark')
    }
  })
  const toggle = () => {
    isDark.value = !isDark.value
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('dm-theme', isDark.value ? 'dark' : 'light')
    }
  }
  return { isDark, toggle }
}
