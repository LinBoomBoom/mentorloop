// 登录（邮箱/手机号 + 密码/验证码）。移除伪造第三方 OAuth。
export default defineEventHandler(async (event) => {
  try {
    const b = await readBody(event)
    const ip = getClientIp(event)
    const denyBanned = (user: any) => !!user && user.banned

    // A5 限流：登录接口每 IP 60s 内最多 10 次
    const rl = rateLimit('login', ip, 10, 60_000)
    if (!rl.ok) return json(event, 429, { error: '操作过于频繁，请 ' + rl.retryAfter + ' 秒后重试' })

    // A6 失败锁定：该 IP+账号组合已被锁
    const idKey = (b.identifierType === 'email' ? 'e:' : 'p:') + (b.identifier || '')
    const lockLeft = getLoginLock(ip, idKey)
    if (lockLeft > 0) return json(event, 429, { error: '登录失败次数过多，请 ' + lockLeft + ' 秒后重试' })

    const fail = (msg: string) => {
      recordLoginFailure(ip, idKey)
      return json(event, 401, { error: msg })
    }

    if (!b.mode) {
      const username = assertInput(b.username, { name: '用户名', required: true, min: 2, max: 64 })
      const user = sqlite.prepare('SELECT * FROM users WHERE username=?').get(username)
      // A9 枚举防护：用户存在与否都走相同校验路径
      const ok = !!user && verifyPwd(b.password || '', user.password)
      if (!ok) { await sleep(150); return fail('用户名或密码错误') }
      if (denyBanned(user)) return json(event, 403, { error: '账号已被封禁' })
      resetLoginFailure(ip, idKey)
      const token = newToken(user)
      setAuthCookie(event, token)
      return json(event, 200, { user: publicUser(user) })
    }

    if (b.mode === 'password') {
      const identifier = assertInput(b.identifier, { name: '账号', required: true, min: 3, max: 128 })
      const identifierType = assertInput(b.identifierType, { name: '账号类型', required: true, pattern: /^(email|phone)$/ })
      const password = assertInput(b.password, { name: '密码', required: true, min: 1, max: 128 })
      const user = findByIdentifier(identifierType, identifier)
      const ok = !!user && !!user.password && verifyPwd(password, user.password)
      if (!ok) { await sleep(150); return fail('账号或密码错误') }
      if (denyBanned(user)) return json(event, 403, { error: '账号已被封禁' })
      resetLoginFailure(ip, idKey)
      const token = newToken(user)
      setAuthCookie(event, token)
      return json(event, 200, { user: publicUser(user) })
    }

    if (b.mode === 'code') {
      const identifier = assertInput(b.identifier, { name: '账号', required: true, min: 3, max: 128 })
      const identifierType = assertInput(b.identifierType, { name: '账号类型', required: true, pattern: /^(email|phone)$/ })
      const code = assertInput(b.code, { name: '验证码', required: true, min: 4, max: 12 })
      if (!verifyCode(identifierType, identifier, code)) return json(event, 401, { error: '验证码错误或已过期' })
      const user = findByIdentifier(identifierType, identifier)
      if (!user) return json(event, 401, { error: '该账号尚未注册' })
      if (denyBanned(user)) return json(event, 403, { error: '账号已被封禁' })
      resetLoginFailure(ip, idKey)
      const token = newToken(user)
      setAuthCookie(event, token)
      return json(event, 200, { user: publicUser(user) })
    }

    return json(event, 400, { error: '不支持的登录方式' })
  } catch (e: any) {
    if (e instanceof InputError) return json(event, 400, { error: e.message })
    throw e
  }
})
