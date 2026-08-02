// MentorLoop 数据访问与认证核心（better-sqlite3 + 原生 SQL）
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getHeader, setResponseStatus, createError } from 'h3'

/* ---------------- 单例数据库 ---------------- */
const g = globalThis as any
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'devmentor.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

function createDb() {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  // 业务索引（幂等；解决上线后 exam_records/progress/choices 全表扫描，见总体规划 B1）
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_exam_records_user ON exam_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_records_set ON exam_records(set_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_choices_set ON exam_choices(set_id);
    CREATE INDEX IF NOT EXISTS idx_sections_chapter ON sections(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_module ON chapters(module_id);
    CREATE INDEX IF NOT EXISTS idx_interview_track ON interview_questions(track);
    CREATE INDEX IF NOT EXISTS idx_exam_sets_track ON exam_sets(track);
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE, nickname TEXT,
      email TEXT, phone TEXT, password TEXT, avatar TEXT,
      providers TEXT DEFAULT '{}', vip TEXT DEFAULT '{"level":0,"expireAt":null}', created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS auth_codes (
      key TEXT PRIMARY KEY, code TEXT, expires_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY, name TEXT, icon TEXT, color TEXT, desc TEXT, position INTEGER
    );
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY, module_id TEXT, title TEXT, goal TEXT, position INTEGER
    );
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY, chapter_id TEXT, title TEXT, direction TEXT, content TEXT, position INTEGER
    );
    CREATE TABLE IF NOT EXISTS interview_questions (
      id TEXT PRIMARY KEY, track TEXT, type TEXT, q TEXT, a TEXT, keywords TEXT
    );
    CREATE TABLE IF NOT EXISTS exam_sets (
      id TEXT PRIMARY KEY, name TEXT, track TEXT, level TEXT, duration INTEGER, vip_only INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS exam_choices (
      id TEXT PRIMARY KEY, set_id TEXT, tag TEXT, q TEXT, options TEXT, answer TEXT, explain TEXT, multi INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS exam_written (
      id TEXT PRIMARY KEY, set_id TEXT, q TEXT, points TEXT, reference TEXT
    );
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT, module_id TEXT, chapter_id TEXT, section_id TEXT, done_at INTEGER,
      PRIMARY KEY (user_id, section_id)
    );
    CREATE TABLE IF NOT EXISTS exam_records (
      id TEXT PRIMARY KEY, user_id TEXT, set_id TEXT, set_name TEXT, track TEXT,
      score INTEGER, correct INTEGER, total INTEGER, weak_points TEXT, level TEXT,
      advice TEXT, used_seconds INTEGER, choice_review TEXT, written_review TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'CNY',
      status TEXT DEFAULT 'pending',
      provider TEXT,
      provider_order_id TEXT,
      subject TEXT,
      created_at INTEGER,
      paid_at INTEGER,
      expire_at INTEGER,
      meta TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      auto_renew INTEGER DEFAULT 0,
      start_at INTEGER,
      expire_at INTEGER,
      created_at INTEGER,
      canceled_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
  `)
  // 迁移：管理员角色字段（兼容老库，无 role 列时补齐）
  try { db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run() } catch (e) { /* 列已存在 */ }
  // 迁移：封禁标记（G4 用户体系：封禁/解封）
  try { db.prepare("ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0").run() } catch (e) { /* 列已存在 */ }
  seedIfEmpty(db)
  return db
}

function seedIfEmpty(db: any) {
  const c = (db.prepare('SELECT COUNT(*) AS c FROM modules').get() as any).c
  if (c > 0) return
  const file = path.join(process.cwd(), 'data', 'seed-content.json')
  if (!fs.existsSync(file)) return
  const content = JSON.parse(fs.readFileSync(file, 'utf-8'))
  const insMod = db.prepare('INSERT OR IGNORE INTO modules (id,name,icon,color,desc,position) VALUES (?,?,?,?,?,?)')
  const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position) VALUES (?,?,?,?,?)')
  const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const insQ = db.prepare('INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords) VALUES (?,?,?,?,?,?)')
  const insSet = db.prepare('INSERT OR IGNORE INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)')
  const insC = db.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,explain,multi) VALUES (?,?,?,?,?,?,?,?)')
  const insW = db.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference) VALUES (?,?,?,?,?)')
  const tx = db.transaction(() => {
    content.modules.forEach((m: any, mi: number) => {
      insMod.run(m.id, m.name, m.icon, m.color, m.desc, mi)
      m.chapters.forEach((ch: any, ci: number) => {
        insCh.run(ch.id, m.id, ch.title, ch.goal, ci)
        ch.sections.forEach((s: any, si: number) => {
          insSec.run(s.id, ch.id, s.title, s.direction, s.content, si)
        })
      })
    })
    Object.entries(content.interview).forEach(([track, bank]: any) => {
      ;[...bank.hot, ...bank.special].forEach((q: any) => {
        insQ.run(q.id, track, q.id[1] === 's' ? 'special' : 'hot', q.q, q.a, JSON.stringify(q.keywords || []))
      })
    })
    content.examSets.forEach((set: any) => {
      insSet.run(set.id, set.name, set.track, set.level, set.duration, set.vipOnly ? 1 : 0)
      set.choices.forEach((c: any) => insC.run(c.id, set.id, c.tag, c.q, JSON.stringify(c.options), JSON.stringify(c.answer), c.explain, c.multi ? 1 : 0))
      set.written.forEach((w: any) => insW.run(w.id, set.id, w.q, JSON.stringify(w.points), w.reference))
    })
  })
  tx()
}

export const sqlite = g.__dmDb ?? (g.__dmDb = createDb())

/* ---------------- 工具 ---------------- */
export const DEV_CODE = process.env.DEV_CODE === 'true' // 演示模式：验证码明文下发；生产必须 unset / 置 false，并接入真实短信/邮件

export function hashPwd(pwd: string, salt?: string): string {
  salt = salt || crypto.randomBytes(8).toString('hex')
  const hash = crypto.scryptSync(pwd, salt, 32).toString('hex')
  return salt + ':' + hash
}
export function verifyPwd(pwd: string, stored?: string): boolean {
  if (!stored) return false
  const [salt] = stored.split(':')
  return hashPwd(pwd, salt) === stored
}
export function publicUser(u: any) {
  return {
    id: u.id, username: u.username, nickname: u.nickname,
    email: u.email || null, phone: u.phone || null, avatar: u.avatar || null,
    role: u.role || 'user',
    banned: !!u.banned,
    vip: effectiveVip(u),
    createdAt: u.created_at
  }
}

// 返回「有效」会员状态：到期自动失效（与后端门禁 requireVip 逻辑一致）
export function effectiveVip(u: any) {
  let v: any = { level: 0, expireAt: null }
  try { v = typeof u.vip === 'string' ? JSON.parse(u.vip) : (u.vip || v) } catch { /* ignore */ }
  const active = !!v && v.level > 0 && (!v.expireAt || v.expireAt > Date.now())
  return { level: v.level || 0, expireAt: v.expireAt || null, active }
}

const VIP_LEVEL_BY_PLAN: Record<string, number> = { monthly: 1, quarterly: 1, yearly: 3 }

// 开通/续费状态机：支付成功后调用。首次购买创建订阅，续费则顺延 expireAt。
export function fulfillOrder(orderId: string, transactionId?: string, paidAt?: number) {
  const now = Date.now()
  const order = sqlite.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as any
  if (!order || order.status === 'paid') return false
  const planLevel = VIP_LEVEL_BY_PLAN[order.plan_id] || 1
  const durationMs = planDurationMs(order.plan_id)
  const tx = sqlite.transaction(() => {
    sqlite.prepare(`UPDATE orders SET status='paid', paid_at=?, provider_order_id=? WHERE id=?`)
      .run(paidAt || now, transactionId || null, orderId)
    const existing = sqlite.prepare(
      `SELECT * FROM subscriptions WHERE user_id=? AND status='active' AND expire_at>? ORDER BY expire_at DESC LIMIT 1`
    ).get(order.user_id, now) as any
    let newExpire: number
    if (existing) {
      newExpire = Math.max(existing.expire_at, now) + durationMs
      sqlite.prepare(`UPDATE subscriptions SET expire_at=?, level=?, plan_id=?, auto_renew=1 WHERE id=?`)
        .run(newExpire, planLevel, order.plan_id, existing.id)
    } else {
      newExpire = now + durationMs
      sqlite.prepare(`INSERT INTO subscriptions (id,user_id,plan_id,level,status,auto_renew,start_at,expire_at,created_at)
        VALUES (?,?,?,?,'active',1,?,?,?)`)
        .run(uid('s_'), order.user_id, order.plan_id, planLevel, now, newExpire, now)
    }
    sqlite.prepare(`UPDATE users SET vip=? WHERE id=?`)
      .run(JSON.stringify({ level: planLevel, expireAt: newExpire }), order.user_id)
  })
  tx()
  return true
}

// 计划时长（毫秒）。计划定义见 server/utils/plans.ts，这里做兜底映射避免循环依赖。
function planDurationMs(planId: string): number {
  const days: Record<string, number> = { monthly: 31, quarterly: 93, yearly: 366 }
  return (days[planId] || 31) * 86400000
}

export function getActiveSubscription(userId: string): any {
  return sqlite.prepare(
    `SELECT * FROM subscriptions WHERE user_id=? AND status='active' AND expire_at>? ORDER BY expire_at DESC LIMIT 1`
  ).get(userId, Date.now()) || null
}
export function getUser(event: any): any {
  const token = getHeader(event, 'x-token')
  if (!token) return null
  const row = sqlite.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) as any
  if (!row) return null
  return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) || null
}
export function newToken(user: any): string {
  const t = crypto.randomBytes(16).toString('hex')
  sqlite.prepare('INSERT OR REPLACE INTO sessions (token, user_id, created_at) VALUES (?,?,?)').run(t, user.id, Date.now())
  return t
}
export function genCode() { return String(Math.floor(100000 + Math.random() * 900000)) }
export function uid(prefix = 'u_') { return prefix + crypto.randomBytes(6).toString('hex') }
export function sendCode(type: string, identifier: string): string {
  const code = genCode()
  sqlite.prepare('INSERT OR REPLACE INTO auth_codes (key, code, expires_at) VALUES (?,?,?)')
    .run(type + ':' + String(identifier).toLowerCase(), code, Date.now() + 5 * 60 * 1000)
  return code
}
export function verifyCode(type: string, identifier: string, code: string): boolean {
  const key = type + ':' + String(identifier).toLowerCase()
  const row = sqlite.prepare('SELECT * FROM auth_codes WHERE key = ?').get(key) as any
  if (!row) return false
  if (row.expires_at < Date.now()) { sqlite.prepare('DELETE FROM auth_codes WHERE key=?').run(key); return false }
  if (String(row.code) !== String(code)) return false
  sqlite.prepare('DELETE FROM auth_codes WHERE key=?').run(key)
  return true
}
export function findByIdentifier(type: string, identifier: string): any {
  const id = String(identifier || '').toLowerCase()
  const row = type === 'email'
    ? sqlite.prepare('SELECT * FROM users WHERE lower(email)=?').get(id)
    : sqlite.prepare('SELECT * FROM users WHERE lower(phone)=?').get(id)
  return row || null
}
export function requireVip(user: any, item: any): boolean {
  if (user && user.role === 'admin') return true // 管理员恒放行
  if (item && item.vip_only) {
    if (!user) return false
    const v = typeof user.vip === 'string' ? JSON.parse(user.vip) : user.vip
    if (!v || v.level < 1) return false
    if (v.expireAt && v.expireAt < Date.now()) return false // 到期回收（P0-A3：防止付费会员到期后权益不回收）
  }
  return true
}

// 管理后台闸口：未登录 401 / 非管理员 403。需在事件处理函数中调用，失败抛出 h3 错误。
export function requireAdmin(event: any): any {
  const user = getUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '未登录' })
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: '需要管理员权限' })
  return user
}
export function json(event: any, code: number, data: any) {
  setResponseStatus(event, code)
  return data
}
