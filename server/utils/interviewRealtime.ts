// P3 实时流式面试：编排核心（独立 server utils，供 ws.ts 路由经 Nitro 自动导入后调用）。
//
// 设计取舍（与 docs/interview-realtime-plan.md 对齐）：
// - 复用 answerInterview 完成「评分 + 下一题」的权威逻辑，**不重复实现评分/落库**。
// - 把返回的结构化评测拼成自然口播文案，再按句流式 TTS 推音频。
// - 单轮只发 1 次 LLM（评分），完全复用现有评分/落库；"流式感"来自句级 TTS + 逐句字幕。
// - 真·LLM token 流式（chatStream 逐字播）会额外增加一次 LLM 调用、抬高延迟与成本，
//   本期不引入；chatStream 仍保留供其他场景（后续增强）使用。
//
// 本文件属 server/utils，可相对 import 同目录模块；路由 ws.ts 则通过自动导入调用本文件导出。

import { answerInterview } from './interview'
import { getTts, splitSentences } from './speech'

export type RealtimeState = 'LISTENING' | 'THINKING' | 'SPEAKING' | 'CLOSED'

export interface RealtimeConn {
  userId: string
  sessionId: string
  state: RealtimeState
  ttsCancelled: boolean
}

export function createRealtimeConn(userId: string, sessionId: string): RealtimeConn {
  return { userId, sessionId, state: 'LISTENING', ttsCancelled: false }
}

export interface RealtimeEval {
  evaluation: { score: number; feedback: string }
  analysis: string
  nextQuestion: string
  isLast: boolean
  score: number
  summary: string | null
}

// 把结构化评测拼成口播文案：反馈 + 答案解析 + 下一题（结束轮用整体总结）。
// 每个片段后补句号，确保 splitSentences 能正确断句；避免把未标点片段黏成一句。
function buildNarration(evalRes: RealtimeEval): string {
  const parts: string[] = []
  if (evalRes.evaluation?.feedback) parts.push(evalRes.evaluation.feedback)
  if (evalRes.analysis) parts.push(evalRes.analysis)
  const tail = evalRes.isLast ? (evalRes.summary || '') : evalRes.nextQuestion
  if (tail && tail.trim()) parts.push(tail)
  let narration = ''
  for (const p of parts) {
    const t = (p || '').trim()
    if (!t) continue
    narration += t
    if (!/[。！？!?.?；;]$/.test(t)) narration += '。'
  }
  return narration.trim() || '好的，我们继续下一题。'
}

export interface RealtimeCallbacks {
  // 发送一条协议消息给前端（ws.ts 注入 peer.send 包装）
  send: (msg: unknown) => void
}

// 处理一轮 speech_final：评分 → 推结构化评测卡 → 流式口播 + 音频 → turn_end。
// 并发的 barge_in / speech_start 消息会把 conn.ttsCancelled 置 true，本函数在「句边界」与
// 「每块音频产出后」检查并中断在播 TTS，实现打断。
export async function handleSpeechFinal(
  conn: RealtimeConn,
  text: string,
  cb: RealtimeCallbacks
): Promise<RealtimeEval | { error: string }> {
  conn.ttsCancelled = false
  conn.state = 'THINKING'

  let evalRes: RealtimeEval
  try {
    const r = await answerInterview(conn.userId, { sessionId: conn.sessionId, answer: text })
    evalRes = r as RealtimeEval
  } catch (e: any) {
    conn.state = 'LISTENING'
    const msg = e?.statusMessage || e?.message || '评测失败'
    cb.send({ type: 'error', message: msg })
    return { error: msg }
  }

  // 结构化评测卡（前端展示分数/反馈/解析/是否结束），与口播解耦，便于 UI 独立渲染。
  cb.send({
    type: 'turn_eval',
    evaluation: evalRes.evaluation,
    analysis: evalRes.analysis,
    nextQuestion: evalRes.nextQuestion,
    isLast: evalRes.isLast,
    score: evalRes.score,
    summary: evalRes.summary
  })

  // 极少数：THINKING（评测）期间被 barge → 跳过口播，直接回到 LISTENING。
  if (conn.ttsCancelled) {
    conn.state = 'LISTENING'
    return evalRes
  }

  conn.state = 'SPEAKING'
  const narration = buildNarration(evalRes)
  const tts = getTts()
  for (const sent of splitSentences(narration)) {
    if (conn.ttsCancelled) break
    cb.send({ type: 'ai_token', text: sent })
    try {
      for await (const c of tts.synthesizeStream(sent)) {
        if (conn.ttsCancelled) break
        cb.send({ type: 'audio', data: c.chunk.toString('base64'), mime: c.mime, ext: c.ext })
      }
    } catch (e: any) {
      // TTS 失败不阻断对话（前端可用浏览器本地合成兜底），仅回错误由前端决定是否提示。
      cb.send({ type: 'error', message: 'TTS 合成失败：' + (e?.message || e) })
    }
    if (conn.ttsCancelled) break
  }

  conn.state = 'LISTENING'
  // 被打断时不发 turn_end（轮未自然结束）；自然说完才发，前端据此切回"听你说话"态。
  if (!conn.ttsCancelled) cb.send({ type: 'turn_end' })
  return evalRes
}

// 处理打断：取消在播 TTS，返回打断前是否处于 SPEAKING（供日志/统计）。
// 由调用方在收到 barge_in / speech_start 时调用，并随后回 barge_ack。
export function handleBarge(conn: RealtimeConn): boolean {
  const wasSpeaking = conn.state === 'SPEAKING'
  conn.ttsCancelled = true
  return wasSpeaking
}
