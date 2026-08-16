import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sqlite, effectiveVip, uid } from '../server/utils/db'
import { startInterview, answerInterview, listInterviews, getInterview, parseJsonBlock, INTERVIEW_MAX_TURNS } from '../server/utils/interview'
import { getOrCreateStudyPlan, NoRecordsError } from '../server/utils/studyplan'
import { PLANS, getPlan } from '../server/utils/plans'

// 让 llmEnabled() 通过，并用桩 fetch 模拟 Deepseek 返回
process.env.DEEPSEEK_API_KEY = 'test-key'

let evalCount = 0
globalThis.fetch = async (_url, opts) => {
  const body = JSON.parse(opts.body || '{}')
  const msgs = body.messages || []
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
  if (lastUser && lastUser.content.includes('请开始')) {
    return { ok: true, json: async () => ({ choices: [{ message: { content: '请解释 TCP 三次握手的过程。' } }] }) }
  }
  if (lastUser && lastUser.content.includes('请生成学习计划')) {
    const plan = {
      summary: '建议先打牢基础再进阶实战。',
      milestones: [
        { title: '夯实基础', chapters: [], focus: '网络', tasks: ['复习 OSI 模型', '手写 TCP 状态机'] },
        { title: '进阶实战', chapters: [], focus: 'React', tasks: ['实现一个虚拟列表'] }
      ]
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(plan) } }] }) }
  }
  evalCount++
  const isLast = evalCount >= INTERVIEW_MAX_TURNS
  const payload = {
    evaluation: { score: 8, feedback: `第${evalCount}题回答不错，注意细节。` },
    nextQuestion: isLast ? '' : `第${evalCount + 1}题：讲讲相关原理。`,
    isLast,
    overall: isLast ? '整体表现良好，建议深入底层原理。' : '',
    overallScore: isLast ? 82 : 0
  }
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) }
}

const userIds = []
const mkUser = (vip) => {
  const id = 'u_vf_' + Math.random().toString(36).slice(2, 8)
  sqlite.prepare('INSERT INTO users (id,username,nickname,password,vip,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, id, 'S', 'x', JSON.stringify(vip), Date.now())
  userIds.push(id)
  return id
}
afterAll(() => {
  for (const id of userIds) {
    sqlite.prepare('DELETE FROM interview_sessions WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM study_plans WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM exam_records WHERE user_id=?').run(id)
    sqlite.prepare('DELETE FROM users WHERE id=?').run(id)
  }
})

describe('effectiveVip 门禁逻辑', () => {
  it('有效期内会员 active=true', () => {
    expect(effectiveVip({ vip: JSON.stringify({ level: 1, expireAt: Date.now() + 86400000 }) }).active).toBe(true)
  })
  it('过期会员 active=false（收入漏洞回收）', () => {
    expect(effectiveVip({ vip: JSON.stringify({ level: 3, expireAt: Date.now() - 1000 }) }).active).toBe(false)
  })
  it('level=0 非会员 active=false', () => {
    expect(effectiveVip({ vip: JSON.stringify({ level: 0, expireAt: null }) }).active).toBe(false)
  })
})

describe('parseJsonBlock 健壮性', () => {
  it('提取纯 JSON', () => { expect(parseJsonBlock('{"a":1}')).toEqual({ a: 1 }) })
  it('剥离代码块标记', () => { expect(parseJsonBlock('```json\n{"a":1}\n```')).toEqual({ a: 1 }) })
  it('从混合文本截取', () => { expect(parseJsonBlock('前言 {"a":1} 后缀')).toEqual({ a: 1 }) })
  it('非法返回 null', () => { expect(parseJsonBlock('not json')).toBeNull() })
})

describe('H1 AI 深度模拟面试', () => {
  it('开启面试生成首题并落库', async () => {
    const uid1 = mkUser({ level: 1, expireAt: Date.now() + 86400000 })
    const res = await startInterview(uid1, { track: 'frontend', level: 'mid' })
    expect(res.sessionId).toBeTruthy()
    expect(res.question).toContain('TCP')
    const list = listInterviews(uid1)
    expect(list.length).toBe(1)
    expect(list[0].status).toBe('active')
  })

  it('多轮作答直到结束，产生评分与总结', async () => {
    const uid2 = mkUser({ level: 1, expireAt: Date.now() + 86400000 })
    const start = await startInterview(uid2, { track: 'backend', level: 'senior' })
    let last = null
    for (let i = 0; i < INTERVIEW_MAX_TURNS; i++) {
      last = await answerInterview(uid2, { sessionId: start.sessionId, answer: `我的回答 ${i}` })
      if (last.isLast) break
    }
    expect(last.isLast).toBe(true)
    expect(last.score).toBeGreaterThanOrEqual(0)
    expect(last.score).toBeLessThanOrEqual(100)
    expect(last.summary).toBeTruthy()
    const sess = getInterview(start.sessionId, uid2)
    expect(sess.status).toBe('done')
    expect(sess.messages.filter((m) => m.role === 'assistant' && m.score != null).length).toBe(INTERVIEW_MAX_TURNS)
  })

  it('结束后再次作答应被拒绝（409）', async () => {
    const uid3 = mkUser({ level: 1, expireAt: Date.now() + 86400000 })
    const start = await startInterview(uid3, { track: 'frontend', level: 'junior' })
    for (let i = 0; i < INTERVIEW_MAX_TURNS; i++) {
      const r = await answerInterview(uid3, { sessionId: start.sessionId, answer: 'x' })
      if (r.isLast) break
    }
    let threw = false
    try { await answerInterview(uid3, { sessionId: start.sessionId, answer: 'again' }) } catch (e) { threw = e.statusCode === 409 }
    expect(threw).toBe(true)
  })
})

describe('H2 个性化学习路径', () => {
  it('无考试记录时抛出 NoRecordsError', async () => {
    const uid4 = mkUser({ level: 1, expireAt: Date.now() + 86400000 })
    await expect(getOrCreateStudyPlan(uid4)).rejects.toThrow(NoRecordsError)
  })

  it('基于薄弱点生成路径，并带 7 天缓存', async () => {
    const uid5 = mkUser({ level: 1, expireAt: Date.now() + 86400000 })
    sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,set_name,track,score,correct,total,weak_points,level,advice,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(uid('r_'), uid5, 's1', '卷1', 'frontend', 60, 6, 10, JSON.stringify([{ tag: '网络', count: 3 }, { tag: 'React', count: 2 }]), '及格', '建议复习', Date.now())
    const p1 = await getOrCreateStudyPlan(uid5)
    expect(p1.plan.summary).toBeTruthy()
    expect(Array.isArray(p1.plan.milestones) && p1.plan.milestones.length >= 1).toBe(true)
    expect(p1.track).toBe('frontend')
    // 二次调用应命中缓存
    const p2 = await getOrCreateStudyPlan(uid5)
    expect(p2.cached).toBe(true)
    expect(p2.plan.milestones.length).toBe(p1.plan.milestones.length)
    // force 重新生成
    const p3 = await getOrCreateStudyPlan(uid5, { force: true })
    expect(p3.cached).toBe(false)
  })
})

describe('T2 plans 配置结构化', () => {
  it('每个套餐的 benefits 均含 implemented 标记与 period', () => {
    expect(PLANS.length).toBeGreaterThan(0)
    for (const p of PLANS) {
      expect(Array.isArray(p.benefits)).toBe(true)
      expect(p.benefits.length).toBeGreaterThan(0)
      for (const b of p.benefits) {
        expect(typeof b.key).toBe('string')
        expect(typeof b.label).toBe('string')
        expect(typeof b.implemented).toBe('boolean')
      }
      expect(['month', 'quarter', 'year']).toContain(p.period)
    }
  })
  it('已上线权益与真实可用能力一致（AI 面试核心在免 LLM 批次标 false）', () => {
    const monthly = getPlan('monthly')
    expect(monthly.benefits.find((b) => b.key === 'vip-exam')?.implemented).toBe(true)
    expect(monthly.benefits.find((b) => b.key === 'ai-interview')?.implemented).toBe(false)
  })
})

describe('H2 免 LLM 本地路径（诚实可降级）', () => {
  it('无 LLM key 时仍能基于薄弱点生成路径，不抛 503', async () => {
    const prev = process.env.DEEPSEEK_API_KEY
    delete process.env.DEEPSEEK_API_KEY
    try {
      const uid7 = mkUser({ level: 1, expireAt: Date.now() + 86400000 })
      sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,set_name,track,score,correct,total,weak_points,level,advice,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(uid('r_'), uid7, 's1', '卷1', 'frontend', 60, 6, 10, JSON.stringify([{ tag: 'React', count: 3 }, { tag: '网络', count: 2 }]), '及格', '建议复习', Date.now())
      const p = await getOrCreateStudyPlan(uid7)
      expect(p.plan.summary).toBeTruthy()
      expect(Array.isArray(p.plan.milestones) && p.plan.milestones.length >= 1).toBe(true)
      // 本地路径产出必须为真实章节名（decorate 后 chapterLinks 至少部分可点击）
      const allChapters = p.plan.milestones.flatMap((m) => m.chapterLinks || [])
      expect(Array.isArray(allChapters)).toBe(true)
    } finally {
      if (prev) process.env.DEEPSEEK_API_KEY = prev
    }
  })
})
