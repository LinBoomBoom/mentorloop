// 本机一键验证阿里云 DashScope CosyVoice TTS 是否可用（沙箱无网，需在你本机运行）。
// 用法：  node scripts/check-aliyun-tts.mjs
//        或带 .env：  node --env-file=.env scripts/check-aliyun-tts.mjs
// 脚本会读取 .env 的 DASHSCOPE_API_KEY / ALIYUN_TTS_ENDPOINT / ALIYUN_TTS_MODEL（若未设置则尝试从 .env 加载），
// 对 huayan/xiao_ya/chaowen 三个面试官人格分别合成一句，校验返回并写出样例 wav 到 data/media/tts-check/。
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// ---- 简易 .env 加载（仅补全缺失变量） ----
function loadEnv() {
  const f = path.join(process.cwd(), '.env')
  if (!fs.existsSync(f)) return
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const k = m[1], v = m[2]
    if (process.env[k] === undefined || process.env[k] === '') process.env[k] = v
  }
}
loadEnv()

const API_KEY = process.env.DASHSCOPE_API_KEY
const ENDPOINT = process.env.ALIYUN_TTS_ENDPOINT
  || 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'
const MODEL = process.env.ALIYUN_TTS_MODEL || 'cosyvoice-v3-flash'

const VOICE_MAP = {
  huayan:  'longxiaochun', // 女 · 温柔知性
  xiao_ya: 'longxiaoxia',  // 女 · 活泼清亮
  chaowen: 'longwan'       // 男 · 沉稳大气
}
const SAMPLES = {
  huayan:  '你好，我是华嫣，欢迎来参加这次模拟面试，请先做个简单的自我介绍。',
  xiao_ya: '你好，我是小雅，我们开始今天的面试练习吧。',
  chaowen: '你好，我是朝文，下面我会问你几个技术问题，放松回答就好。'
}

if (!API_KEY) {
  console.error('✗ 未找到 DASHSCOPE_API_KEY：请在 .env 填入阿里云百炼 API Key 后重试。')
  process.exit(1)
}

const outDir = path.join(process.cwd(), 'data', 'media', 'tts-check')
fs.mkdirSync(outDir, { recursive: true })

async function synthOne(id) {
  const voice = VOICE_MAP[id]
  const body = JSON.stringify({
    model: MODEL,
    input: { text: SAMPLES[id], voice, format: 'wav', sample_rate: 24000 }
  })
  let r1
  try {
    r1 = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body
    })
  } catch (e) {
    throw new Error('网络请求失败（确认本机可访问 dashscope.aliyuncs.com）：' + (e.message || e))
  }
  if (!r1.ok) {
    let msg = `HTTP ${r1.status}`
    try { const j = await r1.json(); if (j?.message) msg = j.message } catch {}
    throw new Error(msg)
  }
  const j = await r1.json()
  const ref = j?.output?.audio
  if (!ref) throw new Error('返回缺少音频：' + JSON.stringify(j).slice(0, 200))
  let audio
  if (/^https?:\/\//.test(ref)) {
    const r2 = await fetch(ref)
    if (!r2.ok) throw new Error('音频下载失败 HTTP ' + r2.status)
    audio = Buffer.from(await r2.arrayBuffer())
  } else {
    audio = Buffer.from(ref, 'base64')
  }
  if (!audio || audio.length < 44) throw new Error('返回音频过小/为空')
  const file = path.join(outDir, `${id}.wav`)
  fs.writeFileSync(file, audio)
  return { bytes: audio.length, file }
}

console.log(`端点：${ENDPOINT}\n模型：${MODEL}\n`)
let ok = 0
for (const id of Object.keys(VOICE_MAP)) {
  try {
    const { bytes, file } = await synthOne(id)
    console.log(`✓ ${id} (${VOICE_MAP[id]}) 成功：${(bytes / 1024).toFixed(1)} KB → ${file}`)
    ok++
  } catch (e) {
    console.log(`✗ ${id} (${VOICE_MAP[id]}) 失败：${e.message}`)
  }
}
console.log(`\n结果：${ok}/${Object.keys(VOICE_MAP).length} 成功。`)
if (ok === 0) {
  console.log('全部失败：通常是 DASHSCOPE_API_KEY 无效 / 音色需开通权限 / 本机无法访问阿里云端点。')
  console.log('解决：到 https://bailian.console.aliyun.com 确认 Key 有效且已开通 CosyVoice；或在 .env 改 ALIYUN_TTS_MODEL / 音色 id。')
  process.exit(1)
}
console.log('样例 wav 已写出到 data/media/tts-check/，可用播放器试听确认音色。')
