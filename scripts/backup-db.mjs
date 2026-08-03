// MentorLoop 数据库在线备份（B4：避免只拷 .db 丢未合并 WAL 数据）
// 用法：node scripts/backup-db.mjs   或   npm run backup
// 机制：以只读方式打开源库，用 VACUUM INTO 产出自包含一致快照（含 WAL 已落盘），
//       随后对备份做 integrity_check 校验。
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const DB_PATH = process.env.DB_PATH || path.join(root, 'data', 'devmentor.db')
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(root, 'data', 'backups')

export function runBackup(srcPath = DB_PATH, backupDir = BACKUP_DIR) {
  if (!fs.existsSync(srcPath)) throw new Error('数据库文件不存在: ' + srcPath)
  fs.mkdirSync(backupDir, { recursive: true })

  let destDir = path.join(backupDir, new Date().toISOString().replace(/[:.]/g, '-'))
  let i = 0
  while (fs.existsSync(destDir)) destDir = path.join(backupDir, `bak-${Date.now()}-${++i}`)
  fs.mkdirSync(destDir, { recursive: true })
  const destDb = path.join(destDir, path.basename(srcPath))

  const src = new Database(srcPath, { readonly: true })
  try {
    src.pragma('busy_timeout = 5000')
    src.prepare(`VACUUM INTO '${destDb.replace(/'/g, "''")}'`).run()
  } finally {
    src.close()
  }

  const dst = new Database(destDb)
  try {
    const row = dst.prepare('PRAGMA integrity_check').get()
    const ok = row && (row.integrity_check === 'ok' || row.integrity_check === 'Ok')
    if (!ok) throw new Error('备份 integrity_check 失败: ' + JSON.stringify(row))
  } finally {
    dst.close()
  }
  return destDb
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    const dest = runBackup()
    console.log('[backup] OK ->', dest)
  } catch (e) {
    console.error('[backup] FAIL:', e.message)
    process.exit(1)
  }
}
