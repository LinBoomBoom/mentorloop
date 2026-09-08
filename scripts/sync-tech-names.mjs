#!/usr/bin/env node
// 由题库实际标签反向同步 learningTaxonomy.ts 的 techNames
//
// 目的：消除「声明但 0 题」(空筛选) 与「有题但未声明」(漏筛) 两类事故。
// 规则：techNames := 该赛道题库中出现过的标签，按题目数降序。
// 前置：tech 必须已通过受控词表校验（scripts/audit-taxonomy.mjs A3/A9）。
//
// 用法：
//   node scripts/sync-tech-names.mjs          # dry-run，打印 diff
//   node scripts/sync-tech-names.mjs --apply  # 写回 app/data/learningTaxonomy.ts

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const ROOT = process.cwd()
const TAX_PATH = path.join(ROOT, 'app/data/learningTaxonomy.ts')
const APPLY = process.argv.includes('--apply')

const db = new Database(path.join(ROOT, 'data/devmentor.db'), { readonly: true })
const rows = db.prepare('select subtrack, tech, count(*) c from interview_questions group by subtrack, tech').all()

const byTrack = new Map()
for (const r of rows) {
  if (!byTrack.has(r.subtrack)) byTrack.set(r.subtrack, [])
  byTrack.get(r.subtrack).push([r.tech, r.c])
}
for (const [k, v] of byTrack) v.sort((a, b) => b[1] - a[1])

const src = fs.readFileSync(TAX_PATH, 'utf8')
const lines = src.split('\n')
let current = null
let changed = 0
const diff = []

for (let i = 0; i < lines.length; i++) {
  const idMatch = lines[i].match(/id:\s*'([a-z0-9-]+)'/)
  if (idMatch) current = idMatch[1]
  if (!/techNames:/.test(lines[i]) || !current) continue
  const list = byTrack.get(current)
  if (!list) continue
  const next = list.map(x => x[0])
  const newVal = 'techNames: [' + next.map(n => `'${n}'`).join(', ') + ']'
  const old = lines[i].match(/techNames:\s*\[[^\]]*\]/)
  if (!old) continue
  const oldNames = old[0].match(/'([^']+)'/g)?.map(s => s.slice(1, -1)) || []
  if (oldNames.join('|') === next.join('|')) continue
  diff.push({ track: current, before: oldNames.join('、') || '(空)', after: next.join('、') })
  lines[i] = lines[i].replace(/techNames:\s*\[[^\]]*\]/, newVal)
  changed++
}

console.log(`将更新 ${changed} 个赛道的 techNames：`)
for (const d of diff) console.log(`  [${d.track}]\n    旧：${d.before}\n    新：${d.after}`)

if (!APPLY) { console.log('\n[dry-run] 加 --apply 写回'); process.exit(0) }

fs.writeFileSync(TAX_PATH, lines.join('\n'), 'utf8')
console.log('\n已写回：app/data/learningTaxonomy.ts')
