/**
 * 全库「声称覆盖 vs 实际内容」体检。
 *
 * 审计脚本 audit-taxonomy.mjs 的 A1–A9 只校验「分类自洽性」，
 * 不校验「内容真实性」：一个赛道可以在分类上完全合规（标签合法、占比均衡），
 * 但实际题目与它声称覆盖的技术毫无关系。
 *
 * 本脚本检查两类真实缺陷：
 *   D1 空壳标签：techNames 声明了某技术，题库里 0 道题
 *   D2 未生成课程：赛道下的课程小节从未跑过生成（内容缺口的直接原因）
 *   D3 标签-题面背离：打上某标签的题，题干里一次都没出现该技术关键词
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadTs (rel, expr) {
  // Windows 下绝对路径需转成相对说明符，否则 ESM 报 ERR_UNSUPPORTED_ESM_URL_SCHEME
  const code = `import('./${rel}').then(m => console.log(JSON.stringify(${expr})))`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '-e', code], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  }).trim().split('\n').pop())
}

const TAXONOMY = loadTs('app/data/learningTaxonomy.ts', 'm.LEARNING_TAXONOMY')
const VOCAB = loadTs('app/data/techVocabulary.ts', 'm.TECH_VOCABULARY')

import { PROBE } from './tech-probe.mjs'


const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })
const done = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, '.workbuddy/gen-interview-done.json'), 'utf8')))

const MODULE_OF = {}
for (const [mod, tracks] of Object.entries(TAXONOMY)) for (const t of tracks) MODULE_OF[t.id] = mod

const rows = []
for (const [mod, tracks] of Object.entries(TAXONOMY)) {
  for (const t of tracks) {
    const tid = t.id
    const techNames = t.techNames || []
    const dist = db.prepare('select tech, count(*) c from interview_questions where subtrack = ? group by tech').all(tid)
    const total = dist.reduce((a, b) => a + b.c, 0)
    const byTech = new Map(dist.map(r => [r.tech, r.c]))

    // D1 空壳标签
    const shells = techNames.filter(n => (byTech.get(n) || 0) === 0)

    // D2 未生成小节
    const secs = db.prepare(`select s.id from sections s join chapters c on c.id = s.chapter_id
      where c.subtrack in (${(t.chapterSubtracks || []).map(() => '?').join(',') || "''"})`).all(...(t.chapterSubtracks || []))
    const ungen = secs.filter(s => !done.has(s.id)).length

    // D3 标签-题面背离
    const drift = []
    for (const n of techNames) {
      const c = byTech.get(n) || 0
      if (c < 5) continue
      const re = PROBE[n]
      if (re === null || re === undefined) continue // null = 该标签无稳定题面特征，跳过
      const qs = db.prepare('select q, a from interview_questions where subtrack = ? and tech = ?').all(tid, n)
      const realHit = qs.filter(r => re.test((r.q || '') + ' ' + (r.a || ''))).length
      const rate = realHit / qs.length
      if (rate < 0.5) drift.push({ tech: n, n: qs.length, hit: realHit, rate })
    }

    rows.push({ mod, tid, name: t.name, total, techCount: techNames.length, shells, secTotal: secs.length, ungen, drift })
  }
}

const out = []
out.push('# 全库内容真实性体检\n')
out.push('> 与 audit-taxonomy.mjs（A1–A9，分类自洽性）互补：本表只查「声称 vs 实际」。\n')

out.push('\n## D1 · 空壳标签（techNames 声明了但题库 0 题）\n')
const d1 = rows.filter(r => r.shells.length)
if (!d1.length) out.push('无\n')
else {
  out.push('| 赛道 | 总题数 | 空壳标签 |')
  out.push('|---|---|---|')
  for (const r of d1.sort((a, b) => b.shells.length - a.shells.length)) {
    out.push(`| ${r.name} (\`${r.tid}\`) | ${r.total} | ${r.shells.join('、')} |`)
  }
}

out.push('\n## D2 · 未生成课程小节（内容缺口的直接原因）\n')
const d2 = rows.filter(r => r.ungen > 0)
if (!d2.length) out.push('无\n')
else {
  out.push('| 赛道 | 小节总数 | 未生成 | 完成率 |')
  out.push('|---|---|---|---|')
  for (const r of d2.sort((a, b) => b.ungen - a.ungen)) {
    out.push(`| ${r.name} (\`${r.tid}\`) | ${r.secTotal} | ${r.ungen} | ${((1 - r.ungen / r.secTotal) * 100).toFixed(0)}% |`)
  }
}

out.push('\n## D3 · 标签-题面背离（打该标签的题 ≥5 道，但题面命中该技术关键词 <50%）\n')
const d3 = rows.filter(r => r.drift.length)
if (!d3.length) out.push('无\n')
else {
  out.push('| 赛道 | 标签 | 题数 | 题面命中 | 命中率 |')
  out.push('|---|---|---|---|---|')
  for (const r of d3) for (const d of r.drift) {
    out.push(`| ${r.name} (\`${r.tid}\`) | ${d.tech} | ${d.n} | ${d.hit} | ${(d.rate * 100).toFixed(0)}% |`)
  }
}

const totalSec = rows.reduce((a, r) => a + r.secTotal, 0)
const totalUn = rows.reduce((a, r) => a + r.ungen, 0)
out.push(`\n## 汇总\n`)
out.push(`- 赛道数：${rows.length}`)
out.push(`- 题库总题数：${db.prepare('select count(*) c from interview_questions').get().c}`)
out.push(`- 课程小节：${totalSec}，已生成 ${totalSec - totalUn}，未生成 ${totalUn}（${((1 - totalUn / totalSec) * 100).toFixed(1)}%）`)
out.push(`- 存在空壳标签的赛道：${d1.length}`)
out.push(`- 存在标签背离的赛道：${d3.length}`)

const p = path.join(ROOT, 'docs/audit/content-coverage.md')
fs.writeFileSync(p, out.join('\n'))
console.log(out.join('\n'))
console.log('\n[written] ' + p)
void VOCAB
