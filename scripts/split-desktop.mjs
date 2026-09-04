// 桌面端赛道拆分：将单一 desktop 子主题拆为严格的 Electron / Tauri 两个子主题。
//
// 背景：原 fe-desktop 赛道只有 1 个子主题 desktop，5 章混排 Electron 与 Tauri 内容。
// 用户要求严格 2 个子主题，于是把对比/综合型章节（dt-c1/c4/c5）也拆成 Electron / Tauri 两个版本，
// 纯 Electron 的 dt-c2 与纯 Tauri 的 dt-c3 归到各自路径。
//
// 本脚本双写 data/seed-content.json（真源）与 data/devmentor.db（本地库），幂等、可重跑。
// 另在 server/utils/db.ts 增加迁移 v24，使老库/全新库在启动时自动对齐（读取种子插入）。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SEED_PATH = path.resolve('data/seed-content.json')
const DB_PATH = path.resolve('data/devmentor.db')
const DRY = process.argv.includes('--dry-run')

// 权威位置表：每次运行都用它校准，避免与既有章节撞位。
// 教训：首版把 Tauri 路径排在 62-65，其中 63/64/65 已被可视化赛道 vz-c1/c2/c3 占用，
// 导致 ORDER BY position 顺序不确定。现 Tauri 路径统一放到 frontend 末尾的空闲块 149-152。
const POSITIONS = {
  'dt-c1e': 58, 'dt-c2': 59, 'dt-c4e': 60, 'dt-c5e': 61, // Electron 路径
  'dt-c1t': 149, 'dt-c3': 150, 'dt-c4t': 151, 'dt-c5t': 152 // Tauri 路径
}

function clone(sec, newId) {
  return { id: newId, title: sec.title, direction: sec.direction, content: sec.content }
}

// 在内存中基于原 desktop 章节构建拆分后的 8 章
function buildSplit(origById) {
  const o = (id) => origById[id]
  const newChapters = [
    // ---- Electron 路径 ----
    {
      id: 'dt-c1e', title: '桌面 · Electron 应用开发基础',
      goal: '理解桌面应用开发基本概念，掌握 Electron 架构与基于 Node.js 的开发环境搭建。',
      position: POSITIONS['dt-c1e'], subtrack: 'electron',
      sections: [
        clone(o('dt-c1').sections.find((s) => s.id === 'dt-c1-s1'), 'dt-c1e-s1'),
        clone(o('dt-c1').sections.find((s) => s.id === 'dt-c1-s2'), 'dt-c1e-s2'),
        clone(o('dt-c1').sections.find((s) => s.id === 'dt-c1-s4'), 'dt-c1e-s3')
      ]
    },
    { id: 'dt-c2', title: o('dt-c2').title, goal: o('dt-c2').goal, position: POSITIONS['dt-c2'], subtrack: 'electron', sections: o('dt-c2').sections },
    {
      id: 'dt-c4e', title: '桌面 · Electron 前端集成与构建优化',
      goal: '掌握如何将主流前端框架与 Electron 集成，并优化构建与打包流程。',
      position: POSITIONS['dt-c4e'], subtrack: 'electron',
      sections: [
        clone(o('dt-c4').sections.find((s) => s.id === 'dt-c4-s1'), 'dt-c4e-s1'),
        clone(o('dt-c4').sections.find((s) => s.id === 'dt-c4-s2'), 'dt-c4e-s2'),
        clone(o('dt-c4').sections.find((s) => s.id === 'dt-c4-s4'), 'dt-c4e-s3')
      ]
    },
    {
      id: 'dt-c5e', title: '桌面 · Electron 安全与高级实践',
      goal: '掌握 Electron 桌面应用的安全最佳实践，并了解自动化测试与持续集成等高级主题。',
      position: POSITIONS['dt-c5e'], subtrack: 'electron',
      sections: [
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s1'), 'dt-c5e-s1'),
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s2'), 'dt-c5e-s2'),
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s3'), 'dt-c5e-s3'),
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s4'), 'dt-c5e-s4')
      ]
    },
    // ---- Tauri 路径 ----
    {
      id: 'dt-c1t', title: '桌面 · Tauri 应用开发基础',
      goal: '理解桌面应用开发基本概念，掌握 Tauri 架构与基于 Rust 的开发环境搭建。',
      position: POSITIONS['dt-c1t'], subtrack: 'tauri',
      sections: [
        clone(o('dt-c1').sections.find((s) => s.id === 'dt-c1-s1'), 'dt-c1t-s1'),
        clone(o('dt-c1').sections.find((s) => s.id === 'dt-c1-s3'), 'dt-c1t-s2'),
        clone(o('dt-c1').sections.find((s) => s.id === 'dt-c1-s4'), 'dt-c1t-s3')
      ]
    },
    { id: 'dt-c3', title: o('dt-c3').title, goal: o('dt-c3').goal, position: POSITIONS['dt-c3'], subtrack: 'tauri', sections: o('dt-c3').sections },
    {
      id: 'dt-c4t', title: '桌面 · Tauri 前端集成与构建优化',
      goal: '掌握如何将主流前端框架与 Tauri 集成，并优化构建与打包流程。',
      position: POSITIONS['dt-c4t'], subtrack: 'tauri',
      sections: [
        clone(o('dt-c4').sections.find((s) => s.id === 'dt-c4-s1'), 'dt-c4t-s1'),
        clone(o('dt-c4').sections.find((s) => s.id === 'dt-c4-s3'), 'dt-c4t-s2'),
        clone(o('dt-c4').sections.find((s) => s.id === 'dt-c4-s4'), 'dt-c4t-s3')
      ]
    },
    {
      id: 'dt-c5t', title: '桌面 · Tauri 安全与高级实践',
      goal: '掌握 Tauri 桌面应用的安全最佳实践，并了解自动化测试与持续集成等高级主题。',
      position: POSITIONS['dt-c5t'], subtrack: 'tauri',
      sections: [
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s1'), 'dt-c5t-s1'),
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s2'), 'dt-c5t-s2'),
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s3'), 'dt-c5t-s3'),
        clone(o('dt-c5').sections.find((s) => s.id === 'dt-c5-s4'), 'dt-c5t-s4')
      ]
    }
  ]
  return newChapters.sort((a, b) => a.position - b.position)
}

const SPLIT_IDS = ['dt-c1e', 'dt-c1t', 'dt-c2', 'dt-c3', 'dt-c4e', 'dt-c4t', 'dt-c5e', 'dt-c5t']
const OLD_IDS = ['dt-c1', 'dt-c4', 'dt-c5']

// 幂等：若种子已含拆分后的章节，则跳过变换；两种情况都用 POSITIONS 校准位置（自愈）
function transformSeed() {
  const content = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
  const mod = content.modules.find((m) => m.id === 'frontend')
  if (!mod) throw new Error('frontend module not found')
  const existing = mod.chapters.filter((c) => SPLIT_IDS.includes(c.id))
  if (existing.length === SPLIT_IDS.length) {
    const newChapters = existing.map((c) => ({ ...c, position: POSITIONS[c.id] ?? c.position }))
      .sort((a, b) => a.position - b.position)
    return { content, newChapters, alreadySplit: true }
  }
  const orig = mod.chapters.filter((c) => c.id.startsWith('dt-'))
  const origById = Object.fromEntries(orig.map((c) => [c.id, c]))
  const need = ['dt-c1', 'dt-c2', 'dt-c3', 'dt-c4', 'dt-c5']
  if (!need.every((id) => origById[id])) throw new Error('缺少原桌面端章节: ' + need.filter((id) => !origById[id]).join(','))
  const newChapters = buildSplit(origById)
  // 用新章节替换所有 dt- 开头章节，保持其在模块数组中的相对顺序（按 position）
  const others = mod.chapters.filter((c) => !c.id.startsWith('dt-'))
  mod.chapters = [...others, ...newChapters].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return { content, newChapters, alreadySplit: false }
}

function applyDb(newChapters) {
  if (!fs.existsSync(DB_PATH)) { console.log('[DB] 文件不存在，跳过（全新库由 seedIfEmpty + 迁移 v24 处理）'); return }
  const db = new Database(DB_PATH)
  const where = "module_id='frontend' AND subtrack IN ('electron','tauri')"
  const before = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  const insCh = db.prepare('INSERT INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)')
  const insSec = db.prepare('INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const delSec = db.prepare('DELETE FROM sections WHERE chapter_id=?')
  const delCh = db.prepare('DELETE FROM chapters WHERE id=?')
  // 旧 3 章 + 复用的 2 章（dt-c2/dt-c3）一并先删后插：
  // INSERT OR IGNORE 不会更新已存在行的 position/subtrack，会留下位置冲突，故用删后插保证与种子完全一致。
  const tx = db.transaction(() => {
    for (const id of [...OLD_IDS, ...SPLIT_IDS]) { delSec.run(id); delCh.run(id) }
    for (const ch of newChapters) {
      insCh.run(ch.id, 'frontend', ch.title, ch.goal, ch.position, ch.subtrack)
      for (const [si, s] of ch.sections.entries()) insSec.run(s.id, ch.id, s.title, s.direction ?? null, s.content, si)
    }
  })
  tx()
  const after = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  console.log(`[DB] desktop 相关章节: ${before} → ${after}`)
  db.close()
}

const { content, newChapters, alreadySplit } = transformSeed()
if (DRY) {
  console.log(alreadySplit ? '[dry-run] 种子已拆分，将按权威位置表校准下列 8 章:' : '[dry-run] 将生成的 8 章:')
  for (const c of newChapters) console.log(`  ${c.id} [${c.subtrack}] pos=${c.position} ${c.title} (${c.sections.length} 节)`)
  console.log('[dry-run] 未做任何修改')
} else {
  // 始终写回：既覆盖首次拆分，也用 POSITIONS 校准历史遗留的错误位置
  fs.writeFileSync(SEED_PATH, JSON.stringify(content))
  console.log(alreadySplit ? '[seed] 已按权威位置表校准' : '[seed] 已写入拆分后的 8 章')
  applyDb(newChapters)
  console.log('完成。桌面端赛道现为 Electron / Tauri 两个严格子主题。')
}
