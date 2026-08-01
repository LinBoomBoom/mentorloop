// 明暗主题切换（首屏由 nuxt.config 内联脚本预置，避免闪烁）
export const useTheme = () => {
  const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  const toggle = () => {
    isDark.value = !isDark.value
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('dm-theme', isDark.value ? 'dark' : 'light')
    }
  }
  return { isDark, toggle }
}
