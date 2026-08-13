<template>
  <a-card class="mb-6" :body-style="{ padding: '20px' }">
    <div class="flex flex-col sm:flex-row gap-2 mb-3">
      <select v-model="askTrack" class="input !w-full sm:!w-auto !py-2.5">
        <option value="">全部方向</option>
        <option value="frontend">前端</option>
        <option value="backend">后端</option>
        <option value="devops">运维</option>
        <option value="ai">AI 工程</option>
      </select>
      <input v-model="askText" class="input flex-1" placeholder="问我点什么？比如：Vue3 响应式原理、Redis 缓存击穿…" @keyup.enter="ask" />
      <a-button type="primary" class="shrink-0 !h-[42px]" @click="ask" :disabled="asking"><Icon name="sparkles" :size="16" /> 提问</a-button>
    </div>
    <!-- 生成中过渡块：LLM 推理可能需要数秒，给出可见反馈，避免用户以为卡死而反复点击/刷新 -->
    <div v-if="generating" class="rounded-xl p-4 mt-2 bg-ink/5 border border-dashed border-brand-coral/30">
      <div class="flex items-center gap-2 mb-3 text-xs font-semibold text-brand-coral">
        <Icon name="spinner" :size="16" class="animate-spin" /> AI 模型生成中…（基于大模型推理，通常需要几秒，请稍候）
      </div>
      <div class="space-y-2">
        <div class="h-3 rounded bg-ink/10 animate-pulse"></div>
        <div class="h-3 rounded bg-ink/10 animate-pulse w-5/6"></div>
        <div class="h-3 rounded bg-ink/10 animate-pulse w-2/3"></div>
        <div class="h-3 rounded bg-ink/10 animate-pulse w-1/2"></div>
      </div>
    </div>
    <div v-else-if="answer" class="rounded-xl p-4 mt-2" :class="answer.matched ? 'bg-brand-coral/5 border border-brand-coral/20' : 'bg-ink/5'">
      <div class="flex items-center gap-2 mb-2 text-xs font-semibold" :class="answer.matched ? 'text-brand-coral' : 'text-muted'">
        <Icon :name="answer.matched ? 'checkCircle' : 'sparkles'" :size="15" />
        {{ answer.matched ? ('匹配自题库' + (answer.track ? ' · ' + trackName(answer.track) : '')) : 'AI 提示' }}
      </div>
      <!-- 「题库未命中」是影响用户预期的重要信息（答案来自模型推理而非人工审校题库），必须放在答案正文之前 -->
      <div v-if="!answer.matched"
           class="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/[0.12] px-3.5 py-3">
        <div class="flex items-start gap-2">
          <Icon name="database" :size="15" class="text-amber-600 mt-0.5 shrink-0" />
          <div class="min-w-0 text-xs leading-relaxed">
            <div class="font-bold text-amber-700 dark:text-amber-400">这道题目前不在面试题库中</div>
            <p class="text-sub mt-1">
              下方答案由 AI 现场推理生成，尚未经过人工审校。<template v-if="answer.collected">我们已把它收录到「待补充题库」，后续会经 AI 语义化增强、由管理员审核后回流进正式题库。</template><template v-else>我们会结合 AI 增强后收录到「待补充题库」，供管理员审核补充。</template>
            </p>
          </div>
        </div>
      </div>
      <div class="prose-dm" v-html="md(answer.answer)"></div>
    </div>
    <p v-if="askErr" class="text-red-500 text-sm mt-2">{{ askErr }}</p>
  </a-card>
</template>

<script setup lang="ts">
const { request } = useApi()
const { md } = useMarkdown()
const { guard } = useLoginGate()
const route = useRoute()
const VALID_TRACKS = ['frontend', 'backend', 'devops', 'ai']
const qAsk = route.query.askTrack
const askText = ref('')
const askTrack = ref(typeof qAsk === 'string' && VALID_TRACKS.includes(qAsk) ? qAsk : '')
const answer = ref<any>(null)
const asking = ref(false)
const generating = ref(false) // 延迟 300ms 后才显示「生成中」过渡块，避免题库命中时的快速闪烁
const genTimer: any = null
const askErr = ref('')

function trackName(t: string) {
  return (VALID_TRACKS.includes(t) ? { frontend: '前端', backend: '后端', devops: '运维', ai: 'AI 工程' } as any : {})[t] || t
}
// BUG-3：用户手动清空提问输入框时，同步隐藏上次 AI/题库结果组件
watch(askText, (v) => {
  if (!v.trim()) { answer.value = null; askErr.value = '' }
})
onBeforeUnmount(() => { if (genTimer) clearTimeout(genTimer) })
async function ask() {
  if (!askText.value) { askErr.value = '请先输入问题'; return }
  if (await guard()) return // 未登录 → 引导登录
  asking.value = true; askErr.value = ''; answer.value = null
  // 延迟 300ms 显示「生成中」过渡块：题库命中等快速响应不会出现闪烁，
  // 而 LLM 推理（通常数秒）期间能给出明确反馈，避免用户误以为卡死而反复点击/刷新
  if (genTimer) clearTimeout(genTimer)
  const timer = setTimeout(() => { if (asking.value) generating.value = true }, 300)
  try {
    answer.value = await request('/api/interview/ask', { method: 'POST', body: { track: askTrack.value || undefined, question: askText.value } })
  } catch (e: any) { askErr.value = e.message } finally {
    clearTimeout(timer)
    asking.value = false
    generating.value = false
  }
}
</script>
