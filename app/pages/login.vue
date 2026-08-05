<template>
  <div class="min-h-screen flex">
    <!-- 品牌沉浸区 -->
    <div class="relative hidden lg:flex w-1/2 flex-col justify-between p-12 text-white overflow-hidden brand-gradient">
      <div class="aura !absolute"><div class="blob"></div></div>
      <div class="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent z-[5]"></div>
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Icon name="graduation" :size="24" />
        </div>
        <span class="text-2xl font-extrabold">MentorLoop</span>
      </div>
      <div class="relative z-10">
        <h1 class="text-[40px] leading-tight font-extrabold">把「学」与「面」<br/>练成一条线</h1>
        <p class="mt-5 text-white/85 text-[15px] leading-relaxed max-w-md">
          前端 / 后端 / 运维 / AI 工程四方向系统学习路径，配套高频面试题、模拟答卷与 AI 复盘。
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
          <a-segmented v-model:value="idType" :options="idTypes" class="!w-full mb-3" />
          <a-segmented v-model:value="mode" :options="modeOptions" class="!w-full mb-4" />

          <a-form v-if="mode==='password'" layout="vertical" class="space-y-3">
            <a-form-item>
              <a-input v-model:value="identifier" :type="idType==='phone'?'tel':'email'"
                       :placeholder="idType==='phone'?'手机号':'邮箱'" size="large" allow-clear>
                <template #prefix><Icon :name="idType==='phone'?'phone':'mail'" :size="17" class="text-muted" /></template>
              </a-input>
            </a-form-item>
            <a-form-item>
              <a-input-password v-model:value="password" size="large"
                                placeholder="密码（至少8位，含字母与数字）" />
            </a-form-item>
            <a-button type="primary" block size="large" :loading="loading" @click="submitAccount">
              {{ isReg ? '注册并登录' : '登 录' }}
            </a-button>
            <p class="text-center text-sm text-muted">还没有账号？
              <a class="text-brand-coral font-semibold" @click="isReg=!isReg">{{ isReg ? '去登录' : '去注册' }}</a>
            </p>
          </a-form>

          <a-form v-else layout="vertical" class="space-y-3">
            <a-form-item>
              <a-input v-model:value="identifier" :type="idType==='phone'?'tel':'email'"
                       :placeholder="idType==='phone'?'手机号':'邮箱'" size="large" allow-clear>
                <template #prefix><Icon :name="idType==='phone'?'phone':'mail'" :size="17" class="text-muted" /></template>
              </a-input>
            </a-form-item>
            <a-form-item>
              <a-input v-model:value="code" placeholder="6 位验证码" size="large" :maxlength="6">
                <template #suffix>
                  <a-button type="link" size="small" :disabled="codeCountdown>0" @click="sendCode" class="!px-0">
                    {{ codeCountdown>0 ? codeCountdown+'s' : '获取验证码' }}
                  </a-button>
                </template>
              </a-input>
            </a-form-item>
            <a-button type="primary" block size="large" :loading="loading" @click="submitAccount">登 录</a-button>
            <p v-if="devCode" class="text-center text-xs text-muted">演示验证码：<b class="text-brand-coral font-mono">{{ devCode }}</b></p>
          </a-form>

          <a-alert v-if="error" type="error" :message="error" show-icon class="mt-4" />
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
const idTypes = [{ label: '手机号', value: 'phone' }, { label: '邮箱', value: 'email' }]
const modeOptions = [{ label: '密码登录', value: 'password' }, { label: '验证码登录', value: 'code' }]
const identifier = ref('')
const password = ref('')
const code = ref('')
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
    if (mode.value === 'password' && (!body.password || body.password.length < 8)) throw new Error('密码至少8位，且需含字母与数字两类')
    if (mode.value === 'code' && !body.code) throw new Error('请填写验证码')
    const action = isReg.value ? 'register' : 'login'
    const { user } = await request('/api/auth/' + action, { method: 'POST', body })
    auth.setSession(user); await navigateTo(redirectTo())
  } catch (e: any) { error.value = e.message } finally { loading.value = false }
}
</script>
