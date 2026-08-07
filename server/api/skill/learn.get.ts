import { json } from '../../utils/db'
import { mapSkillToSections, mapSkillToNicheChapters } from '../../utils/skillMastery'

// GET /api/skill/learn?track=frontend&skill=...&subtrack=fe-harmony
// 细分赛道（已有体系化课程）走确定性前缀匹配；其余走模糊匹配。
export default defineEventHandler((event) => {
  const q = getQuery(event)
  const track = q.track as string
  const skill = q.skill as string
  if (!track || !skill) return json(event, 400, { error: '参数缺失' })
  const desc = (q.desc as string) || ''
  const subtrack = (q.subtrack as string) || ''
  // 细分赛道：按赛道标签前缀精确查真实章节（null=非细分赛道，回退模糊）
  const niche = mapSkillToNicheChapters(track, subtrack)
  if (niche !== null) return json(event, 200, { sections: niche, source: 'niche' })
  return json(event, 200, { sections: mapSkillToSections(track, skill, desc, subtrack), source: 'match' })
})
