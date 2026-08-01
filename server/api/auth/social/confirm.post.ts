// 第三方登录：确认（⚠️ 仅演示用，真实场景由第三方服务器回调触发）
export default defineEventHandler(async (event) => {
  const { provider, qrToken, nickname } = await readBody(event)
  const pa = pendingAuth.get(qrToken)
  if (!pa) return json(event, 404, { error: '登录态已失效' })
  if (pa.status === 'confirmed') return json(event, 200, { ok: true })
  const openid = 'demo_' + provider
  let u = sqlite.prepare('SELECT * FROM users WHERE json_extract(providers,?)=?').get('$.' + provider, openid)
  if (!u) {
    const id = uid()
    sqlite.prepare('INSERT INTO users (id,username,nickname,password,email,phone,providers,vip,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, 'oauth_' + provider + '_demo', nickname || (provider + '用户'), null, null, null, JSON.stringify({ [provider]: openid }), JSON.stringify({ level: 0, expireAt: null }), Date.now())
    u = sqlite.prepare('SELECT * FROM users WHERE id=?').get(id)
  }
  const token = newToken(u)
  pa.status = 'confirmed'; pa.token = token; pa.user = u
  return json(event, 200, { ok: true })
})
