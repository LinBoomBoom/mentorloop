// H1 · AI 深度模拟面试：多轮对话 + 逐题评分 + 学习路径联动
// 业务层只依赖 getLlm().chat()，密钥缺失时优雅降级。
// 注意：本文件属 server/utils，可被路由自动导入，也可被测试直接相对引用。
import { getLlm, llmEnabled } from './llm'
import { sqlite, uid } from './db'
import { createError } from 'h3'

export const INTERVIEW_MAX_TURNS = 6

const TRACK_NAMES: Record<string, string> = {
  frontend: '前端', backend: '后端', devops: '运维/DevOps', ai: 'AI 工程'
}
const LEVEL_NAMES: Record<string, string> = {
  junior: '初级', mid: '中级', senior: '高级'
}
export function trackName(t: string) { return TRACK_NAMES[t] || t || '通用' }
export function levelName(l: string) { return LEVEL_NAMES[l] || l || '中级' }

// 健壮提取 JSON：剥离代码块标记，截取首个 { ... } 末个 }
export function parseJsonBlock(text: string): any {
  if (!text) return null
  let t = String(text).trim()
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const s = t.indexOf('{')
  const e = t.lastIndexOf('}')
  if (s >= 0 && e > s) t = t.slice(s, e + 1)
  try { return JSON.parse(t) } catch { return null }
}
function stripFences(text: string): string {
  if (!text) return ''
  let t = String(text).trim()
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  return t
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }

function systemPrompt(track: string, level: string, goal: string): string {
  return `你是一位资深${trackName(track)}${levelName(level)}技术面试官，正在对候选人进行模拟技术面试。
面试规则：
- 每次只问一道题，等待候选人回答。
- 候选人回答后，先给出该回答的评分（score，0-10 整数）与简短改进建议（feedback，中文 2-3 句）。
- 然后根据表现与进度提出下一道题（nextQuestion，具体、可考察深度）。
- 题目覆盖该方向核心知识点，难度循序渐进，避免与已问题目重复。
- 必须在第 ${INTERVIEW_MAX_TURNS} 题之后结束面试；结束的那一轮把 isLast 设为 true，并额外给出整体评价（overall，中文 3-5 句）与综合评分（overallScore，0-100 整数）。
${goal ? '候选人目标岗位/方向：' + goal + '。' : ''}
始终用中文。严格只输出如下 JSON（不要任何额外文字、不要代码块标记）：
{"evaluation":{"score":<0-10整数>,"feedback":"<中文>"},"nextQuestion":"<下一题，结束时为空串>","isLast":<true/false>,"overall":"<仅结束轮填写>","overallScore":<仅结束轮填写 0-100整数>}`
}

async function generateFirstQuestion(track: string, level: string, goal: string): Promise<string> {
  const sys = `你是一位资深${trackName(track)}${levelName(level)}技术面试官。请直接提出本次模拟面试的第一道题目。要求：题目具体、可考察基础与深度，只输出题目本身（1-3 句话），不要评分、不要额外说明、不要使用代码块标记。${goal ? '候选人目标岗位/方向：' + goal + '。' : ''}`
  const text = await getLlm().chat(
    [{ role: 'system', content: sys }, { role: 'user', content: '请开始。' }],
    { temperature: 0.8, maxTokens: 400 }
  )
  return stripFences(text) || '请做一下自我介绍，并简述你最近做过的一个项目。'
}

async function callEval(llmMessages: any[]): Promise<any> {
  const text = await getLlm().chat(llmMessages, { temperature: 0.5, maxTokens: 1200 })
  return parseJsonBlock(text)
}

// 开启一场新面试（生成首题 + 落库）
export async function startInterview(userId: string, opts: { track?: string; level?: string; goal?: string }) {
  if (!llmEnabled()) throw new Error('AI 服务未配置（缺少 DEEPSEEK_API_KEY）')
  const track = opts.track || 'frontend'
  const level = opts.level || 'mid'
  const goal = opts.goal || ''
  const question = await generateFirstQuestion(track, level, goal)
  const id = uid('iv_')
  const now = Date.now()
  const messages = [{ role: 'assistant', content: question }]
  sqlite.prepare(`INSERT INTO interview_sessions (id,user_id,track,level,goal,status,messages,turns,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, userId, track, level, goal || null, 'active', JSON.stringify(messages), 0, now, now)
  return { sessionId: id, question }
}

// 提交一道回答：评分 + 下一题（或结束）
export async function answerInterview(userId: string, body: { sessionId?: string; answer?: string }) {
  const sessionId = body.sessionId
  const answer = body.answer
  if (!sessionId) throw createError({ statusCode: 400, statusMessage: '缺少 sessionId' })
  const sess = sqlite.prepare('SELECT * FROM interview_sessions WHERE id=?').get(sessionId) as any
  if (!sess || sess.user_id !== userId) throw createError({ statusCode: 404, statusMessage: '会话不存在' })
  if (sess.status === 'done') throw createError({ statusCode: 409, statusMessage: '面试已结束' })
  if (!answer || !String(answer).trim()) throw new Error('回答不能为空')

  const messages = JSON.parse(sess.messages || '[]')
  messages.push({ role: 'user', content: String(answer).slice(0, 4000) })

  const sys = systemPrompt(sess.track, sess.level, sess.goal)
  const llmMessages = [{ role: 'system', content: sys }, ...messages.map((m: any) => ({ role: m.role, content: m.content }))]
  let parsed = await callEval(llmMessages)
  if (!parsed) {
    llmMessages.push({ role: 'user', content: '你必须且只能输出一个 JSON 对象，不要任何额外文字或代码块标记。' })
    parsed = await callEval(llmMessages)
  }
  if (!parsed || !parsed.evaluation) throw new Error('AI 返回格式异常，请稍后重试')

  const evalObj = parsed.evaluation || {}
  const score = clamp(Number(evalObj.score) || 0, 0, 10)
  const feedback = String(evalObj.feedback || '')
  const nextQuestion = String(parsed.nextQuestion || '')
  const turns = sess.turns + 1
  const isLast = !!parsed.isLast || turns >= INTERVIEW_MAX_TURNS
  const scores = messages.filter((m: any) => m.score != null).map((m: any) => m.score)
  scores.push(score)
  const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
  let finalScore = parsed.overallScore != null ? clamp(Number(parsed.overallScore), 0, 100) : Math.round(avg * 10)
  let summary = parsed.overall ? String(parsed.overall) : ''

  const assistantContent = (feedback ? feedback + '\n\n' : '') + (isLast ? '' : '下一题：' + nextQuestion)
  messages.push({ role: 'assistant', content: assistantContent, score, feedback })

  const now = Date.now()
  const status = isLast ? 'done' : 'active'
  if (isLast && !summary) summary = '面试已完成，建议结合下方逐题反馈针对性补强。'
  sqlite.prepare(`UPDATE interview_sessions SET messages=?, turns=?, status=?, score=?, summary=?, updated_at=?, finished_at=? WHERE id=?`)
    .run(JSON.stringify(messages), turns, status, finalScore, summary || null, now, isLast ? now : null, sessionId)

  return {
    evaluation: { score, feedback },
    nextQuestion: isLast ? '' : nextQuestion,
    isLast,
    turns,
    score: finalScore,
    summary: isLast ? summary : null
  }
}

export function getInterview(id: string, userId: string) {
  const s = sqlite.prepare('SELECT * FROM interview_sessions WHERE id=?').get(id) as any
  if (!s || s.user_id !== userId) return null
  return {
    id: s.id, track: s.track, level: s.level, goal: s.goal, status: s.status,
    turns: s.turns, score: s.score, summary: s.summary,
    messages: JSON.parse(s.messages || '[]'), createdAt: s.created_at, finishedAt: s.finished_at
  }
}

export function listInterviews(userId: string) {
  const rows = sqlite.prepare('SELECT id,track,level,status,turns,score,created_at FROM interview_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(userId)
  return rows.map((r: any) => ({ id: r.id, track: r.track, level: r.level, status: r.status, turns: r.turns, score: r.score, createdAt: r.created_at }))
}
