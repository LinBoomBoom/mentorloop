// 桌面端 Electron API 的全局类型声明（仅类型，无运行时依赖）。
// 由 electron/preload.mjs 经 contextBridge 注入到 window.mentorLoop。
// 注：此处用本地最小接口而非 import 'electron' 的类型，避免前端构建意外耦合 electron 类型依赖。
export interface OpenDialogOptionsLike {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: { name: string; extensions: string[] }[]
  properties?: string[]
  message?: string
}
export interface MentorLoopDesktopApi {
  isDesktop: true
  openExternal: (url: string) => Promise<void>
  showOpenDialog: (opts: OpenDialogOptionsLike) => Promise<unknown>
  getVersion: () => Promise<string>
  getPath: (name: string) => Promise<string>
}

declare global {
  interface Window {
    mentorLoop?: MentorLoopDesktopApi
  }
}

export {}
