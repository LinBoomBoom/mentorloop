/**
 * 以 DB 为准，把题目字段同步回 seed-content.json。
 *
 * 为什么需要：某些修数脚本（如 fix-keywords.mjs）只改 DB。种子是桌面端首次启动的
 * 数据源，两边一旦漂移，新装用户会拿到与开发环境不一致的内容。
 *
 * 注意 seed.interview 分 hot / special 两个数组（按 difficulty 分档），
 * 统计题量时只看 hot 会漏掉 special —— 历史上因此误判过「seed 少 1679 题」。
 *
 * 用法：node scripts/sync-seed-questions.mjs [--apply]
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')
const SEED_FILE = path.join(ROOT, 'data', 'seed-content.json')
const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })

const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'))
const rows = db.prepare('select id, q, a, keywords, difficulty, tech, subtrack, subtrack_detail from interview_questions').all()
const dbMap = new Map(rows.map(r => [r.id, r]))

let diff = 0
let removed = 0
const touched = []
for (const [mod, v] of Object.entries(seed.interview)) {
  for (const key of ['hot', 'special']) {
    const arr = v[key]
    if (!Array.isArray(arr)) continue
    // 反向同步：DB 里已删除的题（如去重脚本删掉的重复题）也要从种子移除，
    // 否则新装用户仍会看到那些已被判定为重复的题。
    const before = arr.length
    v[key] = arr.filter(it => dbMap.has(it.id))
    removed += before - v[key].length
    for (const it of v[key]) {
      const d = dbMap.get(it.id)
      if (!d) continue
      const dbKw = d.keywords == null ? null : String(d.keywords)
      // seed 约定 keywords 是**数组**（interview-bank 测试断言 Array.isArray），
      // DB 存的是 JSON 字符串。这里无条件重刷：否则 seed 里已是字符串时，
      // 与 dbKw 字面相等会被判定为「无需同步」而永久卡在错误形态。
      let arr = null
      try { arr = dbKw ? JSON.parse(dbKw) : null } catch { arr = null }
      const kwArr = Array.isArray(arr) ? arr : (arr == null ? [] : [String(arr)])
      const changed = JSON.stringify(it.keywords ?? null) !== JSON.stringify(kwArr) ||
        it.tech !== d.tech || it.subtrack !== d.subtrack
      if (changed) {
        it.keywords = kwArr
        it.tech = d.tech
        it.subtrack = d.subtrack
        diff++
        if (touched.length < 6) touched.push(`#${it.id} kw=[${kwArr.slice(0, 4).join('、')}]`)
      }
    }
  }
}

console.log(`seed 需同步字段的题目：${diff}`)
console.log(`seed 中 DB 已删除的题（将移除）：${removed}`)
for (const t of touched) console.log('  ' + t)

if (APPLY && (diff || removed)) {
  const bak = SEED_FILE + '.bak-' + Date.now()
  fs.copyFileSync(SEED_FILE, bak)
  // 必须与已提交格式一致：紧凑单行，否则 27MB 种子整体重格式化
  fs.writeFileSync(SEED_FILE, JSON.stringify(seed))
  console.log(`\n已备份：${path.basename(bak)}`)
  console.log(`已更新 seed：字段 ${diff} 题，移除 ${removed} 题`)
} else if (!APPLY) {
  console.log('\n（dry-run，加 --apply 写回）')
}
