// 面试题库（按方向，支持技术子类筛选 ?tech=）
export default defineEventHandler((event) => {
  const track = getRouterParam(event, 'track')
  const tech = (getQuery(event).tech as string) || ''
  let sql = 'SELECT id,track,type,q,a,keywords,tech,difficulty FROM interview_questions WHERE track=?'
  const params: any[] = [track]
  if (tech) { sql += ' AND tech=?'; params.push(tech) }
  const rows = sqlite.prepare(sql).all(...params)
  if (!rows.length) return json(event, 404, { error: '题库不存在' })
  const nameMap: any = { frontend: '前端开发', backend: '后端开发', devops: '运维 / DevOps', ai: 'AI 工程' }
  const map = (r: any) => ({
    id: r.id,
    q: r.q,
    a: r.a,
    keywords: JSON.parse(r.keywords || '[]'),
    tech: r.tech || '综合',
    difficulty: r.difficulty || 'normal'
  })
  const bank = {
    name: nameMap[track] || track,
    hot: rows.filter(r => r.type === 'hot').map(map),
    special: rows.filter(r => r.type === 'special').map(map)
  }
  return json(event, 200, { bank })
})
