// 交卷判分 + 复盘生成（含 B10 幂等：相同 submit_nonce 重复提交返回首次记录，防止刷成绩）
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '请先登录后再交卷' })
  const rl = rateLimit('exam-submit', user.id, 10, 60_000)
  if (!rl.ok) return json(event, 429, { error: `交卷请求过于频繁，请 ${rl.retryAfter} 秒后重试` })
  const { setId, choiceAnswers = {}, writtenAnswers = {}, usedSeconds = 0, nonce, attemptId } = await readBody(event)
  const set = sqlite.prepare('SELECT * FROM exam_sets WHERE id=?').get(setId)
  if (!set) return json(event, 404, { error: '试卷不存在' })
  if (!requireVip(user, set)) return json(event, 403, { error: '该试卷为 VIP 专属，请先开通会员' })

  // P1-6：服务端控制考试用时。优先按 attempt 的起始时间计算；无有效 attempt 时回退并钳制客户端值
  const now = Date.now()
  const totalSec = (set.duration || 0) * 60
  let finalUsedSeconds = Math.min(totalSec, Math.max(0, Number(usedSeconds) || 0))
  let usedAttemptId: string | null = null
  if (typeof attemptId === 'string' && attemptId) {
    const attempt = sqlite.prepare(
      "SELECT id, started_at FROM exam_attempts WHERE id=? AND user_id=? AND set_id=? AND status='active' AND started_at>?"
    ).get(attemptId, user.id, set.id, now - 24 * 3600 * 1000) as any
    if (attempt) {
      const elapsed = Math.max(0, Math.floor((now - attempt.started_at) / 1000))
      finalUsedSeconds = totalSec > 0 ? Math.min(totalSec, elapsed) : elapsed
      usedAttemptId = attempt.id
    }
  }

  // B10 幂等：若携带 nonce，先查是否已存在该用户的同卷同 nonce 记录
  const effNonce = typeof nonce === 'string' && nonce ? nonce.slice(0, 64) : uid('n_')
  const existing = sqlite.prepare('SELECT * FROM exam_records WHERE user_id=? AND set_id=? AND submit_nonce=?').get(user.id, setId, effNonce) as any
  if (existing) {
    return json(event, 200, { record: rowToRecord(existing), idempotent: true })
  }

  const choiceRows = sqlite.prepare('SELECT * FROM exam_choices WHERE set_id=?').all(setId)
  let correct = 0
  const choiceReview = choiceRows.map((c: any) => {
    const userAns = [].concat(choiceAnswers[c.id] || []).sort().join(',')
    const rightAns = [].concat(JSON.parse(c.answer)).sort().join(',')
    const isRight = userAns === rightAns && userAns !== ''
    if (isRight) correct++
    return { id: c.id, q: c.q, options: JSON.parse(c.options), userAnswer: choiceAnswers[c.id] || [], answer: JSON.parse(c.answer), right: isRight, explain: c.explain, tag: c.tag }
  })
  const choiceScore = choiceRows.length ? Math.round(correct / choiceRows.length * 100) : 0

  const writtenRows = sqlite.prepare('SELECT * FROM exam_written WHERE set_id=?').all(setId)
  const writtenReview = writtenRows.map((w: any) => ({
    id: w.id, q: w.q, userAnswer: writtenAnswers[w.id] || '（未作答）', reference: w.reference, points: JSON.parse(w.points || '[]')
  }))

  const wrongTags: any = {}
  choiceReview.filter((c: any) => !c.right).forEach((c: any) => { wrongTags[c.tag] = (wrongTags[c.tag] || 0) + 1 })
  const weakPoints = Object.entries(wrongTags).sort((a: any, b: any) => b[1] - a[1]).map(([tag, n]) => ({ tag, count: n }))

  let level: string, advice: string
  if (choiceScore >= 90) { level = '优秀'; advice = '基础非常扎实！建议挑战更高难度试卷，并重点打磨笔试题的表达深度与项目实战案例。' }
  else if (choiceScore >= 70) { level = '良好'; advice = '整体掌握不错，但仍有薄弱知识点。建议针对下方薄弱标签回到学习中心对应章节复习，一周后重做本卷验证。' }
  else if (choiceScore >= 50) { level = '及格'; advice = '基础存在明显漏洞。建议暂缓刷题，优先回到学习中心系统学习薄弱模块，掌握原理后再回来实战。' }
  else { level = '待加强'; advice = '当前阶段不建议直接面试。请从学习中心第一章开始系统学习，配合高频面试题理解概念，循序渐进。' }

  const id = uid('r_')
  // B7 拆表：主表双写老列（回滚安全网）+ 子表结构化写入，同一事务保证一致
  const insRec = sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,set_name,track,score,correct,total,weak_points,level,advice,used_seconds,choice_review,written_review,created_at,submit_nonce) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  const insC = sqlite.prepare('INSERT INTO exam_choice_reviews (id,record_id,choice_id,q,options,user_answer,answer,right,explain,tag) VALUES (?,?,?,?,?,?,?,?,?,?)')
  const insW = sqlite.prepare('INSERT INTO exam_written_reviews (id,record_id,written_id,q,user_answer,reference,points) VALUES (?,?,?,?,?,?,?)')
  const updAttempt = usedAttemptId ? sqlite.prepare("UPDATE exam_attempts SET status='submitted' WHERE id=?") : null
  const tx = sqlite.transaction(() => {
    insRec.run(id, user.id, set.id, set.name, set.track, choiceScore, correct, choiceRows.length, JSON.stringify(weakPoints), level, advice, finalUsedSeconds, JSON.stringify(choiceReview), JSON.stringify(writtenReview), now, effNonce)
    for (const c of choiceReview) insC.run(uid('cr_'), id, c.id, c.q, JSON.stringify(c.options), JSON.stringify(c.userAnswer), JSON.stringify(c.answer), c.right ? 1 : 0, c.explain, c.tag)
    for (const w of writtenReview) insW.run(uid('wr_'), id, w.id, w.q, w.userAnswer, w.reference, JSON.stringify(w.points))
    if (updAttempt) updAttempt.run(usedAttemptId)
  })
  try {
    tx()
  } catch (e: any) {
    return json(event, 500, { error: '交卷写入失败，请稍后重试' })
  }
  const record = {
    id, userId: user.id, setId: set.id, setName: set.name, track: set.track,
    score: choiceScore, correct, total: choiceRows.length, weakPoints, level, advice, usedSeconds: finalUsedSeconds,
    choiceReview, writtenReview, createdAt: now, nonce: effNonce
  }
  return json(event, 200, { record, idempotent: false })
})

function rowToRecord(r: any) {
  const { choiceReview, writtenReview } = loadExamReviews(r.id, r.choice_review, r.written_review)
  return {
    id: r.id, userId: r.user_id, setId: r.set_id, setName: r.set_name, track: r.track,
    score: r.score, correct: r.correct, total: r.total,
    weakPoints: safeJson(r.weak_points, []), level: r.level, advice: r.advice, usedSeconds: r.used_seconds,
    choiceReview, writtenReview, createdAt: r.created_at,
    nonce: r.submit_nonce
  }
}
