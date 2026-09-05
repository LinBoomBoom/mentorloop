// 单题详情：GET /api/interview/question/:id
// 返回题目完整字段 + 同(方向,技术)内上一题/下一题，供详情页 SEO 内链与翻页。
// 排序与列表页一致：ORDER BY COALESCE(weight,0) DESC, id —— 保证 prev/next 与列表顺序对齐。
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return json(event, 404, { error: '题目不存在' })

  const row = sqlite.prepare(
    `SELECT id,q,a,keywords,tech,difficulty,subtrack,skill,track,type,
       (SELECT s.title FROM sections s WHERE s.id = interview_questions.section_id) AS section_title,
       (SELECT c.title FROM sections s2 JOIN chapters c ON c.id = s2.chapter_id WHERE s2.id = interview_questions.section_id) AS chapter_title
     FROM interview_questions WHERE id=?`
  ).get(id) as any
  if (!row) return json(event, 404, { error: '题目不存在' })

  const w = row.weight ?? 0
  // prev = 紧邻的前一题（同 track+tech，权重更小；同权重则 id 更小）
  const prev = sqlite.prepare(
    `SELECT id, q FROM interview_questions
     WHERE track=? AND tech=? AND (COALESCE(weight,0) < ? OR (COALESCE(weight,0)=? AND id < ?))
     ORDER BY COALESCE(weight,0) DESC, id DESC LIMIT 1`
  ).get(row.track, row.tech, w, w, row.id) as any
  // next = 紧邻的后一题（同 track+tech，权重更大；同权重则 id 更大）
  const next = sqlite.prepare(
    `SELECT id, q FROM interview_questions
     WHERE track=? AND tech=? AND (COALESCE(weight,0) > ? OR (COALESCE(weight,0)=? AND id > ?))
     ORDER BY COALESCE(weight,0) ASC, id ASC LIMIT 1`
  ).get(row.track, row.tech, w, w, row.id) as any

  // 同(方向,技术)下其他题，供详情页侧边"同标签导航"内链（强化站内抓取与关联）
  const siblings = sqlite.prepare(
    `SELECT id, q FROM interview_questions
     WHERE track=? AND tech=? AND id<>?
     ORDER BY COALESCE(weight,0) DESC, id ASC LIMIT 20`
  ).all(row.track, row.tech, row.id) as any

  return json(event, 200, {
    id: row.id,
    q: row.q,
    a: row.a,
    keywords: JSON.parse(row.keywords || '[]'),
    tech: row.tech || '综合',
    difficulty: row.difficulty || 'easy',
    subtrack: row.subtrack || null,
    skill: row.skill || null,
    track: row.track,
    type: row.type || 'hot',
    sectionTitle: row.section_title || null,
    chapterTitle: row.chapter_title || null,
    prev: prev ? { id: prev.id, q: prev.q } : null,
    next: next ? { id: next.id, q: next.q } : null,
    siblings: (siblings || []).map((s: any) => ({ id: s.id, q: s.q }))
  })
})
