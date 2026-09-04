// 跨端赛道拆分：将单一 cross 子主题拆为严格的 Flutter / React Native 两个子主题。
//
// 背景：fe-app「跨端 App 工程师（RN / Flutter）」赛道只有 1 个子主题 cross，
// 8 章混排 Flutter 与 React Native 内容，两条技术路线无法独立学习。
// 与桌面端（Electron/Tauri）同构，但更简单：各章小节本身已按技术归属分开，
// 只需重新分组，无需改写或拆分任何正文（内容零改写）。
//
// 本脚本双写 data/seed-content.json（真源）与 data/devmentor.db（本地库），幂等、可重跑。
// 另在 server/utils/db.ts 增加迁移 v25，使老库/全新库在启动时自动对齐（读取种子插入）。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SEED_PATH = path.resolve('data/seed-content.json')
const DB_PATH = path.resolve('data/devmentor.db')
const DRY = process.argv.includes('--dry-run')

// 位置块：Flutter 复用原 cross 释放的 33-40；RN 使用 141-148（frontend 当前 max position=140，全空闲）
const FLUTTER_BASE = 33
const RN_BASE = 141

// 拆分计划：每章按小节技术归属拆为 Flutter / React Native 两章。
// 通用小节（跨端开发简介 s1、开发工具与调试 c1-s4、列表与滚动视图 c2-s5）两条路径各保留一份，保证路径自包含。
const PLAN = [
  {
    n: 1, f: ['s1', 's2', 's4'], r: ['s1', 's3', 's4'],
    fTitle: '跨端 · Flutter 开发基础与环境搭建',
    fGoal: '理解跨端开发的定位与核心概念，掌握 Flutter 开发环境搭建与调试工具链。',
    rTitle: '跨端 · React Native 开发基础与环境搭建',
    rGoal: '理解跨端开发的定位与核心概念，掌握 React Native 开发环境搭建与调试工具链。'
  },
  {
    n: 2, f: ['s1', 's2', 's5'], r: ['s3', 's4', 's5'],
    fTitle: '跨端 · Flutter UI 组件与布局',
    fGoal: '掌握 Flutter 的 Widget 体系与布局方式，能创建响应式界面。',
    rTitle: '跨端 · React Native UI 组件与布局',
    rGoal: '掌握 React Native 核心组件与布局方式，能创建响应式界面。'
  },
  {
    n: 3, f: ['s1', 's2'], r: ['s3', 's4'],
    fTitle: '跨端 · Flutter 状态管理',
    fGoal: '理解并应用 Flutter 状态管理方案，实现应用数据流的清晰管理。',
    rTitle: '跨端 · React Native 状态管理',
    rGoal: '理解并应用 React Native 状态管理方案，实现应用数据流的清晰管理。'
  },
  {
    n: 4, f: ['s1', 's2'], r: ['s3', 's4'],
    fTitle: '跨端 · Flutter 导航与路由',
    fGoal: '实现 Flutter 多页面应用导航，包括参数传递和嵌套导航。',
    rTitle: '跨端 · React Native 导航与路由',
    rGoal: '实现 React Native 多页面应用导航，包括参数传递和嵌套导航。'
  },
  {
    n: 5, f: ['s1', 's2'], r: ['s3', 's4'],
    fTitle: '跨端 · Flutter 网络与数据持久化',
    fGoal: '掌握 Flutter 与服务器交互及本地数据存储的方法。',
    rTitle: '跨端 · React Native 网络与数据持久化',
    rGoal: '掌握 React Native 与服务器交互及本地数据存储的方法。'
  },
  {
    n: 6, f: ['s1', 's2'], r: ['s3', 's4'],
    fTitle: '跨端 · Flutter 原生能力集成',
    fGoal: '学会通过平台通道调用原生设备功能，并实现平台特定代码。',
    rTitle: '跨端 · React Native 原生能力集成',
    rGoal: '学会编写原生模块调用原生设备功能，并实现平台特定代码。'
  },
  {
    n: 7, f: ['s1', 's2'], r: ['s3', 's4'],
    fTitle: '跨端 · Flutter 测试与调试',
    fGoal: '掌握 Flutter 单元测试、组件测试和性能调试方法。',
    rTitle: '跨端 · React Native 测试与调试',
    rGoal: '掌握 React Native 单元测试、组件测试和性能调试方法。'
  },
  {
    n: 8, f: ['s1', 's2'], r: ['s3', 's4'],
    fTitle: '跨端 · Flutter 性能优化与发布',
    fGoal: '优化 Flutter 应用性能并掌握打包发布流程。',
    rTitle: '跨端 · React Native 性能优化与发布',
    rGoal: '优化 React Native 应用性能并掌握打包发布流程。'
  }
]

function clone(sec, newId) {
  return { id: newId, title: sec.title, direction: sec.direction, content: sec.content }
}

// 基于原 cross 章节构建拆分后的 16 章（Flutter 8 + React Native 8）
function buildSplit(origById) {
  const out = []
  for (const p of PLAN) {
    const src = origById[`xp-c${p.n}`]
    const bySid = Object.fromEntries(src.sections.map((s) => [s.id.split('-').pop(), s]))
    const pick = (keys) => keys.map((k) => bySid[k])
    out.push({
      id: `xp-c${p.n}f`, title: p.fTitle, goal: p.fGoal,
      position: FLUTTER_BASE + p.n - 1, subtrack: 'flutter',
      sections: pick(p.f).map((s, i) => clone(s, `xp-c${p.n}f-s${i + 1}`))
    })
    out.push({
      id: `xp-c${p.n}r`, title: p.rTitle, goal: p.rGoal,
      position: RN_BASE + p.n - 1, subtrack: 'reactnative',
      sections: pick(p.r).map((s, i) => clone(s, `xp-c${p.n}r-s${i + 1}`))
    })
  }
  return out.sort((a, b) => a.position - b.position)
}

const SPLIT_IDS = PLAN.flatMap((p) => [`xp-c${p.n}f`, `xp-c${p.n}r`])
const OLD_IDS = PLAN.map((p) => `xp-c${p.n}`)

// 幂等：若种子已含拆分后的章节，则跳过变换，直接取现有 16 章用于同步 DB
function transformSeed() {
  const content = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
  const mod = content.modules.find((m) => m.id === 'frontend')
  if (!mod) throw new Error('frontend module not found')
  const existing = mod.chapters.filter((c) => SPLIT_IDS.includes(c.id))
  if (existing.length === SPLIT_IDS.length) {
    return { content, newChapters: existing.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)), alreadySplit: true }
  }
  const orig = mod.chapters.filter((c) => c.id.startsWith('xp-'))
  const origById = Object.fromEntries(orig.map((c) => [c.id, c]))
  if (!OLD_IDS.every((id) => origById[id])) throw new Error('缺少原跨端章节: ' + OLD_IDS.filter((id) => !origById[id]).join(','))
  const newChapters = buildSplit(origById)
  const others = mod.chapters.filter((c) => !c.id.startsWith('xp-'))
  mod.chapters = [...others, ...newChapters].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return { content, newChapters, alreadySplit: false }
}

function applyDb(newChapters) {
  if (!fs.existsSync(DB_PATH)) { console.log('[DB] 文件不存在，跳过（全新库由 seedIfEmpty + 迁移 v25 处理）'); return }
  const db = new Database(DB_PATH)
  const where = "module_id='frontend' AND subtrack IN ('cross','flutter','reactnative')"
  const before = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  const insCh = db.prepare('INSERT INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)')
  const insSec = db.prepare('INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const delSec = db.prepare('DELETE FROM sections WHERE chapter_id=?')
  const delCh = db.prepare('DELETE FROM chapters WHERE id=?')
  // 先删后插：INSERT OR IGNORE 不会更新已存在行的 position/subtrack，会留下位置冲突
  const tx = db.transaction(() => {
    for (const id of [...OLD_IDS, ...SPLIT_IDS]) { delSec.run(id); delCh.run(id) }
    for (const ch of newChapters) {
      insCh.run(ch.id, 'frontend', ch.title, ch.goal, ch.position, ch.subtrack)
      for (const [si, s] of ch.sections.entries()) insSec.run(s.id, ch.id, s.title, s.direction ?? null, s.content, si)
    }
  })
  tx()
  const after = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  console.log(`[DB] cross 相关章节: ${before} → ${after}`)
  db.close()
}

const { content, newChapters, alreadySplit } = transformSeed()
if (DRY) {
  console.log(alreadySplit ? '[dry-run] 种子已拆分，将同步以下 16 章到 DB:' : '[dry-run] 将生成的 16 章:')
  for (const c of newChapters) console.log(`  ${c.id} [${c.subtrack}] pos=${c.position} ${c.title} (${c.sections.length} 节)`)
  console.log('[dry-run] 未做任何修改')
} else {
  if (!alreadySplit) { fs.writeFileSync(SEED_PATH, JSON.stringify(content)); console.log('[seed] 已写入拆分后的 16 章') }
  else console.log('[seed] 已处于拆分状态，跳过写入')
  applyDb(newChapters)
  console.log('完成。跨端赛道现为 Flutter / React Native 两个严格子主题。')
}
