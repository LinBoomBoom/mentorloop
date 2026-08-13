// 一键下载 Piper 离线神经网络 TTS 的二进制与中文模型到 data/piper/（不纳入版本库）。
// 用法：npm run setup:piper
// 说明：二进制来自 GitHub releases（rhasspy/piper 2023.11.14-2），中文模型来自 HuggingFace（rhasspy/piper-voices）。
//       全部离线可用，下载一次后永久生效，不依赖任何云服务。
//       注意：HuggingFace 在国内常被网络拦截，默认优先使用 hf-mirror.com 镜像；失败时回退官方源，并最终给出手动下载指引。
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataDir = path.join(root, 'data')
const piperDir = path.join(dataDir, 'piper')
const modelsDir = path.join(piperDir, 'models')

const VERSION = '2023.11.14-2'
const RELEASE_BASE = `https://github.com/rhasspy/piper/releases/download/${VERSION}`
// 中文模型：HUGGINGFACE 官方常被拦截，镜像列表按顺序尝试（国内优先 hf-mirror.com）。
const MODEL_MIRRORS = [
  'https://hf-mirror.com/rhasspy/piper-voices/resolve/main/zh/zh_CN',
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN'
]
// 中文模型（HF piper-voices，zh/zh_CN 下有限的几个神经网络嗓音）
const VOICES = [
  { base: 'zh_CN-huayan-medium', voice: 'huayan' },   // 女声·华嫣
  { base: 'zh_CN-xiao_ya-medium', voice: 'xiao_ya' }, // 女声·小雅
  { base: 'zh_CN-chaowen-medium', voice: 'chaowen' }  // 男声·朝文
]
const ONNX_MIN = 1_000_000       // onnx 至少 1MB 才算成功
const JSON_MIN = 100             // json 至少 100B 才算成功

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 可选：若设置了 HTTP(S)_PROXY，让 fetch 走代理（便于处于受限网络时使用）。
async function applyProxy() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy ||
                   process.env.HTTP_PROXY || process.env.http_proxy
  if (!proxyUrl) return
  try {
    const { ProxyAgent, setGlobalDispatcher } = await import('undici')
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
    console.log('ℹ 检测到代理，已为下载启用：' + proxyUrl)
  } catch {
    console.warn('⚠ 设置了代理但无法加载 undici ProxyAgent，下载将直连（可能失败）。')
  }
}

async function download(url, dest, label) {
  process.stdout.write(`  ↓ ${label} ... `)
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MentorLoop-piper-setup)' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`)
  const total = Number(res.headers.get('content-length') || 0)
  const file = fs.createWriteStream(dest)
  let got = 0
  if (res.body) {
    for await (const chunk of res.body) {
      file.write(chunk)
      got += chunk.length
      if (total) process.stdout.write(`\r  ↓ ${label} ... ${(got / 1e6).toFixed(1)}/${(total / 1e6).toFixed(1)} MB`)
    }
  }
  await new Promise((r) => file.end(r))
  process.stdout.write(`\n  ✓ ${label} (${(got / 1e6).toFixed(1)} MB)\n`)
}

// 依次尝试每个镜像源（每源重试 2 次），任一成功即返回。
async function downloadWithMirrors(relPath, dest, label) {
  let lastErr
  for (let i = 0; i < MODEL_MIRRORS.length; i++) {
    const base = MODEL_MIRRORS[i]
    const url = `${base}/${relPath}`
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await download(url, dest, `${label} [源${i + 1}]`)
        return
      } catch (e) {
        lastErr = e
        if (attempt < 2) { await sleep(800) }
      }
    }
  }
  throw lastErr || new Error('所有镜像源均失败')
}

function extract(assetPath, ext) {
  fs.mkdirSync(dataDir, { recursive: true })
  if (ext === 'zip') {
    if (process.platform === 'win32') {
      const code = spawnSync('powershell', ['-NoProfile', '-Command',
        `Expand-Archive -Force -Path "${assetPath}" -DestinationPath "${dataDir}"`], { stdio: 'inherit' }).status
      if (code !== 0) throw new Error('Expand-Archive 失败')
    } else {
      const code = spawnSync('unzip', ['-o', assetPath, '-d', dataDir]).status
      if (code !== 0) throw new Error('unzip 失败，请手动解压 ' + assetPath + ' 到 ' + dataDir)
    }
  } else {
    const code = spawnSync('tar', ['xzf', assetPath, '-C', dataDir]).status
    if (code !== 0) throw new Error('tar 解压失败，请手动解压 ' + assetPath + ' 到 ' + dataDir)
  }
}

function fileReady(p, min) {
  try { return fs.existsSync(p) && fs.statSync(p).size >= min } catch { return false }
}

async function main() {
  console.log('=== Piper 离线 TTS 安装 ===')
  await applyProxy()
  fs.mkdirSync(modelsDir, { recursive: true })
  const asset = binaryAsset()
  console.log(`平台：${process.platform}/${process.arch} → ${asset.url}`)
  const exe = process.platform === 'win32' ? path.join(piperDir, 'piper.exe') : path.join(piperDir, 'piper')
  // 二进制已就绪则跳过（重跑只补模型，避免重复下载）
  if (fs.existsSync(exe) && fs.statSync(exe).size > 100_000) {
    console.log('✓ 二进制已存在，跳过下载：' + exe)
  } else {
    const assetPath = path.join(dataDir, 'piper-asset.' + (asset.ext === 'zip' ? 'zip' : 'tgz'))
    await download(asset.url, assetPath, 'Piper 二进制')
    console.log('解压二进制 …')
    extract(assetPath, asset.ext)
    fs.rmSync(assetPath, { force: true })
  }
  if (!fs.existsSync(exe)) {
    console.error('✗ 未找到二进制：' + exe + '\n  请检查 data/piper/ 下应有 piper 可执行文件。')
    process.exit(1)
  }
  console.log('✓ 二进制就绪：' + exe)

  console.log('\n下载中文神经网络模型（华嫣/小雅 女声，朝文 男声）…')
  console.log('（优先镜像 hf-mirror.com，失败回退 huggingface.co）')
  for (const v of VOICES) {
    const onnxRel = `${v.voice}/medium/${v.base}.onnx`
    const jsonRel = `${v.voice}/medium/${v.base}.onnx.json`
    const destOnnx = path.join(modelsDir, `${v.base}.onnx`)
    const destJson = path.join(modelsDir, `${v.base}.onnx.json`)
    if (fileReady(destOnnx, ONNX_MIN)) {
      console.log(`  ✓ ${v.base}.onnx 已存在，跳过`)
    } else {
      try { await downloadWithMirrors(onnxRel, destOnnx, v.base + '.onnx') }
      catch (e) { console.warn('  ⚠ onnx 下载失败（跳过）：' + (e?.message || e)) }
    }
    if (fileReady(destJson, JSON_MIN)) {
      console.log(`  ✓ ${v.base}.onnx.json 已存在，跳过`)
    } else {
      try { await downloadWithMirrors(jsonRel, destJson, v.base + '.onnx.json') }
      catch (e) { console.warn('  ⚠ json 下载失败（跳过）：' + (e?.message || e)) }
    }
  }

  const ready = VOICES.filter((v) =>
    fileReady(path.join(modelsDir, `${v.base}.onnx`), ONNX_MIN) &&
    fileReady(path.join(modelsDir, `${v.base}.onnx.json`), JSON_MIN)).length

  if (ready === 0) {
    console.error('\n✗ 三个中文模型全部下载失败。请手动下载以下 6 个文件到 ' + modelsDir + ' ：')
    for (const v of VOICES) {
      console.error(`  • ${v.base}.onnx  ←  https://hf-mirror.com/rhasspy/piper-voices/resolve/main/zh/zh_CN/${v.voice}/medium/${v.base}.onnx`)
      console.error(`  • ${v.base}.onnx.json  ←  https://hf-mirror.com/rhasspy/piper-voices/resolve/main/zh/zh_CN/${v.voice}/medium/${v.base}.onnx.json`)
    }
    console.error('（或用官方源 https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/... 替换上面的域名）')
    process.exit(1)
  }
  console.log(`\n✓ 完成：${ready}/${VOICES.length} 个中文模型已就绪。`)
  console.log('启动 dev 后，面试页将自动使用本地 Piper 神经网络合成（页面标注「本地神经网络」）。')
  console.log('如需切换回云端 Edge：设置 TTS_PROVIDER=edge；如需模拟：TTS_PROVIDER=mock。')
}

function binaryAsset() {
  const p = process.platform
  const a = process.arch
  if (p === 'win32') return { url: `${RELEASE_BASE}/piper_windows_amd64.zip`, ext: 'zip' }
  if (p === 'darwin') return a === 'arm64'
    ? { url: `${RELEASE_BASE}/piper_macos_aarch64.tar.gz`, ext: 'tgz' }
    : { url: `${RELEASE_BASE}/piper_macos_x64.tar.gz`, ext: 'tgz' }
  if (a === 'arm64') return { url: `${RELEASE_BASE}/piper_linux_aarch64.tar.gz`, ext: 'tgz' }
  return { url: `${RELEASE_BASE}/piper_linux_x86_64.tar.gz`, ext: 'tgz' }
}

main().catch((e) => { console.error('\n✗ 安装失败：' + (e?.message || e)); process.exit(1) })
