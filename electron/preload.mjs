// Electron 预加载脚本：在渲染进程加载前，安全地暴露桌面专属 API 到 window.mentorLoop。
// 渲染进程（Nuxt 前端）默认无 Node 权限，所有系统能力都经此桥 + IPC 转发到主进程。
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('mentorLoop', {
  isDesktop: true,
  openExternal: (url) => ipcRenderer.invoke('mentorLoop:openExternal', url),
  showOpenDialog: (opts) => ipcRenderer.invoke('mentorLoop:showOpenDialog', opts),
  getVersion: () => ipcRenderer.invoke('mentorLoop:getVersion'),
  getPath: (name) => ipcRenderer.invoke('mentorLoop:getPath', name),
})
