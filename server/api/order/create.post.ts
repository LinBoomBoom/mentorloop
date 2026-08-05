// 创建 VIP 订单（待支付），返回支付通道信息
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const rl = rateLimit('order-create', user ? user.id : getClientIp(event), 5, 60_000)
  if (!rl.ok) return json(event, 429, { error: `下单过于频繁，请 ${rl.retryAfter} 秒后重试` })
  if (!VIP_ENABLED) return json(event, 403, { error: '会员购买暂未开放' })

  const body = await readBody(event).catch(() => ({}))
  const plan = getPlan(body?.planId)
  if (!plan) return json(event, 400, { error: '套餐不存在' })

  const orderId = uid('o_')
  const amountCents = Math.round(plan.price * 100)
  const now = Date.now()
  sqlite.prepare(`INSERT INTO orders (id,user_id,plan_id,amount,currency,status,provider,subject,created_at,expire_at)
    VALUES (?,?,?,?,'CNY','pending',?,?,?,?)`)
    .run(orderId, user.id, plan.id, amountCents, (process.env.PAY_PROVIDER || 'sandbox'),
      `${plan.name} · MentorLoop`, now, now + 15 * 60 * 1000)

  const provider = getProvider()
  const charge = await provider.createCharge({ orderId, amountCents, subject: `${plan.name} · MentorLoop`, description: plan.desc })

  // 记录实际支付通道
  sqlite.prepare(`UPDATE orders SET provider=? WHERE id=?`).run(provider.name, orderId)

  return json(event, 200, {
    orderId, amount: amountCents, planId: plan.id, provider: provider.name,
    payUrl: charge.payUrl || null, qrContent: charge.qrContent || null
  })
})
