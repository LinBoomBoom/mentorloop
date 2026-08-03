// 注册（邮箱/手机号 + 密码/验证码）。移除伪造第三方 OAuth。
export default defineEventHandler(async (event) => {
  try {
    const b = await readBody(event)
  const ip = getClientIp(event)

  // A5 限流：注册每 IP 1 小时内最多 5 次
  const rl = rateLimit('register', ip, 5, 3_600_000)
  if (!rl.ok) return json(event, 429, { error: '操作过于频繁，请 ' + rl.retryAfter + ' 秒后重试' })

  const insertUser = (identifier: string, identifierType: string, password: string | null, nickname: string) => {
    const isEmail = identifierType === 'email'
    const id = uid()
    sqlite.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, identifier, nickname || identifier, password, isEmail ? identifier : null, isEmail ? null : identifier, '{}', JSON.stringify({ level: 0, expireAt: null }), Date.now())
    return sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
  }

  if (!b.mode) {
    const username = assertInput(b.username, { name: '用户名', required: true, min: 2, max: 64 })
    const password = assertPassword(b.password)
    if (sqlite.prepare('SELECT id FROM users WHERE username=?').get(username)) return json(event, 400, { error: '用户名已存在' })
    const user = insertUser(username, 'username', hashPwd(password), b.nickname)
    const token = newToken(user)
    setAuthCookie(event, token)
    return json(event, 200, { user: publicUser(user) })
  }

  if (b.mode === 'password') {
    const identifier = assertInput(b.identifier, { name: '账号', required: true, min: 3, max: 128 })
    const identifierType = assertInput(b.identifierType, { name: '账号类型', required: true, pattern: /^(email|phone)$/ })
    const password = assertPassword(b.password)
    if (!['email', 'phone'].includes(identifierType)) return json(event, 400, { error: '账号类型错误' })
    if (findByIdentifier(identifierType, identifier)) return json(event, 400, { error: '该账号已注册，请直接登录' })
    const user = insertUser(identifier, identifierType, hashPwd(password), b.nickname)
    const token = newToken(user)
    setAuthCookie(event, token)
    return json(event, 200, { user: publicUser(user) })
  }

  if (b.mode === 'code') {
    const identifier = assertInput(b.identifier, { name: '账号', required: true, min: 3, max: 128 })
    const identifierType = assertInput(b.identifierType, { name: '账号类型', required: true, pattern: /^(email|phone)$/ })
    const code = assertInput(b.code, { name: '验证码', required: true, min: 4, max: 12 })
    if (!verifyCode(identifierType, identifier, code)) return json(event, 400, { error: '验证码错误或已过期' })
    let u = findByIdentifier(identifierType, identifier)
    if (!u) u = insertUser(identifier, identifierType, null, b.nickname)
    const token = newToken(u)
    setAuthCookie(event, token)
    return json(event, 200, { user: publicUser(u) })
  }

  return json(event, 400, { error: '不支持的注册方式' })
  } catch (e: any) {
    if (e instanceof InputError) return json(event, 400, { error: e.message })
    throw e
  }
})
