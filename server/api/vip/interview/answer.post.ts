// H1 · 提交一道回答：评分 + 下一题（或结束）
export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const { sessionId, answer } = await readBody(event)
  try {
    const res = await answerInterview(user.id, { sessionId, answer })
    return json(event, 200, res)
  } catch (e: any) {
    if (e && e.statusCode) throw e // 业务错误（400/404/409）原样抛出
    const msg = e?.message || '提交失败'
    const code = /未配置/.test(msg) ? 503 : (/格式异常/.test(msg) ? 502 : 500)
    return json(event, code, { error: msg })
  }
})
