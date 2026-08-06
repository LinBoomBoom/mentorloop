// H3 · AI 简历诊断：接收简历文本，调用大模型给出结构化诊断（亮点/短板/改进/匹配方向）
// 复用 getLlm().chat + parseJsonBlock；同内容 7 天缓存，避免重复消耗 LLM 额度。
import crypto from 'node:crypto'
import { getLlm, llmEnabled } from './llm'
import { sqlite, uid } from './db'
import { parseJsonBlock } from './interview'
import { redactSensitive, type RedactReport } from './pii'

const emptyRedact = (): RedactReport => ({ phone: 0, idCard: 0, email: 0, wechat: 0, address: 0, bankCard: 0, total: 0 })

const DIAG_TTL_MS = 7 * 86400000
const MAX_LEN = 8000

export class ResumeTooShortError extends Error {
  constructor() { super('RESUME_TOO_SHORT'); this.name = 'ResumeTooShortError' }
}
export class LlmUnavailableError extends Error {
  constructor() { super('LLM_UNAVAILABLE'); this.name = 'LlmUnavailableError' }
}

export async function diagnoseResume(userId: string, resumeRaw: string) {
  const resume = String(resumeRaw || '').trim()
  if (resume.length < 50) throw new ResumeTooShortError()
  if (resume.length > MAX_LEN) throw new Error(`简历过长，请控制在 ${MAX_LEN} 字以内（当前 ${resume.length}）`)

  // 主动脱敏：先过滤敏感信息，再送大模型；哈希/落库均基于脱敏文本，避免留存原始 PII。
  const redacted = redactSensitive(resume)
  const safeText = redacted.text

  // 基于脱敏文本计算哈希：仅敏感信息不同的两份简历可命中同一缓存，省额度也更隐私。
  const hash = crypto.createHash('sha256').update(safeText).digest('hex')
  const cached = sqlite.prepare('SELECT * FROM resume_diags WHERE content_hash=? ORDER BY created_at DESC LIMIT 1').get(hash) as any
  if (cached && (Date.now() - cached.created_at) < DIAG_TTL_MS) {
    const parsed = safeParse(cached.result, emptyResult())
    return { ...parsed, cached: true, redacted: (parsed.redacted as RedactReport) || emptyRedact() }
  }

  if (!llmEnabled()) throw new LlmUnavailableError()

  const sys = `你是一位资深技术招聘顾问与简历优化专家。请对候选人的简历进行专业诊断。
注意：简历中的手机号、身份证、邮箱、住址、微信/QQ、银行卡等敏感信息已被替换为「[xxx已隐藏]」占位符，请勿对其做推断或分析，只针对可见的技能、项目、经历与结构给出建议。
请从以下维度评估并严格只输出 JSON（不要额外文字、不要代码块标记）：
{"score":<0-100整数，综合评分>,"structure":"<简历结构/排版评价，2-3句中文>","strengths":["<亮点1>","<亮点2>"],"weaknesses":["<短板1>","<短板2>"],"improvements":["<具体可落地的改进建议1>","<建议2>"],"matchDirection":"<建议主攻的求职方向/岗位>","summary":"<整体诊断总结，3-4句中文>"}
要求：亮点与短板各 2-4 条，改进建议要具体（给出写法/量化/项目包装等方向）；全部用中文。`
  const text = await getLlm().chat(
    [{ role: 'system', content: sys }, { role: 'user', content: '以下是我的简历：\n' + safeText }],
    { temperature: 0.6, maxTokens: 1600 }
  )
  const parsed = parseJsonBlock(text)
  if (!parsed || typeof parsed.score !== 'number') throw new Error('AI 返回格式异常，请稍后重试')
  const result = normalize(parsed)
  const out = { ...result, redacted: redacted.report }

  sqlite.prepare('INSERT INTO resume_diags (id,user_id,content_hash,content,result,created_at) VALUES (?,?,?,?,?,?)')
    .run(uid('rd_'), userId, hash, safeText.slice(0, 20000), JSON.stringify(out), Date.now())

  return { ...out, cached: false }
}

function normalize(p: any) {
  return {
    score: Math.max(0, Math.min(100, Number(p.score) || 0)),
    structure: String(p.structure || ''),
    strengths: arr(p.strengths),
    weaknesses: arr(p.weaknesses),
    improvements: arr(p.improvements),
    matchDirection: String(p.matchDirection || ''),
    summary: String(p.summary || '')
  }
}
function arr(x: any): string[] {
  if (!Array.isArray(x)) return []
  return x.map((s: any) => String(s)).filter(Boolean).slice(0, 8)
}
function safeParse(s: any, d: any) { try { return JSON.parse(s) } catch { return d } }
function emptyResult() {
  return { score: 0, structure: '', strengths: [], weaknesses: [], improvements: [], matchDirection: '', summary: '' }
}
