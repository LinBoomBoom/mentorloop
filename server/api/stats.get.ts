// 学习数据看板（首页可视化）
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) {
    // 未登录：返回空结构，供公开首页优雅渲染（不报错）
    return json(event, 200, {
      loggedIn: false,
      overall: { done: 0, total: 0, percent: 0 },
      modules: [], heatmap: [], streak: { current: 0, longest: 0, totalDays: 0 },
      radar: [], exams: { count: 0, avg: 0, best: 0, recent: [] }
    })
  }
  const prog: any = {}
  sqlite.prepare('SELECT module_id,chapter_id,section_id,done_at FROM progress WHERE user_id=?').all(user.id)
    .forEach((r: any) => { prog[`${r.module_id}/${r.chapter_id}/${r.section_id}`] = r.done_at })

  // 内存分组：按模块统计已完成小节数（避免逐模块查 done）
  const doneByModule: any = {}
  for (const key of Object.keys(prog)) {
    const mod = key.split('/')[0]
    doneByModule[mod] = (doneByModule[mod] || 0) + 1
  }

  const colors: any = { frontend: '#ff5e7e', backend: '#14b8a6', devops: '#f59e0b' }
  // B6：单条聚合取出每个模块的小节总数（通过章节归属），替代 modules→chapters→sections 三层嵌套查询
  const totalRows = sqlite.prepare(
    'SELECT c.module_id AS module_id, COUNT(*) AS total FROM sections s JOIN chapters c ON c.id=s.chapter_id GROUP BY c.module_id'
  ).all() as any[]
  const totalMap: any = {}
  for (const r of totalRows) totalMap[r.module_id] = r.total
  const modRows = sqlite.prepare('SELECT id,name FROM modules ORDER BY position').all() as any[]
  const modules = modRows.map((m: any) => {
    const total = totalMap[m.id] || 0
    const done = doneByModule[m.id] || 0
    return {
      id: m.id, name: m.name, color: colors[m.id] || '#ff5e7e',
      percent: total ? Math.round(done / total * 100) : 0, done, total
    }
  })
  const totalAll = modules.reduce((s: number, m: any) => s + m.total, 0)
  const doneAll = modules.reduce((s: number, m: any) => s + m.done, 0)

  const days: any = {}
  Object.values(prog).forEach((ts: any) => {
    const d = new Date(ts)
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    days[key] = (days[key] || 0) + 1
  })
  // 合并每日打卡：打卡日期同样点亮热力图、计入连续活跃
  sqlite.prepare('SELECT check_date FROM checkins WHERE user_id=?').all(user.id).forEach((r: any) => {
    days[r.check_date] = (days[r.check_date] || 0) + 1
  })
  const heatmap: any[] = []
  const today = new Date()
  for (let i = 139; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - i)
    const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
    heatmap.push({ date: key, count: days[key] || 0 })
  }
  // BUG-4：连续天数需与 checkin.ts 的 computeStreak 语义一致——今天没活跃则从昨天起算，
  // 避免用户昨天、前天都打卡但 UI 仍显示「连续 0 天」。
  let streak = 0
  let idx = heatmap.length - 1
  if (idx >= 0 && heatmap[idx].count === 0) idx-- // 今天未活跃，从昨天开始计数
  while (idx >= 0 && heatmap[idx].count > 0) { streak++; idx-- }
  let longest = 0, run = 0
  heatmap.forEach((h: any) => { if (h.count > 0) { run++; longest = Math.max(longest, run) } else run = 0 })
  const totalDays = Object.keys(days).length

  const recs = sqlite.prepare('SELECT * FROM exam_records WHERE user_id=? ORDER BY created_at DESC').all(user.id) as any[]
  // 运行时重算得分（基于子表/主表 fallback，兼容历史脏数据），保证统计与判分逻辑一致，永不显示旧 0 分
  const computed = recs.map((r: any) => ({ ...r, ...recomputeRecordScore(r.id, r.choice_review, r.written_review) }))
  const scores: number[] = computed.map((r: any) => r.score)
  const examAvg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const getM = (id: string) => modules.find((m: any) => m.id === id) || { percent: 0 }
  const radar = [
    { axis: '前端', value: getM('frontend').percent },
    { axis: '后端', value: getM('backend').percent },
    { axis: '运维', value: getM('devops').percent },
    { axis: '笔试能力', value: examAvg },
    { axis: '面试准备', value: Math.min(100, scores.length * 20) },
    { axis: '持续学习', value: Math.min(100, streak * 15) }
  ]
  const exams = {
    count: scores.length, avg: examAvg,
    best: scores.length ? Math.max(...scores) : 0,
    recent: computed.slice(0, 5).map((r: any) => ({ name: r.set_name, score: r.score, level: r.level, createdAt: r.created_at }))
  }
  return json(event, 200, {
    overall: { done: doneAll, total: totalAll, percent: totalAll ? Math.round(doneAll / totalAll * 100) : 0 },
    modules, heatmap,
    streak: { current: streak, longest, totalDays },
    radar, exams
  })
})
