// 沙箱支付确认：模拟「用户已完成支付」，触发与真实回调相同的开通逻辑。
// 仅在 PAY_PROVIDER=sandbox（演示）时启用，用于端到端测试整条链路。
// 注意：server/utils/* 由 Nitro 自动导入，本文件禁止相对 import（见 tests/server-imports.test.mjs）。

export default defineEventHandler(async (event) => {
  if (USING_REAL_PAY) return json(event, 403, { error: '已接入真实支付，沙箱确认通道已关闭' })
  const rl = rateLimit('sandbox-confirm', getClientIp(event), 20, 60_000)
  if (!rl.ok) return json(event, 429, { error: `操作过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const body = await readBody(event).catch(() => ({}))
  const orderId = body?.orderId
  if (!orderId) return json(event, 400, { error: '缺少 orderId' })
  const order = sqlite.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as any
  if (!order) return json(event, 404, { error: '订单不存在' })
  if (order.status === 'paid') return json(event, 200, { ok: true, alreadyPaid: true })
  // 过期订单不可再支付，需重新下单（与 /api/order/[id] 的过期收敛保持一致）
  const now = Date.now()
  if (order.status === 'expired' || (order.status === 'pending' && order.expire_at && order.expire_at < now)) {
    expirePendingOrders(order.user_id, now)
    return json(event, 410, { error: '订单已过期，请重新下单' })
  }
  const ok = fulfillOrder(orderId, 'SANDBOX_' + orderId, Date.now())
  return json(event, 200, { ok, status: 'paid' })
})
