// 当前用户的会员状态、有效订阅与订单历史
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const sub = getActiveSubscription(user.id)
  const orders = sqlite.prepare(
    `SELECT id, plan_id, amount, status, provider, created_at, paid_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 10`
  ).all(user.id)
  return json(event, 200, {
    vip: user.vip,
    subscription: sub
      ? { id: sub.id, planId: sub.plan_id, level: sub.level, status: sub.status, autoRenew: !!sub.auto_renew, startAt: sub.start_at, expireAt: sub.expire_at }
      : null,
    orders: (orders || []).map((o: any) => ({
      id: o.id, planId: o.plan_id, amount: o.amount, status: o.status,
      provider: o.provider, createdAt: o.created_at, paidAt: o.paid_at
    }))
  })
})
