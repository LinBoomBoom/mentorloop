import { describe, it, expect, afterAll } from 'vitest'
import { sqlite, newToken, requireAdmin } from '../server/utils/db'
import { adminDispatch } from '../server/utils/adminDispatch'

// 取真实管理员（create_admin.mjs 已建 admin@mentorloop.com）
const admin = sqlite.prepare("SELECT * FROM users WHERE email='admin@mentorloop.com'").get()
const adminToken = newToken(admin)
// 取一个真实非管理员用户做 403 验证
const normal = sqlite.prepare("SELECT * FROM users WHERE role<>'admin' ORDER BY id LIMIT 1").get()
const normalToken = normal ? newToken(normal) : null

// 构造最小 mock event：h3 getUser 通过 event.node.req.headers['x-token'] 读取 token
function evt(token) {
  return { node: { req: { headers: { 'x-token': token } } } }
}
function statusOf(fn) {
  try { fn() } catch (e) { return e.statusCode }
  return undefined
}

afterAll(() => {
  // 清理测试期间可能产生的会话行（token 写入 sessions），不影响业务数据
  sqlite.prepare("DELETE FROM sessions WHERE token IN (?, ?)").run(adminToken, normalToken || '')
})

describe('管理后台鉴权闸口', () => {
  it('未登录访问被拒 401', () => {
    expect(statusOf(() => requireAdmin(evt(undefined)))).toBe(401)
  })
  it('非管理员被拒 403', () => {
    if (!normalToken) return // 无普通用户时跳过
    expect(statusOf(() => requireAdmin(evt(normalToken)))).toBe(403)
  })
  it('管理员通过鉴权返回自身', () => {
    const u = requireAdmin(evt(adminToken))
    expect(u.role).toBe('admin')
    expect(u.email).toBe('admin@mentorloop.com')
  })
})

describe('管理后台分发逻辑', () => {
  it('GET /dashboard 返回数值指标', () => {
    const r = adminDispatch(admin, 'GET', ['dashboard'], {}, {})
    expect(r.ok).toBe(true)
    expect(typeof r.data.users).toBe('number')
    expect(typeof r.data.revenue).toBe('number')
  })
  it('GET /users 返回数组', () => {
    const r = adminDispatch(admin, 'GET', ['users'], {}, {})
    expect(r.ok).toBe(true); expect(Array.isArray(r.items)).toBe(true)
  })
  it('GET /modules 至少 4 个', () => {
    const r = adminDispatch(admin, 'GET', ['modules'], {}, {})
    expect(r.items.length).toBeGreaterThanOrEqual(4)
  })
  it('GET /exam-sets 共 19 套且 8 套 VIP', () => {
    const r = adminDispatch(admin, 'GET', ['exam-sets'], {}, {})
    expect(r.items.length).toBe(19)
    expect(r.items.filter((s) => s.vip_only).length).toBe(8)
  })
  it('GET /interview?track=ai 按方向过滤', () => {
    const r = adminDispatch(admin, 'GET', ['interview'], { track: 'ai' }, {})
    expect(Array.isArray(r.items)).toBe(true)
    expect(r.items.every((q) => q.track === 'ai')).toBe(true)
  })
  it('GET /orders 与 /subscriptions 可读', () => {
    expect(Array.isArray(adminDispatch(admin, 'GET', ['orders'], {}, {}).items)).toBe(true)
    expect(Array.isArray(adminDispatch(admin, 'GET', ['subscriptions'], {}, {}).items)).toBe(true)
  })
  it('未知接口 404', () => {
    expect(statusOf(() => adminDispatch(admin, 'GET', ['nope'], {}, {}))).toBe(404)
  })
  it('GET /me 返回管理员自身', () => {
    const r = adminDispatch(admin, 'GET', ['me'], {}, {})
    expect(r.ok).toBe(true)
    expect(r.data.email).toBe('admin@mentorloop.com')
    expect(r.data.role).toBe('admin')
  })
})
