<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-1">
      <h1 class="page-title">AI 个性化学习路径</h1>
    </div>
    <p class="text-muted text-sm mb-4">基于你模拟考试的薄弱点，由大模型定制的有序进阶路线。切换方向可动态生成对应路径。</p>

    <!-- 方向选择 -->
    <div v-if="vipOk && !noRecord" class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="t in TRACKS"
        :key="t"
        class="chip-tab"
        :class="selectedTrack === t ? 'chip-tab-active' : ''"
        :disabled="pendingTrack === t"
        @click="selectTrack(t)"
      ><Icon v-if="pendingTrack === t" name="spinner" :size="14" class="animate-spin" /><span>{{ trackName(t) }}</span></button>
    </div>

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
    <div v-else-if="plan" class="relative">
      <!-- 切换方向时的轻量加载态：保留旧内容，仅叠加遮罩与 spinner，避免整页空白闪一下 -->
      <div v-if="switching" class="absolute inset-0 z-10 flex items-start justify-center pt-10 bg-white/55 backdrop-blur-[1px] rounded-2xl">
        <div class="flex items-center gap-2 text-sm text-brand-coral font-medium">
          <Icon name="spinner" :size="18" class="animate-spin" /> 正在为你生成「{{ trackName(pendingTrack || plan.track) }}」路径…
        </div>
      </div>
      <div :class="switching ? 'opacity-60 pointer-events-none select-none' : ''" class="space-y-5 transition-opacity">
      <!-- AI 教学联动：把纯文本路径变成可执行的练习入口 -->
      <div class="card p-5 border border-brand-coral/20 bg-gradient-to-br from-brand-coral/[.06] to-transparent reveal">
        <div class="flex items-center gap-2 mb-2 text-sm font-semibold text-brand-coral">
          <Icon name="sparkles" :size="16" /> 把这条路径用起来
        </div>
        <p class="text-sm text-muted mb-3">光看路径不够——用 AI 教学把它变成真本事：针对「{{ trackName(plan.track) }}」方向做模拟面试，或就路径里的卡点向 AI 提问。</p>
        <div class="flex flex-wrap gap-2">
          <NuxtLink :to="`/interview/sim?track=${plan.track}`" class="btn btn-primary"><Icon name="chat" :size="15" /> AI 模拟面试（{{ trackName(plan.track) }}）</NuxtLink>
          <NuxtLink :to="`/interview?askTrack=${plan.track}`" class="btn btn-soft"><Icon name="send" :size="15" /> 向 AI 提问答疑</NuxtLink>
        </div>
      </div>

      <div class="card p-5 border border-brand-coral/20 bg-brand-coral/[.03] reveal">
        <div class="flex items-center gap-2 mb-1.5 text-sm font-semibold text-brand-coral">
          <Icon name="target" :size="16" /> 方向：{{ trackName(plan.track) }}
          <span v-if="plan.cached" class="chip bg-ink/5 text-sub ml-1">已缓存</span>
          <span v-if="plan.inferred" class="chip bg-amber-500/10 text-amber-600 ml-1">跨方向推断</span>
        </div>
        <p class="text-sm whitespace-pre-line">{{ plan.plan.summary }}</p>
        <div v-if="plan.weakPoints?.length" class="flex flex-wrap gap-2 mt-3">
          <span v-for="w in plan.weakPoints" :key="w.tag" class="chip bg-red-500/10 text-red-500">弱：{{ w.tag }} ×{{ w.count }}</span>
        </div>
        <p v-if="plan.inferred" class="text-xs text-amber-600 mt-3">该方向暂无你的作答记录，已结合全部方向的作答为你推断，结果仅供参考；做一次该方向的模拟卷后会更精准。</p>
      </div>

      <div v-for="(m, i) in plan.plan.milestones" :key="i" class="card p-5 reveal">
        <div class="flex items-center gap-3 mb-3">
          <span class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-coral to-brand-gold text-white flex items-center justify-center text-sm font-bold shrink-0">{{ i + 1 }}</span>
          <h3 class="font-bold">{{ m.title }}</h3>
        </div>
        <p v-if="m.focus" class="text-xs text-muted mb-3">聚焦：{{ m.focus }}</p>
        <div v-if="m.chapterLinks?.length" class="flex flex-wrap gap-2 mb-3">
          <template v-for="c in m.chapterLinks" :key="c.title">
            <NuxtLink v-if="c.moduleId" :to="`/learn/${c.moduleId}/${c.chapterId}`" class="chip bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/15 transition">{{ c.title }}</NuxtLink>
            <span v-else class="chip bg-ink/5 text-sub">{{ c.title }}</span>
          </template>
        </div>
        <ul v-if="m.tasks?.length" class="space-y-1.5 text-sm">
          <li v-for="(t, j) in m.tasks" :key="j" class="flex items-start gap-2"><Icon name="checkCircle" :size="15" class="text-emerald-500 mt-0.5 shrink-0" /><span>{{ t }}</span></li>
        </ul>
        <div v-if="m.interviewGoal" class="mt-3 pt-3 border-t border-dashed border-ink/10">
          <NuxtLink :to="`/interview/sim?track=${plan.track}`" class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-coral hover:underline"><Icon name="chat" :size="13" /> AI 模拟面试：{{ m.interviewGoal }}</NuxtLink>
        </div>
      </div>
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
const loading = ref(true)      // 仅首次加载用整页骨架
const switching = ref(false)   // 切 tab 用轻量加载态（保留旧内容，不整页空白）
const pendingTrack = ref('')   // 正在加载的方向
const plan = ref<any>(null)
const noRecord = ref(false)
const err = ref('')
const selectedTrack = ref<string>('')

// 前端按方向缓存：切回已加载过的方向零延迟，无需再请求/再空白
const plansCache = reactive<Record<string, any>>({})

const TRACKS = ['frontend', 'backend', 'devops', 'ai'] as const
const TRACK_NAMES: Record<string, string> = { frontend: '前端', backend: '后端', devops: '运维 / DevOps', ai: 'AI 工程' }
function trackName(t: string) { return TRACK_NAMES[t] || t }

useSeoMeta({
  title: 'AI 个性化学习路径 · MentorLoop',
  description: '基于模拟考试薄弱点，由大模型为你定制的专属进阶学习路线，可切换方向并联动 AI 教学。',
  ogTitle: '学习路径 · MentorLoop',
  ogType: 'website',
  ogUrl: safeOgUrl()
})

// 生成/获取学习路径；不传 track 时由后端按作答推断主方向，传 track 时按方向切缓存动态切换
async function generate(track?: string, force = false) {
  err.value = ''; noRecord.value = false
  const key = track || ''
  // 命中前端缓存 → 立即切换，零等待、零空白
  if (!force && plansCache[key]) {
    plan.value = plansCache[key]
    selectedTrack.value = plansCache[key].track
    switching.value = false
    pendingTrack.value = ''
    return
  }
  // 切 tab 时保留旧内容（仅首次加载才用整页骨架），用轻量遮罩提示加载中
  if (plan.value && track) { switching.value = true; pendingTrack.value = track }
  else loading.value = true
  try {
    const body: any = { force }
    if (track) body.track = track
    const r: any = await request('/api/vip/path', { method: 'POST', body })
    plansCache[key] = r
    plan.value = r
    selectedTrack.value = r.track
  } catch (e: any) {
    if (/至少一次模拟考试/.test(e.message)) noRecord.value = true
    else err.value = e.message
  } finally {
    loading.value = false
    switching.value = false
    pendingTrack.value = ''
  }
}

function selectTrack(t: string) {
  if (t === selectedTrack.value && !switching.value) return
  generate(t)
}

onMounted(async () => {
  if (await guard()) return
  try {
    const s: any = await request('/api/vip/status')
    if (!s?.vip?.active) {
      gate.value = { title: '该功能为 VIP 专属', desc: '开通会员后即可生成基于薄弱点的个性化学习路径。', to: '/vip', btn: '开通会员' }
      loading.value = false
      return
    }
    vipOk.value = true
    await generate() // 不传方向 → 后端按作答推断主方向
  } catch {
    gate.value = { title: '请先登录', desc: '登录后即可使用 AI 学习路径功能。', to: '/login', btn: '登录 / 注册' }
    loading.value = false
  }
})
</script>
