<template>
  <div>
    <!-- 页头 -->
    <div class="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <h1 class="text-[26px] font-extrabold leading-tight">模拟答卷</h1>
        <p class="text-muted text-sm mt-1">限时实战，交卷即出判分、薄弱点诊断与复盘建议。</p>
      </div>
      <NuxtLink to="/learn" class="btn btn-ghost"><Icon name="book" :size="17" /> 回到学习</NuxtLink>
    </div>

    <!-- 试卷列表 -->
    <h3 class="section-title mb-3">精选试卷</h3>
    <div v-if="!sets" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
      <div v-for="i in 3" :key="i" class="card h-44 shimmer"></div>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger mb-9">
      <div v-for="s in sets" :key="s.id" class="card p-5 flex flex-col reveal hover:border-brand-coral/30 transition-colors">
        <div class="flex items-center gap-2 mb-3">
          <span class="chip" :style="{ color: trackMeta[s.track]?.color, background: trackMeta[s.track]?.bg }">{{ trackMeta[s.track]?.name || s.track }}</span>
          <span class="chip" :class="levelClass(s.level)">{{ s.level }}</span>
          <span v-if="s.vipOnly" class="tag tag-vip !py-0.5 text-[10px] !px-2 ml-auto"><Icon name="crown" :size="11" /> VIP</span>
        </div>
        <h4 class="font-extrabold text-[17px] leading-snug mb-1">{{ s.name }}</h4>
        <p class="text-xs text-muted mb-4 flex-1 flex items-center gap-4">
          <span class="flex items-center gap-1"><Icon name="clock" :size="13" /> {{ s.duration || '不限' }} 分钟</span>
          <span class="flex items-center gap-1"><Icon name="layers" :size="13" /> 选择 {{ s.choiceCount }}</span>
          <span class="flex items-center gap-1"><Icon name="pencil" :size="13" /> 笔试 {{ s.writtenCount }}</span>
        </p>
        <NuxtLink :to="s.vipOnly && !auth.isVip ? '/vip' : `/exam/sets/${s.id}`" class="btn btn-primary btn-block">
          <Icon :name="s.vipOnly && !auth.isVip ? 'crown' : 'arrowRight'" :size="16" />
          {{ s.vipOnly && !auth.isVip ? '开通 VIP 查看' : '开始答卷' }}
        </NuxtLink>
      </div>
    </div>

    <!-- 答卷历史 -->
    <h3 class="section-title mb-3">我的答卷</h3>
    <div v-if="!auth.isLoggedIn" class="card p-8 text-center">
      <div class="text-sm text-muted mb-4">登录后查看你的模拟答卷与逐题复盘</div>
      <NuxtLink to="/login" class="btn btn-primary"><Icon name="user" :size="16" /> 登录查看</NuxtLink>
    </div>
    <template v-else>
      <div v-if="history === null" class="card h-28 shimmer"></div>
      <div v-else-if="!history.length" class="card p-8 text-center text-muted text-sm">还没有答卷记录，挑一套试试手感 👆</div>
      <div v-else class="card p-2 divide-y divide-line">
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

const levelClass = (l: string) => ({
  '初级': 'bg-emerald-500/10 text-emerald-500',
  '中级': 'bg-amber-500/10 text-amber-500',
  '高级': 'bg-rose-500/10 text-rose-500'
}[l] || 'bg-ink/10 text-muted')
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
