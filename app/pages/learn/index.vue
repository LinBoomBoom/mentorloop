<template>
  <div>
    <h1 class="page-title mb-1">学习中心</h1>
    <p class="text-muted text-sm mb-6">选择方向，按章节系统学习，完成打卡解锁下一章。</p>

    <NuxtLink to="/learn/path" class="block mb-6">
      <a-card class="hover:-translate-y-0.5 transition !border-brand-coral/30 !bg-brand-coral/5" :body-style="{ padding: '16px' }">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-brand-coral/15 text-brand-coral flex items-center justify-center shrink-0"><Icon name="compass" :size="20" /></span>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm">AI 个性化学习路径 <a-tag class="!bg-brand-coral/15 !text-brand-coral !ml-1" :bordered="false">VIP</a-tag></div>
            <div class="text-xs text-muted truncate">基于你的模拟考试薄弱点，由大模型定制专属进阶路线</div>
          </div>
          <Icon name="arrowRight" :size="18" class="text-muted shrink-0" />
        </div>
      </a-card>
    </NuxtLink>

    <div v-if="!modules" class="grid md:grid-cols-3 gap-5 stagger">
      <a-card v-for="i in 3" :key="i"><a-skeleton active :paragraph="{ rows: 4 }" /></a-card>
    </div>

    <div v-else class="grid md:grid-cols-3 gap-5 stagger">
      <div v-for="m in modules" :key="m.id" class="block cursor-pointer" @click="navigateTo(`/learn/${m.id}`)">
        <a-card class="hover:-translate-y-1 transition cursor-pointer group reveal !overflow-hidden" :body-style="{ padding: '24px' }">
          <!-- 方向色顶条：打破全站白卡雷同，一眼区分方向 -->
          <div class="card-rail -mx-6 -mt-6 mb-4" :style="{ background: `linear-gradient(90deg, ${m.color}, ${m.color}55)` }"></div>
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-soft" :style="{ background: m.color }">
            <Icon name="layers" :size="24" />
          </div>
          <h3 class="font-bold text-lg">{{ m.name }}</h3>
          <p class="text-sm text-muted mt-1.5 line-clamp-2 min-h-[40px]">{{ m.desc }}</p>

          <!-- 方向标签：按 LEARNING_TAXONOMY 计算，与模块页一致（大类 → 子方向，phantom 隐藏） -->
          <div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs">
            <NuxtLink
              v-for="d in visibleDirections(m)"
              :key="d.id"
              :to="`/learn/${m.id}?group=${d.groupId}&direction=${d.id}`"
              class="flex items-center gap-1.5 text-ink hover:underline"
              @click.stop
            >
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: d.color }"></span>
              <span>{{ d.name }}</span>
            </NuxtLink>
            <span v-if="hiddenDirectionCount(m) > 0" class="text-muted">+{{ hiddenDirectionCount(m) }}</span>
          </div>

          <div class="flex gap-2 mt-4 text-xs">
            <a-tag :style="{ background: m.color + '1a', color: 'rgb(var(--ink))', borderColor: 'transparent' }">{{ m.chapterCount }} 章</a-tag>
            <a-tag class="!bg-ink/5 !text-sub" :bordered="false">{{ m.sectionCount }} 节</a-tag>
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LEARNING_TAXONOMY, getGroups } from '~/data/learningTaxonomy'

const { data } = await useFetch('/api/modules')
const modules = computed(() => data.value?.modules || null)

// 把某模块的所有子方向（带所属大类信息）摊平，并附上章节计数
function flattenDirections(m: any) {
  const counts = m?.subtracks || {}
  const groups = LEARNING_TAXONOMY[m.id] || []
  const out: { id: string; groupId: string; name: string; color: string; count: number }[] = []
  for (const g of groups) {
    for (const d of g.directions) {
      const count = d.chapterSubtracks.reduce(
        (s: number, st: string) => s + (counts[st]?.chapterCount || 0),
        0
      )
      // phantom：非官方方向且 0 章 → 不展示
      if (!d.official && count === 0) continue
      out.push({ id: d.id, groupId: g.id, name: d.name, color: g.color, count })
    }
  }
  return out
}

function visibleDirections(m: any) {
  return flattenDirections(m).slice(0, 6)
}

function hiddenDirectionCount(m: any) {
  return Math.max(0, flattenDirections(m).length - 6)
}

useSeoMeta({
  title: '学习中心',
  description: '前端、后端、运维、AI 四方向系统学习路径，按章节循序渐进，完成打卡解锁进阶内容。',
  ogTitle: '学习中心 · MentorLoop',
  ogDescription: '四方向系统学习路径，免费浏览全部课程章节。',
  ogType: 'website',
  ogUrl: safeOgUrl()
})
</script>
