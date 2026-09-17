#!/usr/bin/env node
// 只读探测：评估 sections 的溯源信息能否脚本化提取。
// **本脚本不写入任何数据**，仅输出报告，用于回答"能不能自动化"再决定后续策略。
//
// 用法：node scripts/probe-section-source.mjs
// 输出：docs/audit/section-source-probe.csv + 控制台统计摘要
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SEED = path.join(ROOT, 'data', 'seed-content.json')
const OUT_DIR = path.join(ROOT, 'docs', 'audit')
const OUT_CSV = path.join(OUT_DIR, 'section-source-probe.csv')

if (!fs.existsSync(SEED)) { console.error('找不到 seed:', SEED); process.exit(1) }
const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'))

/* ---------- 元信息行解析 ---------- */
// 形如：> 时效 | 核验=2026-08-02 | 风险=低 | 来源=官方(可溯源)
function parseMetaLine(content) {
  const first = (content || '').split('\n')[0].trim()
  if (!first.startsWith('>')) return null
  const pick = (k) => {
    const m = new RegExp(k + '\\s*=\\s*([^|\\n]+)').exec(first)
    return m ? m[1].trim() : null
  }
  return {
    raw: first,
    reviewedAt: pick('核验'),
    risk: pick('风险'),
    source: pick('来源'),
    version: pick('版本')
  }
}

/* ---------- URL 提取 ---------- */
// 正文里 URL 形如：https://developer.mozilla.org/en-US/docs/Web/HTML/Element（官方源，可点击回溯）
// 中文全角括号/标点会紧跟其后，需截断。
// 注意：必须排除全角开括号（（【，否则会粘连出「...Element（官方源」这类脏串
const URL_RE = /https?:\/\/[^\s，。）)】\]（【"'<>]+/g
function extractUrls(content) {
  const out = []
  const re = new RegExp(URL_RE.source, 'g')
  let m
  while ((m = re.exec(content || '')) !== null) {
    let u = m[0]
    // 去掉结尾可能残留的标点
    u = u.replace(/[，。、；：！？）)\]】]+$/, '')
    if (u.length > 12) out.push(u)
  }
  return out
}

// 准确率校验：正文里官方源通常写成「<url>（官方源，可点击回溯）」。
// 检测首个 URL 后 24 字符内是否出现「官方源」标记，用来证明提取到的是权威链接而非随手引用。
function isMarkedOfficial(content, url) {
  if (!url) return false
  const i = (content || '').indexOf(url)
  if (i < 0) return false
  return /官方源/.test((content || '').slice(i, i + url.length + 24))
}

/* ---------- 许可分级（与题库同一套规则） ---------- */
const LICENSE_RULES = [
  [/developer\.mozilla\.org/, 'cc-by-sa', 'amber', 'MDN · CC-BY-SA（相同方式分享，具传染性）'],
  [/microservices\.io/, 'cc-by-sa', 'amber', 'microservices.io · CC-BY-SA 类'],
  [/rabbitmq\.com/, 'unknown', 'amber', 'RabbitMQ Docs · 待核实'],
  [/redis\.io/, 'unknown', 'amber', 'Redis Docs · 待核实'],
  [/vuejs\.org/, 'unknown', 'amber', 'Vue Docs · 待核实'],
  [/platform\.openai\.com/, 'unknown', 'amber', 'OpenAI Docs · 待核实'],
  [/owasp\.org/, 'unknown', 'amber', 'OWASP · 待核实'],
  [/docs\.docker\.com/, 'unknown', 'amber', 'Docker Docs · 待核实'],
  [/typescriptlang\.org/, 'apache-2.0', 'green', 'TypeScript Docs · Apache-2.0'],
  [/nginx\.org/, 'unknown', 'amber', 'Nginx Docs · 待核实（2-clause BSD 类）'],
  [/dev\.mysql\.com/, 'proprietary', 'red', 'Oracle MySQL 手册 · 明示禁止复制·再分发'],
  [/docs\.oracle\.com/, 'proprietary', 'red', 'Oracle Java Docs · 版权保留，限制再分发'],
  [/man7\.org/, 'proprietary', 'red', 'Linux man-pages · GPL 系 / 版权保留'],
  [/nodejs\.org/, 'mit', 'green', 'Node.js Docs · MIT 类'],
  [/prometheus\.io/, 'apache-2.0', 'green', 'Prometheus Docs · Apache-2.0'],
  [/kubernetes\.io/, 'cc-by-4.0', 'green', 'Kubernetes Docs · CC-BY-4.0 / Apache-2.0'],
  [/react\.dev|reactjs\.org/, 'cc-by-4.0', 'green', 'React Docs · CC-BY-4.0'],
  [/spring\.io/, 'apache-2.0', 'green', 'Spring Docs · Apache-2.0'],
]
function classify(url) {
  if (!url) return { license: 'unknown', tier: 'unknown', note: '无 URL' }
  for (const [re, license, tier, note] of LICENSE_RULES) {
    if (re.test(url)) return { license, tier, note }
  }
  return { license: 'unknown', tier: 'amber', note: '其他来源 · 待核实' }
}

/* ---------- 主流程 ---------- */
const rows = []
for (const m of seed.modules || []) {
  for (const ch of m.chapters || []) {
    for (const s of ch.sections || []) {
      const meta = parseMetaLine(s.content)
      const urls = extractUrls(s.content)
      const primary = urls[0] || null
      const cls = classify(primary)
      rows.push({
        module: m.id,
        chapter: ch.id,
        section: s.id,
        title: (s.title || '').replace(/[\r\n|]/g, ' ').slice(0, 40),
        hasMeta: !!meta,
        reviewedAt: meta?.reviewedAt || '',
        risk: meta?.risk || '',
        metaSource: meta?.source || '',
        urlCount: urls.length,
        sourceUrl: primary || '',
        officialMarked: isMarkedOfficial(s.content, primary),
        license: cls.license,
        tier: cls.tier,
        note: cls.note
      })
    }
  }
}

/* ---------- 统计 ---------- */
const total = rows.length
const withMeta = rows.filter(r => r.hasMeta).length
const withUrl = rows.filter(r => r.sourceUrl).length
const withDate = rows.filter(r => r.reviewedAt).length
const tierCnt = {}
const licCnt = {}
const riskCnt = {}
const modCnt = {}
for (const r of rows) {
  tierCnt[r.tier] = (tierCnt[r.tier] || 0) + 1
  licCnt[r.license] = (licCnt[r.license] || 0) + 1
  riskCnt[r.risk || '(空)'] = (riskCnt[r.risk || '(空)'] || 0) + 1
  modCnt[r.module] = (modCnt[r.module] || 0) + 1
}

console.log('===== sections 溯源探测（只读，未写入任何数据）=====')
console.log(`小节总数            ${total}`)
console.log(`元信息行覆盖率      ${withMeta} (${pct(withMeta, total)})`)
console.log(`提取到 URL          ${withUrl} (${pct(withUrl, total)})`)
console.log(`解析到核验日期      ${withDate} (${pct(withDate, total)})`)
const officialMarked = rows.filter(r => r.officialMarked).length
console.log(`「官方源」标注命中  ${officialMarked} (${pct(officialMarked, total)}) ← 准确率关键指标`)

console.log('\n===== 风险分档（来自元信息行）=====')
for (const [k, v] of Object.entries(riskCnt).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(10)} ${v}`)

console.log('\n===== 许可分级（按首个 URL 域名）=====')
for (const t of ['red', 'amber', 'green', 'unknown']) {
  if (tierCnt[t]) console.log(`  ${t.padEnd(8)} ${String(tierCnt[t]).padStart(5)}  (${pct(tierCnt[t], total)})`)
}
console.log('\n  license 明细:')
for (const [k, v] of Object.entries(licCnt).sort((a, b) => b[1] - a[1])) console.log(`    ${k.padEnd(14)} ${v}`)

console.log('\n===== 未匹配规则的域名 Top 30（用于扩充分级规则）=====')
const domCnt = {}
for (const r of rows) {
  if (r.tier !== 'amber' || r.license !== 'unknown') continue
  let d = '(无 URL)'
  try { d = new URL(r.sourceUrl).hostname.replace(/^www\./, '') } catch {}
  domCnt[d] = (domCnt[d] || 0) + 1
}
for (const [k, v] of Object.entries(domCnt).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`  ${String(v).padStart(4)}  ${k}`)
}

console.log('\n===== 按方向 =====')
for (const [k, v] of Object.entries(modCnt)) {
  const sub = rows.filter(r => r.module === k)
  const u = sub.filter(r => r.sourceUrl).length
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(5)} 节，有 URL ${u} (${pct(u, v)})`)
}

console.log('\n===== 抽样（每方向 2 节，供人工核对提取是否准确）=====')
for (const m of new Set(rows.map(r => r.module))) {
  for (const r of rows.filter(x => x.module === m).slice(0, 2)) {
    console.log(`  [${r.section}] ${r.title}`)
    console.log(`      meta: 核验=${r.reviewedAt || '-'} 风险=${r.risk || '-'} 来源=${r.metaSource || '-'}`)
    console.log(`      url(${r.urlCount}): ${r.sourceUrl || '(无)'}`)
    console.log(`      → ${r.tier} / ${r.license}  ${r.note}`)
  }
}

/* ---------- 输出 CSV ---------- */
fs.mkdirSync(OUT_DIR, { recursive: true })
const header = 'module,chapter,section,title,hasMeta,reviewedAt,risk,metaSource,urlCount,sourceUrl,license,tier,note\n'
const body = rows.map(r => [
  r.module, r.chapter, r.section, `"${r.title}"`, r.hasMeta ? 1 : 0,
  r.reviewedAt, r.risk, r.metaSource, r.urlCount, r.sourceUrl, r.license, r.tier, `"${r.note}"`
].join(',')).join('\n')
fs.writeFileSync(OUT_CSV, header + body, 'utf8')
console.log(`\nCSV 已输出: ${OUT_CSV}（${rows.length} 行）`)

function pct(a, b) { return b ? (a / b * 100).toFixed(1) + '%' : '-' }
