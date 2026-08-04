// 查询订单状态（支付页轮询用）
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const id = event.context.params?.id
  const order = sqlite.prepare('SELECT * FROM orders WHERE id=?').get(id) as any
  if (!order) return json(event, 404, { error: '订单不存在' })
  if (order.user_id !== user.id) return json(event, 403, { error: '无权访问该订单' })

  // 待支付且已过 expire_at → 落库为 expired（演示环境 15 分钟窗口），保证前后端状态一致
  const expired = !!(order.status === 'pending' && order.expire_at && order.expire_at < Date.now())
  if (expired) expirePendingOrders(user.id)

  let payUrl = null, qrContent = null
  if (order.status === 'pending' && !expired) {
    const provider = getProvider()
    const charge = await provider.createCharge({
      orderId: order.id, amountCents: order.amount, subject: order.subject || 'MentorLoop 会员'
    }).catch(() => null)
    payUrl = charge?.payUrl || null
    qrContent = charge?.qrContent || null
  }
  const plan = getPlan(order.plan_id)
  return json(event, 200, {
    order: {
      id: order.id, planId: order.plan_id, planName: plan?.name || order.plan_id,
      amount: order.amount, status: expired ? 'expired' : order.status, provider: order.provider,
      createdAt: order.created_at, paidAt: order.paid_at, expireAt: order.expire_at
    },
    payUrl, qrContent
  })
})
