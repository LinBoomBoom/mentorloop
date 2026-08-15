// 本地验证 Edge TTS 是否可用（沙箱无法访问微软端点 → 403，需在本机运行）。
// 用法：node scripts/check-edge-tts.mjs
// 说明：与 server/utils/speech.ts 的 EDGE_VOICE_MAP 保持一致。
import fs from 'node:fs'
import path from 'node:path'

const VOICES = {
  huayan:  'zh-CN-XiaoxiaoNeural', // 女 · 温柔知性
  xiao_ya: 'zh-CN-XiaoyiNeural',   // 女 · 清亮自然
  chaowen: 'zh-CN-YunyangNeural'   // 男 · 沉稳磁性
}
const SAMPLE = '你好，我是你的 AI 面试官，请先做一个简短的自我介绍。'

async function main() {
  let tts
  try {
    tts = (await import('edge-tts/out/index.js')).tts
  } catch (e) {
    console.error('✗ edge-tts 未安装，请先：npm i edge-tts')
    process.exit(1)
  }

  const outDir = path.join(process.cwd(), 'data', 'media', '_edge_check')
  fs.mkdirSync(outDir, { recursive: true })

  let ok = 0
  const total = Object.keys(VOICES).length
  for (const [id, voice] of Object.entries(VOICES)) {
    try {
      const buf = await tts(SAMPLE, { voice, rate: '+0%', volume: '+0%', pitch: '+0Hz' })
      const file = path.join(outDir, `${id}.mp3`)
      fs.writeFileSync(file, Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
      console.log(`✓ ${id} (${voice}) → ${file} (${buf.length} bytes)`)
      ok++
    } catch (e) {
      console.error(`✗ ${id} (${voice}) 失败：${e?.message || e}`)
    }
  }

  console.log(`\n结果：${ok}/${total} 成功。`)
  if (ok < total) {
    console.error('部分音色失败，通常是本机网络无法访问微软端点（403/超时）。')
    console.error('解决：确认可联网；或把 .env 的 TTS_PROVIDER 改回 piper 用本地离线引擎。')
    process.exit(2)
  }
  console.log('全部通过。可在浏览器 /interview/sim 选「数字人 / 视频」模式试听；.env 已设 TTS_PROVIDER=edge。')
}

main()
