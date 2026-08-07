<template>
  <div>
    <!-- 标题 -->
    <div class="mb-5">
      <h1 class="text-2xl font-extrabold flex items-center gap-2">
        <Icon name="compass" :size="24" style="color:#ff5e7e" />
        技能路线图
      </h1>
      <p class="text-muted text-sm mt-1.5">
        按「方向 → 细分赛道 → 等级（初级 / 中级 / 高级）→ 技能点」逐层拆解，告诉你每个阶段该学什么、哪些是高薪岗位硬门槛。
        先看赛道，再对照等级补能力，迷茫会少很多。
      </p>
    </div>

    <!-- 汇总卡片 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">技术方向</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums">{{ roadmap.length }}</div>
      </a-card>
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">细分赛道</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums text-emerald-600">{{ totalSubTracks }}</div>
      </a-card>
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">技能点总数</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums" style="color:#ff5e7e">{{ totalSkills }}</div>
      </a-card>
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">必会硬门槛</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums text-amber-500">{{ totalMust }}</div>
      </a-card>
    </div>

    <!-- 控制条：方向 / 视图 / 搜索 -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
      <div class="flex flex-wrap gap-2">
        <button v-for="t in tabs" :key="t.id" type="button" @click="activeDir = t.id"
                class="px-3.5 py-2 rounded-xl text-sm font-semibold transition border"
                :style="activeDir === t.id
                  ? { background: t.color + '14', color: t.color, borderColor: t.color + '66' }
                  : { borderColor: 'rgb(var(--line))', color: 'rgb(var(--sub))' }">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :style="{ background: t.color }"></span>{{ t.name }}
          </span>
        </button>
      </div>

      <div class="lg:ml-auto flex items-center gap-2">
        <!-- 视图切换 -->
        <div class="flex p-1 rounded-xl border border-line bg-surface">
          <button type="button" @click="view = 'tree'" class="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                  :class="view === 'tree' ? 'bg-brand-coral text-white shadow-soft' : 'text-sub hover:text-ink'">🌳 树形图</button>
          <button type="button" @click="view = 'board'" class="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                  :class="view === 'board' ? 'bg-brand-coral text-white shadow-soft' : 'text-sub hover:text-ink'">🗂 路线图</button>
        </div>
        <!-- 搜索 -->
        <a-input v-model:value="kw" placeholder="搜索技能，如：性能 / RAG / 微服务" allow-clear class="w-44 sm:w-56">
          <template #prefix><Icon name="search" :size="15" /></template>
        </a-input>
      </div>
    </div>

    <!-- 等级图例 -->
    <div class="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" :style="{ background: levelColor.junior }"></span>初级 · 跟做具体功能</span>
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" :style="{ background: levelColor.mid }"></span>中级 · 独立负责模块</span>
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" :style="{ background: levelColor.senior }"></span>高级 · 主导架构与选型</span>
      <span class="inline-flex items-center gap-1.5"><span class="text-amber-500 font-bold">★</span>该等级必会（高薪岗位硬门槛）</span>
    </div>

    <!-- 树形图视图 -->
    <div v-show="view === 'tree'">
      <a-card :body-style="{ padding: kw ? '8px' : '0' }">
        <div v-if="treeData.length" class="p-2">
          <SkillTreeChart :tree-data="treeData" :initial-depth="initialDepth" :dark="isDark" :height="treeHeight" @node-click="openNode" />
          <p class="text-[11px] text-muted mt-1 px-2">提示：可滚轮缩放、拖拽平移；点击节点查看说明；虚线框为「方向 / 赛道 / 等级」，小圆点为具体技能。</p>
        </div>
        <a-empty v-else description="没有匹配的技能，换个关键词试试" class="py-16" />
      </a-card>
    </div>

    <!-- 路线图（卡片）视图 -->
    <div v-show="view === 'board'">
      <div v-if="boardView.length" class="space-y-8">
        <section v-for="g in boardView" :key="g.direction.id">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full" :style="{ background: g.direction.color }"></span>
            <h2 class="text-lg font-extrabold">{{ g.direction.name }}</h2>
            <span class="text-xs text-muted">· {{ g.subTracks.length }} 个细分赛道</span>
          </div>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
            <a-card v-for="st in g.subTracks" :key="st.id" :body-style="{ padding: '0' }" class="overflow-hidden">
              <div class="px-4 py-3 flex items-start gap-3 border-b border-line" :style="{ background: g.direction.color + '0a' }">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" :style="{ background: g.direction.color }">
                  <Icon :name="st.icon" :size="18" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-[15px] leading-tight">{{ st.name }}</div>
                  <div class="text-[11px] text-muted mt-0.5 leading-snug">{{ st.summary }}</div>
                </div>
              </div>
              <div class="grid grid-cols-3 divide-x divide-line">
                <div v-for="lv in st.levels" :key="lv.level" class="p-3">
                  <div class="flex items-center gap-1.5 mb-2">
                    <span class="w-2 h-2 rounded-full" :style="{ background: levelColor[lv.level] }"></span>
                    <span class="text-xs font-bold" :style="{ color: levelColor[lv.level] }">{{ lv.title }}</span>
                    <span class="text-[10px] text-muted ml-auto">{{ lv.skills.length }}</span>
                  </div>
                  <div class="text-[10px] text-muted mb-2 leading-snug">{{ lv.stance }}</div>
                  <div class="flex flex-col gap-1.5">
                    <button v-for="s in lv.skills" :key="s.name" type="button" @click="openSkill(s, lv, st, g.direction)"
                            :title="s.desc || s.name"
                            class="text-left text-[12px] leading-snug px-2 py-1.5 rounded-lg border transition"
                            :class="s.must ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400' : 'border-line text-sub hover:border-brand-coral/40 hover:text-ink'">
                      <span class="inline-flex items-start gap-1">
                        <span v-if="s.must" class="text-amber-500 font-bold leading-none">★</span>
                        <span>{{ s.name }}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </a-card>
          </div>
        </section>
      </div>
      <a-empty v-else description="没有匹配的技能，换个关键词试试" class="py-16" />
    </div>

    <!-- 详情抽屉 -->
    <a-drawer :open="!!selected" :title="drawerTitle" placement="right" :width="380" @close="selected = null">
      <template v-if="selected">
        <div v-if="selected.kind === 'skill'">
          <div class="flex flex-wrap gap-2 mb-3">
            <span class="text-xs font-semibold px-2 py-1 rounded-full" :style="{ background: levelColor[selected.level] + '1a', color: levelColor[selected.level] }">{{ selected.levelTitle }}</span>
            <span v-if="selected.must" class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">★ 必会</span>
          </div>
          <p class="text-sm text-ink leading-relaxed">{{ selected.desc || '（暂无详细说明）' }}</p>
          <a-divider />
          <div class="text-xs text-muted">
            所属赛道：<span class="text-ink font-medium">{{ selected.subtrack }}</span><br />
            技术方向：<span class="text-ink font-medium">{{ selected.direction }}</span>
          </div>
        </div>

        <div v-else-if="selected.kind === 'level'">
          <span class="text-xs font-semibold px-2 py-1 rounded-full" :style="{ background: levelColor[selected.level] + '1a', color: levelColor[selected.level] }">{{ selected.title }}</span>
          <p class="text-sm text-ink leading-relaxed mt-3">{{ selected.stance }}</p>
          <a-divider>该等级技能（{{ selected.count }}）</a-divider>
          <ul class="space-y-1.5">
            <li v-for="name in selected.skills" :key="name" class="text-sm text-sub flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" :style="{ background: levelColor[selected.level] }"></span>{{ name }}
            </li>
          </ul>
          <div class="text-xs text-muted mt-3">所属赛道：<span class="text-ink">{{ selected.subtrack }}</span></div>
        </div>

        <div v-else-if="selected.kind === 'subtrack'">
          <p class="text-sm text-ink leading-relaxed">{{ selected.summary }}</p>
          <a-divider>各等级技能数</a-divider>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div v-for="lv in levelOrder" :key="lv" class="rounded-xl p-3 border border-line">
              <div class="text-xs font-bold" :style="{ color: levelColor[lv] }">{{ levelLabel[lv] }}</div>
              <div class="text-xl font-extrabold mt-1 tabular-nums">{{ selected.counts[lv] }}</div>
            </div>
          </div>
          <div class="text-xs text-muted mt-3">技术方向：<span class="text-ink">{{ selected.direction }}</span></div>
        </div>

        <div v-else-if="selected.kind === 'direction'">
          <div class="w-12 h-12 rounded-2xl mb-3" :style="{ background: selected.color }"></div>
          <p class="text-sm text-ink">共 <b>{{ selected.subCount }}</b> 个细分赛道、<b>{{ selected.total }}</b> 项技能点。点击上方树形图或切换到「路线图」查看具体拆解。</p>
        </div>

        <div v-else>
          <p class="text-sm text-muted">这是整棵技能路线图的入口。选择某个技术方向，再沿「赛道 → 等级 → 技能」向下钻取。</p>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { roadmap, levelColor, levelLabel, buildTreeData, buildBoardView, globalStats, type LevelKey, type SkillNode, type LevelGroup, type SubTrack, type Direction } from '~/data/skillRoadmap'

const { isDark } = useTheme()

const tabs = [{ id: 'all', name: '全部', color: '#ff5e7e' }, ...roadmap.map(d => ({ id: d.id, name: d.name, color: d.color }))]
const activeDir = ref('all')
const view = ref<'tree' | 'board'>('tree')
const kw = ref('')
const levelOrder: LevelKey[] = ['junior', 'mid', 'senior']

// ---- 统计 ----
const stats = globalStats()
const totalSkills = stats.skills
const totalSubTracks = stats.subTracks
const totalMust = stats.must

// ---- 树形图 / 路线图数据（纯函数，来自数据模块）----
const treeData = computed(() => buildTreeData(activeDir.value, kw.value))
const initialDepth = computed(() => (activeDir.value === 'all' ? 1 : 2))
// 高度随展开后的可见节点数自适应：30 个赛道时固定高度会挤成一团
const treeHeight = computed(() => {
  if (activeDir.value === 'all') return 820
  const n = roadmap.find(d => d.id === activeDir.value)?.subTracks.length || 6
  return Math.min(1100, Math.max(600, n * 66))
})
const boardView = computed(() => buildBoardView(activeDir.value, kw.value))

// ---- 抽屉 ----
const selected = ref<any>(null)
const drawerTitle = computed(() => {
  const m = selected.value
  if (!m) return ''
  if (m.kind === 'skill') return m.name
  if (m.kind === 'level') return `${m.subtrack} · ${m.title}`
  if (m.kind === 'subtrack') return m.name
  if (m.kind === 'direction') return m.name
  return '技能路线图'
})
function openNode(meta: any) { selected.value = meta }
function openSkill(s: SkillNode, lv: LevelGroup, st: SubTrack, d: Direction) {
  selected.value = { kind: 'skill', name: s.name, desc: s.desc, must: s.must, level: lv.level, levelTitle: levelLabel[lv.level], subtrack: st.name, direction: d.name }
}

useSeoMeta({
  title: '技能路线图 · MentorLoop',
  description: '按技术方向 → 细分赛道 → 等级（初级/中级/高级）→ 技能点逐层拆解，告诉你每个阶段该学什么、哪些是高薪岗位硬门槛。',
  ogTitle: 'MentorLoop · 技能路线图',
  ogDescription: '方向、赛道、等级、技能点四维拆解，告别学习迷茫。',
  ogType: 'website'
})
</script>
