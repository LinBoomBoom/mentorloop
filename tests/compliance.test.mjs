import { describe, it, expect, afterAll } from 'vitest'
import { sqlite, deleteAccount, logAudit, uid } from '../server/utils/db'
import { assertPassword, InputError } from '../server/utils/security'
import { adminDispatch } from '../server/utils/adminDispatch'

const ids = []
const cleanup = () => {
  for (const id of ids) {
    sqlite.prepare('DELETE FROM exam_records WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM progress WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM orders WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM subscriptions WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM users WHERE id=?').run(id)
  }
  sqlite.prepare("DELETE FROM modules WHERE id LIKE 'tmod_%'").run()
  sqlite.prepare("DELETE FROM exam_sets WHERE id LIKE 'tex_%'").run()
  sqlite.prepare("DELETE FROM audit_logs WHERE admin_id=?").run('a_test')
}
afterAll(cleanup)

function makeUser(prefix = 'u_c_') {
  const id = prefix + Math.random().toString(36).slice(2, 8)
  sqlite.prepare('INSERT INTO users (id,username,nickname,password,vip,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, id, 'S', 'x', JSON.stringify({ level: 0, expireAt: null }), Date.now())
  ids.push(id)
  return id
}

describe('A14 密码强度策略', () => {
  it('合法密码（字母+数字，≥8）通过', () => {
    expect(assertPassword('Abcd1234')).toBe('Abcd1234')
    expect(assertPassword('hello123')).toBe('hello123')
  })
  it('过短 / 单一字符类 / 空 抛 InputError', () => {
    expect(() => assertPassword('')).toThrow(InputError)
    expect(() => assertPassword('abc')).toThrow(InputError)
    expect(() => assertPassword('abcdefgh')).toThrow(InputError) // 仅小写
    expect(() => assertPassword('12345678')).toThrow(InputError) // 仅数字
    expect(() => assertPassword('Abcdefgh')).toThrow(InputError) // 仅字母
  })
})

describe('A12 账号注销（级联清理）', () => {
  it('deleteAccount 删除用户及其全部关联数据', () => {
    const id = makeUser('u_del_')
    sqlite.prepare('INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)').run('tok_' + id, id, Date.now(), Date.now() + 1000)
    sqlite.prepare('INSERT INTO progress (user_id,chapter_id,section_id,done_at) VALUES (?,?,?,?)').run(id, 'c1', 's1', Date.now())
    sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,score,correct,total,created_at) VALUES (?,?,?,?,?,?,?)').run('r_' + id, id, 'set_x', 80, 8, 10, Date.now())
    deleteAccount(id)
    expect(sqlite.prepare('SELECT 1 FROM users WHERE id=?').get(id)).toBeUndefined()
    expect(sqlite.prepare('SELECT 1 FROM sessions WHERE user_id=?').get(id)).toBeUndefined()
    expect(sqlite.prepare('SELECT 1 FROM progress WHERE user_id=?').get(id)).toBeUndefined()
    expect(sqlite.prepare('SELECT 1 FROM exam_records WHERE user_id=?').get(id)).toBeUndefined()
  })
})

describe('B10 交卷幂等（数据库层唯一约束）', () => {
  it('相同 submit_nonce 不可重复插入；按 nonce 可查回', () => {
    const id = makeUser('u_idem_')
    sqlite.prepare("INSERT INTO exam_sets (id,name,track,level,duration,vip_only) VALUES ('tex_idem','t','fe','mid',30,0)").run()
    const nonce = 'N_' + uid()
    const ins = 'INSERT INTO exam_records (id,user_id,set_id,score,correct,total,created_at,submit_nonce) VALUES (?,?,?,?,?,?,?,?)'
    sqlite.prepare(ins).run('r1_' + id, id, 'tex_idem', 90, 9, 10, Date.now(), nonce)
    const found = sqlite.prepare('SELECT id FROM exam_records WHERE user_id=? AND set_id=? AND submit_nonce=?').get(id, 'tex_idem', nonce)
    expect(found).toBeDefined()
    // 重复 nonce 应触发唯一索引约束
    expect(() => sqlite.prepare(ins).run('r2_' + id, id, 'tex_idem', 90, 9, 10, Date.now(), nonce)).toThrow()
  })
})

describe('G7 操作审计日志', () => {
  it('logAudit 写入审计行', () => {
    logAudit('a_test', 'POST', '/modules')
    const row = sqlite.prepare("SELECT * FROM audit_logs WHERE admin_id='a_test' AND action='POST'").get()
    expect(row).toBeDefined()
    expect(row.target).toBe('/modules')
  })
  it('adminDispatch 变更操作记录审计', () => {
    adminDispatch({ id: 'a_test', role: 'admin' }, 'POST', ['modules'], {}, { id: 'tmod_aud', name: '审计测试', icon: '🧪', color: '#000', desc: 'd' })
    const row = sqlite.prepare("SELECT * FROM audit_logs WHERE admin_id='a_test' AND target='/modules'").get()
    expect(row).toBeDefined()
    expect(row.action).toBe('POST')
  })
})
