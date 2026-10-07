// M1 DB 双驱动原语层单测：方言翻译 / 参数归一 / 本地直通包装 / 驱动选择
// 关联：设计稿 miniapp-cloud-backend-design.md §4.3、任务卡 docs/tasks/2026-10-07-m1-mysql-db-layer.md
// 云端真实连接不测（外网已关，部署后容器内 smoke）；mysql2 连接池仅验证构造与门面形态。
import { describe, it, expect, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import {
  isCloudDb, quoteReserved, translateSql, normalizeParams,
  createLocalSqlite, createCloudSqlite
} from '../server/utils/db-driver'

afterAll(async () => {
  // 环境隔离：万一 CI 环境注入了 MYSQL_HOST，这里不产生真实连接，无资源需要清理
})

describe('方言翻译 translateSql / quoteReserved', () => {
  it('INSERT OR IGNORE / OR REPLACE 转 MySQL 语法', () => {
    expect(translateSql('INSERT OR IGNORE INTO t (a) VALUES (?)')).toBe('INSERT IGNORE INTO t (a) VALUES (?)')
    expect(translateSql('insert or replace into t (a) values (?)')).toBe('REPLACE INTO t (a) values (?)')
  })
  it('ORDER BY rowid 转 ORDER BY id（子表以可排序 id 替代）', () => {
    expect(translateSql('SELECT * FROM exam_choice_reviews WHERE record_id=? ORDER BY rowid'))
      .toBe('SELECT * FROM exam_choice_reviews WHERE record_id=? ORDER BY id')
  })
  it('已知保留字双引号转反引号，未知标识符与字符串字面量不动', () => {
    expect(quoteReserved('SELECT "right", "explain", "key", "desc" FROM t WHERE "plain"=\'"key"\''))
      .toBe('SELECT `right`, `explain`, `key`, `desc` FROM t WHERE "plain"=\'"key"\'')
  })
})

describe('参数归一 normalizeParams', () => {
  it('undefined → null（避免 mysql2 Bind parameters 报错）', async () => {
    expect(await normalizeParams('INSERT INTO t VALUES (?,?)', [1, undefined])).toEqual([1, null])
  })
  it('LIMIT/OFFSET 的数字字符串归一为 Number，普通字符串不动', async () => {
    expect(await normalizeParams('SELECT * FROM t LIMIT ? OFFSET ?', ['10', '5'])).toEqual([10, 5])
    expect(await normalizeParams('SELECT * FROM users WHERE id=? LIMIT ?', ['123', '20'])).toEqual(['123', 20])
  })
})

describe('驱动选择 isCloudDb', () => {
  it('无 MYSQL_HOST 时走 SQLite（本地/桌面端）', () => {
    expect(isCloudDb).toBe(false)
  })
})

describe('本地直通包装 createLocalSqlite', () => {
  const raw = new Database(':memory:')
  const h = createLocalSqlite(raw)
  h.prepare('CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, v TEXT)').run()
  afterAll(() => { try { raw.close() } catch { /* 已关闭 */ } })

  it('prepare 直通：get/all/run 同步语义可用', async () => {
    const r = await h.prepare('INSERT INTO t (v) VALUES (?)').run('a')
    expect(r.changes).toBe(1)
    expect((await h.prepare('SELECT v FROM t WHERE id=?').get(1)).v).toBe('a')
    expect((await h.prepare('SELECT COUNT(*) AS c FROM t').get()).c).toBe(1)
  })

  it('transaction 手工 BEGIN/COMMIT 包住 async fn（兼容 fn 内 await）', async () => {
    const tx = h.transaction(async () => {
      await h.prepare('INSERT INTO t (v) VALUES (?)').run('b')
      return (await h.prepare('SELECT COUNT(*) AS c FROM t').get()).c
    })
    expect(await tx()).toBe(2)
  })

  it('嵌套事务复用外层事务（SQLite 单连接）', async () => {
    const inner = h.transaction(async () => {
      await h.prepare('INSERT INTO t (v) VALUES (?)').run('inner')
      return (await h.prepare('SELECT COUNT(*) AS c FROM t').get()).c
    })
    const outer = h.transaction(async () => await inner())
    expect(await outer()).toBe(3)
  })

  it('fn 抛错时 ROLLBACK，数据不落库且原错误保留', async () => {
    const tx = h.transaction(async () => {
      await h.prepare('INSERT INTO t (v) VALUES (?)').run('ghost')
      throw new Error('boom')
    })
    await expect(tx()).rejects.toThrow('boom')
    expect((await h.prepare("SELECT COUNT(*) AS c FROM t WHERE v='ghost'").get()).c).toBe(0)
  })

  it('语句数组入参兼容：get([a, b]) 与 get(a, b) 等价由调用侧形态保证', async () => {
    expect((await h.prepare('SELECT v FROM t WHERE id=?').get([1])).v).toBe('a')
  })
})

describe('云端门面 createCloudSqlite（不发起真实连接）', () => {
  it('构造连接池并暴露 mysql 驱动标识与异步门面', async () => {
    const h = createCloudSqlite()
    expect(h.driver).toBe('mysql')
    expect(typeof h.prepare).toBe('function')
    const stmt = h.prepare('SELECT * FROM t WHERE id=?')
    expect(typeof stmt.get).toBe('function')
    expect(typeof stmt.all).toBe('function')
    expect(typeof stmt.run).toBe('function')
    expect(typeof h.transaction).toBe('function')
    await h.pool.end()
  })
})
