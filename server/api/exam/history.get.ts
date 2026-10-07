// 答卷历史
export default defineEventHandler(async (event) => {
  const user = await getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const rows = await sqlite.prepare('SELECT * FROM exam_records WHERE user_id=? ORDER BY created_at DESC').all(user.id) as any[]
  const records = await Promise.all(rows.map(async (r: any) => {
    // 运行时重算得分（基于子表/主表 fallback，兼容历史脏数据），保证列表展示与判分逻辑一致，永不显示旧 0 分
    const rc = await recomputeRecordScore(r.id, r.choice_review, r.written_review)
    return {
      id: r.id, setId: r.set_id, set_name: r.set_name, track: r.track,
      score: rc.score, level: rc.level, correct: rc.correct, total: rc.total, created_at: r.created_at
    }
  }))
  return json(event, 200, { records })
})
