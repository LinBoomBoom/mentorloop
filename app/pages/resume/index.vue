<template>
  <div></div>
</template>

<script setup lang="ts">
// /resume 本身没有页面，真正的简历诊断入口是 /resume/diag。
// 直接访问 /resume 时 301 重定向过去，避免触发 404（VUE_ROUTER_R0004）。
throw navigateTo('/resume/diag', { redirectCode: 301 })
</script>
