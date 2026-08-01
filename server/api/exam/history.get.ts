// 答卷历史
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const rows = sqlite.prepare('SELECT id,set_id,set_name,track,score,level,correct,total,created_at FROM exam_records WHERE user_id=? ORDER BY created_at DESC').all(user.id)
    .map((r: any) => ({
      id: r.id, setId: r.set_id, set_name: r.set_name, track: r.track,
      score: r.score, level: r.level, correct: r.correct, total: r.total, created_at: r.created_at
    }))
  return json(event, 200, { records: rows })
})
