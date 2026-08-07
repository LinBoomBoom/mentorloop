import { json } from '../../utils/db'
import { mapSkillToSections } from '../../utils/skillMastery'

// GET /api/skill/learn?track=frontend&skill=React Hooks —— 返回该技能最相关的学习章节（P1a 去学习入口）
export default defineEventHandler((event) => {
  const q = getQuery(event)
  const track = q.track as string
  const skill = q.skill as string
  if (!track || !skill) return json(event, 400, { error: '参数缺失' })
  return json(event, 200, { sections: mapSkillToSections(track, skill) })
})
