import { describe, it, expect, afterAll } from 'vitest'
import { sqlite, newToken, getUser, cleanupExpired } from '../server/utils/db'
import {
  rateLimit, recordLoginFailure, getLoginLock, resetLoginFailure,
  assertInput, InputError, likeEscape, likeWrap, setAuthCookie, clearAuthCookie, AUTH_COOKIE
} from '../server/utils/security'

const testIds = []
afterAll(async () => {
  for (const id of testIds) {
    await sqlite.prepare('DELETE FROM users WHERE id=?').run(id)
    await sqlite.prepare("DELETE FROM login_attempts WHERE key LIKE ?").run('%' + id + '%')
  }
})
async function makeUser() {
  const id = 'u_sec_' + Math.random().toString(36).slice(2, 8)
  await sqlite.prepare('INSERT INTO users (id,username,nickname,vip,created_at) VALUES (?,?,?,?,?)')
    .run(id, id, 'S', JSON.stringify({ level: 0, expireAt: null }), Date.now())
  testIds.push(id)
  return id
}

describe('A5 接口限流', () => {
  it('滑动窗口：超过阈值即拒绝并返回 retryAfter', () => {
    const key = 'k_' + Math.random().toString(36).slice(2, 8)
    for (let i = 0; i < 10; i++) expect(rateLimit('t', key, 10, 1000).ok).toBe(true)
    const blocked = rateLimit('t', key, 10, 1000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })
})

describe('A6 登录防爆破', () => {
  it('连续失败达阈值后锁定，reset 后解除', async () => {
    const ip = '1.2.3.4', id = 'p:sec@example.com'
    await resetLoginFailure(ip, id)
    for (let i = 0; i < 5; i++) await recordLoginFailure(ip, id)
    expect(await getLoginLock(ip, id)).toBeGreaterThan(0)
    await resetLoginFailure(ip, id)
    expect(await getLoginLock(ip, id)).toBe(0)
  })
  it('未达阈值不锁定', async () => {
    const ip = '9.9.9.9', id = 'p:few@example.com'
    await resetLoginFailure(ip, id)
    await recordLoginFailure(ip, id)
    expect(await getLoginLock(ip, id)).toBe(0)
  })
})

describe('A8 输入校验', () => {
  it('超长/非法格式抛 InputError', () => {
    expect(() => assertInput('ab', { name: 'x', min: 3 })).toThrow(InputError)
    expect(() => assertInput('a'.repeat(300), { name: 'x', max: 64 })).toThrow(InputError)
    expect(() => assertInput('not-an-email', { name: '邮箱', pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ })).toThrow(InputError)
    expect(assertInput('ok', { name: 'x', min: 1, max: 8 })).toBe('ok')
  })
})

describe('A10 搜索 LIKE 转义', () => {
  it('转义 % 与 _ 通配符', () => {
    expect(likeEscape('a%b_c')).toBe('a\\%b\\_c')
    expect(likeWrap('100%')).toBe('%100\\%%')
  })
})

describe('A11 会话过期 + HttpOnly Cookie', () => {
  it('newToken 写入带过期时间的会话', async () => {
    const uid = await makeUser()
    const token = await newToken({ id: uid })
    const row = await sqlite.prepare('SELECT expires_at FROM sessions WHERE token=?').get(token)
    expect(row.expires_at).toBeGreaterThan(Date.now())
  })
  it('过期会话被 getUser 回收', async () => {
    const uid = await makeUser()
    const token = await newToken({ id: uid })
    // 手动把该会话改成已过期
    await sqlite.prepare('UPDATE sessions SET expires_at=? WHERE token=?').run(Date.now() - 1000, token)
    const evt = { node: { req: { headers: { cookie: AUTH_COOKIE + '=' + token } } } }
    expect(await getUser(evt)).toBe(null)
    expect(await sqlite.prepare('SELECT * FROM sessions WHERE token=?').get(token)).toBeUndefined()
  })
  it('有效会话经 Cookie 可被 getUser 识别', async () => {
    const uid = await makeUser()
    const token = await newToken({ id: uid })
    const evt = { node: { req: { headers: { cookie: AUTH_COOKIE + '=' + token } } } }
    const u = await getUser(evt)
    expect(u).toBeTruthy()
    expect(u.id).toBe(uid)
  })
  it('setAuthCookie 写入 HttpOnly Cookie', () => {
    // 构造具备完整响应头能力的 h3 风格 mock event（node.res 需提供 getHeader/setHeader）
    const store = {}
    const evt = {
      node: {
        req: { headers: {} },
        res: {
          getHeader: (k) => store[k.toLowerCase()],
          setHeader: (k, v) => { store[k.toLowerCase()] = v },
          appendHeader: (k, v) => {
            const key = k.toLowerCase()
            const cur = store[key]
            if (Array.isArray(cur)) cur.push(v)
            else if (cur === undefined) store[key] = v
            else store[key] = [cur, v]
          },
          getHeaderNames: () => Object.keys(store),
          removeHeader: (k) => { delete store[k.toLowerCase()] },
          hasHeader: (k) => k.toLowerCase() in store
        }
      },
      headers: {}
    }
    setAuthCookie(evt, 'abc')
    const sc = evt.node.res.getHeader('set-cookie')
    const cookieStr = Array.isArray(sc) ? sc.join('; ') : (sc || '')
    expect(cookieStr).toContain('HttpOnly') // A11：鉴权 Cookie 必须 HttpOnly
    expect(cookieStr).toContain('Path=/')
    clearAuthCookie(evt)
  })
  it('cleanupExpired 删除过期会话', async () => {
    const uid = await makeUser()
    const token = await newToken({ id: uid })
    await sqlite.prepare('UPDATE sessions SET expires_at=? WHERE token=?').run(Date.now() - 1000, token)
    await cleanupExpired()
    expect(await sqlite.prepare('SELECT * FROM sessions WHERE token=?').get(token)).toBeUndefined()
  })
})
