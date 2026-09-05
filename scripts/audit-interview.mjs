// 面试题库「质量 + 去重」审计器（仅读不改）
// 数据源：data/devmentor.db（serve 实际数据）+ data/seed-content.json（内容真源，用于对账）
// 产出：
//   .workbuddy/interview-audit.json  —— 机器可读结果
//   docs/interview-quality-audit.md  —— 人可读报告
//
// 审计维度：
//   1) 去重：精确归一(q) 簇、跨赛道同题、种子 ID 主键冲突、(q,a) 完全同值
//   2) 质量：空题/空答、题过短、答过短(桩)、答==题、占位符、subtrack 空(UI 不可见)、
//            tech 空、keywords 空、difficulty 非法、source 空(溯源缺口)
//
// 用法：node scripts/audit-interview.mjs            (审计 DB + 对账 seed)
//       node scripts/audit-interview.mjs --seed-only (仅审计 seed 文件)

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DB_PATH = path.join(ROOT, 'data', 'devmentor.db')
const SEED_PATH = path.join(ROOT, 'data', 'seed-content.json')
const onlySeed = process.argv.includes('--seed-only')

/* ---------------- 归一化 ---------------- */
// 题干归一：去首尾、去【】（）() 等前缀标签、去空白、全角转半角、小写、去标点（仅留字母数字与 CJK）
function normQ(s) {
  if (!s) return ''
  let t = String(s).trim()
  t = t.replace(/^[【\[（(][^\]】）)]*[】\]）)]\s*/, '')
  t = t.replace(/[\u3000]/g, ' ')
  t = t.replace(/\s+/g, '')
  t = t.toLowerCase()
  t = t.replace(/[^\p{L}\p{N}]/gu, '')
  return t
}
// 字符级二元组（用于近邻相似度，主要服务于 CJK 题）
function bigrams(s) {
  const n = normQ(s)
  const out = new Set()
  if (n.length <= 1) return out
  for (let i = 0; i < n.length - 1; i++) out.add(n.slice(i, i + 2))
  return out
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}
// 仅匹配「作者明确留空的编写缺口」强信号词（中文，歧义极低）。
// 刻意排除英文 TODO/FIXME/TBD：本语料中它们大量作为合法技术内容出现（TodoMVC 是 Redux 经典示例、
// fixme 作为概念被讲解），误报率极高；如需查英文占位，应改用「独立成行/整体大写」等结构特征，而非关键字。
const PLACEHOLDER = /(待补充|待完善|待填写|\[待)/i
const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard'])

/* ---------------- 从一行构造审计对象 ---------------- */
function rowToObj(r) {
  const q = r.q || ''
  const a = r.a || ''
  return {
    id: r.id,
    track: r.track,
    type: r.type,
    subtrack: r.subtrack ?? null,
    tech: (r.tech || '').trim() || null,
    difficulty: r.difficulty || null,
    skill: r.skill ?? null,
    keywords: parseKeywords(r.keywords),
    source: r.source ?? null,
    q,
    a,
    nq: normQ(q),
    qlen: q.length,
    alen: a.length,
    isRq: !!(r.skill) // 路线图题（有 skill 归属）
  }
}
function parseKeywords(kw) {
  if (Array.isArray(kw)) return kw
  if (typeof kw === 'string') { try { const p = JSON.parse(kw); return Array.isArray(p) ? p : [] } catch { return [] } }
  return []
}

/* ---------------- 审计核心 ---------------- */
function audit(rows, label) {
  const issues = {
    emptyQ: [], emptyA: [], qTooShort: [], aTooShort: [], aEqQ: [],
    placeholder: [], nullSubtrack: [], nullTech: [], emptyKeywords: [],
    badDifficulty: [], nullSource: []
  }
  const normMap = new Map()      // nq -> [obj]
  const qaMap = new Map()        // nq+q+a normalized -> [obj]
  const idMap = new Map()        // id -> count (PK 冲突检测，仅在种子态有用)

  for (const o of rows) {
    if (idMap.has(o.id)) idMap.set(o.id, idMap.get(o.id) + 1); else idMap.set(o.id, 1)
    // 质量
    if (o.qlen === 0) issues.emptyQ.push(o)
    else if (o.qlen < 5) issues.qTooShort.push(o)
    if (o.alen === 0) issues.emptyA.push(o)
    else if (o.alen < 40) issues.aTooShort.push(o)
    if (o.qlen > 0 && o.alen > 0 && normQ(o.q) === normQ(o.a)) issues.aEqQ.push(o)
    if (o.alen > 0 && PLACEHOLDER.test(o.a)) issues.placeholder.push(o)
    if (o.subtrack == null) issues.nullSubtrack.push(o)
    if (o.tech == null) issues.nullTech.push(o)
    if (!o.keywords || o.keywords.length === 0) issues.emptyKeywords.push(o)
    if (o.difficulty && !VALID_DIFFICULTY.has(o.difficulty)) issues.badDifficulty.push(o)
    if (o.source == null) issues.nullSource.push(o)
    // 去重累计
    if (!normMap.has(o.nq)) normMap.set(o.nq, [])
    normMap.get(o.nq).push(o)
    const qaKey = o.nq + '\u0000' + normQ(o.a)
    if (!qaMap.has(qaKey)) qaMap.set(qaKey, [])
    qaMap.get(qaKey).push(o)
  }

  // 精确归一去重簇（size>=2）
  const exactClusters = []
  for (const [k, arr] of normMap) {
    if (k === '' || arr.length < 2) continue
    // 同题不同行即视为重复
    exactClusters.push(arr)
  }
  // 跨赛道同题（归一后同 key 且 track 集合>1）
  const crossTrack = exactClusters.filter(arr => new Set(arr.map(o => o.track)).size > 1)
  // (q,a) 完全同值簇
  const qaClusters = []
  for (const [k, arr] of qaMap) { if (k === '' || arr.length < 2) continue; qaClusters.push(arr) }

  // ID 主键冲突
  const dupIds = [...idMap.entries()].filter(([, c]) => c > 1).map(([id]) => id)

  // 近邻去重（改写/同义重述）：同赛道、首 6 归一字分桶、字符二元组 Jaccard>=0.88。
  // 先按首 6 归一字分桶，桶内两两比对，整体复杂度可控；已被精确簇覆盖的不再计入。
  const buckets = new Map()
  for (const o of rows) {
    const key = o.nq.slice(0, 6)
    if (!key) continue
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(o)
  }
  const biCache = new Map()
  const getBi = (o) => { if (!biCache.has(o.id)) biCache.set(o.id, bigrams(o.q)); return biCache.get(o.id) }
  const near = []
  for (const arr of buckets.values()) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i].track !== arr[j].track) continue
        if (arr[i].nq === arr[j].nq) continue // 已计入精确簇
        const sim = jaccard(getBi(arr[i]), getBi(arr[j]))
        if (sim >= 0.88) near.push({ a: arr[i], b: arr[j], sim })
      }
    }
  }
  near.sort((x, y) => y.sim - x.sim)

  return {
    label,
    total: rows.length,
    rqCount: rows.filter(o => o.isRq).length,
    issues,
    exactClusters,
    crossTrack,
    qaClusters,
    nearDup: near,
    dupIds
  }
}

/* ---------------- 报告渲染 ---------------- */
function summarize(rep) {
  const i = rep.issues
  const affected = new Set()
  for (const k of Object.keys(i)) for (const o of i[k]) affected.add(o.id)
  const dupRows = new Set()
  for (const c of rep.exactClusters) for (const o of c) dupRows.add(o.id)
  return {
    label: rep.label,
    total: rep.total,
    rqCount: rep.rqCount,
    exactDupClusters: rep.exactClusters.length,
    exactDupRows: dupRows.size,
    nearDupPairs: rep.nearDup.length,
    crossTrackClusters: rep.crossTrack.length,
    qaDupClusters: rep.qaClusters.length,
    dupIds: rep.dupIds.length,
    issueCounts: Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v.length])),
    rowsWithAnyIssue: affected.size
  }
}

function renderMarkdown(reps, seedRecon) {
  const lines = []
  lines.push('# 面试题库 · 质量与去重审计报告')
  lines.push('')
  lines.push(`> 生成时间：${new Date().toISOString()}`)
  lines.push('> 数据源：devmentor.db（serve 实际数据）+ seed-content.json（内容真源）')
  lines.push('> 本审计**仅读取、不修改任何数据**。')
  lines.push('')

  // 概览表
  lines.push('## 一、概览')
  lines.push('')
  lines.push('| 数据源 | 总题数 | 路线图题(rq) | 精确重复簇 | 受影响行 | 任意质量问题行 |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |')
  for (const s of reps) {
    const m = summarize(s)
    lines.push(`| ${s.label} | ${m.total} | ${m.rqCount} | ${m.exactDupClusters} | ${m.exactDupRows} | ${m.rowsWithAnyIssue} |`)
  }
  lines.push('')
  lines.push('> 精确重复 = 题干归一(去空白/标点/标签/大小写)后完全一致；近邻重复 = 同赛道内字符二元组 Jaccard≥0.88 的改写/同义重述（需人工确认是否合并）。')
  lines.push('> 占位符检测仅用中文编写缺口词（待补充/待完善/待填写/[待）；英文 TODO/FIXME/TBD 因在本语料中多为合法技术内容（TodoMVC、fixme 概念讲解）已剔除，故占位符计数偏保守、仅代表「强信号缺口」。')
  lines.push('')

  // 质量明细
  lines.push('## 二、质量问题明细')
  lines.push('')
  for (const s of reps) {
    const m = summarize(s)
    lines.push(`### ${s.label}（总 ${m.total} 题）`)
    lines.push('')
    lines.push('| 问题类型 | 数量 | 说明 |')
    lines.push('| --- | ---: | --- |')
    const desc = {
      emptyQ: '题干为空', emptyA: '答案为空', qTooShort: '题干 < 5 字（疑似非完整题）',
      aTooShort: '答案 < 40 字（桩/占位嫌疑）', aEqQ: '答案==题干（复制错误）',
      placeholder: '答案含中文编写缺口标记(待补充/待完善/待填写/[待)', nullSubtrack: 'subtrack 为空 → 题库 UI 不可见',
      nullTech: 'tech 为空 → 二级技术筛选缺位', emptyKeywords: 'keywords 为空',
      badDifficulty: 'difficulty 值非法（非 easy/medium/hard）', nullSource: 'source 为空 → 溯源缺口'
    }
    for (const [k, v] of Object.entries(m.issueCounts)) {
      if (v > 0) lines.push(`| ${k} | ${v} | ${desc[k] || k} |`)
    }
    if (m.dupIds > 0) lines.push(`| dupId | ${m.dupIds} | 种子内 ID 主键冲突（INSERT OR IGNORE 静默丢题）|`)
    lines.push('')
  }

  // 去重明细（仅 DB 主源详细列样本）
  const dbRep = reps.find(r => r.label === 'DB')
  if (dbRep) {
    lines.push('## 三、去重发现（DB 主源）')
    lines.push('')
    lines.push(`- 精确归一重复簇：${dbRep.exactClusters.length} 个，涉及 ${[...new Set(dbRep.exactClusters.flatMap(c => c.map(o => o.id)))].length} 行`)
    lines.push(`- 近邻重复候选（同赛道 Jaccard≥0.88）：${dbRep.nearDup.length} 对（改写/同义重述，需人工确认）`)
    lines.push(`- 跨赛道同题簇：${dbRep.crossTrack.length} 个`)
    lines.push(`- (q,a) 完全同值簇：${dbRep.qaClusters.length} 个`)
    lines.push('')
    if (dbRep.nearDup.length) {
      lines.push('### 近邻重复候选样本（前 12 对，按相似度降序）')
      lines.push('')
      lines.push('| # | 相似度 | A (id@track) | B (id@track) |')
      lines.push('| ---: | ---: | --- | --- |')
      dbRep.nearDup.slice(0, 12).forEach((p, idx) => {
        const av = `${p.a.id}@${p.a.track}：${(p.a.q || '').slice(0, 30).replace(/\n/g, ' ')}`
        const bv = `${p.b.id}@${p.b.track}：${(p.b.q || '').slice(0, 30).replace(/\n/g, ' ')}`
        lines.push(`| ${idx + 1} | ${p.sim.toFixed(3)} | ${av} | ${bv} |`)
      })
      lines.push('')
    }
    lines.push('### 重复簇样本（前 15 个，含题面 + 重复 ID/赛道）')
    lines.push('')
    lines.push('| # | 归一题面(截断) | 重复数 | 涉及 ID / 赛道 |')
    lines.push('| ---: | --- | ---: | --- |')
    dbRep.exactClusters.slice(0, 15).forEach((c, idx) => {
      const q = (c[0].q || '').slice(0, 36).replace(/\n/g, ' ')
      const ids = c.map(o => `${o.id}@${o.track}`).join('、')
      lines.push(`| ${idx + 1} | ${q} | ${c.length} | ${ids} |`)
    })
    lines.push('')

    if (dbRep.crossTrack.length) {
      lines.push('### 跨赛道同题（应重点核查，通常应只保留一个方向）')
      lines.push('')
      dbRep.crossTrack.slice(0, 10).forEach((c) => {
        const q = (c[0].q || '').slice(0, 50).replace(/\n/g, ' ')
        const tracks = [...new Set(c.map(o => o.track))].join('/')
        lines.push(`- 「${q}」→ 出现于 [${tracks}]：${c.map(o => o.id).join(', ')}`)
      })
      lines.push('')
    }
  }

  // 种子对账
  if (seedRecon) {
    lines.push('## 四、种子↔DB 对账')
    lines.push('')
    lines.push(`- 种子面试题总数：${seedRecon.seedTotal}；DB 面试题总数：${seedRecon.dbTotal}`)
    lines.push(`- 种子内 ID 主键冲突：${seedRecon.seedDupIds} 个（这些题在 INSERT OR IGNORE 下会被静默丢弃）`)
    lines.push(`- 计数差异（DB - 种子）：${seedRecon.dbTotal - seedRecon.seedTotal}` +
      (seedRecon.dbTotal - seedRecon.seedTotal !== 0 ? '（需核查：种子有重复 ID 或 DB 有手工新增）' : '（一致）'))
    lines.push('')
  }

  // 处置建议
  lines.push('## 五、处置建议（本审计未执行任何修改）')
  lines.push('')
  lines.push('1. **去重**：对精确归一重复簇，保留 `skill/subtrack` 最完整、答案最长的一条，其余删除或合并；跨赛道同题按方向归属只留其一。')
  lines.push('2. **空/桩题**：`emptyA` / `aTooShort` 的题需 LLM 重写答案或降权；`emptyQ` 直接修或删。')
  lines.push('3. **可见性**：`nullSubtrack` 题在 v3 题库 UI 不可见，需补标方向（复用 `interviewSubtrackMap` 的确定性映射，参考迁移 v22）。')
  lines.push('4. **溯源**：`nullSource` 缺口由 `_inject-*-sources.mjs` 系列按 tech 补官方根站。')
  lines.push('5. **种子主键冲突**：修正种子内重复 ID，避免 `INSERT OR IGNORE` 静默丢题；重新 seed 前先 `SELECT id, COUNT(*) FROM interview_questions GROUP BY id HAVING COUNT(*)>1` 验证。')
  lines.push('')
  lines.push('> 下一步：确认上述任一项后，再编写对应的「修复迁移 + seed 同步」脚本（沿用 v22 幂等迁移 + gen-learn 双写范式）。')
  lines.push('')
  return lines.join('\n')
}

/* ---------------- main ---------------- */
function main() {
  const reps = []

  // 种子
  let seedRecon = null
  const seedRows = []
  if (fs.existsSync(SEED_PATH)) {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'))
    let seedTotal = 0
    for (const [track, bank] of Object.entries(seed.interview || {})) {
      for (const type of ['hot', 'special']) {
        for (const q of bank[type] || []) {
          seedRows.push(rowToObj({ ...q, track, type }))
          seedTotal++
        }
      }
    }
    const seedRep = audit(seedRows, 'SEED')
    reps.push(seedRep)
    const seedDupIds = seedRep.dupIds.length
    seedRecon = { seedTotal, seedDupIds }
  }

  if (!onlySeed && fs.existsSync(DB_PATH)) {
    const db = new Database(DB_PATH, { readonly: true })
    const dbRows = (db.prepare('SELECT id,track,type,subtrack,tech,difficulty,skill,keywords,source,q,a FROM interview_questions').all()).map(rowToObj)
    const dbTotal = dbRows.length
    db.close()
    const dbRep = audit(dbRows, 'DB')
    // 把 DB 插到最前（主源）
    reps.unshift(dbRep)
    if (seedRecon) seedRecon.dbTotal = dbTotal
  }

  // 输出 JSON
  const outJson = {
    generatedAt: new Date().toISOString(),
    summaries: reps.map(summarize),
    details: reps.map(r => ({
      label: r.label,
      exactClusters: r.exactClusters.map(c => ({ q: c[0].q, count: c.length, rows: c.map(o => ({ id: o.id, track: o.track, subtrack: o.subtrack, qlen: o.qlen, alen: o.alen })) })),
      crossTrack: r.crossTrack.map(c => ({ q: c[0].q, tracks: [...new Set(c.map(o => o.track))], ids: c.map(o => o.id) })),
      qaClusters: r.qaClusters.length,
      nearDup: r.nearDup.slice(0, 60).map(p => ({ sim: +p.sim.toFixed(3), a: { id: p.a.id, track: p.a.track, q: p.a.q }, b: { id: p.b.id, track: p.b.track, q: p.b.q } })),
      dupIds: r.dupIds,
      issues: Object.fromEntries(Object.entries(r.issues).map(([k, v]) => [k, v.map(o => ({ id: o.id, track: o.track, len: k.includes('Q') || k === 'aEqQ' ? o.qlen : o.alen }))]))
    }))
  }
  fs.mkdirSync(path.join(ROOT, '.workbuddy'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, '.workbuddy', 'interview-audit.json'), JSON.stringify(outJson, null, 1))

  // 输出 Markdown
  const md = renderMarkdown(reps, seedRecon)
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'docs', 'interview-quality-audit.md'), md)

  // 控制台摘要
  console.log('=== 面试题库审计完成 ===')
  for (const s of reps) {
    const m = summarize(s)
    console.log(`[${s.label}] 总=${m.total} rq=${m.rqCount} 精确重复簇=${m.exactDupClusters}(行${m.exactDupRows}) 近邻候选=${m.nearDupPairs} 跨赛道=${m.crossTrackClusters} (q,a)同值=${m.qaDupClusters} ID冲突=${m.dupIds}`)
    console.log('   质量问题:', JSON.stringify(m.issueCounts))
  }
  console.log('\n✓ JSON:', path.join(ROOT, '.workbuddy', 'interview-audit.json'))
  console.log('✓ 报告:', path.join(ROOT, 'docs', 'interview-quality-audit.md'))
}

main()
