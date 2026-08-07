// 技能树题数聚合（按方向）——供 /interview 的「按技能树浏览」模式渲染赛道/技能点上的题数徽标
// GET /api/interview/tree/:track
//
// 只返回计数，不返回路线图结构：前端已内置 app/data/skillRoadmap.ts（/roadmap 页在用），
// 由前端把计数挂到树上即可，既避免 server 跨目录导入 app 数据，也把响应压到几 KB。
//
// 计数键说明：同一技能名会被多个赛道复用（路线图 types.ts 的 COMMON），
// 因此技能点计数必须用「赛道id|技能名」联合键，否则复用技能的题数会被错误合并。
export default defineEventHandler((event) => {
  const track = getRouterParam(event, 'track')
  const nameMap: any = { frontend: '前端开发', backend: '后端开发', devops: '运维 / DevOps', ai: 'AI 工程' }
  if (!nameMap[track as string]) return json(event, 404, { error: '题库不存在' })

  const subRows = sqlite.prepare(
    `SELECT subtrack, count(*) c FROM interview_questions
     WHERE track=? AND subtrack IS NOT NULL AND subtrack<>''
     GROUP BY subtrack`
  ).all(track) as any[]

  const skillRows = sqlite.prepare(
    `SELECT subtrack, skill, count(*) c FROM interview_questions
     WHERE track=? AND skill IS NOT NULL AND skill<>''
     GROUP BY subtrack, skill`
  ).all(track) as any[]

  const bySubtrack: Record<string, number> = {}
  for (const r of subRows) bySubtrack[r.subtrack] = r.c
  const bySkill: Record<string, number> = {}
  for (const r of skillRows) bySkill[`${r.subtrack || ''}|${r.skill}`] = r.c

  return json(event, 200, {
    tree: {
      track,
      name: nameMap[track as string],
      bySubtrack,
      bySkill,
      total: subRows.reduce((s, r) => s + r.c, 0)
    }
  })
})
