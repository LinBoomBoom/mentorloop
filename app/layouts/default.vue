<template>
  <div class="min-h-screen flex">
    <!-- 桌面侧边栏 -->
    <aside class="hidden md:flex flex-col w-[252px] shrink-0 glass border-r border-line fixed inset-y-0 left-0 z-30">
      <div class="px-6 pt-7 pb-5 flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-glow brand-gradient">
          <Icon name="graduation" :size="22" />
        </div>
        <div>
          <div class="font-extrabold text-[17px] leading-none gradient-text">MentorLoop</div>
          <div class="text-[11px] text-muted mt-1">学习 · 面试一体导师</div>
        </div>
      </div>

      <div class="px-4 pb-3">
        <SearchBar />
      </div>

      <nav class="flex-1 px-4 space-y-1 mt-2">
        <NuxtLink v-for="item in nav" :key="item.to" :to="item.to"
                  class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  :class="isActive(item) ? 'bg-brand-coral/12 text-brand-coral' : 'text-sub hover:bg-ink/5 hover:text-ink'">
          <Icon :name="item.icon" :size="19" />
          <span>{{ item.label }}</span>
          <span v-if="item.to === '/vip' && !auth.isVip" class="ml-auto tag !py-0.5 tag-vip text-[10px] !px-2">VIP</span>
        </NuxtLink>
      </nav>

      <!-- 用户卡片 -->
      <div class="px-4 pb-5">
        <div v-if="auth.isLoggedIn" class="card p-4 flex items-center gap-3">
          <NuxtLink to="/account" class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
               :style="{ background: avatarBg }">
            {{ avatarText }}
          </NuxtLink>
          <NuxtLink to="/account" class="min-w-0 flex-1">
            <div class="text-sm font-bold truncate">{{ auth.user?.nickname || '学员' }}</div>
            <div class="text-[11px]" :class="auth.isVip ? 'text-brand-coral font-semibold' : 'text-muted'">
              {{ auth.isVip ? '👑 VIP 会员' : '免费用户' }}
            </div>
          </NuxtLink>
          <button class="text-muted hover:text-brand-coral transition" @click="logout" title="退出登录" aria-label="退出登录">
            <Icon name="logout" :size="18" />
          </button>
        </div>
        <NuxtLink v-else to="/login" class="btn btn-primary btn-block"><Icon name="user" :size="16" /> 登录 / 注册</NuxtLink>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="flex-1 md:ml-[252px] min-w-0">
      <!-- 移动端顶栏 -->
      <header class="md:hidden sticky top-0 z-20 glass border-b border-line px-4 h-14 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 font-extrabold gradient-text shrink-0">MentorLoop</div>
        <div class="flex-1 max-w-[180px]">
          <SearchBar placeholder="搜索…" />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <NuxtLink v-if="!auth.isLoggedIn" to="/login" class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs brand-gradient"><Icon name="user" :size="16"/></NuxtLink>
          <button v-else class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" :style="{ background: avatarBg }">
            {{ avatarText }}
          </button>
        </div>
      </header>

      <main class="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pb-24 md:pb-8 max-w-[1200px] mx-auto">
        <slot />
      </main>
    </div>

    <!-- 移动端底部 Tab -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-line grid grid-cols-5">
      <NuxtLink v-for="item in nav" :key="item.to" :to="item.to"
                class="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition"
                :class="isActive(item) ? 'text-brand-coral' : 'text-muted'">
        <Icon :name="item.icon" :size="20" />
        <span>{{ item.short }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()
const route = useRoute()
const nav = [
  { to: '/', label: '学习看板', short: '首页', icon: 'home' },
  { to: '/learn', label: '学习中心', short: '学习', icon: 'book' },
  { to: '/interview', label: '面试题库', short: '面试', icon: 'chat' },
  { to: '/exam', label: '模拟答卷', short: '答卷', icon: 'clipboard' },
  { to: '/skills', label: '技能树', short: '技能树', icon: 'tree' },
  { to: '/vip', label: 'VIP 会员', short: 'VIP', icon: 'crown' }
]
const isActive = (item) => route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))

const avatarText = computed(() => (auth.user?.nickname || '学').slice(0, 1).toUpperCase())
const avatarBg = computed(() => auth.isVip
  ? 'linear-gradient(120deg,#ff5e7e,#ff8a5c 55%,#ffc24b)'
  : 'linear-gradient(120deg,#94a3b8,#64748b)')

function logout() {
  auth.logout()
  navigateTo('/login')
}
</script>
