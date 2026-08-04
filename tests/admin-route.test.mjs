import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'

// 自建独立临时库，避免与同 worker 内其他测试文件共享 sqlite 单例导致数据串扰。
const dir = mkdtempSync(join(tmpdir(), 'ml-admin-route-'))
process.env.DB_PATH = join(dir, 'test.db')

const { sqlite, newToken, requireAdmin } = await import('../server/utils/db')
const { adminDispatch } = await import('../server/utils/adminDispatch')

// 本测试库内置管理员与普通用户（不依赖生产库 / 其他测试的临时库）。
sqlite.prepare("INSERT INTO users (id,username,email,password,role,vip) VALUES ('admin_test','admin@mentorloop.com','admin@mentorloop.com','x','admin','{}')").run()
sqlite.prepare("INSERT INTO users (id,username,email,password,role,vip) VALUES ('normal_test','normal@mentorloop.com','normal@mentorloop.com','x','user','{}')").run()
const admin = sqlite.prepare("SELECT * FROM users WHERE email='admin@mentorloop.com'").get()
const adminToken = newToken(admin)
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
  // 清理本测试产生的会话行，并删除临时库目录
  try { sqlite.prepare("DELETE FROM sessions WHERE token IN (?, ?)").run(adminToken, normalToken || '') } catch {}
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
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
    // 过滤测试期间可能并发产生的测试行（tex_ 前缀，来自 admin.test.mjs CRUD），
    // 避免与并行执行的测试文件互相干扰导致断言偶发失败。
    const real = r.items.filter((s) => !String(s.id).startsWith('tex_'))
    expect(real.length).toBe(19)
    expect(real.filter((s) => s.vip_only).length).toBe(8)
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
