<template>
  <div>
    <!-- 交卷中全屏遮罩：避免「只有按钮在转圈」的无反馈感 -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="submitting" class="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <a-card class="text-center max-w-[280px]" :body-style="{ padding: '32px 36px' }">
            <a-spin size="large" />
            <div class="font-bold mt-5">正在判分并生成复盘…</div>
            <p class="text-xs text-muted mt-1.5 leading-relaxed">
              已提交 {{ answeredCount }} / {{ totalCount }} 题<br />请勿关闭页面
            </p>
          </a-card>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- 返回 -->
    <Breadcrumb :items="[{ label: '模拟答卷', to: '/exam', icon: 'clipboard' }, { label: set?.name || '' }]" />

    <!-- 加载 -->
    <a-card v-if="phase === 'loading'"><a-skeleton active :paragraph="{ rows: 6 }" /></a-card>

    <!-- 错误/不存在 -->
    <a-card v-else-if="phase === 'error'" class="text-center" :body-style="{ padding: '40px' }">
      <Icon name="alertTriangle" :size="48" class="text-muted mx-auto mb-4" />
      <h2 class="text-lg font-extrabold mb-2">试卷不存在或加载失败</h2>
      <p class="text-sm text-muted mb-6">{{ err || '该试卷链接无效，可能已被移除或 ID 错误。' }}</p>
      <div class="flex items-center justify-center gap-3">
        <NuxtLink to="/exam"><a-button><Icon name="arrowLeft" :size="16" /> 返回试卷列表</a-button></NuxtLink>
        <a-button @click="phase = 'loading'; refresh()">重新加载</a-button>
      </div>
    </a-card>

    <!-- 答题中 -->
    <div v-else-if="phase === 'take' && set" class="reveal">
      <!-- 门禁拦截（服务端返回 VIP_REQUIRED：如会话期会员过期） -->
      <a-card v-if="vipBlocked" class="mb-5 !bg-amber-500/10 !border-amber-500/20" :body-style="{ padding: '16px' }">
        <div class="flex items-center gap-3">
          <Icon name="crown" :size="20" class="text-amber-500 shrink-0" />
          <div class="flex-1 text-sm">
            <span class="font-semibold text-amber-600">会员已失效</span> · 该试卷为 VIP 专属，请重新开通后交卷
          </div>
          <NuxtLink :to="auth.isLoggedIn ? '/vip' : ('/login?redirect=' + route.fullPath)">
            <a-button type="primary" class="shrink-0 !py-2"><Icon name="crown" :size="15" /> 去开通</a-button>
          </NuxtLink>
        </div>
      </a-card>

      <!-- VIP 提示条 -->
      <a-card v-if="vipLocked" class="mb-5 !bg-amber-500/10 !border-amber-500/20" :body-style="{ padding: '16px' }">
        <div class="flex items-center gap-3">
          <Icon name="crown" :size="20" class="text-amber-500 shrink-0" />
          <div class="flex-1 text-sm">
            <span class="font-semibold text-amber-600">VIP 专属试卷</span> · {{ auth.isLoggedIn ? '开通会员即可交卷并查看复盘' : '登录并开通会员后开启' }}
          </div>
          <NuxtLink :to="auth.isLoggedIn ? '/vip' : ('/login?redirect=' + route.fullPath)">
            <a-button type="primary" class="shrink-0 !py-2">
              <Icon name="crown" :size="15" /> {{ auth.isLoggedIn ? '去开通' : '去登录' }}
            </a-button>
          </NuxtLink>
        </div>
      </a-card>

      <!-- 时间紧张提示 -->
      <a-card v-if="timeTight" class="mb-5 !bg-rose-500/10 !border-rose-500/20" :body-style="{ padding: '12px' }">
        <div class="flex items-center gap-2">
          <Icon name="alertTriangle" :size="18" class="text-rose-500 shrink-0 animate-pulse" />
          <div class="text-sm font-semibold text-rose-600">时间紧张，还剩 {{ fmt(timeLeft) }}，系统将自动交卷</div>
        </div>
      </a-card>

      <!-- 试卷信息条 -->
      <a-card class="mb-5" :body-style="{ padding: '20px' }">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-xl font-extrabold">{{ set.name }}</h1>
            <p class="text-xs text-muted mt-1 flex items-center gap-3">
              <a-tag :style="{ background: meta.bg, color: 'rgb(var(--ink))', borderColor: 'transparent' }">{{ meta.name }}</a-tag>
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
            <a-button type="primary" :loading="submitting" :disabled="vipLocked" @click="submit">交卷</a-button>
          </div>
          <div v-if="dur" class="w-full mt-1 h-1.5 rounded-full bg-ink/8 overflow-hidden">
            <div class="h-full transition-[width] duration-1000 ease-linear"
                 :class="timeLeft <= 30 ? 'bg-rose-500' : 'bg-brand-coral'"
                 :style="{ width: usedPct + '%' }"></div>
          </div>
        </div>
      </a-card>

      <a-alert v-if="err" type="error" :message="err" show-icon class="mb-4" />

      <!-- 题号导航 -->
      <div v-if="phase === 'take'" class="mb-5">
        <div class="text-xs font-semibold text-muted mb-2">答题进度（{{ answeredCount }} / {{ totalCount }}）</div>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="(c, idx) in set.choices" :key="'c' + c.id" type="button" @click="gotoQ('c' + idx)"
                  class="w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition border"
                  :class="qState('choice', c, idx)">{{ idx + 1 }}</button>
          <button v-for="(w, idx) in set.written" :key="'w' + w.id" type="button" @click="gotoQ('w' + idx)"
                  class="w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition border"
                  :class="qState('written', w, idx)">{{ set.choices.length + idx + 1 }}</button>
        </div>
      </div>

      <!-- 选择题 -->
      <h3 class="section-title mb-3">一、选择题（{{ set.choices.length }}）</h3>
      <div class="space-y-3 mb-8">
        <a-card v-for="(c, idx) in set.choices" :key="c.id" :id="'q-c' + idx" :body-style="{ padding: '20px' }">
          <div class="flex items-center gap-3 mb-3">
            <a-tag shrink-0 :class="c.multi ? '!bg-violet-500/10 !text-violet-600' : '!bg-brand-coral/10 !text-brand-coral'" :bordered="false">
              {{ c.multi ? '多选' : '单选' }}
            </a-tag>
            <p class="text-sm font-semibold leading-relaxed flex-1 line-clamp-2 md:line-clamp-none">
              <span class="text-muted mr-1">{{ idx + 1 }}.</span>{{ c.q }}
            </p>
            <a-tag shrink-0 class="!py-0.5 !text-[10px]" :bordered="false">{{ c.tag }}</a-tag>
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <button v-for="(opt, i) in c.options" :key="i"
                    @click="selectChoice(c, i)"
                    class="text-left px-3.5 py-2.5 rounded-xl border text-sm transition flex items-center gap-2.5"
                    :class="isSel(c, i)
                      ? (c.multi ? 'border-violet-500/50 bg-violet-500/5 text-violet-600' : 'border-brand-coral/50 bg-brand-coral/5 text-brand-coral')
                      : 'border-line text-sub hover:border-ink/20 hover:bg-ink/5'">
              <span class="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold"
                    :class="isSel(c, i) ? (c.multi ? 'bg-violet-600 text-white' : 'bg-brand-coral text-white') : 'bg-ink/10 text-muted'">{{ optLabel(i) }}</span>
              <span class="flex-1 min-w-0 break-words">{{ opt }}</span>
            </button>
          </div>
        </a-card>
      </div>

      <!-- 笔试题 -->
      <h3 class="section-title mb-3">二、笔试题（{{ set.written.length }}）</h3>
      <div class="space-y-3 mb-8">
        <a-card v-for="(w, idx) in set.written" :key="w.id" :id="'q-w' + idx" :body-style="{ padding: '20px' }">
          <p class="text-sm font-semibold leading-relaxed mb-3">
            <span class="text-muted mr-1">{{ idx + 1 }}.</span>{{ w.q }}
          </p>
          <a-textarea v-model:value="writtenAnswers[w.id]" :rows="4" placeholder="在此写下你的思路与作答…" class="resize-y" />
        </a-card>
      </div>

      <div class="flex flex-col items-end gap-2.5">
        <a-button type="primary" :loading="submitting" :disabled="vipLocked" @click="submit">交卷并查看复盘</a-button>
      </div>
    </div>

    <!-- 复盘 -->
    <div v-else-if="phase === 'review' && record" class="reveal">
      <!-- 成绩卡 -->
      <a-card class="mb-5" :body-style="{ padding: '28px' }">
        <div class="flex flex-col sm:flex-row items-center gap-7">
          <ProgressRing :value="record.score" :size="132" :stroke="13" :color="ringColor" label="得分" />
          <div class="flex-1 text-center sm:text-left">
            <div class="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span class="text-2xl font-extrabold gradient-text">{{ record.level }}</span>
              <a-tag :style="{ background: meta.bg, color: 'rgb(var(--ink))', borderColor: 'transparent' }">{{ meta.name }}</a-tag>
              <a-tag>{{ record.setName }}</a-tag>
            </div>
            <p class="text-sm text-sub leading-relaxed max-w-xl">{{ record.advice }}</p>
            <div class="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
              <span class="text-xs text-muted">正确率</span>
              <span class="font-bold">{{ record.correct }}/{{ record.total }}</span>
              <span class="text-xs text-muted ml-2">用时</span>
              <span class="font-bold">{{ fmt(record.usedSeconds) }}</span>
            </div>
          </div>
          <a-button class="shrink-0" @click="retake"><Icon name="refresh" :size="16" /> 重做</a-button>
        </div>
      </a-card>

      <!-- 薄弱点 -->
      <a-card v-if="record.weakPoints.length" class="mb-5" :body-style="{ padding: '20px' }">
        <h3 class="section-title mb-3 flex items-center gap-2"><Icon name="target" :size="17" class="text-amber-600" /> 薄弱知识点</h3>
        <div class="flex flex-wrap gap-2">
          <a-tag v-for="w in record.weakPoints" :key="w.tag" class="!bg-rose-500/10 !text-rose-500" :bordered="false">
            {{ w.tag }} · 错 {{ w.count }}
          </a-tag>
        </div>
      </a-card>

      <!-- 复盘数据不完整提示（早期记录/数据缺失时） -->
      <a-alert v-if="!hasReviews" type="warning" class="mb-6"
               message="本复盘的题目与答案数据不完整"
               description="该记录可能来自较早版本或数据写入异常，无法展示逐题复盘。建议重新作答本卷以获取完整复盘。" show-icon />

      <!-- 选择题复盘 -->
      <template v-if="record.choiceReview && record.choiceReview.length">
        <h3 class="section-title mb-3">选择题复盘</h3>
        <div class="space-y-3 mb-8">
          <a-card v-for="(c, idx) in record.choiceReview" :key="c.id" :body-style="{ padding: '20px' }"
                  :class="c.right ? '!border-emerald-500/25' : '!border-rose-500/25'">
            <div class="flex items-start gap-3 mb-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    :class="c.right ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'">
                <Icon :name="c.right ? 'check' : 'x'" :size="15" />
              </span>
              <p class="text-sm font-semibold leading-relaxed flex-1">
                <span class="text-muted mr-1">{{ idx + 1 }}.</span>{{ c.q }}
              </p>
              <a-tag shrink-0 class="!py-0.5 !text-[10px]" :bordered="false">{{ c.tag }}</a-tag>
            </div>
            <div class="grid sm:grid-cols-2 gap-2">
              <div v-for="(opt, i) in c.options" :key="i"
                   class="px-3.5 py-2.5 rounded-xl border text-sm flex items-center gap-2.5"
                   :class="optClass(c, i)">
                <span class="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold"
                      :class="optClass(c, i).includes('emerald') ? 'bg-emerald-500 text-white'
                        : optClass(c, i).includes('rose') ? 'bg-rose-500 text-white' : 'bg-ink/10 text-muted'">{{ optLabel(i) }}</span>
                <span class="flex-1 min-w-0 break-words">{{ opt }}</span>
              </div>
            </div>
            <div v-if="c.explain" class="mt-3 text-xs text-sub bg-ink/5 rounded-xl p-3 leading-relaxed">
              <span class="font-semibold text-brand-coral">解析：</span>{{ c.explain }}
            </div>
          </a-card>
        </div>
      </template>

      <!-- 笔试题复盘 -->
      <template v-if="record.writtenReview && record.writtenReview.length">
        <h3 class="section-title mb-3">笔试题复盘</h3>
        <div class="space-y-3">
          <a-card v-for="(w, idx) in record.writtenReview" :key="w.id" :body-style="{ padding: '20px' }">
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
          </a-card>
        </div>
      </template>
    </div>

    <!-- 离开后超时：本次作答已结束，绝不静默自动交卷，由用户决定是否重新作答 -->
    <div v-else-if="phase === 'expired'" class="reveal">
      <a-card class="text-center" :body-style="{ padding: '40px' }">
        <Icon name="clock" :size="48" class="text-muted mx-auto mb-4" />
        <h2 class="text-lg font-extrabold mb-2">本次作答已结束</h2>
        <p class="text-sm text-muted mb-6 max-w-md mx-auto leading-relaxed">
          你已离开答卷页面，本次模拟作答的计时已结束，不会自动交卷。可重新进入本卷开始一次新的作答。
        </p>
        <div class="flex items-center justify-center gap-3">
          <NuxtLink to="/exam"><a-button>返回试卷列表</a-button></NuxtLink>
          <a-button type="primary" @click="retake"><Icon name="refresh" :size="16" /> 重新作答</a-button>
        </div>
      </a-card>
    </div>

    <!-- 兜底：任何未命中上述状态的异常态都不应整页空白，给出错误与重试入口 -->
    <a-card v-else class="text-center" :body-style="{ padding: '40px' }">
      <Icon name="alertTriangle" :size="48" class="text-muted mx-auto mb-4" />
      <h2 class="text-lg font-extrabold mb-2">页面状态异常</h2>
      <p class="text-sm text-muted mb-6">交卷或加载过程中发生异常，请重试。若问题持续，可重新进入本卷。</p>
      <div class="flex items-center justify-center gap-3">
        <NuxtLink to="/exam"><a-button>返回试卷列表</a-button></NuxtLink>
        <a-button @click="phase = 'loading'; refresh()">重新加载</a-button>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { trackMeta } from '~/composables/useTrack'
const { request } = useApi()
const { guard } = useLoginGate()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const meta = computed(() => trackMeta[(record.value?.track) || (set.value?.track)] || trackMeta.frontend)

const phase = ref('loading')
const set = ref<any>(null)
const attemptId = ref('')
const serverStartAt = ref<number | null>(null)

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
const vipBlocked = ref(false)
const submitting = ref(false)
const choiceAnswers = reactive<Record<string, any>>({})
const writtenAnswers = reactive<Record<string, any>>({})

// A4 断点续考：离开时把已选答案存 localStorage 草稿，再进同 attempt 恢复（复用 serverStartAt 计时）
function draftKey() { return attemptId.value ? 'exam-draft:' + attemptId.value : '' }
function saveDraft() {
  if (!import.meta.client || !attemptId.value) return
  try { localStorage.setItem(draftKey(), JSON.stringify({ c: choiceAnswers, w: writtenAnswers })) } catch (e) {}
}
function restoreDraft() {
  if (!import.meta.client || !attemptId.value) return
  try {
    const raw = localStorage.getItem(draftKey())
    if (!raw) return
    const d = JSON.parse(raw)
    if (d.c) Object.assign(choiceAnswers, d.c)
    if (d.w) Object.assign(writtenAnswers, d.w)
  } catch (e) {}
}
function clearDraft() {
  if (!import.meta.client || !attemptId.value) return
  try { localStorage.removeItem(draftKey()) } catch (e) {}
}
watch(() => [choiceAnswers, writtenAnswers], saveDraft, { deep: true })
const dur = ref(0)
const timeLeft = ref(0)
let timer: any = null
const totalSec = computed(() => dur.value * 60)
const usedPct = computed(() => totalSec.value > 0 ? Math.min(100, Math.round(((totalSec.value - timeLeft.value) / totalSec.value) * 100)) : 0)
const timeTight = computed(() => !!dur.value && timeLeft.value <= 60)

const vipLocked = computed(() => !!set.value?.vipOnly && !auth.isVip)

// 复盘题目/答案是否完整：为空时（多来自早期记录或数据缺失）应给出提示而非渲染两个空标题
const hasReviews = computed(() => ((record.value?.choiceReview?.length) || 0) + ((record.value?.writtenReview?.length) || 0) > 0)

// 交卷遮罩里的进度提示：让用户清楚「提交了多少题」而不是盯着一个转圈的按钮
const totalCount = computed(() => (set.value?.choices?.length || 0) + (set.value?.written?.length || 0))
const answeredCount = computed(() => {
  const c = (set.value?.choices || []).filter((x: any) => {
    const v = choiceAnswers[x.id]
    return Array.isArray(v) ? v.length > 0 : v != null
  }).length
  const w = (set.value?.written || []).filter((x: any) => String(writtenAnswers[x.id] || '').trim()).length
  return c + w
})

const currentQ = ref('')
function qState(type: string, item: any, idx: number) {
  const answered = type === 'choice'
    ? (Array.isArray(choiceAnswers[item.id]) ? (choiceAnswers[item.id] as any[]).length > 0 : choiceAnswers[item.id] != null)
    : String(writtenAnswers[item.id] || '').trim().length > 0
  const cur = currentQ.value === (type === 'choice' ? 'c' + idx : 'w' + idx)
  if (answered) return cur ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return cur ? 'bg-brand-coral text-white border-brand-coral' : 'bg-white text-sub border-line hover:border-ink/20'
}
function gotoQ(qid: string) {
  currentQ.value = qid
  if (import.meta.client) {
    const el = document.getElementById('q-' + qid)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const optLabel = (i: number) => String.fromCharCode(65 + i)
const fmt = (s: number) => {
  s = Number(s)
  if (!isFinite(s) || s < 0) s = 0
  s = Math.floor(s)
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
  const correct = toIdxList(c.answer).includes(i)
  const chosen = toIdxList(c.userAnswer).includes(i)
  if (correct) return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600'
  if (chosen && !correct) return 'border-rose-500/40 bg-rose-500/5 text-rose-600'
  return 'border-line text-sub'
}
// 前端兜底：将答案（字母如 "D" 或下标如 3/数组）统一规整为下标数组，杜绝字母 vs 下标导致高亮/判分错乱
function toIdxList(x: any): number[] {
  const arr = Array.isArray(x) ? x : (x == null ? [] : [x])
  const out: number[] = []
  for (const v of arr) {
    if (typeof v === 'number') out.push(Math.floor(v))
    else if (typeof v === 'string') {
      const s = v.trim()
      if (/^[A-Za-z]$/.test(s)) out.push(s.toUpperCase().charCodeAt(0) - 65)
      else { const n = Number(s); if (!isNaN(n)) out.push(Math.floor(n)) }
    }
  }
  return out
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
// P1-6：按服务端开考时间初始化倒计时。刷新页面后可复用原 attempt，避免用户通过刷新重置计时。
function initTimer() {
  stopTimer()
  const total = dur.value * 60
  if (!total) { timeLeft.value = 0; return }
  if (serverStartAt.value) {
    const elapsed = Math.floor((Date.now() - serverStartAt.value) / 1000)
    timeLeft.value = Math.max(0, total - elapsed)
  } else {
    timeLeft.value = total
  }
  // 关键修复：若打开页面时计时已耗尽（例如中途离开作答页，原 attempt 已超时），
  // 绝不在后台静默自动交卷出答案，而是进入 expired 态，由用户决定是否重新作答。
  if (timeLeft.value <= 0) {
    phase.value = 'expired'
    return
  }
  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) { stopTimer(); submit() }
  }, 1000)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

// 幂等票据：手动交卷与「时间到自动交卷」可能同时触发，
// 带同一个 nonce 时服务端只落一条记录（B10），不会重复刷成绩。
let submitNonce = ''
async function submit() {
  if (submitting.value) return
  if (await guard()) return // 未登录 → 引导登录
  if (set.value?.vipOnly && !auth.isVip) { err.value = '该试卷为 VIP 专属，请先开通会员'; return }
  stopTimer() // 先停表：避免请求途中倒计时归零又触发一次自动交卷
  submitting.value = true; err.value = ''
  if (!submitNonce) submitNonce = 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  try {
    const res = await request('/api/exam/submit', {
      method: 'POST',
      // P1-6：将 attemptId 交给服务端，由服务端根据开考时间计算真实用时
      body: { setId: set.value.id, choiceAnswers, writtenAnswers, usedSeconds: 0, nonce: submitNonce, attemptId: attemptId.value }
    })
    // 防御：若响应缺少 record（数据缺失/接口异常），不要进入空白复盘，
    // 而是抛错走 catch —— 保留答题页并提示用户重试，避免"整页空白、题目答案全无"。
      if (!res || !res.record) throw new Error('复盘数据为空，请重试')
      record.value = res.record
      phase.value = 'review'
      clearDraft()
    // 交卷后整块视图被替换，若不回到顶部，用户仍停在页面中段会误以为「还在加载」
    await nextTick()
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    if (e?.code === 'VIP_REQUIRED') {
      // 服务端门禁拦截（如会话期会员过期）：弹出升级引导，不显示普通错误文本
      vipBlocked.value = true
      err.value = ''
    } else {
      err.value = e.message || '交卷失败，请检查网络后重试'
    }
    submitNonce = '' // 失败后换新票据
    if (dur.value && timeLeft.value > 0) startTimer() // 失败则恢复计时，不白扣时间
  } finally { submitting.value = false }
}

function retake() {
  // P1-6：重做需生成新的服务端 attempt，直接刷新页面以获取新 attemptId 并清空本地状态最稳妥
  clearDraft()
  if (import.meta.client) window.location.reload()
}

// 公开试卷：SSR 加载（预览题目），无需登录即可浏览
const mounted = ref(false)
const { data: setRes, error: fetchError, refresh } = await useFetch(() => '/api/exam/sets/' + route.params.id)
watch(setRes, (v: any) => {
  if (v?.set) {
    set.value = v.set
    dur.value = v.set.duration || 0
    attemptId.value = v.attemptId || ''
    serverStartAt.value = v.serverStartAt || null
    // 关键：服务端与客户端首屏必须渲染同一个剩余时间（满时长），
    // 否则 SSR 会把 timeLeft=0 渲染成「时间紧张 00:00」红色告警态，
    // 客户端 initTimer() 再按服务端开考时间修正 → hydration mismatch。
    // 计时器只在挂载后（客户端）启动，绝不在 SSR 可执行路径里改状态。
    timeLeft.value = dur.value * 60
        if (!route.query.record && phase.value === 'loading') {
          phase.value = 'take'
          if (mounted.value) initTimer()
          restoreDraft()
        }
  } else if (v?.error || fetchError.value) {
    err.value = v?.error || fetchError.value?.message || '试卷加载失败'
    phase.value = 'error'
  }
}, { immediate: true })

// 历史复盘（需登录）：客户端拉取
onMounted(async () => {
  mounted.value = true
  const recordId = route.query.record
  if (recordId) {
    try {
      const r: any = await request('/api/exam/records/' + recordId)
      if (!r || !r.record) throw new Error('该复盘记录数据缺失或已不可用')
      record.value = r.record
      phase.value = 'review'
      stopTimer()
    } catch (e: any) { err.value = e.message || '加载复盘失败' }
    return
  }
  // 首屏 hydration 完成后再启动倒计时，避免计时器读数进入 SSR 快照
  if (phase.value === 'take' && dur.value) initTimer()
  // 关闭标签页 / 浏览器关闭：随页面卸载保存草稿（保留 attempt，支持断点续考）
  if (import.meta.client) {
    window.addEventListener('pagehide', saveDraft)
    window.addEventListener('beforeunload', saveDraft)
  }
})
onBeforeUnmount(() => {
  stopTimer()
  // SPA 路由跳转离开答卷页（如点「返回试卷列表」）：保存草稿以便断点续考（保留 attempt 计时）
  saveDraft()
  if (import.meta.client) {
    window.removeEventListener('pagehide', saveDraft)
    window.removeEventListener('beforeunload', saveDraft)
  }
})
</script>
