// 单条答卷复盘详情
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const id = getRouterParam(event, 'id')
  const rec = sqlite.prepare('SELECT * FROM exam_records WHERE id=? AND user_id=?').get(id, user.id)
  if (!rec) return json(event, 404, { error: '记录不存在' })
  const { choiceReview, writtenReview } = loadExamReviews(rec.id, rec.choice_review, rec.written_review)
  // 字段名需与 submit 内联 record / rowToRecord 保持一致（camelCase），
  // 否则前端 record.setName / record.usedSeconds 取到 undefined（表现为空标签、用时 NaN:NaN），
  // 且 choiceReview/writtenReview 为空时整段复盘会退化成"空白"。
  const record = {
    id: rec.id,
    userId: rec.user_id,
    setId: rec.set_id,
    setName: rec.set_name,
    track: rec.track,
    score: rec.score,
    correct: rec.correct,
    total: rec.total,
    weakPoints: safeJson(rec.weak_points, []),
    level: rec.level,
    advice: rec.advice,
    usedSeconds: rec.used_seconds,
    choiceReview,
    writtenReview,
    createdAt: rec.created_at,
    nonce: rec.submit_nonce
  }
  return json(event, 200, { record })
})
