<template>
  <StyleProvider hash-priority="1">
    <ConfigProvider :theme="theme">
      <App>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </App>
    </ConfigProvider>
  </StyleProvider>
</template>

<script setup lang="ts">
import { App, ConfigProvider, StyleProvider, theme as antdTheme } from 'ant-design-vue'

// 品牌主题令牌：主色统一为可达品牌红 #e11d48（rose-600，白字/红字双向过 WCAG AA），成功/警告/错误对齐既有语义色。
const isDark = ref(false)
function syncDark() {
  if (import.meta.client) {
    isDark.value = document.documentElement.classList.contains('dark')
  }
}
onMounted(() => {
  syncDark()
  const mo = new MutationObserver(syncDark)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

const theme = computed(() => ({
  token: {
    colorPrimary: '#e11d48',
    colorInfo: '#e11d48',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 10,
    fontSize: 14,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
  },
  algorithm: isDark.value ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm
}))
</script>
