<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" stroke="rgb(var(--line))" :stroke-width="stroke" />
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" :stroke="color" :stroke-width="stroke"
              stroke-linecap="round" :stroke-dasharray="circ" :stroke-dashoffset="offset"
              style="transition: stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)" />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-2xl font-extrabold" :style="{ color }">{{ Math.round(value) }}%</span>
      <span v-if="label" class="text-[11px] text-muted mt-0.5">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 120 },
  stroke: { type: Number, default: 10 },
  color: { type: String, default: '#e11d48' },
  label: { type: String, default: '' }
})
const r = computed(() => (props.size - props.stroke) / 2)
const circ = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => circ.value * (1 - Math.min(100, props.value) / 100))
</script>
