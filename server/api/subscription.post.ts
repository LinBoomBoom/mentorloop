// 订阅管理：取消/恢复自动续费（会员资格保留至 expireAt，仅停止续费）
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const body = await readBody(event).catch(() => ({}))
  const action = body?.action
  // P0#2：当前为一次性付费（无自动续费），杜绝无资质却呈现可开启自动续费的状态。
  // 仅保留 cancel（幂等安全），不再提供 enable 开关。订阅状态查询走 GET /api/vip/status。
  if (action !== 'cancel') {
    return json(event, 400, { error: '当前为一次性付费会员，不支持开启自动续费；仅支持取消（action=cancel）' })
  }
  const sub = getActiveSubscription(user.id)
  if (!sub) return json(event, 404, { error: '当前没有生效中的订阅' })
  sqlite.prepare(`UPDATE subscriptions SET auto_renew=0 WHERE id=?`).run(sub.id)
  const updated = sqlite.prepare('SELECT * FROM subscriptions WHERE id=?').get(sub.id)
  return json(event, 200, {
    ok: true,
    subscription: { id: updated.id, planId: updated.plan_id, autoRenew: !!updated.auto_renew, expireAt: updated.expire_at, status: updated.status }
  })
})
