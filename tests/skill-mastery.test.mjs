import { describe, it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'

// 必须在 import server 模块之前设置，否则 db.ts 会用默认 data/devmentor.db 打开连接
process.env.DB_PATH = path.join(os.tmpdir(), `ml-mastery-test-${Date.now()}.db`)
process.env.NODE_ENV = 'test'

const {
  skillKey,
  computeStatus,
  getMasteryMap,
  setMark,
  recordPractice,
  recordExamSkill,
  recordWrongItem,
  listWrongItems,
  listWrongItemsPaginated,
  actWrongItem
} = await import('../server/utils/skillMastery.ts')
const { sqlite } = await import('../server/utils/db.ts')

// 满足 user_id 外键约束：测试用户先落库（生产代码只对已登录用户调用，天然满足）
function ensureUser(id) {
  sqlite.prepare('INSERT OR IGNORE INTO users (id, username, created_at) VALUES (?,?,?)').run(id, id, Date.now())
}

describe('skillKey 与 computeStatus 纯函数', () => {
  it('skillKey 含层级（track::subtrack::name），符合 id 铁律', () => {
    expect(skillKey('frontend', 'fe-react', 'React Hooks')).toBe('frontend::fe-react::React Hooks')
  })

  it('全新技能 → new / 0', () => {
    const { status, mastery } = computeStatus({})
    expect(status).toBe('new')
    expect(mastery).toBe(0)
  })

  it('显式标记 → mastered / 100', () => {
    const { status, mastery } = computeStatus({ marked: 1 })
    expect(status).toBe('mastered')
    expect(mastery).toBe(100)
  })

  it('高正确率 + 足够作答数 → mastered', () => {
    const a = computeStatus({ practiced_correct: 5, practiced_total: 5 })
    expect(a.status).toBe('mastered')
    expect(a.mastery).toBe(100)
  })

  it('中等正确率（~54%）→ learning', () => {
    const b = computeStatus({ practiced_correct: 3, practiced_total: 5, exam_correct: 1, exam_total: 2 })
    expect(b.mastery).toBeGreaterThan(50)
    expect(b.status).toBe('learning')
  })

  it('低正确率 → learning', () => {
    const { status } = computeStatus({ practiced_correct: 1, practiced_total: 4 })
    expect(status).toBe('learning')
  })
})

describe('掌握度持久化（临时库）', () => {
  const uid = 'u_test'
  const key = skillKey('frontend', 'fe-react', 'React Hooks')
  ensureUser(uid)

  it('setMark 后 getMasteryMap 标记 mastered', () => {
    setMark(uid, key, 'frontend', 'fe-react', 'React Hooks', true)
    const map = getMasteryMap(uid)
    expect(map[key].marked).toBe(true)
    expect(map[key].status).toBe('mastered')
    // 取消标记
    setMark(uid, key, 'frontend', 'fe-react', 'React Hooks', false)
    expect(getMasteryMap(uid)[key].marked).toBe(false)
  })

  it('recordPractice 累加练习信号', () => {
    recordPractice(uid, key, 'frontend', 'fe-react', 'React Hooks', true)
    recordPractice(uid, key, 'frontend', 'fe-react', 'React Hooks', true)
    recordPractice(uid, key, 'frontend', 'fe-react', 'React Hooks', false)
    const m = getMasteryMap(uid)[key]
    expect(m.practiced_total).toBe(3)
  })

  it('recordExamSkill 累加自测信号', () => {
    recordExamSkill(uid, key, 'frontend', 'fe-react', 'React Hooks', true)
    const m = getMasteryMap(uid)[key]
    expect(m.exam_total).toBe(1)
  })
})

describe('错题本 + SRS（临时库）', () => {
  const uid = 'u_wrong'
  ensureUser(uid)

  it('recordWrongItem 幂等累加 wrong_count', () => {
    const a = recordWrongItem(uid, { source: 'practice', itemId: 'x1', q: '什么是闭包？', answer: '函数+词法环境' })
    const b = recordWrongItem(uid, { source: 'practice', itemId: 'x1', q: '什么是闭包？', answer: '函数+词法环境' })
    expect(a).toBe(b)
    const list = listWrongItems(uid, false)
    expect(list.length).toBe(1)
    expect(list[0].wrong_count).toBe(2)
  })

  it('review 排期下次（SRS 间隔递增）', () => {
    const list = listWrongItems(uid, false)
    const r = actWrongItem(uid, list[0].id, 'review')
    expect(r.next_review_at).toBeGreaterThan(Date.now())
    // dueOnly 现在应排除该项
    expect(listWrongItems(uid, true).length).toBe(0)
  })

  it('dismiss 移除', () => {
    const list = listWrongItems(uid, false)
    const r = actWrongItem(uid, list[0].id, 'dismiss')
    expect(r.removed).toBe(true)
    expect(listWrongItems(uid, false).length).toBe(0)
  })
})

describe('错题本分页 listWrongItemsPaginated（临时库）', () => {
  const uid = 'u_paginate'
  ensureUser(uid)
  // 造 25 条错题（超过一页 20）
  for (let i = 0; i < 25; i++) {
    recordWrongItem(uid, { source: 'exam', itemId: 'p' + i, q: '题' + i, answer: '答' + i })
  }

  it('默认每页 20，返回 total/dueTotal', () => {
    const r = listWrongItemsPaginated(uid, false, 1, 20)
    expect(r.pageSize).toBe(20)
    expect(r.total).toBe(25)
    expect(r.dueTotal).toBe(25)
    expect(r.items.length).toBe(20)
  })

  it('第二页返回剩余 5 条', () => {
    const r = listWrongItemsPaginated(uid, false, 2, 20)
    expect(r.items.length).toBe(5)
    expect(r.page).toBe(2)
  })

  it('dueOnly 过滤掉已排期项', () => {
    const all = listWrongItemsPaginated(uid, false, 1, 100)
    actWrongItem(uid, all.items[0].id, 'review') // 第一条不再 due
    const due = listWrongItemsPaginated(uid, true, 1, 100)
    expect(due.total).toBe(24)
    expect(due.items.every(x => x.due)).toBe(true)
  })
})
