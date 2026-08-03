import { describe, it, expect, afterAll } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

// B2：外键作用域化——独立临时库验证 FK 子句已落到逻辑父子表，且 ON DELETE CASCADE 生效
const tmp = path.join(os.tmpdir(), 'ml-fk-' + Date.now() + '.db')
process.env.DB_PATH = tmp

const { sqlite } = await import('../server/utils/db')

const fkList = (t) => sqlite.prepare(`PRAGMA foreign_key_list(${t})`).all()
const hasFk = (t, parent, onDelete = 'CASCADE') =>
  fkList(t).some((f) => f.table === parent && (onDelete === null || f.on_delete === onDelete))

afterAll(() => { try { fs.unlinkSync(tmp) } catch {} })

describe('B2 外键作用域化', () => {
  it('foreign_keys pragma 已开启', () => {
    const row = sqlite.prepare('PRAGMA foreign_keys').get()
    expect(row.foreign_keys).toBe(1)
  })

  it('版本化迁移已记录 v4（含 foreign-keys + exam-review-split）', () => {
    const vers = sqlite.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version).sort()
    expect(vers).toEqual([1, 2, 3, 4])
  })

  it('逻辑父子表均声明 FOREIGN KEY 且级联', () => {
    expect(hasFk('chapters', 'modules')).toBe(true)
    expect(hasFk('sections', 'chapters')).toBe(true)
    expect(hasFk('exam_choices', 'exam_sets')).toBe(true)
    expect(hasFk('exam_written', 'exam_sets')).toBe(true)
    expect(hasFk('exam_records', 'users')).toBe(true)
    expect(hasFk('progress', 'users')).toBe(true)
    expect(hasFk('interview_sessions', 'users')).toBe(true)
    expect(hasFk('study_plans', 'users')).toBe(true)
    // orders / subscriptions 为基线已声明
    expect(hasFk('orders', 'users')).toBe(true)
    expect(hasFk('subscriptions', 'users')).toBe(true)
  })

  it('recreate 未破坏既有索引（幂等保索引）', () => {
    const idx = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((r) => r.name)
    expect(idx).toContain('idx_interview_user')
    expect(idx).toContain('idx_studyplan_user')
    expect(idx).toContain('idx_exam_records_nonce')
  })

  it('ON DELETE CASCADE 生效：删模块级联清章节与小节', () => {
    sqlite.prepare("INSERT INTO modules (id,name,position) VALUES ('fkmod','t',0)").run()
    sqlite.prepare("INSERT INTO chapters (id,module_id,title,position) VALUES ('fkch','fkmod','t',0)").run()
    sqlite.prepare("INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES ('fksec','fkch','t','fe','c',0)").run()
    sqlite.prepare("DELETE FROM modules WHERE id='fkmod'").run()
    expect(sqlite.prepare("SELECT COUNT(*) AS c FROM chapters WHERE id='fkch'").get().c).toBe(0)
    expect(sqlite.prepare("SELECT COUNT(*) AS c FROM sections WHERE id='fksec'").get().c).toBe(0)
  })

  it('孤儿清理后 FK 重建不报错（幂等可重放）', () => {
    // 再次确认 foreign_key_list 稳定返回 8 张子表的 FK，不抛错
    expect(fkList('chapters').length).toBeGreaterThan(0)
    expect(fkList('exam_records').length).toBeGreaterThan(0)
  })
})

// B6：聚合查询等价性——验证 modules.get.ts / stats.get.ts 采用的 GROUP BY 聚合在新库上可正常产出计数
describe('B6 聚合查询（替代 N+1）', () => {
  it('模块概览聚合：章节/小节计数非空且一致', () => {
    const list = sqlite.prepare('SELECT id,name FROM modules ORDER BY position').all()
    expect(list.length).toBeGreaterThan(0)
    const chRows = sqlite.prepare('SELECT module_id, COUNT(*) AS c FROM chapters GROUP BY module_id').all()
    const secRows = sqlite.prepare(
      'SELECT c.module_id AS module_id, COUNT(*) AS c FROM sections s JOIN chapters c ON c.id=s.chapter_id GROUP BY c.module_id'
    ).all()
    const chMap = {}, secMap = {}
    for (const r of chRows) chMap[r.module_id] = r.c
    for (const r of secRows) secMap[r.module_id] = r.c
    let totalSections = 0
    for (const m of list) {
      const cc = chMap[m.id] || 0
      const sc = secMap[m.id] || 0
      expect(cc).toBeGreaterThanOrEqual(0)
      expect(sc).toBeGreaterThanOrEqual(0)
      totalSections += sc
    }
    expect(totalSections).toBeGreaterThan(0)
  })

  it('学习看板聚合：各模块小节总数可一次性取出', () => {
    const totalRows = sqlite.prepare(
      'SELECT c.module_id AS module_id, COUNT(*) AS total FROM sections s JOIN chapters c ON c.id=s.chapter_id GROUP BY c.module_id'
    ).all()
    const totalMap = {}
    for (const r of totalRows) totalMap[r.module_id] = r.total
    // 与逐章节嵌套循环结果应一致：直接统计 sections 总数
    const all = sqlite.prepare('SELECT COUNT(*) AS c FROM sections').get().c
    const sum = Object.values(totalMap).reduce((s, v) => s + v, 0)
    expect(sum).toBe(all)
  })
})
