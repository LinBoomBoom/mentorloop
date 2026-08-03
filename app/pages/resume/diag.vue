<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-1">AI 简历诊断</h1>
    <p class="text-muted text-sm mb-5">粘贴你的简历，AI 从结构、亮点、短板、改进方向给出专业诊断。支持中文简历。</p>

    <!-- 未登录 / 非 VIP 门禁 -->
    <div v-if="gate" class="card p-8 text-center reveal">
      <div class="w-14 h-14 rounded-2xl bg-brand-coral/15 text-brand-coral flex items-center justify-center mx-auto mb-4"><Icon name="document" :size="26" /></div>
      <h3 class="font-bold text-lg mb-2">{{ gate.title }}</h3>
      <p class="text-sm text-muted mb-5">{{ gate.desc }}</p>
      <NuxtLink :to="gate.to" class="btn btn-primary">{{ gate.btn }}</NuxtLink>
    </div>

    <div v-else>
      <!-- 输入 -->
      <div v-if="!result" class="card p-6 reveal">
        <div class="flex items-start gap-2 mb-3 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
          <Icon name="shield" :size="15" class="mt-0.5 shrink-0" />
          <span>请勿粘贴真实手机号、身份证号、家庭住址等敏感信息；诊断内容会经大模型云端处理，请使用脱敏版本。</span>
        </div>
        <textarea v-model="resume" rows="14" maxlength="8000" class="input w-full resize-y font-mono text-sm" placeholder="在此粘贴简历全文（建议 50–8000 字）…"></textarea>
        <div class="flex items-center justify-between mt-3">
          <span class="text-xs text-muted">{{ resume.length }} / 8000</span>
          <button class="btn btn-primary" :disabled="diagnosing || resume.length < 50" @click="run">
            <Icon name="sparkles" :size="16" /> {{ diagnosing ? '诊断中…' : '开始诊断' }}
          </button>
        </div>
        <p v-if="err" class="text-red-500 text-sm mt-3">{{ err }}</p>
      </div>

      <!-- 结果 -->
      <div v-else class="space-y-4 reveal">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold">综合评分</h3>
            <button class="text-sm text-brand-coral font-semibold" @click="reset">重新诊断</button>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-4xl font-extrabold" :class="scoreColor">{{ result.score }}</div>
            <div class="flex-1 h-3 rounded-full bg-ink/10 overflow-hidden">
              <div class="h-full rounded-full" :style="{ width: result.score + '%', background: 'linear-gradient(90deg,#ff5e7e,#ffc24b)' }"></div>
            </div>
          </div>
          <p v-if="result.summary" class="text-sm text-muted mt-3 whitespace-pre-line">{{ result.summary }}</p>
        </div>

        <div class="card p-6">
          <h3 class="font-bold mb-2">结构评价</h3>
          <p class="text-sm text-muted whitespace-pre-line">{{ result.structure }}</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="card p-6">
            <h3 class="font-bold mb-2 text-emerald-600">亮点</h3>
            <ul class="space-y-1.5 text-sm list-disc pl-5">
              <li v-for="(s, i) in result.strengths" :key="i">{{ s }}</li>
            </ul>
          </div>
          <div class="card p-6">
            <h3 class="font-bold mb-2 text-rose-500">短板</h3>
            <ul class="space-y-1.5 text-sm list-disc pl-5">
              <li v-for="(s, i) in result.weaknesses" :key="i">{{ s }}</li>
            </ul>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="font-bold mb-2">改进建议</h3>
          <ol class="space-y-1.5 text-sm list-decimal pl-5">
            <li v-for="(s, i) in result.improvements" :key="i">{{ s }}</li>
          </ol>
        </div>

        <div class="card p-6">
          <h3 class="font-bold mb-2">建议主攻方向</h3>
          <p class="text-sm text-brand-coral font-semibold">{{ result.matchDirection }}</p>
        </div>

        <p v-if="cached" class="text-xs text-muted text-center">（本次为缓存结果，7 天内相同简历不再消耗额度）</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const { guard } = useLoginGate()
const gate = ref<any>(null)
const resume = ref('')
const diagnosing = ref(false)
const result = ref<any>(null)
const cached = ref(false)
const err = ref('')

const scoreColor = computed(() => result.value
  ? (result.value.score >= 70 ? 'text-emerald-600' : result.value.score >= 50 ? 'text-amber-500' : 'text-rose-500')
  : '')

useSeoMeta({
  title: 'AI 简历诊断 · MentorLoop',
  description: '由大模型对简历做结构、亮点、短板与改进方向的专业诊断。',
  ogTitle: 'AI 简历诊断 · MentorLoop',
  ogType: 'website',
  ogUrl: safeOgUrl()
})

onMounted(async () => {
  if (guard()) return
  try {
    const r: any = await request('/api/vip/status')
    if (!r?.vip?.active) {
      gate.value = { title: '该功能为 VIP 专属', desc: '开通会员后即可使用 AI 简历诊断，由大模型给出专业优化建议。', to: '/vip', btn: '开通会员' }
    }
  } catch {
    gate.value = { title: '请先登录', desc: '登录后即可使用简历诊断功能。', to: '/login', btn: '登录 / 注册' }
  }
})

async function run() {
  if (resume.value.length < 50 || diagnosing.value) return
  diagnosing.value = true; err.value = ''
  try {
    const r: any = await request('/api/vip/resume', { method: 'POST', body: { resume: resume.value } })
    result.value = r.result
    cached.value = !!r.cached
  } catch (e: any) { err.value = e.message } finally { diagnosing.value = false }
}
function reset() { result.value = null; cached.value = false; resume.value = '' }
</script>
