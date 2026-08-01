// 第三方登录：发起（返回二维码内容 + 轮询 token）
export default defineEventHandler(async (event) => {
  const { provider } = await readBody(event)
  if (!['google', 'wechat', 'qq'].includes(provider)) return json(event, 400, { error: '不支持的第三方登录' })
  const qrToken = uid('qr_')
  pendingAuth.set(qrToken, { provider, status: 'pending', createdAt: Date.now() })
  const qrData = 'mentorloop://oauth/' + provider + '?state=' + qrToken
  return json(event, 200, { qrToken, qrData, provider })
})
