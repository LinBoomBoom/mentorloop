// 注册（兼容旧版用户名密码 + 多通道）
export default defineEventHandler(async (event) => {
  const b = await readBody(event)
  if (!b.mode) {
    const { username, password, nickname } = b
    if (!username || !password || password.length < 6) return json(event, 400, { error: '用户名必填，密码至少6位' })
    if (sqlite.prepare('SELECT id FROM users WHERE username=?').get(username)) return json(event, 400, { error: '用户名已存在' })
    const id = uid()
    sqlite.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, username, nickname || username, hashPwd(password), null, null, '{}', JSON.stringify({ level: 0, expireAt: null }), Date.now())
    const user = sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
    return json(event, 200, { token: newToken(user), user: publicUser(user) })
  }
  if (b.mode === 'password') {
    const { identifier, identifierType, password, nickname } = b
    if (!identifier || !password || password.length < 6) return json(event, 400, { error: '账号与密码必填，密码至少6位' })
    if (!['email', 'phone'].includes(identifierType)) return json(event, 400, { error: '账号类型错误' })
    if (findByIdentifier(identifierType, identifier)) return json(event, 400, { error: '该账号已注册，请直接登录' })
    const isEmail = identifierType === 'email'
    const id = uid()
    sqlite.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, identifier, nickname || identifier, hashPwd(password), isEmail ? identifier : null, isEmail ? null : identifier, '{}', JSON.stringify({ level: 0, expireAt: null }), Date.now())
    const user = sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
    return json(event, 200, { token: newToken(user), user: publicUser(user) })
  }
  if (b.mode === 'code') {
    const { identifier, identifierType, code, nickname } = b
    if (!identifier || !code) return json(event, 400, { error: '请输入账号与验证码' })
    if (!verifyCode(identifierType, identifier, code)) return json(event, 400, { error: '验证码错误或已过期' })
    let u = findByIdentifier(identifierType, identifier)
    if (!u) {
      const isEmail = identifierType === 'email'
      const id = uid()
      sqlite.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id, identifier, nickname || identifier, null, isEmail ? identifier : null, isEmail ? null : identifier, '{}', JSON.stringify({ level: 0, expireAt: null }), Date.now())
      u = sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
    }
    return json(event, 200, { token: newToken(u), user: publicUser(u) })
  }
  return json(event, 400, { error: '不支持的注册方式' })
})
