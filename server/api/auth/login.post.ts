// 登录（兼容旧版用户名密码 + 多通道）
export default defineEventHandler(async (event) => {
  const b = await readBody(event)
  if (!b.mode) {
    const { username, password } = b
    const user = sqlite.prepare('SELECT * FROM users WHERE username=?').get(username)
    if (!user || !verifyPwd(password, user.password)) return json(event, 401, { error: '用户名或密码错误' })
    return json(event, 200, { token: newToken(user), user: publicUser(user) })
  }
  if (b.mode === 'password') {
    const { identifier, identifierType, password } = b
    const user = findByIdentifier(identifierType, identifier)
    if (!user || !user.password || !verifyPwd(password, user.password)) return json(event, 401, { error: '账号或密码错误' })
    return json(event, 200, { token: newToken(user), user: publicUser(user) })
  }
  if (b.mode === 'code') {
    const { identifier, identifierType, code } = b
    if (!verifyCode(identifierType, identifier, code)) return json(event, 401, { error: '验证码错误或已过期' })
    const user = findByIdentifier(identifierType, identifier)
    if (!user) return json(event, 401, { error: '该账号尚未注册' })
    return json(event, 200, { token: newToken(user), user: publicUser(user) })
  }
  if (b.mode === 'oauth') {
    const { provider, openid } = b
    const user = sqlite.prepare('SELECT * FROM users WHERE json_extract(providers,?)=?').get('$.' + provider, openid)
    if (!user) return json(event, 401, { error: '该第三方账号未绑定' })
    return json(event, 200, { token: newToken(user), user: publicUser(user) })
  }
  return json(event, 400, { error: '不支持的登录方式' })
})
