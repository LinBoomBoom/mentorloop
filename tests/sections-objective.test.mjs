// sections.direction → objective 改名回归测试（D4）
//
// 背景：sections.direction 存的实际是「学习目标」（"能……" 句式），字段名严重误导。
// 更糟的是误导直接导致了功能缺陷——多处代码拿**赛道 id**（frontend/backend/devops/ai）
// 去匹配这一列（WHERE s.direction = ?），而列里是中文学习目标，查询**恒返回 0 行**：
//   - server/utils/db.ts findBestSection：题→小节自动关联永远返回 null
//   - server/utils/studyplan.ts chapterIndex/chapterKeywordIndex：
//     学习计划的章节深链全部降级为纯文本，且 LLM 拿到的是空章节列表
//   - server/utils/admin.ts listSections：后台按方向筛选小节永远为空
// 现统一改为按可靠的 chapters.module_id 过滤，并把列改名为 objective。
//
// 本测试钉死：列名不回退、不再出现「拿 track 直接匹配该列」的错误写法、迁移语义正确。

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const readRepo = (rel) => readFileSync(fileURLToPath(new URL('../' + rel, import.meta.url)), 'utf8')

const SERVER_FILES = [
  'server/utils/db.ts',
  'server/utils/admin.ts',
  'server/utils/studyplan.ts',
  'server/utils/skillMastery.ts'
]

/** 去掉注释后再检查，避免注释里的说明文字造成误判 */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('sections 学习目标字段命名（D4）', () => {
  it('建表语句使用 objective，不再使用 direction', () => {
    const src = stripComments(readRepo('server/utils/db.ts'))
    expect(src).toMatch(/CREATE TABLE IF NOT EXISTS sections[\s\S]{0,400}?objective TEXT/)
    expect(/CREATE TABLE IF NOT EXISTS sections[\s\S]{0,400}?direction TEXT/.test(src)).toBe(false)
  })

  it('写入语句统一写 objective 列', () => {
    const src = stripComments(readRepo('server/utils/db.ts'))
    const inserts = src.match(/INSERT[^']*INTO sections \(([^)]*)\)/g) || []
    expect(inserts.length).toBeGreaterThan(3)
    for (const s of inserts) {
      expect(s, `写入语句仍指向旧列: ${s}`).toContain('objective')
      expect(s).not.toContain('direction')
    }
  })

  it('迁移 v34 语义正确（direction → objective，而不是自相矛盾的 no-op）', () => {
    const src = readRepo('server/utils/db.ts')
    const at = src.indexOf('version: 34,')
    expect(at, '缺少 version 34 迁移').toBeGreaterThan(-1)
    const body = src.slice(at, at + 400)
    expect(body).toContain("colExists(db, 'sections', 'direction')")
    expect(body).toContain("colExists(db, 'sections', 'objective')")
    expect(body).toContain('RENAME COLUMN direction TO objective')
    // 防御：批量替换曾把两端都替换成 objective，使迁移退化为空操作
    expect(body).not.toContain('RENAME COLUMN objective TO objective')
  })
})

describe('不得再拿赛道 id 直接匹配学习目标列', () => {
  it('不存在 WHERE s.direction = ? / WHERE s.objective = ? 这类错误过滤', () => {
    for (const f of SERVER_FILES) {
      const src = stripComments(readRepo(f))
      const bad = src.match(/WHERE\s+s\.(direction|objective)\s*=/g)
      expect(bad, `${f} 仍在用学习目标列做方向过滤（应改用 c.module_id），恒返回 0 行`).toBeNull()
    }
  })

  it('按方向取小节的查询统一使用 chapters.module_id', () => {
    const db = stripComments(readRepo('server/utils/db.ts'))
    const study = stripComments(readRepo('server/utils/studyplan.ts'))
    // findBestSection 与 studyplan 的章节索引都应按模块过滤
    expect(db).toMatch(/JOIN chapters c ON c\.id = s\.chapter_id WHERE c\.module_id = \?/)
    expect((study.match(/WHERE c\.module_id = \?/g) || []).length).toBeGreaterThanOrEqual(2)
  })
})

describe('数据库现状（存在 DB 才校验）', () => {
  const dbPath = fileURLToPath(new URL('../data/devmentor.db', import.meta.url))
  if (!existsSync(dbPath)) {
    it.skip('data/devmentor.db 不存在，跳过', () => {})
    return
  }

  it('sections 表已改名：存在 objective 且不存在 direction', async () => {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true })
    try {
      const cols = db.prepare('PRAGMA table_info(sections)').all().map((r) => r.name)
      expect(cols, 'sections 列：' + cols.join(',') + '（若仍为 direction，启动一次服务即可触发迁移 v34）').toContain('objective')
      expect(cols).not.toContain('direction')
    } finally {
      db.close()
    }
  })

  it('改名未丢数据：全部小节仍有非空学习目标', async () => {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true })
    try {
      const cols = db.prepare('PRAGMA table_info(sections)').all().map((r) => r.name)
      if (!cols.includes('objective')) {
        // 尚未迁移时跳过，避免与上一个用例重复报错
        return
      }
      const total = db.prepare('SELECT COUNT(*) c FROM sections').get().c
      const filled = db.prepare("SELECT COUNT(*) c FROM sections WHERE objective IS NOT NULL AND objective <> ''").get().c
      expect(total).toBeGreaterThan(1000)
      expect(filled, `学习目标缺失：${filled}/${total}`).toBe(total)
    } finally {
      db.close()
    }
  })
})
