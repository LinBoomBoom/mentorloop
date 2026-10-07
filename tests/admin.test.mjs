import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const dir = mkdtempSync(join(tmpdir(), 'ml-admin-'))
process.env.DB_PATH = join(dir, 'test.db')

const { adminDispatch } = await import('../server/utils/adminDispatch')
const { sqlite } = await import('../server/utils/db')
const { applyReferral } = await import('../server/utils/referral')

const ADMIN = { id: 'admin_test', role: 'admin' }
async function disp(method, seg, q = {}, body = {}) {
  return await adminDispatch(ADMIN, method, seg, q, body)
}
async function fails(fn) {
  try { return await fn() } catch (e) { return e }
}

beforeAll(async () => {
  // 造一个 admin 账号（便于 createUser 等的角色语义），以及测试用父记录
  await sqlite.prepare("INSERT OR IGNORE INTO users (id,username,password,role,created_at) VALUES ('admin_test','boss','x','admin',?)").run(Date.now())
})

afterAll(() => { try { rmSync(dir, { recursive: true, force: true }) } catch {} })

describe('G6 看板 & 兜底', () => {
  it('dashboard 返回核心指标', async () => {
    const r = await disp('GET', ['dashboard'])
    expect(r.ok).toBe(true)
    expect(typeof r.data.users).toBe('number')
    expect(typeof r.data.revenue).toBe('number')
  })
  it('未知接口返回 404', async () => {
    const e = await fails(async () => await disp('GET', ['nope']))
    expect(e?.statusCode).toBe(404)
  })
})

describe('G4 用户体系', () => {
  it('创建用户（弱密码被拒）', async () => {
    const e = await fails(async () => await disp('POST', ['users'], {}, { username: 'weak1', password: '123' }))
    expect(e?.statusCode).toBe(400)
  })
  it('创建 / 读取 / 列表', async () => {
    const u = await disp('POST', ['users'], {}, { username: 'alice', email: 'a@x.com', password: 'secret12', nickname: 'Alice' })
    expect(u.data.username).toBe('alice')
    const got = await disp('GET', ['users', u.data.id])
    expect(got.data.nickname).toBe('Alice')
    const list = await disp('GET', ['users'], { q: 'alice' })
    expect(list.items.some((x) => x.id === u.data.id)).toBe(true)
  })
  it('重复用户名返回 409', async () => {
    const e = await fails(async () => await disp('POST', ['users'], {}, { username: 'alice', password: 'secret12' }))
    expect(e?.statusCode).toBe(409)
  })
  it('PATCH 改角色 / 封禁 / 密码', async () => {
    const u = await (await disp('POST', ['users'], {}, { username: 'bob', password: 'secret12' })).data
    await disp('PATCH', ['users', u.id], {}, { role: 'admin', banned: true })
    const got = await (await disp('GET', ['users', u.id])).data
    expect(got.role).toBe('admin')
    expect(got.banned).toBe(true)
    await disp('PATCH', ['users', u.id], {}, { password: 'newpass9' }) // 不抛错即可
  })
  it('不能删除当前登录管理员', async () => {
    const e = await fails(async () => await disp('DELETE', ['users', 'admin_test']))
    expect(e?.statusCode).toBe(400)
  })
  it('删除用户级联清理', async () => {
    const u = await (await disp('POST', ['users'], {}, { username: 'carol', password: 'secret12' })).data
    const d = await disp('DELETE', ['users', u.id])
    expect(d.data.deleted).toBe(true)
    expect(await (await disp('GET', ['users', u.id])).data).toBe(null)
  })
})

describe('G2 内容：模块/章节/小节', () => {
  it('模块：非法 ID / 重复 / 创建 / 更新 / 删除', async () => {
    const e1 = await fails(async () => await disp('POST', ['modules'], {}, { id: 'M', name: 'X' }))
    expect(e1?.statusCode).toBe(400)
    const m = await (await disp('POST', ['modules'], {}, { id: 'm_test', name: '测试模块', color: '#fff' })).data
    const e2 = await fails(async () => await disp('POST', ['modules'], {}, { id: 'm_test', name: 'X' }))
    expect(e2?.statusCode).toBe(409)
    await disp('PATCH', ['modules', 'm_test'], {}, { name: '改名' })
    expect(await (await disp('GET', ['modules', 'm_test'])).data.name).toBe('改名')
    await disp('DELETE', ['modules', 'm_test'])
    expect(await (await disp('GET', ['modules', 'm_test'])).data).toBe(null)
  })
  it('章节：依赖模块存在', async () => {
    await disp('POST', ['modules'], {}, { id: 'm_c', name: 'C' })
    const e = await fails(async () => await disp('POST', ['chapters'], {}, { id: 'c_x', title: 'T', moduleId: 'no_such' }))
    expect(e?.statusCode).toBe(400)
    const c = await (await disp('POST', ['chapters'], {}, { id: 'c_x', title: '章节1', moduleId: 'm_c' })).data
    await disp('PATCH', ['chapters', 'c_x'], {}, { title: '章节改' })
    expect(await (await disp('GET', ['chapters', 'c_x'])).data.title).toBe('章节改')
    await disp('DELETE', ['chapters', 'c_x'])
    expect(await (await disp('GET', ['chapters', 'c_x'])).data).toBe(null)
    await disp('DELETE', ['modules', 'm_c'])
  })
  it('小节：依赖章节存在 + 删除级联', async () => {
    await disp('POST', ['modules'], {}, { id: 'm_s', name: 'S' })
    await disp('POST', ['chapters'], {}, { id: 'c_s', title: 'C', moduleId: 'm_s' })
    const e = await fails(async () => await disp('POST', ['sections'], {}, { id: 's_x', title: 'T', chapterId: 'no_such' }))
    expect(e?.statusCode).toBe(400)
    await disp('POST', ['sections'], {}, { id: 's_x', title: '节1', chapterId: 'c_s', content: 'hi' })
    await disp('DELETE', ['sections', 's_x'])
    expect(await (await disp('GET', ['sections', 's_x'])).data).toBe(null)
    await disp('DELETE', ['chapters', 'c_s'])
    await disp('DELETE', ['modules', 'm_s'])
  })
})

describe('G3 题库：试卷 + 面试题', () => {
  it('试卷：创建含选项/笔试 + 详情读取 + 更新 + 删除', async () => {
    const s = await (await disp('POST', ['exam-sets'], {}, {
      id: 'set1', name: '卷一', track: 'frontend', level: '初级', vipOnly: true,
      choices: [{ id: 'q1', q: '1+1?', options: ['1', '2'], answer: ['2'], explain: 'x', multi: false }],
      written: [{ id: 'w1', q: '简述', points: ['p1'], reference: 'ref' }]
    })).data
    expect(s.id).toBe('set1')
    const detail = await (await disp('GET', ['exam-sets', 'set1'])).data
    expect(detail.choices.length).toBe(1)
    expect(detail.written.length).toBe(1)
    // 更新选项（替换）
    await disp('PATCH', ['exam-sets', 'set1'], {}, { choices: [{ id: 'q2', q: '2+2?', options: ['3', '4'], answer: ['4'], explain: 'y' }] })
    expect(await (await disp('GET', ['exam-sets', 'set1'])).data.choices.length).toBe(1)
    await disp('DELETE', ['exam-sets', 'set1'])
    expect(await (await disp('GET', ['exam-sets', 'set1'])).data).toBe(null)
  })
  it('面试题：增删改查', async () => {
    const q = await (await disp('POST', ['interview'], {}, { id: 'iq1', track: 'frontend', type: 'hot', q: '什么是闭包?', a: '答' })).data
    expect(q.id).toBe('iq1')
    await disp('PATCH', ['interview', 'iq1'], {}, { q: '闭包是什么?' })
    expect(await (await disp('GET', ['interview', 'iq1'])).data.q).toBe('闭包是什么?')
    const list = await disp('GET', ['interview'], { track: 'frontend' })
    expect(list.items.some((x) => x.id === 'iq1')).toBe(true)
    await disp('DELETE', ['interview', 'iq1'])
    expect(await (await disp('GET', ['interview', 'iq1'])).data).toBe(null)
  })
})

describe('G5 订单 / 订阅（只读列表）', () => {
  it('orders / subscriptions 返回数组', async () => {
    expect(Array.isArray(await (await disp('GET', ['orders'])).items)).toBe(true)
    expect(Array.isArray(await (await disp('GET', ['subscriptions'])).items)).toBe(true)
  })
})

describe('G7 操作审计（变更类动作写审计）', () => {
  it('POST 模块后 audit_logs 有记录', async () => {
    const before = (await sqlite.prepare('SELECT COUNT(*) c FROM audit_logs').get()).c
    await disp('POST', ['modules'], {}, { id: 'm_audit', name: '审计' })
    const after = (await sqlite.prepare('SELECT COUNT(*) c FROM audit_logs').get()).c
    expect(after).toBe(before + 1)
    await disp('DELETE', ['modules', 'm_audit'])
  })
})

describe('H4 内推资源库管理（M4 维护）', () => {
  it('岗位列表含种子数据 + 增改删', async () => {
    const list = await disp('GET', ['referrals'])
    expect(Array.isArray(list.items)).toBe(true)
    expect(list.items.length).toBeGreaterThan(0)
    const r = await (await disp('POST', ['referrals'], {}, { id: 'r_admin_test', company: '测试公司', title: '测试岗', track: 'backend', city: '深圳' })).data
    expect(r.id).toBe('r_admin_test')
    const e = await fails(async () => await disp('POST', ['referrals'], {}, { id: 'r_admin_test', title: 'X' }))
    expect(e?.statusCode).toBe(409)
    const e2 = await fails(async () => await disp('POST', ['referrals'], {}, { id: 'X', title: 'Y' }))
    expect(e2?.statusCode).toBe(400)
    await disp('PATCH', ['referrals', 'r_admin_test'], {}, { city: '北京' })
    expect(await (await disp('GET', ['referrals', 'r_admin_test'])).data.city).toBe('北京')
    await disp('DELETE', ['referrals', 'r_admin_test'])
    expect(await (await disp('GET', ['referrals', 'r_admin_test'])).data).toBe(null)
  })
  it('申请：创建 → 列表 → 状态流转 → 非法状态被拒', async () => {
    const u = await (await disp('POST', ['users'], {}, { username: 'refuser', password: 'secret12' })).data
    const refId = await (await disp('GET', ['referrals'])).items[0].id
    const app = await applyReferral(u.id, { referralId: refId, name: '张三', contact: '13800000000' })
    const list = await disp('GET', ['referral-applications'])
    expect(list.items.some((x) => x.id === app.id)).toBe(true)
    await disp('PATCH', ['referral-applications', app.id], {}, { status: 'done' })
    expect(await (await disp('GET', ['referral-applications'])).items.find((x) => x.id === app.id).status).toBe('done')
    const e = await fails(async () => await disp('PATCH', ['referral-applications', app.id], {}, { status: 'bogus' }))
    expect(e?.statusCode).toBe(400)
  })
})
