// 单模块完整章节内容
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const mod = sqlite.prepare('SELECT * FROM modules WHERE id=?').get(id)
  if (!mod) return json(event, 404, { error: '模块不存在' })
  const chapters = sqlite.prepare('SELECT id,title,goal,position FROM chapters WHERE module_id=? ORDER BY position').all(id)
  const full = {
    ...mod,
    chapters: chapters.map((ch: any) => ({
      ...ch,
      sections: sqlite.prepare('SELECT id,title,direction,content,position FROM sections WHERE chapter_id=? ORDER BY position').all(ch.id)
    }))
  }
  return json(event, 200, { module: full })
})
