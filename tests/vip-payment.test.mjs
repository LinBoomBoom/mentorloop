import { describe, it, expect, afterAll } from 'vitest'
import { sqlite, uid, fulfillOrder, getActiveSubscription, effectiveVip } from '../server/utils/db'
import { PLANS, getPlan, VIP_ENABLED } from '../server/utils/plans'
import { getProvider, USING_REAL_PAY } from '../server/utils/payment'

const testIds = []
afterAll(() => {
  for (const id of testIds) sqlite.prepare('DELETE FROM orders WHERE id=?').run(id)
  sqlite.prepare("DELETE FROM subscriptions WHERE user_id LIKE 'u_test_%'").run()
  sqlite.prepare("DELETE FROM users WHERE id LIKE 'u_test_%'").run()
})

function makeUser() {
  const id = uid('u_test_')
  sqlite.prepare('INSERT INTO users (id,username,nickname,vip,created_at) VALUES (?,?,?,?,?)')
    .run(id, 'tu_' + id, 'T', JSON.stringify({ level: 0, expireAt: null }), Date.now())
  return id
}
function makeOrder(userId, planId = 'yearly') {
  const id = uid('o_test_')
  const plan = getPlan(planId)
  sqlite.prepare(`INSERT INTO orders (id,user_id,plan_id,amount,currency,status,provider,subject,created_at,expire_at)
    VALUES (?,?,?,?,'CNY','pending','sandbox',?,?,?)`)
    .run(id, userId, planId, Math.round(plan.price * 100), 'x', Date.now(), Date.now() + 900000)
  testIds.push(id)
  return id
}

describe('VIP 套餐配置', () => {
  it('VIP 已启用且含年/月/季三档', () => {
    expect(VIP_ENABLED).toBe(true)
    expect(PLANS.length).toBeGreaterThanOrEqual(3)
    expect(getPlan('yearly').price).toBe(199)
    expect(getPlan('yearly').level).toBe(3)
    expect(getPlan('monthly').level).toBe(1)
  })
})

describe('支付通道', () => {
  it('默认 sandbox 且未接入真实支付', () => {
    expect(getProvider().name).toBe('sandbox')
    expect(USING_REAL_PAY).toBe(false)
  })
})

describe('开通/续费状态机 (fulfillOrder)', () => {
  it('首次购买：用户升级为 level=3、建立有效订阅', () => {
    const uid1 = makeUser()
    const oid = makeOrder(uid1, 'yearly')
    expect(fulfillOrder(oid)).toBe(true)
    const vip = JSON.parse(sqlite.prepare('SELECT vip FROM users WHERE id=?').get(uid1).vip)
    expect(vip.level).toBe(3)
    expect(vip.expireAt).toBeGreaterThan(Date.now())
    const sub = getActiveSubscription(uid1)
    expect(sub).toBeTruthy()
    expect(sub.plan_id).toBe('yearly')
    expect(sub.auto_renew).toBe(1)
  })

  it('幂等：重复确认同一订单不会二次顺延/重复计费', () => {
    const uid1 = makeUser()
    const oid = makeOrder(uid1, 'yearly')
    fulfillOrder(oid)
    const before = getActiveSubscription(uid1).expire_at
    expect(fulfillOrder(oid)).toBe(false)
    expect(getActiveSubscription(uid1).expire_at).toBe(before)
  })

  it('续费：第二个订单在现有订阅基础上顺延有效期', () => {
    const uid1 = makeUser()
    const oid1 = makeOrder(uid1, 'yearly')
    fulfillOrder(oid1)
    const before = getActiveSubscription(uid1).expire_at
    const oid2 = makeOrder(uid1, 'yearly')
    fulfillOrder(oid2)
    expect(getActiveSubscription(uid1).expire_at).toBeGreaterThan(before)
  })

  it('到期自动失效（门禁会拦截）', () => {
    const v = effectiveVip({ vip: JSON.stringify({ level: 3, expireAt: Date.now() + 86400000 }) })
    expect(v.active).toBe(true)
    const vx = effectiveVip({ vip: JSON.stringify({ level: 3, expireAt: Date.now() - 1000 }) })
    expect(vx.active).toBe(false)
  })
})
