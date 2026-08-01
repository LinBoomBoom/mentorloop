// VIP 套餐（预留）
export default defineEventHandler((event) => {
  return json(event, 200, {
    enabled: false, // 上线收费时切为 true
    plans: [
      { id: 'monthly', name: '月度会员', price: 29, benefits: ['VIP 专属试卷', 'AI 深度模拟面试', '学习路径定制'] },
      { id: 'yearly', name: '年度会员', price: 199, benefits: ['月度全部权益', '1v1 简历诊断', '内推资源库'] }
    ]
  })
})
