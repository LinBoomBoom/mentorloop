<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-1">AI 简历诊断</h1>
    <p class="text-muted text-sm mb-5">粘贴或上传你的简历，AI 从结构、亮点、短板、改进方向给出专业诊断。支持中文简历。</p>

    <!-- 未登录 / 非 VIP 门禁 -->
    <a-card v-if="gate" class="text-center" :body-style="{ padding: '32px' }">
      <div class="w-14 h-14 rounded-2xl bg-brand-coral/15 text-brand-coral flex items-center justify-center mx-auto mb-4"><Icon name="document" :size="26" /></div>
      <h3 class="font-bold text-lg mb-2">{{ gate.title }}</h3>
      <p class="text-sm text-muted mb-5">{{ gate.desc }}</p>
      <NuxtLink :to="gate.to"><a-button type="primary">{{ gate.btn }}</a-button></NuxtLink>
    </a-card>

    <div v-else>
      <!-- 输入 -->
      <a-card v-if="!result" :body-style="{ padding: '24px' }">
        <div class="flex items-start gap-2 mb-3 text-xs text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
          <Icon name="shield" :size="15" class="mt-0.5 shrink-0" />
          <span>系统会在诊断前<b>自动过滤</b>手机号、身份证、邮箱、住址、微信/QQ、银行卡等敏感信息，不会对其做分析或处理；仍建议上传脱敏版本。</span>
        </div>

        <!-- 文件上传（限 1 份） -->
        <div class="mb-3">
          <a-upload
            :before-upload="onBeforeUpload"
            :show-upload-list="false"
            :max-count="1"
            accept=".pdf,.doc,.docx,.txt,.md,.markdown,.text,.csv,.json,.log"
          >
            <a-button :loading="parsing"><Icon name="document" :size="15" /> 上传简历文件</a-button>
          </a-upload>
          <p v-if="uploadedFile" class="text-xs text-muted mt-2 flex items-center gap-2">
            <Icon name="document" :size="13" /> {{ uploadedFile.name }}
            <a-button type="link" size="small" @click="clearFile">移除</a-button>
          </p>
          <p v-if="truncatedHint" class="text-xs text-amber-600 mt-1">文件较长，已截取前 8000 字进行诊断。</p>
        </div>

        <a-textarea v-model:value="resume" :rows="14" :maxlength="8000" class="font-mono text-sm resize-y" placeholder="在此粘贴简历全文，或上传文件（建议 50–8000 字）…" />
        <div class="flex items-center justify-between mt-3">
          <span class="text-xs text-muted">{{ resume.length }} / 8000</span>
          <a-button type="primary" :disabled="diagnosing || resume.length < 50" :loading="diagnosing" @click="run">
            开始诊断
          </a-button>
        </div>
        <p v-if="err" class="text-red-500 text-sm mt-3">{{ err }}</p>
      </a-card>

      <!-- 结果 -->
      <div v-else class="space-y-4">
        <div v-if="redactItems.length" class="flex items-start gap-2 text-xs text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
          <Icon name="shield" :size="15" class="mt-0.5 shrink-0" />
          <span>已主动过滤 {{ result.redacted.total }} 处敏感信息（<template v-for="(it, i) in redactItems" :key="it.k">{{ it.label }} {{ it.count }}<span v-if="i < redactItems.length - 1"> · </span></template>），AI 不会对其做分析。</span>
        </div>

        <a-card :body-style="{ padding: '24px' }">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold">综合评分</h3>
            <a-button type="link" size="small" @click="reset">重新诊断</a-button>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-4xl font-extrabold" :class="scoreColor">{{ result.score }}</div>
            <div class="flex-1 h-3 rounded-full bg-ink/10 overflow-hidden">
              <div class="h-full rounded-full" :style="{ width: result.score + '%', background: 'linear-gradient(90deg,#ff5e7e,#ffc24b)' }"></div>
            </div>
          </div>
          <p v-if="result.summary" class="text-sm text-muted mt-3 whitespace-pre-line">{{ result.summary }}</p>
        </a-card>

        <a-card :body-style="{ padding: '24px' }">
          <h3 class="font-bold mb-2">结构评价</h3>
          <p class="text-sm text-muted whitespace-pre-line">{{ result.structure }}</p>
        </a-card>

        <div class="grid sm:grid-cols-2 gap-4">
          <a-card :body-style="{ padding: '24px' }">
            <h3 class="font-bold mb-2 text-emerald-600">亮点</h3>
            <ul class="space-y-1.5 text-sm list-disc pl-5">
              <li v-for="(s, i) in result.strengths" :key="i">{{ s }}</li>
            </ul>
          </a-card>
          <a-card :body-style="{ padding: '24px' }">
            <h3 class="font-bold mb-2 text-rose-500">短板</h3>
            <ul class="space-y-1.5 text-sm list-disc pl-5">
              <li v-for="(s, i) in result.weaknesses" :key="i">{{ s }}</li>
            </ul>
          </a-card>
        </div>

        <a-card :body-style="{ padding: '24px' }">
          <h3 class="font-bold mb-2">改进建议</h3>
          <ol class="space-y-1.5 text-sm list-decimal pl-5">
            <li v-for="(s, i) in result.improvements" :key="i">{{ s }}</li>
          </ol>
        </a-card>

        <a-card :body-style="{ padding: '24px' }">
          <h3 class="font-bold mb-2">建议主攻方向</h3>
          <p class="text-sm text-brand-coral font-semibold">{{ result.matchDirection }}</p>
        </a-card>

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
const parsing = ref(false)
const uploadedFile = ref<{ name: string } | null>(null)
const truncatedHint = ref(false)

const scoreColor = computed(() => result.value
  ? (result.value.score >= 70 ? 'text-emerald-600' : result.value.score >= 50 ? 'text-amber-500' : 'text-rose-500')
  : '')

const REDACT_LABELS: Record<string, string> = {
  phone: '手机号', idCard: '身份证', email: '邮箱', wechat: '微信/QQ', address: '住址', bankCard: '银行卡'
}
const redactItems = computed(() => {
  const r = result.value?.redacted
  if (!r || !r.total) return []
  return Object.keys(REDACT_LABELS)
    .filter((k) => (r as any)[k] > 0)
    .map((k) => ({ k, label: REDACT_LABELS[k], count: (r as any)[k] }))
})

const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'text', 'csv', 'json', 'log'])
function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

async function onBeforeUpload(file: any) {
  parsing.value = true; err.value = ''
  const ext = extOf(file.name || '')
  try {
    if (TEXT_EXT.has(ext)) {
      const txt = await file.text()
      resume.value = txt.replace(/\r\n/g, '\n').replace(/ /g, ' ').trim().slice(0, 8000)
      uploadedFile.value = { name: file.name }
      truncatedHint.value = txt.length > 8000
    } else {
      const fd = new FormData()
      fd.append('file', file)
      const r: any = await request('/api/vip/resume/parse', { method: 'POST', body: fd })
      resume.value = r.text
      truncatedHint.value = !!r.truncated
      uploadedFile.value = { name: r.fileName || file.name }
    }
  } catch (e: any) {
    err.value = e.message || '文件处理失败'
    uploadedFile.value = null
  } finally {
    parsing.value = false
  }
  return false
}
function clearFile() {
  uploadedFile.value = null
  truncatedHint.value = false
  resume.value = ''
}

useSeoMeta({
  title: 'AI 简历诊断 · MentorLoop',
  description: '由大模型对简历做结构、亮点、短板与改进方向的专业诊断，敏感信息自动脱敏。',
  ogTitle: 'AI 简历诊断 · MentorLoop',
  ogType: 'website',
  ogUrl: safeOgUrl()
})

onMounted(async () => {
  if (await guard()) return
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
function reset() { result.value = null; cached.value = false; resume.value = ''; uploadedFile.value = null; truncatedHint.value = false }
</script>
