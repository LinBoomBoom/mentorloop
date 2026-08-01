// 学习模块概览
export default defineEventHandler((event) => {
  const list = sqlite.prepare('SELECT id,name,icon,color,desc,position FROM modules ORDER BY position').all()
  const out = list.map((m: any) => {
    const ch = sqlite.prepare('SELECT id FROM chapters WHERE module_id=?').all(m.id)
    let sectionCount = 0
    for (const c of ch) sectionCount += (sqlite.prepare('SELECT COUNT(*) c FROM sections WHERE chapter_id=?').get(c.id) as any).c
    return { id: m.id, name: m.name, icon: m.icon, color: m.color, desc: m.desc, chapterCount: ch.length, sectionCount }
  })
  return json(event, 200, { modules: out })
})
