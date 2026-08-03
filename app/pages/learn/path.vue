<template>
  <div class="max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-1">
      <h1 class="text-2xl font-extrabold">AI 个性化学习路径</h1>
      <button v-if="plan && vipOk" class="btn text-sm" :disabled="loading" @click="generate(true)"><Icon name="refresh" :size="15" /> {{ loading ? '生成中' : '重新生成' }}</button>
    </div>
    <p class="text-muted text-sm mb-5">基于你模拟考试的薄弱点，由大模型定制的有序进阶路线。</p>

    <!-- 门禁 -->
    <div v-if="gate" class="card p-8 text-center reveal">
      <div class="w-14 h-14 rounded-2xl bg-brand-coral/15 text-brand-coral flex items-center justify-center mx-auto mb-4"><Icon name="compass" :size="26" /></div>
      <h3 class="font-bold text-lg mb-2">{{ gate.title }}</h3>
      <p class="text-sm text-muted mb-5">{{ gate.desc }}</p>
      <NuxtLink :to="gate.to" class="btn btn-primary">{{ gate.btn }}</NuxtLink>
    </div>

    <!-- 加载 -->
    <div v-else-if="loading" class="card h-64 shimmer"></div>

    <!-- 无考试记录 -->
    <div v-else-if="noRecord" class="card p-8 text-center reveal">
      <div class="w-14 h-14 rounded-2xl bg-ink/5 flex items-center justify-center mx-auto mb-4"><Icon name="clipboard" :size="26" class="text-sub" /></div>
      <h3 class="font-bold mb-2">还没有可分析的答卷</h3>
      <p class="text-sm text-muted mb-5">完成至少一次模拟考试后，我们会根据你的薄弱点生成专属学习路径。</p>
      <NuxtLink to="/exam" class="btn btn-primary">去做一套模拟卷</NuxtLink>
    </div>

    <!-- 路径 -->
    <div v-else-if="plan" class="space-y-5">
      <div class="card p-5 border border-brand-coral/20 bg-brand-coral/[.03] reveal">
        <div class="flex items-center gap-2 mb-1.5 text-sm font-semibold text-brand-coral">
          <Icon name="target" :size="16" /> 方向：{{ trackName(plan.track) }}
          <span v-if="plan.cached" class="chip bg-ink/5 text-sub ml-1">已缓存</span>
        </div>
        <p class="text-sm whitespace-pre-line">{{ plan.plan.summary }}</p>
        <div v-if="plan.weakPoints?.length" class="flex flex-wrap gap-2 mt-3">
          <span v-for="w in plan.weakPoints" :key="w.tag" class="chip bg-red-500/10 text-red-500">弱：{{ w.tag }} ×{{ w.count }}</span>
        </div>
      </div>

      <div v-for="(m, i) in plan.plan.milestones" :key="i" class="card p-5 reveal">
        <div class="flex items-center gap-3 mb-3">
          <span class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-coral to-brand-gold text-white flex items-center justify-center text-sm font-bold shrink-0">{{ i + 1 }}</span>
          <h3 class="font-bold">{{ m.title }}</h3>
        </div>
        <p v-if="m.focus" class="text-xs text-muted mb-3">聚焦：{{ m.focus }}</p>
        <div v-if="m.chapters?.length" class="flex flex-wrap gap-2 mb-3">
          <NuxtLink v-for="c in m.chapters" :key="c" to="/learn" class="chip bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/15 transition">{{ c }}</NuxtLink>
        </div>
        <ul v-if="m.tasks?.length" class="space-y-1.5 text-sm">
          <li v-for="(t, j) in m.tasks" :key="j" class="flex items-start gap-2"><Icon name="checkCircle" :size="15" class="text-emerald-500 mt-0.5 shrink-0" /><span>{{ t }}</span></li>
        </ul>
      </div>
    </div>

    <p v-if="err" class="text-red-500 text-sm mt-4">{{ err }}</p>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const { guard } = useLoginGate()

const vipOk = ref(false)
const gate = ref<any>(null)
const loading = ref(true)
const plan = ref<any>(null)
const noRecord = ref(false)
const err = ref('')

useSeoMeta({
  title: 'AI 个性化学习路径 · MentorLoop',
  description: '基于模拟考试薄弱点，由大模型为你定制的专属进阶学习路线。',
  ogTitle: '学习路径 · MentorLoop',
  ogType: 'website',
  ogUrl: safeOgUrl()
})

const TRACK_NAMES: Record<string, string> = { frontend: '前端', backend: '后端', devops: '运维 / DevOps', ai: 'AI 工程' }
function trackName(t: string) { return TRACK_NAMES[t] || t }

async function generate(force = false) {
  loading.value = true; err.value = ''; noRecord.value = false
  try {
    const r: any = await request('/api/vip/path', { method: 'POST', body: { force } })
    plan.value = r
  } catch (e: any) {
    if (/至少一次模拟考试/.test(e.message)) noRecord.value = true
    else err.value = e.message
  } finally { loading.value = false }
}

onMounted(async () => {
  if (guard()) return
  try {
    const s: any = await request('/api/vip/status')
    if (!s?.vip?.active) {
      gate.value = { title: '该功能为 VIP 专属', desc: '开通会员后即可生成基于薄弱点的个性化学习路径。', to: '/vip', btn: '开通会员' }
      loading.value = false
      return
    }
    vipOk.value = true
    await generate(false)
  } catch {
    gate.value = { title: '请先登录', desc: '登录后即可使用 AI 学习路径功能。', to: '/login', btn: '登录 / 注册' }
    loading.value = false
  }
})
</script>
