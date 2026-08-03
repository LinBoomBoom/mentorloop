import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runBackup } from '../scripts/backup-db.mjs'

describe('B4 WAL 在线备份', () => {
  it('VACUUM INTO 产出一致快照并通过 integrity_check', () => {
    const src = path.join(os.tmpdir(), 'ml-bak-src-' + Date.now() + '.db')
    const d = new Database(src)
    d.exec('CREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT)')
    d.prepare('INSERT INTO t(id,v) VALUES (?,?)').run(1, 'hello')
    d.prepare('INSERT INTO t(id,v) VALUES (?,?)').run(2, 'world')
    d.close()

    const dest = runBackup(src, path.join(os.tmpdir(), 'ml-bak-dest-' + Date.now()))
    expect(fs.existsSync(dest)).toBe(true)

    const dst = new Database(dest)
    const rows = dst.prepare('SELECT COUNT(*) AS c FROM t').get().c
    const first = dst.prepare('SELECT v FROM t WHERE id=1').get().v
    dst.close()
    expect(rows).toBe(2)
    expect(first).toBe('hello')

    // 清理
    fs.rmSync(path.dirname(dest), { recursive: true, force: true })
    fs.rmSync(src, { force: true })
  })
})
