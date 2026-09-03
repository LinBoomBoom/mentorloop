// 路线图的「技能点 → 面试题覆盖度」分析器
// 产出 .workbuddy/roadmap_skills.json，供 gen-interview-roadmap.mjs 做缺口门控。
// 纯本地、零 LLM：只统计 devmentor.db 里每个技能点当前有多少面试题。
//
// 关键对齐（与 gen-interview-roadmap.mjs 一致）：
//   - DB 的 interview_questions.subtrack 存的是「赛道 id」(st.id)，故计数用 st.id
//   - 但生成器门控键 skillKey(track, subName, lv, name) 用的是「赛道 name」(st.name)
//   - 故输出 JSON 的 sub 字段填 st.name，保证生成器读回后键一致
//
// 用法：node scripts/analyze_coverage.mjs

import Database from 'better-sqlite3'
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Buffer } from 'node:buffer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

async function loadRoadmap() {
  const r = await build({
    entryPoints: [path.join(ROOT, 'app/data/skillRoadmap.ts')],
    bundle: true, format: 'esm', write: false, platform: 'node'
  })
  const code = r.outputFiles[0].text
  const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
  return mod.roadmap
}

async function main() {
  const roadmap = await loadRoadmap()
  const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })
  const cnt = db.prepare('SELECT COUNT(*) c FROM interview_questions WHERE subtrack=? AND skill=?')

  const out = []
  for (const d of roadmap) {
    for (const st of d.subTracks) {
      for (const lv of st.levels) {
        for (const s of lv.skills) {
          // 计数用 st.id（DB 实际存的 subtrack 值），输出 sub 用 st.name（对齐生成器门控键）
          const cov = cnt.get(st.id, s.name).c
          out.push({ track: d.id, sub: st.name, lv: lv.level, name: s.name, cov })
        }
      }
    }
  }
  db.close()

  const p = path.join(ROOT, '.workbuddy', 'roadmap_skills.json')
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(out, null, 1))

  const total = out.length
  const cov0 = out.filter(x => x.cov === 0).length
  const cov1 = out.filter(x => x.cov === 1).length
  const cov2to4 = out.filter(x => x.cov >= 2 && x.cov <= 4).length
  const cov5plus = out.filter(x => x.cov >= 5).length
  const targeted = out.filter(x => x.cov <= 2) // 生成器默认 MIN_COV=2 的待生成集

  console.log('=== 路线图覆盖度分析 ===')
  console.log('技能点总数:', total)
  console.log('cov=0 (完全缺口):', cov0)
  console.log('cov=1:', cov1)
  console.log('cov=2~4 (基本够):', cov2to4)
  console.log('cov>=5 (充足):', cov5plus)
  console.log('已达标(cov>=2):', cov2to4 + cov5plus, `(${Math.round((cov2to4 + cov5plus) / total * 100)}%)`)
  console.log('\n生成器默认门控(MIN_COV=2)下「待生成」技能点:', targeted.length)
  for (const t of targeted) console.log(`  - ${t.track}/${t.sub}/${t.lv}/${t.name} (cov=${t.cov})`)
  console.log('\n✓ 覆盖度已写出:', p)
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
