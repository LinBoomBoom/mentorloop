// Electron 主进程（MentorLoop 桌面端）。
//
// 运行模型（已与用户确认）：
// - 开发态（ELECTRON_DEV=1 或未打包）：直接加载 nuxt dev 的 http://localhost:3000，
//   这样前端改动仍享有 HMR，且无需先 build。
// - 生产态（打包后）：用**本机 Node 子进程**拉起 Nuxt 的 Nitro 服务入口
//   .output/server/index.mjs（监听 127.0.0.1:PORT），再由 BrowserWindow 加载同源地址。
//   选「系统 Node 子进程」而非 Electron 进程内 import，是为了避开 better-sqlite3 等
//   原生模块的 ABI 重建（无需 electron-rebuild）。代价：最终分发的桌面端要求用户机装有 Node。
//
// 桌面专属能力（首期 + 后续可选）：
// - 系统托盘（Tray）：最小化到托盘 / 双击恢复 / 退出。
// - 原生应用菜单（Menu）：刷新 / 开发者工具 / 打开数据目录 / 关于 / 退出。
// - 能力桥（preload 经 contextBridge 暴露 window.mentorLoop）：打开外链 / 原生对话框 / 版本 / 路径。
import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged || process.env.ELECTRON_DEV === '1'
const DEV_URL = 'http://localhost:3000'
const PORT = process.env.MENTORLOOP_PORT || '3210'
const PROD_URL = `http://127.0.0.1:${PORT}`

let mainWindow = null
let serverProcess = null
let tray = null
let isQuiting = false

// 路径解析：打包态用 process.resourcesPath（asar 解包后的真实磁盘根，即 resources/），
// dev 态用 app.getAppPath()（项目根）。开启 asar 后 .output / node_modules / data 经
// asarUnpack 落到真实磁盘，必须从 resourcesPath 解析，否则打包后子进程读不到服务入口。
function baseDir() {
  return app.isPackaged ? process.resourcesPath : app.getAppPath()
}
function resolveAppFile(rel) {
  return path.join(baseDir(), rel)
}

// 1x1 透明 PNG，作为托盘图标兜底（正常情况使用 build/icon.png）。
const FALLBACK_ICON = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)
function trayIcon() {
  const p = resolveAppFile('build/icon.png')
  return fs.existsSync(p) ? p : nativeImage.createFromBuffer(FALLBACK_ICON)
}

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    // 关键：直接 show:true，保证窗口一定可见。
    // 旧逻辑用 show:false + ready-to-show —— 一旦 loadURL 异常导致首帧未提交，
    // ready-to-show 永不触发，窗口永久隐藏（留下看不见的 electron 进程）。
    show: true,
    backgroundColor: '#0f0f12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  win.once('ready-to-show', () => win.show())
  // 兜底：无论如何 2s 后强制显示，彻底杜绝「窗口创建了但不出现」。
  setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      console.error('[electron] 兜底强制显示窗口（ready-to-show 未触发）')
      win.show()
    }
  }, 2000)
  // 关闭窗口改为「最小化到托盘」，仅在真正退出（isQuiting）时才销毁。
  win.on('close', (e) => {
    if (!isQuiting) {
      e.preventDefault()
      win.hide()
    }
  })
  win.on('closed', () => { mainWindow = null })
  return win
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch { /* 服务还没起来，继续等 */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

// 把种子文件拷进用户数据目录（首次运行），服务端据此建库/迁移；DB/TTS/日志均落在 DATA_DIR 下。
async function startLocalServer() {
  const dir = baseDir()
  const serverEntry = path.join(dir, '.output', 'server', 'index.mjs')
  const dataDir = path.join(app.getPath('userData'), 'mentorloop-data')
  fs.mkdirSync(path.join(dataDir, 'data'), { recursive: true })

  const seedSrc = path.join(dir, 'data', 'seed-content.json')
  const seedDst = path.join(dataDir, 'data', 'seed-content.json')
  if (fs.existsSync(seedSrc) && !fs.existsSync(seedDst)) {
    fs.copyFileSync(seedSrc, seedDst)
  }

  const nodeBin = process.env.MENTORLOOP_NODE_BIN || 'node'
  // cwd 必须为 resourcesPath（打包态）/ 项目根（dev 态），保证子进程能从真实磁盘解析 node_modules。
  serverProcess = spawn(nodeBin, [serverEntry], {
    cwd: dir,
    env: {
      ...process.env,
      PORT,
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  serverProcess.stdout.on('data', (d) => console.log('[nitro]', d.toString().trim()))
  serverProcess.stderr.on('data', (d) => console.error('[nitro]', d.toString().trim()))
  serverProcess.on('exit', (code) => {
    if (code && code !== 0) console.error('[nitro] server exited with code', code)
  })
}

async function loadApp(win) {
  if (isDev) {
    // 先尝试加载一个本地 loading 占位页（data URL 失败也能兜底），确保窗口立即可见。
    const loadingHtml =
      '<html><body style="font-family:sans-serif;background:#0f0f12;color:#e5e7eb;' +
      'display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
      '<h3>正在启动本地开发服务…<br><small style="opacity:.6">http://localhost:3000</small></h3>' +
      '</body></html>'
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml))
    } catch (e) {
      console.error('[electron] loading 占位页加载失败，改用 about:blank 兜底：', e?.message)
      try { await win.loadURL('about:blank') } catch { /* ignore */ }
    }
    if (!win.isVisible()) win.show() // 双保险：loading 或兜底层都把窗口亮出来
    console.log('[electron] 轮询 dev 服务', DEV_URL, '（最长 120s）')
    const ok = await waitForServer(DEV_URL, 120000) // dev 首启较慢，放宽到 120s
    if (ok) {
      console.log('[electron] dev 服务就绪，加载', DEV_URL)
      try { await win.loadURL(DEV_URL) } catch (e) {
        console.error('[electron] 加载 dev 应用失败：', e?.message)
      }
      return
    }
    console.error('[electron] 120s 内 dev 服务未就绪')
    dialog.showErrorBox('开发服务器未就绪', '请在终端运行 `npm run dev` 确认 nuxt dev 能正常启动（检查 3000 端口 / 依赖是否完整）。')
    return
  }
  await startLocalServer()
  const ok = await waitForServer(PROD_URL)
  if (ok) {
    try { return await win.loadURL(PROD_URL) } catch (e) {
      console.error('[electron] 加载生产应用失败：', e?.message)
    }
  }
  dialog.showErrorBox(
    '本地服务启动失败',
    `无法在 ${PROD_URL} 启动内置 Nitro 服务。\n请确认本机已安装 Node.js（版本需与构建时一致，当前基于 Node ${process.versions.node} ABI），并重试。`
  )
}

function createTray(win) {
  tray = new Tray(trayIcon())
  tray.setToolTip('MentorLoop')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 MentorLoop', click: () => showWindow() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuiting = true; app.quit() } },
  ]))
  tray.on('click', () => showWindow())
  tray.on('double-click', () => showWindow())
}

function createAppMenu(win) {
  const template = []
  // macOS 应用菜单（关于 / 隐藏 / 退出）
  if (process.platform === 'darwin') {
    template.push({
      label: app.name || 'MentorLoop',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }
  template.push({
    label: '视图',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
    ],
  })
  template.push({
    label: '帮助',
    submenu: [
      {
        label: '打开数据目录',
        click: async () => {
          const p = path.join(app.getPath('userData'), 'mentorloop-data')
          await shell.openPath(p)
        },
      },
      {
        label: '关于 MentorLoop',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: '关于 MentorLoop',
            message: `MentorLoop 桌面端 v${app.getVersion()}\n数据目录：${path.join(app.getPath('userData'), 'mentorloop-data')}`,
          })
        },
      },
    ],
  })
  // Windows / Linux 在顶部加「文件」菜单承载退出（macOS 已含在应用菜单）。
  if (process.platform !== 'darwin') {
    template.unshift({ label: '文件', submenu: [{ role: 'quit' }] })
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function bootWindow() {
  console.log('[electron] 创建主窗口…')
  const win = createWindow()
  mainWindow = win
  try {
    createTray(win)
    createAppMenu(win)
    await loadApp(win)
  } catch (e) {
    console.error('[electron] bootWindow 异常（窗口仍会保留可见）：', e)
    if (!win.isVisible()) win.show()
  }
  return win
}

// ---- 桌面专属能力桥（preload 经 contextBridge 暴露给渲染进程） ----
ipcMain.handle('mentorLoop:openExternal', (_e, url) => {
  const u = String(url || '')
  // 仅放行 http/https，避免 file:// 等协议被滥用（Electron 安全基线）。
  if (!/^https?:\/\//i.test(u)) return
  shell.openExternal(u)
})
ipcMain.handle('mentorLoop:showOpenDialog', (_e, opts) => dialog.showOpenDialog(opts))
ipcMain.handle('mentorLoop:getVersion', () => app.getVersion())
ipcMain.handle('mentorLoop:getPath', (_e, name) => app.getPath(name))

// 真正退出前先杀掉 Nitro 子进程，避免残留监听端口。
app.on('before-quit', () => { isQuiting = true })
app.on('will-quit', () => {
  if (serverProcess) { try { serverProcess.kill() } catch { /* ignore */ } }
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.log('[electron] 已有实例在运行，退出当前实例（聚焦已有窗口）')
  app.quit()
} else {
  app.on('second-instance', () => showWindow())
  app.whenReady().then(() => {
    console.log('[electron] app ready，启动窗口')
    return bootWindow()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) bootWindow()
  })
  // 关闭所有窗口后留在托盘，不退出（由托盘/菜单的「退出」触发 app.quit）。
  app.on('window-all-closed', () => { /* keep running in tray */ })
}
