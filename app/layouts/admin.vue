<template>
  <div class="admin-shell">
    <aside class="admin-side">
      <div class="admin-logo">⚙️ MentorLoop <span class="text-brand-coral">后台</span></div>
      <nav class="admin-nav">
        <NuxtLink to="/admin" class="nav-item" :class="{ active: $route.path === '/admin' }">📊 数据看板</NuxtLink>
        <NuxtLink to="/admin/users" class="nav-item" :class="{ active: $route.path.startsWith('/admin/users') }">👥 用户体系</NuxtLink>
        <NuxtLink to="/admin/content" class="nav-item" :class="{ active: $route.path.startsWith('/admin/content') }">📚 内容管理</NuxtLink>
        <NuxtLink to="/admin/exams" class="nav-item" :class="{ active: $route.path.startsWith('/admin/exams') }">📝 试卷题库</NuxtLink>
        <NuxtLink to="/admin/interview" class="nav-item" :class="{ active: $route.path.startsWith('/admin/interview') }">💡 面试题库</NuxtLink>
        <NuxtLink to="/admin/questions" class="nav-item" :class="{ active: $route.path.startsWith('/admin/questions') }">📥 待补充题库</NuxtLink>
        <NuxtLink to="/admin/orders" class="nav-item" :class="{ active: $route.path.startsWith('/admin/orders') }">💳 订单 / 订阅</NuxtLink>
        <NuxtLink to="/admin/referrals" class="nav-item" :class="{ active: $route.path.startsWith('/admin/referrals') }">🤝 内推资源</NuxtLink>
      </nav>
      <div class="admin-foot">
        <NuxtLink to="/" class="nav-item">← 返回前台</NuxtLink>
        <button class="nav-item" @click="logout">⏻ 退出登录</button>
      </div>
    </aside>
    <main class="admin-main">
      <div v-if="denied" class="card p-10 text-center">
        <p class="text-lg font-bold mb-2">无访问权限</p>
        <p class="text-muted">管理后台仅限管理员账号。请使用 admin@mentorloop.com 登录。</p>
        <NuxtLink to="/login" class="btn btn-primary mt-4">前往登录</NuxtLink>
      </div>
      <!-- slot 始终参与渲染，确保 <NuxtPage/> 内容存在，消除 NUXT_E4011 警告；denied 时仅用 CSS 隐藏 -->
      <div v-show="!denied" class="contents"><slot /></div>
    </main>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()
const denied = ref(false)

function logout() { auth.logout(); router.push('/login') }

watch(() => auth.loaded, (loaded) => {
  if (loaded && auth.user?.role !== 'admin') {
    denied.value = true
  }
}, { immediate: true })
</script>

<style scoped>
.admin-shell { display: flex; min-height: 100vh; }
.admin-side {
  width: 230px; flex-shrink: 0; padding: 22px 16px;
  background: #fff; border-right: 1px solid var(--line, #e5e7eb);
  display: flex; flex-direction: column; gap: 8px;
  position: sticky; top: 0; height: 100vh;
}
.dark .admin-side { background: #0f172a; border-color: #1e293b; }
.admin-logo { font-weight: 800; font-size: 18px; margin-bottom: 14px; padding: 0 8px; }
.admin-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.nav-item {
  display: block; padding: 10px 12px; border-radius: 10px; color: #475569;
  font-weight: 600; font-size: 14px; text-decoration: none; cursor: pointer; border: none;
  background: none; text-align: left; width: 100%;
}
.dark .nav-item { color: #cbd5e1; }
.nav-item:hover { background: rgba(255,94,126,.08); }
.nav-item.active { background: linear-gradient(120deg, rgba(255,94,126,.16), rgba(255,138,92,.16)); color: var(--brand); }
.admin-foot { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--line, #e5e7eb); padding-top: 10px; }
.dark .admin-foot { border-color: #1e293b; }
.admin-main { flex: 1; padding: 28px 32px; max-width: 1100px; width: 100%; }
</style>
