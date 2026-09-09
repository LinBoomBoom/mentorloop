// 内容归类一致性回归测试（P0 防回归闸）
//
// 背景：tech 标签历史上存在 4 套互不相干的硬编码分类器（server/utils/db.ts、_reseed.mjs、
// gen-interview.mjs、gen-interview-roadmap.mjs），各自产出「应用与部署」「模型基础/训练」
// 「JavaScript/TS」「Embedding/向量」等非受控取值，写库后破坏 A3 断言、并让 UI 二级筛选
// 再次出现「点了没题」。现已统一收敛到 app/data/techVocabulary.ts。
//
// 本测试钉死三件事：
//   ① 词表自身自洽（结构合法、名称唯一、别名可回解）
//   ② 4 套 legacy 分类器的历史标签 100% 能解析为受控规范名（否则会落兜底、丢失语义）
//   ③ 4 个写入点的闸口调用仍然存在（防止后续重构被误删，导致非词表值再次入库）

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  TECH_VOCABULARY,
  TECH_RESOLVE,
  TECH_FALLBACK,
  resolveTech,
  canonicalizeTech
} from '../app/data/techVocabulary.ts'

const MODULES = ['frontend', 'backend', 'devops', 'ai']

/** 4 个会写入 interview_questions.tech 的位置 */
const WRITE_SITES = [
  'server/utils/db.ts',
  'scripts/_reseed.mjs',
  'scripts/gen-interview.mjs',
  'scripts/gen-interview-roadmap.mjs'
]

const readRepo = (rel) => readFileSync(fileURLToPath(new URL('../' + rel, import.meta.url)), 'utf8')

/** 从源码按所属模块抽取 legacy 标签：追踪最近出现的 `frontend:` / `backend:` ... 键 */
function extractLegacyPairs () {
  const pairs = new Map()
  for (const f of WRITE_SITES) {
    let src
    try { src = readRepo(f) } catch { continue }
    let cur = null
    for (const line of src.split('\n')) {
      const modHit = line.match(/^\s{0,4}(frontend|backend|devops|ai)\s*:\s*\[/)
      if (modHit) cur = modHit[1]
      for (const m of line.matchAll(/tech:\s*'([^']+)'/g)) {
        if (cur) pairs.set(cur + '||' + m[1], { module: cur, label: m[1], file: f })
      }
    }
  }
  return [...pairs.values()]
}

describe('受控技术词表自洽性', () => {
  it('词表非空且每个条目结构完整', () => {
    expect(TECH_VOCABULARY.length).toBeGreaterThan(20)
    for (const t of TECH_VOCABULARY) {
      expect(t.id, `条目缺 id: ${JSON.stringify(t)}`).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(MODULES, `非法 module: ${t.module}`).toContain(t.module)
      const ok = t.allowTracks === '*' || (Array.isArray(t.allowTracks) && t.allowTracks.length > 0)
      expect(ok, `allowTracks 非法: ${t.name}`).toBe(true)
    }
  })

  it('同一模块内规范名不重复（否则解析结果有歧义）', () => {
    const seen = new Map()
    for (const t of TECH_VOCABULARY) {
      const key = t.module + '||' + t.name
      expect(seen.has(key), `重复标签: [${t.module}] ${t.name}`).toBe(false)
      seen.set(key, true)
    }
  })

  it('TECH_RESOLVE 覆盖全部规范名与别名，且能回解到自身', () => {
    for (const t of TECH_VOCABULARY) {
      for (const key of [t.name, ...(t.aliases || [])]) {
        expect(resolveTech(t.module, key), `别名未回解: [${t.module}] ${key}`).toBe(t.name)
      }
    }
    for (const m of MODULES) expect(TECH_RESOLVE[m], `模块桶缺失: ${m}`).toBeTruthy()
  })

  it('每个模块都有兜底规范名，且兜底名本身在词表内', () => {
    for (const m of MODULES) {
      const fb = TECH_FALLBACK[m]
      expect(fb, `模块 ${m} 缺兜底`).toBeTruthy()
      expect(TECH_VOCABULARY.some(t => t.module === m && t.name === fb), `兜底名不在词表: [${m}] ${fb}`).toBe(true)
    }
  })
})

describe('legacy 分类器标签 → 受控规范名', () => {
  const legacy = extractLegacyPairs()

  it('能从 4 个写入点抽取到 legacy 标签（抽取器失效则本测试失去意义）', () => {
    expect(legacy.length).toBeGreaterThan(10)
  })

  it('每个 legacy 标签都能解析为规范名（不得静默落兜底）', () => {
    const unresolved = legacy.filter(p => !resolveTech(p.module, p.label))
    expect(
      unresolved.map(p => `[${p.module}] ${p.label} ← ${p.file}`),
      '以下历史标签无法解析，会在新增题目时退化为「综合应用」，需补 aliases'
    ).toEqual([])
  })

  it('「部署与成本」不得做别名直映（历史过度宽泛标签，须按题面细分）', () => {
    // 设计约束：该标签曾覆盖 AI 模块 43% 的题目，若直映会让语义细分成果被回滚
    expect(resolveTech('ai', '部署与成本')).toBeNull()
  })
})

describe('canonicalizeTech 封闭性（入库值必定合法）', () => {
  const legacy = extractLegacyPairs()
  const vocabNames = new Set(TECH_VOCABULARY.map(t => t.name))

  it('对任意输入都返回词表内取值', () => {
    const inputs = [
      ...legacy.map(p => [p.module, p.label]),
      ...MODULES.flatMap(m => [[m, null], [m, ''], [m, '完全不存在的标签xyz'], [m, '应用与部署'], [m, '模型基础/训练']])
    ]
    for (const [mod, raw] of inputs) {
      const out = canonicalizeTech(mod, raw)
      expect(vocabNames.has(out), `越界输出: [${mod}] ${raw} → ${out}`).toBe(true)
      expect(TECH_VOCABULARY.some(t => t.module === mod && t.name === out), `跨模块输出: [${mod}] ${raw} → ${out}`).toBe(true)
    }
  })

  it('大小写/空白不敏感', () => {
    expect(canonicalizeTech('ai', '  RAG  ')).toBe('RAG')
    expect(canonicalizeTech('ai', 'rag')).toBe('RAG')
  })

  it('赛道越界时回落到兜底而非透传', () => {
    // 「端侧 AI」仅允许 ai-edge；给其它赛道时必须回落，不能原样入库
    expect(resolveTech('ai', '端侧 AI', 'ai-app')).toBeNull()
    expect(canonicalizeTech('ai', '端侧 AI')).toBeTruthy()
  })
})

describe('写入点闸口存在性（防重构误删）', () => {
  it('4 个写库位置都必须经过受控词表收敛', () => {
    for (const f of WRITE_SITES) {
      const src = readRepo(f)
      const hasGate = /canonicalizeTech\s*\(/.test(src) || /resolveTech\s*\(/.test(src)
      expect(hasGate, `${f} 未经过受控词表闸口，新增题目会写入非词表 tech`).toBe(true)
    }
  })

  it('server/utils/db.ts 必须从受控词表导入（而不是再抄一份本地词表）', () => {
    const src = readRepo('server/utils/db.ts')
    expect(src).toMatch(/from\s+'\.\.\/\.\.\/app\/data\/techVocabulary'/)
  })
})

describe('数据库现状（存在 DB 才校验）', () => {
  const dbPath = fileURLToPath(new URL('../data/devmentor.db', import.meta.url))
  if (!existsSync(dbPath)) {
    it.skip('data/devmentor.db 不存在，跳过', () => {})
    return
  }

  it('库内所有 tech 都命中受控词表（A3）', async () => {
    // 动态 require：better-sqlite3 为原生模块，仅在需要时加载
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true })
    try {
      const rows = db.prepare('SELECT DISTINCT track, tech FROM interview_questions WHERE tech IS NOT NULL AND tech <> \'\'').all()
      expect(rows.length).toBeGreaterThan(0)
      const off = []
      for (const r of rows) {
        if (!MODULES.includes(r.track)) continue
        if (!resolveTech(r.track, r.tech)) off.push(`[${r.track}] ${r.tech}`)
      }
      expect(off, '库内存在词表外 tech，请重跑 npm run taxonomy:reclassify -- --apply').toEqual([])
    } finally {
      db.close()
    }
  })

  it('历史脏值标签已清零', async () => {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true })
    try {
      for (const bad of ['部署与成本', '综合']) {
        const c = db.prepare('SELECT COUNT(*) c FROM interview_questions WHERE tech = ?').get(bad).c
        expect(c, `脏标签残留: ${bad}`).toBe(0)
      }
    } finally {
      db.close()
    }
  })
})
