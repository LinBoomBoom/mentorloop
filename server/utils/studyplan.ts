// H2 · 个性化学习路径定制：复用交卷 weak_points，调用大模型生成有序学习路径
// 支持「按方向切换」：每个方向各自缓存 7 天，避免重复消耗 LLM 额度。
import { getLlm, llmEnabled } from './llm'
import { sqlite, uid } from './db'
import { parseJsonBlock } from './interview'

const TRACK_NAMES: Record<string, string> = {
  frontend: '前端', backend: '后端', devops: '运维/DevOps', ai: 'AI 工程'
}
export const VALID_TRACKS = ['frontend', 'backend', 'devops', 'ai']
function trackName(t: string) { return TRACK_NAMES[t] || t || '通用' }
const PLAN_TTL_MS = 7 * 86400000

export class NoRecordsError extends Error {
  constructor() { super('NO_RECORDS'); this.name = 'NoRecordsError' }
}

// 章节标题 → 真实课程链接。AI 只能从真实章节名里挑，这里把标题还原成可点击的深链，
// 让学习路径不再是「一段纯文本」，而是能直接跳进对应课程的入口。
function chapterIndex(track: string) {
  const rows = sqlite.prepare(
    `SELECT DISTINCT c.id AS id, c.title AS title, c.module_id AS moduleId
     FROM sections s JOIN chapters c ON c.id = s.chapter_id
     WHERE s.direction = ?`
  ).all(track) as any[]
  const byTitle = new Map<string, any>()
  for (const r of rows) byTitle.set(String(r.title).trim(), r)
  return { rows, byTitle }
}

// 给里程碑里的 chapters 补上 { title, moduleId, chapterId }，匹配不到的降级为纯标签
function decorate(plan: any, track: string) {
  const { byTitle } = chapterIndex(track)
  const milestones = (plan?.milestones || []).map((m: any) => ({
    ...m,
    chapterLinks: (m.chapters || []).map((title: string) => {
      const hit = byTitle.get(String(title).trim())
      return hit
        ? { title, moduleId: hit.moduleId, chapterId: hit.id }
        : { title, moduleId: null, chapterId: null }
    })
  }))
  return { ...plan, milestones }
}

// 聚合用户最近交卷的薄弱点；opts.track 显式指定方向时按该方向组织内容
export async function getOrCreateStudyPlan(userId: string, opts: { force?: boolean; track?: string } = {}) {
  const force = !!opts.force
  const recs = sqlite.prepare(
    `SELECT track, weak_points FROM exam_records WHERE user_id=? ORDER BY created_at DESC LIMIT 20`
  ).all(userId) as any[]
  if (!recs.length) throw new NoRecordsError()

  const wanted = opts.track && VALID_TRACKS.includes(opts.track) ? opts.track : ''
  // 优先用「该方向」的答卷推导薄弱点；该方向还没做过卷，就退回全部答卷（仍能给出有依据的路径）
  const scoped = wanted ? recs.filter((r) => r.track === wanted) : recs
  const source = scoped.length ? scoped : recs

  const agg: Record<string, number> = {}
  const trackVotes: Record<string, number> = {}
  for (const r of source.slice(0, 5)) {
    trackVotes[r.track] = (trackVotes[r.track] || 0) + 1
    let wp: any[] = []
    try { wp = JSON.parse(r.weak_points || '[]') } catch { /* ignore */ }
    for (const w of wp) agg[w.tag] = (agg[w.tag] || 0) + (w.count || 1)
  }
  const weakPoints = Object.entries(agg).sort((a: any, b: any) => b[1] - a[1]).map(([tag, n]) => ({ tag, count: n }))
  const track = wanted || (Object.entries(trackVotes).sort((a: any, b: any) => b[1] - a[1])[0] || [])[0] || 'frontend'
  // 该方向没有自己的答卷时，标记为「跨方向推断」，前端会给出说明
  const inferred = !!wanted && !scoped.length

  const cached = sqlite.prepare(
    'SELECT * FROM study_plans WHERE user_id=? AND track=? ORDER BY created_at DESC LIMIT 1'
  ).get(userId, track) as any
  if (cached && !force && (Date.now() - cached.created_at) < PLAN_TTL_MS) {
    return {
      track,
      weakPoints: safeParse(cached.weak_points, []),
      plan: decorate(safeParse(cached.plan, { summary: '', milestones: [] }), track),
      cached: true,
      inferred,
      generatedAt: cached.created_at
    }
  }

  if (!llmEnabled()) throw new Error('AI 服务未配置（缺少 DEEPSEEK_API_KEY）')
  const { rows } = chapterIndex(track)
  const generated = await generatePlan(track, weakPoints, rows.map((r: any) => r.title))

  const now = Date.now()
  // 只清理该方向的旧计划，其它方向的缓存保留（切换方向时才不会每次都重新烧 token）
  sqlite.prepare('DELETE FROM study_plans WHERE user_id=? AND track=?').run(userId, track)
  sqlite.prepare('INSERT INTO study_plans (id,user_id,track,weak_points,plan,created_at) VALUES (?,?,?,?,?,?)')
    .run(uid('sp_'), userId, track, JSON.stringify(weakPoints), JSON.stringify(generated), now)

  return { track, weakPoints, plan: decorate(generated, track), cached: false, inferred, generatedAt: now }
}

async function generatePlan(track: string, weakPoints: any[], chapters: string[]) {
  const weakText = weakPoints.length
    ? weakPoints.map((w) => `- ${w.tag}（出现 ${w.count} 次）`).join('\n')
    : '（暂无明确薄弱点，请按方向通用进阶路径设计）'
  const chapText = chapters.length ? chapters.map((c) => '- ' + c).join('\n') : '（无）'
  const sys = `你是一位资深技术导师。根据候选人在「${trackName(track)}」方向的模拟考试薄弱点，为其定制个性化学习路径。
薄弱知识点（按出现频次排序）：
${weakText}
该方向学习中心已有章节主题（请从这些真实章节名中筛选，不要编造）：
${chapText}

请严格只输出如下 JSON（不要额外文字、不要代码块标记）：
{"summary":"<整体评价与策略，2-4句中文>","milestones":[{"title":"<阶段名，如「夯实基础」>","chapters":["<从上面章节中选的真实章节名>"],"focus":"<本阶段针对的薄弱点>","tasks":["<具体学习任务1>","<任务2>"],"interviewGoal":"<该阶段适合的 AI 模拟面试主题，10 字以内>"}]}
要求：milestones 按学习顺序排列（3-5 个阶段），每个阶段聚焦部分薄弱点，chapters 名称必须来自给定列表。`
  const text = await getLlm().chat(
    [{ role: 'system', content: sys }, { role: 'user', content: '请生成学习计划。' }],
    { temperature: 0.7, maxTokens: 1500 }
  )
  const parsed = parseJsonBlock(text)
  if (!parsed || !Array.isArray(parsed.milestones)) throw new Error('AI 返回格式异常，请稍后重试')
  return parsed
}

function safeParse(s: any, d: any) { try { return JSON.parse(s) } catch { return d } }
