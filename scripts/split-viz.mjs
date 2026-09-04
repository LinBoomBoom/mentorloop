// 可视化赛道拆分：将单一 visualization 子主题拆为严格的 ECharts / D3 / WebGL 三个子主题。
//
// 背景：fe-viz「可视化 / 图形工程师」赛道只有 1 个子主题 visualization，7 章混排三种技术：
//   - vz-c1 可视化基础与工具概览：s1 导论(通用) + s2 ECharts 概览 + s3 D3 概览 + s4 WebGL 与可视化
//     → 唯一的混排章，需按技术拆开，通用导论节在三条路径各保留一份
//   - vz-c2/c3 全 ECharts、vz-c4/c5 全 D3、vz-c6/c7 全 WebGL → 整章直接归属，ID 不变
// vz-c7 的 s3「与 D3 集成」/ s4「与 ECharts 集成」属 WebGL 侧的高级集成主题，随 WebGL 路径保留。
//
// 拆分后（内容零改写，仅重组 + 复制导论节）：
//   echarts = vz-c1e(导论+ECharts概览) / vz-c2 / vz-c3              3 章 / 12 节
//   d3      = vz-c1d(导论+D3概览)     / vz-c4 / vz-c5               3 章 / 10 节
//   webgl   = vz-c1w(导论+WebGL概览)  / vz-c6 / vz-c7               3 章 / 10 节
//
// 本脚本双写 data/seed-content.json（真源）与 data/devmentor.db（本地库），幂等、可重跑。
// 另在 server/utils/db.ts 增加迁移 v28，使老库/全新库在启动时自动对齐（读取种子插入）。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SEED_PATH = path.resolve('data/seed-content.json')
const DB_PATH = path.resolve('data/devmentor.db')
const DRY = process.argv.includes('--dry-run')

// 权威位置表：frontend 模块 0-152 中 41-47(7格)/62(1格) 均不够或不便，
// 153 起为连续空闲块。每次运行都写入，可自愈历史错误位置。
const POSITIONS = {
  'vz-c1e': 153, 'vz-c2': 154, 'vz-c3': 155,
  'vz-c1d': 156, 'vz-c4': 157, 'vz-c5': 158,
  'vz-c1w': 159, 'vz-c6': 160, 'vz-c7': 161
}

// 原章节归属：保留原 ID 给对应路径，仅改 subtrack / position
const REASSIGN = {
  'vz-c2': 'echarts', 'vz-c3': 'echarts',
  'vz-c4': 'd3', 'vz-c5': 'd3',
  'vz-c6': 'webgl', 'vz-c7': 'webgl'
}

// 由 vz-c1 混排章生成的三条路径概览章：[目标章 ID, subtrack, 选取的原小节 ID 顺序]
const DERIVED = [
  { id: 'vz-c1e', subtrack: 'echarts', from: 'vz-c1', picks: ['vz-c1-s1', 'vz-c1-s2'],
    title: '可视化 · 可视化基础与 ECharts 概览',
    goal: '理解数据可视化的基本概念与流程，并对 ECharts 的定位与能力建立整体认识。' },
  { id: 'vz-c1d', subtrack: 'd3', from: 'vz-c1', picks: ['vz-c1-s1', 'vz-c1-s3'],
    title: '可视化 · 可视化基础与 D3 概览',
    goal: '理解数据可视化的基本概念与流程，并对 D3 的定位与能力建立整体认识。' },
  { id: 'vz-c1w', subtrack: 'webgl', from: 'vz-c1', picks: ['vz-c1-s1', 'vz-c1-s4'],
    title: '可视化 · 可视化基础与 WebGL 概览',
    goal: '理解数据可视化的基本概念与流程，并对 WebGL 在可视化中的定位与能力建立整体认识。' }
]

const OLD_IDS = ['vz-c1', 'vz-c2', 'vz-c3', 'vz-c4', 'vz-c5', 'vz-c6', 'vz-c7']
const RESULT_IDS = Object.keys(POSITIONS)

function buildSplit(origById) {
  const out = []
  // 原章直接重新归属
  for (const [id, subtrack] of Object.entries(REASSIGN)) {
    const src = origById[id]
    if (!src) throw new Error(`缺少原可视化章节: ${id}`)
    out.push({ id, title: src.title, goal: src.goal, subtrack, position: POSITIONS[id], sections: src.sections || [] })
  }
  // 由混排章 vz-c1 派生三条路径的概览章
  for (const d of DERIVED) {
    const src = origById[d.from]
    if (!src) throw new Error(`缺少原可视化章节: ${d.from}`)
    const byId = Object.fromEntries((src.sections || []).map((s) => [s.id, s]))
    const picked = d.picks.map((sid) => {
      const s = byId[sid]
      if (!s) throw new Error(`${d.from} 缺少小节 ${sid}`)
      return s
    })
    out.push({
      id: d.id, title: d.title, goal: d.goal, subtrack: d.subtrack, position: POSITIONS[d.id],
      // 派生章小节 ID 必须全局唯一：用目标章 ID 作前缀
      sections: picked.map((s, i) => ({ id: `${d.id}-s${i + 1}`, title: s.title, direction: s.direction, content: s.content }))
    })
  }
  return out.sort((a, b) => a.position - b.position)
}

// 幂等：若种子已含拆分后的章节，则跳过变换，仅校准 subtrack/position
function transformSeed() {
  const content = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
  const mod = content.modules.find((m) => m.id === 'frontend')
  if (!mod) throw new Error('frontend module not found')
  const existing = mod.chapters.filter((c) => RESULT_IDS.includes(c.id))
  if (existing.length === RESULT_IDS.length) {
    for (const c of existing) { c.position = POSITIONS[c.id]; if (REASSIGN[c.id]) c.subtrack = REASSIGN[c.id] }
    mod.chapters = mod.chapters.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    return { content, newChapters: existing.sort((a, b) => a.position - b.position), alreadySplit: true }
  }
  const orig = mod.chapters.filter((c) => OLD_IDS.includes(c.id))
  const origById = Object.fromEntries(orig.map((c) => [c.id, c]))
  if (!OLD_IDS.every((id) => origById[id])) throw new Error('缺少原可视化章节: ' + OLD_IDS.filter((id) => !origById[id]).join(','))
  const newChapters = buildSplit(origById)
  const others = mod.chapters.filter((c) => !OLD_IDS.includes(c.id))
  mod.chapters = [...others, ...newChapters].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return { content, newChapters, alreadySplit: false }
}

function applyDb(newChapters) {
  if (!fs.existsSync(DB_PATH)) { console.log('[DB] 文件不存在，跳过（全新库由 seedIfEmpty + 迁移 v28 处理）'); return }
  const db = new Database(DB_PATH)
  const where = "module_id='frontend' AND subtrack IN ('visualization','echarts','d3','webgl')"
  const before = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  const insCh = db.prepare('INSERT INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)')
  const insSec = db.prepare('INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const delSec = db.prepare('DELETE FROM sections WHERE chapter_id=?')
  const delCh = db.prepare('DELETE FROM chapters WHERE id=?')
  // 先删后插：INSERT OR IGNORE 不会更新已存在行的 position/subtrack，会留下脏数据与位置冲突
  const tx = db.transaction(() => {
    for (const id of [...OLD_IDS, ...RESULT_IDS]) { delSec.run(id); delCh.run(id) }
    for (const ch of newChapters) {
      insCh.run(ch.id, 'frontend', ch.title, ch.goal, ch.position, ch.subtrack)
      for (const [si, s] of ch.sections.entries()) insSec.run(s.id, ch.id, s.title, s.direction ?? null, s.content, si)
    }
  })
  tx()
  const after = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  console.log(`[DB] visualization 相关章节: ${before} → ${after}`)
  db.close()
}

const { content, newChapters, alreadySplit } = transformSeed()
if (DRY) {
  console.log(alreadySplit ? `[dry-run] 种子已拆分，将同步以下 ${newChapters.length} 章到 DB:` : `[dry-run] 将生成的 ${newChapters.length} 章:`)
  for (const c of newChapters) console.log(`  ${c.id} [${c.subtrack}] pos=${c.position} ${c.title} (${c.sections.length} 节)`)
  console.log('[dry-run] 未做任何修改')
} else {
  fs.writeFileSync(SEED_PATH, JSON.stringify(content))
  console.log(alreadySplit ? '[seed] 已处于拆分状态，仅校准 subtrack/position' : `[seed] 已写入拆分后的 ${newChapters.length} 章`)
  applyDb(newChapters)
  console.log('完成。可视化赛道现为 ECharts / D3 / WebGL 三个严格子主题。')
}
