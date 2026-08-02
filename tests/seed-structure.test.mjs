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
  // 当前基线 49 章 / 360 节；只增不减，缩小即回归
  expect(chapters).toBe(49)
  expect(sections).toBeGreaterThanOrEqual(360)
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

test('付费门禁正确：8 套 VIP 卷 vipOnly=true 且 id 含 vip，其余免费', () => {
  const sets = seed.examSets ?? []
  expect(sets.length).toBe(19)
  const vip = sets.filter((s) => s.vipOnly)
  expect(vip.length).toBe(8)
  for (const st of vip) {
    expect(st.id.includes('vip')).toBe(true)
    expect(st.vipOnly).toBe(true)
  }
  const free = sets.filter((s) => !s.vipOnly)
  expect(free.length).toBe(11)
  for (const st of free) expect(st.vipOnly).toBe(false)
})
