/**
 * 题目内容质量体检。
 *
 * 分类审计（A1–A9 / content-coverage）只回答「标签对不对、覆盖够不够」，
 * 不回答「这道题能不能用」。本脚本检查上线前必须为零的四类硬缺陷：
 *   Q1 答案缺失：a 为空或过短（<30 字），用户点开没有解析
 *   Q2 题干残缺：q 过短（<8 字）或不像疑问句/陈述考点
 *   Q3 重复题目：同赛道内题干归一化后重复（去重失效）
 *   Q4 关键词缺失：keywords 为空，影响检索与推荐
 * 另输出难度分布，供判断题目梯度是否合理。
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })

const MIN_A = 30
const MIN_Q = 8

const norm = s => String(s || '').replace(/\s+/g, '').replace(/[，。？?！!、；;：:"'「」『』（）()]/g, '').toLowerCase()

const total = db.prepare('select count(*) c from interview_questions').get().c
const rows = db.prepare('select id, subtrack, tech, q, a, keywords, difficulty from interview_questions').all()

const stat = {
  q1: [], // 答案缺失
  q2: [], // 题干残缺
  q4: 0   // 关键词缺失
}
const byTrack = {}
const diff = {}

for (const r of rows) {
  const alen = String(r.a || '').trim().length
  if (alen < MIN_A) stat.q1.push({ ...r, alen })
  const qlen = String(r.q || '').trim().length
  if (qlen < MIN_Q) stat.q2.push({ ...r, qlen })
  let kw = null
  try { kw = r.keywords ? JSON.parse(r.keywords) : null } catch { kw = null }
  if (!Array.isArray(kw) || !kw.length) stat.q4++
  diff[r.difficulty || '(空)'] = (diff[r.difficulty || '(空)'] || 0) + 1
  const t = byTrack[r.subtrack] || (byTrack[r.subtrack] = { n: 0, q1: 0, q2: 0 })
  t.n++
  if (alen < MIN_A) t.q1++
  if (qlen < MIN_Q) t.q2++
}

// Q3 重复
const seen = new Map()
const dup = []
for (const r of rows) {
  const k = r.subtrack + '||' + norm(r.q)
  if (seen.has(k)) dup.push({ id: r.id, subtrack: r.subtrack, q: String(r.q).slice(0, 70), same: seen.get(k) })
  else seen.set(k, r.id)
}

const out = []
out.push('# 题目内容质量体检\n')
out.push(`> 检查「这道题能不能用」，与分类审计互补。题库总题数：**${total}**\n`)

out.push('\n## 硬缺陷总览\n')
out.push('| 缺陷 | 数量 | 占比 | 上线要求 |')
out.push('|---|---|---|---|')
out.push(`| Q1 答案缺失或过短（<${MIN_A} 字） | ${stat.q1.length} | ${(stat.q1.length / total * 100).toFixed(2)}% | 0 |`)
out.push(`| Q2 题干残缺（<${MIN_Q} 字） | ${stat.q2.length} | ${(stat.q2.length / total * 100).toFixed(2)}% | 0 |`)
out.push(`| Q3 同赛道题干重复 | ${dup.length} | ${(dup.length / total * 100).toFixed(2)}% | 0 |`)
out.push(`| Q4 关键词缺失 | ${stat.q4} | ${(stat.q4 / total * 100).toFixed(2)}% | 0 |`)

if (stat.q1.length) {
  out.push('\n## Q1 答案缺失样例\n')
  for (const r of stat.q1.slice(0, 12)) out.push(`- \`${r.subtrack}/${r.tech}\` a=${r.alen}字：${String(r.q).slice(0, 60)}`)
}
if (stat.q2.length) {
  out.push('\n## Q2 题干残缺样例\n')
  for (const r of stat.q2.slice(0, 12)) out.push(`- \`${r.subtrack}/${r.tech}\` q=${r.qlen}字：${String(r.q).slice(0, 60)}`)
}
if (dup.length) {
  out.push('\n## Q3 重复题目样例\n')
  for (const r of dup.slice(0, 12)) out.push(`- \`${r.subtrack}\` #${r.id}（同 #${r.same}）：${r.q}`)
}

out.push('\n## 难度分布\n')
out.push('| 难度 | 题数 | 占比 |')
out.push('|---|---|---|')
for (const [k, v] of Object.entries(diff).sort((a, b) => b[1] - a[1])) {
  out.push(`| ${k} | ${v} | ${(v / total * 100).toFixed(1)}% |`)
}

const bad = Object.entries(byTrack).filter(([, v]) => (v.q1 + v.q2) / v.n > 0.05)
if (bad.length) {
  out.push('\n## 缺陷率 >5% 的赛道\n')
  out.push('| 赛道 | 题数 | 答案缺失 | 题干残缺 | 缺陷率 |')
  out.push('|---|---|---|---|---|')
  for (const [k, v] of bad.sort((a, b) => (b[1].q1 + b[1].q2) / b[1].n - (a[1].q1 + a[1].q2) / a[1].n)) {
    out.push(`| ${k} | ${v.n} | ${v.q1} | ${v.q2} | ${((v.q1 + v.q2) / v.n * 100).toFixed(1)}% |`)
  }
}

const p = path.join(ROOT, 'docs/audit/question-quality.md')
fs.writeFileSync(p, out.join('\n'))
console.log(out.join('\n'))
console.log('\n[written] ' + p)
