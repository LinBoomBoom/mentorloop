// 数据库赛道拆分：将单一 mysql 子主题（12 章混 MySQL/PostgreSQL/Redis/NoSQL）拆为
// 四个独立子主题 MySQL / PostgreSQL / Redis / NoSQL。
//
// 背景：backend 模块 subtrack='mysql' 的 12 章里，其实已按技术拆好：
//   dbs-c1/c2/c3   纯 MySQL
//   dbs-c4/c5       纯 PostgreSQL
//   dbs-c6/c7/c8    纯 Redis
//   dbs-c9          存储引擎与索引综合对比（关系型 vs NoSQL）
//   dbs-c10         实践项目（电商数据层，MySQL 为主）
//   be-nosql        NoSQL 与搜索（MongoDB/Cassandra/图库 —— dbs-c* 未覆盖，必须保留）
//   be-c2           旧混排章「MySQL 与 Redis」，内容已被 dbs-c1~c3 / dbs-c6~c8 覆盖 → 用户确认删除
//
// 关键约束：subtrack 名在 backend 模块内全局共享，'redis' 已被 be-search 赛道占用
// （sr-c6~c8），故本赛道的 Redis 内容用新名 'dbredis'，否则两赛道互串。
//
// 拆分后（仅改 subtrack，章节 ID/position/sections 不动，内容零改写）：
//   mysql     = dbs-c1/c2/c3 + dbs-c10             4 章
//   postgresql= dbs-c4/c5                           2 章
//   dbredis   = dbs-c6/c7/c8                        3 章
//   dbnosql   = be-nosql + dbs-c9                   2 章
//
// 双写 data/seed-content.json（真源）与 data/devmentor.db（本地库），幂等、可重跑。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SEED_PATH = path.resolve('data/seed-content.json')
const DB_PATH = path.resolve('data/devmentor.db')
const DRY = process.argv.includes('--dry-run')

// 每章按编号归属的目标 subtrack
const REASSIGN = {
  'dbs-c1': 'mysql', 'dbs-c2': 'mysql', 'dbs-c3': 'mysql',
  'dbs-c4': 'postgresql', 'dbs-c5': 'postgresql',
  'dbs-c6': 'dbredis', 'dbs-c7': 'dbredis', 'dbs-c8': 'dbredis',
  'dbs-c9': 'dbnosql',            // 关系型 vs NoSQL 对比，归入 NoSQL 语境
  'dbs-c10': 'mysql',             // 实践项目以 MySQL 为主
  'be-nosql': 'dbnosql'
}
const DELETE_IDS = ['be-c2'] // 旧混排章，内容已由 dbs-c* 覆盖
const AFFECTED = [...Object.keys(REASSIGN), ...DELETE_IDS]

function detectAlreadySplit(content) {
  const mod = content.modules.find((m) => m.id === 'backend')
  if (!mod) return false
  const byId = Object.fromEntries((mod.chapters || []).map((c) => [c.id, c]))
  // 已拆分标志：be-nosql 已是 dbnosql 且 be-c2 已不存在
  return byId['be-nosql'] && byId['be-nosql'].subtrack === 'dbnosql' && !byId['be-c2']
}

function transformSeed() {
  const content = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
  const mod = content.modules.find((m) => m.id === 'backend')
  if (!mod) throw new Error('backend module not found')
  const byId = Object.fromEntries((mod.chapters || []).map((c) => [c.id, c]))
  if (DELETE_IDS.some((id) => !byId[id]) && AFFECTED.every((id) => byId[id])) {
    // be-c2 已不存在但其余都在：说明已部分执行，按当前状态校准
  }
  if (!AFFECTED.every((id) => byId[id])) throw new Error('缺少数据库章节: ' + AFFECTED.filter((id) => !byId[id]).join(','))
  const report = []
  for (const [id, sub] of Object.entries(REASSIGN)) {
    if (byId[id].subtrack !== sub) { byId[id].subtrack = sub; report.push(`${id} → ${sub}`) }
  }
  mod.chapters = (mod.chapters || []).filter((c) => !DELETE_IDS.includes(c.id))
  return { content, report }
}

function applyDb(report) {
  if (!fs.existsSync(DB_PATH)) { console.log('[DB] 文件不存在，跳过（全新库由 seedIfEmpty + 迁移 v29 处理）'); return }
  const db = new Database(DB_PATH)
  const updCh = db.prepare('UPDATE chapters SET subtrack=? WHERE id=?')
  const delSec = db.prepare('DELETE FROM sections WHERE chapter_id=?')
  const delCh = db.prepare('DELETE FROM chapters WHERE id=?')
  const tx = db.transaction(() => {
    for (const [id, sub] of Object.entries(REASSIGN)) updCh.run(sub, id)
    for (const id of DELETE_IDS) { delSec.run(id); delCh.run(id) }
  })
  tx()
  const cnt = db.prepare("SELECT COUNT(*) c FROM chapters WHERE id='be-c2'").get().c
  console.log(`[DB] subtrack 重映射 ${Object.keys(REASSIGN).length} 章；be-c2 残留 ${cnt}（应为 0）`)
  db.close()
}

const already = detectAlreadySplit(JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')))
if (DRY) {
  console.log(already ? '[dry-run] 种子已处于拆分状态，将仅同步 DB' : '[dry-run] 将执行：')
  if (!already) {
    const content = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
    const mod = content.modules.find((m) => m.id === 'backend')
    const byId = Object.fromEntries((mod.chapters || []).map((c) => [c.id, c]))
    for (const [id, sub] of Object.entries(REASSIGN)) console.log(`  ${id} [${byId[id].subtrack}] → ${sub}`)
    console.log(`  删除: ${DELETE_IDS.join(', ')}`)
  }
  console.log('[dry-run] 未做任何修改')
} else {
  const { content, report } = transformSeed()
  fs.writeFileSync(SEED_PATH, JSON.stringify(content))
  console.log('[seed] 已重映射 ' + report.length + ' 章，删除 ' + DELETE_IDS.join(',') + '；退出 ' + (already ? '(已拆分状态)' : ''))
  applyDb(report)
  console.log('完成。数据库赛道现为 MySQL / PostgreSQL / Redis / NoSQL 四个严格子主题。')
}
