// 单条答卷复盘详情
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const id = getRouterParam(event, 'id')
  const rec = sqlite.prepare('SELECT * FROM exam_records WHERE id=? AND user_id=?').get(id, user.id)
  if (!rec) return json(event, 404, { error: '记录不存在' })
  const { choiceReview, writtenReview } = loadExamReviews(rec.id, rec.choice_review, rec.written_review)
  const record = {
    ...rec,
    weakPoints: JSON.parse(rec.weak_points),
    choiceReview,
    writtenReview
  }
  return json(event, 200, { record })
})
