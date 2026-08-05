// 试卷详情（公开可预览：题目可见，答案不返回；VIP 限制由交卷接口校验）
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const set = sqlite.prepare('SELECT * FROM exam_sets WHERE id=?').get(id)
  if (!set) return json(event, 404, { error: '试卷不存在' })
  const choices = sqlite.prepare('SELECT id,tag,q,options,multi FROM exam_choices WHERE set_id=?').all(id)
    .map((c: any) => ({ id: c.id, tag: c.tag, q: c.q, options: JSON.parse(c.options), multi: !!c.multi }))
  const written = sqlite.prepare('SELECT id,q FROM exam_written WHERE set_id=?').all(id)

  // P1-6：已登录用户记录/复用一次服务端 attempt，用于交卷时服务端计算真实用时
  const user = getUser(event)
  let attemptId: string | null = null
  let serverStartAt: number | null = null
  const now = Date.now()
  if (user) {
    const active = sqlite.prepare(
      "SELECT id, started_at FROM exam_attempts WHERE user_id=? AND set_id=? AND status='active' AND started_at>? ORDER BY started_at DESC LIMIT 1"
    ).get(user.id, id, now - 24 * 3600 * 1000) as any
    if (active) {
      attemptId = active.id
      serverStartAt = active.started_at
    } else {
      attemptId = uid('ea_')
      serverStartAt = now
      sqlite.prepare('INSERT INTO exam_attempts (id,user_id,set_id,started_at,status) VALUES (?,?,?,?,?)')
        .run(attemptId, user.id, id, serverStartAt, 'active')
    }
  }

  return json(event, 200, {
    set: {
      id: set.id, name: set.name, track: set.track, level: set.level,
      duration: set.duration, vipOnly: !!set.vip_only, choices, written
    },
    attemptId,
    serverStartAt
  })
})
