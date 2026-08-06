<template>
  <div ref="el" class="w-full" :style="{ height: height + 'px' }"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'

const props = defineProps({
  treeData: { type: Array as () => any[], required: true },
  initialDepth: { type: Number, default: 2 },
  height: { type: Number, default: 660 },
  dark: { type: Boolean, default: false }
})
const emit = defineEmits<{ (e: 'nodeClick', payload: any): void }>()

const el = ref<HTMLElement | null>(null)
let chart: any = null

function labelColor() {
  return props.dark ? '#cbd5e1' : '#475569'
}
function lineColor() {
  return props.dark ? '#475569' : '#cbd5e1'
}

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
        top: '3%', left: '7%', bottom: '3%', right: '16%',
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
        roam: true,
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
  if (!chart) chart = echarts.init(el.value)
  chart.setOption(buildOption(), true)
  chart.off('click')
  chart.on('click', (params: any) => {
    if (params.data && params.data._meta) emit('nodeClick', params.data._meta)
  })
}

function onResize() { chart?.resize() }

onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(() => props.treeData, () => render(), { deep: false })
watch(() => props.dark, () => render())
</script>
