// 知识库导出：桌面端 SQLite -> 分片 JSON 内容包（供 content-import-mysql.mjs 导入云端 MySQL）
// 设计稿：docs/miniapp-cloud-backend-design.md §4.4 / §6.5
// 用法：node scripts/content-export.mjs [--db data/devmentor.db] [--out data/content-pack-<ts>] [--shard 500]
// 产物：<out>/manifest.json + <out>/<tbl>.<seq>.json（每片 ≤ --shard 行，含 sha256）
// 源库以 readonly 打开，绝不写入。

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------- CLI 参数 ---------------- */
function parseArgs(argv) {
  const args = { db: path.join(ROOT, 'data', 'devmentor.db'), out: '', shard: 500 }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--db') args.db = path.resolve(argv[++i])
    else if (argv[i] === '--out') args.out = path.resolve(argv[++i])
    else if (argv[i] === '--shard') args.shard = Math.max(1, Number(argv[++i]) || 500)
  }
  if (!args.out) args.out = path.join(ROOT, 'data', `content-pack-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`)
  return args
}

/* ---------------- 内容表与导出顺序（FK 依赖序） ---------------- */
// JSON 列在导出时做 JSON.parse 校验并把解析后的值写入内容包，导入侧由 mysql2 自动序列化。
const TABLES = [
  { name: 'modules', pk: ['id'], jsonCols: [] },
  { name: 'chapters', pk: ['id'], jsonCols: [] },
  { name: 'sections', pk: ['id'], jsonCols: [] },
  { name: 'interview_questions', pk: ['id'], jsonCols: [] },
  { name: 'exam_sets', pk: ['id'], jsonCols: [] },
  { name: 'exam_choices', pk: ['id'], jsonCols: ['options'] },
  { name: 'exam_written', pk: ['id'], jsonCols: [] },
  { name: 'skill_section_map', pk: ['skill_key', 'section_id'], jsonCols: [] },
  { name: 'referrals', pk: ['id'], jsonCols: [] },
]

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!fs.existsSync(args.db)) {
    console.error(`[export] 源库不存在: ${args.db}`)
    process.exit(1)
  }
  fs.mkdirSync(args.out, { recursive: true })

  const db = new Database(args.db, { readonly: true, fileMustExist: true })
  const seedVersion = db.prepare('SELECT value FROM meta WHERE key = ?').get('seed_version')?.value ?? null

  const manifest = {
    generator: 'content-export.mjs',
    contentVersion: 1,
    exportedAt: Date.now(),
    sourceDb: path.basename(args.db),
    seedVersion,
    shardSize: args.shard,
    tables: {},
  }

  console.log(`[export] 源库: ${args.db} (seed_version=${seedVersion})`)
  console.log(`[export] 输出: ${args.out} (每片 ≤ ${args.shard} 行)`)

  for (const t of TABLES) {
    const orderBy = t.pk.map((c) => `"${c}"`).join(', ')
    const rows = db.prepare(`SELECT * FROM "${t.name}" ORDER BY ${orderBy}`).all()

    // JSON 列校验：非法 JSON 直接失败退出，避免导入 MySQL JSON 列时报错
    for (const r of rows) {
      for (const col of t.jsonCols) {
        if (r[col] == null) continue
        try {
          r[col] = JSON.parse(r[col])
        } catch (e) {
          console.error(`[export] ${t.name}.id=${r.id ?? '?'} 列 ${col} 不是合法 JSON: ${e.message}`)
          process.exit(1)
        }
      }
    }

    const shardFiles = []
    for (let i = 0, seq = 1; i < rows.length; i += args.shard, seq++) {
      const slice = rows.slice(i, i + args.shard)
      const file = `${t.name}.${String(seq).padStart(6, '0')}.json`
      const buf = Buffer.from(JSON.stringify({ tbl: t.name, shard: seq, rows: slice }), 'utf8')
      fs.writeFileSync(path.join(args.out, file), buf)
      shardFiles.push({ file, rows: slice.length, sha256: sha256(buf) })
    }
    manifest.tables[t.name] = { rows: rows.length, columns: rows[0] ? Object.keys(rows[0]) : [], shards: shardFiles }
    console.log(`[export] ${t.name.padEnd(20)} ${String(rows.length).padStart(6)} 行 -> ${shardFiles.length} 片`)
  }

  db.close()

  const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')
  fs.writeFileSync(path.join(args.out, 'manifest.json'), manifestBuf)
  const total = Object.values(manifest.tables).reduce((s, t) => s + t.rows, 0)
  const totalShards = Object.values(manifest.tables).reduce((s, t) => s + t.shards.length, 0)
  console.log(`[export] 完成：9 表共 ${total} 行 / ${totalShards} 片，manifest.json 已写入`)
  if (total === 0) {
    console.error('[export] 警告：导出行数为 0，请确认源库已 seed')
    process.exit(1)
  }
}

main()
