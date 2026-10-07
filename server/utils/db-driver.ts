// 双驱动 DB 原语层（M1：better-sqlite3 ↔ mysql2）
//
// 设计（对应设计稿 miniapp-cloud-backend-design.md §4.3）：
// - 云端（环境变量 MYSQL_HOST 存在）：mysql2/promise 连接池，`prepare(sql)` 返回
//   异步门面 { get/all/run }；`transaction(fn)` 返回 async 运行器，事务内语句经
//   AsyncLocalStorage 路由到同一连接（否则连接池会拆散事务）。
// - 本地/桌面端：直通 better-sqlite3 的同步 Statement（调用侧加 await 对同步结果是
//   no-op），transaction 改为手工 BEGIN/COMMIT 包住 `await fn()`（兼容 fn 内含 await）。
// - 同一调用形态两端通用：`await sqlite.prepare(sql).get(...)` / `await sqlite.transaction(fn)()`。
//
// 方言翻译（SQLite → MySQL 5.7）集中在 translateSql：
//   INSERT OR IGNORE INTO → INSERT IGNORE INTO
//   INSERT OR REPLACE INTO → REPLACE INTO
//   ORDER BY rowid → ORDER BY id（exam_choice_reviews/exam_written_reviews 以可排序 id 替代 rowid）
// JSON 列：连接参数 jsonStrings:true，JSON 列按字符串返回，与 SQLite TEXT 语义一致
//（handler 内 JSON.parse(row.options) 等调用无需改动）。
import type Database from 'better-sqlite3'
import { AsyncLocalStorage } from 'node:async_hooks'
import mysql from 'mysql2/promise'

// 驱动选择：云端容器注入 MYSQL_HOST；桌面端/本地 web 开发不注入，走 SQLite。
export const isCloudDb = !!process.env.MYSQL_HOST

/* ---------------- SQL 方言翻译 ---------------- */

// 把 SQLite 双引号保留字标识符（"explain"/"right"/"key"）转成 MySQL 反引号。
// 仅处理已知保留字，不做全局双引号改写（避免误伤字符串字面量）。
const RESERVED_ID = new Set(['explain', 'right', 'key', 'desc'])

export function quoteReserved(sql: string): string {
  // 按 '...' 字符串字面量分段，仅替换字面量外的 "id"，避免误伤字面量内容
  return sql.split(/('(?:[^']|'')*')/g).map((seg) =>
    seg.startsWith("'")
      ? seg
      : seg.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g, (m, id: string) =>
        RESERVED_ID.has(id.toLowerCase()) ? '`' + id + '`' : m)
  ).join('')
}

export function translateSql(sql: string): string {
  let out = quoteReserved(sql)
  out = out.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
  out = out.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO')
  out = out.replace(/ORDER\s+BY\s+rowid/gi, 'ORDER BY id')
  return out
}

/* ---------------- 参数归一 ----------------
 * - undefined → null（与 better-sqlite3 拒绝 undefined 不同，MySQL 侧显式落 NULL，
 *   避免 "Bind parameters must not contain undefined" 直接 500；语义上等价于既有的列默认值写入习惯）
 * - LIMIT/OFFSET 占位符若绑定了数字字符串（query 参数直接透传的场景）归一为 Number，
 *   否则 mysql2 会转义成 LIMIT '10' 语法错误。其余字符串一律保持原样（VARCHAR 主键如 '123' 不能动）。
 */

// 找出 SQL 中所有 ? 占位符的位置（跳过字符串字面量内 / 转义的 ??）
function placeholderIndexes(sql: string): number[] {
  const pos: number[] = []
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    if (c === "'" || c === '"' || c === '`') {
      const q = c
      i++
      while (i < sql.length && sql[i] !== q) {
        if (sql[i] === '\\') i++
        i++
      }
      continue
    }
    if (c === '?') {
      if (sql[i + 1] === '?') { i++; continue }
      pos.push(i)
    }
  }
  return pos
}

export async function normalizeParams(sql: string, params: any[]): any[] {
  const out = params.map((p) => (p === undefined ? null : p))
  const idx = placeholderIndexes(sql)
  const limitRe = /\bLIMIT\s+\?/gi
  const offsetRe = /\bOFFSET\s+\?/gi
  for (const re of [limitRe, offsetRe]) {
    let m: RegExpExecArray | null
    while ((m = await re.exec(sql))) {
      const phIdx = idx.findIndex((p) => p >= m!.index + m![0].length - 1)
      if (phIdx >= 0 && phIdx < out.length) {
        const v = out[phIdx]
        if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) out[phIdx] = Number(v)
      }
    }
  }
  return out
}

// 调用侧既支持 stmt.get(a, b) 也支持 stmt.get([a, b])（better-sqlite3 两种都收）
function flatArgs(args: any[]): any[] {
  return args.length === 1 && Array.isArray(args[0]) ? args[0] : args
}

/* ---------------- 句柄形态 ---------------- */

export interface RunResult { changes: number; lastInsertRowid: number | bigint }
export interface StatementFacade {
  get: (...params: any[]) => Promise<any>
  all: (...params: any[]) => Promise<any[]>
  run: (...params: any[]) => Promise<RunResult>
}
export interface SqliteHandle {
  driver: 'sqlite' | 'mysql'
  prepare: (sql: string) => StatementFacade
  transaction: (fn: (...args: any[]) => any) => (...args: any[]) => Promise<any>
  pool?: unknown
}

/* ---------------- 云端：mysql2 连接池门面 ---------------- */

export function createCloudSqlite(): SqliteHandle {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'mentorloop',
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
    enableKeepAlive: true,
    // JSON 列按字符串返回（与 SQLite TEXT 存取语义一致，handler 的 JSON.parse 不受影响）
    jsonStrings: true
  })

  // 事务上下文：fn 内部 prepare 的语句必须路由到同一连接
  const als = new AsyncLocalStorage<any>()

  async function exec(method: 'get' | 'all' | 'run', sql: string, params: any[]): Promise<any> {
    const conn: any = als.getStore() || pool
    const [rows] = await conn.query(translateSql(sql), await normalizeParams(sql, params))
    if (method === 'all') return rows as any[]
    if (method === 'get') return (rows as any[])[0]
    const r: any = Array.isArray(rows) ? rows[0] : rows
    return { changes: r?.affectedRows ?? 0, lastInsertRowid: r?.insertId ?? 0 }
  }

  function stmt(sql: string): StatementFacade {
    return {
      get: async (...a) => await exec('get', sql, flatArgs(a)),
      all: async (...a) => await exec('all', sql, flatArgs(a)),
      run: async (...a) => await exec('run', sql, flatArgs(a))
    }
  }

  return {
    driver: 'mysql',
    pool,
    prepare: stmt,
    transaction: (fn) => async (...args) => {
      if (als.getStore()) return fn(...args) // 嵌套调用：复用当前事务（不另起 BEGIN）
      const conn: any = await pool.getConnection()
      try {
        await conn.beginTransaction()
        const r = await als.run(conn, () => fn(...args))
        await conn.commit()
        return r
      } catch (e) {
        try { await conn.rollback() } catch { /* 连接已断等场景，释放即可 */ }
        throw e
      } finally {
        conn.release()
      }
    }
  }
}

/* ---------------- 本地：better-sqlite3 直通包装 ----------------
 * prepare 原样返回同步 Statement（调用侧 await 为 no-op，桌面端行为零变化）；
 * transaction 用手工 BEGIN/COMMIT 包住 async fn：fn 内的 await 都是对同步
 * better-sqlite3 调用的 no-op，微任务排空后才会 COMMIT，原子性与旧行为一致。
 */
export function createLocalSqlite(raw: Database.Database): SqliteHandle {
  let txDepth = 0
  return {
    driver: 'sqlite',
    prepare: ((sql: string) => raw.prepare(sql)) as unknown as SqliteHandle['prepare'],
    transaction: (fn) => async (...args) => {
      if (txDepth > 0) return fn(...args) // 嵌套：SQLite 单连接共用外层事务
      await raw.exec('BEGIN')
      txDepth++
      try {
        const r = await fn(...args)
        await raw.exec('COMMIT')
        return r
      } catch (e) {
        try { await raw.exec('ROLLBACK') } catch { /* BEGIN 失败时 ROLLBACK 会再抛，吞掉保留原错误 */ }
        throw e
      } finally {
        txDepth--
      }
    }
  }
}
