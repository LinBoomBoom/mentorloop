// 运行时检测当前是否运行在 Electron 桌面端，并暴露安全的「打开外部链接」助手。
// 与 Web 端完全共用同一份前端代码：Web 下 window.mentorLoop 不存在，自动回退到 window.open。
import { computed } from 'vue'

// SSR 阶段返回 false、客户端返回 true。当前仅用于 openExternal() 逻辑分支，无 DOM 差异，安全。
// 注意：若将来用此 computed 做「桌面专属 UI」条件渲染，SSR=false / 客户端=true 会触发 hydration
// mismatch；届时需要用 process.client 包裹或在 onMounted 之后判定，不要在模板里直接据此切换 DOM。
const isDesktop = computed(
  () => typeof window !== 'undefined' && !!(window as Window & typeof globalThis).mentorLoop
)

export function useIsDesktop() {
  return isDesktop
}

export async function openExternal(url: string) {
  if (isDesktop.value && window.mentorLoop) {
    await window.mentorLoop.openExternal(url)
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
