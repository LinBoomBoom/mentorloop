// 单模块完整章节内容
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const mod = sqlite.prepare('SELECT * FROM modules WHERE id=?').get(id)
  if (!mod) return json(event, 404, { error: '模块不存在' })
  const chapters = sqlite.prepare('SELECT id,title,goal,position,subtrack FROM chapters WHERE module_id=? ORDER BY position').all(id)
  // 方向聚合：该模块下各 subtrack 的章节/小节计数
  const subRows = sqlite.prepare(
    `SELECT c.subtrack, COUNT(DISTINCT c.id) AS chapterCount, COUNT(s.id) AS sectionCount
     FROM chapters c LEFT JOIN sections s ON s.chapter_id = c.id
     WHERE c.module_id = ? AND c.subtrack IS NOT NULL AND c.subtrack != ''
     GROUP BY c.subtrack`
  ).all(id) as any[]
  const subtracks: Record<string, { chapterCount: number; sectionCount: number }> = {}
  for (const r of subRows) subtracks[r.subtrack] = { chapterCount: r.chapterCount, sectionCount: r.sectionCount }

  const full = {
    ...mod,
    subtracks,
    chapters: chapters.map((ch: any) => ({
      ...ch,
      sections: sqlite.prepare('SELECT id,title,direction,content,position FROM sections WHERE chapter_id=? ORDER BY position').all(ch.id)
    }))
  }
  return json(event, 200, { module: full })
})
