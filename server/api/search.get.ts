// 站内搜索：跨 小节 / 章节 / 面试题 / 考卷 全量模糊检索
// GET /api/search?q=关键词
// 返回 { q, total, sections[], chapters[], questions[], exams[] }
// 标题/名称命中优先于内容命中；每类限量以避免超长响应。
export default defineEventHandler((event) => {
  const q = (getQuery(event).q || '').toString().trim()
  if (!q) return json(event, 200, { q: '', total: 0, sections: [], chapters: [], questions: [], exams: [] })

  // A5 限流：搜索每 IP 60s 内最多 30 次
  const rl = rateLimit('search', getClientIp(event), 30, 60_000)
  if (!rl.ok) return json(event, 429, { error: '搜索过于频繁，请 ' + rl.retryAfter + ' 秒后重试' })

  // A10 转义 LIKE 通配符，避免 %/_ 被当成通配导致越权/失控匹配
  const like = likeWrap(q)
  const LIMIT = 12

  // 小节：标题或内容命中（内容命中取章节路径）
  const secRows = sqlite.prepare(`
    SELECT s.id, s.chapter_id, s.title, s.content, c.module_id, c.title AS chapter_title
    FROM sections s JOIN chapters c ON c.id = s.chapter_id
    WHERE s.title LIKE ? OR s.content LIKE ?
    ORDER BY (CASE WHEN s.title LIKE ? THEN 0 ELSE 1 END), s.id
    LIMIT ?
  `).all(like, like, like, LIMIT) as any[]

  // 章节：标题命中（避免与小节结果大量重复时仍保留独立入口）
  const chRows = sqlite.prepare(`
    SELECT c.id, c.module_id, c.title
    FROM chapters c
    WHERE c.title LIKE ?
    ORDER BY c.id LIMIT ?
  `).all(like, LIMIT) as any[]

  // 面试题：题干或关键词命中
  const qRows = sqlite.prepare(`
    SELECT id, track, type, q
    FROM interview_questions
    WHERE q LIKE ? OR keywords LIKE ?
    ORDER BY (CASE WHEN q LIKE ? THEN 0 ELSE 1 END), id
    LIMIT ?
  `).all(like, like, like, LIMIT) as any[]

  // 考卷：名称命中
  const exRows = sqlite.prepare(`
    SELECT id, name, track, level
    FROM exam_sets
    WHERE name LIKE ? OR track LIKE ?
    ORDER BY id LIMIT ?
  `).all(like, like, LIMIT) as any[]

  const sections = secRows.map((r) => ({
    id: r.id,
    title: r.title,
    chapterId: r.chapter_id,
    chapterTitle: r.chapter_title,
    moduleId: r.module_id,
    href: `/learn/${r.module_id}/${r.chapter_id}/${r.id}`,
    snippet: makeSnippet(r.content, q)
  }))

  const chapters = chRows.map((r) => ({
    id: r.id,
    title: r.title,
    moduleId: r.module_id,
    href: `/learn/${r.module_id}/${r.id}`
  }))

  const questions = qRows.map((r) => ({
    id: r.id,
    track: r.track,
    type: r.type,
    q: r.q,
    href: `/interview?track=${encodeURIComponent(r.track)}`
  }))

  const exams = exRows.map((r) => ({
    id: r.id,
    name: r.name,
    track: r.track,
    level: r.level,
    href: `/exam/sets/${r.id}`
  }))

  const total = sections.length + chapters.length + questions.length + exams.length
  return json(event, 200, { q, total, sections, chapters, questions, exams })
})

function makeSnippet(content: string, q: string): string {
  if (!content) return ''
  // 去掉 markdown 噪音，取纯文本上下文
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return text.slice(0, 60)
  const start = Math.max(0, idx - 30)
  const end = Math.min(text.length, idx + q.length + 40)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}
