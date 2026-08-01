// 发送短信验证码（演示：明文返回）
export default defineEventHandler(async (event) => {
  const { phone } = await readBody(event)
  if (!phone || !/^1\d{10}$/.test(phone)) return json(event, 400, { error: '请输入有效手机号' })
  const code = sendCode('phone', phone)
  const out: any = { ok: true, message: '验证码已发送（演示模式直接返回）' }
  if (DEV_CODE) out.devCode = code
  return json(event, 200, out)
})
