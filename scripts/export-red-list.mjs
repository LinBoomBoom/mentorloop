#!/usr/bin/env node
// 批次 2.6：导出红灯内容清单，供人工复核。
// 同时标出「疑似错配」——即 source 域名所属技术领域与题目 tech/内容明显不符，
// 这类是「被赛道级默认来源误挂」的，复核时应优先释放。
//
// 用法：node scripts/export-red-list.mjs
// 输出：docs/audit/red-list.csv + 控制台统计
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })
const OUT = path.join(ROOT, 'docs', 'audit', 'red-list.csv')

// 红灯域名 → 该技术域应匹配的 tech 关键词
const DOMAIN_TECH = {
  'docs.oracle.com': ['Java'],
  'dev.mysql.com': ['MySQL', '数据库原理', '数据库', '数仓', 'NoSQL'],
  'man7.org': ['Linux', '网络'],
  'developer.mozilla.org': ['JavaScript', 'CSS', 'Web 基础', '性能优化', '网络', '浏览器']
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
function suspicious(row, kind) {
  const h = hostOf(row.source || row.source_url || '')
  const expect = DOMAIN_TECH[h]
  if (!expect) return false
  if (kind === 'section') return false // section 不做 tech 判定（无 tech 字段）
  const tech = String(row.tech || '')
  return tech ? !expect.some(e => tech.includes(e)) : false
}

const rows = []
// questions
const qs = db.prepare(`SELECT id, track, tech, q, source, license, status FROM interview_questions WHERE license='proprietary' ORDER BY source, id`).all()
for (const r of qs) {
  rows.push({
    kind: 'question', id: r.id, track: r.track, tech: r.tech || '',
    title: (r.q || '').replace(/[\r\n,]/g, ' ').slice(0, 60),
    source: r.source || '', license: r.license, status: r.status,
    suspicious: suspicious(r, 'question')
  })
}
// sections
const ss = db.prepare(`SELECT s.id, s.title, s.source_url, s.license, s.status, c.module_id AS track FROM sections s JOIN chapters c ON c.id=s.chapter_id WHERE s.license='proprietary' ORDER BY s.source_url, s.id`).all()
for (const r of ss) {
  rows.push({
    kind: 'section', id: r.id, track: r.track, tech: '',
    title: (r.title || '').replace(/[\r\n,]/g, ' ').slice(0, 60),
    source: r.source_url || '', license: r.license, status: r.status,
    suspicious: false
  })
}

const byDomain = {}
let suspCount = 0
for (const r of rows) {
  const d = hostOf(r.source) || '(无)'
  byDomain[d] = byDomain[d] || { n: 0, susp: 0 }
  byDomain[d].n++
  if (r.suspicious) { byDomain[d].susp++; suspCount++ }
}

console.log('===== 红灯清单统计 =====')
console.log(`总条数 ${rows.length}  （question ${qs.length} + section ${ss.length}）`)
console.log(`疑似错配 ${suspCount} 条（source 域名与题目技术领域不符，复核时优先看）\n`)
console.log('按来源域名：')
for (const [d, v] of Object.entries(byDomain).sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${String(v.n).padStart(4)}  ${d.padEnd(24)} 疑似错配 ${v.susp}`)
}

// 一致性校验：不应存在「已发布且红灯」的记录
const bad = db.prepare(`SELECT COUNT(*) c FROM interview_questions WHERE license='proprietary' AND status='published'`).get().c
const badS = db.prepare(`SELECT COUNT(*) c FROM sections WHERE license='proprietary' AND status='published'`).get().c
console.log(`\n一致性校验：红灯但仍 published 的  question=${bad} section=${badS}  ${bad + badS === 0 ? 'OK（全部已转 draft）' : '❌ 有遗漏'}`)

fs.mkdirSync(path.dirname(OUT), { recursive: true })
const header = 'kind,id,track,tech,title,source,license,status,suspicious\n'
const body = rows.map(r => [r.kind, r.id, r.track, r.tech, `"${r.title}"`, r.source, r.license, r.status, r.suspicious ? 'YES' : ''].join(',')).join('\n')
fs.writeFileSync(OUT, header + body, 'utf8')
console.log(`\nCSV 已输出: ${OUT}（${rows.length} 行）`)
db.close()
