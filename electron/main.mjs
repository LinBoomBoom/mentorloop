// Electron 主进程（MentorLoop 桌面端）。
//
// 运行模型（已与用户确认）：
// - 开发态（ELECTRON_DEV=1 或未打包）：直接加载 nuxt dev 的 http://localhost:3000，
//   这样前端改动仍享有 HMR，且无需先 build。
// - 生产态（打包后）：用**本机 Node 子进程**拉起 Nuxt 的 Nitro 服务入口
//   .output/server/index.mjs（监听 127.0.0.1:PORT），再由 BrowserWindow 加载同源地址。
//   选「系统 Node 子进程」而非 Electron 进程内 import，是为了避开 better-sqlite3 等
//   原生模块的 ABI 重建（无需 electron-rebuild）。打包时通过 extraResources 内置 node.exe，
//   目标机无需另行安装 Node（见 resolveNodeBin）。
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

// 兜底占位页：当 electron/splash.html 缺失或损坏时启用，确保窗口立即可见、永不纯黑。
const FALLBACK_LOADING_HTML =
  '<html><body style="font-family:sans-serif;background:#0f0f12;color:#e5e7eb;' +
  'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;gap:12px">' +
  '<div style="width:34px;height:34px;border:3px solid #2a2a30;border-top-color:#ff5e7e;border-radius:50%;animation:spin 1s linear infinite"></div>' +
  '<h3 style="margin:0;font-weight:600">MentorLoop</h3>' +
  '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>' +
  '</body></html>'

// 读取品牌化启动屏并注入版本号，返回 data URL（无需外部资源，加载最稳定）。
function buildSplashUrl() {
  const splashPath = path.join(__dirname, 'splash.html')
  try {
    let html = fs.readFileSync(splashPath, 'utf-8')
    const version = app.getVersion() || ''
    if (version) {
      html = html.replace(
        '<div class="version" id="version"></div>',
        `<div class="version" id="version">v${version}</div>`
      )
    }
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
  } catch (e) {
    console.error('[electron] splash.html 读取失败，使用兜底占位页：', e?.message)
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(FALLBACK_LOADING_HTML)
  }
}

async function showLoading(win) {
  try {
    await win.loadURL(buildSplashUrl())
  } catch (e) {
    console.error('[electron] 加载启动页失败，改用 about:blank：', e?.message)
    try { await win.loadURL('about:blank') } catch { /* ignore */ }
  }
  if (!win.isVisible()) win.show()
}

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

// 打包态优先用内置 node（resources/extraResources/node.exe），目标机无需安装 Node；
// 未打包（dev）或内置缺失时回退系统 node / MENTORLOOP_NODE_BIN。
function resolveNodeBin() {
  if (app.isPackaged) {
    const bundled = path.join(process.resourcesPath, 'extraResources', 'node.exe')
    if (fs.existsSync(bundled)) return bundled
  }
  return process.env.MENTORLOOP_NODE_BIN || 'node'
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
  // 用静态资源 _payload.json 做健康探针：它是构建产物必带的静态文件，不依赖 SSR 渲染，
  // 可避免「服务刚起来、首屏 SSR 仍在建库/预热」时偶发空响应导致窗口纯黑。
  const probe = url.replace(/\/$/, '') + '/_payload.json'
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(probe)
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
  // 路径断言：打包后 .output 必须落在真实磁盘（resources/.output），否则 node 子进程读不到入口会静默失败。
  if (!fs.existsSync(serverEntry)) {
    console.error('[electron] Nitro 服务入口缺失：', serverEntry)
    dialog.showErrorBox(
      '内置服务入口缺失',
      `找不到 Nitro 服务入口：\n${serverEntry}\n\n请确认安装包完整（.output 未被正确打包到真实磁盘）。`
    )
    return
  }
  const dataDir = path.join(app.getPath('userData'), 'mentorloop-data')
  fs.mkdirSync(path.join(dataDir, 'data'), { recursive: true })

  const seedSrc = path.join(dir, 'data', 'seed-content.json')
  const seedDst = path.join(dataDir, 'data', 'seed-content.json')
  if (fs.existsSync(seedSrc) && !fs.existsSync(seedDst)) {
    fs.copyFileSync(seedSrc, seedDst)
  }

  const nodeBin = resolveNodeBin()
  // cwd 必须为 resourcesPath（打包态）/ 项目根（dev 态），保证子进程能从真实磁盘解析 node_modules。
  serverProcess = spawn(nodeBin, [serverEntry], {
    cwd: dir,
    env: {
      ...process.env,
      PORT,
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      NODE_ENV: 'production',
      // TTS 纯云端方案（2026-08-18 拍板）：安装包不打 Piper（省约 219MB），
      // 语音统一走阿里云 CosyVoice；key 在 nuxt build 时经 runtimeConfig 烘焙进 .output，
      // 服务端 speech.ts 经 useRuntimeConfig().dashscopeApiKey 读取，无需再注入密钥。
      TTS_PROVIDER: 'aliyun',
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
    // 先显示品牌化启动屏，再轮询 dev 服务；失败时有 buildSplashUrl 内部兜底。
    await showLoading(win)
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
  await showLoading(win)
  await startLocalServer()
  const ok = await waitForServer(PROD_URL)
  if (ok) {
    try { return await win.loadURL(PROD_URL) } catch (e) {
      console.error('[electron] 加载生产应用失败：', e?.message)
    }
  }
  dialog.showErrorBox(
    '本地服务启动失败',
    `无法在 ${PROD_URL} 启动内置 Nitro 服务。\n请确认安装包完整（内置 node 缺失或 better-sqlite3 原生模块异常），并重试。`
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
