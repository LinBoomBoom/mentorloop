// 开发编排：一键同时拉起 nuxt dev（后台）与 electron（加载 localhost:3000，享 HMR）。
// 退出时清理两个子进程。生产打包请用 npm run electron:build。
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const nuxt = spawn(process.execPath, [path.join(root, 'scripts', 'run-nuxt.mjs'), 'dev'], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
  env: process.env,
})

// 用 require('electron') 拿到真正的可执行文件路径（Windows 为 electron.exe）。
// 不要直接 spawn node_modules/.bin/electron.cmd —— Windows 上 .cmd 不是可执行体，
// 无 shell 直接 spawn 会报 EINVAL。require('electron') 返回的就是二进制路径，跨平台可用。
let electronBin
try {
  electronBin = require('electron')
} catch {
  console.error('[electron-dev] 未找到 electron 模块，请先执行 `npm i` 安装 electron / electron-builder。')
  try { nuxt.kill() } catch { /* ignore */ }
  process.exit(1)
}

const electron = spawn(electronBin, [path.join(root, 'electron', 'main.mjs')], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, ELECTRON_DEV: '1' },
})
console.log('[electron-dev] Electron 已启动（PID ' + electron.pid + '），窗口应随后出现。')

function killAll() {
  try { nuxt.kill() } catch { /* ignore */ }
  try { electron.kill() } catch { /* ignore */ }
  process.exit(0)
}
process.on('SIGINT', killAll)
process.on('SIGTERM', killAll)
electron.on('exit', killAll)
// 注意：nuxt dev 若异常退出，不要静默 kill electron 并 process.exit —— 否则用户连窗口都看不到。
// 改为仅打印明确警告，保留 electron 窗口（它会显示 loading，并最终由 main.mjs 弹出「未就绪」提示）。
nuxt.on('exit', (code) => {
  console.error('[electron-dev] ⚠️ nuxt dev 进程已退出（code=' + code + '）。')
  console.error('[electron-dev] 请先单独运行 `npm run dev` 确认 nuxt dev 能正常启动；electron 窗口会停留并提示未就绪。')
})
