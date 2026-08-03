<template>
  <div class="min-h-screen flex">
    <!-- 品牌沉浸区 -->
    <div class="relative hidden lg:flex w-1/2 flex-col justify-between p-12 text-white overflow-hidden brand-gradient">
      <div class="aura !absolute"><div class="blob"></div></div>
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Icon name="graduation" :size="24" />
        </div>
        <span class="text-2xl font-extrabold">MentorLoop</span>
      </div>
      <div class="relative z-10">
        <h1 class="text-[40px] leading-tight font-extrabold">把「学」与「面」<br/>练成一条线</h1>
        <p class="mt-5 text-white/85 text-[15px] leading-relaxed max-w-md">
          前端 / 后端 / 运维三方向系统学习路径，配套高频面试题、模拟答卷与 AI 复盘。
          一步一打卡，学完即掌握，面试有底气。
        </p>
        <div class="mt-8 flex gap-3">
          <div class="glass !bg-white/15 px-4 py-3 rounded-xl text-sm"><Icon name="book" :size="16" class="inline mr-1"/>{{ totalChapters || 25 }} 章系统课程</div>
          <div class="glass !bg-white/15 px-4 py-3 rounded-xl text-sm"><Icon name="layers" :size="16" class="inline mr-1"/>{{ totalSections || 106 }} 节精讲</div>
          <div class="glass !bg-white/15 px-4 py-3 rounded-xl text-sm"><Icon name="clipboard" :size="16" class="inline mr-1"/>智能复盘</div>
        </div>
      </div>
      <div class="relative z-10 text-white/70 text-xs">© 2026 MentorLoop · 学习 & 面试一体化导师</div>
    </div>

    <!-- 表单区 -->
    <div class="flex-1 flex flex-col relative">
      <div class="absolute top-4 right-4"><ThemeToggle /></div>
      <div class="flex-1 flex items-center justify-center p-6">
        <div class="w-full max-w-[400px]">
          <div class="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white brand-gradient"><Icon name="graduation" :size="20"/></div>
            <span class="text-xl font-extrabold gradient-text">MentorLoop</span>
          </div>

          <h2 class="text-2xl font-extrabold mb-1">欢迎回来 👋</h2>
          <p class="text-muted text-sm mb-6">选择你喜欢的方式登录 / 注册</p>

          <!-- 账号类型 & 方式切换 -->
          <div class="flex gap-2 mb-4">
            <button v-for="t in idTypes" :key="t.v" @click="idType = t.v"
                    class="flex-1 py-2 rounded-xl text-sm font-semibold transition border"
                    :class="idType===t.v ? 'border-brand-coral/50 text-brand-coral bg-brand-coral/5' : 'border-line text-sub'">{{ t.label }}</button>
          </div>
          <div class="flex p-1 rounded-xl bg-ink/5 mb-4">
            <button class="flex-1 py-2 rounded-lg text-sm font-semibold transition"
                    :class="mode==='password' ? 'bg-surface shadow-sm text-ink' : 'text-muted'" @click="mode='password'">密码登录</button>
            <button class="flex-1 py-2 rounded-lg text-sm font-semibold transition"
                    :class="mode==='code' ? 'bg-surface shadow-sm text-ink' : 'text-muted'" @click="mode='code'">验证码登录</button>
          </div>

          <div v-if="mode==='password'" class="space-y-3">
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon :name="idType==='phone'?'phone':'mail'" :size="17"/></span>
              <input class="input !pl-11" :type="idType==='phone'?'tel':'email'" v-model="identifier" :placeholder="idType==='phone'?'手机号':'邮箱'" />
            </div>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon name="lock" :size="17"/></span>
              <input class="input !pl-11 !pr-11" :type="showPwd?'text':'password'" v-model="password" placeholder="密码（至少6位）" />
              <button class="absolute right-3 top-1/2 -translate-y-1/2 text-muted" @click="showPwd=!showPwd"><Icon :name="showPwd?'eyeOff':'eye'" :size="17"/></button>
            </div>
            <button class="btn btn-primary btn-block" @click="submitAccount" :disabled="loading">
              {{ loading ? '处理中…' : (isReg ? '注册并登录' : '登 录') }}
            </button>
            <p class="text-center text-sm text-muted">还没有账号？
              <button class="text-brand-coral font-semibold" @click="isReg=!isReg">{{ isReg ? '去登录' : '去注册' }}</button>
            </p>
          </div>

          <div v-else class="space-y-3">
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon :name="idType==='phone'?'phone':'mail'" :size="17"/></span>
              <input class="input !pl-11" :type="idType==='phone'?'tel':'email'" v-model="identifier" :placeholder="idType==='phone'?'手机号':'邮箱'" />
            </div>
            <div class="relative">
              <input class="input !pr-28" v-model="code" placeholder="6 位验证码" />
              <button class="absolute right-2 top-1/2 -translate-y-1/2 text-brand-coral disabled:opacity-50 text-sm font-semibold px-2 py-1.5"
                      @click="sendCode" :disabled="codeCountdown>0">
                {{ codeCountdown>0 ? codeCountdown+'s' : '获取验证码' }}
              </button>
            </div>
            <button class="btn btn-primary btn-block" @click="submitAccount" :disabled="loading">{{ loading ? '处理中…' : '登 录' }}</button>
            <p v-if="devCode" class="text-center text-xs text-muted">演示验证码：<b class="text-brand-coral font-mono">{{ devCode }}</b></p>
          </div>

          <p v-if="error" class="mt-4 text-center text-sm text-red-500">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { request } = useApi()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const redirectTo = () => (route.query.redirect as string) || '/'

// 品牌区展示真实课程规模（避免文案与数据脱节）
const { data: mData } = await useFetch('/api/modules')
const totalChapters = computed(() => (mData.value?.modules || []).reduce((a: number, m: any) => a + (m.chapterCount || 0), 0))
const totalSections = computed(() => (mData.value?.modules || []).reduce((a: number, m: any) => a + (m.sectionCount || 0), 0))

const mode = ref('password')
const idType = ref('phone')
const idTypes = [{ v: 'phone', label: '手机号' }, { v: 'email', label: '邮箱' }]
const identifier = ref('')
const password = ref('')
const code = ref('')
const showPwd = ref(false)
const isReg = ref(false)
const loading = ref(false)
const error = ref('')
const devCode = ref('')
const codeCountdown = ref(0)

async function sendCode() {
  if (!identifier.value) { error.value = '请先填写' + (idType.value === 'phone' ? '手机号' : '邮箱'); return }
  try {
    const r: any = await request('/api/auth/send-' + (idType.value === 'phone' ? 'sms' : 'email') + '-code', { method: 'POST', body: { [idType.value]: identifier.value } })
    devCode.value = r.devCode || ''
    error.value = ''
    codeCountdown.value = 60
    const t = setInterval(() => { codeCountdown.value--; if (codeCountdown.value <= 0) clearInterval(t) }, 1000)
  } catch (e: any) { error.value = e.message }
}

async function submitAccount() {
  loading.value = true; error.value = ''
  try {
    const body: any = { mode: mode.value, identifierType: idType.value, identifier: identifier.value }
    if (mode.value === 'password') { body.password = password.value } else { body.code = code.value }
    if (!body.identifier) throw new Error('请填写' + (idType.value === 'phone' ? '手机号' : '邮箱'))
    if (mode.value === 'password' && (!body.password || body.password.length < 6)) throw new Error('密码至少6位')
    if (mode.value === 'code' && !body.code) throw new Error('请填写验证码')
    const action = isReg.value ? 'register' : 'login'
    const { token, user } = await request('/api/auth/' + action, { method: 'POST', body })
    auth.setSession(token, user); await navigateTo(redirectTo())
  } catch (e: any) { error.value = e.message } finally { loading.value = false }
}
</script>
