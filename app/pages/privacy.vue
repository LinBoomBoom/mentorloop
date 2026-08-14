<template>
  <div>
    <h1 class="page-title mb-1">隐私政策</h1>
    <p class="text-sm text-muted mb-6">最后更新日期：2026 年 8 月 3 日　生效日期：2026 年 8 月 3 日</p>

    <article class="card p-7 sm:p-9 leading-relaxed">
      <p class="text-sub mb-7">
        MentorLoop（以下简称"我们"）深知个人信息对您的重要性，并会尽力保护您的个人信息安全。本政策适用于我们通过网站、小程序及关联服务（以下统称"本平台"）向您提供的全部功能。在您使用本平台前，请务必仔细阅读并理解本政策的全部内容。一旦您开始使用本平台，即表示您已同意我们按照本政策收集、使用、存储与保护您的相关信息。
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
useSeoMeta({ title: '隐私政策 · MentorLoop' })

const sections = [
  {
    id: 'collect', no: '一', title: '我们收集的信息',
    body: `<p class="text-sub leading-relaxed">为向您提供学习、模拟答卷与会员服务，我们仅会收集与实现相应功能所必需的信息，具体包括：</p>
      <p class="text-sub leading-relaxed"><b>1. 账号信息。</b>您注册或开通会员时提供的手机号 / 邮箱、昵称，以及用于登录的凭证。您的密码将以加盐哈希方式存储，我们无法还原您的明文密码。</p>
      <p class="text-sub leading-relaxed"><b>2. 学习与测评数据。</b>您的学习进度、模拟答卷记录、复盘结果与薄弱点分析。上述数据仅用于向您展示个人成长曲线并提供针对性的学习建议。</p>
      <p class="text-sub leading-relaxed"><b>3. 技术与日志信息。</b>登录 IP、设备型号、操作审计日志等。我们收集此类信息用于安全风控、异常排查与服务质量保障。</p>`
  },
  {
    id: 'use', no: '二', title: '我们如何使用信息',
    body: `<p class="text-sub leading-relaxed">我们严格遵循"最小必要"原则，仅在下列范围内使用您的信息：</p>
      <p class="text-sub leading-relaxed">（一）提供、维护并持续优化本平台的功能，例如生成学习路径、批改答卷、输出 AI 复盘；</p>
      <p class="text-sub leading-relaxed">（二）保障账号与系统安全，识别并处置盗用、刷分等违规风险；</p>
      <p class="text-sub leading-relaxed">（三）在获得您同意的情形下，向您发送与服务相关的必要通知；</p>
      <p class="text-sub leading-relaxed">（四）履行法律法规规定的义务。我们<strong>不会</strong>向任何第三方出售您的个人信息；除本政策已说明或经您另行授权外，我们不会与第三方共享您的个人信息。</p>`
  },
  {
    id: 'store', no: '三', title: '信息的存储与保护',
    body: `<p class="text-sub leading-relaxed">您的个人信息存放于受访问控制保护的服务器中，传输过程全程采用 TLS 加密。我们采取加盐哈希、HttpOnly Cookie、接口限流与防爆破等多重措施保护您的账号安全。</p>
      <p class="text-sub leading-relaxed">我们仅在为实现服务目的所必需的期限内保留您的个人信息，超出前述期限或您提出删除请求后，我们将对相关信息进行删除或匿名化处理，但法律法规另有规定的除外。</p>`
  },
  {
    id: 'cookie', no: '四', title: 'Cookie 与同类技术',
    body: `<p class="text-sub leading-relaxed">为保障登录状态与服务正常运行，我们会使用 Cookie 等同类技术。其中登录凭证类 Cookie 设置为 HttpOnly，JavaScript 无法读取，以降低跨站脚本（XSS）盗用风险。您可通过浏览器设置管理 Cookie，但关闭部分 Cookie 可能导致部分功能无法正常使用。</p>`
  },
  {
    id: 'rights', no: '五', title: '您的权利',
    body: `<p class="text-sub leading-relaxed"><b>1. 查询与更正。</b>您可随时在"个人中心"查看与维护您的资料信息。</p>
      <p class="text-sub leading-relaxed"><b>2. 注销账号。</b>您可在"个人中心 → 注销账号"提交申请。注销后，我们将删除您的账号及关联的学习、答卷与进度数据（法律另有规定的除外）。该操作不可恢复，请谨慎操作。</p>
      <p class="text-sub leading-relaxed"><b>3. 撤回同意。</b>您可随时停止使用并注销账号，以撤回此前基于同意而作出的个人信息处理授权。</p>`
  },
  {
    id: 'minor', no: '六', title: '未成年人保护',
    body: `<p class="text-sub leading-relaxed">我们重视未成年人个人信息的保护。若您未满 18 周岁，请在监护人陪同下阅读本政策并使用本平台。我们不会主动收集未成年人的个人信息，如发现相关情况将尽快删除。</p>`
  },
  {
    id: 'contact', no: '七', title: '联系我们',
    body: `<p class="text-sub leading-relaxed">如您对本政策有任何疑问，或希望行使上述权利，请通过站内反馈或发送邮件至 <span class="font-mono text-brand-coral">contact@mentorloop.example.com</span> 与我们联系。我们将在合理时间内予以答复和处理。</p>`
  }
]
</script>
