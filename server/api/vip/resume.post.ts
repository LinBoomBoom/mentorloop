// H3 简历诊断：VIP 专属，接收简历文本返回 AI 结构化诊断
export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const rl = rateLimit('vip-resume', user.id, 10, 60_000)
  if (!rl.ok) return json(event, 429, { error: `请求过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const body = await readBody(event)
  try {
    const result = await diagnoseResume(user.id, body?.resume)
    return json(event, 200, { result, cached: result.cached })
  } catch (e: any) {
    if (e?.name === 'ResumeTooShortError') return json(event, 400, { error: '简历内容过短，请至少填写 50 字' })
    if (e?.name === 'LlmUnavailableError') return json(event, 503, { error: 'AI 服务暂不可用（未配置 DEEPSEEK_API_KEY）' })
    return json(event, 500, { error: e?.message || '简历诊断失败' })
  }
})
