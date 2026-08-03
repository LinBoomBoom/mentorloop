// 发送短信验证码（演示：明文返回）。限流 + 输入校验。
export default defineEventHandler(async (event) => {
  try {
    const { phone } = await readBody(event)
  const ip = getClientIp(event)
  // A5 限流：每 IP+手机号 60s 内最多 5 次，防短信轰炸
  const rl = rateLimit('sendcode', ip + ':' + (phone || ''), 5, 60_000)
  if (!rl.ok) return json(event, 429, { error: '验证码发送过于频繁，请 ' + rl.retryAfter + ' 秒后重试' })
  const num = assertInput(phone, { name: '手机号', required: true, max: 32, pattern: /^1\d{10}$/ })
  const code = sendCode('phone', num)
  const out: any = { ok: true, message: '验证码已发送（演示模式直接返回）' }
  if (DEV_CODE) out.devCode = code
  return json(event, 200, out)
  } catch (e: any) {
    if (e instanceof InputError) return json(event, 400, { error: e.message })
    throw e
  }
})
