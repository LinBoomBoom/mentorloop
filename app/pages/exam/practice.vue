<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-5">
      <h1 class="page-title flex items-center gap-2">
        <Icon name="target" :size="24" style="color:var(--brand)" /> 按技能自测
      </h1>
      <p class="text-muted text-sm mt-1.5">挑选一个技能点，针对性刷它对应的面试题。答完会回写你的「技能掌握度」，答错的题自动进入错题本做间隔复习。</p>
    </div>

    <!-- 无参数：选择方向 + 技能 -->
    <a-card v-if="!ready" :body-style="{ padding: '20px' }">
      <div class="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <div class="text-xs text-muted mb-1.5">技术方向</div>
          <a-select v-model:value="pickTrack" placeholder="选择方向">
            <a-select-option v-for="d in tracks" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
          </a-select>
        </div>
        <div>
          <div class="text-xs text-muted mb-1.5">技能点（关键词）</div>
          <a-input v-model:value="pickSkill" placeholder="如：React Hooks / 微服务 / RAG" allow-clear />
        </div>
      </div>
      <a-button type="primary" :loading="loading" :disabled="!pickTrack || !pickSkill" @click="start">开始自测</a-button>
    </a-card>

    <!-- 题目 -->
    <template v-else>
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-bold">
          {{ trackName }} · <span class="text-brand-coral">{{ skillName }}</span>
          <span class="text-xs text-muted font-normal ml-1">{{ questions.length }} 题</span>
        </div>
        <a-button size="small" type="link" @click="reset">重新选择</a-button>
      </div>

      <div v-if="loading" class="text-center text-muted py-16">加载题目中…</div>
      <a-empty v-else-if="!questions.length" description="该技能点暂无对应面试题" class="py-16" />

      <div v-else class="space-y-3">
        <div v-for="(q, i) in questions" :key="q.id" class="rounded-2xl border border-line bg-surface p-4">
          <div class="flex items-start gap-2">
            <span class="text-xs font-bold text-muted mt-0.5 tabular-nums shrink-0">#{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-[14px] leading-snug text-ink font-medium">{{ q.q }}</div>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full"
                      :class="q.difficulty === 'hard' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                            : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400'">
                  {{ q.difficulty === 'hard' ? '困难' : q.difficulty === 'medium' ? '较难' : '常规' }}
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-coral/10 text-brand-coral">{{ q.tech }}</span>
              </div>

              <!-- 答案（点击显示）-->
              <div v-if="state[q.id]?.revealed" class="mt-3 rounded-r-lg border-l-2 border-brand-coral/60 bg-brand-coral/[.04] p-3 text-[13px] prose-dm" v-html="md(q.a)"></div>

              <div class="flex items-center gap-2 mt-3">
                <a-button v-if="!state[q.id]?.revealed" size="small" @click="reveal(q.id)">显示答案</a-button>
                <template v-else-if="!state[q.id]?.rated">
                  <span class="text-xs text-muted">你会了吗？</span>
                  <a-button size="small" type="primary" @click="rate(q, true)"><Icon name="check" :size="13" /> 我会了</a-button>
                  <a-button size="small" danger @click="rate(q, false)"><Icon name="x" :size="13" /> 还不会</a-button>
                </template>
                <span v-else class="text-xs font-semibold"
                      :class="state[q.id]?.rated === 'correct' ? 'text-emerald-600' : 'text-rose-600'">
                  {{ state[q.id]?.rated === 'correct' ? '✓ 已掌握这道题' : '✗ 已记入错题本' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 提交 -->
      <div v-if="questions.length" class="sticky bottom-16 sm:bottom-4 mt-5 flex items-center justify-between rounded-2xl border border-line bg-surface/95 backdrop-blur px-4 py-3">
        <div class="text-xs text-muted">已自评 {{ ratedCount }}/{{ questions.length }}</div>
        <a-button type="primary" :loading="submitting" :disabled="ratedCount === 0" @click="submit">提交自测</a-button>
      </div>

      <!-- 结果 -->
      <a-card v-if="result" class="mt-5" :body-style="{ padding: '20px' }">
        <div class="flex items-center gap-3">
          <div class="text-3xl font-extrabold" :style="{ color: result.correct >= result.total * 0.6 ? '#10b981' : 'var(--brand)' }">{{ Math.round(result.correct / result.total * 100) }}%</div>
          <div class="text-sm">
            <div class="font-bold">自测完成</div>
            <div class="text-muted">答对 {{ result.correct }} / {{ result.total }}；{{ result.total - result.correct }} 题进入错题本</div>
          </div>
        </div>
        <a-divider />
        <p class="text-xs text-muted">掌握度已回写「技能路线图 → 我的掌握度」。去 <NuxtLink to="/wrong" class="text-brand-coral">错题本</NuxtLink> 做间隔复习吧。</p>
      </a-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { App } from 'ant-design-vue'
import { useMarkdown } from '~/composables/useMarkdown'
const { md } = useMarkdown()
const { message } = App.useApp()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { request } = useApi()

const tracks = [
  { id: 'frontend', name: '前端开发' },
  { id: 'backend', name: '后端开发' },
  { id: 'devops', name: '运维 / DevOps' },
  { id: 'ai', name: 'AI 工程' }
]
const trackNameMap: Record<string, string> = Object.fromEntries(tracks.map(t => [t.id, t.name]))

const track = ref<string>((route.query.track as string) || '')
const subtrack = ref<string>((route.query.subtrack as string) || '')
const skillName = ref<string>((route.query.skill as string) || '')
const ready = computed(() => !!track.value && !!skillName.value)

const pickTrack = ref<string>('')
const pickSkill = ref<string>('')
const loading = ref(false)
const questions = ref<any[]>([])
const state = ref<Record<string, { revealed?: boolean; rated?: 'correct' | 'wrong' }>>({})
const submitting = ref(false)
const result = ref<any>(null)

const ratedCount = computed(() => Object.values(state.value).filter(s => s.rated).length)
const trackName = computed(() => trackNameMap[track.value] || track.value)

async function load() {
  loading.value = true
  questions.value = []
  state.value = {}
  result.value = null
  try {
    const r: any = await request(`/api/interview/${track.value}?skill=${encodeURIComponent(skillName.value)}&pageSize=30`)
    questions.value = (r?.bank?.items || []).map((it: any) => ({ ...it, _open: false }))
  } catch (e: any) {
    message.error(e.message || '加载失败')
  } finally { loading.value = false }
}
function start() {
  track.value = pickTrack.value
  skillName.value = pickSkill.value.trim()
  router.replace({ query: { track: track.value, subtrack: subtrack.value, skill: skillName.value } })
  load()
}
function reset() {
  track.value = ''
  skillName.value = ''
  questions.value = []
  result.value = null
}
function reveal(id: string) { state.value = { ...state.value, [id]: { ...state.value[id], revealed: true } } }
function rate(q: any, correct: boolean) {
  state.value = { ...state.value, [q.id]: { ...state.value[q.id], rated: correct ? 'correct' : 'wrong' } }
}
async function submit() {
  submitting.value = true
  const answers = questions.value
    .filter(q => state.value[q.id]?.rated)
    .map(q => ({ id: q.id, q: q.q, answer: q.a, correct: state.value[q.id]?.rated === 'correct' }))
  try {
    const r: any = await request('/api/exam/practice', { method: 'POST', body: { track: track.value, subtrack: subtrack.value, skill: skillName.value, answers } })
    result.value = { correct: r.correct, total: r.total }
  } catch (e: any) {
    message.error(e.message || '提交失败')
  } finally { submitting.value = false }
}

onMounted(() => { if (ready.value) load() })

useSeoMeta({ title: '按技能自测 · MentorLoop', description: '挑选技能点针对性自测，回写掌握度并沉淀错题本。' })
</script>
