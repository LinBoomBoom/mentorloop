<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-5">
      <h1 class="text-2xl font-extrabold flex items-center gap-2">
        <Icon name="alertTriangle" :size="24" style="color:#ff5e7e" /> 错题本
      </h1>
      <p class="text-muted text-sm mt-1.5">跨题库练习与技能自测的错题都会沉淀到这里，按间隔复习（SRS）帮你真正记住。复习后会自动排期下一次。</p>
    </div>

    <a-card v-if="!auth.isLoggedIn" :body-style="{ padding: '28px' }" class="text-center">
      <p class="text-muted mb-3">登录后查看你的错题本</p>
      <a-button type="primary" :href="`/auth/login?redirect=${encodeURIComponent($route.fullPath)}`">去登录</a-button>
    </a-card>

    <template v-else>
      <!-- 统计 + 过滤 -->
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm">
          <span class="font-bold tabular-nums">{{ items.length }}</span> 道错题
          <span class="text-muted">· 待复习 <span class="font-bold text-amber-500 tabular-nums">{{ dueCount }}</span></span>
        </div>
        <a-switch v-model:checked="dueOnly" @change="load">
          <template #checkedChildren>仅待复习</template>
          <template #unCheckedChildren>全部</template>
        </a-switch>
      </div>

      <div v-if="loading" class="text-center text-muted py-16">加载中…</div>
      <a-empty v-else-if="!items.length" :description="dueOnly ? '近期没有待复习的错题' : '还没有错题，去刷几道题吧'" class="py-16" />

      <div v-else class="space-y-3">
        <div v-for="it in items" :key="it.id" class="rounded-2xl border border-line bg-surface p-4">
          <div class="flex items-start gap-2">
            <Icon name="alertTriangle" :size="16" class="mt-0.5 shrink-0 text-rose-500" />
            <div class="flex-1 min-w-0">
              <div class="text-[14px] leading-snug text-ink font-medium">{{ it.q }}</div>
              <div class="flex flex-wrap items-center gap-1.5 mt-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-line text-muted">{{ it.source === 'practice' ? '技能自测' : it.source }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">错 {{ it.wrong_count }} 次</span>
                <span v-if="!it.due" class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">已排期</span>
                <span v-if="it.skill_key" class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-coral/10 text-brand-coral truncate max-w-[160px]">{{ it.skill_key.split('::').slice(1).join(' · ') }}</span>
              </div>

              <div v-if="revealed[it.id]" class="mt-3 rounded-r-lg border-l-2 border-brand-coral/60 bg-brand-coral/[.04] p-3 text-[13px] prose-dm" v-html="md(it.answer || '（无参考答案）')"></div>

              <div class="flex items-center gap-2 mt-3">
                <a-button v-if="!revealed[it.id]" size="small" @click="revealed[it.id] = true">显示答案</a-button>
                <a-button v-if="revealed[it.id] && it.due" size="small" type="primary" :loading="acting[it.id]" @click="review(it)">复习并排期下次</a-button>
                <a-button v-if="revealed[it.id] && !it.due" size="small" @click="revealed[it.id] = false">收起答案</a-button>
                <a-button size="small" danger :loading="acting[it.id]" @click="dismiss(it)">移除</a-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { App } from 'ant-design-vue'
import { useMarkdown } from '~/composables/useMarkdown'
const { md } = useMarkdown()
const { message } = App.useApp()
const auth = useAuthStore()
const { request } = useApi()

const items = ref<any[]>([])
const loading = ref(false)
const dueOnly = ref(false)
const revealed = ref<Record<string, boolean>>({})
const acting = ref<Record<string, boolean>>({})

const dueCount = computed(() => items.value.filter(i => i.due).length)

async function load() {
  loading.value = true
  try {
    const r: any = await request('/api/wrong' + (dueOnly.value ? '?due=1' : ''))
    items.value = r.items || []
  } catch (e: any) {
    message.error(e.message || '加载失败')
  } finally { loading.value = false }
}
async function review(it: any) {
  acting.value = { ...acting.value, [it.id]: true }
  try {
    const r: any = await request('/api/wrong', { method: 'POST', body: { id: it.id, action: 'review' } })
    if (r?.next_review_at) it.next_review_at = r.next_review_at
    it.due = false
    revealed.value[it.id] = false
    message.success('已排期下次复习')
    if (dueOnly.value) items.value = items.value.filter(x => x.id !== it.id)
  } catch (e: any) {
    message.error(e.message || '操作失败')
  } finally { acting.value = { ...acting.value, [it.id]: false } }
}
async function dismiss(it: any) {
  acting.value = { ...acting.value, [it.id]: true }
  try {
    await request('/api/wrong', { method: 'POST', body: { id: it.id, action: 'dismiss' } })
    items.value = items.value.filter(x => x.id !== it.id)
    message.success('已移除')
  } catch (e: any) {
    message.error(e.message || '操作失败')
  } finally { acting.value = { ...acting.value, [it.id]: false } }
}

watch(() => auth.isLoggedIn, (v) => { if (v) load() })
onMounted(() => { if (auth.isLoggedIn) load() })

useSeoMeta({ title: '错题本 · MentorLoop', description: '跨练习与自测的错题沉淀，间隔复习帮你记住。' })
</script>
