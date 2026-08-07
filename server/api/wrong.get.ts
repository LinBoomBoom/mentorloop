import { getUser, json } from '../../utils/db'
import { listWrongItems } from '../../utils/skillMastery'

// GET /api/wrong?due=1 —— 错题本（跨卷/练习错题 + SRS 到期过滤）
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const q = getQuery(event)
  const dueOnly = q.due === '1'
  return json(event, 200, { items: listWrongItems(user.id, dueOnly) })
})
