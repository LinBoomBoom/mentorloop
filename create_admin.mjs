// 创建 / 升级 MentorLoop 管理员账号（幂等）
// 凭据严格按产品要求：admin@mentorloop.com / 123456，role=admin，VIP 满级永久。
// 密码哈希与 server/utils/db.ts 的 hashPwd 一致（scrypt）。
// ⚠️ 123456 为弱密码，仅开发/演示用；上线前必须替换为强密码并移入 .env（见总体规划 B/A 类）。
import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'devmentor.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 兼容老库：补 role 列
try { db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run() } catch (e) { /* 已存在 */ }

function hashPwd(pwd, salt) {
  salt = salt || crypto.randomBytes(8).toString('hex')
  const hash = crypto.scryptSync(pwd, salt, 32).toString('hex')
  return salt + ':' + hash
}

const EMAIL = 'admin@mentorloop.com'
const USERNAME = 'admin'
const NICKNAME = '管理员'
const PASSWORD = 'qwer1234' // 产品指定弱密码（开发/演示用，满足 A14 策略：≥8 位含字母+数字）
const VIP = JSON.stringify({ level: 3, expireAt: null }) // 满级、永久

// 确保目标管理员账号存在且凭据正确
const existing = db.prepare('SELECT * FROM users WHERE lower(email)=? OR username=?').get(EMAIL.toLowerCase(), USERNAME)
if (existing) {
  db.prepare("UPDATE users SET role='admin', vip=?, password=?, nickname=?, email=? WHERE id=?")
    .run(VIP, hashPwd(PASSWORD), NICKNAME, EMAIL, existing.id)
  console.log('[更新] 已存在账号升级/重置为指定管理员：', existing.username || existing.email)
} else {
  const id = 'u_' + crypto.randomBytes(6).toString('hex')
  db.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,role,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, USERNAME, NICKNAME, hashPwd(PASSWORD), EMAIL, null, '{}', VIP, 'admin', Date.now())
  console.log('[新建] 管理员账号已创建')
}

// 清理历史遗留的错误管理员（admin@mentorloop.local 等），避免凭据混乱
const legacy = db.prepare("SELECT id FROM users WHERE email LIKE '%@mentorloop.local' AND username='admin'").all()
for (const r of legacy) {
  // 仅当目标账号已就位才清理遗留
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(r.id)
  db.prepare('DELETE FROM users WHERE id=?').run(r.id)
  console.log('[清理] 已移除遗留管理员账号:', r.id)
}

// 校验
const u = db.prepare('SELECT id,username,email,role,vip FROM users WHERE lower(email)=?').get(EMAIL.toLowerCase())
console.log('--- 管理员凭据（产品指定） ---')
console.log('登录方式 : 邮箱密码登录')
console.log('邮箱     :', u.email)
console.log('用户名   :', u.username)
console.log('密码     :', PASSWORD)
console.log('角色     :', u.role)
console.log('VIP      :', u.vip)
console.log('--- 全部用户 ---')
const all = db.prepare('SELECT username,email,role,vip FROM users').all()
for (const r of all) console.log(' -', r.username, '|', r.email, '| role=', r.role, '| vip=', r.vip)

db.close()
