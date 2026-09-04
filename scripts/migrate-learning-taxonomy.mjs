// 学习中心分类重构 · 数据迁移脚本（v2）
//
// 用法：
//   node scripts/migrate-learning-taxonomy.mjs --dry-run [--scope all|tech|subtrack]
//   node scripts/migrate-learning-taxonomy.mjs --apply   [--scope all|tech|subtrack]
//   node scripts/migrate-learning-taxonomy.mjs --rollback
//
// 设计原则（零风险）：
//   - --apply 前自动备份 data/devmentor.db 到 data/.bak/devmentor.db.<timestamp>
//   - 所有改写包裹在事务中，任一步失败整体回滚
//   - --rollback 从最新 .bak 还原
//   - P1 阶段默认只跑 --scope tech（规范化题库 tech 列）；subtrack 迁移留待 P2/P3 页面接口同步改造后执行

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DB_PATH = path.join(ROOT, 'data', 'devmentor.db')
const BAK_DIR = path.join(ROOT, 'data', '.bak')

// ---------- 映射表（权威来源：app/data/learningTaxonomy.ts）----------

// 题库 tech（旧自由文本）→ 规范展示名（= Direction.techName）
// 注意：'综合' 为跨切面通用题，暂无对应方向，保留原值并在迁移时告警。
const TECH_MAP = {
  'Agent/工具调用': 'Agent',
  'CI/CD/发布': 'CI/CD',
  CSS: 'CSS',
  'Embedding/向量': 'RAG',
  HTML: 'Web 基础',
  Java: 'Java',
  JavaScript: 'JavaScript',
  Kubernetes: 'Kubernetes',
  'Linux/排查': 'Linux',
  'MySQL/数据库': 'MySQL',
  'Nginx/网关': '网络',
  RAG: 'RAG',
  React: 'React',
  'Redis/缓存': 'Redis',
  Spring: 'Java',
  TypeScript: 'TypeScript',
  Vue: 'Vue',
  '分布式/微服务': '微服务',
  '后端通用': 'Java',
  安全: '安全',
  '容器/Docker': '容器/Docker',
  '工程化/构建': '工程化',
  '并发/多线程': '微服务',
  '应用与部署': '容器/Docker',
  '性能优化': '性能优化',
  '提示工程/Prompt': 'Prompt',
  '评估/Eval': 'Eval',
  '模型基础/训练': '部署与成本',
  '浏览器/渲染': '性能优化',
  消息队列: '消息队列',
  '监控/SRE': 'SRE',
  系统设计: '系统设计',
  '网络/TCP': '网络',
  '网络/HTTP': '网络',
  '网络/TCP/HTTPS': '网络'
  // '综合' 故意不映射 → 保留原值
}

// 章节 subtrack（旧）→ 新规范 id（= Direction.id）。P2/P3 页面改造后执行。
const SUBTRACK_MAP = {
  web: 'fe-web-basic',
  css: 'fe-web-css',
  javascript: 'fe-web-javascript',
  typescript: 'fe-web-typescript',
  react: 'fe-web-react',
  vue: 'fe-web-vue',
  engineering: 'fe-web-engineering',
  performance: 'fe-web-performance',
  security: 'fe-web-security',
  harmony: 'fe-harmony',
  native: 'fe-native',
  // cross / desktop / visualization 三个旧 subtrack 已由专用拆分脚本 + db.ts 迁移 v24/v25/v28
  // 改写为多子主题（flutter/reactnative、electron/tauri、echarts/d3/webgl）。1:N 拆分无法用 1:1
  // 映射表达，且旧 subtrack 在当前库已不存在，故此处不再登记（避免遗留错误 target）。
  miniprogram: 'fe-miniprogram',
  java: 'be-web-java',
  mysql: 'be-data-mysql',
  mq: 'be-arch-mq',
  micro: 'be-arch-micro',
  system: 'be-arch-system',
  cicd: 'do-cicd',
  docker: 'do-container-docker',
  linux: 'do-os-linux',
  network: 'do-os-network',
  sre: 'do-sre',
  agent: 'ai-app-agent',
  deploy: 'ai-app-deploy',
  eval: 'ai-app-eval',
  prompt: 'ai-app-prompt',
  rag: 'ai-app-rag'
}

// ---------- 参数解析 ----------
const args = process.argv.slice(2)
const mode = args.find(a => a === '--dry-run' || a === '--apply' || a === '--rollback')
// 支持两种写法：--scope=tech 与 --scope tech
let scope = 'all'
const eqIdx = args.findIndex(a => a.startsWith('--scope='))
if (eqIdx !== -1) {
  scope = args[eqIdx].split('=')[1]
} else {
  const flagIdx = args.indexOf('--scope')
  if (flagIdx !== -1 && args[flagIdx + 1] && !args[flagIdx + 1].startsWith('--')) {
    scope = args[flagIdx + 1]
  }
}
if (!['all', 'tech', 'subtrack'].includes(scope)) scope = 'all'

if (!mode) {
  console.error('用法: node scripts/migrate-learning-taxonomy.mjs --dry-run|--apply|--rollback [--scope all|tech|subtrack]')
  process.exit(1)
}

if (!fs.existsSync(DB_PATH)) {
  console.error('未找到数据库:', DB_PATH)
  process.exit(1)
}

function ts () {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

// ---------- dry-run ----------
if (mode === '--dry-run') {
  const db = new Database(DB_PATH, { readonly: true })
  console.log(`[dry-run] 数据库: ${DB_PATH}`)
  console.log(`[dry-run] scope = ${scope}\n`)

  if (scope === 'all' || scope === 'tech') {
    const rows = db.prepare("SELECT tech, COUNT(*) c FROM interview_questions WHERE tech IS NOT NULL AND tech != '' GROUP BY tech ORDER BY c DESC").all()
    let toChange = 0
    const unmapped = []
    console.log('=== tech 列校验 ===')
    for (const r of rows) {
      if (TECH_MAP[r.tech] !== undefined) {
        if (TECH_MAP[r.tech] !== r.tech) toChange += r.c
        console.log(`  ✓ ${r.tech}  →  ${TECH_MAP[r.tech]}  (${r.c} 行)`)
      } else {
        unmapped.push(r)
        console.log(`  ⚠ 保留(未映射): ${r.tech}  (${r.c} 行)`)
      }
    }
    console.log(`  tech 待改写行数(值变化): ${toChange}\n`)
    if (unmapped.length) console.log(`  ⚠ 未映射 tech（保留原值）: ${unmapped.map(r => r.tech).join(', ')}\n`)
  }

  if (scope === 'all' || scope === 'subtrack') {
    const rows = db.prepare("SELECT subtrack, COUNT(*) c FROM chapters WHERE subtrack IS NOT NULL AND subtrack != '' GROUP BY subtrack ORDER BY c DESC").all()
    let toChange = 0
    const unmapped = []
    console.log('=== chapters.subtrack 校验 ===')
    for (const r of rows) {
      if (SUBTRACK_MAP[r.subtrack] !== undefined) {
        if (SUBTRACK_MAP[r.subtrack] !== r.subtrack) toChange += r.c
        console.log(`  ✓ ${r.subtrack}  →  ${SUBTRACK_MAP[r.subtrack]}  (${r.c} 行)`)
      } else {
        unmapped.push(r)
        console.log(`  ⚠ 保留(未映射): ${r.subtrack}  (${r.c} 行)`)
      }
    }
    console.log(`  subtrack 待改写行数(值变化): ${toChange}\n`)
    if (unmapped.length) console.log(`  ⚠ 未映射 subtrack（保留原值）: ${unmapped.map(r => r.subtrack).join(', ')}\n`)
  }
  db.close()
  console.log('[dry-run] 完成（未做任何改动）。确认无误后执行 --apply。')
  process.exit(0)
}

// ---------- rollback ----------
if (mode === '--rollback') {
  if (!fs.existsSync(BAK_DIR)) {
    console.error('无备份目录:', BAK_DIR)
    process.exit(1)
  }
  const files = fs.readdirSync(BAK_DIR).filter(f => f.startsWith('devmentor.db.')).sort()
  if (!files.length) {
    console.error('无可用备份')
    process.exit(1)
  }
  const latest = path.join(BAK_DIR, files[files.length - 1])
  fs.copyFileSync(latest, DB_PATH)
  console.log(`[rollback] 已从备份还原: ${latest}`)
  process.exit(0)
}

// ---------- apply ----------
if (mode === '--apply') {
  if (!fs.existsSync(BAK_DIR)) fs.mkdirSync(BAK_DIR, { recursive: true })
  const bakPath = path.join(BAK_DIR, `devmentor.db.${ts()}`)
  fs.copyFileSync(DB_PATH, bakPath)
  console.log(`[apply] 已备份: ${bakPath}`)

  const db = new Database(DB_PATH)
  const tx = db.transaction(() => {
    let total = 0
    if (scope === 'all' || scope === 'tech') {
      for (const [oldV, newV] of Object.entries(TECH_MAP)) {
        if (oldV === newV) continue
        const info = db.prepare('UPDATE interview_questions SET tech = ? WHERE tech = ?').run(newV, oldV)
        total += info.changes
      }
      console.log(`[apply] tech 列已改写 ${total} 行`)
    }
    if (scope === 'all' || scope === 'subtrack') {
      let s = 0
      for (const [oldV, newV] of Object.entries(SUBTRACK_MAP)) {
        if (oldV === newV) continue
        const info = db.prepare('UPDATE chapters SET subtrack = ? WHERE subtrack = ?').run(newV, oldV)
        s += info.changes
      }
      console.log(`[apply] subtrack 列已改写 ${s} 行`)
      total += s
    }
    return total
  })
  try {
    const n = tx()
    db.close()
    console.log(`[apply] 完成，共改写 ${n} 行。如需还原: node scripts/migrate-learning-taxonomy.mjs --rollback`)
  } catch (e) {
    db.close()
    console.error('[apply] 失败，事务已回滚:', e.message)
    process.exit(1)
  }
}
