import { describe, it, expect, afterAll } from 'vitest'
import { sqlite } from '../server/utils/db'
import * as A from '../server/utils/admin'

// 复用真实库，按约定在 afterAll 清理测试数据（与 vip-payment.test.mjs 同款模式）
afterAll(() => {
  sqlite.prepare("DELETE FROM sections WHERE id LIKE 'tsec_%'").run()
  sqlite.prepare("DELETE FROM chapters WHERE id LIKE 'tch_%'").run()
  sqlite.prepare("DELETE FROM modules WHERE id LIKE 'tmod_%'").run()
  sqlite.prepare("DELETE FROM exam_choices WHERE id LIKE 'tex_c%'").run()
  sqlite.prepare("DELETE FROM exam_written WHERE id LIKE 'tex_w%'").run()
  sqlite.prepare("DELETE FROM exam_sets WHERE id LIKE 'tex_%'").run()
  sqlite.prepare("DELETE FROM interview_questions WHERE id LIKE 'tiq_%'").run()
  sqlite.prepare("DELETE FROM sessions WHERE user_id LIKE 'tu_test_%'").run()
  sqlite.prepare("DELETE FROM users WHERE id LIKE 'tu_test_%'").run()
})

describe('看板 G6', () => {
  it('dashboardStats 返回数值指标', () => {
    const s = A.dashboardStats()
    expect(typeof s.users).toBe('number')
    expect(typeof s.examSets).toBe('number')
    expect(typeof s.revenue).toBe('number')
    expect(s.examSets).toBeGreaterThanOrEqual(19)
  })
})

describe('内容 CRUD (G2)', () => {
  it('模块 增-查-改-删（级联删章节/小节）', () => {
    const m = A.createModule({ id: 'tmod_1', name: '测试模块', icon: '🧪', color: '#000', desc: 'd' })
    expect(m.id).toBe('tmod_1')
    expect(A.getModule('tmod_1').name).toBe('测试模块')
    A.updateModule('tmod_1', { name: '改名' })
    expect(A.getModule('tmod_1').name).toBe('改名')
    // 建子章节+小节，验证级联删除
    const ch = A.createChapter({ id: 'tch_1', moduleId: 'tmod_1', title: '章' })
    expect(ch.module_id).toBe('tmod_1')
    const sec = A.createSection({ id: 'tsec_1', chapterId: 'tch_1', title: '节', content: 'c' })
    expect(sec.chapter_id).toBe('tch_1')
    expect(A.deleteModule('tmod_1')).toBe(true)
    expect(A.getModule('tmod_1')).toBeNull()
    expect(A.getChapter('tch_1')).toBeNull()
    expect(A.getSection('tsec_1')).toBeNull()
  })

  it('非法 ID / 重复 ID 抛错', () => {
    expect(() => A.createModule({ id: 'Bad ID' })).toThrow('INVALID_ID')
    A.createModule({ id: 'tmod_dup', name: 'x' })
    expect(() => A.createModule({ id: 'tmod_dup', name: 'y' })).toThrow('DUP_ID')
    expect(() => A.createChapter({ id: 'tch_x', moduleId: 'nope' })).toThrow('NO_MODULE')
  })

  it('小节改所属章节', () => {
    A.createModule({ id: 'tmod_a', name: 'a' })
    A.createModule({ id: 'tmod_b', name: 'b' })
    const c1 = A.createChapter({ id: 'tch_a', moduleId: 'tmod_a', title: 'a' })
    const c2 = A.createChapter({ id: 'tch_b', moduleId: 'tmod_b', title: 'b' })
    const s = A.createSection({ id: 'tsec_mv', chapterId: 'tch_a', title: 's' })
    expect(s.chapter_id).toBe('tch_a')
    A.updateSection('tsec_mv', { chapterId: 'tch_b' })
    expect(A.getSection('tsec_mv').chapter_id).toBe('tch_b')
  })
})

describe('题库 CRUD (G3)', () => {
  it('试卷 增-查-改（含嵌套题）-删（级联）', () => {
    const created = A.createExamSet({
      id: 'tex_1', name: '卷', track: 'frontend', level: '初级', duration: 30, vipOnly: false,
      choices: [
        { id: 'tex_c1', q: '1+1=?', options: ['1', '2', '3'], answer: ['2'], explain: 'e' },
        { id: 'tex_c2', q: '2+2=?', options: ['3', '4'], answer: ['4'], explain: 'e' }
      ],
      written: [{ id: 'tex_w1', q: '简述', points: ['p1'], reference: 'r' }]
    })
    expect(created.choices.length).toBe(2)
    expect(created.written.length).toBe(1)
    expect(A.getExamSetDetail('tex_1').choices.length).toBe(2)
    // 更新：替换题目（应变为 1 道）
    A.updateExamSet('tex_1', { name: '卷改', choices: [{ id: 'tex_c9', q: '3+3=?', options: ['6'], answer: ['6'], explain: 'e' }], written: [] })
    const upd = A.getExamSetDetail('tex_1')
    expect(upd.name).toBe('卷改')
    expect(upd.choices.length).toBe(1)
    expect(upd.written.length).toBe(0)
    expect(A.deleteExamSet('tex_1')).toBe(true)
    expect(A.getExamSet('tex_1')).toBeNull()
    expect(sqlite.prepare("SELECT COUNT(*) c FROM exam_choices WHERE set_id='tex_1'").get().c).toBe(0)
  })

  it('面试题 增-查-改-删', () => {
    const q = A.createInterview({ id: 'tiq_1', track: 'ai', type: 'hot', q: '什么是RAG?', a: '检索增强', keywords: ['rag'] })
    expect(q.track).toBe('ai')
    expect(q.keywords).toEqual(['rag'])
    A.updateInterview('tiq_1', { a: '检索增强生成' })
    expect(A.getInterview('tiq_1').a).toBe('检索增强生成')
    expect(A.listInterview('ai').some((x) => x.id === 'tiq_1')).toBe(true)
    expect(A.deleteInterview('tiq_1')).toBe(true)
    expect(A.getInterview('tiq_1')).toBeNull()
  })
})

describe('用户体系 (G4)', () => {
  it('创建用户需 ≥8 位密码', () => {
    expect(() => A.createUser({ username: 'weak', password: '1234567' })).toThrow('WEAK_PASSWORD')
    const w = A.createUser({ username: 'weak_ok', password: '12345678' })
    sqlite.prepare('DELETE FROM users WHERE id=?').run(w.id)
  })
  it('用户 增-查-改（角色/VIP/封禁）-删（级联）', () => {
    const u = A.createUser({ username: 'tu_test_a', email: 'tu_test_a@x.com', password: 'secret12', role: 'user' })
    expect(u.role).toBe('user')
    // 重复用户名
    expect(() => A.createUser({ username: 'tu_test_a', password: 'secret1' })).toThrow('DUP_ID')
    A.updateUser(u.id, { role: 'admin' })
    expect(A.getUserById(u.id).role).toBe('admin')
    A.updateUser(u.id, { banned: true, vip: { level: 3, expireAt: null } })
    const gu = A.getUserById(u.id)
    expect(gu.banned).toBe(true)
    expect(gu.vip.level).toBe(3)
    // 建一条 progress 验证级联
    sqlite.prepare('INSERT OR IGNORE INTO progress (user_id,section_id,done_at) VALUES (?,?,?)').run(u.id, 'fe-c1-s1', Date.now())
    expect(A.deleteUser(u.id)).toBe(true)
    expect(A.getUserById(u.id)).toBeNull()
    expect(sqlite.prepare('SELECT COUNT(*) c FROM progress WHERE user_id=?').get(u.id).c).toBe(0)
  })
  it('listUsers 支持搜索', () => {
    const u = A.createUser({ username: 'tu_test_find', password: 'secret12' })
    const r = A.listUsers({ q: 'tu_test_find' })
    expect(r.items.some((x) => x.id === u.id)).toBe(true)
    A.deleteUser(u.id)
  })
})
