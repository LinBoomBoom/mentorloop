<template>
  <div class="card p-5 reveal">
    <div class="flex items-center justify-between">
      <div class="min-w-0">
        <div class="text-[12px] text-muted font-medium">{{ title }}</div>
        <div class="text-2xl font-extrabold mt-1.5 truncate" :style="{ color }">{{ value }}</div>
      </div>
      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" :style="{ background: color + '1a', color }">
        <Icon :name="icon" :size="21" />
      </div>
    </div>
    <div v-if="sub" class="text-[12px] text-muted mt-2.5 leading-relaxed">{{ sub }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: String,
  value: [String, Number],
  sub: String,
  icon: String,
  color: { type: String, default: '#e11d48' }
})
</script>
