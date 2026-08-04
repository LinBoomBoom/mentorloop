// 当前用户的会员状态、有效订阅与订单历史
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const sub = getActiveSubscription(user.id)
  const now = Date.now()
  // 真正落库过期：把已超时的待支付订单收敛为 expired，避免它们永远挂在「待支付」
  expirePendingOrders(user.id, now)
  const orders = sqlite.prepare(
    `SELECT id, plan_id, amount, status, provider, created_at, paid_at, expire_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 10`
  ).all(user.id)
  return json(event, 200, {
    vip: effectiveVip(user),
    subscription: sub
      ? { id: sub.id, planId: sub.plan_id, level: sub.level, status: sub.status, autoRenew: !!sub.auto_renew, startAt: sub.start_at, expireAt: sub.expire_at }
      : null,
    orders: (orders || []).map((o: any) => {
      // 待支付且已过 expire_at → 标记为已过期（演示环境 15 分钟窗口）
      const expired = o.status === 'pending' && o.expire_at && o.expire_at < now
      return {
        id: o.id, planId: o.plan_id, amount: o.amount,
        status: expired ? 'expired' : o.status,
        provider: o.provider, createdAt: o.created_at, paidAt: o.paid_at, expireAt: o.expire_at
      }
    })
  })
})
