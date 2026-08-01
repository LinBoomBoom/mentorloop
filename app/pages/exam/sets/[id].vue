<template>
  <div>
    <!-- 返回 -->
    <NuxtLink to="/exam" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand-coral transition mb-5">
      <Icon name="arrowLeft" :size="16" /> 返回试卷列表
    </NuxtLink>

    <!-- 加载 -->
    <div v-if="phase === 'loading'" class="card h-64 shimmer"></div>

    <!-- 答题中 -->
    <div v-else-if="phase === 'take' && set" class="reveal">
      <!-- VIP 提示条 -->
      <div v-if="vipLocked" class="card p-4 mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 reveal">
        <Icon name="crown" :size="20" class="text-amber-500 shrink-0" />
        <div class="flex-1 text-sm">
          <span class="font-semibold text-amber-600">VIP 专属试卷</span> · {{ auth.isLoggedIn ? '开通会员即可交卷并查看复盘' : '登录并开通会员后开启' }}
        </div>
        <NuxtLink :to="auth.isLoggedIn ? '/vip' : ('/login?redirect=' + route.fullPath)" class="btn btn-primary !py-2 shrink-0">
          <Icon name="crown" :size="15" /> {{ auth.isLoggedIn ? '去开通' : '去登录' }}
        </NuxtLink>
      </div>

      <!-- 试卷信息条 -->
      <div class="card p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-extrabold">{{ set.name }}</h1>
          <p class="text-xs text-muted mt-1 flex items-center gap-3">
            <span class="chip" :style="{ color: meta.color, background: meta.bg }">{{ meta.name }}</span>
            <span>{{ set.level }}</span>
            <span class="flex items-center gap-1"><Icon name="layers" :size="13" /> 选择 {{ set.choices.length }}</span>
            <span class="flex items-center gap-1"><Icon name="pencil" :size="13" /> 笔试 {{ set.written.length }}</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg"
               :class="timeLeft <= 30 && dur ? 'text-rose-500 bg-rose-500/10 animate-pulse' : 'bg-ink/5'">
            <Icon name="clock" :size="17" /> {{ fmt(timeLeft) }}
          </div>
          <button class="btn btn-primary" @click="submit" :disabled="submitting || vipLocked">
            <Icon :name="submitting ? 'spinner' : 'check'" :size="16" :class="submitting ? 'animate-spin' : ''" /> 交卷
          </button>
        </div>
      </div>

      <p v-if="err" class="text-rose-500 text-sm mb-4">{{ err }}</p>

      <!-- 选择题 -->
      <h3 class="section-title mb-3">一、选择题（{{ set.choices.length }}）</h3>
      <div class="space-y-3 mb-8">
        <div v-for="(c, idx) in set.choices" :key="c.id" class="card p-5">
          <div class="flex items-start gap-3 mb-3">
            <span class="chip shrink-0" :class="c.multi ? 'bg-brand-pink/10 text-brand-pink' : 'bg-brand-coral/10 text-brand-coral'">
              {{ c.multi ? '多选' : '单选' }}
            </span>
            <p class="text-sm font-semibold leading-relaxed flex-1">
              <span class="text-muted mr-1">{{ idx + 1 }}.</span>{{ c.q }}
            </p>
            <span class="chip shrink-0 !py-0.5 text-[10px]">{{ c.tag }}</span>
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <button v-for="(opt, i) in c.options" :key="i"
                    @click="selectChoice(c, i)"
                    class="text-left px-3.5 py-2.5 rounded-xl border text-sm transition flex items-center gap-2.5"
                    :class="isSel(c, i)
                      ? (c.multi ? 'border-brand-pink/50 bg-brand-pink/5 text-brand-pink' : 'border-brand-coral/50 bg-brand-coral/5 text-brand-coral')
                      : 'border-line text-sub hover:border-ink/20 hover:bg-ink/5'">
              <span class="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold"
                    :class="isSel(c, i) ? (c.multi ? 'bg-brand-pink text-white' : 'bg-brand-coral text-white') : 'bg-ink/10 text-muted'">{{ optLabel(i) }}</span>
              <span class="flex-1">{{ opt }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 笔试题 -->
      <h3 class="section-title mb-3">二、笔试题（{{ set.written.length }}）</h3>
      <div class="space-y-3 mb-8">
        <div v-for="(w, idx) in set.written" :key="w.id" class="card p-5">
          <p class="text-sm font-semibold leading-relaxed mb-3">
            <span class="text-muted mr-1">{{ idx + 1 }}.</span>{{ w.q }}
          </p>
          <textarea v-model="writtenAnswers[w.id]" rows="4" class="input w-full resize-y"
                    placeholder="在此写下你的思路与作答…"></textarea>
        </div>
      </div>

      <div class="flex justify-end">
        <button class="btn btn-primary" @click="submit" :disabled="submitting || vipLocked">
          <Icon :name="submitting ? 'spinner' : 'check'" :size="16" :class="submitting ? 'animate-spin' : ''" /> 交卷并查看复盘
        </button>
      </div>
    </div>

    <!-- 复盘 -->
    <div v-else-if="phase === 'review' && record" class="reveal">
      <!-- 成绩卡 -->
      <div class="card p-7 mb-5 flex flex-col sm:flex-row items-center gap-7">
        <ProgressRing :value="record.score" :size="132" :stroke="13" :color="ringColor" label="得分" />
        <div class="flex-1 text-center sm:text-left">
          <div class="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span class="text-2xl font-extrabold gradient-text">{{ record.level }}</span>
            <span class="chip" :style="{ color: meta.color, background: meta.bg }">{{ meta.name }}</span>
            <span class="chip">{{ record.setName }}</span>
          </div>
          <p class="text-sm text-sub leading-relaxed max-w-xl">{{ record.advice }}</p>
          <div class="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
            <span class="text-xs text-muted">正确率</span>
            <span class="font-bold">{{ record.correct }}/{{ record.total }}</span>
            <span class="text-xs text-muted ml-2">用时</span>
            <span class="font-bold">{{ fmt(record.usedSeconds) }}</span>
          </div>
        </div>
        <button class="btn btn-ghost shrink-0" @click="retake"><Icon name="refresh" :size="16" /> 重做</button>
      </div>

      <!-- 薄弱点 -->
      <div v-if="record.weakPoints.length" class="card p-5 mb-5">
        <h3 class="section-title mb-3 flex items-center gap-2"><Icon name="target" :size="17" class="text-brand-gold" /> 薄弱知识点</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="w in record.weakPoints" :key="w.tag" class="chip bg-rose-500/10 text-rose-500">
            {{ w.tag }} · 错 {{ w.count }}
          </span>
        </div>
      </div>

      <!-- 选择题复盘 -->
      <h3 class="section-title mb-3">选择题复盘</h3>
      <div class="space-y-3 mb-8">
        <div v-for="(c, idx) in record.choiceReview" :key="c.id" class="card p-5" :class="c.right ? 'border-emerald-500/25' : 'border-rose-500/25'">
          <div class="flex items-start gap-3 mb-3">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  :class="c.right ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'">
              <Icon :name="c.right ? 'check' : 'x'" :size="15" />
            </span>
            <p class="text-sm font-semibold leading-relaxed flex-1">
              <span class="text-muted mr-1">{{ idx + 1 }}.</span>{{ c.q }}
            </p>
            <span class="chip shrink-0 !py-0.5 text-[10px]">{{ c.tag }}</span>
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <div v-for="(opt, i) in c.options" :key="i"
                 class="px-3.5 py-2.5 rounded-xl border text-sm flex items-center gap-2.5"
                 :class="optClass(c, i)">
              <span class="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold"
                    :class="optClass(c, i).includes('emerald') ? 'bg-emerald-500 text-white'
                      : optClass(c, i).includes('rose') ? 'bg-rose-500 text-white' : 'bg-ink/10 text-muted'">{{ optLabel(i) }}</span>
              <span class="flex-1">{{ opt }}</span>
            </div>
          </div>
          <div v-if="c.explain" class="mt-3 text-xs text-sub bg-ink/5 rounded-xl p-3 leading-relaxed">
            <span class="font-semibold text-brand-coral">解析：</span>{{ c.explain }}
          </div>
        </div>
      </div>

      <!-- 笔试题复盘 -->
      <h3 class="section-title mb-3">笔试题复盘</h3>
      <div class="space-y-3">
        <div v-for="(w, idx) in record.writtenReview" :key="w.id" class="card p-5">
          <p class="text-sm font-semibold leading-relaxed mb-3">
            <span class="text-muted mr-1">{{ idx + 1 }}.</span>{{ w.q }}
          </p>
          <div class="grid md:grid-cols-2 gap-3">
            <div class="rounded-xl p-3 bg-ink/[.04]">
              <div class="text-[11px] font-semibold text-muted mb-1.5">你的作答</div>
              <div class="text-sm whitespace-pre-wrap leading-relaxed">{{ w.userAnswer }}</div>
            </div>
            <div class="rounded-xl p-3 bg-brand-coral/[.06] border border-brand-coral/15">
              <div class="text-[11px] font-semibold text-brand-coral mb-1.5">参考要点</div>
              <div class="text-sm whitespace-pre-wrap leading-relaxed">{{ w.reference }}</div>
              <ul v-if="w.points?.length" class="mt-2 space-y-1">
                <li v-for="p in w.points" :key="p" class="text-xs text-sub flex items-start gap-1.5">
                  <Icon name="check" :size="13" class="text-emerald-500 mt-0.5 shrink-0" />{{ p }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const { guard } = useLoginGate()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const meta = computed(() => trackMeta[(record.value?.track) || (set.value?.track)] || trackMeta.frontend)

const phase = ref('loading')
const set = ref<any>(null)

useSeoMeta({
  title: computed(() => set.value ? set.value.name + ' · 模拟试卷' : '模拟试卷'),
  description: computed(() => set.value ? `${set.value.name}：含 ${set.value.choices.length} 道选择题与 ${set.value.written.length} 道笔试题，可免费预览全部题目。` : '限时模拟试卷，交卷出判分与复盘。'),
  ogTitle: computed(() => 'MentorLoop · ' + (set.value?.name || '模拟试卷')),
  ogDescription: computed(() => set.value ? `含 ${set.value.choices.length} 选择 + ${set.value.written.length} 笔试，免费预览。` : '模拟试卷'),
  ogType: 'article',
  ogUrl: safeOgUrl()
})
const record = ref<any>(null)
const err = ref('')
const submitting = ref(false)
const choiceAnswers = reactive<Record<string, any>>({})
const writtenAnswers = reactive<Record<string, any>>({})
const dur = ref(0)
const timeLeft = ref(0)
let timer: any = null

const vipLocked = computed(() => !!set.value?.vipOnly && !auth.isVip)

const optLabel = (i: number) => String.fromCharCode(65 + i)
const fmt = (s: number) => {
  s = Math.max(0, Math.floor(s))
  const m = Math.floor(s / 60), ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
const ringColor = computed(() => {
  const s = record.value?.score ?? 0
  return s >= 70 ? '#14b8a6' : s >= 50 ? '#f59e0b' : '#f43f5e'
})

function isSel(c: any, i: number) {
  if (c.multi) return (choiceAnswers[c.id] || []).includes(i)
  return choiceAnswers[c.id] === i
}
function selectChoice(c: any, i: number) {
  if (c.multi) {
    const arr = choiceAnswers[c.id] ? [...choiceAnswers[c.id]] : []
    const k = arr.indexOf(i)
    k >= 0 ? arr.splice(k, 1) : arr.push(i)
    choiceAnswers[c.id] = arr
  } else {
    choiceAnswers[c.id] = i
  }
}
function optClass(c: any, i: number) {
  const correct = c.answer.includes(i)
  const chosen = (c.userAnswer || []).includes(i)
  if (correct) return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600'
  if (chosen && !correct) return 'border-rose-500/40 bg-rose-500/5 text-rose-600'
  return 'border-line text-sub'
}

function startTimer() {
  stopTimer()
  if (!dur.value) { timeLeft.value = 0; return }
  timeLeft.value = dur.value * 60
  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) { stopTimer(); submit() }
  }, 1000)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

async function submit() {
  if (submitting.value) return
  if (guard()) return // 未登录 → 引导登录
  if (set.value?.vipOnly && !auth.isVip) { err.value = '该试卷为 VIP 专属，请先开通会员'; return }
  submitting.value = true; err.value = ''
  try {
    const res = await request('/api/exam/submit', {
      method: 'POST',
      body: { setId: set.value.id, choiceAnswers, writtenAnswers, usedSeconds: (dur.value ? dur.value * 60 - timeLeft.value : 0) }
    })
    record.value = res.record
    phase.value = 'review'
    stopTimer()
  } catch (e: any) { err.value = e.message || '交卷失败' } finally { submitting.value = false }
}

function retake() {
  record.value = null
  for (const k in choiceAnswers) delete choiceAnswers[k]
  for (const k in writtenAnswers) delete writtenAnswers[k]
  phase.value = 'take'
  if (import.meta.client) startTimer()
}

// 公开试卷：SSR 加载（预览题目），无需登录即可浏览
const { data: setRes } = await useFetch(() => '/api/exam/sets/' + route.params.id)
watch(setRes, (v: any) => {
  if (v?.set) {
    set.value = v.set
    dur.value = v.set.duration || 0
    if (!route.query.record && phase.value === 'loading') {
      phase.value = 'take'
      if (import.meta.client) startTimer()
    }
  }
}, { immediate: true })

// 历史复盘（需登录）：客户端拉取
onMounted(async () => {
  const recordId = route.query.record
  if (recordId) {
    try {
      const r: any = await request('/api/exam/records/' + recordId)
      record.value = r.record
      phase.value = 'review'
      stopTimer()
    } catch (e: any) { err.value = e.message || '加载复盘失败' }
  }
})
onBeforeUnmount(stopTimer)
</script>
