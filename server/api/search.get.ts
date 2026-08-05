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

  // A10 转义 LIKE 通配符，避免 %/_ 被当成通配导致越权/失控匹配。
  // SQLite 默认不启用转义字符，必须逐条 LIKE 声明 ESCAPE '\'，
  // 否则 likeWrap 产出的 \% 会被解析成「字面反斜杠 + 通配符」，搜索 % / _ 时静默返回空结果。
  const like = likeWrap(q)
  const LIMIT = 12
  const E = String.raw` ESCAPE '\'`

  // 小节：标题或内容命中（内容命中取章节路径）
  const secRows = sqlite.prepare(`
    SELECT s.id, s.chapter_id, s.title, s.content, c.module_id, c.title AS chapter_title
    FROM sections s JOIN chapters c ON c.id = s.chapter_id
    WHERE s.title LIKE ?${E} OR s.content LIKE ?${E}
    ORDER BY (CASE WHEN s.title LIKE ?${E} THEN 0 ELSE 1 END), s.id
    LIMIT ?
  `).all(like, like, like, LIMIT) as any[]

  // 章节：标题命中（避免与小节结果大量重复时仍保留独立入口）
  const chRows = sqlite.prepare(`
    SELECT c.id, c.module_id, c.title
    FROM chapters c
    WHERE c.title LIKE ?${E}
    ORDER BY c.id LIMIT ?
  `).all(like, LIMIT) as any[]

  // 面试题：题干或关键词命中
  const qRows = sqlite.prepare(`
    SELECT id, track, type, q
    FROM interview_questions
    WHERE q LIKE ?${E} OR keywords LIKE ?${E}
    ORDER BY (CASE WHEN q LIKE ?${E} THEN 0 ELSE 1 END), id
    LIMIT ?
  `).all(like, like, like, LIMIT) as any[]

  // 考卷：名称命中
  const exRows = sqlite.prepare(`
    SELECT id, name, track, level
    FROM exam_sets
    WHERE name LIKE ?${E} OR track LIKE ?${E}
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
    // 带上原搜索词：题库已扩至 2600+ 道并改为服务端搜索，落地页直接预填关键词才能定位到该题
    href: `/interview?track=${encodeURIComponent(r.track)}&q=${encodeURIComponent(q)}`
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
