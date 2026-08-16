// VIP 套餐列表（已启用，配置见 server/utils/plans.ts）
// benefits 已结构化：每项含 implemented 标记，前端据此区分「已上线 / 敬请期待」，杜绝虚假宣传
export default defineEventHandler((event) => {
  return json(event, 200, {
    enabled: VIP_ENABLED,
    provider: (process.env.PAY_PROVIDER || 'sandbox'),
    plans: PLANS.map((p) => ({
      id: p.id, name: p.name, price: p.price, durationDays: p.durationDays,
      level: p.level, period: p.period, desc: p.desc, benefits: p.benefits, popular: !!p.popular
    }))
  })
})
