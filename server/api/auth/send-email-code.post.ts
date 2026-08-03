// 发送邮箱验证码（演示：明文返回）。限流 + 输入校验。
export default defineEventHandler(async (event) => {
  try {
    const { email } = await readBody(event)
  const ip = getClientIp(event)
  // A5 限流：每 IP+邮箱 60s 内最多 5 次，防验证码轰炸
  const rl = rateLimit('sendcode', ip + ':' + (email || ''), 5, 60_000)
  if (!rl.ok) return json(event, 429, { error: '验证码发送过于频繁，请 ' + rl.retryAfter + ' 秒后重试' })
  const mail = assertInput(email, { name: '邮箱', required: true, max: 128, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ })
  const code = sendCode('email', mail)
  const out: any = { ok: true, message: '验证码已发送（演示模式直接返回）' }
  if (DEV_CODE) out.devCode = code
  return json(event, 200, out)
  } catch (e: any) {
    if (e instanceof InputError) return json(event, 400, { error: e.message })
    throw e
  }
})
