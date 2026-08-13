// H1 · 开启一场 AI 深度模拟面试（VIP 专属）
export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const rl = rateLimit('vip-interview-start', user.id, 10, 60_000)
  if (!rl.ok) return json(event, 429, { error: `请求过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const { track, level, goal, mode, consentAt } = await readBody(event)
  try {
    const res = await startInterview(user.id, { track, level, goal, mode, consentAt: consentAt ? Number(consentAt) : null })
    return json(event, 200, res)
  } catch (e: any) {
    const msg = e?.message || '面试开启失败'
    const code = /未配置/.test(msg) ? 503 : 500
    return json(event, code, { error: msg })
  }
})
