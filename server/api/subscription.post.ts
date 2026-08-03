// 订阅管理：取消/恢复自动续费（会员资格保留至 expireAt，仅停止续费）
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const body = await readBody(event).catch(() => ({}))
  const action = body?.action
  if (action !== 'cancel' && action !== 'enable') {
    return json(event, 400, { error: 'action 必须是 cancel 或 enable' })
  }
  const sub = getActiveSubscription(user.id)
  if (!sub) return json(event, 404, { error: '当前没有生效中的订阅' })
  sqlite.prepare(`UPDATE subscriptions SET auto_renew=? WHERE id=?`).run(action === 'enable' ? 1 : 0, sub.id)
  const updated = sqlite.prepare('SELECT * FROM subscriptions WHERE id=?').get(sub.id)
  return json(event, 200, {
    ok: true,
    subscription: { id: updated.id, planId: updated.plan_id, autoRenew: !!updated.auto_renew, expireAt: updated.expire_at, status: updated.status }
  })
})
