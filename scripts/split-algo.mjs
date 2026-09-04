// 算法赛道拆分：将单一 algo 子主题拆为严格的 CV / NLP / 推荐 三个子主题。
//
// 背景：ai-algo「算法工程师（CV / NLP / 推荐）」赛道只有 1 个子主题 algo，9 章混排：
//   - 框架章 al-c1/c2(PyTorch 基础/进阶)、al-c3/c4(scikit-learn 基础/进阶)、al-c5/c6(TensorFlow 基础/进阶)
//     内容为纯框架概念（张量/自动微分/估计器/Keras 等），与具体方向无关，无法按方向切分小节。
//   - 实战章 al-c7(CV)、al-c8(NLP)、al-c9(推荐) 每节内部同时讲 PyTorch/TF/sklearn 三套实现，
//     同样无法按小节拆分（检测到每节均命中多框架关键词）。
// 因此与桌面端（Electron/Tauri）同构处理：整章归属 + 框架章在需要的路径各保留一份，
// 保证每条路径自包含。内容零改写，仅重组与复制。
//
// 路径设计（按各方向最少必要框架，避免无谓复制）：
//   CV   = PyTorch 基础/进阶 + TensorFlow 基础/进阶 + CV 实战          (5 章 / 27 节)
//   NLP  = PyTorch 基础/进阶 + TensorFlow 基础/进阶 + NLP 实战         (5 章 / 27 节)
//   推荐 = scikit-learn 基础/进阶 + PyTorch 基础 + 推荐模型实战        (4 章 / 23 节)
//
// 本脚本双写 data/seed-content.json（真源）与 data/devmentor.db（本地库），幂等、可重跑。
// 另在 server/utils/db.ts 增加迁移 v26，使老库/全新库在启动时自动对齐（读取种子插入）。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SEED_PATH = path.resolve('data/seed-content.json')
const DB_PATH = path.resolve('data/devmentor.db')
const DRY = process.argv.includes('--dry-run')

// 权威位置表：ai 模块原占用 0-38，39 起为连续空闲块。
// 用固定表可在每次运行时校准，自愈历史错误位置（汲取桌面端 Tauri 撞车 vz-c1/c2/c3 的教训）。
const POSITIONS = {
  // CV（PyTorch + TensorFlow）
  'al-c1': 39, 'al-c2': 40, 'al-c5': 41, 'al-c6': 42, 'al-c7': 43,
  // NLP（PyTorch + TensorFlow）
  'al-c1n': 44, 'al-c2n': 45, 'al-c5n': 46, 'al-c6n': 47, 'al-c8': 48,
  // 推荐（scikit-learn + PyTorch）
  'al-c3': 49, 'al-c4': 50, 'al-c1r': 51, 'al-c9': 52
}

// 章节归属：保留原 ID 给第一条使用它的路径，其余路径建副本（新 ID）
const RESULTS = [
  { id: 'al-c1', subtrack: 'cv', from: 'al-c1' },
  { id: 'al-c2', subtrack: 'cv', from: 'al-c2' },
  { id: 'al-c5', subtrack: 'cv', from: 'al-c5' },
  { id: 'al-c6', subtrack: 'cv', from: 'al-c6' },
  { id: 'al-c7', subtrack: 'cv', from: 'al-c7' },

  { id: 'al-c1n', subtrack: 'nlp', from: 'al-c1' },
  { id: 'al-c2n', subtrack: 'nlp', from: 'al-c2' },
  { id: 'al-c5n', subtrack: 'nlp', from: 'al-c5' },
  { id: 'al-c6n', subtrack: 'nlp', from: 'al-c6' },
  { id: 'al-c8', subtrack: 'nlp', from: 'al-c8' },

  { id: 'al-c3', subtrack: 'rec', from: 'al-c3' },
  { id: 'al-c4', subtrack: 'rec', from: 'al-c4' },
  { id: 'al-c1r', subtrack: 'rec', from: 'al-c1' },
  { id: 'al-c9', subtrack: 'rec', from: 'al-c9' }
]

const OLD_IDS = ['al-c1', 'al-c2', 'al-c3', 'al-c4', 'al-c5', 'al-c6', 'al-c7', 'al-c8', 'al-c9']
const RESULT_IDS = RESULTS.map((r) => r.id)

function buildSplit(origById) {
  return RESULTS.map((r) => {
    const src = origById[r.from]
    if (!src) throw new Error(`缺少原算法章节: ${r.from}`)
    return {
      id: r.id,
      title: src.title,
      goal: src.goal,
      subtrack: r.subtrack,
      position: POSITIONS[r.id],
      // 副本章节的小节 ID 必须全局唯一：改用副本章节 ID 作前缀
      sections: (src.sections || []).map((s, i) => ({
        id: `${r.id}-s${i + 1}`,
        title: s.title,
        direction: s.direction,
        content: s.content
      }))
    }
  }).sort((a, b) => a.position - b.position)
}

// 幂等：若种子已含拆分后的 14 章，则跳过变换，直接取现有章节用于同步 DB
function transformSeed() {
  const content = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
  const mod = content.modules.find((m) => m.id === 'ai')
  if (!mod) throw new Error('ai module not found')
  const existing = mod.chapters.filter((c) => RESULT_IDS.includes(c.id))
  if (existing.length === RESULT_IDS.length) {
    // 已拆分：仍用权威位置表校准，避免历史错误位置
    for (const c of existing) if (POSITIONS[c.id] != null) c.position = POSITIONS[c.id]
    return { content, newChapters: existing.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)), alreadySplit: true }
  }
  const orig = mod.chapters.filter((c) => OLD_IDS.includes(c.id))
  const origById = Object.fromEntries(orig.map((c) => [c.id, c]))
  if (!OLD_IDS.every((id) => origById[id])) throw new Error('缺少原算法章节: ' + OLD_IDS.filter((id) => !origById[id]).join(','))
  const newChapters = buildSplit(origById)
  const others = mod.chapters.filter((c) => !OLD_IDS.includes(c.id))
  mod.chapters = [...others, ...newChapters].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return { content, newChapters, alreadySplit: false }
}

function applyDb(newChapters) {
  if (!fs.existsSync(DB_PATH)) { console.log('[DB] 文件不存在，跳过（全新库由 seedIfEmpty + 迁移 v26 处理）'); return }
  const db = new Database(DB_PATH)
  const where = "module_id='ai' AND subtrack IN ('algo','cv','nlp','rec')"
  const before = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  const insCh = db.prepare('INSERT INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)')
  const insSec = db.prepare('INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const delSec = db.prepare('DELETE FROM sections WHERE chapter_id=?')
  const delCh = db.prepare('DELETE FROM chapters WHERE id=?')
  // 先删后插：INSERT OR IGNORE 不会更新已存在行的 position/subtrack，会留下位置冲突
  const tx = db.transaction(() => {
    for (const id of [...OLD_IDS, ...RESULT_IDS]) { delSec.run(id); delCh.run(id) }
    for (const ch of newChapters) {
      insCh.run(ch.id, 'ai', ch.title, ch.goal, ch.position, ch.subtrack)
      for (const [si, s] of ch.sections.entries()) insSec.run(s.id, ch.id, s.title, s.direction ?? null, s.content, si)
    }
  })
  tx()
  const after = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  console.log(`[DB] algo 相关章节: ${before} → ${after}`)
  db.close()
}

const { content, newChapters, alreadySplit } = transformSeed()
if (DRY) {
  console.log(alreadySplit ? `[dry-run] 种子已拆分，将同步以下 ${newChapters.length} 章到 DB:` : `[dry-run] 将生成的 ${newChapters.length} 章:`)
  for (const c of newChapters) console.log(`  ${c.id} [${c.subtrack}] pos=${c.position} ${c.title} (${c.sections.length} 节)`)
  console.log('[dry-run] 未做任何修改')
} else {
  if (!alreadySplit) { fs.writeFileSync(SEED_PATH, JSON.stringify(content)); console.log(`[seed] 已写入拆分后的 ${newChapters.length} 章`) }
  else { fs.writeFileSync(SEED_PATH, JSON.stringify(content)); console.log('[seed] 已处于拆分状态，仅校准 position') }
  applyDb(newChapters)
  console.log('完成。算法赛道现为 CV / NLP / 推荐 三个严格子主题。')
}
