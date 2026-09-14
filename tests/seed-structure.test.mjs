import { test, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seed-content.json'), 'utf-8'))

test('模块结构完整：每个模块含 id 与章节数组', () => {
  expect(Array.isArray(seed.modules)).toBe(true)
  expect(seed.modules.length).toBeGreaterThanOrEqual(4)
  for (const m of seed.modules) {
    expect(typeof m.id).toBe('string')
    expect(Array.isArray(m.chapters)).toBe(true)
  }
})

test('每章每节字段齐全、内容非空、且带时效块（宪章红线）', () => {
  for (const m of seed.modules) {
    for (const c of m.chapters) {
      expect(Array.isArray(c.sections)).toBe(true)
      expect(c.sections.length).toBeGreaterThanOrEqual(1)
      const ids = new Set()
      for (const s of c.sections) {
        expect(typeof s.id).toBe('string')
        expect(s.id.length).toBeGreaterThan(0)
        expect(typeof s.title).toBe('string')
        expect(s.title.length).toBeGreaterThan(0)
        expect(typeof s.content).toBe('string')
        expect(s.content.trim().length).toBeGreaterThan(0)
        // position 为可选内部排序提示：存在则必须是 number（防脏数据），不强制每节都带
        if (s.position !== undefined) {
          expect(typeof s.position).toBe('number')
        }
        // 宪章要求每节顶部带「> 时效」标记，缺失即违规
        expect(s.content.startsWith('> 时效')).toBe(true)
        // 同章内 section id 唯一
        expect(ids.has(s.id)).toBe(false)
        ids.add(s.id)
      }
    }
  }
})

test('章节/节总量不退化（回归护栏：曾因 id 撞车静默丢题 #50）', () => {
  let chapters = 0
  let sections = 0
  for (const m of seed.modules) {
    for (const c of m.chapters) {
      chapters++
      sections += c.sections.length
    }
  }
  // 当前基线 101 章 / 547 节（含细分赛道课程，gen-learn 批量生成）；只增不减，缩小即回归
  expect(chapters).toBeGreaterThanOrEqual(101)
  expect(sections).toBeGreaterThanOrEqual(547)
})

test('面试题零空答（210 题全有答案）', () => {
  const tracks = ['frontend', 'backend', 'devops', 'ai']
  let total = 0
  let empty = 0
  for (const t of tracks) {
    const o = seed.interview?.[t]
    if (!o) continue
    for (const k of Object.keys(o)) {
      if (!Array.isArray(o[k])) continue
      for (const q of o[k]) {
        total++
        const a = q.a ?? q.answer ?? ''
        if (!a || a.trim().length === 0) empty++
      }
    }
  }
  expect(total).toBeGreaterThanOrEqual(200)
  expect(empty).toBe(0)
})

test('考卷 choice/written id 全局唯一（回归 #50 根因）', () => {
  const sets = seed.examSets ?? []
  expect(sets.length).toBeGreaterThanOrEqual(7)
  const choiceIds = new Set()
  const writtenIds = new Set()
  for (const st of sets) {
    for (const c of st.choices ?? []) {
      expect(choiceIds.has(c.id)).toBe(false)
      choiceIds.add(c.id)
    }
    for (const w of st.written ?? []) {
      expect(writtenIds.has(w.id)).toBe(false)
      writtenIds.add(w.id)
    }
    // 每套至少带足题量
    expect((st.choices ?? []).length).toBeGreaterThanOrEqual(10)
  }
})

// 注意：本用例早期把总量写死为 19、VIP 卷 8 套、免费卷 11 套。内容扩充后总量已到 57
// （新增各赛道 basic/inter/adv 卷，其中 19 套 -adv 进阶卷同样是 vipOnly，但 id 不含 vip），
// 三个快照数字同时失效。写死数量只会在每次内容迭代后误报（#50 也是同类问题），
// 因此改为断言「真实不变量」：数量只做不回退护栏，门禁语义必须自洽。
test('付费门禁正确：VIP 卷 / 免费卷互斥、id 唯一、数量不回退', () => {
  const sets = seed.examSets ?? []
  // 不回退护栏：低于历史 19 套说明内容被静默丢失
  expect(sets.length).toBeGreaterThanOrEqual(19)
  const ids = sets.map((s) => s.id)
  expect(new Set(ids).size).toBe(ids.length)

  const vip = sets.filter((s) => s.vipOnly)
  const free = sets.filter((s) => !s.vipOnly)
  // 两档都必须存在：VIP 卷是付费卖点（plans.ts 的 vip-exam），
  // 免费卷保证未付费用户不会被全量锁死。
  expect(vip.length).toBeGreaterThanOrEqual(8)
  expect(free.length).toBeGreaterThan(0)
  // 门禁字段必须自洽：历史上出现过 vipOnly 被写成字符串 "true"/1 导致判定漂移的情况
  for (const st of sets) {
    expect(st.vipOnly === undefined || typeof st.vipOnly === 'boolean').toBe(true)
  }
  for (const st of vip) expect(st.vipOnly).toBe(true)
  for (const st of free) expect(st.vipOnly).not.toBe(true)
})
