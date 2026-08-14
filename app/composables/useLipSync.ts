// P4 口型引擎：把"真实音频输出"的 RMS 映射为嘴部开合度 mouthOpen（0..1），驱动 DigitalHuman.vue。
//
// 关键修复（相对旧版 startMouthAnim 定时器假口型）：
// - 旧版用 Math.sin(t) 模拟律动，与真实语音毫无关联；
// - 本引擎把 AudioBufferSourceNode 经 AnalyserNode 接入 destination，RAF 实时取波形 RMS → 真口型。
//
// 设计：
// - 单一持久 AnalyserNode（首次 connectSource 时创建），可跨实时模式多个音频块复用；
// - connectSource(src) 把音源接到 analyser→destination，音频照常播放且驱动嘴型；
// - stop() 停止 RAF 循环（静音时 mouthOpen 自然衰减到 0，无需手动归零）。
// - 浏览器 SpeechSynthesis 回退（speakFallback）无法取振幅，仍由调用方用定时器动画（见 sim.vue startMouthAnim）。
import { ref } from 'vue'
import { rmsToMouth, smoothMouth } from '~/utils/lipSync'

export function useLipSync(getCtx: () => any) {
  const mouthOpen = ref(0)
  let analyser: any = null
  let raf = 0
  let smoothed = 0
  let buf: Uint8Array | null = null

  function loop() {
    if (!analyser) { raf = 0; return }
    if (!buf) buf = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / buf.length)
    smoothed = smoothMouth(smoothed, rmsToMouth(rms))
    mouthOpen.value = smoothed
    raf = requestAnimationFrame(loop)
  }

  function ensureAnalyser(): any {
    const ac = getCtx()
    if (!ac) return null
    if (!analyser) {
      try {
        analyser = ac.createAnalyser()
        analyser.fftSize = 1024
        buf = new Uint8Array(analyser.fftSize)
      } catch {
        return null
      }
    }
    if (!raf) raf = requestAnimationFrame(loop)
    return analyser
  }

  // 把一个音源接到 analyser→destination：既播放声音，又驱动嘴型。
  function connectSource(src: any) {
    const an = ensureAnalyser()
    if (!an) return
    try {
      src.connect(an)
      an.connect(getCtx().destination)
    } catch { /* 连接失败不致命，至少保证音频不崩 */ }
  }

  // 直接播放一个已解码的 AudioBuffer（HTTP TTS / 试听），返回 source 供后续 stop。
  function playBuffer(buffer: AudioBuffer): any {
    const ac = getCtx()
    if (!ac) return null
    const src = ac.createBufferSource()
    src.buffer = buffer
    connectSource(src)
    try { src.start() } catch { /* 已 start 等 */ }
    return src
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0 }
    smoothed = 0
    mouthOpen.value = 0
    analyser = null
  }

  return { mouthOpen, connectSource, playBuffer, stop, ensureAnalyser }
}
