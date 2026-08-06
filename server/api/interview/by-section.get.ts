// 小节关联面试题（公开）——学→问闭环：在某学习小节页直接展示已被采纳并关联到该小节的面试题
// GET /api/interview/by-section?sectionId=xxx
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const sectionId = (query.sectionId as string || '').toString().trim()
  if (!sectionId) return json(event, 400, { error: '缺少 sectionId' })

  const rows = sqlite.prepare(
    `SELECT id,q,a,keywords,tech,difficulty,track
     FROM interview_questions
     WHERE section_id=?
     ORDER BY COALESCE(weight,0) DESC, id`
  ).all(sectionId) as any[]

  return json(event, 200, {
    sectionId,
    items: rows.map(r => ({
      id: r.id,
      q: r.q,
      a: r.a,
      keywords: JSON.parse(r.keywords || '[]'),
      tech: r.tech || '综合',
      difficulty: r.difficulty || 'normal',
      track: r.track
    }))
  })
})
