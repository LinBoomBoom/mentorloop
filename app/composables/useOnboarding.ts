// 桌面端首启引导状态桥：仅在 Electron 桌面端（window.mentorLoop.isDesktop）生效；
// Web 端 window.mentorLoop 不存在 → 跳过，绝不影响 Web 体验。
import { ref } from 'vue'

// 模块级单例：保证弹窗组件与组合式共享同一状态。
const showOnboarding = ref(false)
let initialized = false

export function useOnboarding() {
  async function init() {
    if (initialized) return
    initialized = true
    const bridge = (window as any).mentorLoop
    if (!bridge?.isDesktop || typeof bridge.isFirstLaunch !== 'function') return
    try {
      const first = await bridge.isFirstLaunch()
      if (first) showOnboarding.value = true
    } catch {
      /* 桥不可用时静默跳过，不阻断首屏 */
    }
  }

  async function finish() {
    const bridge = (window as any).mentorLoop
    try {
      await bridge?.completeOnboarding?.()
    } catch {
      /* 即使写标记失败也允许关闭，避免卡死在引导页 */
    }
    showOnboarding.value = false
  }

  return { showOnboarding, init, finish }
}
