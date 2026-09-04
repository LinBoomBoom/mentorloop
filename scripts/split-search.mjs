// 搜索中间件赛道拆分：将单一 searchmw 子主题拆为严格的 Elasticsearch / Redis 两个子主题。
//
// 背景：be-search「搜索 / 中间件工程师」赛道只有 1 个子主题 searchmw，8 章混排两种技术：
//   - sr-c1..c5 全部为 Elasticsearch（入门 / 映射与分析 / 查询 DSL / 聚合分析 / 分布式架构）
//   - sr-c6..c8 全部为 Redis（基础 / 持久化与高可用 / 缓存设计与优化）
// 实测每章每节均为单一技术，是三次拆分中最干净的一例：
//   **整章直接重新归属即可，无需拆分小节、无需复制章节、无需改写正文**（真正零改动）。
//
// 拆分后：
//   es    = sr-c1..c5（5 章 / 17 节）
//   redis = sr-c6..c8（3 章 / 12 节）
//
// 本脚本双写 data/seed-content.json（真源）与 data/devmentor.db（本地库），幂等、可重跑。
// 另在 server/utils/db.ts 增加迁移 v27，使老库/全新库在启动时自动对齐（读取种子插入）。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SEED_PATH = path.resolve('data/seed-content.json')
const DB_PATH = path.resolve('data/devmentor.db')
const DRY = process.argv.includes('--dry-run')

// 权威位置表：backend 模块 0-60 与 68-90 已占用，61-67 仅 7 格（不够放 8 章且有历史遗留 gm-c8=68 跳号），
// 故统一使用 91-98 连续空闲块（MAX(position)=90）。每次运行都写入，可自愈历史错误位置。
const CHUNKS = {
  es: { ids: ['sr-c1', 'sr-c2', 'sr-c3', 'sr-c4', 'sr-c5'], base: 91 },
  redis: { ids: ['sr-c6', 'sr-c7', 'sr-c8'], base: 96 }
}

const POSITIONS = {}
const ASSIGN = {}
for (const [subtrack, { ids, base }] of Object.entries(CHUNKS)) {
  ids.forEach((id, i) => { POSITIONS[id] = base + i; ASSIGN[id] = subtrack })
}

const ALL_IDS = Object.keys(POSITIONS)

// 幂等：若种子中 sr-c1 已归属 es，则跳过变换，仅校准 position
function transformSeed() {
  const content = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
  const mod = content.modules.find((m) => m.id === 'backend')
  if (!mod) throw new Error('backend module not found')
  const targets = mod.chapters.filter((c) => ALL_IDS.includes(c.id))
  if (!targets.length) throw new Error('未找到 searchmw 章节: ' + ALL_IDS.join(','))
  const alreadySplit = ASSIGN['sr-c1'] === 'es' && targets.some((c) => c.id === 'sr-c1' && c.subtrack === 'es')
  for (const c of targets) { c.subtrack = ASSIGN[c.id]; c.position = POSITIONS[c.id] }
  mod.chapters = mod.chapters.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return { content, newChapters: targets.sort((a, b) => a.position - b.position), alreadySplit }
}

function applyDb(newChapters) {
  if (!fs.existsSync(DB_PATH)) { console.log('[DB] 文件不存在，跳过（全新库由 seedIfEmpty + 迁移 v27 处理）'); return }
  const db = new Database(DB_PATH)
  const where = "module_id='backend' AND subtrack IN ('searchmw','es','redis')"
  const before = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  const insCh = db.prepare('INSERT INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)')
  const insSec = db.prepare('INSERT INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const delSec = db.prepare('DELETE FROM sections WHERE chapter_id=?')
  const delCh = db.prepare('DELETE FROM chapters WHERE id=?')
  // 先删后插：INSERT OR IGNORE 不会更新已存在行的 position/subtrack，会留下脏数据
  const tx = db.transaction(() => {
    for (const id of ALL_IDS) { delSec.run(id); delCh.run(id) }
    for (const ch of newChapters) {
      insCh.run(ch.id, 'backend', ch.title, ch.goal, ch.position, ch.subtrack)
      for (const [si, s] of ch.sections.entries()) insSec.run(s.id, ch.id, s.title, s.direction ?? null, s.content, si)
    }
  })
  tx()
  const after = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE ${where}`).get().c
  console.log(`[DB] searchmw 相关章节: ${before} → ${after}`)
  db.close()
}

const { content, newChapters, alreadySplit } = transformSeed()
if (DRY) {
  console.log(alreadySplit ? `[dry-run] 种子已拆分，将同步以下 ${newChapters.length} 章到 DB:` : `[dry-run] 将重新归属以下 ${newChapters.length} 章:`)
  for (const c of newChapters) console.log(`  ${c.id} [${c.subtrack}] pos=${c.position} ${c.title} (${c.sections.length} 节)`)
  console.log('[dry-run] 未做任何修改')
} else {
  fs.writeFileSync(SEED_PATH, JSON.stringify(content))
  console.log(alreadySplit ? '[seed] 已处于拆分状态，仅校准 subtrack/position' : `[seed] 已写入重新归属后的 ${newChapters.length} 章`)
  applyDb(newChapters)
  console.log('完成。搜索中间件赛道现为 Elasticsearch / Redis 两个严格子主题。')
}
