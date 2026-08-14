<template>
  <div>
    <h1 class="page-title mb-1">设备与媒体能力自检</h1>
    <p class="text-muted text-sm mb-5">
      用于确认麦克风、摄像头、语音识别与语音朗读在你的浏览器/设备上是否可用。
      建议在 <b>Chrome 或 Edge（桌面）</b> 下用 <b>http://localhost</b> 访问；Safari 桌面不支持语音识别，但麦克风/摄像头采集仍可测。
    </p>

    <a-card class="mb-4" title="浏览器能力">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="安全上下文">
          <span :class="secure ? 'text-emerald-600' : 'text-red-500'">{{ secure ? '是（localhost / https，允许采集）' : '否（麦克风/识别将被浏览器拒绝）' }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="麦克风/摄像头 (getUserMedia)">
          <span :class="gumSupported ? 'text-emerald-600' : 'text-red-500'">{{ gumSupported ? '支持' : '不支持' }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="语音识别 (SpeechRecognition)">
          <span :class="srSupported ? 'text-emerald-600' : 'text-red-500'">{{ srSupported ? '支持（可语音输入）' : '不支持（Safari 桌面 / Firefox 常见）' }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-card class="mb-4" title="麦克风">
      <a-button :type="micOn ? 'default' : 'primary'" :loading="micLoading" @click="toggleMic">{{ micOn ? '停止' : '开启麦克风' }}</a-button>
      <p class="text-sm text-muted mt-2">{{ micStatus }}</p>
      <div class="mt-2 h-3 rounded-full bg-ink/10 overflow-hidden">
        <div class="h-full bg-brand-coral transition-[width] duration-75" :style="{ width: micLevel + '%' }" />
      </div>
    </a-card>

    <a-card class="mb-4" title="摄像头">
      <a-button :type="camOn ? 'default' : 'primary'" :loading="camLoading" @click="toggleCam">{{ camOn ? '停止' : '开启摄像头' }}</a-button>
      <p class="text-sm text-muted mt-2">{{ camStatus }}</p>
      <video v-if="camOn" ref="videoEl" class="mt-2 w-full rounded-xl bg-black aspect-video" autoplay playsinline muted />
    </a-card>

    <a-card class="mb-4" title="语音识别试说" v-if="srSupported">
      <a-button type="primary" :disabled="!micOn" @click="tryRecognize">点击后说一句话</a-button>
      <p class="text-sm text-muted mt-2">识别结果：{{ srText || '—' }}</p>
    </a-card>
    <a-alert v-else class="mb-4" type="warning" show-icon message="当前浏览器不支持语音识别" description="语音输入需 Chrome / Edge 桌面版；Safari 桌面只能采集音频、不能识别成文字。" />

    <a-card class="mb-4" title="录音上传识别（服务端 ASR · 兼容 Safari）">
      <a-button type="primary" :loading="asrLoading" :disabled="!gumSupported || asrRecording" @click="toggleAsrRecord">
        {{ asrRecording ? '停止并识别' : '开始录音' }}
      </a-button>
      <p class="text-sm text-muted mt-2">说一句中文，点「停止并识别」后上传服务端转写。Safari 桌面可借由此验证「录音 → ASR → 文字」链路（需服务端已配置 ASR_API_KEY）。</p>
      <p class="text-sm text-muted mt-1">{{ asrStatus }}</p>
      <p class="text-sm mt-1">识别结果：{{ asrText || '—' }}</p>
    </a-card>

    <a-card class="mb-4" title="语音朗读试听 (TTS)">
      <a-button type="primary" :loading="ttsLoading" @click="tryTts">播放示例句子</a-button>
      <p class="text-sm text-muted mt-2">{{ ttsStatus }}</p>
      <audio ref="ttsAudio" class="hidden" />
    </a-card>

    <a-button class="mb-8" @click="stopAll">全部停止并释放设备</a-button>
  </div>
</template>

<script setup lang="ts">
const secure = ref(false)
const gumSupported = ref(false)
const srSupported = ref(false)

const micOn = ref(false)
const micLoading = ref(false)
const micStatus = ref('未开启')
const micLevel = ref(0)

const camOn = ref(false)
const camLoading = ref(false)
const camStatus = ref('未开启')
const videoEl = ref<any>(null)

const srText = ref('')
const ttsLoading = ref(false)
const ttsStatus = ref('未试听')
const ttsAudio = ref<any>(null)

let micStream: MediaStream | null = null
let camStream: MediaStream | null = null
let audioCtx: any = null
let analyser: any = null
let rafId = 0

onMounted(() => {
  secure.value = !!(window as any).isSecureContext
  gumSupported.value = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  srSupported.value = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
})

onUnmounted(stopAll)

function stopAll() {
  if (rafId) cancelAnimationFrame(rafId)
  micStream?.getTracks().forEach(t => t.stop()); micStream = null
  camStream?.getTracks().forEach(t => t.stop()); camStream = null
  try { audioCtx?.close() } catch {}
  audioCtx = null; analyser = null
  micOn.value = false; camOn.value = false; micLevel.value = 0
  micStatus.value = '已停止'; camStatus.value = '已停止'
}

async function toggleMic() {
  if (micOn.value) { stopAll(); return }
  micLoading.value = true; micStatus.value = '请求权限中…'
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    micOn.value = true; micStatus.value = '已开启，请对着麦克风说话'
    audioCtx = new (window as any).AudioContext()
    const src = audioCtx.createMediaStreamSource(micStream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i] - 128); if (v > peak) peak = v }
      micLevel.value = Math.min(100, Math.round((peak / 128) * 100))
      rafId = requestAnimationFrame(tick)
    }
    tick()
  } catch (e: any) {
    micStatus.value = '开启失败：' + (e?.message || e) + '（需 localhost/https 并允许权限）'
  } finally { micLoading.value = false }
}

async function toggleCam() {
  if (camOn.value) { stopAll(); return }
  camLoading.value = true; camStatus.value = '请求权限中…'
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: true })
    camOn.value = true; camStatus.value = '已开启，应能看到画面'
    await nextTick()
    if (videoEl.value) { videoEl.value.srcObject = camStream }
  } catch (e: any) {
    camStatus.value = '开启失败：' + (e?.message || e) + '（需 localhost/https 并允许权限）'
  } finally { camLoading.value = false }
}

function tryRecognize() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return
  srText.value = '聆听中…'
  const r = new SR()
  r.lang = 'zh-CN'
  r.interimResults = true
  r.onresult = (e: any) => {
    let t = ''
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
    srText.value = t
  }
  r.onerror = (e: any) => { srText.value = '识别错误：' + (e?.error || e) }
  r.onend = () => { if (srText.value === '聆听中…') srText.value = '（未识别到内容）' }
  try { r.start() } catch (e: any) { srText.value = '启动失败：' + (e?.message || e) }
}

const asrRecording = ref(false)
const asrLoading = ref(false)
const asrText = ref('')
const asrStatus = ref('未测试')
let asrRec: any = null
let asrChunks: any[] = []

async function toggleAsrRecord() {
  if (asrRecording.value) { try { asrRec?.stop() } catch {} return }
  asrText.value = ''; asrStatus.value = '录音中…'; asrLoading.value = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    asrRec = new MediaRecorder(stream)
    asrChunks = []
    asrRec.ondataavailable = (e: any) => { if (e.data?.size) asrChunks.push(e.data) }
    asrRec.onstop = async () => {
      asrRecording.value = false
      stream.getTracks().forEach((t: any) => t.stop())
      const blob = new Blob(asrChunks, { type: asrRec.mimeType || 'audio/webm' })
      asrStatus.value = '上传识别中…'
      try {
        const fd = new FormData()
        const ext = (asrRec.mimeType || '').includes('mp4') ? 'mp4' : 'webm'
        fd.append('audio', new File([blob], 'test.' + ext, { type: blob.type || 'audio/webm' }))
        const res = await fetch('/api/vip/interview/asr', { method: 'POST', body: fd })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          asrStatus.value = `接口返回 ${res.status}：${j.error || ''}（未配置 ASR_API_KEY 时属预期，详见方案文档）`
          asrLoading.value = false
          return
        }
        const j = await res.json()
        asrText.value = j.text || '（空）'
        asrStatus.value = `识别成功（${(blob.size / 1024).toFixed(1)} KB 音频）`
      } catch (e: any) { asrStatus.value = '请求失败：' + (e?.message || e) }
      asrLoading.value = false
    }
    asrRec.start(); asrRecording.value = true
  } catch (e: any) {
    asrStatus.value = '麦克风访问失败：' + (e?.message || e)
    asrLoading.value = false
  }
}

async function tryTts() {
  ttsLoading.value = true; ttsStatus.value = '请求中…'
  const url = `/api/vip/interview/tts?text=${encodeURIComponent('你好，这是语音朗读测试。欢迎参加模拟面试。')}&cache=1`
  try {
    const res = await fetch(url)
    if (!res.ok) { ttsStatus.value = `接口返回 ${res.status}（未登录或非 VIP 时常为 401，请先登录）`; return }
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    ttsAudio.value.src = objUrl
    await ttsAudio.value.play()
    ttsStatus.value = `播放成功（${(blob.size / 1024).toFixed(1)} KB 音频）`
  } catch (e: any) { ttsStatus.value = '失败：' + (e?.message || e) } finally { ttsLoading.value = false }
}
</script>
