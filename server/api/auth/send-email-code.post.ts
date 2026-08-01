// 发送邮箱验证码（演示：明文返回）
export default defineEventHandler(async (event) => {
  const { email } = await readBody(event)
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(event, 400, { error: '请输入有效邮箱' })
  const code = sendCode('email', email)
  const out: any = { ok: true, message: '验证码已发送（演示模式直接返回）' }
  if (DEV_CODE) out.devCode = code
  return json(event, 200, out)
})
