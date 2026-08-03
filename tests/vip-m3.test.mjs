import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

const tmp = path.join(os.tmpdir(), 'ml_m3_' + Date.now() + '.db')

const FAKE_DIAG = {
  score: 82,
  structure: '结构清晰，层次分明',
  strengths: ['项目经历丰富', '技术栈匹配'],
  weaknesses: ['量化不足', '缺少数据指标'],
  improvements: ['补充关键数据指标', '突出业务价值'],
  matchDirection: '前端工程师',
  summary: '整体不错，建议进一步量化成果。'
}
function installLlmStub() {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(FAKE_DIAG) } }] })
  })
}

let sqlite, diagnoseResume, listReferrals, applyReferral, listMyApplications
let ResumeTooShortError, LlmUnavailableError, AlreadyAppliedError, ReferralNotFoundError

beforeAll(async () => {
  process.env.DB_PATH = tmp
  process.env.DEEPSEEK_API_KEY = 'test-key'
  installLlmStub()
  const db = await import('../server/utils/db')
  sqlite = db.sqlite
  const r = await import('../server/utils/resume')
  diagnoseResume = r.diagnoseResume
  ResumeTooShortError = r.ResumeTooShortError
  LlmUnavailableError = r.LlmUnavailableError
  const rf = await import('../server/utils/referral')
  listReferrals = rf.listReferrals
  applyReferral = rf.applyReferral
  listMyApplications = rf.listMyApplications
  AlreadyAppliedError = rf.AlreadyAppliedError
  ReferralNotFoundError = rf.ReferralNotFoundError

  // resume_diags / referral_applications 带 user_id→users 外键，需先有父行
  for (const u of ['u_test', 'u_cache', 'u_nollm', 'u_app']) {
    sqlite.prepare("INSERT OR IGNORE INTO users (id,username,password,vip,created_at) VALUES (?,?,?,?,?)").run(u, u, 'x', '{}', 0)
  }
})

afterAll(() => {
  for (const f of [tmp, tmp + '-wal', tmp + '-shm']) { try { fs.unlinkSync(f) } catch {} }
})

describe('M3 迁移与表', () => {
  it('version:5 已执行，referrals 写入 10 条种子', () => {
    const vers = sqlite.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version).sort()
    expect(vers).toContain(5)
    const n = sqlite.prepare('SELECT COUNT(*) AS c FROM referrals').get().c
    expect(n).toBe(10)
  })
  it('resume_diags / referral_applications 带外键', () => {
    expect(sqlite.prepare('PRAGMA foreign_key_list(resume_diags)').all().length).toBeGreaterThan(0)
    expect(sqlite.prepare('PRAGMA foreign_key_list(referral_applications)').all().length).toBeGreaterThan(0)
  })
})

describe('H3 简历诊断', () => {
  it('过短抛 ResumeTooShortError', async () => {
    await expect(diagnoseResume('u_x', '太短了')).rejects.toMatchObject({ name: 'ResumeTooShortError' })
  })
  it('正常诊断返回结构化结果（桩 LLM）', async () => {
    const resume = '这是一份较长的简历内容，包含项目经历与技能描述，用于测试 AI 诊断功能是否返回结构化结果。'.repeat(3)
    const r = await diagnoseResume('u_test', resume)
    expect(r.score).toBe(82)
    expect(Array.isArray(r.strengths)).toBe(true)
    expect(r.matchDirection).toBe('前端工程师')
  })
  it('相同内容走缓存，第二次不再调用 fetch', async () => {
    let calls = 0
    const orig = globalThis.fetch
    globalThis.fetch = async (...a) => { calls++; return orig(...a) }
    const resume = '另一份简历用于缓存测试，包含足够长度的内容描述个人技能与项目经验，确保超过五十字阈值。'.repeat(3)
    const r1 = await diagnoseResume('u_cache', resume)
    const r2 = await diagnoseResume('u_cache', resume)
    expect(calls).toBe(1)
    expect(r1.cached).toBe(false)
    expect(r2.cached).toBe(true)
    globalThis.fetch = orig
  })
  it('llm 未配置抛 LlmUnavailableError', async () => {
    const old = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = ''
    const resume = '一份全新的超长简历内容用于测试 llm 未配置场景，必须足够长度以越过长度校验，描述技能项目经验等。'.repeat(3)
    await expect(diagnoseResume('u_nollm', resume)).rejects.toMatchObject({ name: 'LlmUnavailableError' })
    process.env.DEEPSEEK_API_KEY = old
  })
})

describe('H4 内推资源库', () => {
  it('listReferrals 全量与按方向筛选', () => {
    expect(listReferrals({}).length).toBe(10)
    const fe = listReferrals({ track: 'frontend' })
    expect(fe.length).toBeGreaterThan(0)
    expect(fe.every((r) => r.track === 'frontend')).toBe(true)
  })
  it('applyReferral 落库 + 防重复申请', async () => {
    const rf = sqlite.prepare('SELECT id FROM referrals LIMIT 1').get()
    const r = await applyReferral('u_app', { referralId: rf.id, name: '张三', contact: 'wx:abc' })
    expect(r.status).toBe('pending')
    await expect(applyReferral('u_app', { referralId: rf.id, name: '张三', contact: 'wx:abc' })).rejects.toMatchObject({ name: 'AlreadyAppliedError' })
    const mine = listMyApplications('u_app')
    expect(mine.length).toBe(1)
  })
  it('不存在的 referral 抛 ReferralNotFoundError', async () => {
    await expect(applyReferral('u_app', { referralId: 'nope', name: 'x', contact: 'y' })).rejects.toMatchObject({ name: 'ReferralNotFoundError' })
  })
  it('FK 级联：删用户级联删 resume_diags / referral_applications', () => {
    sqlite.prepare("INSERT INTO users (id,username,password,vip,created_at) VALUES ('u_casc','casc','x','{}',0)").run()
    sqlite.prepare("INSERT INTO resume_diags (id,user_id,content_hash,content,result,created_at) VALUES ('rd_c','u_casc','h','c','{}',0)").run()
    const rfId = sqlite.prepare('SELECT id FROM referrals LIMIT 1').get().id
    sqlite.prepare("INSERT INTO referral_applications (id,user_id,referral_id,name,contact,status,created_at) VALUES ('ra_c','u_casc',?, 'n','c','pending',0)").run(rfId)
    sqlite.prepare('DELETE FROM users WHERE id=?').run('u_casc')
    expect(sqlite.prepare("SELECT COUNT(*) AS c FROM resume_diags WHERE user_id='u_casc'").get().c).toBe(0)
    expect(sqlite.prepare("SELECT COUNT(*) AS c FROM referral_applications WHERE user_id='u_casc'").get().c).toBe(0)
  })
})
