/**
 * 语义重复题检测（同一「赛道 × 标签」桶内）。
 *
 * A8 只做题干字面唯一，抓不到「措辞不同但语义相同」的题，例如：
 *   - 请对比 vLLM、TGI、TensorRT-LLM 三个主流推理框架在批处理与 KV Cache 管理上的核心差异…
 *   - 请对比 vLLM、TGI、TensorRT-LLM 三个推理框架在 batching 和 KV Cache 管理上的异同…
 *   - 请解释 vLLM、TGI、TensorRT-LLM 这三个推理框架的核心定位与主要区别…
 * 三道题同时出现在同一赛道，用户刷题会重复遇到。
 *
 * 方法：字符 bigram Jaccard + 长度比过滤。不用 embedding——16650 题全量推理成本高、
 * 慢，而重复题几乎都落在同赛道同标签桶内，桶内比对足够且可解释。
 *
 * 用法：
 *   node scripts/detect-dup-questions.mjs                # 输出报告（不改动）
 *   node scripts/detect-dup-questions.mjs --threshold 0.7
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')
const THRESHOLD = Number((process.argv.find(a => a.startsWith('--threshold')) || '').split('=')[1] || 0.72)

const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })

const norm = s => String(s || '')
  .replace(/[`*_#>\\]/g, '')
  .replace(/\s+/g, '')
  .replace(/[，。？?！!、；;：:"'「」『』（）()【】\[\]]/g, '')
  .toLowerCase()

/** 字符 bigram 集合（中文无空格，bigram 比空格分词更稳） */
function bigrams (s) {
  const t = norm(s)
  if (t.length < 2) return new Set([t])
  const set = new Set()
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2))
  return set
}
function jaccard (a, b) {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// 判定维度二：核心实体词重合。
// 纯 bigram 抓不到同义替换的重复，例如：
//   「…在批处理与 KV Cache 管理上的核心差异」
//   「…在 batching 和 KV Cache 管理上的异同」
// 字面差异大，但核心实体（vLLM / TGI / TensorRT-LLM / KV Cache）完全一致。
const ENTITY = /[A-Za-z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)*/g
const ENTITY_STOP = new Set(['the', 'and', 'for', 'you', 'are', 'with', 'this', 'that', 'from', 'how', 'why', 'what', 'not', 'can', 'use', 'get', 'set', '请', '在', '的', '是'])
function entities (s) {
  const out = new Set()
  for (const m of String(s || '').match(ENTITY) || []) {
    const w = m.replace(/[.]+$/, '')
    if (w.length < 2 || ENTITY_STOP.has(w.toLowerCase())) continue
    out.add(w.toLowerCase())
  }
  return out
}
function overlap (a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / Math.min(a.size, b.size)
}

const CROSS = process.argv.includes('--cross-track')
const rows = db.prepare('select id, subtrack, tech, q, a, difficulty from interview_questions').all()
const buckets = new Map()
for (const r of rows) {
  // 同一道题可能被不同赛道各自生成一份，跨赛道比对才能发现
  const k = CROSS ? ('tech:' + r.tech) : (r.subtrack + '||' + r.tech)
  if (!buckets.has(k)) buckets.set(k, [])
  buckets.get(k).push(r)
}

const groups = []
let cmp = 0
for (const [k, list] of buckets) {
  if (list.length < 2) continue
  const grams = list.map(r => bigrams(r.q))
  const ents = list.map(r => entities(r.q))
  const used = new Set()
  for (let i = 0; i < list.length; i++) {
    if (used.has(i)) continue
    const g = [list[i]]
    for (let j = i + 1; j < list.length; j++) {
      if (used.has(j)) continue
      const la = list[i].q.length, lb = list[j].q.length
      // 长度差过大直接跳过：短题与长题即便相似也是「包含」而非「重复」
      if (Math.min(la, lb) / Math.max(la, lb) < 0.6) continue
      cmp++
      const sim = jaccard(grams[i], grams[j])
      // 实体词不能独立作为判据：同一主题下多道题共享核心实体是正常的
      //（「RDB 和 AOF 分别是什么」与「重启时优先加载哪个」都含 Redis/RDB/AOF，但显然不是同一题）。
      // 只在「实体高度重合 且 字面也有一定相似」时才认定重复。
      const ent = (ents[i].size >= 3 && ents[j].size >= 3) ? overlap(ents[i], ents[j]) : 0
      if (sim >= THRESHOLD || (ent >= 0.8 && sim >= 0.5)) { g.push(list[j]); used.add(j) }
    }
    if (g.length > 1) { used.add(i); groups.push({ key: k, items: g }) }
  }
}

const dupCount = groups.reduce((a, g) => a + g.items.length - 1, 0)
const out = []
out.push('# 语义重复题检测\n')
out.push(`> 阈值：bigram Jaccard ≥ ${THRESHOLD}，或（实体词重合 ≥0.8 且 Jaccard ≥0.5，用于抓同义替换）。${CROSS ? '跨赛道按 tech 分桶。' : '同「赛道 × 标签」桶内比对。'} 比较 ${cmp} 次\n`)
out.push(`\n- 重复组：**${groups.length}**`)
out.push(`- 可去重题数：**${dupCount}**（占题库 ${(dupCount / rows.length * 100).toFixed(2)}%）`)
out.push(`- 题库总量：${rows.length}\n`)

out.push('\n## 重复组明细（按组内题数降序）\n')
const sorted = groups.sort((a, b) => b.items.length - a.items.length)
for (const g of sorted) {
  out.push(`\n### ${g.key} · ${g.items.length} 条`)
  for (const it of g.items) {
    out.push(`- \`${it.id}\` (a=${String(it.a || '').length}字, ${it.difficulty}) ${String(it.q).slice(0, 70)}`)
  }
}

// ---- 去重（--apply）：每组保留答案最完整的一条 ----
if (APPLY && groups.length) {
  const toDelete = []
  const plan = []
  for (const g of groups) {
    const sorted2 = [...g.items].sort((a, b) => String(b.a || '').length - String(a.a || '').length)
    plan.push({ keep: sorted2[0].id, drop: sorted2.slice(1).map(x => x.id) })
    toDelete.push(...sorted2.slice(1).map(x => x.id))
  }
  const DB_FILE = path.join(ROOT, 'data', 'devmentor.db')
  const wdb = new Database(DB_FILE)
  const bak = DB_FILE + '.bak-' + Date.now()
  fs.copyFileSync(DB_FILE, bak)
  // 用户数据里可能引用被删题 id，必须级联清理，否则错题本/答题记录出现悬空引用
  const refs = [
    ['user_questions', 'result_question_id'],
    ['user_wrong_items', 'item_id']
  ]
  const delQ = wdb.prepare('delete from interview_questions where id = ?')
  const tx = wdb.transaction(() => {
    for (const [tbl, col] of refs) {
      try { wdb.prepare(`delete from ${tbl} where ${col} = ?`).run('') } catch { /* 表不存在则跳过 */ }
    }
    for (const r of refs) {
      const st = wdb.prepare(`delete from ${r[0]} where ${r[1]} = ?`)
      for (const id of toDelete) { try { st.run(id) } catch { /* 表/列不存在 */ } }
    }
    for (const id of toDelete) delQ.run(id)
  })
  tx()
  out.push(`\n## 去重执行结果\n`)
  out.push(`- 备份：\`${path.basename(bak)}\``)
  out.push(`- 删除重复题：**${toDelete.length}** 条（保留每组答案最完整的一条）`)
  out.push(`- 同步清理：user_questions.result_question_id / user_wrong_items.item_id`)
  out.push(`- 去重后题库：${rows.length - toDelete.length}`)
  console.log(`\n已删除 ${toDelete.length} 条重复题；备份 ${path.basename(bak)}`)
  console.log('下一步：node scripts/sync-seed-questions.mjs --apply（同步种子）')
}

const p = path.join(ROOT, 'docs/audit/duplicate-questions.md')
fs.writeFileSync(p, out.join('\n'))
console.log(out.slice(0, 10).join('\n'))
console.log('\n[written] ' + p)
