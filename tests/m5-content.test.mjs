import { describe, it, expect, beforeAll } from 'vitest'
import os from 'os'
import fs from 'fs'
import path from 'path'

const tmp = path.join(os.tmpdir(), `m5test-${process.pid}-${Date.now()}.db`)
let sqlite, expandContent, cleanupOrphans

beforeAll(async () => {
  if (fs.existsSync(tmp)) fs.rmSync(tmp)
  process.env.DB_PATH = tmp
  const dbMod = await import('../server/utils/db')
  sqlite = dbMod.sqlite
  const lib = await import('../scripts/m5-expand-lib.mjs')
  expandContent = lib.expandContent
  cleanupOrphans = lib.cleanupOrphans
  cleanupOrphans(sqlite) // 临时库无脏数据，应安全空跑
  expandContent(sqlite)
})

describe('M5 内容扩建', () => {
  it('新增 4 套 VIP 实战卷（每套 15 选择 + 5 笔试）', () => {
    const ids = ['exam-fe-vip-3', 'exam-be-vip-3', 'exam-op-vip-3', 'exam-ai-vip-3']
    expect(sqlite.prepare(`SELECT COUNT(*) n FROM exam_sets WHERE id IN (${ids.map(() => '?').join(',')})`).get(...ids).n).toBe(4)
    for (const id of ids) {
      const s = sqlite.prepare('SELECT * FROM exam_sets WHERE id=?').get(id)
      expect(s, `卷 ${id} 应存在`).toBeTruthy()
      expect(s.vip_only).toBe(1)
      const c = sqlite.prepare('SELECT COUNT(*) n FROM exam_choices WHERE set_id=?').get(id).n
      const w = sqlite.prepare('SELECT COUNT(*) n FROM exam_written WHERE set_id=?').get(id).n
      expect(c, `${id} 选择题数`).toBe(15)
      expect(w, `${id} 笔试题数`).toBe(5)
    }
  })

  it('新增 35 道面试题（id 前缀 iq-m5-）且全表权重已回填', () => {
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE id LIKE 'iq-m5-%'").get().n).toBe(35)
    expect(sqlite.prepare('SELECT COUNT(*) n FROM interview_questions').get().n).toBeGreaterThanOrEqual(300) // 种子 265 + 新增 35
    expect(sqlite.prepare('SELECT COUNT(*) n FROM interview_questions WHERE weight IS NULL').get().n).toBe(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE type='special' AND weight=5").get().n).toBeGreaterThan(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE type='hot' AND weight=3").get().n).toBeGreaterThan(0)
  })

  it('新增面试题按方向分布合理（ai 25 / be 5 / op 3 / fe 2）', () => {
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE id LIKE 'iq-m5-ai-%'").get().n).toBe(25)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE id LIKE 'iq-m5-be-%'").get().n).toBe(5)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE id LIKE 'iq-m5-op-%'").get().n).toBe(3)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE id LIKE 'iq-m5-fe-%'").get().n).toBe(2)
  })

  it('治理：清理 e1 空卷与 m1 重复模块（级联）', () => {
    // 在临时库造脏数据，验证 cleanupOrphans 能安全清除
    sqlite.prepare("INSERT INTO exam_sets (id,name,track,level,duration,vip_only) VALUES ('e1','空卷','front','初级',30,0)").run()
    sqlite.prepare("INSERT INTO modules (id,name,icon,color,desc,position) VALUES ('m1','前端','x','#000','d',0)").run()
    sqlite.prepare("INSERT INTO chapters (id,module_id,title,goal,position) VALUES ('c1','m1','基础','',0)").run()
    sqlite.prepare("INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES ('s1','c1','变量','', 'x',0)").run()
    cleanupOrphans(sqlite)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM exam_sets WHERE id='e1'").get().n).toBe(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM modules WHERE id='m1'").get().n).toBe(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM chapters WHERE id='c1'").get().n).toBe(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM sections WHERE id='s1'").get().n).toBe(0)
  })

  it('幂等：重复执行不重复插入', () => {
    const beforeIq = sqlite.prepare('SELECT COUNT(*) n FROM interview_questions').get().n
    const beforeSets = sqlite.prepare('SELECT COUNT(*) n FROM exam_sets').get().n
    const beforeChoices = sqlite.prepare('SELECT COUNT(*) n FROM exam_choices').get().n
    expandContent(sqlite)
    expect(sqlite.prepare('SELECT COUNT(*) n FROM interview_questions').get().n).toBe(beforeIq)
    expect(sqlite.prepare('SELECT COUNT(*) n FROM exam_sets').get().n).toBe(beforeSets)
    expect(sqlite.prepare('SELECT COUNT(*) n FROM exam_choices').get().n).toBe(beforeChoices)
  })
})
