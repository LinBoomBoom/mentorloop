// 构建期把运行构建的 node 二进制复制进 extraResources/，供 electron-builder 打包进
// 安装包的 resources/extraResources/node.exe。这样分发后的桌面端无需目标机安装 Node。
//
// 关键：ABI 必须一致。better-sqlite3 的 prebuild 在 `npm i` 时按当时 Node 的 ABI 选定，
// 因此「运行本脚本的 node」必须与「运行 npm i 的 node」同大版本（通常就是同一个 PATH node）。
// 若你用 nvm 切换过 node，请确保 build 与 install 用同一版本。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destDir = path.join(root, 'extraResources')
const dest = path.join(destDir, 'node.exe')
const src = process.execPath

// 仅当构建由 node 驱动时打包（process.execPath 指向 node.exe）。
// 若被 electron 拉起则跳过，避免把 electron.exe 当 node 打进去（路径错乱）。
if (!/node(\.exe)?$/i.test(path.basename(src))) {
  console.warn('[bundle-node] 跳过：当前 execPath 不是 node（' + src + '）')
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })

if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) {
  console.log('[bundle-node] node.exe 已是最新，跳过复制')
} else {
  fs.copyFileSync(src, dest)
  const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1)
  console.log(`[bundle-node] 已内置 node -> ${dest} (${mb}MB, ABI node ${process.versions.node})`)
}
