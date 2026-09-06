// 面试题库（按方向）——服务端分页 / 筛选 / 搜索
// GET /api/interview/:track?type=hot&tech=Vue&q=响应式&page=1&pageSize=10
// 题库扩充到 2600+ 道后，一次性返回整库会产生 1.8~2.3MB 响应（SSR 还会再序列化进 HTML），
// 故改为服务端分页：只返回当前页的题目（含答案），并附带计数与技术子类供前端渲染筛选器。
const PAGE_SIZE_MAX = 50

export default defineEventHandler((event) => {
  const track = getRouterParam(event, 'track')
  const query = getQuery(event)
  const type = query.type === 'special' ? 'special' : 'hot'
  const techRaw = (query.tech as string) || ''
  // 技能树浏览模式：按路线图赛道 / 技能点精确筛选（仅路线图题 rq- 带这两个归属）
  const subtrackRaw = (query.subtrack as string) || ''
  const skill = (query.skill as string) || ''
  // 子主题级精准过滤（打通学→练闭环 deep-link）：章节 subtrack（go/python/vue…）命中 subtrack_detail
  const sdRaw = (query.sd as string) || ''
  // 单参数内部支持逗号分隔多值（如 tech=Vue,React），通过 IN (...) 做 OR 合并；
  // 但 subtrack 参数与 tech 参数之间为「层级收窄」关系，在下方用 AND 连接。
  const techs = techRaw.split(',').map(s => s.trim()).filter(Boolean)
  const subtracks = subtrackRaw.split(',').map(s => s.trim()).filter(Boolean)
  const kw = ((query.q as string) || '').trim()
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(String(query.pageSize || '10'), 10) || 10))

  const nameMap: any = { frontend: '前端开发', backend: '后端开发', devops: '运维 / DevOps', ai: 'AI 工程' }
  if (!nameMap[track as string]) return json(event, 404, { error: '题库不存在' })

  // 与方向无关的筛选条件（tech / 关键词），hot 与 special 计数共用
  const cond: string[] = ['track=?']
  const args: any[] = [track]
  // subtrack 与 tech 为同一归类轴的两个层级（技能赛道 → 技术方向）：
  // 同时选中时应取「交集」（该赛道下、关于该技术方向的题），而非「并集」，
  // 否则 uniapp+性能优化 会连同所有 fe-web 性能优化题一起返回（归类串味）。
  // 注意：单参数内部的多值（如 tech=Vue,React）仍走 IN (...) 做 OR 合并。
  const andParts: string[] = []
  if (subtracks.length) {
    const ph = subtracks.map(() => '?').join(',')
    andParts.push('subtrack IN (' + ph + ')'); args.push(...subtracks)
  }
  if (techs.length) {
    const ph = techs.map(() => '?').join(',')
    andParts.push('tech IN (' + ph + ')'); args.push(...techs)
  }
  if (andParts.length === 2) cond.push('(' + andParts.join(' AND ') + ')')
  else if (andParts.length === 1) cond.push(andParts[0])
  if (skill) { cond.push('skill=?'); args.push(skill) }
  // 子主题级精准过滤（打通学→练闭环 deep-link）：subtrack_detail 逗号包裹, LIKE '%,go,%'
  if (sdRaw) { cond.push('subtrack_detail LIKE ?'); args.push('%,' + sdRaw + ',%') }
  if (kw) {
    // A10 转义 LIKE 通配符。注意 SQLite 默认无转义字符，必须显式声明 ESCAPE '\'，
    // 否则 likeWrap 产出的 \% 会被当成「字面反斜杠 + 通配符」，导致搜索 % / _ 静默返回空。
    const like = likeWrap(kw)
    cond.push(`(q LIKE ? ESCAPE '\\' OR a LIKE ? ESCAPE '\\' OR keywords LIKE ? ESCAPE '\\')`)
    args.push(like, like, like)
  }
  const where = cond.join(' AND ')

  // 两个题型的命中数（供 tab 上的数字与分页 total 使用）
  const countRows = sqlite.prepare(
    `SELECT type, count(*) c FROM interview_questions WHERE ${where} GROUP BY type`
  ).all(...args) as any[]
  const counts = { hot: 0, special: 0 }
  for (const r of countRows) if (r.type in counts) (counts as any)[r.type] = r.c

  // 当前页数据：仅取当前题型，按 weight 降序（高频题优先）再按 id 稳定排序
  const rows = sqlite.prepare(
    `SELECT id,q,a,keywords,tech,difficulty,section_id,subtrack,skill,
       (SELECT s.title FROM sections s WHERE s.id = interview_questions.section_id) AS section_title
     FROM interview_questions
     WHERE ${where} AND type=?
     ORDER BY COALESCE(weight,0) DESC, id
     LIMIT ? OFFSET ?`
  ).all(...args, type, pageSize, (page - 1) * pageSize) as any[]

  // 技术子类选项：只受关键词影响（不受 tech 自身影响，否则选中后其它选项会消失）
  const techCond: string[] = ['track=?']
  const techArgs: any[] = [track]
  // 赛道/技能点是比 tech 更强的限定，选中后技术子类应随之收敛
  if (subtracks.length) {
    const ph = subtracks.map(() => '?').join(',')
    techCond.push('subtrack IN (' + ph + ')'); techArgs.push(...subtracks)
  }
  if (skill) { techCond.push('skill=?'); techArgs.push(skill) }
  if (sdRaw) { techCond.push('subtrack_detail LIKE ?'); techArgs.push('%,' + sdRaw + ',%') }
  if (kw) {
    const like = likeWrap(kw)
    techCond.push(`(q LIKE ? ESCAPE '\\' OR a LIKE ? ESCAPE '\\' OR keywords LIKE ? ESCAPE '\\')`)
    techArgs.push(like, like, like)
  }
  const techRows = sqlite.prepare(
    `SELECT tech, count(*) c FROM interview_questions WHERE ${techCond.join(' AND ')}
     GROUP BY tech ORDER BY c DESC`
  ).all(...techArgs) as any[]

  return json(event, 200, {
    bank: {
      name: nameMap[track as string],
      type,
      page,
      pageSize,
      total: (counts as any)[type],
      counts,
      techOptions: techRows.filter(r => r.tech).map(r => ({ tech: r.tech, count: r.c })),
      items: rows.map(r => ({
        id: r.id,
        q: r.q,
        a: r.a,
        keywords: JSON.parse(r.keywords || '[]'),
        tech: r.tech || '综合',
        difficulty: r.difficulty || 'easy',
        sectionTitle: r.section_title || null,
        subtrack: r.subtrack || null,
        skill: r.skill || null
      }))
    }
  })
})
