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

  const colors: any = { frontend: '#ff5e7e', backend: '#14b8a6', devops: '#f59e0b' }
  const modules = sqlite.prepare('SELECT id,name FROM modules ORDER BY position').all().map((m: any) => {
    let total = 0, done = 0
    const chs = sqlite.prepare('SELECT id FROM chapters WHERE module_id=?').all(m.id)
    for (const ch of chs) {
      const secs = sqlite.prepare('SELECT id FROM sections WHERE chapter_id=?').all(ch.id)
      total += secs.length
      for (const s of secs) if (prog[`${m.id}/${ch.id}/${s.id}`]) done++
    }
    return { id: m.id, name: m.name, color: colors[m.id] || '#ff5e7e', percent: total ? Math.round(done / total * 100) : 0, done, total }
  })
  const totalAll = modules.reduce((s: number, m: any) => s + m.total, 0)
  const doneAll = modules.reduce((s: number, m: any) => s + m.done, 0)

  const days: any = {}
  Object.values(prog).forEach((ts: any) => {
    const d = new Date(ts)
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    days[key] = (days[key] || 0) + 1
  })
  const heatmap: any[] = []
  const today = new Date()
  for (let i = 139; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - i)
    const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
    heatmap.push({ date: key, count: days[key] || 0 })
  }
  let streak = 0
  for (let i = heatmap.length - 1; i >= 0; i--) { if (heatmap[i].count > 0) streak++; else break }
  let longest = 0, run = 0
  heatmap.forEach((h: any) => { if (h.count > 0) { run++; longest = Math.max(longest, run) } else run = 0 })
  const totalDays = Object.keys(days).length

  const scores: number[] = sqlite.prepare('SELECT score FROM exam_records WHERE user_id=?').all(user.id).map((r: any) => r.score)
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
  const recRows = sqlite.prepare('SELECT set_name,score,level,created_at FROM exam_records WHERE user_id=? ORDER BY created_at DESC').all(user.id)
  const exams = {
    count: scores.length, avg: examAvg,
    best: scores.length ? Math.max(...scores) : 0,
    recent: recRows.slice(0, 5).map((r: any) => ({ name: r.set_name, score: r.score, level: r.level, createdAt: r.created_at }))
  }
  return json(event, 200, {
    overall: { done: doneAll, total: totalAll, percent: totalAll ? Math.round(doneAll / totalAll * 100) : 0 },
    modules, heatmap,
    streak: { current: streak, longest, totalDays },
    radar, exams
  })
})
