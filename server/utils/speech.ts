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

// 音色元信息（前端下拉通用形状；不同 provider 字段一致）
export interface VoiceMeta {
  id: string
  label: string
  gender: 'female' | 'male'
  trait?: string          // 音色特质（如 温柔知性），用于 UI 副标题
  recommended?: boolean   // 是否作为本项目 3 个推荐默认人格之一
}

// ---- Edge（微软）神经嗓音：烘焙中文 Neural 精选集 ----
// 微软端点多数网络被拦（实测 403），仅作静态下拉兜底；运行时仍以 edge-tts 实际返回为准。
// 3 个推荐人格 → 真实 Neural 名（前端传人格 id 时映射）
const EDGE_VOICE_MAP: Record<string, string> = {
  huayan:  'zh-CN-XiaoxiaoNeural', // 女 · 温柔知性
  xiao_ya: 'zh-CN-XiaoyiNeural',   // 女 · 清亮自然
  chaowen: 'zh-CN-YunyangNeural'   // 男 · 沉稳磁性
}
export const EDGE_VOICE_CATALOG: VoiceMeta[] = [
  { id: 'huayan',  label: '华嫣', gender: 'female', trait: '微软女声·温柔知性', recommended: true },
  { id: 'xiao_ya', label: '小雅', gender: 'female', trait: '微软女声·清亮自然', recommended: true },
  { id: 'chaowen', label: '朝文', gender: 'male',   trait: '微软男声·沉稳磁性', recommended: true },
  { id: 'zh-CN-XiaoxiaoNeural', label: '晓晓', gender: 'female', trait: '温柔知性' },
  { id: 'zh-CN-XiaoyiNeural',   label: '晓伊', gender: 'female', trait: '清亮自然' },
  { id: 'zh-CN-XiaohanNeural',  label: '晓涵', gender: 'female', trait: '温柔' },
  { id: 'zh-CN-XiaomoNeural',   label: '晓墨', gender: 'female', trait: '活泼' },
  { id: 'zh-CN-XiaoruiNeural',  label: '晓睿', gender: 'female', trait: '知性' },
  { id: 'zh-CN-XiaoxuanNeural', label: '晓萱', gender: 'female', trait: '甜美' },
  { id: 'zh-CN-YunniNeural',    label: '云妮', gender: 'female', trait: '邻家' },
  { id: 'zh-CN-YunxiNeural',    label: '云希', gender: 'male',   trait: '阳光' },
  { id: 'zh-CN-YunfengNeural',  label: '云枫', gender: 'male',   trait: '沉稳' },
  { id: 'zh-CN-YunhaoNeural',   label: '云皓', gender: 'male',   trait: '活力' },
  { id: 'zh-CN-YunjianNeural',  label: '云健', gender: 'male',   trait: '干练' },
  { id: 'zh-CN-YunzeNeural',    label: '云泽', gender: 'male',   trait: '磁性' }
]

// ---- 阿里云 DashScope CosyVoice：烘焙 cosyvoice-v3-flash 全部预置音色 ----
// DashScope 无干净的"列举音色" REST API，规范来源是官方帮助页静态清单 → 烘焙为内置目录。
// 前端人格 id → 真实 CosyVoice 嗓音（清晰、可区分男女声，不怕墙）。
const ALIYUN_VOICE_MAP: Record<string, string> = {
  huayan:  'longxiaochun_v3', // 龙小淳 · 女 · 温柔知性（cosyvoice-v3-flash 仅接受 _v3 后缀音色）
  xiao_ya: 'longxiaoxia_v3',  // 龙小夏 · 女 · 活泼清亮
  chaowen: 'longtian_v3'      // 龙天 · 男 · 磁性理智（v3-flash 中 longwan 为女声 longwan_v3，男声改用龙天）
}
// 前端下拉用的阿里云音色：3 个推荐人格（persona id）+ 全部预置 CosyVoice 嗓音（真实 param）。
// 切 ALIYUN_TTS_MODEL 时音色集随模型变化；本目录按默认模型 cosyvoice-v3-flash 整理。
export const ALIYUN_VOICE_CATALOG: VoiceMeta[] = [
  { id: 'huayan',  label: '华嫣', gender: 'female', trait: '龙小淳·温柔知性', recommended: true },
  { id: 'xiao_ya', label: '小雅', gender: 'female', trait: '龙小夏·活泼清亮', recommended: true },
  { id: 'chaowen', label: '朝文', gender: 'male',   trait: '龙天·磁性理智', recommended: true },
  { id: 'longanhuan_v3', label: '龙安欢', gender: 'female', trait: '欢脱元气' },
  { id: 'longxiaochun_v3', label: '龙小淳', gender: 'female', trait: '温柔知性' },
  { id: 'longxiaoxia_v3',  label: '龙小夏', gender: 'female', trait: '活泼清亮' },
  { id: 'longwan_v3',    label: '龙婉',   gender: 'female', trait: '细腻柔声' },
  { id: 'longyingmu_v3', label: '龙影沐', gender: 'female', trait: '优雅知性' },
  { id: 'longantai_v3',  label: '龙安台', gender: 'female', trait: '嗲甜台湾' },
  { id: 'longhua_v3',    label: '龙华',   gender: 'female', trait: '元气甜美' },
  { id: 'longcheng_v3',  label: '龙橙',   gender: 'male',   trait: '智慧青年' },
  { id: 'longze_v3',     label: '龙泽',   gender: 'male',   trait: '温暖元气' },
  { id: 'longzhe_v3',    label: '龙哲',   gender: 'male',   trait: '呆板大暖男' },
  { id: 'longyan_v3',    label: '龙颜',   gender: 'female', trait: '温暖春风' },
  { id: 'longxing_v3',   label: '龙星',   gender: 'female', trait: '温婉邻家' },
  { id: 'longtian_v3',   label: '龙天',   gender: 'male',   trait: '磁性理智' },
  { id: 'longqiang_v3',  label: '龙嫱',   gender: 'female', trait: '浪漫风情' },
  { id: 'longfeifei_v3', label: '龙菲菲', gender: 'female', trait: '甜美娇气' },
  { id: 'longhao_v3',    label: '龙浩',   gender: 'male',   trait: '多情忧郁' },
  { id: 'longanrou_v3',  label: '龙安柔', gender: 'female', trait: '温柔闺蜜' },
  { id: 'longhan_v3',    label: '龙寒',   gender: 'male',   trait: '温暖痴情' },
  { id: 'longanzhi_v3',  label: '龙安智', gender: 'male',   trait: '睿智轻熟' },
  { id: 'longanling_v3', label: '龙安灵', gender: 'female', trait: '思维灵动' },
  { id: 'longanya_v3',   label: '龙安雅', gender: 'female', trait: '高雅气质' },
  { id: 'longanqin_v3',  label: '龙安亲', gender: 'female', trait: '亲和活泼' },
  { id: 'longmiao_v3',   label: '龙妙',   gender: 'female', trait: '抑扬顿挫' },
  { id: 'longsanshu_v3', label: '龙三叔', gender: 'male',   trait: '沉稳质感' },
  { id: 'longyuan_v3',   label: '龙媛',   gender: 'female', trait: '温暖治愈' },
  { id: 'longyue_v3',    label: '龙悦',   gender: 'female', trait: '温暖磁性' },
  { id: 'longxiu_v3',    label: '龙修',   gender: 'male',   trait: '博才说书' },
  { id: 'longnan_v3',    label: '龙楠',   gender: 'male',   trait: '睿智青年' },
  { id: 'longwanjun_v3', label: '龙婉君', gender: 'female', trait: '细腻柔声' },
  { id: 'longyichen_v3', label: '龙逸尘', gender: 'male',   trait: '洒脱活力' },
  { id: 'longlaobo_v3',  label: '龙老伯', gender: 'male',   trait: '沧桑岁月' },
  { id: 'longlaoyi_v3',  label: '龙老姨', gender: 'female', trait: '烟火从容' },
  { id: 'longjiqi_v3',   label: '龙机器', gender: 'female', trait: '呆萌机器人' },
  { id: 'longhouge_v3',  label: '龙猴哥', gender: 'male',   trait: '经典猴哥' },
  { id: 'longdaiyu_v3',  label: '龙黛玉', gender: 'female', trait: '娇率才女' },
  { id: 'longanran_v3',  label: '龙安燃', gender: 'female', trait: '活泼质感' },
  { id: 'longanxuan_v3',  label: '龙安宣', gender: 'female', trait: '经典直播' },
  { id: 'longshuo_v3',   label: '龙硕',   gender: 'male',   trait: '博才干练' },
  { id: 'longshu_v3',    label: '龙书',   gender: 'male',   trait: '沉稳青年' },
  { id: 'loongbella_v3', label: 'Bella',  gender: 'female', trait: '精准干练' }
]
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
    // 前端传的是 Piper 人格 id（如 huayan）；按 EDGE_VOICE_MAP 映射成真实的微软神经嗓音名。
    // 直接传 Neural 名（调试）也放行；映射表与 Neural 名都没有时回退默认嗓音。
    const mapped = opts?.voice ? EDGE_VOICE_MAP[opts.voice] : ''
    const voice = mapped || (opts?.voice && /Neural$/.test(opts.voice) ? opts.voice : this.voice)
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

// ---- 阿里云 DashScope CosyVoice TTS（国内节点 HTTP 直连，需 DASHSCOPE_API_KEY） ----
// 非流式：POST 合成 → 取响应中的音频 URL → 再 GET 取字节；首播后由 synthesizeWithCache 永久缓存。
class AliyunTtsProvider implements TtsProvider {
  name = 'aliyun'
  async synthesize(text: string, opts?: TtsOptions): Promise<TtsResult> {
    const apiKey = process.env.DASHSCOPE_API_KEY
    if (!apiKey) throw new Error('TTS 配置缺失：请在 .env 设置 DASHSCOPE_API_KEY（阿里云百炼 API Key）')
    const endpoint = process.env.ALIYUN_TTS_ENDPOINT
      || 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'
    const model = process.env.ALIYUN_TTS_MODEL || 'cosyvoice-v3-flash'
    // 前端可能传：① 3 个推荐人格 id（huayan/xiao_ya/chaowen）→ 映射成真实 param；
    // ② 直接传的阿里云 voice param（形如 longxxx）→ 透传；③ 其它 → 兜底默认。
    const direct = opts?.voice && /^long/i.test(opts.voice || '') ? (opts.voice as string) : ''
    const voice = ALIYUN_VOICE_MAP[opts?.voice || ''] || direct || ALIYUN_VOICE_MAP[PIPER_DEFAULT_VOICE]
    const format = 'wav'
    const sampleRate = 24000
    const body = JSON.stringify({
      model,
      input: { text: text.replace(/\r?\n/g, ' '), voice, format, sample_rate: sampleRate }
    })
    let r1: any
    try {
      r1 = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body
      })
    } catch (e: any) {
      throw new Error('Aliyun TTS 网络请求失败（确认本机可访问 dashscope.aliyuncs.com）：' + (e?.message || e))
    }
    if (!r1.ok) {
      let msg = `HTTP ${r1.status}`
      try { const j = await r1.json(); if (j?.message) msg = j.message; else if (j?.code) msg = `${j.code}: ${j.message || ''}` } catch {}
      throw new Error('Aliyun TTS 请求失败：' + msg)
    }
    const j = await r1.json()
    // cosyvoice-v3-flash 返回 output.audio 为对象 { url, data }（音频经 URL 提供，data 常为空）；
    // 旧模型或内联场景也可能直接返回 base64 字符串 / 音频 URL 字符串。统一兼容处理。
    const audioObj = j?.output?.audio
    let audioUrl = ''
    let audioB64 = ''
    if (audioObj && typeof audioObj === 'object') {
      audioUrl = audioObj.url || ''
      audioB64 = audioObj.data || ''
    } else if (typeof audioObj === 'string') {
      audioUrl = /^https?:\/\//.test(audioObj) ? audioObj : ''
      audioB64 = audioUrl ? '' : audioObj
    }
    if (!audioUrl && !audioB64) throw new Error('Aliyun TTS 返回缺少音频：' + JSON.stringify(j).slice(0, 200))
    let audio: Buffer
    if (audioUrl) {
      const r2 = await fetch(audioUrl)
      if (!r2.ok) throw new Error('Aliyun TTS 音频下载失败：HTTP ' + r2.status)
      audio = Buffer.from(await r2.arrayBuffer())
    } else {
      audio = Buffer.from(audioB64, 'base64')
    }
    if (!audio || audio.length === 0) throw new Error('Aliyun TTS 返回空音频')
    return { audio, mime: format === 'mp3' ? 'audio/mpeg' : 'audio/wav', ext: format }
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
// 动态扫描 data/piper/models/*.onnx：已知模型带中文标签+性别，未知模型也照常列出（全量暴露）。
export function listPiperVoices(): VoiceMeta[] {
  const out: VoiceMeta[] = []
  for (const [id, v] of Object.entries(PIPER_VOICES)) {
    if (!fs.existsSync(piperModelPath(v.model))) continue
    const [lbl, tr] = v.label.split('·')
    out.push({ id, label: lbl.trim(), gender: v.gender, trait: (tr || '').trim() || v.label, recommended: id === 'huayan' || id === 'xiao_ya' || id === 'chaowen' })
  }
  // 已下载但不在 PIPER_VOICES 已知表中的 .onnx → 也列出（全量暴露平台支持）
  try {
    const files = fs.readdirSync(PIPER_MODELS_DIR).filter((f) => f.endsWith('.onnx'))
    const known = new Set(Object.values(PIPER_VOICES).map((v) => `${v.model}.onnx`))
    for (const f of files) {
      if (known.has(f)) continue
      const id = f.replace(/\.onnx$/, '')
      out.push({ id, label: id, gender: 'female', trait: '本地模型（未登记）' })
    }
  } catch {}
  return out
}

// 阿里云音色无需本地模型文件，直接返回烘焙的全部预置音色（含 3 个推荐人格）。
export function listAliyunVoices(): VoiceMeta[] {
  return ALIYUN_VOICE_CATALOG
}
// Edge（微软）音色：返回烘焙的中文 Neural 精选集（静态兜底）。
export function listEdgeVoices(): VoiceMeta[] {
  return EDGE_VOICE_CATALOG
}
// 按 provider 返回其支持的全部音色（前端下拉统一入口）。
export function listVoicesByProvider(provider: string): VoiceMeta[] {
  if (provider === 'aliyun') return listAliyunVoices()
  if (provider === 'edge') return listEdgeVoices()
  return listPiperVoices()
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
  else if (p === 'aliyun') _tts = new AliyunTtsProvider()
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
