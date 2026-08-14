// 语音子系统：可插拔 STT/TTS 工厂，沿用 llm.ts 的惰性 env 读取 + 工厂模式。
// TTS 优先级：本地 Piper（离线神经网络，所有访客一致、可靠）→ Edge TTS（需联网，多数网络被拦截）→ 浏览器本地合成（前端回退）。
// STT 在 MVP 由浏览器 Web Speech 处理（见前端），服务端仅保留 SttProvider 接口，供 Phase 3 云端实时转写扩展。
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

export interface SttResult { text: string; confidence?: number }
export interface TtsResult { audio: Buffer; mime: string; ext: string }
export interface TtsChunk { chunk: Buffer; mime: string; ext: string }
export interface TtsOptions { voice?: string; rate?: string; cache?: boolean }

export interface SttProvider {
  name: string
  transcribe(audio: Buffer, opts?: any): Promise<SttResult>
}
export interface TtsProvider {
  name: string
  synthesize(text: string, opts?: TtsOptions): Promise<TtsResult>
  // 流式：按句分段产出音频块（Edge/Piper 整段合成后切句；真 WebSocket 流式需换库，留作后续）
  synthesizeStream(text: string, opts?: TtsOptions): AsyncIterable<TtsChunk>
}

// 按句切分（保留句末标点），供流式 TTS 逐句产出；无句末标点则整体作为一句。
export function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[。！？!?；;\n])/)
  const out: string[] = []
  for (const p of parts) {
    const t = p.trim()
    if (t) out.push(t)
  }
  return out.length ? out : [text]
}

// 默认嗓音：Piper 中文嗓音 id（前端选择项之一；亦作服务端缓存 key 一部分）。
// 注意：TTS_VOICE 现在指代 Piper 嗓音 id（huayan / xiao_ya / chaowen），不再是 Edge 嗓音名。
const PIPER_DEFAULT_VOICE = process.env.TTS_VOICE || 'huayan'
// 仅 TTS_PROVIDER=edge（测试 / 备用通道）使用的默认 Edge 神经嗓音名。
const EDGE_VOICE_DEFAULT = 'zh-CN-XiaoxiaoNeural'
export const TTS_CACHE_DIR = path.join(process.cwd(), 'data', 'media', 'tts')

// ---- Mock TTS（离线/测试用，生成合法 WAV 蜂鸣，保证音频链路可跑、可单测） ----
class MockTtsProvider implements TtsProvider {
  name = 'mock'
  async synthesize(_text: string, _opts?: TtsOptions): Promise<TtsResult> {
    return { audio: makeBeepWav(500), mime: 'audio/wav', ext: 'wav' }
  }
  async *synthesizeStream(text: string, opts?: TtsOptions): AsyncIterable<TtsChunk> {
    for (const s of splitSentences(text)) {
      const r = await this.synthesize(s, opts)
      yield { chunk: r.audio, mime: r.mime, ext: r.ext }
    }
  }
}

// ---- Edge TTS（生产默认，免费，需联网到微软端点） ----
class EdgeTtsProvider implements TtsProvider {
  name = 'edge'
  private voice: string
  constructor(voice = EDGE_VOICE_DEFAULT) { this.voice = voice }
  async synthesize(text: string, opts?: TtsOptions): Promise<TtsResult> {
    let ttsFn: any
    try {
      const mod = await import('edge-tts/out/index.js')
      ttsFn = mod.tts
    } catch {
      throw new Error('TTS 依赖缺失：未安装 edge-tts（npm i edge-tts）')
    }
    // 前端传的是 Piper 嗓音 id（如 huayan），不是 Edge 嗓音名；非 Edge 名时回退默认，避免把 id 当 Edge 名导致失败。
    const voice = (opts?.voice && /Neural$/.test(opts.voice)) ? opts.voice : this.voice
    try {
      const audio = await ttsFn(text, { voice, rate: opts?.rate || '+0%', volume: '+0%', pitch: '+0Hz' })
      if (!audio || (audio as Buffer).length === 0) throw new Error('TTS 返回空音频')
      return { audio: Buffer.isBuffer(audio) ? audio : Buffer.from(audio), mime: 'audio/mpeg', ext: 'mp3' }
    } catch (e: any) {
      throw new Error('TTS 合成失败（需联网微软端点）：' + (e?.message || e))
    }
  }
  async *synthesizeStream(text: string, opts?: TtsOptions): AsyncIterable<TtsChunk> {
    for (const s of splitSentences(text)) {
      const r = await this.synthesize(s, opts)
      yield { chunk: r.audio, mime: r.mime, ext: r.ext }
    }
  }
}

// ---- 本地 Piper 离线神经网络 TTS（不依赖任何云服务，所有访客一致、可永久离线） ----
// 二进制与中文模型由 `npm run setup:piper` 下载到 data/piper/（不纳入版本库）。
const PIPER_BIN = process.env.PIPER_BIN || (process.platform === 'win32'
  ? path.join(process.cwd(), 'data', 'piper', 'piper.exe')
  : path.join(process.cwd(), 'data', 'piper', 'piper'))
const PIPER_MODELS_DIR = process.env.PIPER_MODELS_DIR || path.join(process.cwd(), 'data', 'piper', 'models')

// 真实可用的 Piper 中文神经网络嗓音（由 `npm run setup:piper` 下载到 data/piper/models/）。
// id 用于前端选择 + 服务端缓存 key；model 为 onnx 文件名（不含扩展名）。
// 这 3 个是 HF piper-voices 中仅有的中文模型——不存在第 4 种独立中文嗓音。
// （旧版曾把 16 个 Edge 嗓音名映射到这 3 个模型的 lengthScale 变体，造成"大部分音色一样、且无感情"的假象，已剔除。）
// 每个 id 对应一个真实神经网络模型，音色/自然度确有差异，但感情层次有限（非真人/微软云端级）。
export const PIPER_VOICES: Record<string, { model: string; label: string; gender: 'female' | 'male' }> = {
  huayan:  { model: 'zh_CN-huayan-medium',  label: '华嫣 · 温柔知性女声', gender: 'female' },
  xiao_ya: { model: 'zh_CN-xiao_ya-medium', label: '小雅 · 清亮自然女声', gender: 'female' },
  chaowen: { model: 'zh_CN-chaowen-medium', label: '朝文 · 沉稳磁性男声', gender: 'male' }
}

function piperModelPath(modelBase: string): string {
  const p = path.join(PIPER_MODELS_DIR, `${modelBase}.onnx`)
  if (fs.existsSync(p)) return p
  // 回退：目录下任意 .onnx（用户只下载了部分模型时也能跑）
  try {
    const files = fs.readdirSync(PIPER_MODELS_DIR).filter((f) => f.endsWith('.onnx'))
    if (files.length) return path.join(PIPER_MODELS_DIR, files[0])
  } catch {}
  return p
}
export function piperAvailable(): boolean {
  if (!fs.existsSync(PIPER_BIN)) return false
  try {
    return fs.readdirSync(PIPER_MODELS_DIR).filter((f) => f.endsWith('.onnx')).length > 0
  } catch { return false }
}

// 返回当前磁盘上实际可用的 Piper 中文嗓音（前端据此动态渲染音色下拉，避免列出未下载的模型）。
export function listPiperVoices(): { id: string; label: string; gender: 'female' | 'male' }[] {
  return Object.entries(PIPER_VOICES)
    .filter(([, v]) => fs.existsSync(piperModelPath(v.model)))
    .map(([id, v]) => ({ id, label: v.label, gender: v.gender }))
}

class PiperTtsProvider implements TtsProvider {
  name = 'piper'
  async synthesize(text: string, opts?: TtsOptions): Promise<TtsResult> {
    if (!fs.existsSync(PIPER_BIN)) throw new Error('Piper 未安装：请运行 `npm run setup:piper` 下载二进制与中文模型')
    const id = opts?.voice || PIPER_DEFAULT_VOICE
    const conf = PIPER_VOICES[id] || PIPER_VOICES[PIPER_DEFAULT_VOICE]
    const modelPath = piperModelPath(conf.model)
    if (!fs.existsSync(modelPath)) throw new Error('Piper 模型缺失：' + path.basename(modelPath))
    const args = ['--model', modelPath, '--output_file', '-', '-q']
    const raw = await runPiper(PIPER_BIN, args, text)
    // 兜底：若 Piper 在 WAV 前输出了任何杂字节（理论上 -q 不会），从 RIFF 标记处截取
    const riff = raw.indexOf(Buffer.from('RIFF'))
    const buf = riff > 0 ? raw.subarray(riff) : raw
    if (!buf || buf.length < 44 || buf.indexOf(Buffer.from('RIFF')) !== 0) throw new Error('Piper 合成返回空音频')
    return { audio: buf, mime: 'audio/wav', ext: 'wav' }
  }
  async *synthesizeStream(text: string, opts?: TtsOptions): AsyncIterable<TtsChunk> {
    for (const s of splitSentences(text)) {
      const r = await this.synthesize(s, opts)
      yield { chunk: r.audio, mime: r.mime, ext: r.ext }
    }
  }
}

// 调用 piper 二进制：文本经 stdin 喂入，WAV 字节从 stdout 收回（-q 保证 stdout 纯净）。
function runPiper(bin: string, args: string[], text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let child: any
    try {
      child = spawn(bin, args, { windowsHide: true })
    } catch (e: any) {
      return reject(new Error('Piper 启动失败：' + (e?.message || e)))
    }
    const chunks: Buffer[] = []
    const errChunks: Buffer[] = []
    child.stdout.on('data', (d: any) => chunks.push(Buffer.from(d)))
    child.stderr.on('data', (d: any) => errChunks.push(Buffer.from(d)))
    child.on('error', (e: any) => reject(new Error('Piper 启动失败：' + (e?.message || e))))
    child.on('close', (code: number) => {
      if (code !== 0) {
        const msg = Buffer.concat(errChunks).toString('utf8').slice(0, 400)
        return reject(new Error('Piper 退出码 ' + code + (msg ? '：' + msg : '')))
      }
      resolve(Buffer.concat(chunks))
    })
    try {
      child.stdin.write(text.replace(/\r?\n/g, ' '))
      child.stdin.end()
    } catch (e: any) {
      reject(new Error('Piper 写入文本失败：' + (e?.message || e)))
    }
  })
}

// ---- 工厂（惰性 env 读取） ----
let _tts: TtsProvider | null = null
export function getTts(): TtsProvider {
  if (_tts) return _tts
  const p = (process.env.TTS_PROVIDER || '').toLowerCase()
  if (p === 'mock') _tts = new MockTtsProvider()
  else if (p === 'edge') _tts = new EdgeTtsProvider(process.env.TTS_VOICE)
  else if (p === 'piper') _tts = new PiperTtsProvider()
  else {
    // 默认：优先本地 Piper（离线可靠，已验证云端 Edge 在多数网络被拦截）→ 否则回退 Edge
    _tts = piperAvailable() ? new PiperTtsProvider() : new EdgeTtsProvider(process.env.TTS_VOICE)
  }
  return _tts
}
export function getTtsProviderName(): string { return getTts().name }
export function ttsEnabled(): boolean {
  try { getTts(); return true } catch { return false }
}

// ---- TTS 缓存（题库题不变 → 零重合成；按 提供商|语音|文本 哈希） ----
// 注意：缓存 key 必须包含 provider 维度。历史上 mock（测试蜂鸣）/piper/edge 共用同一个
// `voice|text` 命名空间，一旦某环境用 mock 生成过蜂鸣并被缓存，切回 piper 后仍会命中旧
// 缓存 → 播放出 8000Hz 蜂鸣（"噪音"）。加 provider 维度后三者各自独立命名空间，永不串味。
export function ttsCacheKey(text: string, voice?: string, provider: string = ''): string {
  return crypto.createHash('sha256').update(`${provider}|${voice || PIPER_DEFAULT_VOICE}|${text}`).digest('hex')
}
export async function synthesizeWithCache(text: string, opts?: TtsOptions): Promise<TtsResult> {
  const provider = getTts()
  // mock 为测试用蜂鸣（makeBeepWav），绝不能写入磁盘缓存：否则会污染生产/开发共用的
  // data/media/tts/ 目录，导致真实 piper/edge 合成时命中旧 mock 缓存播放出噪音。
  // opts.cache=false（如实时流式逐句，避免堆积缓存）同样跳过磁盘写入。
  if (opts?.cache === false || provider.name === 'mock') return provider.synthesize(text, opts)
  const key = ttsCacheKey(text, opts?.voice, provider.name)
  const ext = provider.name === 'edge' ? 'mp3' : 'wav'
  const file = path.join(TTS_CACHE_DIR, `${key}.${ext}`)
  if (fs.existsSync(file)) {
    return { audio: fs.readFileSync(file), mime: provider.name === 'edge' ? 'audio/mpeg' : 'audio/wav', ext }
  }
  const res = await provider.synthesize(text, opts)
  try {
    fs.mkdirSync(TTS_CACHE_DIR, { recursive: true })
    fs.writeFileSync(path.join(TTS_CACHE_DIR, `${key}.${res.ext}`), res.audio)
  } catch { /* 缓存写入失败不影响主流程 */ }
  return res
}

// ---- 生成合法 WAV 蜂鸣（Mock/离线用，保证返回真实音频字节） ----
function makeBeepWav(ms: number): Buffer {
  const rate = 8000
  const n = Math.floor(rate * ms / 1000)
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) {
    const ramp = i < n / 20 ? i / (n / 20) : 1 // 轻柔起音，避免爆音
    const s = Math.sin(2 * Math.PI * 440 * i / rate) * 0.2 * ramp
    data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8)
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}
