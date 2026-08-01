// 交卷判分 + 复盘生成
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '请先登录后再交卷' })
  const { setId, choiceAnswers = {}, writtenAnswers = {}, usedSeconds = 0 } = await readBody(event)
  const set = sqlite.prepare('SELECT * FROM exam_sets WHERE id=?').get(setId)
  if (!set) return json(event, 404, { error: '试卷不存在' })
  if (!requireVip(user, set)) return json(event, 403, { error: '该试卷为 VIP 专属，请先开通会员' })

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
  sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,set_name,track,score,correct,total,weak_points,level,advice,used_seconds,choice_review,written_review,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, user.id, set.id, set.name, set.track, choiceScore, correct, choiceRows.length, JSON.stringify(weakPoints), level, advice, usedSeconds, JSON.stringify(choiceReview), JSON.stringify(writtenReview), Date.now())
  const record = {
    id, userId: user.id, setId: set.id, setName: set.name, track: set.track,
    score: choiceScore, correct, total: choiceRows.length, weakPoints, level, advice, usedSeconds,
    choiceReview, writtenReview, createdAt: Date.now()
  }
  return json(event, 200, { record })
})
