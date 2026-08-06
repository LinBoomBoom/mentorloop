// H2 · 生成/获取个性化学习路径（VIP 专属，复用交卷薄弱点，支持按方向切换）
export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const rl = rateLimit('vip-path', user.id, 10, 60_000)
  if (!rl.ok) return json(event, 429, { error: `请求过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const { force, track } = await readBody(event)
  try {
    const res = await getOrCreateStudyPlan(user.id, { force, track })
    // 首次真正生成时，后台预热其余方向，使切换其它 tab 也能秒开
    if (res.cached === false) prewarmTracks(user.id, res.track)
    return json(event, 200, res)
  } catch (e: any) {
    if (e && e.name === 'NoRecordsError') return json(event, 409, { error: '请先完成至少一次模拟考试，我们才能为你定制学习路径' })
    const msg = e?.message || '生成失败'
    const code = /未配置/.test(msg) ? 503 : 500
    return json(event, code, { error: msg })
  }
})
