<template>
  <div
    ref="viewportEl"
    class="relative w-full overflow-hidden rounded-xl border border-line bg-surface"
    :style="{ height: viewportHeight, cursor: dragging ? 'grabbing' : 'grab' }"
    @wheel.prevent="onWheel"
    @mousedown.prevent="onDown"
    @mousemove="onMove"
    @mouseup="onUp"
    @mouseleave="onUp"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onUp"
  >
    <!-- 工具栏：缩放 / 重置 -->
    <div class="absolute right-2 top-2 z-10 flex gap-1.5 select-none">
      <button type="button" class="zoom-btn w-8 h-8 rounded-lg border border-line bg-surface text-sub hover:text-ink hover:border-brand-coral flex items-center justify-center text-base shadow-soft" title="放大" @click="zoomBy(1.15)">＋</button>
      <button type="button" class="zoom-btn w-8 h-8 rounded-lg border border-line bg-surface text-sub hover:text-ink hover:border-brand-coral flex items-center justify-center text-base shadow-soft" title="缩小" @click="zoomBy(1 / 1.15)">－</button>
      <button type="button" class="zoom-btn w-8 h-8 rounded-lg border border-line bg-surface text-sub hover:text-ink hover:border-brand-coral flex items-center justify-center text-base shadow-soft" title="适应全图（概览）" @click="fitView">⤢</button>
    </div>

    <!-- 操作提示 -->
    <div
      class="absolute left-2 bottom-2 z-10 text-[11px] text-muted bg-surface border border-line px-2 py-1 rounded-md pointer-events-none"
    >
      滚轮缩放 · 拖拽平移浏览 · 点击节点看说明（⤢ 看全图）
    </div>

    <!-- 平移 / 缩放舞台（transform 实现，四方向对称夹紧） -->
    <div ref="stageEl" :style="stageStyle">
      <div ref="el" class="w-full" :style="{ height: contentHeight + 'px' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  treeData: { type: Array as () => any[], required: true },
  // 999 = 全部展开（技能点默认展示，不再隐藏）
  initialDepth: { type: Number, default: 999 },
  // 兼容旧调用：作为可视窗口高度，0 表示自适应
  height: { type: Number, default: 0 },
  dark: { type: Boolean, default: false }
})
const emit = defineEmits<{ (e: 'nodeClick', payload: any): void }>()

const viewportEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const el = ref<HTMLElement | null>(null)
let chart: any = null

const dragging = ref(false)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
const minScale = 0.05
const maxScale = 2.5

// 可视窗口高度（内容会远大于它，靠平移/缩放浏览）
const viewportHeight = computed(() =>
  props.height && props.height > 0 ? props.height + 'px' : 'clamp(460px, 72vh, 820px)'
)

// 内容高度：随展开后的叶子（技能点）数量自适应，画布不再固定宽高
function countLeaves(nodes: any[]): number {
  if (!nodes || !nodes.length) return 0
  let c = 0
  for (const n of nodes) {
    if (n.children && n.children.length) c += countLeaves(n.children)
    else c += 1
  }
  return c
}
const contentHeight = computed(() => {
  const leaves = countLeaves(props.treeData)
  return Math.max(420, leaves * 22 + 120)
})

// 舞台 transform：translate + scale，原点在左上，便于以光标为锚点缩放
const stageStyle = computed(() => ({
  position: 'absolute' as const,
  top: '0',
  left: '0',
  width: '100%',
  height: contentHeight.value + 'px',
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  willChange: 'transform'
}))

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

// 四方向对称夹紧：内容始终与视口有重叠，永不整体移出画布
function clampPan() {
  const vw = viewportEl.value?.clientWidth || 0
  const vh = viewportEl.value?.clientHeight || 0
  const innerW = vw * scale.value
  const innerH = contentHeight.value * scale.value
  if (innerW <= vw) tx.value = (vw - innerW) / 2
  else tx.value = clamp(tx.value, vw - innerW, 0)
  if (innerH <= vh) ty.value = (vh - innerH) / 2
  else ty.value = clamp(ty.value, vh - innerH, 0)
}

// 重置为「可读比例」（1:1）：文字清晰，靠拖拽/滚动浏览，无需放大
function resetView() {
  scale.value = 1
  clampPan()
}

// 适应全图（概览）：等比缩小到整棵内容可见；点 ⤢ 时调用
function fitView() {
  const vw = viewportEl.value?.clientWidth || 0
  const vh = viewportEl.value?.clientHeight || 0
  const fit = Math.min(1, vh / contentHeight.value, vw / (vw || 1))
  scale.value = clamp(fit, minScale, maxScale)
  clampPan()
}

function zoomAt(cx: number, cy: number, factor: number) {
  const ns = clamp(scale.value * factor, minScale, maxScale)
  const wx = (cx - tx.value) / scale.value
  const wy = (cy - ty.value) / scale.value
  tx.value = cx - wx * ns
  ty.value = cy - wy * ns
  scale.value = ns
  clampPan()
}
function zoomBy(factor: number) {
  const vw = viewportEl.value?.clientWidth || 0
  const vh = viewportEl.value?.clientHeight || 0
  zoomAt(vw / 2, vh / 2, factor)
}

function onWheel(e: WheelEvent) {
  const rect = viewportEl.value!.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top
  zoomAt(px, py, e.deltaY < 0 ? 1.12 : 1 / 1.12)
}

let lastX = 0
let lastY = 0
function onDown(e: MouseEvent) {
  dragging.value = true
  lastX = e.clientX
  lastY = e.clientY
}
function onMove(e: MouseEvent) {
  if (!dragging.value) return
  tx.value += e.clientX - lastX
  ty.value += e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  clampPan()
}
function onUp() { dragging.value = false }

// 触摸：单指平移
function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    dragging.value = true
    lastX = e.touches[0].clientX
    lastY = e.touches[0].clientY
  }
}
function onTouchMove(e: TouchEvent) {
  if (!dragging.value || e.touches.length !== 1) return
  const t = e.touches[0]
  tx.value += t.clientX - lastX
  ty.value += t.clientY - lastY
  lastX = t.clientX
  lastY = t.clientY
  clampPan()
}

// ---------------- ECharts ----------------
function labelColor() { return props.dark ? '#cbd5e1' : '#475569' }
function lineColor() { return props.dark ? '#475569' : '#cbd5e1' }

function buildOption() {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: props.dark ? '#1e293b' : '#ffffff',
      borderColor: props.dark ? '#334155' : '#e2e8f0',
      textStyle: { color: props.dark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
      formatter: (p: any) => {
        const m = p.data?._meta
        if (!m) return `<b>${p.name}</b>`
        let s = `<b>${p.name}</b>`
        if (m.stance) s += `<br/><span style="color:${props.dark ? '#94a3b8' : '#64748b'}">${m.stance}</span>`
        if (m.desc) s += `<br/>${m.desc}`
        if (m.must) s += `<br/><span style="color:#ff5e7e">★ 该等级必会项</span>`
        return s
      }
    },
    series: [
      {
        type: 'tree',
        data: props.treeData,
        top: 16, left: 14, bottom: 16, right: '14%',
        layout: 'orthogonal',
        orient: 'LR',
        symbol: 'circle',
        symbolSize: (_v: any, params: any) => {
          const t = params.data?._type
          if (t === 'root') return 17
          if (t === 'subtrack') return 13
          if (t === 'level') return 10
          return 7
        },
        initialTreeDepth: props.initialDepth,
        roam: false, // 平移/缩放改由自管 transform 处理，避免 roam 方向夹紧不对称
        expandAndCollapse: true,
        animationDuration: 450,
        animationDurationUpdate: 600,
        label: {
          position: 'right',
          verticalAlign: 'middle',
          align: 'left',
          fontSize: 12,
          color: labelColor(),
          formatter: (p: any) => {
            const m = p.data?._meta
            const must = m?.must ? ' ★' : ''
            return p.name + must
          }
        },
        leaves: { label: { position: 'right', align: 'left', fontSize: 12, color: labelColor() } },
        lineStyle: { color: lineColor(), width: 1, curveness: 0.5 },
        emphasis: { focus: 'descendant' },
        itemStyle: { borderColor: props.dark ? '#0f172a' : '#ffffff', borderWidth: 1.5 }
      }
    ]
  }
}

function render() {
  if (!el.value) return
  if (!chart) {
    const dpr = Math.min(1.5, (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1))
    chart = echarts.init(el.value, null, { renderer: 'canvas', devicePixelRatio: dpr })
  }
  chart.setOption(buildOption(), true)
  chart.off('click')
  chart.on('click', (params: any) => {
    if (params.data && params.data._meta) emit('nodeClick', params.data._meta)
  })
}

function relayout() {
  nextTick(() => {
    chart?.resize()
    resetView()
  })
}

function onResize() { chart?.resize(); clampPan() }

onMounted(() => {
  render()
  resetView()
  if (typeof window !== 'undefined') window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(() => props.treeData, () => { render(); relayout() }, { deep: false })
watch(() => props.dark, () => render())
watch(contentHeight, () => { chart?.resize(); resetView() })
</script>

