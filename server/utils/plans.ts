// VIP 套餐配置（生产级、可配置）
// 价格单位：元；durationDays：会员有效期；level：对应会员等级（1=标准 3=尊享）
export interface PlanDef {
  id: string
  name: string
  price: number
  durationDays: number
  level: number
  desc: string
  benefits: string[]
  popular?: boolean
}

export const PLANS: PlanDef[] = [
  {
    id: 'monthly',
    name: '月度会员',
    price: 29,
    durationDays: 31,
    level: 1,
    desc: '低成本体验全部专属内容',
    benefits: ['VIP 专属高阶模拟试卷（4 套）', 'AI 深度模拟面试', '个性化学习路径定制', '全部方向笔试题库与复盘']
  },
  {
    id: 'quarterly',
    name: '季度会员',
    price: 79,
    durationDays: 93,
    level: 1,
    desc: '约 2.6 元/天，适合冲刺期',
    benefits: ['月度会员全部权益', '薄弱点专项训练推荐', '面试错题本自动归集']
  },
  {
    id: 'yearly',
    name: '年度会员',
    price: 199,
    durationDays: 366,
    level: 3,
    desc: '最划算，长期陪跑上岸',
    popular: true,
    benefits: ['季度会员全部权益', '1v1 简历诊断（人工 + AI）', '内推资源库优先匹配', '尊享专属答疑通道']
  }
]

// VIP / 支付总开关：默认开启；设置 VIP_ENABLED=false 可临时下架（如大促暂停）
export const VIP_ENABLED = process.env.VIP_ENABLED !== 'false'

export function getPlan(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id)
}
