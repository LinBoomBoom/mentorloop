// 提问式问答：先在本地面试题库做高置信度匹配；未命中则走大模型开放式解答。
// 关键点：匹配必须要求「题目与提问在主题上高度重合」，否则宁可交给 LLM，
// 绝不允许「问 A 答 B」的答非所问；同时默认检索方向补上 ai（之前漏搜导致 AI 类问题乱匹配）。
export default defineEventHandler(async (event) => {
  // 内容可公开浏览，但「提问」属于交互动作，需登录（与前端 useLoginGate 一致）
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const ip = getClientIp(event)
  const rl = rateLimit('interview-ask', user ? user.id : ip, 30, 60_000)
  if (!rl.ok) return json(event, 429, { error: `请求过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const { track, question } = await readBody(event)
  if (!question) return json(event, 400, { error: '请输入问题' })
  const tracks = track ? [track] : ['frontend', 'backend', 'devops', 'ai']

  // 归一化：去空格与常见标点，便于中英文混合下的字符级重合比较
  const norm = (s: string) => (s || '').toLowerCase().replace(/[\s,，。？?、；;：:！!().（）「」"'""'']/g, '')
  const qNorm = norm(question)
  const qLen = qNorm.length

  let bestConf: any = null, bestConfScore = -1
  for (const t of tracks) {
    const all = sqlite.prepare('SELECT * FROM interview_questions WHERE track=?').all(t)
    for (const item of all) {
      let kw: string[] = []
      try { kw = JSON.parse(item.keywords || '[]') } catch { /* ignore */ }
      const itemQN = norm(item.q)
      const itemNorm = norm(`${item.q} ${kw.join(' ')}`)
      // 子串优先：归一化问题本身是某题库题的面，直接判命中（天然安全，覆盖「缩略提问」）
      const subMatch = qLen >= 4 && itemQN.includes(qNorm)
      if (!subMatch) {
        // 双向字符重合：提问大部分字符出现在题中，且题也没长得离谱（避免长无关题仅靠一两个关键词误判）
        let shared = 0
        for (const ch of qNorm) if (itemNorm.includes(ch)) shared++
        const ratio = qLen ? shared / qLen : 0
        const reciprocal = itemNorm.length ? shared / itemNorm.length : 0
        const ok = qLen >= 5 && shared >= 5 && ratio >= 0.7 && reciprocal >= 0.35
        if (!ok) continue
      }
      // 命中计分：子串匹配权重最高，其余按共享字符 + 关键词奖励
      let kwScore = 0
      for (const k of kw) { const kl = norm(k); if (kl && qNorm.includes(kl)) kwScore += kl.length * 2 }
      const score = subMatch ? 1000 + qLen : sharedOf(qNorm, itemNorm) + kwScore
      if (score > bestConfScore) { bestConfScore = score; bestConf = { ...item, track: t } }
    }
  }

  if (bestConf) {
    return json(event, 200, { matched: true, answer: bestConf.a, question: bestConf.q, track: bestConf.track, source: 'bank' })
  }

  // 未命中题库 → 走大模型开放式解答（仅当用户已配置 LLM 密钥）
  if (llmEnabled()) {
    try {
      const trackHint = track ? `用户指定的技术方向为「${track}」。` : ''
      const sys = `你是资深技术面试官与导师。用户提出一个技术面试相关问题，请基于你的知识给出准确、结构化的中文解答，包含核心要点，必要时给出简短代码示例。若问题与编程 / 技术面试无关或你确实无法回答，请诚实说明，不要编造内容。`
      const userMsg = `${trackHint}问题：${question}`
      const text = await getLlm().chat(
        [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
        { temperature: 0.5, maxTokens: 1200 }
      )
      const ans = text && text.trim() ? text.trim() : ''
      if (ans) {
        return json(event, 200, { matched: false, answer: ans, source: 'ai', track: track || undefined })
      }
    } catch {
      // LLM 调用异常时落到下方兜底文案，不影响主流程
    }
  }

  // 兜底：LLM 未配置或调用失败
  return json(event, 200, {
    matched: false,
    answer: '暂时无法为你解答这个问题。你可以：1) 换个更具体的关键词提问（如「Vue 响应式原理」「TCP 三次握手」）；2) 在上方题库中按技术方向浏览高频与特殊场景题。',
    source: 'fallback'
  })
})

function sharedOf(qNorm: string, text: string): number {
  let n = 0
  for (const ch of qNorm) if (text.includes(ch)) n++
  return n
}
