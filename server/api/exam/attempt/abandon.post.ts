// 离开答卷页时作废当前 active attempt，使倒计时「注销」，避免中途离开后再次进入被静默自动交卷。
// 即使该请求在关页面瞬间发送失败，调用方还有「再次进入时若计时已耗尽则进入 expired 态而非自动交卷」的兜底。
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  // 未登录用户本就没有 attempt，无需作废
  if (!user) return json(event, 200, { ok: true })
  const rl = rateLimit('exam-abandon', user.id, 20, 60_000)
  if (!rl.ok) return json(event, 429, { error: `请求过于频繁，请 ${rl.retryAfter} 秒后重试` })
  let body: any = {}
  try { body = await readBody(event) } catch (e) { body = {} }
  const attemptId = typeof body?.attemptId === 'string' ? body.attemptId : ''
  if (!attemptId) return json(event, 200, { ok: true })
  // 仅当该 attempt 仍处 active 才置为 abandoned；已交卷(submitted)/已作废(abandoned)均为 no-op，安全幂等
  sqlite.prepare(
    "UPDATE exam_attempts SET status='abandoned' WHERE id=? AND user_id=? AND status='active'"
  ).run(attemptId, user.id)
  return json(event, 200, { ok: true })
})
