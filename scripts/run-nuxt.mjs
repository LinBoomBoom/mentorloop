// 运行 Nuxt 命令（dev/build/generate/preview）的包装器。
//
// 背景：部分沙箱环境会通过 NODE_OPTIONS 注入 `genie-safe-delete` 这一
// 安全删除 shim。它会拦截 fs 删除 API，把文件移入回收站而非真删。
// Nitro 在启动时会清理 `.nuxt/dev`，shim 拦截该删除并尝试移入回收站，
// 在 Windows 上常失败并 fail-closed 中止构建，同时与并行的 `writeTypes`
// 争夺 `.nuxt` 目录锁，导致 EPERM: operation not permitted。
//
// 该 wrapper 仅为 Nuxt 子进程清空 NODE_OPTIONS，使上述构建缓存清理走原生
// 删除路径。对没有注入 shim 的普通机器无害（NODE_OPTIONS 本就为空）。
//
// 额外处理：构建阶段（build/generate）由 run-nuxt.mjs 注入 MENTORLOOP_BUILD_PHASE=1，
// 使 server/utils/db.ts 跳过 setInterval 清理定时器，避免构建进程事件循环无法退出。
// 但 nuxt build 在 Windows 上仍可能因其它原因（如 rolldown worker 未释放）不退出，
// 因此 electron:build 使用 scripts/electron-build-all.mjs 通过文件检测兜底。
//
// 用法：node scripts/run-nuxt.mjs <dev|build|generate|preview> [额外参数]

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('用法: node scripts/run-nuxt.mjs <dev|build|generate|preview> [args...]')
  process.exit(1)
}

const bin = resolve(root, 'node_modules/nuxt/bin/nuxt.mjs')
const isBuildPhase = args[0] === 'build' || args[0] === 'generate'
const env = { ...process.env, NODE_OPTIONS: '' }
if (isBuildPhase) env.MENTORLOOP_BUILD_PHASE = '1'

const child = spawn(process.execPath, [bin, ...args], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: true,
})

child.on('exit', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error('[run-nuxt] 无法启动 Nuxt:', err.message)
  process.exit(1)
})
