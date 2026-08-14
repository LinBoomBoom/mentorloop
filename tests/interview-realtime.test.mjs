import { describe, it, expect, vi, beforeEach } from 'vitest'

// 编排核心纯逻辑测试：mock 掉 answerInterview（真实 LLM 评分）与 getTts（真实 TTS 二进制），
// 只验证状态机、协议消息顺序、barge-in 中断行为。路由 ws.ts 依赖 Nitro 自动导入，在纯 node vitest 下不测，
// 由 server-imports 闸门 + esbuild 打包闸门保证其可解析。

// splitSentences 复制真实实现，使断句行为与生产一致
function realSplit(text) {
  const parts = text.split(/(?<=[。！？!?；;\n])/)
  const out = []
  for (const p of parts) { const t = p.trim(); if (t) out.push(t) }
  return out.length ? out : [text]
}

vi.mock('../server/utils/interview', () => ({
  answerInterview: vi.fn()
}))
vi.mock('../server/utils/speech', () => {
  const provider = {
    name: 'mock',
    // 默认：每句产出一个音频块（base64 前带 AUDIO: 便于断言）
    synthesizeStream: async function* (s) {
      yield { chunk: Buffer.from('AUDIO:' + s), mime: 'audio/wav', ext: 'wav' }
    }
  }
  return { splitSentences: realSplit, getTts: () => provider }
})

const { handleSpeechFinal, handleBarge, createRealtimeConn } = await import('../server/utils/interviewRealtime')
const { answerInterview } = await import('../server/utils/interview')
const { getTts } = await import('../server/utils/speech')

const EVAL = {
  evaluation: { score: 8, feedback: '回答不错。' },
  analysis: '核心是闭包与作用域。',
  nextQuestion: '那讲讲原型链？',
  isLast: false,
  score: 80,
  summary: null
}
const EVAL_LAST = {
  evaluation: { score: 7, feedback: '整体尚可。' },
  analysis: '最后一道题涉及事件循环。',
  nextQuestion: '',
  isLast: true,
  score: 75,
  summary: '面试结束，建议巩固异步与闭包。'
}

function collect(conn, text) {
  const msgs = []
  return { msgs, promise: handleSpeechFinal(conn, text, { send: (m) => msgs.push(m) }) }
}

beforeEach(() => {
  answerInterview.mockReset()
})

describe('handleSpeechFinal 正常轮', () => {
  it('评分 → 推 turn_eval → 逐句 ai_token+audio → turn_end', async () => {
    answerInterview.mockResolvedValue(EVAL)
    const conn = createRealtimeConn('u1', 's1')
    const { msgs, promise } = collect(conn, '我的回答')
    await promise

    expect(msgs[0].type).toBe('turn_eval')
    expect(msgs[0].evaluation.score).toBe(8)
    expect(msgs[0].isLast).toBe(false)

    // 口播文案 = 反馈 + 解析 + 下一题 → 3 句
    const aiTokens = msgs.filter((m) => m.type === 'ai_token')
    const audios = msgs.filter((m) => m.type === 'audio')
    expect(aiTokens.length).toBe(3)
    expect(aiTokens.map((m) => m.text)).toEqual(['回答不错。', '核心是闭包与作用域。', '那讲讲原型链？'])
    expect(audios.length).toBe(3)
    for (const a of audios) {
      expect(a.mime).toBe('audio/wav')
      expect(Buffer.from(a.data, 'base64').toString('utf8')).toMatch(/^AUDIO:/)
    }
    expect(msgs[msgs.length - 1].type).toBe('turn_end')
    expect(conn.state).toBe('LISTENING')
    expect(conn.ttsCancelled).toBe(false)
  })

  it('结束轮（isLast）口播用 summary 收尾，且无下一题', async () => {
    answerInterview.mockResolvedValue(EVAL_LAST)
    const conn = createRealtimeConn('u1', 's1')
    const { msgs, promise } = collect(conn, '最后一题回答')
    await promise

    const aiTokens = msgs.filter((m) => m.type === 'ai_token').map((m) => m.text)
    expect(aiTokens).toContain('面试结束，建议巩固异步与闭包。')
    expect(aiTokens.some((t) => t.includes('讲讲原型链'))).toBe(false)
    expect(msgs[msgs.length - 1].type).toBe('turn_end')
  })

  it('评测抛错时回 error 且不推音频/turn_end', async () => {
    answerInterview.mockRejectedValue(Object.assign(new Error('面试已结束'), { statusCode: 409, statusMessage: '面试已结束' }))
    const conn = createRealtimeConn('u1', 's1')
    const { msgs, promise } = collect(conn, '再答一次')
    const res = await promise
    expect(res.error).toBe('面试已结束')
    expect(msgs.length).toBe(1)
    expect(msgs[0].type).toBe('error')
    expect(msgs.some((m) => m.type === 'audio' || m.type === 'turn_end')).toBe(false)
  })
})

describe('handleBarge 打断', () => {
  it('THINKING 期间被打断：跳过口播，不发 turn_end', async () => {
    let resolveAnswer
    answerInterview.mockImplementation(() => new Promise((r) => { resolveAnswer = r }))
    const conn = createRealtimeConn('u1', 's1')
    const { msgs, promise } = collect(conn, '我的回答')
    // 评测尚未返回即插话 → 置取消标志（wasSpeaking=false 因为是 THINKING）
    expect(handleBarge(conn)).toBe(false)
    resolveAnswer(EVAL)
    await promise

    expect(msgs[0].type).toBe('turn_eval')
    expect(msgs.some((m) => m.type === 'ai_token' || m.type === 'audio')).toBe(false)
    expect(msgs.some((m) => m.type === 'turn_end')).toBe(false)
    expect(conn.state).toBe('LISTENING')
  })

  it('SPEAKING 期间被打断：停止剩余句音频，不发 turn_end', async () => {
    answerInterview.mockResolvedValue(EVAL)
    // 可控 gate：首块音频产出后挂起，待测试注入 barge 再继续
    let release
    const gate = new Promise((r) => { release = r })
    const provider = getTts()
    provider.synthesizeStream = async function* (s) {
      yield { chunk: Buffer.from('AUDIO:' + s), mime: 'audio/wav', ext: 'wav' }
      await gate // 挂起，等待测试放行
      yield { chunk: Buffer.from('TAIL:' + s), mime: 'audio/wav', ext: 'wav' }
    }

    const conn = createRealtimeConn('u1', 's1')
    const { msgs, promise } = collect(conn, '我的回答')
    // 等首句首块 + ai_token 发出
    await new Promise((r) => setImmediate(r))
    expect(handleBarge(conn)).toBe(true) // 此时已在 SPEAKING
    release() // 放行生成器
    await promise

    const audios = msgs.filter((m) => m.type === 'audio')
    // 首句只应发出首块（AUDIO:），尾块（TAIL:）因 ttsCancelled 被丢弃；后续句不再合成
    expect(audios.every((a) => Buffer.from(a.data, 'base64').toString('utf8').startsWith('AUDIO:'))).toBe(true)
    expect(audios.every((a) => Buffer.from(a.data, 'base64').toString('utf8').startsWith('TAIL:'))).toBe(false)
    expect(msgs.some((m) => m.type === 'turn_end')).toBe(false)
    expect(conn.state).toBe('LISTENING')
  })

  it('handleBarge 将 ttsCancelled 置 true', () => {
    const conn = createRealtimeConn('u1', 's1')
    expect(conn.ttsCancelled).toBe(false)
    handleBarge(conn)
    expect(conn.ttsCancelled).toBe(true)
  })
})
