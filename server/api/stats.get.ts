// 学习数据看板（首页可视化）
const MOD_COLORS: Record<string, string> = {
  frontend: '#ff5e7e',
  backend: '#14b8a6',
  devops: '#f59e0b',
  ai: '#8b5cf6'
}

// 本地时区的 YYYY-MM-DD（热力图/打卡全站统一用它，避免 toISOString 的 UTC 偏移串日期）
function ymd(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) {
    // 未登录：返回空结构，供公开首页优雅渲染（不报错）
    return json(event, 200, {
      loggedIn: false,
      overall: { done: 0, total: 0, percent: 0 },
      modules: [], heatmap: [], heatmapRange: null,
      streak: { current: 0, longest: 0, totalDays: 0, active30: 0 },
      radar: [], radarInsight: null, resume: null,
      exams: { count: 0, best: 0, recent: [] }
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

  // B6：单条聚合取出每个模块的小节总数（通过章节归属），替代 modules→chapters→sections 三层嵌套查询
  const totalRows = sqlite.prepare(
    'SELECT c.module_id AS module_id, COUNT(*) AS total FROM sections s JOIN chapters c ON c.id=s.chapter_id GROUP BY c.module_id'
  ).all() as any[]
  const totalMap: any = {}
  for (const r of totalRows) totalMap[r.module_id] = r.total

  /* ---------- 答卷：按方向聚合客观题正确率（供雷达「学 + 练」融合打分） ---------- */
  const recs = sqlite.prepare('SELECT * FROM exam_records WHERE user_id=? ORDER BY created_at DESC').all(user.id) as any[]
  // 运行时重算得分（基于子表/主表 fallback，兼容历史脏数据），保证统计与判分逻辑一致，永不显示旧 0 分
  const computed = recs.map((r: any) => ({ ...r, ...recomputeRecordScore(r.id, r.choice_review, r.written_review) }))
  const scores: number[] = computed.map((r: any) => r.score)

  // 按方向汇总「答对题数 / 总题数」——聚合正确率比「各卷得分求平均」更能反映真实水平
  const examByTrack: Record<string, { correct: number; total: number; count: number }> = {}
  for (const r of computed) {
    const t = r.track || 'frontend'
    const slot = examByTrack[t] || (examByTrack[t] = { correct: 0, total: 0, count: 0 })
    slot.correct += r.correct || 0
    slot.total += r.total || 0
    slot.count += 1
  }

  const modRows = sqlite.prepare('SELECT id,name FROM modules ORDER BY position').all() as any[]
  const modules = modRows.map((m: any) => {
    const total = totalMap[m.id] || 0
    const done = doneByModule[m.id] || 0
    const ex = examByTrack[m.id]
    return {
      id: m.id,
      name: m.name,
      color: MOD_COLORS[m.id] || '#ff5e7e',
      percent: total ? Math.round(done / total * 100) : 0,
      done,
      total,
      // 该方向的答卷情况：无记录时 accuracy 为 null，前端可提示「未实战验证」
      examCount: ex?.count || 0,
      examAccuracy: ex && ex.total ? Math.round(ex.correct / ex.total * 100) : null
    }
  })
  const totalAll = modules.reduce((s: number, m: any) => s + m.total, 0)
  const doneAll = modules.reduce((s: number, m: any) => s + m.done, 0)

  /* ---------- 活跃日历：学习 + 打卡 ---------- */
  const days: any = {}
  Object.values(prog).forEach((ts: any) => {
    const key = ymd(new Date(ts))
    days[key] = (days[key] || 0) + 1
  })
  // 合并每日打卡：打卡日期同样点亮热力图、计入连续活跃
  sqlite.prepare('SELECT check_date FROM checkins WHERE user_id=?').all(user.id).forEach((r: any) => {
    days[r.check_date] = (days[r.check_date] || 0) + 1
  })

  const today = new Date()
  // 完整窗口（140 天）只用于计算 streak / longest，不下发给前端
  const full: any[] = []
  for (let i = 139; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - i)
    const key = ymd(dt)
    full.push({ date: key, count: days[key] || 0 })
  }
  // 前端展示窗口：上月 1 号 → 本月底（含未来日期占位，count = -1 表示「尚未到来」）
  const startDisplay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endDisplay = new Date(today.getFullYear(), today.getMonth() + 1, 0) // 本月最后一天
  const todayKey = ymd(today)
  const heatmap: any[] = []
  for (const dt = new Date(startDisplay); dt <= endDisplay; dt.setDate(dt.getDate() + 1)) {
    const key = ymd(dt)
    heatmap.push({ date: key, count: key > todayKey ? -1 : (days[key] || 0) })
  }

  // BUG-4：连续天数需与 checkin.ts 的 computeStreak 语义一致——今天没活跃则从昨天起算，
  // 避免用户昨天、前天都打卡但 UI 仍显示「连续 0 天」。
  let streak = 0
  let idx = full.length - 1
  if (idx >= 0 && full[idx].count === 0) idx-- // 今天未活跃，从昨天开始计数
  while (idx >= 0 && full[idx].count > 0) { streak++; idx-- }
  let longest = 0, run = 0
  full.forEach((h: any) => { if (h.count > 0) { run++; longest = Math.max(longest, run) } else run = 0 })
  const totalDays = Object.keys(days).length
  // 近 30 天活跃天数（雷达「学习节奏」的输入，也比「连续天数」更抗中断）
  const active30 = full.slice(-30).filter((h: any) => h.count > 0).length

  /* ---------- 能力雷达：四方向「学 + 练」融合 + 两个跨方向维度 ---------- */
  // 设计目标：每个轴都回答一个独立问题，且不与看板其它数字重复。
  //  · 四个方向轴 = 学习完成度与该方向答卷正确率各占一半（未考过则按学习分打折，标记「未验证」）
  //  · 学习节奏   = 近 30 天活跃天数占比（衡量习惯，而非某次成绩）
  //  · 实战强度   = 答卷套数 + 覆盖方向数（衡量练习广度，而非分数高低）
  const trackAxis = modules.map((m: any) => {
    const verified = m.examAccuracy !== null
    const value = verified
      ? Math.round(m.percent * 0.5 + m.examAccuracy * 0.5)
      : Math.round(m.percent * 0.6)
    return {
      axis: m.name.replace(/\s*\/.*$/, '').replace('开发', ''), // 前端 / 后端 / 运维 / AI 工程
      key: m.id,
      value,
      color: m.color,
      verified,
      hint: verified
        ? `学习完成 ${m.percent}% ，${m.name}答卷正确率 ${m.examAccuracy}%（各占一半）`
        : `学习完成 ${m.percent}% ，尚未做过该方向答卷，分数按 60% 折算`
    }
  })
  const distinctTracks = Object.keys(examByTrack).length
  const practice = Math.min(100, scores.length * 10 + distinctTracks * 15)
  const rhythm = Math.round(active30 / 30 * 100)
  const radar = [
    ...trackAxis,
    { axis: '学习节奏', key: 'rhythm', value: rhythm, color: '#0ea5e9', verified: true, hint: `近 30 天有 ${active30} 天在学习或打卡` },
    { axis: '实战强度', key: 'practice', value: practice, color: '#e11d48', verified: true, hint: `已完成 ${scores.length} 套答卷，覆盖 ${distinctTracks} 个方向` }
  ]

  // 雷达解读：把图形翻译成一句「下一步该做什么」，这是雷达存在的意义
  const sortedTracks = [...trackAxis].sort((a, b) => b.value - a.value)
  const strong = sortedTracks[0]
  const weak = sortedTracks[sortedTracks.length - 1]
  let advice: string
  let actionTo = '/learn'
  let actionText = '去学习中心'
  if (!scores.length) {
    advice = `你在「${strong.axis}」上投入最多，但还没有任何答卷记录 —— 学得再多也需要实战校验。建议先做一套${strong.axis}方向的模拟卷，把学习完成度换成真实分数。`
    actionTo = '/exam'; actionText = '去做第一套答卷'
  } else if (rhythm < 40) {
    advice = `近 30 天只活跃了 ${active30} 天，学习节奏是当前最短的一块板。相比补知识，先把「每天来一次」的习惯稳住收益更大。`
    actionTo = '/learn'; actionText = '继续未完成的小节'
  } else if (weak.value < strong.value - 25) {
    advice = `「${strong.axis}」已经是你的优势项（${strong.value} 分），而「${weak.axis}」只有 ${weak.value} 分，明显偏科。面试常按岗位交叉提问，建议优先补齐${weak.axis}。`
    actionTo = `/learn/${weak.key}`; actionText = `去补「${weak.axis}」`
  } else if (!weak.verified) {
    advice = `各方向学习进度比较均衡，但「${weak.axis}」还没做过对应答卷，分数尚未被验证。做一套卷即可让这条轴反映真实水平。`
    actionTo = '/exam'; actionText = `做一套${weak.axis}方向卷`
  } else {
    advice = `六维发展比较均衡，最强「${strong.axis}」${strong.value} 分、最弱「${weak.axis}」${weak.value} 分。继续保持节奏，优先啃${weak.axis}里还没掌握的小节即可稳步抬升整体水平。`
    actionTo = `/learn/${weak.key}`; actionText = `继续「${weak.axis}」`
  }
  const radarInsight = {
    strong: { axis: strong.axis, value: strong.value, key: strong.key },
    weak: { axis: weak.axis, value: weak.value, key: weak.key },
    advice, actionTo, actionText
  }

  // 续学锚点：按「模块→章节→小节」顺序找出第一个未完成的小节，供首页「继续学习」一键直达
  const sectRows = sqlite.prepare(
    `SELECT s.id sid, s.title stitle, c.id cid, c.title ctitle, c.module_id mid, m.name mname
     FROM sections s JOIN chapters c ON c.id=s.chapter_id JOIN modules m ON m.id=c.module_id
     ORDER BY m.position, c.position, s.position`
  ).all() as any[]
  let resume: any = null
  for (const s of sectRows) {
    if (!prog[`${s.mid}/${s.cid}/${s.sid}`]) {
      resume = {
        moduleId: s.mid, moduleName: s.mname,
        chapterId: s.cid, chapterTitle: s.ctitle,
        sectionId: s.sid, sectionTitle: s.stitle,
        path: `/learn/${s.mid}/${s.cid}/${s.sid}`
      }
      break
    }
  }

  const exams = {
    count: scores.length,
    best: scores.length ? Math.max(...scores) : 0,
    // 列表项携带 set_id / record id，前端可直接跳转对应答卷的复盘页
    recent: computed.slice(0, 5).map((r: any) => ({
      recordId: r.id, setId: r.set_id, name: r.set_name, score: r.score, level: r.level, createdAt: r.created_at
    }))
  }
  return json(event, 200, {
    overall: { done: doneAll, total: totalAll, percent: totalAll ? Math.round(doneAll / totalAll * 100) : 0 },
    modules,
    heatmap,
    heatmapRange: { start: ymd(startDisplay), end: ymd(endDisplay), today: todayKey },
    streak: { current: streak, longest, totalDays, active30 },
    radar, radarInsight, resume, exams
  })
})
