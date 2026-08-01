<template>
  <button class="btn btn-ghost !px-2.5 !py-2.5" @click="toggle" :aria-label="isDark ? '切换浅色' : '切换深色'">
    <Icon :name="isDark ? 'sun' : 'moon'" :size="18" />
  </button>
</template>

<script setup lang="ts">
const { isDark, toggle } = useTheme()
</script>
