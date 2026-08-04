<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-extrabold">技能树</h1>
      <p class="text-muted text-sm mt-1">点亮一片叶子代表掌握一节，点亮一个分支代表掌握整章，点亮整棵代表学完该方向。完成一节即实时点亮一片叶子。</p>
    </div>

    <!-- 总进度汇总 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
      <div class="card p-4">
        <div class="text-xs text-muted">总体进度</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums">{{ overallPercent }}%</div>
        <div class="text-[11px] text-muted mt-0.5">{{ totalDone }}/{{ totalSections }} 节已掌握</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted">已点亮分支</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums text-emerald-600">{{ totalChaptersLit }}<span class="text-muted text-base font-normal">/{{ totalChapters }}</span></div>
        <div class="text-[11px] text-muted mt-0.5">章（分支）</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted">已点亮树</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums text-amber-500">{{ modulesLit }}<span class="text-muted text-base font-normal">/{{ modulesTree.length }}</span></div>
        <div class="text-[11px] text-muted mt-0.5">方向</div>
      </div>
      <div class="card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
             :style="overallPercent === 100 ? 'background:linear-gradient(120deg,#ffc24b,#ff8a5c);color:#fff' : 'background:#ff5e7e1a;color:#ff5e7e'">
          <Icon :name="overallPercent === 100 ? 'trophy' : 'sparkles'" :size="22" />
        </div>
        <div class="text-xs text-muted leading-tight">学完全部内容，全部方向的技能树将全部点亮 🌳</div>
      </div>
    </div>

    <!-- 技能树（动态：支持任意数量方向） -->
    <div v-if="!modulesTree.length" class="grid md:grid-cols-3 gap-5 stagger">
      <div v-for="i in (modulesTree.length || 3)" :key="i" class="card h-96 shimmer"></div>
    </div>
    <div v-else class="grid gap-5 stagger items-start sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <SkillTree v-for="m in modulesTree" :key="m.id" :module="m" :progress="progress" @toggle="toggle" />
    </div>

    <!-- 定位与边界声明（活运营宪章 第 1.4 条：边界须在产品内可见） -->
    <section class="card p-5 mt-7">
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#14b8a61a;color:#14b8a6">
          <Icon name="tree" :size="18" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="font-bold text-sm text-ink">这是一棵「求职 / 面试能力树」</h2>
          <p class="text-muted text-xs mt-2 leading-relaxed">
            本树的组织方式与深度取舍，全部服务于一个目标：<span class="text-ink font-semibold">能通过技术面试，并具备对应的真实能力</span>。
            <span class="text-ink font-semibold">主干</span>是跨技术栈可迁移的稳定原理，<span class="text-ink font-semibold">分支</span>是技术域与框架，<span class="text-ink font-semibold">叶子</span>是具体工具、版本与技巧。
            我们不追求"收录一切"——那既不可达，也会让内容加速腐坏；我们追求的是
            <span class="text-ink font-semibold">可导航、可保鲜、可修剪</span>。每个知识点都带核验日期与过期风险，到期即复审。
          </p>
          <div class="mt-3.5">
            <div class="text-[11px] font-semibold text-muted mb-1.5">刻意不覆盖（属于其他能力树，避免"学完即完整工程师"的错觉）</div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="x in notCovered" :key="x" class="tag border border-line bg-surface text-muted font-medium">{{ x }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const auth = useAuthStore()
const { isDone } = useLearning()
const { guard } = useLoginGate()

// 结构（公开）：先拉模块列表，再并行拉取各模块完整详情（动态支持任意数量方向，无需改代码）
const { data: listRes } = await useFetch('/api/modules')
const modulesTree = ref<any[]>([])
if (listRes.value?.modules?.length) {
  const details = await Promise.all(
    (listRes.value.modules as any[]).map((m: any) =>
      $fetch(`/api/modules/${m.id}`).then((r: any) => (r as any).module).catch(() => null)
    )
  )
  modulesTree.value = details.filter(Boolean)
}

// 进度（仅登录后拉取）
const progress = ref<any>({})
watch(() => auth.isLoggedIn, async (v) => {
  if (v) { try { progress.value = (await request('/api/progress')).progress || {} } catch (e) { /* ignore */ } }
}, { immediate: true })

async function toggle(p: { moduleId: string; chapterId: string; sectionId: string; current: boolean }) {
  if (await guard()) return
  try {
    const r: any = await request('/api/progress/toggle', {
      method: 'POST',
      body: { moduleId: p.moduleId, chapterId: p.chapterId, sectionId: p.sectionId, done: !p.current }
    })
    progress.value = r.progress || {}
  } catch (e) { /* ignore */ }
}

// 汇总（实时）
const totalSections = computed(() => modulesTree.value.reduce((n: number, m: any) => n + m.chapters.reduce((a: number, c: any) => a + c.sections.length, 0), 0))
const totalChapters = computed(() => modulesTree.value.reduce((n: number, m: any) => n + m.chapters.length, 0))
const totalDone = computed(() => modulesTree.value.reduce((n: number, m: any) => n + m.chapters.reduce((a: number, c: any) => a + c.sections.filter((s: any) => isDone(progress.value, m.id, c.id, s.id)).length, 0), 0))
const totalChaptersLit = computed(() => modulesTree.value.reduce((n: number, m: any) => n + m.chapters.filter((c: any) => c.sections.length > 0 && c.sections.every((s: any) => isDone(progress.value, m.id, c.id, s.id))).length, 0))
const modulesLit = computed(() => modulesTree.value.filter((m: any) => m.chapters.length > 0 && m.chapters.every((x: any) => x.sections.length > 0 && x.sections.every((s: any) => isDone(progress.value, m.id, x.id, s.id)))).length)
const overallPercent = computed(() => totalSections.value ? Math.round((totalDone.value / totalSections.value) * 100) : 0)

// 活运营宪章 第 1.3 条 · 刻意不覆盖的能力域
const notCovered = ['产品感与需求分析', '业务建模与领域知识', '协作沟通与向上管理', '技术领导力与团队管理', '职业规划与薪酬谈判']

useSeoMeta({
  title: '技能树 · MentorLoop',
  description: '多方向技能树，实时点亮你的学习进度：掌握一节点亮一片叶子，掌握整章点亮一个分支，学完方向点亮整棵。',
  ogTitle: 'MentorLoop · 技能树',
  ogDescription: '实时响应的学习技能树，动态反映你的掌握进度。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
</script>
