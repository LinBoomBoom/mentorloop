<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-1">AI 深度模拟面试</h1>
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
        </div>
        <a-tag class="!bg-ink/5 !text-sub" :bordered="false">第 {{ Math.min(turns + (phase==='done'?0:1), maxTurns) }} / {{ maxTurns }} 题</a-tag>
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
            <div class="w-9 h-9 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center shrink-0 mt-0.5"><Icon name="user" :size="16" /></div>
            <div class="rounded-2xl rounded-tr-sm bg-brand-coral/10 px-4 py-3 text-sm whitespace-pre-line max-w-[85%]">{{ m.content }}</div>
          </div>
        </template>
      </div>

      <!-- 结束总结 -->
      <div v-if="phase === 'done'" class="px-5 py-4 border-t border-line bg-emerald-500/[.04]">
        <div class="flex items-center gap-2 font-bold mb-2"><Icon name="trophy" :size="18" class="text-brand-gold" /> 面试完成 · 综合评分 {{ finalScore }}/100</div>
        <p class="text-sm whitespace-pre-line">{{ summary }}</p>
        <a-button class="mt-4" @click="reset">再来一场</a-button>
      </div>

      <!-- 作答输入 -->
      <div v-else class="p-5 border-t border-line flex gap-3 items-end">
        <a-textarea v-model:value="userAnswer" :rows="3" class="flex-1 resize-none" placeholder="输入你的回答…（不会也可直接写「不会」继续）" :disabled="evaluating" @keydown.ctrl.enter="submitAnswer" />
        <a-button type="primary" class="shrink-0" :disabled="evaluating || !userAnswer.trim()" :loading="evaluating" @click="submitAnswer">
          提交
        </a-button>
      </div>
      <p v-if="err" class="px-5 pb-4 text-red-500 text-sm">{{ err }}</p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
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

async function start() {
  starting.value = true; err.value = ''
  try {
    const r: any = await request('/api/vip/interview/start', { method: 'POST', body: { track: track.value, level: level.value, goal: goal.value } })
    sessionId.value = r.sessionId
    currentQuestion.value = r.question
    messages.value = [{ role: 'assistant', content: r.question }]
    turns.value = 0
    phase.value = 'running'
    scrollToEnd()
  } catch (e: any) { err.value = e.message } finally { starting.value = false }
}

async function submitAnswer() {
  if (!userAnswer.value.trim() || evaluating.value) return
  const ans = userAnswer.value.trim()
  messages.value.push({ role: 'user', content: ans })
  evaluating.value = true; err.value = ''
  try {
    const r: any = await request('/api/vip/interview/answer', { method: 'POST', body: { sessionId: sessionId.value, answer: ans } })
    messages.value.push({ role: 'assistant', content: r.isLast ? '' : '下一题：' + r.nextQuestion, score: r.evaluation.score, feedback: r.evaluation.feedback, analysis: r.analysis || '' })
    turns.value = r.turns
    currentQuestion.value = r.nextQuestion || (r.isLast ? '' : '（请尝试回答，或写「不会」继续）')
    userAnswer.value = ''
    if (r.isLast) { phase.value = 'done'; finalScore.value = r.score; summary.value = r.summary || '' }
    scrollToEnd()
  } catch (e: any) { err.value = e.message } finally { evaluating.value = false }
}

function reset() {
  phase.value = 'setup'; sessionId.value = ''; messages.value = []; currentQuestion.value = ''; userAnswer.value = ''; turns.value = 0; finalScore.value = null; summary.value = ''
}
</script>
