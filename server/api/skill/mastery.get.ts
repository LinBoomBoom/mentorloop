import { getUser, json } from '../../utils/db'
import { getMasteryMap } from '../../utils/skillMastery'

// GET /api/skill/mastery —— 读取当前用户全部技能掌握度（skillKey → 状态/掌握度/信号）
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  return json(event, 200, { map: getMasteryMap(user.id) })
})
