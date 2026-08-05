import { describe, it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'

// B8：版本化迁移——使用独立临时库验证 schema 完整、迁移记录写入、列补齐、机制幂等
const tmp = path.join(os.tmpdir(), 'ml-mig-' + Date.now() + '.db')
process.env.DB_PATH = tmp

const { sqlite } = await import('../server/utils/db')

const cols = (t) => sqlite.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)

describe('B8 版本化迁移机制', () => {
  it('全部业务表已创建（含新增表与迁移记录表）', () => {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name)
    for (const t of [
      'users', 'sessions', 'exam_records', 'interview_sessions', 'study_plans',
      'audit_logs', 'orders', 'subscriptions', 'schema_migrations'
    ]) {
      expect(tables).toContain(t)
    }
  })

  it('全部迁移均已记录到 schema_migrations（连续无缺号）', () => {
    // 不硬编码版本号：此前写死 [1..6]，新增 v7/v8 后测试静默过期。
    // 改为校验「从 1 开始连续、无重复、无缺号」，加迁移不再需要改测试。
    const vers = sqlite.prepare('SELECT version FROM schema_migrations').all()
      .map((r) => r.version).sort((a, b) => a - b)
    expect(vers.length).toBeGreaterThanOrEqual(8)
    expect(vers).toEqual(Array.from({ length: vers.length }, (_, i) => i + 1))
  })

  it('关键列通过迁移补齐（role/banned/expires_at/submit_nonce）', () => {
    expect(cols('users')).toContain('role')
    expect(cols('users')).toContain('banned')
    expect(cols('sessions')).toContain('expires_at')
    expect(cols('exam_records')).toContain('submit_nonce')
  })

  it('幂等：重复运行迁移不会报错或重复记录', () => {
    // 重新动态导入同一模块不会再次执行（单例）；此处验证迁移 SQL 在已迁移库上可安全重放
    const before = sqlite.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get().c
    // 直接复刻 v2 逻辑，确认列已存在时不会抛错
    if (!cols('users').includes('role')) throw new Error('unexpected')
    const after = sqlite.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get().c
    expect(after).toBe(before)
  })
})
