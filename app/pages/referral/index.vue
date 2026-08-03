<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-1">内推资源库</h1>
    <p class="text-muted text-sm mb-5">VIP 专属内推岗位，覆盖四大方向。看中即申请，导师/HR 会与你联系对接。</p>

    <!-- 未登录 / 非 VIP 门禁 -->
    <div v-if="gate" class="card p-8 text-center reveal">
      <div class="w-14 h-14 rounded-2xl bg-brand-coral/15 text-brand-coral flex items-center justify-center mx-auto mb-4"><Icon name="briefcase" :size="26" /></div>
      <h3 class="font-bold text-lg mb-2">{{ gate.title }}</h3>
      <p class="text-sm text-muted mb-5">{{ gate.desc }}</p>
      <NuxtLink :to="gate.to" class="btn btn-primary">{{ gate.btn }}</NuxtLink>
    </div>

    <div v-else>
      <!-- 筛选 -->
      <div class="card p-4 mb-5 flex flex-wrap gap-3 items-center reveal">
        <select v-model="track" class="input !py-2 w-auto" @change="load">
          <option value="">全部方向</option>
          <option value="frontend">前端</option>
          <option value="backend">后端</option>
          <option value="devops">运维 / DevOps</option>
          <option value="ai">AI 工程</option>
        </select>
        <select v-model="city" class="input !py-2 w-auto" @change="load">
          <option value="">全部城市</option>
          <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="level" class="input !py-2 w-auto" @change="load">
          <option value="">全部级别</option>
          <option value="junior">初级</option>
          <option value="mid">中级</option>
          <option value="senior">高级</option>
        </select>
        <span class="ml-auto text-sm text-muted">共 {{ list.length }} 个岗位</span>
      </div>

      <!-- 列表 -->
      <div v-if="loading" class="grid sm:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="card h-44 shimmer"></div>
      </div>
      <div v-else-if="!list.length" class="card p-8 text-center text-muted">暂无匹配岗位</div>
      <div v-else class="grid sm:grid-cols-2 gap-4">
        <div v-for="r in list" :key="r.id" class="card p-5 reveal">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-bold truncate">{{ r.title }}</div>
              <div class="text-sm text-muted">{{ r.company }} · {{ r.city }}</div>
            </div>
            <span class="chip bg-brand-coral/10 text-brand-coral shrink-0">{{ r.trackName }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <span class="chip bg-ink/5 text-sub">{{ levelName(r.level) }}</span>
            <span class="chip bg-ink/5 text-sub">{{ r.type }}</span>
          </div>
          <p class="text-sm text-muted mt-3 whitespace-pre-line">{{ r.intro }}</p>
          <p class="text-xs text-muted mt-2"><b>要求：</b>{{ r.requirement }}</p>
          <button class="btn btn-primary w-full mt-4" :disabled="applied(r.id)" @click="openApply(r)">
            {{ applied(r.id) ? '已申请' : '申请内推' }}
          </button>
        </div>
      </div>

      <!-- 我的申请 -->
      <div v-if="mine.length" class="card p-6 mt-6">
        <h3 class="font-bold mb-3">我的申请</h3>
        <div v-for="m in mine" :key="m.id" class="flex items-center justify-between text-sm py-2 border-b border-line last:border-0">
          <div class="min-w-0">
            <b>{{ m.company || '岗位' }}</b>
            <span class="text-muted"> · {{ m.title || '' }}</span>
          </div>
          <span :class="m.status === 'pending' ? 'text-amber-500' : 'text-emerald-600'">{{ m.status === 'pending' ? '审核中' : m.status }}</span>
        </div>
      </div>
    </div>

    <!-- 申请弹窗 -->
    <div v-if="applyTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="applyTarget = null">
      <div class="card p-6 w-full max-w-md">
        <h3 class="font-bold mb-1">申请内推：{{ applyTarget.title }}</h3>
        <p class="text-sm text-muted mb-4">{{ applyTarget.company }} · {{ applyTarget.city }}</p>
        <input v-model="form.name" class="input mb-3" placeholder="你的称呼" />
        <input v-model="form.contact" class="input mb-3" placeholder="联系方式（微信 / 邮箱 / 手机）" />
        <textarea v-model="form.note" rows="3" class="input mb-3 resize-none" placeholder="补充信息（选填）：意向城市、到岗时间等"></textarea>
        <p v-if="applyErr" class="text-red-500 text-sm mb-3">{{ applyErr }}</p>
        <div class="flex gap-3">
          <button class="btn btn-primary flex-1" :disabled="applying" @click="submitApply">{{ applying ? '提交中…' : '提交申请' }}</button>
          <button class="btn" @click="applyTarget = null">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { request } = useApi()
const { guard } = useLoginGate()
const gate = ref<any>(null)
const list = ref<any[]>([])
const mine = ref<any[]>([])
const loading = ref(false)
const track = ref('')
const city = ref('')
const level = ref('')
const cities = ['北京', '上海', '杭州', '深圳', '广州', '东莞', '成都']

const applyTarget = ref<any>(null)
const form = ref({ name: '', contact: '', note: '' })
const applying = ref(false)
const applyErr = ref('')

useSeoMeta({
  title: '内推资源库 · MentorLoop',
  description: 'VIP 专属内推岗位资源库，覆盖前端/后端/运维/AI 四大方向。',
  ogTitle: '内推资源库 · MentorLoop',
  ogType: 'website',
  ogUrl: safeOgUrl()
})

const LEVEL_NAMES: Record<string, string> = { junior: '初级', mid: '中级', senior: '高级' }
function levelName(l: string) { return LEVEL_NAMES[l] || l }
function applied(id: string) { return mine.value.some((m) => m.referralId === id) }

onMounted(async () => {
  if (guard()) return
  try {
    const r: any = await request('/api/vip/status')
    if (!r?.vip?.active) {
      gate.value = { title: '该功能为 VIP 专属', desc: '开通会员即可查看内推岗位并提交申请。', to: '/vip', btn: '开通会员' }
      return
    }
    await load()
  } catch {
    gate.value = { title: '请先登录', desc: '登录后即可查看内推资源库。', to: '/login', btn: '登录 / 注册' }
  }
})

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (track.value) params.set('track', track.value)
    if (city.value) params.set('city', city.value)
    if (level.value) params.set('level', level.value)
    const qs = params.toString()
    const r: any = await request('/api/vip/referrals' + (qs ? '?' + qs : ''))
    list.value = r.list || []
    mine.value = r.mine || []
  } catch (e: any) { /* ignore */ } finally { loading.value = false }
}

function openApply(r: any) {
  applyTarget.value = r
  form.value = { name: '', contact: '', note: '' }
  applyErr.value = ''
}
async function submitApply() {
  if (!applyTarget.value || applying.value) return
  applying.value = true; applyErr.value = ''
  try {
    await request('/api/vip/referral/apply', { method: 'POST', body: { referralId: applyTarget.value.id, ...form.value } })
    applyTarget.value = null
    await load()
  } catch (e: any) { applyErr.value = e.message } finally { applying.value = false }
}
</script>
