// H2 · 生成/获取个性化学习路径（VIP 专属，复用交卷薄弱点，支持按方向切换）
export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const { force, track } = await readBody(event)
  try {
    const res = await getOrCreateStudyPlan(user.id, { force, track })
    return json(event, 200, res)
  } catch (e: any) {
    if (e && e.name === 'NoRecordsError') return json(event, 409, { error: '请先完成至少一次模拟考试，我们才能为你定制学习路径' })
    const msg = e?.message || '生成失败'
    const code = /未配置/.test(msg) ? 503 : 500
    return json(event, code, { error: msg })
  }
})
