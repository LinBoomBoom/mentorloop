// VIP 套餐列表（已启用，配置见 server/utils/plans.ts）
import { PLANS, VIP_ENABLED } from '../../utils/plans'
import { json } from '../../utils/db'

export default defineEventHandler((event) => {
  return json(event, 200, {
    enabled: VIP_ENABLED,
    provider: (process.env.PAY_PROVIDER || 'sandbox'),
    plans: PLANS.map((p) => ({
      id: p.id, name: p.name, price: p.price, durationDays: p.durationDays,
      level: p.level, desc: p.desc, benefits: p.benefits, popular: !!p.popular
    }))
  })
})
