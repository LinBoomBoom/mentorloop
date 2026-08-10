<template>
  <div class="w-full rounded-xl border border-line bg-surface overflow-hidden">
    <!-- 画布：高度自适应内容，页面自然滚动，不再有拖拽平移窗口 -->
    <div ref="el" class="w-full" :style="{ height: contentHeight + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  treeData: { type: Array as () => any[], required: true },
  // 999 = 全部展开（技能点默认展示，不再隐藏）
  initialDepth: { type: Number, default: 999 },
  dark: { type: Boolean, default: false }
})
const emit = defineEmits<{ (e: 'nodeClick', payload: any): void }>()

const el = ref<HTMLElement | null>(null)
let chart: any = null

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
        if (m.must) s += `<br/><span style="color:var(--brand)">★ 该等级必会项</span>`
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
        roam: false,
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

function onResize() { chart?.resize() }

onMounted(() => {
  render()
  if (typeof window !== 'undefined') window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(() => props.treeData, () => { render() }, { deep: false })
watch(() => props.dark, () => render())
watch(contentHeight, () => { nextTick(() => chart?.resize()) })
</script>
