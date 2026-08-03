<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-extrabold mb-2">隐私政策</h1>
    <p class="text-sm text-muted mb-6">最后更新：2026-08-03</p>

    <section class="card p-6 mb-5">
      <h2 class="font-bold mb-2">一、我们收集的信息</h2>
      <p class="text-sm text-sub leading-relaxed">为提供学习、模拟答卷与会员服务，我们仅收集必要信息：</p>
      <ul class="list-disc pl-6 text-sm text-sub leading-relaxed mt-2 space-y-1">
        <li>账号信息：你注册时提供的手机号 / 邮箱、昵称与登录凭证（密码经加盐哈希存储，无法还原）。</li>
        <li>学习数据：学习进度、模拟答卷记录与复盘结果，用于向你展示个人成长与薄弱点。</li>
        <li>必要日志：登录 IP、设备与操作审计日志，用于安全风控与故障排查。</li>
      </ul>
    </section>

    <section class="card p-6 mb-5">
      <h2 class="font-bold mb-2">二、信息如何使用</h2>
      <p class="text-sm text-sub leading-relaxed">我们仅在以下范围使用你的信息：提供并持续优化产品功能、保障账号安全、履行法定义务、在获得同意时发送服务通知。我们不会向第三方出售你的个人信息。</p>
    </section>

    <section class="card p-6 mb-5">
      <h2 class="font-bold mb-2">三、信息存储与保护</h2>
      <p class="text-sm text-sub leading-relaxed">数据存放于受访问控制的服务器，传输全程加密（TLS）。我们采取加盐哈希、HttpOnly Cookie、接口限流与防爆破等措施保护你的账号。数据保留期限以实现服务目的所必需为限。</p>
    </section>

    <section class="card p-6 mb-5">
      <h2 class="font-bold mb-2">四、你的权利</h2>
      <ul class="list-disc pl-6 text-sm text-sub leading-relaxed space-y-1">
        <li>查询 / 更正：可在「个人中心」查看与维护你的资料。</li>
        <li>注销账号：在「个人中心 → 注销账号」提交申请后，我们将删除你的账号及关联的学习、答卷与进度数据（法律另有规定的除外）。</li>
        <li>撤回同意：你可随时停止使用并注销账号。</li>
      </ul>
    </section>

    <section class="card p-6">
      <h2 class="font-bold mb-2">五、联系我们</h2>
      <p class="text-sm text-sub leading-relaxed">如对本政策有疑问或行使上述权利，请通过站内反馈或邮箱 contact@mentorloop.example.com 联系我们。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: '隐私政策 · MentorLoop' })
</script>
