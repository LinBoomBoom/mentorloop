// 试卷列表
export default defineEventHandler(async (event) => {
  const rows = await sqlite.prepare('SELECT id,name,track,level,duration,vip_only FROM exam_sets').all()
  const out = await Promise.all(rows.map(async (s: any) => ({
    id: s.id, name: s.name, track: s.track, level: s.level, duration: s.duration,
    vipOnly: !!s.vip_only,
    choiceCount: (await sqlite.prepare('SELECT COUNT(*) c FROM exam_choices WHERE set_id=?').get(s.id) as any).c,
    writtenCount: (await sqlite.prepare('SELECT COUNT(*) c FROM exam_written WHERE set_id=?').get(s.id) as any).c
  })))
  return json(event, 200, { sets: out })
})
