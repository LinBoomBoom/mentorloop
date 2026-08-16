// 账号注销（A12 · 个保法删除权）：需登录 + 密码复核，级联清理该用户全部数据后删除账号。
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '请先登录后再注销账号' })
  const rl = rateLimit('account-delete', user.id, 5, 60_000)
  if (!rl.ok) return json(event, 429, { error: `操作过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const { password } = await readBody(event)

  // 复核：设置了密码则必须匹配；仅凭验证码注册（无密码）的账号以有效会话为准
  if (user.password) {
    if (!verifyPwd(password || '', user.password)) {
      await sleep(150)
      return json(event, 401, { error: '密码验证失败，无法注销' })
    }
  }

  const userId = user.id
  deleteAccount(userId)

  clearAuthCookie(event)
  logInfo('account.deleted', { userId })
  return json(event, 200, { ok: true })
})
