// 沙箱支付确认：模拟「用户已完成支付」，触发与真实回调相同的开通逻辑。
// 仅在 PAY_PROVIDER=sandbox（演示）时启用，用于端到端测试整条链路。
import { fulfillOrder, json, sqlite } from '../../../utils/db'
import { USING_REAL_PAY } from '../../../utils/payment'

export default defineEventHandler(async (event) => {
  if (USING_REAL_PAY) return json(event, 403, { error: '已接入真实支付，沙箱确认通道已关闭' })
  const body = await readBody(event).catch(() => ({}))
  const orderId = body?.orderId
  if (!orderId) return json(event, 400, { error: '缺少 orderId' })
  const order = sqlite.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as any
  if (!order) return json(event, 404, { error: '订单不存在' })
  if (order.status === 'paid') return json(event, 200, { ok: true, alreadyPaid: true })
  const ok = fulfillOrder(orderId, 'SANDBOX_' + orderId, Date.now())
  return json(event, 200, { ok, status: 'paid' })
})
