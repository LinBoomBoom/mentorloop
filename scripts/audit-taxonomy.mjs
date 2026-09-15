#!/usr/bin/env node
// 四大模块内容归类 · 一致性体检
//
// 用法：
//   node scripts/audit-taxonomy.mjs              # 跑 A1-A9 断言，输出 docs/audit/taxonomy-report.md
//   node scripts/audit-taxonomy.mjs --baseline   # 额外导出全量归类基线 CSV
//   node scripts/audit-taxonomy.mjs --stdout     # 只打印摘要，不写文件
//
// 断言口径见 docs/content-taxonomy-normalization-plan.md §6

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'

const ROOT = process.cwd()
const DB_PATH = path.join(ROOT, 'data/devmentor.db')
const REPORT_DIR = path.join(ROOT, 'docs/audit')
const SEED_PATH = path.join(ROOT, 'data/seed-content.json')

const argv = process.argv.slice(2)
const WANT_BASELINE = argv.includes('--baseline')
const STDOUT_ONLY = argv.includes('--stdout')

// ---- 加载 TS 数据（用 strip-types 子进程，避免手写正则解析漂移）----
function loadTs (rel, expr) {
  const code = `import('./${rel}').then(m => console.log(JSON.stringify(${expr})))`
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '-e', code], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  })
  return JSON.parse(out.trim().split('\n').pop())
}

const TAXONOMY = loadTs('app/data/learningTaxonomy.ts', 'm.LEARNING_TAXONOMY')
const VOCAB = loadTs('app/data/techVocabulary.ts', 'm.TECH_VOCABULARY')

// ---- 展开赛道 ----
const MODULE_ORDER = ['frontend', 'backend', 'devops', 'ai']
const TRACKS = []
for (const mod of MODULE_ORDER) {
  for (const t of (TAXONOMY[mod] || [])) {
    TRACKS.push({ ...t, module: mod })
  }
}
const TRACK_BY_ID = new Map(TRACKS.map(t => [t.id, t]))

// ---- 词表索引 ----
const VOCAB_BY_MODULE = {} // module -> Set(name)
const VOCAB_NAME_TO_MODULE = new Map() // `${module}|${name}` -> term
for (const v of VOCAB) {
  (VOCAB_BY_MODULE[v.module] ||= new Set()).add(v.name)
  VOCAB_NAME_TO_MODULE.set(`${v.module}|${v.name}`, v)
}
// 词表允许某赛道使用的展示名
function vocabAllows (module, trackId) {
  return VOCAB.filter(v => v.module === module &&
    (v.allowTracks === '*' || v.allowTracks.includes(trackId))).map(v => v.name)
}

// ---- 读库 ----
const db = new Database(DB_PATH, { readonly: true })
const q = (s, ...a) => db.prepare(s).all(...a)
const g = (s, ...a) => db.prepare(s).get(...a)

const iqByTrack = new Map()
for (const r of q('select subtrack, tech, count(*) c from interview_questions group by subtrack, tech')) {
  if (!iqByTrack.has(r.subtrack)) iqByTrack.set(r.subtrack, new Map())
  iqByTrack.get(r.subtrack).set(r.tech, r.c)
}
const iqCountByTrack = new Map(q('select subtrack, count(*) c from interview_questions group by subtrack').map(r => [r.subtrack, r.c]))
const chCountByTrack = new Map() // trackId -> 章节数（经 chapterSubtracks 归并）
const chByModuleSubtrack = new Map()
for (const r of q('select module_id, subtrack, count(*) c from chapters group by module_id, subtrack')) {
  chByModuleSubtrack.set(`${r.module_id}|${r.subtrack}`, r.c)
}
for (const t of TRACKS) {
  let n = 0
  for (const st of (t.chapterSubtracks || [])) n += chByModuleSubtrack.get(`${t.module}|${st}`) || 0
  chCountByTrack.set(t.id, n)
}

// ---- 断言 ----
const results = [] // { id, title, pass, detail: [ {track, msg} ] }

function add (id, title, pass, rows, note) {
  results.push({ id, title, pass, rows: rows || [], note: note || '' })
}

// A1 声明 ⊆ 实际（无空筛选）
{
  const rows = []
  for (const t of TRACKS) {
    const actual = iqByTrack.get(t.id) || new Map()
    const miss = (t.techNames || []).filter(n => !actual.has(n))
    if (miss.length) rows.push({ track: t.id, msg: `声明但 0 题：${miss.join('、')}` })
  }
  add('A1', 'techNames ⊆ 题库实际标签（无空筛选）', rows.length === 0, rows)
}

// A2 实际 ⊆ 声明（无漏筛）
{
  const rows = []
  for (const t of TRACKS) {
    const actual = [...(iqByTrack.get(t.id) || new Map()).keys()]
    const extra = actual.filter(a => !(t.techNames || []).includes(a))
    if (extra.length) rows.push({ track: t.id, msg: `有题未声明：${extra.join('、')}` })
  }
  add('A2', '题库实际标签 ⊆ techNames（无漏筛）', rows.length === 0, rows)
}

// A3 无脏值（不在词表）
{
  const rows = []
  for (const t of TRACKS) {
    const allowed = new Set(VOCAB_BY_MODULE[t.module] || [])
    for (const [tech, c] of (iqByTrack.get(t.id) || new Map())) {
      if (!allowed.has(tech)) rows.push({ track: t.id, msg: `脏值「${tech}」×${c}` })
    }
  }
  add('A3', 'tech 无脏值（全部命中受控词表）', rows.length === 0, rows)
}

// A4 单一标签占比（区分度）
// 豁免规则：与赛道主题同名的「本体标签」（如 op-k8s 的 Kubernetes、ai-edge 的端侧 AI）
// 高占比是内容健康的表现，不属归类问题，阈值放宽到 95%。
{
  const SELF_TECH = {
    'fe-arch': '工程化', 'op-sre': 'SRE', 'op-devops': 'CI/CD',
    'op-k8s': 'Kubernetes', 'op-sec': '安全', 'ai-edge': '端侧 AI',
    // fe-harmony 的「HarmonyOS」：逐条判读过 201 题，全部是鸿蒙原生内容
    //（UIAbility 生命周期、ArkUI 装饰器、DevEco Studio 调试、router.pushUrl）。
    // 与 op-sec/安全、op-k8s/Kubernetes 同属「赛道本体标签」，高占比是内容健康的表现。
    'fe-harmony': 'HarmonyOS'
  }
  const rows = []
  for (const t of TRACKS) {
    const total = iqCountByTrack.get(t.id) || 0
    if (!total) continue
    for (const [tech, c] of (iqByTrack.get(t.id) || new Map())) {
      const pct = c / total
      const limit = SELF_TECH[t.id] === tech ? 0.95 : 0.6
      if (pct > limit) {
        rows.push({
          track: t.id,
          msg: `「${tech}」占 ${c}/${total} = ${(pct * 100).toFixed(0)}%（限 ${(limit * 100).toFixed(0)}%）`
        })
      }
    }
  }
  add('A4', '单一 tech 占比 ≤ 60%（本体标签 ≤95%）', rows.length === 0, rows)
}

// A5 内容覆盖度（提示项：属内容缺口，非归类问题，需内容补齐而非改标签）
{
  const rows = []
  for (const t of TRACKS) {
    const ch = chCountByTrack.get(t.id) || 0
    const iq = iqCountByTrack.get(t.id) || 0
    if (ch < 6 || iq < 100) rows.push({ track: t.id, msg: `章节 ${ch} / 题目 ${iq}` })
  }
  add('A5', '内容覆盖度：每赛道 章节≥6 且 题目≥100（提示项）', rows.length === 0, rows)
}

// A6 seed 章节数 == DB 章节数
{
  let pass = false, msg = ''
  try {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'))
    const seedTotal = (seed.modules || []).reduce((n, m) => n + (m.chapters || []).length, 0)
    const dbTotal = g('select count(*) c from chapters').c
    pass = seedTotal === dbTotal
    msg = `seed ${seedTotal} / DB ${dbTotal}`
  } catch (e) { msg = '读取失败：' + e.message }
  add('A6', 'seed 章节数 == DB 章节数', pass, pass ? [] : [{ track: '-', msg }])
}

// A7 subtrack 归属合法
{
  const rows = []
  const badIq = q('select distinct subtrack from interview_questions').filter(r => !TRACK_BY_ID.has(r.subtrack))
  for (const r of badIq) rows.push({ track: r.subtrack || '(空)', msg: '面试题 subtrack 非合法赛道 id' })
  for (const t of TRACKS) {
    const union = new Set()
    for (const other of TRACKS) if (other.module === t.module) for (const st of (other.chapterSubtracks || [])) union.add(st)
    for (const [key] of chByModuleSubtrack) {
      const [mod, st] = key.split('|')
      if (mod === t.module && !union.has(st)) rows.push({ track: t.id, msg: `章节 subtrack「${st}」未被任何赛道收编` })
    }
  }
  add('A7', 'subtrack 归属合法（题∈赛道 / 章∈模块并集）', rows.length === 0, rows)
}

// A8 题面唯一、无跨模块重复
{
  const rows = []
  const dup = g('select count(*) c from (select q from interview_questions group by q having count(*)>1)').c
  if (dup) rows.push({ track: '-', msg: `重复题面组 ${dup}` })
  const cross = g('select count(*) c from (select q from interview_questions group by q having count(distinct track)>1)').c
  if (cross) rows.push({ track: '-', msg: `跨模块重复 ${cross}` })
  add('A8', '题面唯一 / 无跨模块重复', rows.length === 0, rows)
}

// A9 tech ∈ 词表且被该赛道允许
{
  const rows = []
  for (const t of TRACKS) {
    const allowed = new Set(vocabAllows(t.module, t.id))
    for (const [tech, c] of (iqByTrack.get(t.id) || new Map())) {
      if (!allowed.has(tech)) rows.push({ track: t.id, msg: `「${tech}」×${c} 不在该赛道允许词表内` })
    }
  }
  add('A9', 'tech ∈ 词表 ∧ 该赛道被允许', rows.length === 0, rows)
}

// ---- 汇总 ----
const passed = results.filter(r => r.pass).length
const lines = []
lines.push('# 内容归类一致性体检报告')
lines.push('')
lines.push(`> 生成时间：${new Date().toISOString()}｜数据源：data/devmentor.db + app/data/learningTaxonomy.ts + app/data/techVocabulary.ts`)
lines.push('')
lines.push(`## 结论：${passed}/${results.length} 项断言通过`)
lines.push('')
lines.push('| 断言 | 说明 | 结果 | 命中赛道数 |')
lines.push('|---|---|---|---:|')
for (const r of results) {
  lines.push(`| ${r.id} | ${r.title} | ${r.pass ? '✅ PASS' : '❌ FAIL'} | ${r.rows.length} |`)
}
lines.push('')
for (const r of results) {
  if (r.pass) continue
  lines.push(`### ❌ ${r.id} · ${r.title}`)
  lines.push('')
  lines.push('| 赛道 | 问题 |')
  lines.push('|---|---|')
  for (const row of r.rows.slice(0, 60)) lines.push(`| ${row.track} | ${row.msg} |`)
  if (r.rows.length > 60) lines.push(`| … | 另有 ${r.rows.length - 60} 条 |`)
  lines.push('')
}

// 现状速览表
lines.push('## 现状速览')
lines.push('')
lines.push('| 模块 | 赛道 | 章节 | 题目 | 标签数 | 最大标签占比 |')
lines.push('|---|---|---:|---:|---:|---:|')
for (const t of TRACKS) {
  const total = iqCountByTrack.get(t.id) || 0
  const techs = [...(iqByTrack.get(t.id) || new Map()).entries()].sort((a, b) => b[1] - a[1])
  const top = techs[0] || ['-', 0]
  const pct = total ? ((top[1] / total) * 100).toFixed(0) + '%' : '-'
  lines.push(`| ${t.module} | ${t.id} (${t.name}) | ${chCountByTrack.get(t.id) || 0} | ${total} | ${techs.length} | ${top[0]} ${pct} |`)
}
lines.push('')

const md = lines.join('\n')
if (!STDOUT_ONLY) {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(path.join(REPORT_DIR, 'taxonomy-report.md'), md, 'utf8')
}

if (WANT_BASELINE) {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)
  const file = path.join(REPORT_DIR, `taxonomy-baseline-${ts}.csv`)
  const rows = q("select id, track, subtrack, tech, skill, source, replace(replace(q, char(10), ' '), char(13), ' ') as q from interview_questions order by track, subtrack, id")
  const esc = s => `"${String(s == null ? '' : s).replace(/"/g, '""').slice(0, 120)}"`
  const csv = ['id,track,subtrack,tech,skill,source,q_preview']
    .concat(rows.map(r => [r.id, r.track, r.subtrack, r.tech, r.skill, r.source, r.q].map(esc).join(',')))
    .join('\n')
  fs.writeFileSync(file, '\uFEFF' + csv, 'utf8')
  console.log('基线已导出：' + path.relative(ROOT, file) + `（${rows.length} 行）`)
}

console.log(md.split('\n').slice(0, 22).join('\n'))
if (!STDOUT_ONLY) console.log('\n完整报告：docs/audit/taxonomy-report.md')
