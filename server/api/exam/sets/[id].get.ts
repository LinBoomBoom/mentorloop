// 试卷详情（公开可预览：题目可见，答案不返回；VIP 限制由交卷接口校验）
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const set = sqlite.prepare('SELECT * FROM exam_sets WHERE id=?').get(id)
  if (!set) return json(event, 404, { error: '试卷不存在' })
  const choices = sqlite.prepare('SELECT id,tag,q,options,multi FROM exam_choices WHERE set_id=?').all(id)
    .map((c: any) => ({ id: c.id, tag: c.tag, q: c.q, options: JSON.parse(c.options), multi: !!c.multi }))
  const written = sqlite.prepare('SELECT id,q FROM exam_written WHERE set_id=?').all(id)
  return json(event, 200, {
    set: {
      id: set.id, name: set.name, track: set.track, level: set.level,
      duration: set.duration, vipOnly: !!set.vip_only, choices, written
    }
  })
})
