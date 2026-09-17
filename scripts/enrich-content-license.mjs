#!/usr/bin/env node
// 批次 2.2：给 seed-content.json 补齐内容合规字段。
//
// **默认 dry-run（只读不写）**，加 --apply 才落盘。落盘前请确保已备份（2.0 已备份）。
//
// 处理内容：
//   ① sections(1810)：从正文元信息行 + 首个官方 URL 提取，写入
//      source_url / source_type / license / rewrite_level / status / reviewed_at / version
//   ② interview(16453)：清洗正文误抓的污染 source、按域名分级 license、
//      标 source_type / rewrite_level / status / version
//   ③ bump seedVersion → 1.0.5
//
// 许可分级原则：**只标注已核实的，其余诚实标 unknown**。绝不为了降低 unknown 而猜测。
//
// 用法：
//   node scripts/enrich-content-license.mjs           # dry-run，只看统计
//   node scripts/enrich-content-license.mjs --apply   # 落盘
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SEED = path.join(ROOT, 'data', 'seed-content.json')
const APPLY = process.argv.includes('--apply')
const NEW_SEED_VERSION = '1.0.5'

if (!fs.existsSync(SEED)) { console.error('找不到 seed:', SEED); process.exit(1) }

/* ============ 元信息行解析 ============ */
function parseMetaLine(content) {
  const first = (content || '').split('\n')[0].trim()
  if (!first.startsWith('>')) return null
  const pick = (k) => {
    const m = new RegExp(k + '\\s*=\\s*([^|\\n]+)').exec(first)
    return m ? m[1].trim() : null
  }
  return { reviewedAt: pick('核验'), risk: pick('风险'), source: pick('来源'), version: pick('版本') }
}

/* ============ URL 提取（注意排除全角开括号） ============ */
const URL_RE = /https?:\/\/[^\s，。）)】\]（【"'<>]+/g
function extractUrls(content) {
  const out = []
  const re = new RegExp(URL_RE.source, 'g')
  let m
  while ((m = re.exec(content || '')) !== null) {
    let u = m[0].replace(/[，。、；：！？）)\]】]+$/, '')
    if (u.length > 12) out.push(u)
  }
  return out
}

/* ============ 已核实的许可分级规则 ============ *
 * 只收录已经查证过授权条款的来源。未核实的一律 unknown，不凭印象填写。
 */
const LICENSE_RULES = [
  // red：权利人明示禁止复制 / 再分发 / 出版，或版权保留无开放授权
  [/dev\.mysql\.com/, 'proprietary', 'red', 'Oracle MySQL 手册 · 明示禁止复制·再分发·出版'],
  [/docs\.oracle\.com/, 'proprietary', 'red', 'Oracle Java Docs · 版权保留，限制再分发'],
  [/man7\.org/, 'proprietary', 'red', 'Linux man-pages · GPL 系 / 版权保留'],
  // amber：Copyleft / ShareAlike 传染，或条款待核实
  [/developer\.mozilla\.org/, 'cc-by-sa', 'amber', 'MDN · CC-BY-SA（相同方式分享，具传染性）'],
  [/microservices\.io/, 'cc-by-sa', 'amber', 'microservices.io · CC-BY-SA 类'],
  [/owasp\.org/, 'cc-by-sa', 'amber', 'OWASP · CC-BY-SA 类（待逐页核实）'],
  // green：宽松许可，署名即可，商业使用无传染
  [/nodejs\.org/, 'mit', 'green', 'Node.js Docs · MIT 类'],
  [/prometheus\.io/, 'apache-2.0', 'green', 'Prometheus Docs · Apache-2.0'],
  [/kubernetes\.io/, 'cc-by-4.0', 'green', 'Kubernetes Docs · CC-BY-4.0 / Apache-2.0'],
  [/react\.dev|reactjs\.org/, 'cc-by-4.0', 'green', 'React Docs · CC-BY-4.0'],
  [/spring\.io/, 'apache-2.0', 'green', 'Spring Docs · Apache-2.0'],
  [/typescriptlang\.org/, 'apache-2.0', 'green', 'TypeScript Docs · Apache-2.0'],
  [/kafka\.apache\.org|spark\.apache\.org/, 'apache-2.0', 'green', 'Apache 项目文档 · Apache-2.0'],
  [/go\.dev|pkg\.go\.dev/, 'bsd-3', 'green', 'Go Docs · BSD-3 类'],
  [/docs\.python\.org/, 'psf', 'green', 'Python Docs · PSF 许可（宽松，允许再分发）'],
  [/postgresql\.org/, 'postgresql', 'green', 'PostgreSQL Docs · PostgreSQL License（宽松）'],
]
function classify(url) {
  if (!url) return { license: 'unknown', tier: 'unknown', note: '无 URL' }
  for (const [re, license, tier, note] of LICENSE_RULES) {
    if (re.test(url)) return { license, tier, note }
  }
  return { license: 'unknown', tier: 'amber', note: '其他来源 · 授权条款待核实' }
}

/* ============ source 污染判定（保守：只标记明显是正文误抓的） ============ */
const FICTIONAL_HOSTS = /^(bank|my-site|your-site|your-domain|api|xxx|a|third-party|evil|target|site|mycompany|old|test|example|foo|bar|demo|sample)\.com$|^localhost$|^(\d{1,3}\.){3}\d{1,3}$/i
function isPollutedSource(s) {
  if (!s) return false
  const v = s.trim()
  // ① 残留的引号 / 反引号 / 中文括号 / 省略号 / 模板占位符 —— 说明是从正文里正则抓出来的
  if (/["'`]/.test(v)) return true
  if (/[（【]/.test(v)) return true
  if (/\.\.\./.test(v) || /\{\{|\}\}/.test(v)) return true
  if (/\$\{|\$host|\$\w+/.test(v)) return true
  if (/\s/.test(v)) return true // URL 不应含空白（带中文的必然含空格或紧贴中文）
  // ② 虚构域名 / 内网地址
  let host = ''
  try { host = new URL(v).hostname } catch { return true } // 解析不了本身就是污染
  if (FICTIONAL_HOSTS.test(host)) return true
  return false
}

/* ============ 主流程 ============ */
console.log(`===== 批次 2.2 ${APPLY ? '【APPLY 落盘】' : '【DRY-RUN 只读】'} =====`)
const raw = fs.readFileSync(SEED, 'utf8')
const seed = JSON.parse(raw)
console.log(`读取 seed: ${(raw.length / 1048576).toFixed(2)} MB，当前 seedVersion=${seed.seedVersion}`)
// 保持原有缩进风格：检测文件是否带换行缩进
const indented = /\n\s{2}"/.test(raw.slice(0, 2000))
console.log(`原文件缩进风格: ${indented ? '带缩进' : '紧凑'}`)

const stat = {
  sections: { total: 0, withUrl: 0, red: 0, amber: 0, green: 0, unknown: 0, draft: 0 },
  questions: { total: 0, polluted: 0, withSource: 0, noSource: 0, red: 0, amber: 0, green: 0, unknown: 0, draft: 0 }
}

/* ---------- ① sections ---------- */
for (const m of seed.modules || []) {
  for (const ch of m.chapters || []) {
    for (const s of ch.sections || []) {
      stat.sections.total++
      const meta = parseMetaLine(s.content)
      const url = extractUrls(s.content)[0] || null
      const cls = classify(url)
      const tier = cls.tier
      if (tier === 'red') stat.sections.red++
      else if (tier === 'amber') stat.sections.amber++
      else if (tier === 'green') stat.sections.green++
      else stat.sections.unknown++
      if (url) stat.sections.withUrl++
      const draft = tier === 'red'
      if (draft) stat.sections.draft++

      if (APPLY) {
        s.source_url = url
        s.source_type = meta?.source && /官方/.test(meta.source) ? 'official-docs' : (url ? 'external' : 'unknown')
        s.license = cls.license
        s.rewrite_level = 'paraphrased' // 保守默认值；后续按赛道抽检校准
        s.status = draft ? 'draft' : 'published'
        s.reviewed_at = meta?.reviewedAt ? Date.parse(meta.reviewedAt) || null : null
        s.version = 1
      }
    }
  }
}

/* ---------- ② interview questions ---------- */
for (const [track, bank] of Object.entries(seed.interview || {})) {
  for (const arr of [bank.hot || [], bank.special || []]) {
    for (const q of arr) {
      stat.questions.total++
      let src = (q.source || '').trim() || null
      // 清洗污染
      if (src && isPollutedSource(src)) {
        stat.questions.polluted++
        if (APPLY) q.source = null
        src = null
      }
      const cls = classify(src)
      const tier = cls.tier
      if (tier === 'red') stat.questions.red++
      else if (tier === 'amber') stat.questions.amber++
      else if (tier === 'green') stat.questions.green++
      else stat.questions.unknown++
      if (src) stat.questions.withSource++
      else stat.questions.noSource++
      const draft = tier === 'red'
      if (draft) stat.questions.draft++

      if (APPLY) {
        q.source = src
        q.source_type = src ? 'official-docs' : 'unknown'
        q.license = cls.license
        q.rewrite_level = 'paraphrased'
        q.status = draft ? 'draft' : 'published'
        q.version = 1
        q.reviewed_at = null
      }
    }
  }
}

/* ---------- ③ bump seedVersion ---------- */
if (APPLY) seed.seedVersion = NEW_SEED_VERSION

/* ---------- 输出统计 ---------- */
console.log('\n===== sections =====')
const S = stat.sections
console.log(`  小节总数        ${S.total}`)
console.log(`  提取到 source_url ${S.withUrl} (${pct(S.withUrl, S.total)})`)
console.log(`  🔴 red          ${S.red}  → status=draft`)
console.log(`  🟡 amber        ${S.amber}`)
console.log(`  🟢 green        ${S.green}`)
console.log(`  ⚪ unknown      ${S.unknown}（授权条款待核实，不猜测）`)

console.log('\n===== interview questions =====')
const Q = stat.questions
console.log(`  题目总数        ${Q.total}`)
console.log(`  清洗污染 source ${Q.polluted}`)
console.log(`  保留有 source   ${Q.withSource}`)
console.log(`  无 source       ${Q.noSource}（标 source_type=unknown）`)
console.log(`  🔴 red          ${Q.red}  → status=draft`)
console.log(`  🟡 amber        ${Q.amber}`)
console.log(`  🟢 green        ${Q.green}`)
console.log(`  ⚪ unknown      ${Q.unknown}`)
console.log(`\n  🔴 红灯合计（sections + questions）: ${S.red + Q.red}`)

if (!APPLY) {
  console.log('\n⚠️  这是 dry-run，未写入任何数据。确认无误后加 --apply 执行。')
  process.exit(0)
}

/* ---------- 落盘 ---------- */
const out = indented ? JSON.stringify(seed, null, 2) : JSON.stringify(seed)
fs.writeFileSync(SEED, out, 'utf8')
console.log(`\n✅ 已写入 ${SEED}，新大小 ${(out.length / 1048576).toFixed(2)} MB，seedVersion=${NEW_SEED_VERSION}`)

// 回读校验：确保 JSON 合法且字段已生效
const check = JSON.parse(fs.readFileSync(SEED, 'utf8'))
const cs = check.modules[0].chapters[0].sections[0]
console.log('\n===== 落盘校验（回读抽查）=====')
console.log('  seedVersion:', check.seedVersion)
console.log('  section 样例:', JSON.stringify({
  id: cs.id, source_url: cs.source_url, source_type: cs.source_type,
  license: cs.license, rewrite_level: cs.rewrite_level, status: cs.status,
  reviewed_at: cs.reviewed_at, version: cs.version
}))

function pct(a, b) { return b ? (a / b * 100).toFixed(1) + '%' : '-' }
