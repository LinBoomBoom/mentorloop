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

// 去除不可见/零宽字符（LLM 偶发注入，会导致 JSON.parse 失败）
function stripInvisible(s: string): string {
  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number
    if (cp === 0xfeff || cp === 0x200b || cp === 0x200c || cp === 0x200d) continue
    if (cp < 0x20 && ch !== '\n' && ch !== '\r' && ch !== '\t') continue
    out += ch
  }
  return out
}

// 已知字段键：用于「按下一个键边界」截取字符串值，从而容忍值内未转义双引号
const FIELD_KEYS = ['evaluation', 'score', 'feedback', 'analysis', 'nextQuestion', 'isLast', 'overall', 'overallScore']

// 从文本中抓取某个字段的值（字符串/数字/布尔）。
// 字符串值截取到「下一个已知字段键」为止，而非依赖闭合引号——这样即使值内部含有
// 未转义双引号（Deepseek 偶发行为）也能正确提取。
function grabField(t: string, key: string): { v: string | undefined; kind: 'str' | 'num' | 'bool' | 'none' } {
  const kStart = t.indexOf('"' + key + '"')
  if (kStart < 0) return { v: undefined, kind: 'none' }
  const colon = t.indexOf(':', kStart + key.length + 2)
  if (colon < 0) return { v: undefined, kind: 'none' }
  let i = colon + 1
  while (i < t.length && (t[i] === ' ' || t[i] === '\n' || t[i] === '\t' || t[i] === '\r')) i++
  if (t[i] === '"') {
    let j = i + 1
    let end = t.length
    for (const k of FIELD_KEYS) {
      if (k === key) continue
      const idx = t.indexOf('"' + k + '"', j)
      if (idx >= 0 && idx < end) end = idx
    }
    let val = t.slice(j, end).replace(/^[\s]+/, '').replace(/[\s]+$/, '')
    if (val.endsWith('"')) val = val.slice(0, -1)
    val = val.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    return { v: val, kind: 'str' }
  }
  const m = t.slice(i).match(/^(-?\d+(?:\.\d+)?|true|false)/)
  if (m) return { v: m[1], kind: m[1] === 'true' || m[1] === 'false' ? 'bool' : 'num' }
  return { v: undefined, kind: 'none' }
}

// 宽松提取：严格 JSON.parse 失败时，尽力从文本恢复关键字段（应对值内未转义双引号等偶发非法输出）
function looseExtract(t: string): any {
  const scoreF = grabField(t, 'score')
  const fbF = grabField(t, 'feedback')
  const analysis = grabField(t, 'analysis').v
  const nextQuestion = grabField(t, 'nextQuestion').v
  const isLastF = grabField(t, 'isLast')
  const overall = grabField(t, 'overall').v
  const overallScoreF = grabField(t, 'overallScore')
  return {
    evaluation: {
      score: scoreF.kind === 'num' ? Number(scoreF.v) : undefined,
      feedback: fbF.v
    },
    analysis,
    nextQuestion,
    isLast: isLastF.kind === 'bool' ? isLastF.v === 'true' : undefined,
    overall,
    overallScore: overallScoreF.kind === 'num' ? Number(overallScoreF.v) : undefined
  }
}

// 健壮提取 JSON：剥离代码块标记，截取首个 { ... } 末个 }，失败则宽松兜底
export function parseJsonBlock(text: string): any {
  if (!text) return null
  let t = stripInvisible(String(text).trim())
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const s = t.indexOf('{')
  const e = t.lastIndexOf('}')
  if (s >= 0 && e > s) t = t.slice(s, e + 1)
  try { return JSON.parse(t) } catch { /* fallthrough to loose */ }
  const loose = looseExtract(t)
  if (loose && (loose.evaluation || loose.nextQuestion || loose.analysis)) return loose
  return null
}
function stripFences(text: string): string {
  if (!text) return ''
  let t = String(text).trim()
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  return t
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }

const systemPromptCache = new Map<string, string>()
const SYSTEM_PROMPT_CACHE_CAP = 256 // 防止 goal 为自由文本导致键值无限增长
function systemPrompt(track: string, level: string, goal: string): string {
  // 记忆化：相同 (track,level,goal) 返回字节级一致的 system 字符串，
  // 确保 Deepseek 前缀缓存键稳定（同组合跨用户复用）。goal 多为空，组合空间很小。
  const key = `${track}|${level}|${goal}`
  const cached = systemPromptCache.get(key)
  if (cached) return cached
  if (systemPromptCache.size >= SYSTEM_PROMPT_CACHE_CAP) systemPromptCache.clear()
  const p = `你是一位资深${trackName(track)}${levelName(level)}技术面试官，正在对候选人进行模拟技术面试。
面试规则：
- 每次只问一道题，等待候选人回答。
- 候选人回答后，先给出该回答的评分（score，0-10 整数）与简短改进建议（feedback，中文 2-3 句；字符串内如需举例请用单引号 ' 或《》，不要用双引号）。
- 同时给出本题的答案解析（analysis，中文 2-4 句：点明核心知识点与理想回答要点，便于候选人查漏补缺；无论候选人答得如何都必须提供，禁止留空）。
- 然后根据表现与进度提出下一道题（nextQuestion，具体、可考察深度、必须是非空字符串）。
- **重要约束**：无论候选人回答好坏（包括"不会""不知道""没学过"等情况），只要本场面试尚未结束（isLast 不为 true），都必须输出一个具体的、非空的 nextQuestion；严禁将 nextQuestion 设为空字符串或省略该字段。
- 题目覆盖该方向核心知识点，难度循序渐进，避免与已问题目重复。
- 必须在第 ${INTERVIEW_MAX_TURNS} 题之后结束面试；结束的那一轮把 isLast 设为 true，并额外给出整体评价（overall，中文 3-5 句）与综合评分（overallScore，0-100 整数）。
${goal ? '候选人目标岗位/方向：' + goal + '。' : ''}
**JSON 格式铁律**：所有字符串值（feedback、analysis、nextQuestion 等）内严禁出现未转义的双引号；如需引用请使用单引号 ' 或中文书名号《》。任何值内的双引号都会导致 JSON 解析失败。
始终用中文。严格只输出如下 JSON（不要任何额外文字、不要代码块标记）：
{"evaluation":{"score":<0-10整数>,"feedback":"<中文>"},"analysis":"<上一题答案解析，中文>","nextQuestion":"<下一题，非空；结束时为空串>","isLast":<true/false>,"overall":"<仅结束轮填写>","overallScore":<仅结束轮填写 0-100整数>}`
  systemPromptCache.set(key, p)
  return p
}

// BUG-6：原自由生成的首题在 Deepseek 下高度收敛到「自我介绍」，导致每天首次打开题目几乎相同。
// 改为从真实题库按方向+难度随机抽取首题，保证具体技术问题、每天不同、且与后续 AI 追问自然衔接。
function pickFirstQuestionFromBank(track: string, level: string): string | null {
  // 难度映射：初级偏基础(easy)，中级覆盖基础/较难，高级偏较难/困难
  const diffs: Record<string, string[]> = {
    junior: ['easy'],
    mid: ['easy', 'medium'],
    senior: ['medium', 'hard']
  }
  const wanted = diffs[level] || diffs.mid
  const inClause = wanted.map(() => '?').join(',')
  const row = sqlite.prepare(
    `SELECT q FROM interview_questions WHERE track=? AND type='hot' AND difficulty IN (${inClause}) ORDER BY RANDOM() LIMIT 1`
  ).get(track, ...wanted) as any
  return row?.q || null
}

async function generateFirstQuestion(track: string, level: string, goal: string): Promise<string> {
  const bankQ = pickFirstQuestionFromBank(track, level)
  if (bankQ) return bankQ
  // 题库无匹配时降级为 LLM 生成（保留原能力）
  const sys = `你是一位资深${trackName(track)}${levelName(level)}技术面试官。请直接提出本次模拟面试的第一道题目。要求：题目具体、可考察基础与深度，只输出题目本身（1-3 句话），不要评分、不要额外说明、不要使用代码块标记。${goal ? '候选人目标岗位/方向：' + goal + '。' : ''}`
  const text = await getLlm().chat(
    [{ role: 'system', content: sys }, { role: 'user', content: '请开始。' }],
    { temperature: 0.9, maxTokens: 400 }
  )
  return stripFences(text) || '请先做一下自我介绍，并简述你最近做过的一个项目。'
}

async function callEval(llmMessages: any[]): Promise<any> {
  const text = await getLlm().chat(llmMessages, { temperature: 0.5, maxTokens: 1500 })
  return parseJsonBlock(text)
}

// 开启一场新面试（生成首题 + 落库）
export async function startInterview(userId: string, opts: { track?: string; level?: string; goal?: string; mode?: string; consentAt?: number }) {
  if (!llmEnabled()) throw new Error('AI 服务未配置（缺少 DEEPSEEK_API_KEY）')
  const track = opts.track || 'frontend'
  const level = opts.level || 'mid'
  const goal = opts.goal || ''
  // 模式：text（默认回合制）/ voice / video / realtime（P3 实时流式 WebSocket）。
  // realtime 作为独立第四种 mode，便于数据分析与灰度，不与 voice 合并。
  const mode = (opts.mode === 'voice' || opts.mode === 'video' || opts.mode === 'realtime') ? opts.mode : 'text'
  const consentAt = opts.consentAt || null
  const question = await generateFirstQuestion(track, level, goal)
  const id = uid('iv_')
  const now = Date.now()
  const messages = [{ role: 'assistant', content: question }]
  sqlite.prepare(`INSERT INTO interview_sessions (id,user_id,track,level,goal,status,messages,turns,created_at,updated_at,mode,consent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, userId, track, level, goal || null, 'active', JSON.stringify(messages), 0, now, now, mode, consentAt)
  return { sessionId: id, question, mode }
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
    llmMessages.push({ role: 'user', content: "你必须且只能输出一个严格合法的 JSON 对象。特别注意：所有字符串值（feedback、analysis、nextQuestion）中不要使用双引号，如需引用请用单引号 ' 或《》。不要任何额外文字或代码块标记，也不要使用 Markdown 代码块。" })
    parsed = await callEval(llmMessages)
  }
  if (!parsed || !parsed.evaluation) throw new Error('AI 返回格式异常，请稍后重试')

  const evalObj = parsed.evaluation || {}
  const score = clamp(Number(evalObj.score) || 0, 0, 10)
  const feedback = String(evalObj.feedback || '')
  let nextQuestion = String(parsed.nextQuestion || '')
  let analysis = String(parsed.analysis || '')
  const turns = sess.turns + 1
  const isLast = !!parsed.isLast || turns >= INTERVIEW_MAX_TURNS

  // 兜底：非结束轮必须给出下一题，避免「不会」等回答导致对话卡死
  if (!isLast && !nextQuestion.trim()) {
    llmMessages.push({ role: 'user', content: '请立即输出下一道具体题目，填入 nextQuestion 字段（不要留空）。只输出 JSON。' })
    const retry = await callEval(llmMessages)
    if (retry && retry.nextQuestion) nextQuestion = String(retry.nextQuestion)
  }
  if (!isLast && !nextQuestion.trim()) {
    nextQuestion = `我们换个角度继续。请结合你${trackName(sess.track)}方向的实际经验，挑一个你常用的技术点，讲讲它的原理和你踩过的坑。`
  }
  // 兜底：必须提供答案解析（含结束轮的最后一道题），避免偶发缺失导致「上一题无解析」
  if (!analysis.trim()) {
    llmMessages.push({ role: 'user', content: '请补充上一题的答案解析，填入 analysis 字段（中文 2-4 句，点明核心知识点与理想回答要点），不要留空。只输出 JSON。' })
    const retryA = await callEval(llmMessages)
    if (retryA && retryA.analysis) analysis = String(retryA.analysis)
  }
  // 最终安全网：若 LLM 仍无解析（极端偶发），给出通用提示，保证前端始终有内容可展示
  if (!analysis.trim()) {
    analysis = '（本题自动解析暂未生成，建议结合该方向核心知识点自行梳理要点；如需详细解析可重新回答本题或稍后重试。）'
  }

  const scores = messages.filter((m: any) => m.score != null).map((m: any) => m.score)
  scores.push(score)
  const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
  let finalScore = parsed.overallScore != null ? clamp(Number(parsed.overallScore), 0, 100) : Math.round(avg * 10)
  let summary = parsed.overall ? String(parsed.overall) : ''

  const assistantContent = isLast ? '' : '下一题：' + nextQuestion
  messages.push({ role: 'assistant', content: assistantContent, score, feedback, analysis })

  const now = Date.now()
  const status = isLast ? 'done' : 'active'
  if (isLast && !summary) summary = '面试已完成，建议结合下方逐题反馈针对性补强。'
  sqlite.prepare(`UPDATE interview_sessions SET messages=?, turns=?, status=?, score=?, summary=?, updated_at=?, finished_at=? WHERE id=?`)
    .run(JSON.stringify(messages), turns, status, finalScore, summary || null, now, isLast ? now : null, sessionId)

  return {
    evaluation: { score, feedback },
    analysis,
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
