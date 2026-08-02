// 查询订单状态（支付页轮询用）
import { getUser, json, sqlite } from '../../utils/db'
import { getPlan } from '../../utils/plans'
import { getProvider } from '../../utils/payment'

export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const id = event.context.params?.id
  const order = sqlite.prepare('SELECT * FROM orders WHERE id=?').get(id) as any
  if (!order) return json(event, 404, { error: '订单不存在' })
  if (order.user_id !== user.id) return json(event, 403, { error: '无权访问该订单' })

  let payUrl = null, qrContent = null
  if (order.status === 'pending') {
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
      amount: order.amount, status: order.status, provider: order.provider,
      createdAt: order.created_at, paidAt: order.paid_at, expireAt: order.expire_at
    },
    payUrl, qrContent
  })
})
