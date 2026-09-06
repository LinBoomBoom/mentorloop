// 生产构建入口：版本号自动 +1（固化机制）+ 单独 commit + 完整 electron 打包。
//
// 背景：用户要求「每次构建生产版本，版本号自动迭代 +1」，且「单独 commit 不与其他代码一起 commit」。
// 本脚本把版本号递增逻辑固化在生产构建入口，使后续每次跑 `node scripts/build-release.mjs`
// 都会 patch 段 +1 并用一个独立的 commit 记录，再走完整构建链路。
//
// 用法：
//   node scripts/build-release.mjs                          # 自动 patch+1、单独 commit、构建
//   SKIP_VERSION_BUMP=1 node scripts/build-release.mjs      # 本次不 bump（保持当前版本，用于首次/特殊发布）
//
// 设计要点：
// - 仅改写 package.json 的 `version` 字段（正则替换，保留文件其余内容），避免引入无关 diff。
// - bump 后只 `git add package.json` 再 commit，保证该提交只包含版本号变更，
//   即使工作区同时存在其他未提交改动也不会被混入（符合「单独 commit」要求）。
// - 构建本身复用成熟的 electron-build-all.mjs：make-icon → nuxt build（Windows 不退出兜底）
//   → bundle-node → electron-builder（国内镜像 + prepWinCodeSign）。
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const pkgPath = path.join(ROOT, 'package.json')
const SKIP_BUMP = process.env.SKIP_VERSION_BUMP === '1'

function run(cmd, args, opts = {}) {
  console.log(`\n[build-release] ▶ ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts })
  if (r.status !== 0) {
    console.error(`[build-release] 步骤失败，退出码 ${r.status}`)
    process.exit(r.status ?? 1)
  }
}

// ---- 1. 版本号 +1（patch）并单独 commit ----
if (!SKIP_BUMP) {
  const raw = readFileSync(pkgPath, 'utf8')
  const m = raw.match(/"version":\s*"(\d+)\.(\d+)\.(\d+)"/)
  if (!m) {
    console.error('[build-release] 无法解析 package.json 的 version 字段')
    process.exit(1)
  }
  const [full, maj, min, pat] = m
  const newV = `${maj}.${min}.${Number(pat) + 1}`
  writeFileSync(pkgPath, raw.replace(full, `"version": "${newV}"`))
  run('git', ['add', 'package.json'])
  run('git', ['commit', '-m', `chore(release): bump version to ${newV}`])
  console.log(`[build-release] version ${maj}.${min}.${pat} -> ${newV}（已单独提交）`)
} else {
  const cur = readFileSync(pkgPath, 'utf8').match(/"version":\s*"([^"]+)"/)[1]
  console.log(`[build-release] SKIP_VERSION_BUMP=1，保持当前版本 ${cur}`)
}

// ---- 2. 完整生产构建（electron-build-all.mjs 已含 nuxt build 兜底 + bundle-node + electron-builder）----
run(process.execPath, ['scripts/electron-build-all.mjs'], {
  env: { ...process.env, NODE_OPTIONS: '' },
})

console.log('\n[build-release] ✅ 生产构建完成。产物位于 release/')
