// 提问式问答（题库关键词匹配，预留 AI 大模型挂载点）
export default defineEventHandler(async (event) => {
  // 内容可公开浏览，但「提问」属于交互动作，需登录（与前端 useLoginGate 一致）
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const { track, question } = await readBody(event)
  if (!question) return json(event, 400, { error: '请输入问题' })
  const tracks = track ? [track] : ['frontend', 'backend', 'devops']
  const q = question.toLowerCase()
  const words = q.split(/[\s,，。？?、]+/).filter(w => w.length >= 2)
  let best: any = null, bestScore = 0
  for (const t of tracks) {
    const all = sqlite.prepare('SELECT * FROM interview_questions WHERE track=?').all(t)
    for (const item of all) {
      let score = 0
      const kw: string[] = JSON.parse(item.keywords || '[]')
      const text = (item.q + ' ' + kw.join(' ')).toLowerCase()
      for (const w of words) if (text.includes(w)) score += w.length
      kw.forEach((k: string) => { if (q.includes(k.toLowerCase())) score += k.length * 2 })
      if (score > bestScore) { bestScore = score; best = { ...item, track: t } }
    }
  }
  if (best && bestScore >= 2) {
    return json(event, 200, { matched: true, answer: best.a, question: best.q, track: best.track, source: 'bank' })
  }
  // TODO(AI预留): 此处可接入大模型 API 实现开放式问答
  return json(event, 200, {
    matched: false,
    answer: '题库中暂未收录该问题的精准解答。建议：1) 换个关键词提问（如「Vue 响应式原理」「TCP 三次握手」）；2) 到对应模块的高频题列表中浏览相关主题。\n\n（提示：开放式 AI 问答能力已预留接口，后续版本将接入大模型实现任意问题解答。）',
    source: 'fallback'
  })
})
