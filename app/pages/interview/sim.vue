<template>
  <div>
    <h1 class="page-title mb-1">AI 深度模拟面试</h1>
    <p class="text-muted text-sm mb-5">多轮实战问答 + 逐题评分反馈，还原真实面试节奏。共 {{ maxTurns }} 题，结束后给出综合评估。</p>

    <!-- 未登录 / 非 VIP 门禁 -->
    <a-card v-if="gate" class="text-center" :body-style="{ padding: '32px' }">
      <div class="w-14 h-14 rounded-2xl bg-brand-coral/15 text-brand-coral flex items-center justify-center mx-auto mb-4"><Icon name="sparkles" :size="26" /></div>
      <h3 class="font-bold text-lg mb-2">{{ gate.title }}</h3>
      <p class="text-sm text-muted mb-5">{{ gate.desc }}</p>
      <NuxtLink :to="gate.to"><a-button type="primary">{{ gate.btn }}</a-button></NuxtLink>
    </a-card>

    <!-- 设置面试参数 -->
    <a-card v-else-if="phase === 'setup'" :body-style="{ padding: '24px' }">
      <div class="grid sm:grid-cols-2 gap-4 mb-4">
        <label class="block">
          <span class="text-sm font-semibold mb-1.5 block">方向</span>
          <select v-model="track" class="input !py-2.5">
            <option value="frontend">前端</option>
            <option value="backend">后端</option>
            <option value="devops">运维 / DevOps</option>
            <option value="ai">AI 工程</option>
          </select>
        </label>
        <label class="block">
          <span class="text-sm font-semibold mb-1.5 block">难度</span>
          <select v-model="level" class="input !py-2.5">
            <option value="junior">初级</option>
            <option value="mid">中级</option>
            <option value="senior">高级</option>
          </select>
        </label>
      </div>
      <label class="block mb-5">
        <span class="text-sm font-semibold mb-1.5 block">目标岗位 / 方向（选填）</span>
        <input v-model="goal" class="input" placeholder="如：高级前端 / 全栈工程师" />
      </label>
      <label class="block mb-5">
        <span class="text-sm font-semibold mb-1.5 block">面试模式</span>
        <div class="flex gap-2">
          <button type="button" class="chip-tab" :class="mode === 'text' && 'chip-tab-active'" @click="mode = 'text'">文字</button>
          <button type="button" class="chip-tab" :class="mode === 'voice' && 'chip-tab-active'" @click="mode = 'voice'">语音</button>
          <button type="button" class="chip-tab" :class="mode === 'realtime' && 'chip-tab-active'" @click="mode = 'realtime'">实时</button>
          <button type="button" class="chip-tab" :class="mode === 'video' && 'chip-tab-active'" @click="mode = 'video'">视频</button>
          <button type="button" class="chip-tab" :class="mode === 'avatar' && 'chip-tab-active'" @click="mode = 'avatar'">数字人</button>
        </div>
      </label>
      <label v-if="mode !== 'text'" class="block mb-5">
        <span class="text-sm font-semibold mb-1.5 block flex items-center gap-2">面试官音色
          <a-button size="small" type="link" class="!p-0" :loading="previewing" @click="previewVoice">试听</a-button>
        </span>
        <select v-model="selectedVoice" class="input !py-2.5" @change="applyVoice(selectedVoice)">
          <option v-for="v in voiceOptions" :key="v.id" :value="v.id">{{ v.label }}<template v-if="v.recommended"> · 推荐</template><template v-else-if="v.trait"> · {{ v.trait }}</template></option>
        </select>
        <p class="text-xs text-muted mt-1.5">
          共 {{ voiceOptions.length }} 种音色（女声 {{ femaleCount }}/男声 {{ maleCount }}）。
          <template v-if="ttsProvider === 'piper'">当前：<b>服务端本地神经网络合成</b>（离线、音质自然、所有访客一致；中文基础嗓音：华嫣 / 小雅 / 朝文）。</template>
          <template v-else-if="ttsProvider === 'aliyun'">当前：服务端<b>阿里云 CosyVoice 合成</b>（国内直连、不怕墙；可选全部预置音色）。</template>
          <template v-else-if="ttsProvider === 'edge'">当前：服务端云端 Edge 合成（备用通道，需联网）。</template>
          <template v-else-if="ttsProvider === 'mock'">当前：模拟模式（测试用蜂鸣）。</template>
          <template v-else-if="ttsBackend === 'local'">当前：本机浏览器合成（系统默认嗓音，可能偏机械）；建议服务端运行 <code>npm run setup:piper</code> 启用本地神经网络。</template>
          <template v-else>运行时自动选择：优先服务端本地 Piper 神经网络，不可用时回退本机浏览器合成。</template>
        </p>
      </label>
      <label v-if="mode !== 'text'" class="flex items-start gap-2 mb-5 text-sm text-sub" :class="consentHint && !consent && 'p-2 rounded-lg ring-2 ring-red-400 bg-red-50'">
        <input type="checkbox" v-model="consent" class="mt-0.5" @change="consentHint = false" />
        <span>{{ mode === 'video' ? '我已同意开启摄像头与麦克风，面试音视频仅用于实时转写与复盘（不长期留存原始音视频）。' : '我已同意开启麦克风，面试语音仅用于实时转写与复盘（不长期留存原始音视频）。' }}</span>
      </label>
      <a-button type="primary" block :loading="starting" @click="start">
        开始面试
      </a-button>
      <p v-if="err" class="text-red-500 text-sm mt-3">{{ err }}</p>
    </a-card>

    <!-- 面试进行中 -->
    <a-card v-else class="overflow-hidden" :body-style="{ padding: '0' }">
      <div class="flex items-center justify-between px-5 py-3 border-b border-line">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <Icon name="chat" :size="16" class="text-brand-coral" />
          {{ trackName(track) }} · {{ levelName(level) }}
          <span v-if="mode === 'video'" class="chip bg-brand-coral/10 text-brand-coral !text-xs">视频面试</span>
          <span v-else-if="mode === 'voice'" class="chip bg-brand-coral/10 text-brand-coral !text-xs">语音面试</span>
          <span v-else-if="mode === 'realtime'" class="chip bg-brand-coral/10 text-brand-coral !text-xs">实时面试</span>
          <span v-else-if="mode === 'avatar'" class="chip bg-brand-coral/10 text-brand-coral !text-xs">数字人面试</span>
        </div>
        <a-tag class="!bg-ink/5 !text-sub" :bordered="false">第 {{ Math.min(turns + (phase==='done'?0:1), maxTurns) }} / {{ maxTurns }} 题</a-tag>
      </div>

      <!-- 面试官面板（语音/视频/实时/数字人模式）：P4 数字人 SVG + 实时字幕；视频模式附摄像头预览 -->
      <div v-if="mode !== 'text' && phase === 'running'" class="px-5 py-4 border-b border-line bg-gradient-to-b from-brand-coral/[.06] to-transparent">
        <!-- 数字人模式：大尺寸居中 -->
        <div v-if="mode === 'avatar'" class="flex flex-col items-center gap-3 py-2">
          <DigitalHuman
            :mouth-open="lip.mouthOpen"
            :gender="currentVoiceMeta().gender"
            :portrait-id="selectedVoice"
            :speaking="interviewerSpeaking"
            size="lg"
          />
          <div class="text-center">
            <div class="font-semibold">AI 面试官 · {{ currentVoiceMeta().label }}</div>
            <div class="text-muted text-xs">{{ interviewerSpeaking ? '正在讲话…' : '聆听中' }}</div>
          </div>
          <div v-if="speakingText" class="mt-1 w-full rounded-2xl bg-ink/5 px-4 py-3 text-sm whitespace-pre-line">
            {{ speakingText }}
            <div class="mt-2 flex items-center justify-center gap-3">
              <button type="button" class="inline-flex items-center gap-1 text-xs text-brand-coral hover:underline disabled:opacity-50" :disabled="interviewerSpeaking" @click="replayTts">
                <Icon name="volume" :size="14" /> 重播语音
              </button>
              <select :value="selectedVoice" class="text-xs border border-line rounded-lg px-1.5 py-1 bg-white" @change="applyVoice(($event.target as any).value)">
                <option v-for="v in voiceOptions" :key="v.id" :value="v.id">{{ v.label }}</option>
              </select>
            </div>
          </div>
          <div v-if="ttsError && !speakingText" class="mt-1 text-xs text-muted">{{ ttsError }}</div>
        </div>

        <!-- 语音/视频/实时模式：数字人（左）+ 字幕；视频模式再附候选人摄像头（右，面对面） -->
        <div v-else class="flex gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3">
              <DigitalHuman
                :mouth-open="lip.mouthOpen"
                :gender="currentVoiceMeta().gender"
                :portrait-id="selectedVoice"
                :speaking="interviewerSpeaking"
                :size="mode === 'video' ? 'md' : 'md'"
                class="shrink-0"
              />
              <div class="text-sm">
                <div class="font-semibold">AI 面试官</div>
                <div class="text-muted">{{ interviewerSpeaking ? '正在讲话…' : '聆听中' }}</div>
              </div>
            </div>
            <div v-if="speakingText" class="mt-3 rounded-2xl bg-ink/5 px-4 py-3 text-sm whitespace-pre-line">
              {{ speakingText }}
              <div class="mt-2 flex items-center gap-3">
                <button type="button" class="inline-flex items-center gap-1 text-xs text-brand-coral hover:underline disabled:opacity-50" :disabled="interviewerSpeaking" @click="replayTts">
                  <Icon name="volume" :size="14" /> 重播语音
                </button>
                <select :value="selectedVoice" class="text-xs border border-line rounded-lg px-1.5 py-1 bg-white" @change="applyVoice(($event.target as any).value)">
                  <option v-for="v in voiceOptions" :key="v.id" :value="v.id">{{ v.label }}</option>
                </select>
              </div>
            </div>
            <!-- TTS 完全不可用时的提示（字幕仍可见，可手动阅读） -->
            <div v-if="ttsError && !speakingText" class="mt-2 text-xs text-muted">{{ ttsError }}</div>
          </div>
          <div v-if="mode === 'video'" class="w-32 sm:w-40 shrink-0 relative">
            <video ref="camVideoEl" class="w-full rounded-xl bg-black aspect-[3/4] object-cover" autoplay playsinline muted />
            <!-- 摄像头未就绪时的覆盖层 -->
            <div v-if="!camStream" class="absolute inset-0 rounded-xl bg-black/70 flex flex-col items-center justify-center text-white text-xs gap-1">
              <Icon name="camera" :size="20" class="opacity-60" />
              <span>摄像头{{ err && err.includes('摄像') ? '未授权' : '连接中…' }}</span>
            </div>
            <div class="text-xs text-muted text-center mt-1">你（摄像头）</div>
          </div>
        </div>
      </div>

      <!-- 对话流 -->
      <div class="px-5 py-4 space-y-4 max-h-[64vh] overflow-y-auto" ref="scrollEl">
        <template v-for="(m, i) in messages" :key="i">
          <div v-if="m.role === 'assistant'" class="flex gap-3">
            <div class="w-9 h-9 rounded-lg bg-brand-coral/15 text-brand-coral flex items-center justify-center shrink-0 mt-0.5"><Icon name="sparkles" :size="16" /></div>
            <div class="flex-1 min-w-0 space-y-2">
              <template v-if="m.score != null">
                <div class="inline-flex items-center gap-1 chip bg-emerald-500/10 text-emerald-600">
                  <Icon name="checkCircle" :size="13" /> 评分 {{ m.score }}/10
                </div>
                <div v-if="m.feedback" class="rounded-2xl rounded-tl-sm bg-emerald-500/[.06] border border-emerald-500/15 px-4 py-3 text-sm">
                  <div class="font-semibold text-emerald-700 mb-1 flex items-center gap-1"><Icon name="bulb" :size="13" /> 改进建议</div>
                  <p class="whitespace-pre-line text-sub">{{ m.feedback }}</p>
                </div>
                <div v-if="m.analysis" class="rounded-2xl rounded-tl-sm bg-sky-500/[.07] border border-sky-500/20 px-4 py-3 text-sm">
                  <div class="font-semibold text-sky-700 mb-1 flex items-center gap-1"><Icon name="book" :size="13" /> 答案解析</div>
                  <p class="whitespace-pre-line text-sub">{{ m.analysis }}</p>
                </div>
              </template>
              <div v-if="m.content" class="rounded-2xl rounded-tl-sm bg-ink/5 px-4 py-3 text-sm whitespace-pre-line">{{ m.content }}</div>
            </div>
          </div>
          <div v-else class="flex gap-3 flex-row-reverse">
            <div class="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5"><Icon name="user" :size="16" /></div>
            <div class="rounded-2xl rounded-tr-sm bg-brand-coral/10 px-4 py-3 text-sm whitespace-pre-line max-w-[85%]">{{ m.content }}</div>
          </div>
        </template>
      </div>

      <!-- 结束总结 -->
      <div v-if="phase === 'done'" class="px-5 py-4 border-t border-line bg-emerald-500/[.04]">
        <div class="flex items-center gap-2 font-bold mb-2"><Icon name="trophy" :size="18" class="text-amber-600" /> 面试完成 · 综合评分 {{ finalScore }}/100</div>
        <p class="text-sm whitespace-pre-line">{{ summary }}</p>
        <a-button class="mt-4" @click="reset">再来一场</a-button>
      </div>

      <!-- 作答输入 -->
      <div v-else class="p-5 border-t border-line flex gap-3 items-end">
        <!-- 实时模式：候选人字幕预览 + 文字兜底输入 -->
        <div v-if="mode === 'realtime'" class="flex-1 min-w-0">
          <p v-if="interimText" class="text-xs text-sub mb-1 truncate">你说（识别中）：{{ interimText }}</p>
          <a-textarea v-model:value="userAnswer" :rows="2" class="w-full resize-none" placeholder="可输入文字发送（或等待语音识别）" :disabled="evaluating" @keydown.ctrl.enter="submitAnswer" />
        </div>
        <a-textarea v-else v-model:value="userAnswer" :rows="3" class="flex-1 resize-none" :placeholder="mode === 'text' ? '输入你的回答…（不会也可直接写「不会」继续）' : '可语音作答，或在此输入…'" :disabled="evaluating || listening || recording" @keydown.ctrl.enter="submitAnswer" />
        <!-- 语音/视频模式：录音按钮 -->
        <a-button v-if="mode === 'voice' || mode === 'video' || mode === 'avatar'" type="primary" class="shrink-0" :class="(listening || recording) && 'btn-soft'" :disabled="evaluating || !consent || (listening || recording ? false : false)" :loading="listening || recording" @click="onVoiceButton">
          <template #icon><Icon :name="(listening || recording) ? 'pause' : 'mic'" :size="16" /></template>
          {{ voiceBtnLabel }}
        </a-button>
        <!-- 实时模式：打断按钮（AI 说话时出现） -->
        <a-button v-if="mode === 'realtime' && rtState === 'speaking'" type="primary" class="shrink-0" @click="manualBarge">打断</a-button>
        <span v-if="(mode === 'voice' || mode === 'video' || mode === 'avatar') && (listening || recording)" class="text-xs text-brand-coral shrink-0 animate-pulse">{{ listening ? '正在聆听…' : '录音中…' }}</span>
        <span v-else-if="mode === 'realtime' && rtState === 'speaking'" class="text-xs text-brand-coral shrink-0 animate-pulse">面试官正在说话…（开口即可打断）</span>
        <span v-else-if="mode === 'realtime'" class="text-xs text-sub shrink-0">{{ wsConnected ? '聆听中…' : '连接中…' }}</span>
        <a-button type="primary" class="shrink-0" :disabled="evaluating || !userAnswer.trim()" :loading="evaluating" @click="submitAnswer">
          提交
        </a-button>
      </div>
      <p v-if="mode === 'realtime' && !canBrowserStt" class="px-5 pb-1 text-xs text-muted">当前浏览器不支持本地语音识别（如 Safari / Firefox），实时模式将改用「服务端流式语音识别」（需服务端已配置 ASR；未配置时请手动输入或改用 Chrome / Edge）。</p>
      <p v-else-if="mode !== 'text' && !canBrowserStt" class="px-5 pb-1 text-xs text-muted">当前浏览器不支持本地语音识别（如 Safari / Firefox），将改用「录音上传识别」（需服务端已配置 ASR；若不可用请手动输入或改用 Chrome / Edge）。</p>
      <p v-if="err" class="px-5 pb-4 text-red-500 text-sm">{{ err }}</p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { useLipSync } from '~/composables/useLipSync'
const { request } = useApi()
const { guard } = useLoginGate()
const maxTurns = 6

// 支持从学习路径页等带 ?track= 跳入，直接进入对应方向的模拟面试
const route = useRoute()
const VALID_TRACKS = ['frontend', 'backend', 'devops', 'ai']
const qTrack = route.query.track

const vipOk = ref<boolean | null>(null)
const gate = ref<any>(null)
const phase = ref<'setup' | 'running' | 'done'>('setup')
const track = ref('frontend')
const level = ref('mid')
const goal = ref('')
if (typeof qTrack === 'string' && VALID_TRACKS.includes(qTrack)) { track.value = qTrack }
if (typeof route.query.goal === 'string') { goal.value = route.query.goal as string }
const starting = ref(false)
const evaluating = ref(false)
const err = ref('')

const sessionId = ref('')
const messages = ref<any[]>([])
const currentQuestion = ref('')
const userAnswer = ref('')
const turns = ref(0)
const finalScore = ref<number | null>(null)
const summary = ref('')
const scrollEl = ref<any>(null)

// 模式：文字 / 语音 / 实时 / 视频
const mode = ref<'text' | 'voice' | 'realtime' | 'video' | 'avatar'>('text')
const consent = ref(false)
// 未勾选同意时聚焦提示，引导用户先勾选再点麦克风（避免"无声无弹窗"困惑）
const consentHint = ref(false)

// ---- 面试官音色：暴露当前 provider 支持的全部音色（不再焊死 3 个） ----
// 挂载后用 /api/vip/interview/voices 返回的实际列表覆盖（含阿里云全部 CosyVoice / Piper 已装模型 / Edge 中文集）。
interface VoiceOption { id: string; label: string; gender: 'female' | 'male'; desc?: string; trait?: string; recommended?: boolean }
// 静态兜底列表（与服务端 VOICE_FALLBACK 一致）；挂载后会用 /api/vip/interview/voices 返回的实际可用列表覆盖。
const VOICE_FALLBACK: VoiceOption[] = [
  { id: 'huayan',   label: '华嫣', desc: '温柔知性女声（默认）', gender: 'female' },
  { id: 'xiao_ya',  label: '小雅', desc: '清亮自然女声',         gender: 'female' },
  { id: 'chaowen',  label: '朝文', desc: '沉稳磁性男声',         gender: 'male' }
]
// 实际渲染用的列表（来自服务端，仅含已下载的模型）
const voiceOptions = ref<VoiceOption[]>(VOICE_FALLBACK)
// 服务端 TTS 后端类型：'piper' | 'edge' | 'mock' | ''（未探测）
const ttsProvider = ref<string>('')
const selectedVoice = ref('huayan')
try {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ml_interview_voice') : null
  if (saved && VOICE_FALLBACK.some((v) => v.id === saved)) selectedVoice.value = saved
} catch {}

// 浏览器本地真实可用中文嗓音：仅用于 Piper 不可用时的离线兜底（系统默认嗓音，无多音色）。
const localVoices = ref<any[]>([])
function loadLocalVoices() {
  const synth = (window as any).speechSynthesis
  if (!synth) return
  const collect = () => {
    const vs = synth.getVoices?.() || []
    localVoices.value = vs.filter((v: any) => /zh|cmn/i.test(v.lang) || /Chinese/i.test(v.name))
  }
  collect()
  // 部分浏览器（如 Safari / 部分 Chrome）异步加载嗓音列表
  if (typeof synth.onvoiceschanged === 'object') {
    synth.onvoiceschanged = collect
  }
}
// 浏览器本地合成回退时，挑选一个中文嗓音（优先本机已装神经嗓音 → 有感情；否则任意中文/首个）。
// 注意：回退路径不提供"多音色"，只是系统默认嗓音；真正的多音色由服务端 Piper 提供。
// 关键：排除粤语(zh-HK)/台语(zh-TW)，优先普通话(zh-CN / zh-Hans)，避免"语音变粤语"的回退误选。
function pickBrowserVoice(): any {
  const vs = localVoices.value
  if (!vs.length) return null
  const isMandarin = (v: any) => {
    const lang = (v.lang || '').toLowerCase()
    const name = (v.name || '').toLowerCase()
    if (/zh-hk|zh-tw|yue|cantonese|hong kong|taiwan/i.test(lang + ' ' + name)) return false
    return /zh|cmn/i.test(lang) || /chinese/i.test(name)
  }
  const zh = vs.filter(isMandarin)
  const pool = zh.length ? zh : vs
  // 优先普通话(zh-CN / zh-Hans)，再优先有感情的神经嗓音（名字含 Online / Natural / Neural）
  const cn = pool.find((v: any) => /zh-cn|zh-hans/i.test(v.lang || ''))
  if (cn) return cn
  const neural = pool.find((v: any) => /online|natural|neural/i.test(v.name || ''))
  return neural || pool[0]
}
// 等待浏览器嗓音列表就绪（部分浏览器异步加载，避免"刷新后选 A 播 B"的时序错配）
function whenVoicesReady(cb: () => void) {
  const synth = (window as any).speechSynthesis
  if (!synth) { cb(); return }
  const vs = synth.getVoices?.() || []
  if (vs.length) { cb(); return }
  let done = false
  const run = () => { if (done) return; done = true; try { synth.removeEventListener('voiceschanged', run) } catch {}; cb() }
  try { synth.addEventListener('voiceschanged', run) } catch {}
  // 兜底超时，避免极端情况下永不回调
  setTimeout(run, 1000)
}

function applyVoice(id: string) {
  selectedVoice.value = id
  try { localStorage.setItem('ml_interview_voice', id) } catch {}
}
function currentVoiceMeta(): VoiceOption {
  return voiceOptions.value.find((v) => v.id === selectedVoice.value) || voiceOptions.value[0]
}
// TTS 后端状态：'piper' = 服务端本地神经网络（离线、一致）；'cloud' = 云端 Edge；'local' = 回退浏览器本地合成；'' = 未探测
const ttsBackend = ref<'piper' | 'cloud' | 'local' | ''>('')
// 试听状态（setup 页"试听"按钮）
const previewing = ref(false)
const femaleCount = computed(() => voiceOptions.value.filter((v) => v.gender === 'female').length)
const maleCount = computed(() => voiceOptions.value.filter((v) => v.gender === 'male').length)
// 试听当前选中的音色（用户主动手势，Autoplay 不会拦截）
function previewVoice() {
  previewing.value = true
  const sample = '你好，我是你的 AI 面试官，很高兴为你模拟这场面试，祝你发挥顺利。'
  // playTts 会按当前后端（云端/本地）播同样本，便于开面前确认音色
  playTts(sample)
  // 试听是一次性动作，约 3.5s 后解除 loading（不阻塞真正面试播放）
  setTimeout(() => { previewing.value = false }, 3500)
}

// 语音双通道：浏览器 Web Speech 优先；Safari / Firefox 不支持时回退 MediaRecorder → 服务端 ASR
const canBrowserStt = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
const listening = ref(false)
const recording = ref(false)
let recognition: any = null
let mediaRecorder: any = null
let recChunks: any[] = []
let camStream: MediaStream | null = null
const camVideoEl = ref<any>(null)

// ---- 实时模式（mode='realtime'）状态 ----
const rtActive = ref(false)                                   // ws 会话是否激活
const rtState = ref<'listening' | 'thinking' | 'speaking'>('listening')
const wsConnected = ref(false)
const rtSttAvailable = ref(true)                              // 浏览器是否支持 Web Speech
const interimText = ref('')                                  // 候选人流式转写预览
const candidateSpeaking = ref(false)                         // VAD 判定：候选人正在说话
const bargeSent = ref(false)                                  // 本轮已发过 speech_start（去抖）
let rtWs: any = null
let micStream: MediaStream | null = null
let analyser: any = null
let vadRaf = 0
let recognitionRt: any = null
let audioQueue: any[] = []                                    // ws 音频块解码后的播放队列
let isPlayingQueue = false
let playingSource: any = null
let lastAiToken = ''
let finalTurn = ''                                           // Web Speech 累积的候选人定稿
let rtProc = 0                                               // 已处理的 SpeechRecognition 结果数（避免重复发送）
let lastVoiceTs = 0
let lastFinalTs = 0
let rtLastScore: number | null = null
let rtSummary = ''
let rtIsLast = false
// 服务端 ASR 路径（无 Web Speech 的浏览器）采集状态
let serverAsrStream: MediaStream | null = null
let scriptNode: any = null
let lastAsrChunkTs = 0
const VAD_THRESHOLD = 0.04                                   // 音量 RMS 阈值（0~1）
const VAD_SILENCE_MS = 700                                  // 静音超过该值视为说话结束

// 面试官动画：随 TTS 振幅律动（P4 真实 RMS 口型）+ 实时字幕
const interviewerSpeaking = ref(false)
const speakingText = ref('')
const ttsError = ref('')          // TTS 播放失败时的可见提示
let audioCtx: any = null
let rafId = 0
let mouthTimer: any = null
// P4 口型引擎：把真实音频输出的 RMS 映射为嘴部开合度，驱动 DigitalHuman.vue
const lip = useLipSync(() => audioCtx)
// 预解锁音频上下文（必须在用户手势同步调用中，否则 Autoplay Policy 拦截）
function unlockAudio() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC || audioCtx) return
    audioCtx = new AC()
    // 创建一个静音振荡器"激活" AudioContext（一次性，之后所有音频可自由播放）
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    gain.gain.value = 0
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.01)
  } catch { /* 非关键路径 */ }
}
// 在任意用户交互时尽早解锁（mode 切换、consent 勾选、按钮点击均可触发）
const unlockListenersActive = ref(false)
function bindUnlockOnce() {
  if (unlockListenersActive.value || typeof window === 'undefined') return
  unlockListenersActive.value = true
  const once = () => { unlockAudio(); unbindUnlock() }
  const unbindUnlock = () => {
    document.removeEventListener('click', once, true)
    document.removeEventListener('touchend', once, true)
    unlockListenersActive.value = false
  }
  document.addEventListener('click', once, true)
  document.addEventListener('touchend', once, true)
}
const voiceBtnLabel = computed(() => {
  if (listening.value || recording.value) return '停止'
  return canBrowserStt ? '点击说话' : '录音作答'
})

// 浏览器内置 TTS 回退（SpeechSynthesis）：服务端 Edge TTS 不可用（如沙箱/网络/密钥问题）时，
// 用浏览器本地合成中文语音，彻底不依赖服务端，保证"听"一定可用。
// 注意：播完不清空 speakingText（语音模式下字幕是题目唯一展示位，避免"播完看不到题"）。
function speakFallback(text: string) {
  const synth = (window as any).speechSynthesis
  if (!synth) return
  // 回退前停掉真实音频口型引擎（若存在），避免 AnalyserNode RAF 与下方定时器动画争夺 mouthOpen
  lip.stop()
  // 等本机嗓音列表就绪，避免"刷新后选 A 却播默认 B"的时序错配
  whenVoicesReady(() => {
    try {
      synth.cancel() // 打断上一段
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'zh-CN'
      // 回退路径：挑选本机中文嗓音（优先神经嗓音），不提供多音色
      const voice = pickBrowserVoice()
      if (voice) u.voice = voice
      u.onstart = () => { interviewerSpeaking.value = true; startMouthAnim() }
      // 关键：播完仅停止律动，保留字幕（speakingText 不置空）
      u.onend = () => { interviewerSpeaking.value = false; stopMouthAnim(); ttsError.value = '' }
      u.onerror = () => { interviewerSpeaking.value = false; stopMouthAnim() }
      synth.speak(u)
      // onstart 在某些浏览器不可靠，兜底确保"正在讲话"状态立即生效
      interviewerSpeaking.value = true; startMouthAnim()
    } catch {
      interviewerSpeaking.value = false; stopMouthAnim()
    }
  })
}

// 用定时器模拟面试官口型律动（仅浏览器 SpeechSynthesis 回退路径用：本地合成无法取振幅，做平滑呼吸式动画）。
// 真实音频路径（服务端 Piper/云端 HTTP TTS、实时模式队列）由 lipSync 的 AnalyserNode 真驱动，不调用本函数。
function startMouthAnim() {
  stopMouthAnim()
  let t = 0
  mouthTimer = setInterval(() => { t += 0.4; lip.mouthOpen.value = 0.35 + 0.25 * Math.sin(t) }, 140)
}
function stopMouthAnim() {
  if (mouthTimer) { clearInterval(mouthTimer); mouthTimer = null }
  lip.mouthOpen.value = 0
}

// 朗读面试官文本（语音/视频/数字人模式触发）
// 优先服务端音频：本地 Piper 离线神经网络（默认）或云端 Edge TTS（多音色、有感情）；
// 失败/503/非音频 自动回退浏览器 SpeechSynthesis（不依赖服务端网络）。
// P4：服务端音频经 Web Audio AudioBufferSourceNode → AnalyserNode → destination 播放，
//     由 lipSync 取真实 RMS 驱动数字人嘴型（彻底替换旧版 Math.sin 假口型）。
// 关键：播完仅停止律动，保留字幕（speakingText 不置空），避免语音模式下"播完看不到题目"。
async function playTts(text: string) {
  if (!text || mode.value === 'text') return
  ttsError.value = ''
  speakingText.value = text
  interviewerSpeaking.value = true
  // 本会话已确认云端不可用（探测过返回 503/非音频）→ 跳过必败的服务端请求，直接本地合成，省去每题一次无效往返延迟
  if (ttsBackend.value === 'local') { speakFallback(text); return }
  const preset = currentVoiceMeta()
  const params = new URLSearchParams({ text: encodeURIComponent(text), cache: '1', t: String(Date.now()), voice: preset.id })
  try {
    const res = await fetch(`/api/vip/interview/tts?${params.toString()}`)
    const ctype = res.headers.get('Content-Type') || ''
    if (!res.ok || !ctype.startsWith('audio/')) {
      // 服务端不可用 → 浏览器本地合成回退（并标注后端，便于预期管理）
      ttsBackend.value = 'local'
      speakFallback(text)
      return
    }
    // 依据服务端 x-tts-provider 标注后端（piper=本地神经网络 / edge=云端）
    ttsBackend.value = ((res.headers.get('x-tts-provider') || '').toLowerCase() === 'piper') ? 'piper' : 'cloud'
    const blob = await res.blob()
    const ac = audioCtx
    if (!ac) { speakFallback(text); return }
    try { ac.resume?.() } catch {}
    // 解码为 AudioBuffer → 经 AnalyserNode 播放（真实 RMS 驱动嘴型）
    let buf: AudioBuffer
    try {
      const arr = await blob.arrayBuffer()
      buf = await ac.decodeAudioData(arr)
    } catch {
      speakFallback(text)
      return
    }
    const src = lip.playBuffer(buf)
    if (!src) { speakFallback(text); return }
    // 播完仅停止律动，保留字幕（speakingText 不置空）
    src.onended = () => { interviewerSpeaking.value = false; lip.stop(); ttsError.value = '' }
  } catch {
    // fetch 抛错（断网等）→ 回退浏览器合成
    ttsBackend.value = 'local'
    speakFallback(text)
  }
}

// 通道 A：浏览器端 SpeechRecognition（Chrome / Edge）
function startBrowserStt() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { err.value = '当前浏览器不支持语音识别，请改用 Chrome / Edge 或手动输入'; return }
  recognition = new SR()
  recognition.lang = 'zh-CN'
  recognition.interimResults = false
  recognition.continuous = false
  listening.value = true
  err.value = ''  // 清除旧错误，显示"正在聆听…"状态
  recognition.onresult = (e: any) => {
    const transcript = e.results?.[0]?.[0]?.transcript || ''
    if (transcript.trim()) {
      userAnswer.value = transcript.trim()
      listening.value = false
      submitAnswer()
    } else {
      err.value = '未识别到内容，请重试'
      listening.value = false
    }
  }
  recognition.onerror = (e: any) => {
    listening.value = false
    const msg = String(e?.error || '').toLowerCase()
    if (msg.includes('no-speech')) err.value = '未检测到语音，请说话后再试'
    else if (msg.includes('not-allowed') || msg.includes('permission'))
      err.value = '麦克风权限被拒绝：点击地址栏左侧的「🎙 麦克风」图标，选择「允许」本站点麦克风，再重试（此前若误选「阻止」，需先点地址栏图标改为允许）。'
    else err.value = '语音识别错误：' + (e?.error || '未知') + '，请重试或手动输入'
  }
  recognition.onend = () => { listening.value = false }
  try { recognition.start() } catch (e: any) {
    listening.value = false
    err.value = '无法启动语音识别：' + (e?.message || e)
  }
}

// 通道 B：MediaRecorder 录音 → /api/vip/interview/asr 转写（Safari / Firefox 回退）
async function startRecord() {
  try {
    recording.value = true
    err.value = ''  // 显示"录音中…"状态
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    recChunks = []
    mediaRecorder.ondataavailable = (e: any) => { if (e.data && e.data.size) recChunks.push(e.data) }
    mediaRecorder.onstop = async () => {
      recording.value = false
      stream.getTracks().forEach((t: any) => t.stop())
      const blob = new Blob(recChunks, { type: mediaRecorder.mimeType || 'audio/webm' })
      if (!blob.size) { err.value = '录音为空，请重试'; return }
      try {
        const fd = new FormData()
        const ext = (mediaRecorder.mimeType || '').includes('mp4') ? 'mp4' : 'webm'
        fd.append('audio', new File([blob], 'answer.' + ext, { type: blob.type || 'audio/webm' }))
        err.value = '正在识别…'
        const res = await fetch('/api/vip/interview/asr', { method: 'POST', body: fd })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          err.value = j.error || `语音识别失败(${res.status})` + (res.status === 503 ? '（服务端 ASR 未配置，请在 .env 设置 ASR_API_KEY）' : '，请改用文字输入或 Chrome / Edge')
          return
        }
        const j = await res.json()
        if (j.text && j.text.trim()) {
          userAnswer.value = j.text.trim()
          submitAnswer()
        } else {
          err.value = '未识别到内容，请重试或直接输入'
        }
      } catch (e: any) { err.value = '语音识别请求失败：' + (e?.message || e) }
    }
    mediaRecorder.start()
  } catch (e: any) {
    recording.value = false
    const msg = String(e?.message || e).toLowerCase()
    if (msg.includes('permission') || msg.includes('denied') || msg.includes('NotAllowedError'))
      err.value = '麦克风权限被拒绝：请在浏览器地址栏左侧点击「允许」麦克风权限'
    else
      err.value = '无法访问麦克风：' + (e?.message || e) + '（需 localhost/https 并允许权限）'
  }
}

// 语音作答按钮：根据浏览器能力选择通道
// 关键点：首次点击先主动用 getUserMedia 探测麦克风权限（会弹系统授权框），
// 避免"静默失败看不到弹窗"——若用户此前误选「阻止」，则给出明确的改路径指引。
async function onVoiceButton() {
  ttsError.value = ''
  err.value = ''
  // 停止中
  if (listening.value || recording.value) {
    if (canBrowserStt) { try { recognition?.stop() } catch {} }
    else try { mediaRecorder?.stop() } catch {}
    return
  }
  // 安全上下文检测：getUserMedia 仅在 localhost 或 https 下可用，局域网 IP 不会弹窗
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    err.value = '当前访问地址不是安全上下文（需用 http://localhost 或 https 访问，不能用局域网 IP），浏览器不会弹出麦克风授权。请改用 localhost 访问，或在下方文本框直接输入作答。'
    return
  }
  // 检查授权勾选：未勾选时给出醒目引导（不静默拦截），并自动聚焦到同意框
  if (!consent.value) {
    err.value = '请先勾选下方「同意开启麦克风」（或视频模式的摄像头/麦克风），勾选后点击麦克风按钮即会弹出系统授权框。'
    consentHint.value = true
    return
  }
  // 预解锁音频上下文
  unlockAudio()
  // 主动探测麦克风权限（仅取轨后立即停轨），强制浏览器弹窗或暴露真实状态
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
    probe.getTracks().forEach((t: any) => t.stop()) // 释放探测轨，真正录音时再取
  } catch (e: any) {
    const msg = String(e?.message || e).toLowerCase()
    if (msg.includes('notfound') || msg.includes('devices not found') || msg.includes('requested device not found')) {
      err.value = '未检测到麦克风设备：当前电脑没有连接麦克风（或被系统隐私禁用）。请接入麦克风后刷新，或直接在下方文本框输入。'
      return
    }
    if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowederror')) {
      err.value = '麦克风权限被拒绝：点击地址栏左侧「🎙 麦克风」图标，将本站点改为「允许」，再重试（此前若选过「阻止」，不会再次弹窗，需手动改）。'
      return
    }
    err.value = '无法访问麦克风：' + (e?.message || e) + '（需 localhost/https 并允许权限）'
    return
  }
  if (canBrowserStt) startBrowserStt()
  else startRecord()
}

// 视频模式：开启摄像头预览（带重试）
async function ensureCamera(retry = 0) {
  if (mode.value !== 'video') return
  if (!camVideoEl.value) {
    if (retry < 5) { await new Promise(r => setTimeout(r, 80)); return ensureCamera(retry + 1) }
    else { err.value = '摄像头元素未就绪，请刷新重试或改用语音模式'; return }
  }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 480 } }, audio: false })
    camVideoEl.value.srcObject = camStream
    // 部分浏览器需等 loadedmetadata 才真正渲染画面
    await new Promise<void>((resolve) => {
      const v = camVideoEl.value
      if (v.readyState >= 2) { resolve(); return }
      v.onloadedmetadata = () => resolve()
      setTimeout(resolve, 2000)
    })
  } catch (e: any) {
    const msg = String(e?.message || e).toLowerCase()
    if (msg.includes('permission') || msg.includes('denied') || msg.includes('NotAllowedError'))
      err.value = '摄像头权限被拒绝：请在浏览器地址栏左侧点击「允许」摄像头权限，或改用语音模式'
    else if (msg.includes('notfound') || msg.includes('notfound') || msg.includes('devices not found') || msg.includes('requested device not found'))
      err.value = '未检测到摄像头设备：当前电脑没有连接摄像头（或被系统隐私设置禁用）。请接入摄像头后刷新，或改用「语音模式」'
    else if (msg.includes('notreadable') || msg.includes('trackstart'))
      err.value = '摄像头被其他程序占用（如会议软件），请关闭后重试或改用语音模式'
    else
      err.value = '摄像头开启失败：' + (e?.message || e) + '（可改用语音模式）'
  }
}
function stopCamera() {
  camStream?.getTracks().forEach((t: any) => t.stop())
  camStream = null
}

// 重播：用户手动点击后重新播放（此时有用户手势，Autoplay 不拦截）。
// 直接复用 playTts 重新拉取并播放（服务端有音频缓存，秒级响应）；本地合成回退路径同理。
async function replayTts() {
  unlockAudio()
  ttsError.value = ''
  if (!speakingText.value) return
  playTts(speakingText.value)
}

useSeoMeta({
  title: 'AI 深度模拟面试 · MentorLoop',
  description: '多轮实战面试 + 逐题评分反馈，由大模型模拟真实技术面试官。',
  ogTitle: 'AI 模拟面试 · MentorLoop',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
const TRACK_NAMES: Record<string, string> = { frontend: '前端', backend: '后端', devops: '运维 / DevOps', ai: 'AI 工程' }
const LEVEL_NAMES: Record<string, string> = { junior: '初级', mid: '中级', senior: '高级' }
function trackName(t: string) { return TRACK_NAMES[t] || t }
function levelName(l: string) { return LEVEL_NAMES[l] || l }

function scrollToEnd() { nextTick(() => { scrollEl.value?.scrollTo({ top: 1e9, behavior: 'smooth' }) }) }

onMounted(async () => {
  // 尽早绑定音频上下文解锁（任意用户点击/触摸即可激活 AudioContext）
  bindUnlockOnce()
  // 加载浏览器本地中文嗓音列表（用于 Piper 不可用时的离线兜底）
  loadLocalVoices()
  // 拉取服务端实际可用的 Piper 音色列表（仅已下载的模型）与后端类型
  try {
    const vr: any = await request('/api/vip/interview/voices')
    if (vr?.voices?.length) {
      voiceOptions.value = vr.voices
      ttsProvider.value = vr.provider || ''
      if (!voiceOptions.value.some((v: any) => v.id === selectedVoice.value)) {
        selectedVoice.value = voiceOptions.value[0]?.id || 'huayan'
      }
    }
  } catch { /* 拉取失败则用静态兜底列表，不影响主流程 */ }
  if (await guard()) return
  try {
    const r: any = await request('/api/vip/status')
    if (r?.vip?.active) { vipOk.value = true }
    else {
      vipOk.value = false
      gate.value = { title: '该功能为 VIP 专属', desc: '开通会员后即可体验 AI 深度模拟面试，多轮实战 + 逐题评分。', to: '/vip', btn: '开通会员' }
    }
  } catch {
    vipOk.value = false
    gate.value = { title: '请先登录', desc: '登录后即可使用 AI 模拟面试功能。', to: '/login', btn: '登录 / 注册' }
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  stopMouthAnim()
  try { (window as any).speechSynthesis?.cancel?.() } catch {}
  try { audioCtx?.close() } catch {}
  stopCamera()
  closeRealtime()
})

async function start() {
  starting.value = true; err.value = ''
  if (mode.value !== 'text' && !consent.value) { err.value = '请先勾选设备授权'; starting.value = false; return }
  const consentAt = (mode.value !== 'text' && consent.value) ? Date.now() : null
  try {
    const r: any = await request('/api/vip/interview/start', { method: 'POST', body: { track: track.value, level: level.value, goal: goal.value, mode: mode.value, consentAt } })
    sessionId.value = r.sessionId
    currentQuestion.value = r.question
    // 文字模式：问题进对话流；语音/视频模式：问题仅显示在面试官面板（speakingText），避免重复
    messages.value = (mode.value === 'text') ? [{ role: 'assistant', content: r.question }] : []
    turns.value = 0
    phase.value = 'running'
    scrollToEnd()
    // 摄像头需等 v-if 渲染出 <video> 元素后再绑定
    if (mode.value === 'video') {
      await nextTick()
      await ensureCamera()
    }
    // TTS 必须在用户手势同步上下文中触发，否则 Autoplay Policy 会静默拦截
    if (mode.value === 'realtime') {
      // 清空转写缓冲，避免开场白被回声误识别为候选人回答
      finalTurn = ''
      interimText.value = ''
      playTts(r.question)
      connectRealtime()
    } else {
      playTts(r.question)
    }
  } catch (e: any) { err.value = e.message } finally { starting.value = false }
}

async function submitAnswer() {
  if (!userAnswer.value.trim()) return
  // 实时模式：文字输入走 ws 通道（与语音同一通道），不调用回合制 answer 接口
  if (mode.value === 'realtime') {
    const t = userAnswer.value.trim()
    userAnswer.value = ''
    sendWs({ type: 'speech_final', text: t })
    speakingText.value = ''
    rtState.value = 'thinking'
    return
  }
  if (evaluating.value) return
  const ans = userAnswer.value.trim()
  messages.value.push({ role: 'user', content: ans })
  evaluating.value = true; err.value = ''
  try {
    const r: any = await request('/api/vip/interview/answer', { method: 'POST', body: { sessionId: sessionId.value, answer: ans } })
    // 语音/视频模式：下一题仅通过面试官面板+TTS 展示，不重复推入对话流
    if (mode.value !== 'text' && !r.isLast && r.nextQuestion) {
      // 不 push assistant 消息，避免与 speakingText 重复
    } else {
      messages.value.push({ role: 'assistant', content: r.isLast ? '' : '下一题：' + r.nextQuestion, score: r.evaluation.score, feedback: r.evaluation.feedback, analysis: r.analysis || '' })
    }
    turns.value = r.turns
    currentQuestion.value = r.nextQuestion || (r.isLast ? '' : '（请尝试回答，或写「不会」继续）')
    userAnswer.value = ''
    if (r.isLast) { phase.value = 'done'; finalScore.value = r.score; summary.value = r.summary || '' }
    else { playTts(r.nextQuestion) }
    scrollToEnd()
  } catch (e: any) { err.value = e.message } finally { evaluating.value = false }
}

function reset() {
  closeRealtime()
  stopCamera()
  phase.value = 'setup'; sessionId.value = ''; messages.value = []; currentQuestion.value = ''; userAnswer.value = ''; turns.value = 0; finalScore.value = null; summary.value = ''
}

// ===== 实时模式（WebSocket 串联 STT→评测→TTS）=====
function sendWs(obj: any) {
  try { if (rtWs && rtWs.readyState === 1) rtWs.send(JSON.stringify(obj)) } catch { /* 连接异常忽略 */ }
}

function connectRealtime() {
  if (rtActive.value || !sessionId.value) return
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${location.host}/api/vip/interview/ws?sessionId=${encodeURIComponent(sessionId.value)}`
  let ws: any
  try { ws = new WebSocket(url) } catch { err.value = '无法建立实时连接'; return }
  rtWs = ws
  rtActive.value = true
  rtState.value = 'listening'
  ws.onopen = () => {
    wsConnected.value = true
    // 能力协商：声明本端 STT 能力（有 Web Speech 走浏览器本地转写，否则走服务端 ASR）
    if (!audioCtx) unlockAudio()
    sendWs({ type: 'hello', stt: canBrowserStt ? 'webspeech' : 'server', sampleRate: audioCtx?.sampleRate || 44100 })
    startVad()
    if (canBrowserStt) startRealtimeStt()
    else startRealtimeServerAsr()
  }
  ws.onmessage = (ev: any) => {
    let m: any
    try { m = JSON.parse(ev.data) } catch { return }
    onWsMessage(m)
  }
  ws.onclose = () => { wsConnected.value = false; stopVad(); stopRealtimeStt(); stopRealtimeServerAsr() }
  ws.onerror = () => { wsConnected.value = false }
}

function onWsMessage(m: any) {
  switch (m.type) {
    case 'pong': break
    case 'error': err.value = m.message; break
    case 'interim':
      messages.value.push({ role: 'user', content: m.text })
      scrollToEnd()
      break
    case 'asr_partial':
      // 服务端 ASR 流式中间结果：仅作实时字幕预览，不入库（定稿由 speech_final/interim 回显）
      interimText.value = m.text
      break
    case 'turn_eval':
      messages.value.push({ role: 'assistant', content: '', score: m.evaluation?.score, feedback: m.evaluation?.feedback, analysis: m.analysis || '' })
      rtLastScore = m.score ?? null
      rtSummary = m.summary || ''
      rtIsLast = !!m.isLast
      turns.value = turns.value + 1
      scrollToEnd()
      break
    case 'ai_token':
      // AI 开始口播：清空回声残留的候选人转写，逐句拼接字幕
      rtState.value = 'speaking'
      finalTurn = ''
      interimText.value = ''
      lastAiToken = m.text
      speakingText.value = speakingText.value ? speakingText.value + m.text : m.text
      break
    case 'audio':
      rtState.value = 'speaking'
      finalTurn = ''
      playAudioChunk(m.data, m.mime)
      break
    case 'barge_ack':
      stopAllPlayback()
      rtState.value = 'listening'
      speakingText.value = ''
      break
    case 'turn_end':
      if (rtIsLast) {
        phase.value = 'done'
        finalScore.value = rtLastScore
        summary.value = rtSummary
      } else {
        rtState.value = 'listening'
        speakingText.value = ''
      }
      break
  }
}

// 收到 TTS 音频块（base64）→ 解码入队 → 顺序播放
async function playAudioChunk(b64: string, mime: string) {
  if (!audioCtx) unlockAudio()
  const ac = audioCtx
  if (!ac) return
  try {
    const bin = atob(b64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    const buf = await ac.decodeAudioData(arr.buffer)
    audioQueue.push(buf)
    pumpQueue()
  } catch {
    // 解码失败：用浏览器本地合成兜底该句
    if (lastAiToken) speakFallback(lastAiToken)
  }
}
function pumpQueue() {
  if (isPlayingQueue || !audioQueue.length) return
  const buf = audioQueue.shift()
  isPlayingQueue = true
  interviewerSpeaking.value = true
  const src = audioCtx!.createBufferSource()
  src.buffer = buf
  // P4：音源经 AnalyserNode 播放，真实 RMS 驱动数字人嘴型
  lip.connectSource(src)
  playingSource = src
  src.onended = () => {
    isPlayingQueue = false
    playingSource = null
    if (audioQueue.length) pumpQueue()
    else { interviewerSpeaking.value = false; lip.stop() }
  }
  try { src.start() } catch { isPlayingQueue = false; playingSource = null; if (audioQueue.length) pumpQueue() }
}

// 停止一切播放（ws 音频队列 / 浏览器本地合成 / 真实口型引擎）
function stopAllPlayback() {
  isPlayingQueue = false
  try { playingSource?.stop() } catch {}
  playingSource = null
  audioQueue.length = 0
  try { (window as any).speechSynthesis?.cancel?.() } catch {}
  interviewerSpeaking.value = false
  lip.stop()
}

// VAD：Web Audio 音量阈值检测候选人说话起点（用于打断 AI），静音超时触发本轮定稿发送
async function startVad() {
  if (vadRaf) return
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
  } catch { err.value = '麦克风不可用，实时模式降级为文字输入（仍可手动发送）'; return }
  if (!audioCtx) unlockAudio()
  const ac = audioCtx
  if (!ac) return
  try {
    const src = ac.createMediaStreamSource(micStream)
    const an = ac.createAnalyser()
    an.fftSize = 1024
    src.connect(an)
    analyser = an
  } catch { return }
  lastVoiceTs = 0
  vadLoop()
}
function vadLoop() {
  if (!analyser) return
  const buf = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(buf)
  let sum = 0
  for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
  const rms = Math.sqrt(sum / buf.length)
  const now = performance.now()
  if (rms > VAD_THRESHOLD) {
    lastVoiceTs = now
    if (!candidateSpeaking.value) {
      candidateSpeaking.value = true
      // 仅当 AI 正在说话时才打断（开场白/回声不触发）
      if (rtState.value === 'speaking' && !bargeSent.value) {
        bargeSent.value = true
        sendWs({ type: 'speech_start' })
      }
    }
  } else if (candidateSpeaking.value && now - lastVoiceTs > VAD_SILENCE_MS) {
    candidateSpeaking.value = false
    bargeSent.value = false
    if (canBrowserStt) flushFinalTurn()              // Web Speech 路径：本地定稿经 ws 发送
    else sendWs({ type: 'speech_end_audio' })        // 服务端 ASR 路径：刷新服务端最终转写
  }
  // Web Speech 长时间未出定稿时的兜底（避免卡住不发，仅浏览器本地转写路径需要）
  if (canBrowserStt && finalTurn && !interviewerSpeaking.value && now - lastFinalTs > 2500) flushFinalTurn()
  vadRaf = requestAnimationFrame(vadLoop)
}
function stopVad() {
  if (vadRaf) { cancelAnimationFrame(vadRaf); vadRaf = 0 }
  micStream?.getTracks().forEach((t: any) => t.stop())
  micStream = null
  analyser = null
  candidateSpeaking.value = false
  bargeSent.value = false
}

// 浏览器 Web Speech 流式转写（Chrome / Edge）：interim 实时预览，final 累积进 finalTurn
function startRealtimeStt() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { rtSttAvailable.value = false; return }
  rtSttAvailable.value = true
  const rec = new SR()
  rec.lang = 'zh-CN'
  rec.interimResults = true
  rec.continuous = true
  rec.onresult = (e: any) => {
    if (!rtActive.value) return
    let interim = ''
    for (let i = rtProc; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) { finalTurn += r[0].transcript; lastFinalTs = performance.now() }
      else interim += r[0].transcript
    }
    rtProc = e.results.length
    // AI 说话时丢弃回声转写，避免误发
    if (!interviewerSpeaking.value) interimText.value = interim
  }
  rec.onerror = () => {}
  rec.onend = () => { if (rtSttAvailable.value && rtActive.value) { try { rec.start() } catch { /* 已停止 */ } } }
  recognitionRt = rec
  try { rec.start() } catch { /* 启动失败忽略 */ }
}
function stopRealtimeStt() {
  try { recognitionRt?.stop() } catch {}
  recognitionRt = null
}

// 服务端 ASR 采集路径（Safari / Firefox 等无 Web Speech 的浏览器）：
// 复用 VAD 已开的麦克风流（micStream），用 ScriptProcessor 读 16-bit PCM，~100ms 节流发 audio_chunk。
// 注意：ScriptProcessor 需连到 destination 才会触发 onaudioprocess，但需经零增益节点避免回声外放。
async function startRealtimeServerAsr() {
  rtSttAvailable.value = false
  // 复用 VAD 的麦克风流；若 VAD 尚未就绪则自行获取（权限已授权时浏览器不会再次弹窗）
  if (!micStream) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    } catch { err.value = '麦克风不可用，实时模式降级为文字输入（仍可手动发送）'; return }
  }
  if (!audioCtx) unlockAudio()
  const ac = audioCtx
  if (!ac) return
  try {
    const src = ac.createMediaStreamSource(micStream)
    const proc = ac.createScriptProcessor(4096, 1, 1)
    proc.onaudioprocess = (e: any) => {
      if (!rtActive.value) return
      const input = e.inputBuffer.getChannelData(0)
      const pcm = new Int16Array(input.length)
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]))
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      const now = performance.now()
      if (now - lastAsrChunkTs >= 100) {
        lastAsrChunkTs = now
        const bytes = new Uint8Array(pcm.buffer)
        let bin = ''
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
        sendWs({ type: 'audio_chunk', data: btoa(bin) })
      }
    }
    src.connect(proc)
    const zero = ac.createGain()
    zero.gain.value = 0
    proc.connect(zero)
    zero.connect(ac.destination)
    scriptNode = proc
  } catch { err.value = '音频采集失败，实时模式降级为文字输入（仍可手动发送）' }
}
function stopRealtimeServerAsr() {
  if (scriptNode) { try { scriptNode.disconnect() } catch {}; scriptNode = null }
  // micStream 由 stopVad 负责释放（VAD 与 ASR 共用同一路麦克风）
  serverAsrStream = null
}
// 把累积的候选人定稿经 ws 发送（AI 说话中不下发，避免回声误发）
function flushFinalTurn() {
  if (interviewerSpeaking.value) return
  if (finalTurn && finalTurn.trim()) {
    const t = finalTurn.trim()
    finalTurn = ''
    sendWs({ type: 'speech_final', text: t })
    speakingText.value = ''
    rtState.value = 'thinking'
  }
}
function manualBarge() {
  sendWs({ type: 'barge_in' })
  stopAllPlayback()
  rtState.value = 'listening'
  speakingText.value = ''
}
function closeRealtime() {
  rtActive.value = false
  try { rtWs?.close() } catch {}
  rtWs = null
  wsConnected.value = false
  stopVad()
  stopRealtimeStt()
  stopRealtimeServerAsr()
  audioQueue.length = 0
  isPlayingQueue = false
  playingSource = null
  finalTurn = ''
  interimText.value = ''
  rtState.value = 'listening'
}
</script>
