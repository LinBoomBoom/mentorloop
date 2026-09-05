// 小节关联面试题（公开）——学→问闭环：在某学习小节页直接展示相关面试题
// GET /api/interview/by-section?sectionId=xxx
// 优先级：① 已采纳并挂接到本节的题（section_id）；② 兜底：同方向下按「题关键词命中本节标题/正文」做相关匹配（只读，不改库）。
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const sectionId = (query.sectionId as string || '').toString().trim()
  if (!sectionId) return json(event, 400, { error: '缺少 sectionId' })

  // ① 已采纳并挂接到本节的题（管理员审核采纳后关联）
  const linked = sqlite.prepare(
    `SELECT id,q,a,keywords,tech,difficulty,track
     FROM interview_questions WHERE section_id=?
     ORDER BY COALESCE(weight,0) DESC, id`
  ).all(sectionId) as any[]

  let rows = linked
  if (rows.length === 0) {
    // 取该节的标题/正文 + 所属赛道(方向) + 所属子主题(subtrack 子主题级)
    const sec = sqlite.prepare(
      `SELECT s.title, s.content, c.module_id AS track, c.subtrack AS chapter_subtrack
       FROM sections s JOIN chapters c ON c.id = s.chapter_id
       WHERE s.id=?`
    ).get(sectionId) as any
    if (sec) {
      // ② 子主题精准匹配：章节所属 subtrack（子主题级，如 go/python/vue）命中题库 subtrack_detail，
      //    让「学 Go 的人看到 Go 题」而非全后端关键词噪声。优先于关键词兜底。
      if (sec.chapter_subtrack) {
        const detail = sqlite.prepare(
          `SELECT id,q,a,keywords,tech,difficulty,track,COALESCE(weight,0) AS w
           FROM interview_questions WHERE subtrack_detail LIKE ? AND section_id IS NULL
           ORDER BY w DESC, id`
        ).all('%,' + sec.chapter_subtrack + ',%') as any[]
        if (detail.length) rows = detail.slice(0, 8)
      }
      // ③ 兜底：同方向下，按「题关键词命中本节标题/正文」做相关匹配
      if (rows.length === 0 && sec.track) {
        const text = ((sec.title || '') + ' ' + (sec.content || '')).toLowerCase()
        const cand = sqlite.prepare(
          `SELECT id,q,a,keywords,tech,difficulty,track,COALESCE(weight,0) AS w
           FROM interview_questions WHERE track=? AND section_id IS NULL
           ORDER BY w DESC, id`
        ).all(sec.track) as any[]
        const scored: { r: any, score: number }[] = []
        for (const r of cand) {
          let score = 0
          try {
            const kws = JSON.parse(r.keywords || '[]')
            for (const k of kws) if (k && text.indexOf(String(k).toLowerCase()) >= 0) score++
          } catch (e) { /* ignore */ }
          if (score > 0) scored.push({ r, score })
        }
        scored.sort((x, y) => y.score - x.score || y.r.w - x.r.w)
        rows = scored.slice(0, 8).map((s) => s.r)
      }
    }
  }

  return json(event, 200, {
    sectionId,
    items: rows.map((r) => ({
      id: r.id,
      q: r.q,
      a: r.a,
      keywords: JSON.parse(r.keywords || '[]'),
      tech: r.tech || '综合',
      difficulty: r.difficulty || 'easy',
      track: r.track
    }))
  })
})
