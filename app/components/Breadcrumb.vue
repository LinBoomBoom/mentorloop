<template>
  <nav class="text-sm text-muted mb-3 flex items-center gap-1.5 flex-wrap" aria-label="面包屑">
    <template v-for="(item, i) in items" :key="i">
      <NuxtLink v-if="item.to" :to="item.to" class="hover:text-ink transition inline-flex items-center gap-1">
        <Icon v-if="item.icon" :name="item.icon" :size="14" />
        <span>{{ item.label }}</span>
      </NuxtLink>
      <span v-else class="text-ink font-medium">{{ item.label }}</span>
      <Icon v-if="i < items.length - 1" name="chevronRight" :size="14" class="opacity-60" />
    </template>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ items: { label: string; to?: string; icon?: string }[] }>()
</script>
