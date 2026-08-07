import { getUser, json } from '../utils/db'
import { actWrongItem } from '../utils/skillMastery'

// POST /api/wrong —— 错题本操作：review（SRS 排期下次）/ dismiss（移除）
// body: { id, action }
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const body = await readBody(event)
  const { id, action } = body || {}
  if (!id || !action) return json(event, 400, { error: '参数缺失' })
  const r = actWrongItem(user.id, String(id), String(action))
  if (!r) return json(event, 404, { error: '未找到' })
  return json(event, 200, r)
})
