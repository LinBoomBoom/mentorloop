// 学习模块概览（B6：消除 N+1——用 GROUP BY 聚合一次取出章节/小节计数，不再逐模块嵌套查询）
export default defineEventHandler((event) => {
  const list = sqlite.prepare('SELECT id,name,icon,color,desc,position FROM modules ORDER BY position').all()
  // 模块 icon 在数据库里存的是 emoji，而前端 <Icon> 只认图标表里的 key；
  // 这里按模块 id 归一化成合法 key，避免前端渲染空白（Icon.vue 的回退兜底也修了，但源头修更稳）。
  const ICON_BY_ID: Record<string, string> = { frontend: 'code', backend: 'server', devops: 'cpu', ai: 'sparkles' }
  // 单条聚合：每个模块的章节数
  const chRows = sqlite.prepare('SELECT module_id, COUNT(*) AS c FROM chapters GROUP BY module_id').all() as any[]
  // 单条聚合：每个模块的小节数（通过章节归属到模块，避免逐章节再查小节）
  const secRows = sqlite.prepare(
    'SELECT c.module_id, COUNT(*) AS c FROM sections s JOIN chapters c ON c.id=s.chapter_id GROUP BY c.module_id'
  ).all() as any[]
  const chMap: any = {}
  const secMap: any = {}
  for (const r of chRows) chMap[r.module_id] = r.c
  for (const r of secRows) secMap[r.module_id] = r.c
  const out = list.map((m: any) => ({
    id: m.id, name: m.name, icon: ICON_BY_ID[m.id] || 'code', color: m.color, desc: m.desc,
    chapterCount: chMap[m.id] || 0, sectionCount: secMap[m.id] || 0
  }))
  return json(event, 200, { modules: out })
})
