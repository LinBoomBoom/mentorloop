<template>
  <div class="card p-5 sm:p-6 h-full flex flex-col">
    <!-- 模块头 -->
    <div class="flex items-center gap-4 mb-4">
      <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-soft shrink-0" :style="{ background: module.color }">
        <Icon :name="module.icon || 'layers'" :size="22" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-extrabold text-lg flex items-center gap-2 leading-none">
          {{ module.name }}
          <span v-if="moduleLit" class="text-amber-400 inline-flex" title="已点亮整棵技能树"><Icon name="trophy" :size="18" /></span>
        </h3>
        <div class="text-xs text-muted mt-1.5">
          已点亮 <span class="font-semibold" :class="chaptersLit === module.chapters.length ? 'text-emerald-600' : ''">{{ chaptersLit }}</span>/{{ module.chapters.length }} 分支 · {{ sectionsDone }}/{{ sectionsTotal }} 节
        </div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-2xl font-extrabold tabular-nums" :style="{ color: module.color }">{{ modulePercent }}%</div>
      </div>
    </div>

    <!-- 模块进度条 -->
    <div class="h-1.5 rounded-full bg-ink/8 overflow-hidden mb-5">
      <div class="h-full rounded-full transition-all duration-700 ease-out" :style="{ width: modulePercent + '%', background: moduleLit ? 'linear-gradient(90deg,#ffc24b,#ff8a5c)' : module.color }"></div>
    </div>

    <!-- 树：主干 + 分支 -->
    <div class="relative pl-5 flex-1">
      <!-- 主干 trunk -->
      <div class="absolute left-[6px] top-3 bottom-3 w-[3px] rounded-full transition-all duration-700"
           :style="moduleLit
             ? 'background:linear-gradient(180deg,#ffc24b,#ff8a5c);box-shadow:0 0 14px rgba(255,194,75,.7)'
             : 'background:' + module.color + '55'"></div>

      <div class="space-y-1.5">
        <div v-for="(ch, ci) in module.chapters" :key="ch.id" class="relative">
          <!-- 分支连接点 -->
          <span class="absolute -left-[14px] top-3.5 w-3 h-3 rounded-full border-2 transition-all duration-500"
                :style="chapterLit(ch)
                  ? 'background:' + module.color + ';border-color:' + module.color + ';box-shadow:0 0 10px ' + module.color
                  : 'background:#fff;border-color:' + module.color + '66'"></span>

          <!-- 章行（分支） -->
          <button type="button" @click="toggleChapter(ci)"
                  class="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition group"
                  :class="chapterLit(ch) ? 'bg-ink/4' : 'hover:bg-ink/4'">
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm flex items-center gap-2">
                <span v-if="chapterLit(ch)" class="text-emerald-500 inline-flex"><Icon name="check" :size="15" /></span>
                <span :class="chapterLit(ch) ? 'text-emerald-600' : 'text-ink'">{{ ci + 1 }}. {{ ch.title }}</span>
              </div>
              <div class="text-[11px] text-muted mt-0.5 tabular-nums">
                {{ ch.sections.filter((s: any) => isDone(progress, module.id, ch.id, s.id)).length }}/{{ ch.sections.length }} 节
                <span v-if="chapterLit(ch)" class="text-emerald-500 ml-1">· 已点亮</span>
              </div>
            </div>
            <Icon :name="expanded === ci ? 'chevronDown' : 'chevronRight'" :size="16" class="text-muted shrink-0 transition-transform" :class="expanded === ci ? 'rotate-0' : ''" />
          </button>

          <!-- 叶子（节） -->
          <div v-if="expanded === ci" class="ml-4 mt-1.5 mb-2 flex flex-wrap gap-2">
            <button v-for="s in ch.sections" :key="s.id" type="button"
                    @click="onLeaf(ch, s)"
                    :title="s.title + (isDone(progress, module.id, ch.id, s.id) ? ' · 已掌握（点击取消）' : ' · 点击标记已掌握')"
                    class="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition"
                    :class="isDone(progress, module.id, ch.id, s.id)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'
                      : 'border-line text-muted hover:border-brand-coral/40 hover:text-ink'">
              <span class="w-1.5 h-1.5 rounded-full transition-all"
                    :class="isDone(progress, module.id, ch.id, s.id) ? 'bg-emerald-500' : 'bg-ink/20 group-hover:bg-brand-coral'"></span>
              <span class="truncate max-w-[150px]">{{ s.title }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  module: { type: Object, required: true },
  progress: { type: Object, default: () => ({}) }
})
const emit = defineEmits<{ (e: 'toggle', p: { moduleId: string; chapterId: string; sectionId: string; current: boolean }): void }>()

const { isDone } = useLearning()
const expanded = ref<number | null>(0) // 默认展开首章，展示叶子形态

const toggleChapter = (ci: number) => { expanded.value = expanded.value === ci ? null : ci }
const onLeaf = (ch: any, s: any) =>
  emit('toggle', { moduleId: props.module.id, chapterId: ch.id, sectionId: s.id, current: isDone(props.progress, props.module.id, ch.id, s.id) })

const chapterLit = (ch: any) => ch.sections.length > 0 && ch.sections.every((s: any) => isDone(props.progress, props.module.id, ch.id, s.id))
const chaptersLit = computed(() => (props.module.chapters || []).filter(chapterLit).length)
const sectionsTotal = computed(() => (props.module.chapters || []).reduce((n: number, c: any) => n + c.sections.length, 0))
const sectionsDone = computed(() => (props.module.chapters || []).reduce((n: number, c: any) => n + c.sections.filter((s: any) => isDone(props.progress, props.module.id, c.id, s.id)).length, 0))
const modulePercent = computed(() => sectionsTotal.value ? Math.round((sectionsDone.value / sectionsTotal.value) * 100) : 0)
const moduleLit = computed(() => (props.module.chapters || []).length > 0 && chaptersLit.value === props.module.chapters.length)
</script>
