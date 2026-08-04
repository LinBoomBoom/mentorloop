<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-1">服务条款</h1>
    <p class="text-sm text-muted mb-6">最后更新日期：2026 年 8 月 3 日　生效日期：2026 年 8 月 3 日</p>

    <article class="card p-7 sm:p-9 leading-relaxed">
      <p class="text-sub mb-7">
        欢迎使用 MentorLoop。本条款是您与本平台之间关于使用本平台服务的法律协议。请您在注册或使用本平台前，仔细阅读并充分理解本条款的全部内容，特别是以加粗形式提示的责任限制、免责等条款。当您完成注册或开始使用本平台服务时，即视为您已阅读、理解并同意接受本条款的约束。
      </p>

      <section v-for="(s, i) in sections" :key="s.id" :id="s.id" class="scroll-mt-24">
        <h2 class="font-bold text-lg mb-3">{{ s.no }}、{{ s.title }}</h2>
        <div class="text-sub leading-relaxed space-y-2" v-html="s.body"></div>
        <a-divider v-if="i < sections.length - 1" class="!my-7" />
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: '服务条款 · MentorLoop' })

const sections = [
  {
    id: 'general', no: '一', title: '总则',
    body: `<p class="text-sub leading-relaxed">1. 本平台是一个面向开发者的"学习 · 面试"一体化平台，提供系统学习路径、高频面试题、模拟答卷、AI 复盘与 VIP 专属内容等服务。</p>
      <p class="text-sub leading-relaxed">2. 本条款及平台公示的各类规则，构成您与我们之间完整的服务协议。如相关规则与本条款不一致的，以最新公示版本为准。</p>`
  },
  {
    id: 'account', no: '二', title: '账号注册与使用',
    body: `<p class="text-sub leading-relaxed">1. 您确认，在注册本平台账号时，您所填写的资料真实、准确、完整，并将及时更新，以保证资料的有效性。</p>
      <p class="text-sub leading-relaxed">2. 您应对账号下的全部活动负责，并妥善保管登录凭证，因凭证泄露导致的损失由您自行承担。</p>
      <p class="text-sub leading-relaxed">3. 您同意不将账号用于任何违法、侵权或干扰平台正常运行的行为。我们保留对违规账号采取限制、封禁或注销等措施的权利。</p>`
  },
  {
    id: 'vip', no: '三', title: '服务内容与 VIP 会员',
    body: `<p class="text-sub leading-relaxed">1. 本平台的部分高阶内容（如专属试卷、AI 模拟面试、学习路径定制、内推资源等）为 VIP 会员专属权益。</p>
      <p class="text-sub leading-relaxed">2. VIP 采用一次性付费、按期有效的方式（无自动续费）。付费成功后，您将在对应期限内解锁相关权益；到期后权益将自动回收，不影响您已产生的学习数据。</p>
      <p class="text-sub leading-relaxed">3. 具体权益范围、价格与有效期以购买页面及订单为准。我们保留对会员权益进行调整并提前公示的权利。</p>`
  },
  {
    id: 'ip', no: '四', title: '知识产权',
    body: `<p class="text-sub leading-relaxed">平台内的课程、题库、复盘内容、软件代码及相关资料的知识产权归 MentorLoop 或相关权利人所有，仅供您个人学习使用。未经我们书面授权，您不得转载、分发、出售或将相关内容用于任何商业用途。由 AI 生成的内容仅供参考，不构成任何形式的保证。</p>`
  },
  {
    id: 'behavior', no: '五', title: '用户行为规范',
    body: `<p class="text-sub leading-relaxed">您承诺在使用本平台服务时，不得实施下列行为：</p>
      <p class="text-sub leading-relaxed">（一）发布或传播违法、虚假、侵犯他人权益的信息；</p>
      <p class="text-sub leading-relaxed">（二）通过爬虫、脚本等方式批量抓取、盗用平台内容；</p>
      <p class="text-sub leading-relaxed">（三）对平台进行反向工程、攻击或干扰其正常运行；</p>
      <p class="text-sub leading-relaxed">（四）其他违反法律法规或公序良俗的行为。我们一经发现前述行为，有权立即终止服务并保留追究责任的权利。</p>`
  },
  {
    id: 'disclaimer', no: '六', title: '免责声明',
    body: `<p class="text-sub leading-relaxed">本平台服务按"现状"提供。我们尽力保障服务的稳定性与内容的准确性，但除法律法规另有强制性规定外，我们对服务作出任何明示或暗示的保证，亦不对因使用本平台所产生的间接、偶然或后果性损失承担责任。AI 生成内容仅供参考，不应作为任何专业决策的唯一依据。</p>`
  },
  {
    id: 'change', no: '七', title: '服务变更、中断与终止',
    body: `<p class="text-sub leading-relaxed">为提升服务质量，我们可能适时对平台功能进行调整、升级或暂停部分服务。如遇不可抗力或重大系统故障导致服务中断，我们将尽快恢复，但对此类情形不承担责任。在您违反本条款时，我们有权中止或终止向您提供服务。</p>`
  },
  {
    id: 'law', no: '八', title: '法律适用与争议解决',
    body: `<p class="text-sub leading-relaxed">本条款的订立、效力、解释及争议解决均适用中华人民共和国法律。因本条款引起的或与本条款有关的任何争议，双方应友好协商解决；协商不成的，任一方均可向本平台运营方所在地有管辖权的人民法院提起诉讼。</p>`
  },
  {
    id: 'other', no: '九', title: '其他',
    body: `<p class="text-sub leading-relaxed">本条款任一条款被认定为无效或不可执行的，不影响其余条款的效力。我们保留在适时修订本条款的权利，修订后的条款将在平台公示后生效，请您定期查阅。</p>`
  }
]
</script>
