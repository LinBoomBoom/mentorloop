// 创建 / 升级 MentorLoop 管理员账号（幂等）
// 用 better-sqlite3 直接写库，密码哈希与 server/utils/db.ts 的 hashPwd 一致（scrypt）
import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'

const DB_PATH = path.join(process.cwd(), 'data', 'devmentor.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

// 兼容老库：补 role 列
try { db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run() } catch (e) { /* 已存在 */ }

function hashPwd(pwd, salt) {
  salt = salt || crypto.randomBytes(8).toString('hex')
  const hash = crypto.scryptSync(pwd, salt, 32).toString('hex')
  return salt + ':' + hash
}

const EMAIL = 'admin@mentorloop.local'
const USERNAME = 'admin'
const NICKNAME = '管理员'
// 随机强密码（16 位：大小写+数字+符号）
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
const PASSWORD = Array.from(crypto.randomBytes(16), (b) => chars[b % chars.length]).join('')
const VIP = JSON.stringify({ level: 3, expireAt: null }) // 满级、永久

const existing = db.prepare('SELECT * FROM users WHERE lower(email)=? OR username=?').get(EMAIL.toLowerCase(), USERNAME)

if (existing) {
  db.prepare("UPDATE users SET role='admin', vip=?, password=?, nickname=? WHERE id=?")
    .run(VIP, hashPwd(PASSWORD), NICKNAME, existing.id)
  console.log('[更新] 已存在账号升级为管理员：', existing.username || existing.email)
} else {
  const id = 'u_' + crypto.randomBytes(6).toString('hex')
  db.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,role,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, USERNAME, NICKNAME, hashPwd(PASSWORD), EMAIL, null, '{}', VIP, 'admin', Date.now())
  console.log('[新建] 管理员账号已创建')
}

// 校验
const u = db.prepare('SELECT id,username,email,role,vip FROM users WHERE username=?').get(USERNAME)
console.log('--- 管理员凭据 ---')
console.log('登录方式 : 邮箱密码登录（密码登录 tab）')
console.log('邮箱     :', u.email)
console.log('用户名   :', u.username)
console.log('密码     :', PASSWORD)
console.log('角色     :', u.role)
console.log('VIP      :', u.vip)
console.log('--- 全部用户 ---')
const all = db.prepare('SELECT username,email,role,vip FROM users').all()
for (const r of all) console.log(' -', r.username, '|', r.email, '| role=', r.role, '| vip=', r.vip)

db.close()
