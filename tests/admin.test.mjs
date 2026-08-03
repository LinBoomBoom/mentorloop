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
function disp(method, seg, q = {}, body = {}) {
  return adminDispatch(ADMIN, method, seg, q, body)
}
function fails(fn) {
  try { fn(); return null } catch (e) { return e }
}

beforeAll(() => {
  // 造一个 admin 账号（便于 createUser 等的角色语义），以及测试用父记录
  sqlite.prepare("INSERT OR IGNORE INTO users (id,username,password,role,created_at) VALUES ('admin_test','boss','x','admin',?)").run(Date.now())
})

afterAll(() => { try { rmSync(dir, { recursive: true, force: true }) } catch {} })

describe('G6 看板 & 兜底', () => {
  it('dashboard 返回核心指标', () => {
    const r = disp('GET', ['dashboard'])
    expect(r.ok).toBe(true)
    expect(typeof r.data.users).toBe('number')
    expect(typeof r.data.revenue).toBe('number')
  })
  it('未知接口返回 404', () => {
    const e = fails(() => disp('GET', ['nope']))
    expect(e?.statusCode).toBe(404)
  })
})

describe('G4 用户体系', () => {
  it('创建用户（弱密码被拒）', () => {
    const e = fails(() => disp('POST', ['users'], {}, { username: 'weak1', password: '123' }))
    expect(e?.statusCode).toBe(400)
  })
  it('创建 / 读取 / 列表', () => {
    const u = disp('POST', ['users'], {}, { username: 'alice', email: 'a@x.com', password: 'secret12', nickname: 'Alice' })
    expect(u.data.username).toBe('alice')
    const got = disp('GET', ['users', u.data.id])
    expect(got.data.nickname).toBe('Alice')
    const list = disp('GET', ['users'], { q: 'alice' })
    expect(list.items.some((x) => x.id === u.data.id)).toBe(true)
  })
  it('重复用户名返回 409', () => {
    const e = fails(() => disp('POST', ['users'], {}, { username: 'alice', password: 'secret12' }))
    expect(e?.statusCode).toBe(409)
  })
  it('PATCH 改角色 / 封禁 / 密码', () => {
    const u = disp('POST', ['users'], {}, { username: 'bob', password: 'secret12' }).data
    disp('PATCH', ['users', u.id], {}, { role: 'admin', banned: true })
    const got = disp('GET', ['users', u.id]).data
    expect(got.role).toBe('admin')
    expect(got.banned).toBe(true)
    disp('PATCH', ['users', u.id], {}, { password: 'newpass9' }) // 不抛错即可
  })
  it('不能删除当前登录管理员', () => {
    const e = fails(() => disp('DELETE', ['users', 'admin_test']))
    expect(e?.statusCode).toBe(400)
  })
  it('删除用户级联清理', () => {
    const u = disp('POST', ['users'], {}, { username: 'carol', password: 'secret12' }).data
    const d = disp('DELETE', ['users', u.id])
    expect(d.data.deleted).toBe(true)
    expect(disp('GET', ['users', u.id]).data).toBe(null)
  })
})

describe('G2 内容：模块/章节/小节', () => {
  it('模块：非法 ID / 重复 / 创建 / 更新 / 删除', () => {
    const e1 = fails(() => disp('POST', ['modules'], {}, { id: 'M', name: 'X' }))
    expect(e1?.statusCode).toBe(400)
    const m = disp('POST', ['modules'], {}, { id: 'm_test', name: '测试模块', color: '#fff' }).data
    const e2 = fails(() => disp('POST', ['modules'], {}, { id: 'm_test', name: 'X' }))
    expect(e2?.statusCode).toBe(409)
    disp('PATCH', ['modules', 'm_test'], {}, { name: '改名' })
    expect(disp('GET', ['modules', 'm_test']).data.name).toBe('改名')
    disp('DELETE', ['modules', 'm_test'])
    expect(disp('GET', ['modules', 'm_test']).data).toBe(null)
  })
  it('章节：依赖模块存在', () => {
    disp('POST', ['modules'], {}, { id: 'm_c', name: 'C' })
    const e = fails(() => disp('POST', ['chapters'], {}, { id: 'c_x', title: 'T', moduleId: 'no_such' }))
    expect(e?.statusCode).toBe(400)
    const c = disp('POST', ['chapters'], {}, { id: 'c_x', title: '章节1', moduleId: 'm_c' }).data
    disp('PATCH', ['chapters', 'c_x'], {}, { title: '章节改' })
    expect(disp('GET', ['chapters', 'c_x']).data.title).toBe('章节改')
    disp('DELETE', ['chapters', 'c_x'])
    expect(disp('GET', ['chapters', 'c_x']).data).toBe(null)
    disp('DELETE', ['modules', 'm_c'])
  })
  it('小节：依赖章节存在 + 删除级联', () => {
    disp('POST', ['modules'], {}, { id: 'm_s', name: 'S' })
    disp('POST', ['chapters'], {}, { id: 'c_s', title: 'C', moduleId: 'm_s' })
    const e = fails(() => disp('POST', ['sections'], {}, { id: 's_x', title: 'T', chapterId: 'no_such' }))
    expect(e?.statusCode).toBe(400)
    disp('POST', ['sections'], {}, { id: 's_x', title: '节1', chapterId: 'c_s', content: 'hi' })
    disp('DELETE', ['sections', 's_x'])
    expect(disp('GET', ['sections', 's_x']).data).toBe(null)
    disp('DELETE', ['chapters', 'c_s'])
    disp('DELETE', ['modules', 'm_s'])
  })
})

describe('G3 题库：试卷 + 面试题', () => {
  it('试卷：创建含选项/笔试 + 详情读取 + 更新 + 删除', () => {
    const s = disp('POST', ['exam-sets'], {}, {
      id: 'set1', name: '卷一', track: 'frontend', level: '初级', vipOnly: true,
      choices: [{ id: 'q1', q: '1+1?', options: ['1', '2'], answer: ['2'], explain: 'x', multi: false }],
      written: [{ id: 'w1', q: '简述', points: ['p1'], reference: 'ref' }]
    }).data
    expect(s.id).toBe('set1')
    const detail = disp('GET', ['exam-sets', 'set1']).data
    expect(detail.choices.length).toBe(1)
    expect(detail.written.length).toBe(1)
    // 更新选项（替换）
    disp('PATCH', ['exam-sets', 'set1'], {}, { choices: [{ id: 'q2', q: '2+2?', options: ['3', '4'], answer: ['4'], explain: 'y' }] })
    expect(disp('GET', ['exam-sets', 'set1']).data.choices.length).toBe(1)
    disp('DELETE', ['exam-sets', 'set1'])
    expect(disp('GET', ['exam-sets', 'set1']).data).toBe(null)
  })
  it('面试题：增删改查', () => {
    const q = disp('POST', ['interview'], {}, { id: 'iq1', track: 'frontend', type: 'hot', q: '什么是闭包?', a: '答' }).data
    expect(q.id).toBe('iq1')
    disp('PATCH', ['interview', 'iq1'], {}, { q: '闭包是什么?' })
    expect(disp('GET', ['interview', 'iq1']).data.q).toBe('闭包是什么?')
    const list = disp('GET', ['interview'], { track: 'frontend' })
    expect(list.items.some((x) => x.id === 'iq1')).toBe(true)
    disp('DELETE', ['interview', 'iq1'])
    expect(disp('GET', ['interview', 'iq1']).data).toBe(null)
  })
})

describe('G5 订单 / 订阅（只读列表）', () => {
  it('orders / subscriptions 返回数组', () => {
    expect(Array.isArray(disp('GET', ['orders']).items)).toBe(true)
    expect(Array.isArray(disp('GET', ['subscriptions']).items)).toBe(true)
  })
})

describe('G7 操作审计（变更类动作写审计）', () => {
  it('POST 模块后 audit_logs 有记录', () => {
    const before = sqlite.prepare('SELECT COUNT(*) c FROM audit_logs').get().c
    disp('POST', ['modules'], {}, { id: 'm_audit', name: '审计' })
    const after = sqlite.prepare('SELECT COUNT(*) c FROM audit_logs').get().c
    expect(after).toBe(before + 1)
    disp('DELETE', ['modules', 'm_audit'])
  })
})

describe('H4 内推资源库管理（M4 维护）', () => {
  it('岗位列表含种子数据 + 增改删', () => {
    const list = disp('GET', ['referrals'])
    expect(Array.isArray(list.items)).toBe(true)
    expect(list.items.length).toBeGreaterThan(0)
    const r = disp('POST', ['referrals'], {}, { id: 'r_admin_test', company: '测试公司', title: '测试岗', track: 'backend', city: '深圳' }).data
    expect(r.id).toBe('r_admin_test')
    const e = fails(() => disp('POST', ['referrals'], {}, { id: 'r_admin_test', title: 'X' }))
    expect(e?.statusCode).toBe(409)
    const e2 = fails(() => disp('POST', ['referrals'], {}, { id: 'X', title: 'Y' }))
    expect(e2?.statusCode).toBe(400)
    disp('PATCH', ['referrals', 'r_admin_test'], {}, { city: '北京' })
    expect(disp('GET', ['referrals', 'r_admin_test']).data.city).toBe('北京')
    disp('DELETE', ['referrals', 'r_admin_test'])
    expect(disp('GET', ['referrals', 'r_admin_test']).data).toBe(null)
  })
  it('申请：创建 → 列表 → 状态流转 → 非法状态被拒', async () => {
    const u = disp('POST', ['users'], {}, { username: 'refuser', password: 'secret12' }).data
    const refId = disp('GET', ['referrals']).items[0].id
    const app = await applyReferral(u.id, { referralId: refId, name: '张三', contact: '13800000000' })
    const list = disp('GET', ['referral-applications'])
    expect(list.items.some((x) => x.id === app.id)).toBe(true)
    disp('PATCH', ['referral-applications', app.id], {}, { status: 'done' })
    expect(disp('GET', ['referral-applications']).items.find((x) => x.id === app.id).status).toBe('done')
    const e = fails(() => disp('PATCH', ['referral-applications', app.id], {}, { status: 'bogus' }))
    expect(e?.statusCode).toBe(400)
  })
})
