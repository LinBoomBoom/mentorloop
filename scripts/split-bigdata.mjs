// 一次性执行器：be-data（大数据工程师）从单一 bigdata subtrack 拆为两个子主题
//   - 离线数仓 (offlinedw): bd-c1, bd-c2, bd-c4, bd-c5, bd-c6
//   - 实时流处理 (realtime): bd-c3, bg-c1, bg-c2, bg-c3, bg-c4
// 每章本身已按方向归属（bd-* 批处理/数仓，bg-* 流处理），仅改 subtrack，ID/position/sections 不动。
// 双写 seed-content.json（真源）+ data/devmentor.db（本地库）。支持 --dry-run，幂等可重跑。

import fs from 'node:fs'
import Database from 'better-sqlite3'

const SEED_PATH = './data/seed-content.json'
const DB_PATH = './data/devmentor.db'
const DRY = process.argv.includes('--dry-run')

// 目标映射：章节 ID 前缀/列表 -> 新 subtrack
const OFFLINE = ['bd-c1', 'bd-c2', 'bd-c4', 'bd-c5', 'bd-c6']
const REALTIME = ['bd-c3', 'bg-c1', 'bg-c2', 'bg-c3', 'bg-c4']
const MAP = new Map()
for (const id of OFFLINE) MAP.set(id, 'offlinedw')
for (const id of REALTIME) MAP.set(id, 'realtime')

function transformSeed() {
  const raw = fs.readFileSync(SEED_PATH, 'utf-8')
  const content = JSON.parse(raw)
  const mod = content.modules.find((m) => m.id === 'backend')
  if (!mod) throw new Error('backend module not found')
  const targets = mod.chapters.filter((c) => c.subtrack === 'bigdata')
  if (targets.length === 0) throw new Error('未找到 subtrack=bigdata 的章节（可能已拆分）')
  for (const c of targets) {
    if (MAP.has(c.id)) c.subtrack = MAP.get(c.id)
  }
  return { content, targets }
}

function applyDb() {
  const db = new Database(DB_PATH)
  db.pragma('busy_timeout = 5000')
  const upd = db.prepare("UPDATE chapters SET subtrack=? WHERE id=?")
  const tx = db.transaction(() => {
    for (const [id, sub] of MAP) upd.run(sub, id)
  })
  tx()
  db.close()
}

if (DRY) {
  const { targets } = transformSeed()
  console.log('[dry-run] bigdata 章节数:', targets.length)
  console.log('[dry-run] 离线数仓 (offlinedw):', OFFLINE.join(', '))
  console.log('[dry-run] 实时流处理 (realtime):', REALTIME.join(', '))
  console.log('[dry-run] 未做任何修改')
} else {
  const { content, targets } = transformSeed()
  fs.writeFileSync(SEED_PATH, JSON.stringify(content))
  console.log('[seed] 已写入', targets.length, '章的新 subtrack')
  applyDb()
  console.log('完成。be-data 赛道现为 离线数仓 / 实时流处理 两个严格子主题。')
}
