// 面试题库（按方向）
export default defineEventHandler((event) => {
  const track = getRouterParam(event, 'track')
  const rows = sqlite.prepare('SELECT id,track,type,q,a,keywords FROM interview_questions WHERE track=?').all(track)
  if (!rows.length) return json(event, 404, { error: '题库不存在' })
  const nameMap: any = { frontend: '前端开发', backend: '后端开发', devops: '运维 / DevOps', ai: 'AI 工程' }
  const map = (r: any) => ({ id: r.id, q: r.q, a: r.a, keywords: JSON.parse(r.keywords || '[]') })
  const bank = {
    name: nameMap[track] || track,
    hot: rows.filter(r => r.type === 'hot').map(map),
    special: rows.filter(r => r.type === 'special').map(map)
  }
  return json(event, 200, { bank })
})
