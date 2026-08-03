import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

// B7：exam_records 拆表——独立临时库验证子表创建/读取/回填/级联删除
const tmp = path.join(os.tmpdir(), 'ml-split-' + Date.now() + '.db')
process.env.DB_PATH = tmp

const { sqlite, loadExamReviews, backfillExamReviews, uid } = await import('../server/utils/db')

afterAll(() => { try { fs.unlinkSync(tmp) } catch {} })

// exam_records 带 user_id→users 外键（B2），测试中先插入父用户
beforeAll(() => {
  sqlite.prepare("INSERT OR IGNORE INTO users (id,username,password) VALUES ('u1','u1','x')").run()
})

describe('B7 exam_records 拆表', () => {
  it('子表随 v4 迁移创建并带 FK 级联到 exam_records', () => {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name)
    expect(tables).toContain('exam_choice_reviews')
    expect(tables).toContain('exam_written_reviews')
    const fk = sqlite.prepare('PRAGMA foreign_key_list(exam_choice_reviews)').all()
    expect(fk.some((f) => f.table === 'exam_records' && f.on_delete === 'CASCADE')).toBe(true)
  })

  it('loadExamReviews 从子表聚合 choice/written 复盘', () => {
    const rid = 'rec_split_1'
    sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,score,correct,total,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(rid, 'u1', 's1', 80, 8, 10, Date.now())
    sqlite.prepare('INSERT INTO exam_choice_reviews (id,record_id,choice_id,q,options,user_answer,answer,right,explain,tag) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(uid('cr_'), rid, 'c1', 'Q?', JSON.stringify(['A', 'B']), JSON.stringify(['A']), JSON.stringify(['A']), 1, 'exp', 'html')
    sqlite.prepare('INSERT INTO exam_written_reviews (id,record_id,written_id,q,user_answer,reference,points) VALUES (?,?,?,?,?,?,?)')
      .run(uid('wr_'), rid, 'w1', 'W?', 'my ans', 'ref', JSON.stringify(['p1']))
    const { choiceReview, writtenReview } = loadExamReviews(rid)
    expect(choiceReview.length).toBe(1)
    expect(choiceReview[0]).toMatchObject({ id: 'c1', q: 'Q?', options: ['A', 'B'], userAnswer: ['A'], answer: ['A'], right: true, explain: 'exp', tag: 'html' })
    expect(writtenReview.length).toBe(1)
    expect(writtenReview[0]).toMatchObject({ id: 'w1', q: 'W?', userAnswer: 'my ans', reference: 'ref', points: ['p1'] })
  })

  it('子表为空时 fallback 主表老列', () => {
    const rid = 'rec_split_2'
    const cr = [{ id: 'c2', q: 'Q2', options: ['x'], userAnswer: [], answer: ['x'], right: false, explain: 'e', tag: 'css' }]
    const wr = [{ id: 'w2', q: 'W2', userAnswer: 'a', reference: 'r', points: ['p'] }]
    sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,score,correct,total,choice_review,written_review,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(rid, 'u1', 's1', 50, 5, 10, JSON.stringify(cr), JSON.stringify(wr), Date.now())
    // 不插子表，验证 fallback
    const { choiceReview, writtenReview } = loadExamReviews(rid, JSON.stringify(cr), JSON.stringify(wr))
    expect(choiceReview.length).toBe(1)
    expect(choiceReview[0].id).toBe('c2')
    expect(writtenReview[0].id).toBe('w2')
  })

  it('backfillExamReviews 把主表老列回填到子表', () => {
    const rid = 'rec_split_3'
    const cr = [{ id: 'c3', q: 'Q3', options: ['y'], userAnswer: ['y'], answer: ['y'], right: true, explain: 'e3', tag: 'js' }]
    const wr = [{ id: 'w3', q: 'W3', userAnswer: 'ans', reference: 'ref3', points: ['p3'] }]
    sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,score,correct,total,choice_review,written_review,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(rid, 'u1', 's1', 90, 9, 10, JSON.stringify(cr), JSON.stringify(wr), Date.now())
    backfillExamReviews(sqlite)
    const { choiceReview, writtenReview } = loadExamReviews(rid)
    expect(choiceReview.length).toBe(1)
    expect(choiceReview[0].tag).toBe('js')
    expect(writtenReview[0].reference).toBe('ref3')
  })

  it('ON DELETE CASCADE：删 exam_records 级联清子表', () => {
    const rid = 'rec_split_cascade'
    sqlite.prepare('INSERT INTO exam_records (id,user_id,set_id,score,correct,total,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(rid, 'u1', 's1', 70, 7, 10, Date.now())
    sqlite.prepare('INSERT INTO exam_choice_reviews (id,record_id,choice_id,q,options,user_answer,answer,right,explain,tag) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(uid('cr_'), rid, 'cx', 'Q', '[]', '[]', '[]', 0, '', 't')
    sqlite.prepare('DELETE FROM exam_records WHERE id=?').run(rid)
    expect(sqlite.prepare('SELECT COUNT(*) c FROM exam_choice_reviews WHERE record_id=?').get(rid).c).toBe(0)
  })
})
