// VIP 套餐配置（生产级、可配置）
// 价格单位：元；durationDays：会员有效期；level：对应会员等级（1=标准 3=尊享）
export interface PlanBenefit {
  key: string
  label: string
  // 是否已真实可用：未实现权益必须标 false（前端灰显「敬请期待」），严禁虚假宣传
  implemented: boolean
}
export interface PlanDef {
  id: string
  name: string
  price: number
  durationDays: number
  level: number
  period: 'month' | 'quarter' | 'year'
  desc: string
  benefits: PlanBenefit[]
  popular?: boolean
}

export const PLANS: PlanDef[] = [
  {
    id: 'monthly',
    name: '1 个月 VIP',
    price: 29,
    durationDays: 31,
    level: 1,
    period: 'month',
    desc: '低成本体验全部专属内容',
    benefits: [
      { key: 'vip-exam', label: 'VIP 专属高阶模拟试卷', implemented: true },
      { key: 'ai-interview', label: 'AI 深度模拟面试', implemented: false },
      { key: 'study-path', label: '个性化学习路径定制', implemented: true },
      { key: 'all-written', label: '全部方向笔试题库与复盘', implemented: true }
    ]
  },
  {
    id: 'quarterly',
    name: '3 个月 VIP',
    price: 79,
    durationDays: 93,
    level: 1,
    period: 'quarter',
    desc: '约 2.6 元/天，适合冲刺期',
    benefits: [
      { key: 'vip-exam', label: 'VIP 专属高阶模拟试卷', implemented: true },
      { key: 'weak-train', label: '薄弱点专项训练推荐', implemented: true },
      { key: 'wrong-book', label: '面试错题本自动归集', implemented: true }
    ]
  },
  {
    id: 'yearly',
    name: '12 个月 VIP',
    price: 199,
    durationDays: 366,
    level: 3,
    period: 'year',
    desc: '最划算，长期陪跑上岸',
    popular: true,
    benefits: [
      { key: 'vip-exam-unlimited', label: '全部高阶模拟试卷无限次', implemented: true },
      { key: 'resume-diag', label: '1v1 简历诊断（人工 + AI）', implemented: false },
      { key: 'referral', label: '内推资源库优先匹配', implemented: false },
      { key: 'vip-support', label: '尊享专属答疑通道', implemented: false }
    ]
  }
]

// VIP / 支付总开关：默认开启；设置 VIP_ENABLED=false 可临时下架（如大促暂停）
export const VIP_ENABLED = process.env.VIP_ENABLED !== 'false'

export function getPlan(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id)
}
