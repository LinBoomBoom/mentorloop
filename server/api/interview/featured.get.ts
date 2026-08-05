// 首页精选面试题：每方向各取 1 道高频 + 1 道特殊场景，仅返回题干与关键词
// GET /api/interview/featured
// 原先首页为了展示 8 条精选题，分别拉取四个方向的完整题库（题库扩到 2600+ 道后合计约 5.8MB），
// 改为单次轻量请求，不返回答案正文，响应 ~2KB。
const TRACKS = ['frontend', 'backend', 'devops', 'ai'] as const

export default defineEventHandler((event) => {
  const stmt = sqlite.prepare(
    `SELECT id,q,keywords FROM interview_questions
     WHERE track=? AND type=?
     ORDER BY COALESCE(weight,0) DESC, id
     LIMIT 1`
  )
  const questions: any[] = []
  for (const track of TRACKS) {
    for (const type of ['hot', 'special'] as const) {
      const r = stmt.get(track, type) as any
      if (r) questions.push({ id: r.id, q: r.q, keywords: JSON.parse(r.keywords || '[]'), track })
    }
  }
  return json(event, 200, { questions })
})
