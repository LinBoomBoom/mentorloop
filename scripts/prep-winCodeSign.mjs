// prep-winCodeSign.mjs
// ----------------------------------------------------------------------------
// 预置 electron-builder 的 winCodeSign 缓存，绕过 Windows 无符号链接权限时的打包死结。
//
// 背景：
//   electron-builder 在打包 Windows NSIS 时需要 winCodeSign 工具包（内含 rcedit / signtool）。
//   它通过 app-builder(Go) 下载 winCodeSign-<ver>.7z 并用 7za 解包。但该 7z 内含两条
//   macOS 软链接（darwin/10.12/lib/libcrypto.dylib、libssl.dylib），而 electron-builder
//   硬编码的 7za 解包参数是 `7za x -snld`（即“按软链接创建”）。在【未开启开发者模式、且
//   非管理员】的 Windows 上，CreateSymbolicLink 会失败（"客户端没有所需的特权"），导致
//   解包抛错、winCodeSign 永远下载不全、electron:build 卡死重试、release/ 永不产生。
//
//   标准解法（需用户手动操作）：开启 Windows“开发者模式”或“以管理员身份运行”。
//   本脚本提供**免管理员/免开发者模式**的自动解法：把 winCodeSign 解包成一份完整副本
//   预置到 electron-builder 缓存目录（缓存名 winCodeSign-<ver>）。electron-builder 检测到
//   该目录已存在后会直接复用、不再下载解包，从而绕开软链接死结。
//
//   解包用 `7za x -y`：软链接条目跳过（不创建），其余 Windows 工具（rcedit/signtool 等）
//   正常解出；再把两条 .dylib 软链接的“占位空文件”替换成真实目标文件的拷贝，使目录完整。
//   这两条 .dylib 是 macOS 文件，Windows 打包本就用不到，仅作目录完整性补齐。
// ----------------------------------------------------------------------------
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)

const VERSION = '2.6.0' // 与 electron-builder 25.x 默认依赖一致；如升级 electron-builder 需同步
const NAME = `winCodeSign-${VERSION}`
const mirror =
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR ||
  'https://npmmirror.com/mirrors/electron-builder-binaries/'
const url = `${mirror}winCodeSign-${VERSION}/winCodeSign-${VERSION}.7z`

const cacheBase =
  process.env.ELECTRON_BUILDER_CACHE ||
  path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache')
const cacheDir = path.join(cacheBase, 'winCodeSign')
const dest = path.join(cacheDir, NAME)

function log(msg) {
  console.log(`[prep-winCodeSign] ${msg}`)
}

function arch7z() {
  if (process.arch === 'ia32') return 'ia32'
  if (process.arch === 'arm64') return 'arm64'
  return 'x64'
}

export async function prepWinCodeSign() {
  if (fs.existsSync(dest)) {
    log(`缓存已存在 ${dest}，跳过预置`)
    return
  }
  fs.mkdirSync(cacheDir, { recursive: true })

  // 1) 定位 7za
  const sevenZip = path.join(root, 'node_modules', '7zip-bin', 'win', arch7z(), '7za.exe')
  if (!fs.existsSync(sevenZip)) {
    log(`未找到 7za（${sevenZip}），跳过预置；若 electron:build 卡在 winCodeSign，请开启开发者模式或以管理员运行`)
    return
  }

  // 2) 下载 .7z（一次性，需联网；离线则退回 electron-builder 默认行为）
  const tmp7z = path.join(cacheDir, `${NAME}.7z`)
  log(`下载 winCodeSign 工具包：${url}`)
  try {
    const res = await downloadFile(url, tmp7z)
    if (!res) {
      log(`下载失败，跳过预置（electron:build 将使用默认逻辑）`)
      return
    }
  } catch (e) {
    log(`下载异常：${e.message}；跳过预置`)
    return
  }

  // 3) 解包：跳过软链接（-y），其余正常
  log(`解包到 ${dest}（跳过 macOS 软链接，无需符号链接权限）`)
  const r = spawnSync(sevenZip, ['x', '-y', tmp7z, `-o${dest}`], { stdio: 'ignore' })
  if (r.status !== 0) {
    log(`解包返回非零(${r.status})，但 -y 下软链接失败已被容忍；继续补齐`)
  }

  // 4) 把两条 .dylib 软链接占位替换为真实目标拷贝（darwin 文件，Windows 用不到，仅保完整）
  const libDir = path.join(dest, 'darwin', '10.12', 'lib')
  for (const [link, target] of [
    ['libcrypto.dylib', 'libcrypto.1.0.0.dylib'],
    ['libssl.dylib', 'libssl.1.0.0.dylib'],
  ]) {
    const lp = path.join(libDir, link)
    const tp = path.join(libDir, target)
    if (fs.existsSync(tp) && fs.existsSync(lp) && fs.statSync(lp).size === 0) {
      fs.copyFileSync(tp, lp)
    }
  }

  // 5) 校验关键 Windows 工具存在
  const signtool = path.join(dest, 'windows-10', 'x64', 'signtool.exe')
  const rcedit = path.join(dest, 'rcedit-x64.exe')
  if (!fs.existsSync(signtool) || !fs.existsSync(rcedit)) {
    log(`警告：解包产物缺少关键工具（signtool.exe/rcedit-x64.exe），预置可能不完整`)
  } else {
    log(`预置完成：${dest}`)
  }
  // 清理临时 .7z
  try {
    fs.rmSync(tmp7z, { force: true })
  } catch {}
}

async function downloadFile(fileUrl, outPath) {
  const res = await fetch(fileUrl)
  if (!res.ok) {
    log(`HTTP ${res.status} ${res.statusText}`)
    return false
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(outPath, buf)
  return true
}

// 作为脚本直接运行时执行
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  prepWinCodeSign().then(
    () => process.exit(0),
    (e) => {
      console.error('[prep-winCodeSign] 预置失败（非致命）：', e)
      process.exit(0)
    },
  )
}
