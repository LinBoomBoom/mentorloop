// 生成桌面端应用图标（纯 Node + 内置 zlib，无外部依赖，可在任意环境运行）。
// 产出：
//   - build/icon.png  (512×512，Windows/Linux 通用)
//   - build/icon.ico  (ICO 包裹 512 PNG，Windows 安装包/任务栏)
//   - build/icon.icns (ICNS 包裹 1024 PNG，macOS 安装包)
// 用法：node scripts/make-icon.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// ---- CRC32（PNG chunk 校验） ----
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

// ---- 像素绘制 ----
function setPx(img, S, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= S || y >= S) return
  const i = (y * S + x) * 4
  img[i] = r; img[i + 1] = g; img[i + 2] = b; img[i + 3] = a
}
function fillRoundedRect(img, S, x0, y0, x1, y1, radius, r, g, b) {
  const cxL = x0 + radius, cxR = x1 - radius, cyT = y0 + radius, cyB = y1 - radius
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let ok = true
      if (x < cxL && y < cyT) { if ((x - cxL) ** 2 + (y - cyT) ** 2 > radius * radius) ok = false }
      else if (x > cxR && y < cyT) { if ((x - cxR) ** 2 + (y - cyT) ** 2 > radius * radius) ok = false }
      else if (x < cxL && y > cyB) { if ((x - cxL) ** 2 + (y - cyB) ** 2 > radius * radius) ok = false }
      else if (x > cxR && y > cyB) { if ((x - cxR) ** 2 + (y - cyB) ** 2 > radius * radius) ok = false }
      if (ok) setPx(img, S, x, y, r, g, b, 255)
    }
  }
}
function drawLine(img, S, x0, y0, x1, y1, thick, r, g, b) {
  const dx = x1 - x0, dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const half = thick / 2
  const minX = Math.floor(Math.min(x0, x1) - half), maxX = Math.ceil(Math.max(x0, x1) + half)
  const minY = Math.floor(Math.min(y0, y1) - half), maxY = Math.ceil(Math.max(y0, y1) + half)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (len * len)))
      const px = x0 + t * dx, py = y0 + t * dy
      if (Math.hypot(x - px, y - py) <= half) setPx(img, S, x, y, r, g, b, 255)
    }
  }
}

function renderRGBA(S) {
  const img = Buffer.alloc(S * S * 4) // 透明背景
  const [BR, BG, BB] = [79, 70, 229] // #4F46E5 靛蓝
  const pad = Math.round(S * 0.015)
  fillRoundedRect(img, S, pad, pad, S - pad, S - pad, Math.round(S * 0.215), BR, BG, BB)

  const T = Math.round(S * 0.09)
  const xL = Math.round(S * 0.234)
  const xR = Math.round(S * 0.766)
  const yT = Math.round(S * 0.312)
  const yB = Math.round(S * 0.688)
  const xC = Math.round(S * 0.5)
  const yC = Math.round(S * 0.605)
  drawLine(img, S, xL, yT, xL, yB, T, 255, 255, 255) // 左竖
  drawLine(img, S, xR, yT, xR, yB, T, 255, 255, 255) // 右竖
  drawLine(img, S, xL, yT, xC, yC, T, 255, 255, 255) // 左斜
  drawLine(img, S, xR, yT, xC, yC, T, 255, 255, 255) // 右斜
  return img
}

// ---- 编码 PNG ----
function encodePNG(img, S) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit, RGBA
  const stride = S * 4
  const raw = Buffer.alloc((stride + 1) * S)
  for (let y = 0; y < S; y++) {
    raw[y * (stride + 1)] = 0
    img.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))])
}

// ---- 编码 ICO（Vista+ 直接包裹 PNG；≥256 用 0 表示） ----
function encodeICO(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry[0] = 0; entry[1] = 0; entry[2] = 0; entry[3] = 0
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, png])
}

// ---- 编码 ICNS（单张 1024 PNG，类型 ic12） ----
function encodeICNS(png1024) {
  const entry = Buffer.concat([Buffer.from('ic12', 'ascii'), Buffer.alloc(4), png1024])
  entry.writeUInt32BE(8 + png1024.length, 4)
  const header = Buffer.concat([Buffer.from('icns', 'ascii'), Buffer.alloc(4)])
  header.writeUInt32BE(8 + entry.length, 4)
  return Buffer.concat([header, entry])
}

const png512 = encodePNG(renderRGBA(512), 512)
const png1024 = encodePNG(renderRGBA(1024), 1024)
const buildDir = path.join(root, 'build')
fs.mkdirSync(buildDir, { recursive: true })
fs.writeFileSync(path.join(buildDir, 'icon.png'), png512)
fs.writeFileSync(path.join(buildDir, 'icon.ico'), encodeICO(png512))
fs.writeFileSync(path.join(buildDir, 'icon.icns'), encodeICNS(png1024))
console.log('图标已生成：build/icon.png, build/icon.ico, build/icon.icns')
