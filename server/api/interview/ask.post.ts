import crypto from 'node:crypto'
import { assertInput, InputError } from '../../utils/security'

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
  const { track, question: rawQuestion } = await readBody(event)
  // A8：提问内容长度/类型校验（min:2 max:500），命中 InputError 返回 400
  let question: string
  try {
    question = assertInput(rawQuestion, { name: '问题', required: true, min: 2, max: 500 })
  } catch (e) {
    if (e instanceof InputError) return json(event, 400, { error: e.message })
    throw e
  }
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
      // 跨用户 AI 答案缓存：题库未命中的提问按「方向 + 归一化问题」哈希复用答案（TTL 7 天），
      // 热门问题（如「Vue 响应式原理」）被多人提问时只烧一次 LLM，直接降本。
      const AI_ANSWER_TTL = 7 * 86400000
      const qHash = crypto.createHash('sha256').update(`${track || 'all'}|${qNorm}`).digest('hex')
      const cached = sqlite.prepare('SELECT answer, enhanced FROM ai_answer_cache WHERE q_hash=? AND created_at>?').get(qHash, Date.now() - AI_ANSWER_TTL) as any
      if (cached && cached.answer) {
        let enh = { title: '', tags: [] as string[] }
        try { const p = JSON.parse(cached.enhanced || '{}'); if (p && typeof p === 'object') { enh = { title: String(p.title || ''), tags: Array.isArray(p.tags) ? p.tags.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 6) : [] } } } catch { /* 容错 */ }
        const ans = cached.answer
        // 仍收录到该用户「待补充池」（不影响主响应），但不再消耗 LLM
        collectUserQuestion({ userId: user.id, track: track || undefined, raw: question.trim(), enhancedTitle: enh.title, enhancedTags: enh.tags, aiAnswer: ans })
        return json(event, 200, { matched: false, answer: ans, source: 'ai-cache', track: track || undefined, collected: true })
      }

      const trackHint = track ? `用户指定的技术方向为「${track}」。` : ''
      const sys = `你是资深技术面试官与导师。用户提出一个技术面试相关问题，请基于你的知识给出准确、结构化的中文解答，包含核心要点，必要时给出简短代码示例。若问题与编程 / 技术面试无关或你确实无法回答，请诚实说明，不要编造内容。`
      const userMsg = `${trackHint}问题：${question}`
      // 并行：① 生成解答 ② 对问题做语义化增强（改写成精准、可检索的面试题标题 + 技术标签），
      // 用于把「题库未命中」的用户提问收录进「待补充题库」，经 AI 增强后便于后续审核回流。
      const titleSys = `你是技术内容编辑。用户提了一个技术 / 面试问题，请将其改写为一句精准、可检索、语义完整的「面试题标题」，便于日后收录进面试题库。只输出一个 JSON 对象：{"title":"<中文标题，10-30 字>","tags":["<技术关键词>","..."]}，不要任何解释或代码块标记。标题内如需举例请用单引号。`
      const titleMsg = `方向：${track || '未指定'}。原始问题：${question}`
      const [ansText, enhanceRaw] = await Promise.all([
        getLlm().chat(
          [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
          { temperature: 0.5, maxTokens: 1200 }
        ),
        getLlm().chat(
          [{ role: 'system', content: titleSys }, { role: 'user', content: titleMsg }],
          { temperature: 0.3, maxTokens: 160 }
        )
      ])
      const ans = ansText && ansText.trim() ? ansText.trim() : ''
      // 解析增强标题（容错：解析失败则用原始问题作标题）
      let enhancedTitle = ''
      let enhancedTags: string[] = []
      try {
        const p = parseJsonBlock(enhanceRaw || '')
        if (p && typeof p === 'object') {
          enhancedTitle = (p.title || '').toString().trim().slice(0, 80)
          if (Array.isArray(p.tags)) enhancedTags = p.tags.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 6)
        }
      } catch { /* 容错：下方兜底 */ }
      if (!enhancedTitle) enhancedTitle = question.trim().slice(0, 80)
      if (ans) {
        // 写入跨用户答案缓存（失败仅告警，不阻断主流程）
        try {
          sqlite.prepare('INSERT OR REPLACE INTO ai_answer_cache (q_hash, track, answer, enhanced, model, created_at) VALUES (?,?,?,?,?,?)')
            .run(qHash, track || null, ans, JSON.stringify({ title: enhancedTitle, tags: enhancedTags }), process.env.LLM_MODEL || 'deepseek-chat', Date.now())
        } catch { /* 缓存写入失败不影响主流程 */ }
        const collected = collectUserQuestion({
          userId: user.id,
          track: track || undefined,
          raw: question.trim(),
          enhancedTitle,
          enhancedTags,
          aiAnswer: ans
        })
        return json(event, 200, { matched: false, answer: ans, source: 'ai', track: track || undefined, collected })
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

// 把「题库未命中」的用户提问收录进 user_questions（待补充池）。
// 同用户 + 同一原始问题去重：已存在则更新增强结果与答案，避免反复提问产生重复行。
// 收录失败不影响主响应（用户仍能拿到答案），仅静默返回 false。
function collectUserQuestion(o: {
  userId: string; track?: string; raw: string;
  enhancedTitle: string; enhancedTags: string[]; aiAnswer: string
}): boolean {
  try {
    const now = Date.now()
    const existing = sqlite.prepare('SELECT id FROM user_questions WHERE user_id=? AND raw_question=?').get(o.userId, o.raw) as any
    if (existing) {
      sqlite.prepare(
        'UPDATE user_questions SET track=?, enhanced_title=?, enhanced_tags=?, ai_answer=?, status=?, updated_at=? WHERE id=?'
      ).run(o.track || null, o.enhancedTitle, JSON.stringify(o.enhancedTags), o.aiAnswer, 'pending', now, existing.id)
    } else {
      sqlite.prepare(
        'INSERT INTO user_questions (id,user_id,track,raw_question,enhanced_title,enhanced_tags,ai_answer,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).run(uid('uq_'), o.userId, o.track || null, o.raw, o.enhancedTitle, JSON.stringify(o.enhancedTags), o.aiAnswer, 'pending', now, now)
    }
    return true
  } catch {
    return false
  }
}

function sharedOf(qNorm: string, text: string): number {
  let n = 0
  for (const ch of qNorm) if (text.includes(ch)) n++
  return n
}
