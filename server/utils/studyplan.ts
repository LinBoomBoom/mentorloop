// H2 · 个性化学习路径定制：复用交卷 weak_points，调用大模型生成有序学习路径
// 带 7 天缓存，避免重复消耗 LLM 额度。
import { getLlm, llmEnabled } from './llm'
import { sqlite, uid } from './db'
import { parseJsonBlock } from './interview'

const TRACK_NAMES: Record<string, string> = {
  frontend: '前端', backend: '后端', devops: '运维/DevOps', ai: 'AI 工程'
}
function trackName(t: string) { return TRACK_NAMES[t] || t || '通用' }
const PLAN_TTL_MS = 7 * 86400000

export class NoRecordsError extends Error {
  constructor() { super('NO_RECORDS'); this.name = 'NoRecordsError' }
}

// 聚合用户最近 5 次交卷的薄弱点，取主方向；有缓存且未过期则直接返回
export async function getOrCreateStudyPlan(userId: string, opts: { force?: boolean } = {}) {
  const force = !!opts.force
  const recs = sqlite.prepare(`SELECT track, weak_points FROM exam_records WHERE user_id=? ORDER BY created_at DESC LIMIT 5`).all(userId) as any[]
  if (!recs.length) throw new NoRecordsError()

  const agg: Record<string, number> = {}
  const trackVotes: Record<string, number> = {}
  for (const r of recs) {
    trackVotes[r.track] = (trackVotes[r.track] || 0) + 1
    let wp: any[] = []
    try { wp = JSON.parse(r.weak_points || '[]') } catch { /* ignore */ }
    for (const w of wp) agg[w.tag] = (agg[w.tag] || 0) + (w.count || 1)
  }
  const weakPoints = Object.entries(agg).sort((a: any, b: any) => b[1] - a[1]).map(([tag, n]) => ({ tag, count: n }))
  const track = (Object.entries(trackVotes).sort((a: any, b: any) => b[1] - a[1])[0] || [])[0] || 'frontend'

  const cached = sqlite.prepare('SELECT * FROM study_plans WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(userId) as any
  if (cached && !force && (Date.now() - cached.created_at) < PLAN_TTL_MS) {
    return {
      track: cached.track,
      weakPoints: safeParse(cached.weak_points, []),
      plan: safeParse(cached.plan, { summary: '', milestones: [] }),
      cached: true
    }
  }

  if (!llmEnabled()) throw new Error('AI 服务未配置（缺少 DEEPSEEK_API_KEY）')
  const chapters = (sqlite.prepare(`SELECT DISTINCT c.title FROM sections s JOIN chapters c ON c.id=s.chapter_id WHERE s.direction=?`).all(track) as any[]).map((x: any) => x.title)
  const generated = await generatePlan(track, weakPoints, chapters)

  sqlite.prepare('DELETE FROM study_plans WHERE user_id=?').run(userId)
  sqlite.prepare('INSERT INTO study_plans (id,user_id,track,weak_points,plan,created_at) VALUES (?,?,?,?,?,?)')
    .run(uid('sp_'), userId, track, JSON.stringify(weakPoints), JSON.stringify(generated), Date.now())

  return { track, weakPoints, plan: generated, cached: false }
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
{"summary":"<整体评价与策略，2-4句中文>","milestones":[{"title":"<阶段名，如「夯实基础」>","chapters":["<从上面章节中选的真实章节名>"],"focus":"<本阶段针对的薄弱点>","tasks":["<具体学习任务1>","<任务2>"]}]}
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
