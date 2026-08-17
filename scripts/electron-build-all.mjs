// Electron 完整打包脚本。
//
// 为什么不用 npm script 的 && 链：
// nuxt build 在 Windows 上完成全部输出（.output/server/index.mjs 已生成）后，
// 事件循环可能仍有残留未释放（rolldown worker / better-sqlite3 等），导致子进程
// 不 exit。如果用 `&&` 链式执行，后续 bundle-node / electron-builder 永远不会运行。
//
// 本脚本通过轮询构建产物文件大小稳定来判断 nuxt build 实际完成，然后主动 kill
// 子进程，再继续后续步骤，保证 electron:build 能走完。
//
// 用法：node scripts/electron-build-all.mjs

import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const marker = path.join(root, '.output', 'server', 'index.mjs')
const markerPublic = path.join(root, '.output', 'public')
const BUILD_TIMEOUT_MS = 10 * 60 * 1000
const STABLE_MS = 3000
const STABLE_POLL_MS = 1000

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
      ...options,
    })
    child.on('exit', (code) => {
      if (code && code !== 0) reject(new Error(`命令退出码 ${code}: ${cmd} ${args.join(' ')}`))
      else resolve(code)
    })
    child.on('error', reject)
  })
}

async function waitForBuildOutput(child) {
  const start = Date.now()
  let lastSize = -1
  let lastSizeAt = 0
  let reported = false

  while (Date.now() - start < BUILD_TIMEOUT_MS) {
    if (child.exitCode !== null || child.signalCode !== null) {
      // 子进程自己退出了（正常情况）
      return true
    }

    if (fs.existsSync(marker)) {
      const stat = fs.statSync(marker)
      const size = stat.size
      if (size === lastSize) {
        if (Date.now() - lastSizeAt >= STABLE_MS) {
          if (!reported) {
            console.log(`[electron-build-all] 构建产物已稳定：${marker} (${size} bytes)，结束 nuxt build 子进程。`)
            reported = true
          }
          return true
        }
      } else {
        lastSize = size
        lastSizeAt = Date.now()
      }
    }

    await new Promise((r) => setTimeout(r, STABLE_POLL_MS))
  }

  throw new Error(`nuxt build 超过 ${BUILD_TIMEOUT_MS / 60000} 分钟未完成`)
}

function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' })
    } catch {
      try { child.kill('SIGKILL') } catch {}
    }
  } else {
    child.kill('SIGTERM')
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        try { child.kill('SIGKILL') } catch {}
      }
    }, 3000)
  }
}

async function main() {
  // 1. 生成图标
  console.log('[electron-build-all] 步骤 1/4：生成应用图标')
  await run(process.execPath, ['scripts/make-icon.mjs'])

  // 2. nuxt build（用 run-nuxt.mjs 包装器清空 NODE_OPTIONS + 注入 MENTORLOOP_BUILD_PHASE）
  console.log('[electron-build-all] 步骤 2/4：Nuxt build（产物检测兜底）')
  const env = { ...process.env, NODE_OPTIONS: '', MENTORLOOP_BUILD_PHASE: '1' }
  const nuxtChild = spawn(process.execPath, ['scripts/run-nuxt.mjs', 'build'], {
    cwd: root,
    env,
    stdio: 'inherit',
    windowsHide: true,
  })

  let buildOk = false
  try {
    buildOk = await waitForBuildOutput(nuxtChild)
  } finally {
    if (buildOk && nuxtChild.exitCode === null && nuxtChild.signalCode === null) {
      killTree(nuxtChild)
      // 等待子进程真正退出，避免后续步骤端口/文件锁冲突
      await new Promise((r) => {
        const timer = setInterval(() => {
          if (nuxtChild.exitCode !== null || nuxtChild.signalCode !== null) {
            clearInterval(timer)
            r()
          }
        }, 200)
        setTimeout(() => { clearInterval(timer); r() }, 5000)
      })
    }
  }

  if (!buildOk && nuxtChild.exitCode !== 0) {
    throw new Error('nuxt build 失败')
  }

  // 3. 内置 node.exe
  console.log('[electron-build-all] 步骤 3/4：复制 Node 二进制到 extraResources')
  await run(process.execPath, ['scripts/bundle-node.mjs'])

  // 4. electron-builder（带国内镜像）
  console.log('[electron-build-all] 步骤 4/4：electron-builder 打包')
  await run(process.execPath, ['scripts/electron-build.mjs'])

  console.log('[electron-build-all] 全部完成。')
}

main().catch((err) => {
  console.error('[electron-build-all] 失败:', err.message)
  process.exit(1)
})
