// 面试题库回归护栏
// 背景：题库由 300 扩充到 4000+ 后暴露三个静默缺陷，此文件锁死，避免再犯：
//   ① seedIfEmpty 曾用 id[1]==='s' 推导题型，只对 fq/fs 两字母前缀成立；
//      iq-m5-* / xq-* 等新前缀会被一律判成 hot，实测 128 道 special 题在重新 seed 时丢失归类。
//   ② 迁移 v6 的 weight/difficulty 回填跑在 runMigrations 阶段（早于 seedIfEmpty），
//      空表上执行等于没跑，导致新库全部 weight=3 / difficulty 缺失，UI「较难」标签从不出现。
//   ③ 生成脚本曾用「启动时读一次最大编号 + 内存自增」分配 id，多进程/中断重启会读到相同基数，
//      同一 id 在 DB 与种子里指向不同题目（实测 1406 处错位）。现改为由小节 id 派生的确定性 id。
import { describe, it, expect, beforeAll } from 'vitest'
import os from 'os'
import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '..')
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seed-content.json'), 'utf-8'))
const TRACKS = ['frontend', 'backend', 'devops', 'ai']

const seedRows = []
for (const t of TRACKS) {
  const bank = seed.interview?.[t] || {}
  for (const q of bank.hot || []) seedRows.push({ ...q, track: t, type: 'hot' })
  for (const q of bank.special || []) seedRows.push({ ...q, track: t, type: 'special' })
}

describe('面试题库 · 种子完整性', () => {
  it('题量不退化（基线 2632，只增不减）', () => {
    expect(seedRows.length).toBeGreaterThanOrEqual(2632)
  })

  it('id 全局唯一（跨方向、跨 hot/special）', () => {
    const seen = new Set()
    const dup = []
    for (const r of seedRows) {
      if (seen.has(r.id)) dup.push(r.id)
      seen.add(r.id)
    }
    expect(dup).toEqual([])
  })

  it('每道题题干/答案非空且关键词为数组', () => {
    const bad = seedRows.filter(
      (r) => !r.q?.trim() || !r.a?.trim() || !Array.isArray(r.keywords)
    )
    expect(bad.map((r) => r.id)).toEqual([])
  })

  it('special 题占比合理（既非 0 也未压倒 hot）', () => {
    const special = seedRows.filter((r) => r.type === 'special').length
    expect(special).toBeGreaterThan(0)
    expect(special).toBeLessThan(seedRows.length / 2)
  })
})

describe('面试题库 · 新库 seed 落库正确性', () => {
  let sqlite
  beforeAll(async () => {
    const tmp = path.join(os.tmpdir(), `ivbank-${process.pid}-${Date.now()}.db`)
    if (fs.existsSync(tmp)) fs.rmSync(tmp)
    process.env.DB_PATH = tmp
    sqlite = (await import('../server/utils/db')).sqlite
  })

  it('题型按所属数组落库，不受 id 前缀影响（回归①）', () => {
    const expectHot = seedRows.filter((r) => r.type === 'hot').length
    const expectSpecial = seedRows.filter((r) => r.type === 'special').length
    const got = Object.fromEntries(
      sqlite.prepare('SELECT type, COUNT(*) n FROM interview_questions GROUP BY type')
        .all().map((r) => [r.type, r.n])
    )
    expect(got.hot).toBe(expectHot)
    expect(got.special).toBe(expectSpecial)

    // 新前缀（非 fs-/bs-/os-/as-）的 special 题必须仍是 special
    const newPrefixSpecial = seedRows.filter((r) => r.type === 'special' && r.id[1] !== 's')
    expect(newPrefixSpecial.length).toBeGreaterThan(0) // 前提：种子里确实存在这类 id
    for (const r of newPrefixSpecial.slice(0, 30)) {
      const row = sqlite.prepare('SELECT type FROM interview_questions WHERE id=?').get(r.id)
      expect(row?.type, `${r.id} 应为 special`).toBe('special')
    }
  })

  it('weight / difficulty 在 seed 阶段即写入，不依赖迁移回填（回归②）', () => {
    expect(sqlite.prepare('SELECT COUNT(*) n FROM interview_questions WHERE weight IS NULL').get().n).toBe(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE difficulty IS NULL OR difficulty=''").get().n).toBe(0)
    // special 题必须拿到高权重与 hard 难度，否则 UI 的「较难」标签永远不出现
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE type='special' AND weight=5").get().n).toBeGreaterThan(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE difficulty='hard'").get().n).toBeGreaterThan(0)
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE type='hot' AND weight=3").get().n).toBeGreaterThan(0)
  })

  it('tech 分类全部落库（无空值），且覆盖多个子类', () => {
    expect(sqlite.prepare("SELECT COUNT(*) n FROM interview_questions WHERE tech IS NULL OR tech=''").get().n).toBe(0)
    const kinds = sqlite.prepare("SELECT COUNT(DISTINCT tech) n FROM interview_questions WHERE track='frontend'").get().n
    expect(kinds).toBeGreaterThanOrEqual(5)
  })

  it('落库总数与种子一致（无静默丢题）', () => {
    expect(sqlite.prepare('SELECT COUNT(*) n FROM interview_questions').get().n).toBe(seedRows.length)
  })
})
