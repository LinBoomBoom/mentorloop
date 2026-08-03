<template>
  <Transition name="btt">
    <button v-if="visible" type="button" @click="toTop" :aria-label="label"
            class="fixed z-40 bottom-20 md:bottom-6 right-5 w-11 h-11 rounded-full flex items-center justify-center
                   text-white shadow-glow brand-gradient hover:-translate-y-0.5 active:scale-95 transition-transform"
            :title="label">
      <Icon name="arrowUp" :size="20" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
// 长内容页「回到顶部」浮动按钮：滚动超过阈值后浮出，点击平滑回顶。
// 全局挂载于 default 布局，所有内容页自动受益。
const label = '回到顶部'
const visible = ref(false)
const THRESHOLD = 480

function onScroll() {
  visible.value = window.scrollY > THRESHOLD
}
function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }
})
onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.btt-enter-active, .btt-leave-active { transition: opacity .2s ease, transform .2s ease; }
.btt-enter-from, .btt-leave-to { opacity: 0; transform: translateY(8px); }
</style>
