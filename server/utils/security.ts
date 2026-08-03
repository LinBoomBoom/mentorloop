// 安全加固工具集（A5/A6/A8/A9/A10/A11）
// 限流、登录防爆破、输入校验、搜索转义、HttpOnly 鉴权 Cookie 写入/清除。
import { getRequestHeader, setCookie, deleteCookie } from 'h3'
import { sqlite, SESSION_TTL_MS } from './db'

export const AUTH_COOKIE = 'ml_token'

/* ---------------- A5 接口限流（内存滑动窗口） ---------------- */
// 单实例足够；多实例部署时改 Redis 等共享后端即可（接口不变）。
const buckets = new Map<string, { count: number; resetAt: number }>()

function maybeSweep() {
  if (buckets.size > 2000) {
    const now = Date.now()
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
  }
}

// 返回 { ok, retryAfter(秒) }。超过阈值即拒绝。
export function rateLimit(scope: string, key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  maybeSweep()
  const now = Date.now()
  const id = scope + ':' + key
  const b = buckets.get(id)
  if (!b || b.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  b.count++
  if (b.count > max) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  return { ok: true, retryAfter: 0 }
}

/* ---------------- A6 登录防爆破（持久化，跨重启生效） ---------------- */
const MAX_LOGIN_FAILS = 5
const LOGIN_LOCK_MS = 15 * 60 * 1000 // 锁定 15 分钟

export function recordLoginFailure(ip: string, identifier: string) {
  const key = ip + '|' + identifier
  const now = Date.now()
  const row = sqlite.prepare('SELECT * FROM login_attempts WHERE key = ?').get(key) as any
  if (!row) {
    sqlite.prepare('INSERT INTO login_attempts (key, fails, locked_until, updated_at) VALUES (?,?,?,?)')
      .run(key, 1, 0, now)
  } else {
    const fails = row.fails + 1
    const locked_until = fails >= MAX_LOGIN_FAILS ? now + LOGIN_LOCK_MS : 0
    sqlite.prepare('UPDATE login_attempts SET fails = ?, locked_until = ?, updated_at = ? WHERE key = ?')
      .run(fails, locked_until, now, key)
  }
}
// 返回剩余锁定时长（秒），未锁定返回 0。过期自动清零。
export function getLoginLock(ip: string, identifier: string): number {
  const key = ip + '|' + identifier
  const row = sqlite.prepare('SELECT * FROM login_attempts WHERE key = ?').get(key) as any
  if (!row || !row.locked_until) return 0
  if (row.locked_until <= Date.now()) {
    sqlite.prepare('UPDATE login_attempts SET locked_until = 0, fails = 0 WHERE key = ?').run(key)
    return 0
  }
  return Math.ceil((row.locked_until - Date.now()) / 1000)
}
export function resetLoginFailure(ip: string, identifier: string) {
  sqlite.prepare('DELETE FROM login_attempts WHERE key = ?').run(ip + '|' + identifier)
}

/* ---------------- A8 输入长度/类型校验 ---------------- */
export class InputError extends Error {}

// 密码强度基线（A14）：长度 >= 8 且至少包含「字母 / 数字 / 特殊字符」中的两类。
// 返回规范化字符串（明文），校验失败抛 InputError（register/login 统一映射 400）。
export const PASSWORD_MIN_LEN = 8
export function assertPassword(value: any): string {
  const s = typeof value === 'string' ? value : ''
  if (!s) throw new InputError('密码不能为空')
  if (s.length < PASSWORD_MIN_LEN) throw new InputError('密码至少 ' + PASSWORD_MIN_LEN + ' 位')
  if (s.length > 128) throw new InputError('密码长度超限（最多 128 个字符）')
  const hasLetter = /[a-zA-Z]/.test(s)
  const hasDigit = /\d/.test(s)
  const hasSpecial = /[^A-Za-z0-9]/.test(s)
  const classes = [hasLetter, hasDigit, hasSpecial].filter(Boolean).length
  if (classes < 2) throw new InputError('密码需至少包含字母、数字中的两类（建议字母+数字组合）')
  return s
}

// 统一校验：必填、长度区间、正则。返回规范化字符串（截断前不改动）。
export function assertInput(value: any, opts: { name: string; required?: boolean; min?: number; max?: number; pattern?: RegExp }): string {
  const s = typeof value === 'string' ? value : value == null ? '' : String(value)
  if (opts.required && !s.trim()) throw new InputError(opts.name + '不能为空')
  if (opts.min != null && s.length < opts.min) throw new InputError(opts.name + '长度过短（至少 ' + opts.min + ' 个字符）')
  if (opts.max != null && s.length > opts.max) throw new InputError(opts.name + '长度超限（最多 ' + opts.max + ' 个字符）')
  if (opts.pattern && !opts.pattern.test(s)) throw new InputError(opts.name + '格式不正确')
  return s
}

/* ---------------- A10 搜索 LIKE 通配符转义 ---------------- */
// LIKE 中 % 与 _ 是通配符，需转义避免用户构造的查询越权/失控。
export function likeEscape(s: string): string {
  return String(s).replace(/[\\%_]/g, (m) => '\\' + m)
}
export function likeWrap(s: string): string {
  return '%' + likeEscape(s) + '%'
}

/* ---------------- A11 HttpOnly 鉴权 Cookie ---------------- */
export function setAuthCookie(event: any, token: string) {
  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000
  })
}
export function clearAuthCookie(event: any) {
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
}

/* ---------------- 客户端 IP ---------------- */
export function getClientIp(event: any): string {
  const xff = getRequestHeader(event, 'x-forwarded-for')
  if (xff) return String(xff).split(',')[0].trim()
  return (event?.node?.req?.socket?.remoteAddress) || 'unknown'
}

// 登录失败统一延迟（A9 防时序侧信道：无论用户是否存在都消耗相似时间）
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
