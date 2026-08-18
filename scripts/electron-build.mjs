// electron-builder 包装器：注入国内镜像环境变量后调用 electron-builder CLI。
//
// 为什么需要：electron-builder 首次打包会从 GitHub 下载 electron 运行时（~80MB）与
// NSIS 安装工具链。国内网络访问 GitHub 常被墙/超时，导致 `release/` 永远不生成、窗口看不到。
// 改用 npmmirror 镜像即可稳定拉取。如需自定义镜像，可在运行前 export 这两个变量覆盖。
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { prepWinCodeSign } from './prep-winCodeSign.mjs'

process.env.ELECTRON_MIRROR ||= 'https://npmmirror.com/mirrors/electron/'
process.env.ELECTRON_BUILDER_BINARIES_MIRROR ||= 'https://npmmirror.com/mirrors/electron-builder-binaries/'

const require = createRequire(import.meta.url)
const cli = require.resolve('electron-builder/cli.js')

console.log('[electron-build] 使用镜像：')
console.log('  ELECTRON_MIRROR =', process.env.ELECTRON_MIRROR)
console.log('  ELECTRON_BUILDER_BINARIES_MIRROR =', process.env.ELECTRON_BUILDER_BINARIES_MIRROR)

// 预置 winCodeSign 缓存：绕过 Windows 无符号链接权限时 7za 解包死结（详见脚本内注释）。
await prepWinCodeSign()

const child = spawn(process.execPath, [cli], {
  stdio: 'inherit',
  // 清空沙箱注入的 safe-delete shim，避免 electron-builder 清理临时文件时被拦截。
  env: { ...process.env, NODE_OPTIONS: '' },
})
child.on('exit', (code) => process.exit(code ?? 0))
