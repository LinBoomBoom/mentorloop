import { describe, it, expect, afterAll } from 'vitest'
import { sqlite, uid } from '../server/utils/db'
import { updateUser } from '../server/utils/admin'

afterAll(async () => {
  await sqlite.prepare("DELETE FROM users WHERE id LIKE 'u_sec_%'").run()
  await sqlite.prepare("DELETE FROM sessions WHERE user_id LIKE 'u_sec_%'").run()
})

async function makeUser() {
  const id = 'u_sec_' + uid()
  await sqlite.prepare('INSERT INTO users (id,username,nickname,password,vip,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, 'sec_' + id, 'S', 'oldPass123', JSON.stringify({ level: 0, expireAt: null }), Date.now())
  return id
}
async function addSession(userId) {
  await sqlite.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)')
    .run('tok_' + uid(), userId, Date.now(), Date.now() + 7 * 86400000)
}
async function sessionCount(userId) {
  return (await sqlite.prepare('SELECT COUNT(*) c FROM sessions WHERE user_id=?').get(userId)).c
}

describe('P1#4 改密 / 封禁踢下线', () => {
  it('改密后即时撤销该用户全部会话', async () => {
    const id = await makeUser()
    await addSession(id)
    expect(await sessionCount(id)).toBe(1)
    await updateUser(id, { password: 'NewStrongPass1' })
    expect(await sessionCount(id)).toBe(0)
  })

  it('封禁后即时撤销该用户全部会话', async () => {
    const id = await makeUser()
    await addSession(id)
    expect(await sessionCount(id)).toBe(1)
    await updateUser(id, { banned: true })
    expect(await sessionCount(id)).toBe(0)
  })

  it('仅改昵称不触发会话撤销', async () => {
    const id = await makeUser()
    await addSession(id)
    await updateUser(id, { nickname: 'newName' })
    expect(await sessionCount(id)).toBe(1)
  })
})
