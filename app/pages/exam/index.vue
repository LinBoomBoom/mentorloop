<template>
  <div>
    <!-- 页头 -->
    <div class="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <h1 class="page-title">模拟答卷</h1>
        <p class="text-muted text-sm mt-1">限时实战，交卷即出判分、薄弱点诊断与复盘建议。</p>
      </div>
      <NuxtLink to="/learn"><a-button><Icon name="book" :size="17" /> 回到学习</a-button></NuxtLink>
    </div>

    <!-- 试卷列表 -->
    <h3 class="section-title mb-3">精选试卷</h3>
    <div v-if="!sets" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
      <a-card v-for="i in 3" :key="i"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    </div>
    <div v-else>
      <!-- 筛选：按方向 + 难度，避免 23 套试卷混排难找 -->
      <div class="flex flex-wrap gap-2 mb-3">
        <button v-for="t in TRACKS" :key="t.id" @click="filterTrack = t.id"
                class="chip-tab"
                :class="filterTrack === t.id ? 'chip-tab-active' : ''">{{ t.name }}</button>
      </div>
      <div class="flex flex-wrap gap-2 mb-5">
        <button v-for="l in LEVELS" :key="l.id" @click="filterLevel = l.id"
                class="chip-tab chip-tab-sm"
                :class="filterLevel === l.id ? 'chip-tab-active' : ''">{{ l.name }}</button>
      </div>

      <a-card v-if="shownSets.length === 0" class="text-center mb-9" :body-style="{ padding: '32px' }">
        <span class="text-muted text-sm">没有符合条件的试卷，换个筛选试试～</span>
      </a-card>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger mb-9">
        <a-card v-for="s in shownSets" :key="s.id" class="reveal hover:border-brand-coral/30 transition-colors !overflow-hidden" :body-style="{ padding: '20px' }">
          <!-- 方向色顶条：与学习中心卡片同一视觉语言 -->
          <div class="card-rail -mx-5 -mt-5 mb-3" :style="{ background: `linear-gradient(90deg, ${trackMeta[s.track]?.color}, ${trackMeta[s.track]?.color}55)` }"></div>
          <div class="flex items-start justify-between gap-3 mb-2">
            <h4 class="font-extrabold text-[17px] leading-snug">{{ s.name }}</h4>
            <Icon v-if="s.vipOnly" name="crown" :size="16" class="text-amber-500 shrink-0 mt-0.5" title="VIP 专属" />
          </div>
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <a-tag :style="{ background: trackMeta[s.track]?.bg, color: trackMeta[s.track]?.color, borderColor: 'transparent' }">{{ trackMeta[s.track]?.name || s.track }}</a-tag>
            <a-tag class="!bg-ink/5 !text-sub" :bordered="false">{{ s.level }}</a-tag>
          </div>
          <p class="text-xs text-muted mb-4 flex-1">
            共 {{ s.choiceCount + s.writtenCount }} 题 · 约 {{ s.duration || '不限' }} 分钟
          </p>
          <NuxtLink :to="s.vipOnly && !auth.isVip ? '/vip' : `/exam/sets/${s.id}`">
            <a-button block :type="s.vipOnly && !auth.isVip ? 'default' : 'primary'">
              <Icon :name="s.vipOnly && !auth.isVip ? 'crown' : 'arrowRight'" :size="16" />
              {{ s.vipOnly && !auth.isVip ? '开通 VIP 查看' : '开始答卷' }}
            </a-button>
          </NuxtLink>
        </a-card>
      </div>
    </div>

    <!-- 答卷历史 -->
    <h3 class="section-title mb-3">我的答卷</h3>
    <a-card v-if="!auth.isLoggedIn" class="text-center" :body-style="{ padding: '32px' }">
      <div class="text-sm text-muted mb-4">登录后查看你的模拟答卷与逐题复盘</div>
      <NuxtLink to="/login"><a-button type="primary"><Icon name="user" :size="16" /> 登录查看</a-button></NuxtLink>
    </a-card>
    <template v-else>
      <a-card v-if="history === null"><a-skeleton active :paragraph="{ rows: 2 }" /></a-card>
      <a-card v-else-if="!history.length" class="text-center" :body-style="{ padding: '32px' }">
        <span class="text-muted text-sm">还没有答卷记录，挑一套试试手感 👆</span>
      </a-card>
      <a-card v-else class="p-2" :body-style="{ padding: '8px' }">
        <div class="divide-y divide-line">
          <NuxtLink v-for="r in history" :key="r.id" :to="`/exam/sets/${r.setId}?record=${r.id}`"
                    class="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-ink/5 transition">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg shrink-0"
                 :class="scoreClass(r.score)">{{ r.score }}</div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold truncate">{{ r.set_name }}</div>
              <div class="text-[11px] text-muted">{{ trackMeta[r.track]?.name || r.track }} · {{ r.level }} · {{ new Date(r.created_at).toLocaleString() }}</div>
            </div>
            <div class="text-xs font-bold shrink-0" :class="scoreText(r.score)">对 {{ r.correct }}/{{ r.total }}</div>
            <Icon name="chevronRight" :size="16" class="text-muted shrink-0" />
          </NuxtLink>
        </div>
      </a-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { trackMeta } from '~/composables/useTrack'
const { request } = useApi()
const auth = useAuthStore()
const { data: setRes } = await useFetch('/api/exam/sets')
const sets = computed(() => setRes.value?.sets || null)

useSeoMeta({
  title: '模拟答卷',
  description: '限时实战模拟试卷，交卷即出判分、薄弱点诊断与逐题复盘建议，覆盖前端/后端/运维/AI 方向。',
  ogTitle: '模拟答卷 · MentorLoop',
  ogDescription: '模拟试卷限时实战，交卷即出判分与薄弱点诊断。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
const history = ref<any[] | null>(null)

// 试卷筛选：按方向 + 难度，并按方向归并排序（前端→后端→运维→AI）让同方向相邻、好找
const filterTrack = ref('')
const filterLevel = ref('')
const TRACKS = [
  { id: '', name: '全部方向' }, { id: 'frontend', name: '前端' }, { id: 'backend', name: '后端' },
  { id: 'devops', name: '运维' }, { id: 'ai', name: 'AI 工程' }
]
const LEVELS = [
  { id: '', name: '全部难度' }, { id: '初级', name: '初级' }, { id: '中级', name: '中级' },
  { id: '初中级', name: '初中级' }, { id: '高级', name: '高级' }
]
const TRACK_ORDER: Record<string, number> = { frontend: 0, backend: 1, devops: 2, ai: 3 }
const shownSets = computed(() => {
  let list = sets.value || []
  if (filterTrack.value) list = list.filter((s: any) => s.track === filterTrack.value)
  if (filterLevel.value) list = list.filter((s: any) => s.level === filterLevel.value)
  return [...list].sort((a: any, b: any) => (TRACK_ORDER[a.track] ?? 9) - (TRACK_ORDER[b.track] ?? 9))
})

const scoreClass = (s: number) => s >= 70 ? 'bg-emerald-500/12 text-emerald-500'
  : s >= 50 ? 'bg-amber-500/12 text-amber-500' : 'bg-rose-500/12 text-rose-500'
const scoreText = (s: number) => s >= 70 ? 'text-emerald-500' : s >= 50 ? 'text-amber-500' : 'text-rose-500'

onMounted(async () => {
  if (auth.isLoggedIn) {
    try { history.value = (await request('/api/exam/history')).records } catch (e) { history.value = [] }
  } else {
    history.value = []
  }
})
</script>
