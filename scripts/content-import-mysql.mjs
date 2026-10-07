// 知识库导入：content-export.mjs 产出的分片内容包 -> 云托管 Serverless MySQL（云端首启/重置用）
// 设计稿：docs/miniapp-cloud-backend-design.md §4 / §6.5（云端成为唯一内容源）
// 用法：
//   本地包：  node scripts/content-import-mysql.mjs data/content-pack-xxxx [--dry-run]
//   云存储：  node scripts/content-import-mysql.mjs https://<cos-or-tcb>/content-pack/ [--dry-run]
// 凭据仅从环境变量读取：MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE
// 幂等：ON DUPLICATE KEY UPDATE，可重复执行；结束后逐表 count 校验，不一致非零退出。

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------- 内容表：列清单与 DDL（deploy/cloud/baseline-mysql.sql）一一对应 ---------------- */
const TABLES = [
  { name: 'modules', pk: ['id'], jsonCols: [], columns: ['id', 'name', 'icon', 'color', 'desc', 'position'] },
  { name: 'chapters', pk: ['id'], jsonCols: [], columns: ['id', 'module_id', 'title', 'goal', 'position', 'subtrack'] },
  { name: 'sections', pk: ['id'], jsonCols: [], columns: ['id', 'chapter_id', 'title', 'objective', 'content', 'position', 'source_url', 'source_type', 'license', 'rewrite_level', 'status', 'reviewed_at', 'version'] },
  { name: 'interview_questions', pk: ['id'], jsonCols: [], columns: ['id', 'track', 'type', 'q', 'a', 'keywords', 'weight', 'difficulty', 'tech', 'section_id', 'subtrack', 'skill', 'source', 'subtrack_detail', 'source_type', 'license', 'rewrite_level', 'status', 'reviewed_at', 'version'] },
  { name: 'exam_sets', pk: ['id'], jsonCols: [], columns: ['id', 'name', 'track', 'level', 'duration', 'vip_only'] },
  { name: 'exam_choices', pk: ['id'], jsonCols: ['options'], columns: ['id', 'set_id', 'tag', 'q', 'options', 'answer', 'explain', 'multi', 'source'] },
  { name: 'exam_written', pk: ['id'], jsonCols: [], columns: ['id', 'set_id', 'q', 'points', 'reference', 'source'] },
  { name: 'skill_section_map', pk: ['skill_key', 'section_id'], jsonCols: [], columns: ['skill_key', 'section_id', 'score', 'track', 'subtrack_id', 'skill_name'] },
  { name: 'referrals', pk: ['id'], jsonCols: [], columns: ['id', 'company', 'title', 'track', 'city', 'level', 'type', 'requirement', 'intro', 'contact', 'created_at'] },
]

/* ---------------- 输入源（本地目录 或 HTTP 基址） ---------------- */
async function loadManifest(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(new URL('manifest.json', src.endsWith('/') ? src : src + '/'))
    if (!res.ok) throw new Error(`manifest.json 拉取失败 HTTP ${res.status}`)
    return { src, manifest: await res.json() }
  }
  const dir = path.resolve(src)
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  return { src: dir, manifest }
}

async function loadShard(src, file) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(new URL(file, src.endsWith('/') ? src : src + '/'))
    if (!res.ok) throw new Error(`分片 ${file} 拉取失败 HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  return fs.readFileSync(path.join(src, file))
}

/* ---------------- 校验 ---------------- */
function verifyPack(src, manifest) {
  let ok = true
  for (const [tbl, info] of Object.entries(manifest.tables)) {
    let rows = 0
    for (const s of info.shards) {
      const buf = loadShardSync(src, s.file)
      const hash = crypto.createHash('sha256').update(buf).digest('hex')
      if (hash !== s.sha256) {
        console.error(`[verify] ${tbl}/${s.file} sha256 不符（期望 ${s.sha256}，实际 ${hash}）`)
        ok = false
        continue
      }
      let shard
      try {
        shard = JSON.parse(buf.toString('utf8'))
      } catch (e) {
        console.error(`[verify] ${tbl}/${s.file} JSON 解析失败: ${e.message}`)
        ok = false
        continue
      }
      if (shard.tbl !== tbl || !Array.isArray(shard.rows)) {
        console.error(`[verify] ${tbl}/${s.file} 内容与表名不符`)
        ok = false
        continue
      }
      rows += shard.rows.length
    }
    if (rows !== info.rows) {
      console.error(`[verify] ${tbl} 行数不符：manifest=${info.rows} 实际=${rows}`)
      ok = false
    } else {
      console.log(`[verify] ${tbl.padEnd(20)} ${String(rows).padStart(6)} 行 / ${info.shards.length} 片 ✓`)
    }
  }
  return ok
}
// dry-run 同步读取（本地包场景）；HTTP 场景 dry-run 直接走异步 verify
function loadShardSync(src, file) {
  if (/^https?:\/\//.test(src)) throw new Error('HTTP 包请勿使用同步路径')
  return fs.readFileSync(path.join(src, file))
}

async function verifyPackAsync(src, manifest) {
  let ok = true
  for (const [tbl, info] of Object.entries(manifest.tables)) {
    let rows = 0
    for (const s of info.shards) {
      const buf = await loadShard(src, s.file)
      const hash = crypto.createHash('sha256').update(buf).digest('hex')
      if (hash !== s.sha256) {
        console.error(`[verify] ${tbl}/${s.file} sha256 不符`)
        ok = false
        continue
      }
      const shard = JSON.parse(buf.toString('utf8'))
      if (shard.tbl !== tbl || !Array.isArray(shard.rows)) { ok = false; continue }
      rows += shard.rows.length
    }
    if (rows !== info.rows) {
      console.error(`[verify] ${tbl} 行数不符：manifest=${info.rows} 实际=${rows}`)
      ok = false
    } else {
      console.log(`[verify] ${tbl.padEnd(20)} ${String(rows).padStart(6)} 行 / ${info.shards.length} 片 ✓`)
    }
  }
  return ok
}

/* ---------------- MySQL 写入 ---------------- */
function rowValues(t, row) {
  const vals = {}
  for (const c of t.columns) {
    let v = row[c]
    if (v === undefined) v = null
    if (t.jsonCols.includes(c) && v != null && typeof v !== 'string') v = JSON.stringify(v)
    vals[c] = v
  }
  return vals
}

function insertSql(t, n) {
  const cols = t.columns.map((c) => '`' + c + '`').join(', ')
  const placeholder = '(' + t.columns.map(() => '?').join(', ') + ')'
  const updates = t.columns.filter((c) => !t.pk.includes(c)).map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ')
  return `INSERT INTO \`${t.name}\` (${cols}) VALUES ${Array(n).fill(placeholder).join(', ')}` + (updates ? ` ON DUPLICATE KEY UPDATE ${updates}` : '')
}

async function importTable(conn, t, src, info) {
  let imported = 0
  for (const s of info.shards) {
    const buf = await loadShard(src, s.file)
    const hash = crypto.createHash('sha256').update(buf).digest('hex')
    if (hash !== s.sha256) throw new Error(`${t.name}/${s.file} sha256 校验失败，中止导入`)
    const shard = JSON.parse(buf.toString('utf8'))
    await conn.beginTransaction()
    try {
      for (let i = 0; i < shard.rows.length; i += 500) {
        const chunk = shard.rows.slice(i, i + 500).map((r) => rowValues(t, r))
        const sql = insertSql(t, chunk.length)
        await conn.query(sql, chunk.flatMap((v) => t.columns.map((c) => v[c])))
      }
      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw new Error(`${t.name} 第 ${s.file} 片写入失败: ${e.message}`)
    }
    imported += shard.rows.length
    process.stdout.write(`  [import] ${t.name} ${imported}/${info.rows}\r`)
  }
  process.stdout.write('\n')
  const [cnt] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t.name}\``)
  const dbCount = Number(cnt[0].c)
  if (dbCount !== info.rows) throw new Error(`${t.name} 行数校验失败：库内=${dbCount} manifest=${info.rows}`)
  console.log(`[import] ${t.name.padEnd(20)} ${String(dbCount).padStart(6)} 行 ✓`)
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const src = argv.find((a) => !a.startsWith('--'))
  if (!src) {
    console.error('用法: node scripts/content-import-mysql.mjs <packDir|https://...> [--dry-run]')
    process.exit(1)
  }
  const { src: base, manifest } = await loadManifest(src)
  console.log(`[import] 内容包: ${base} (contentVersion=${manifest.contentVersion}, seedVersion=${manifest.seedVersion})`)

  // 用 manifest 校验列清单（与 DDL 对齐；manifest 缺列说明导出/建库版本不匹配）
  const missing = []
  for (const t of TABLES) {
    const mc = manifest.tables[t.name]?.columns
    if (!mc) missing.push(`${t.name}: manifest 缺表`)
    else missing.push(...t.columns.filter((c) => !mc.includes(c)).map((c) => `${t.name}.${c}`))
  }
  if (missing.length) {
    console.error(`[import] 列清单不匹配（请核对导出包与 baseline-mysql.sql 版本）: ${missing.join(', ')}`)
    process.exit(1)
  }

  if (dryRun) {
    const ok = /^https?:\/\//.test(src) ? await verifyPackAsync(base, manifest) : verifyPack(base, manifest)
    console.log(ok ? '[dry-run] 校验通过，未连接数据库' : '[dry-run] 校验失败')
    process.exit(ok ? 0 : 1)
  }

  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env
  if (!MYSQL_USER || !MYSQL_DATABASE || !MYSQL_PASSWORD) {
    console.error('[import] 缺少环境变量 MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE（凭据不落盘）')
    process.exit(1)
  }
  let mysql
  try {
    mysql = (await import('mysql2/promise')).default
  } catch {
    console.error('[import] 未安装 mysql2：请先 npm i -D mysql2')
    process.exit(1)
  }
  const conn = await mysql.createConnection({
    host: MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    charset: 'utf8mb4',
    multipleStatements: false,
  })
  await conn.ping()
  console.log(`[import] 已连接 MySQL ${MYSQL_HOST || '127.0.0.1'}/${MYSQL_DATABASE}`)

  const started = Date.now()
  for (const t of TABLES) {
    await importTable(conn, t, base, manifest.tables[t.name])
  }

  // meta：内容版本锚点（云端从此为内容权威）
  await conn.query(
    'INSERT INTO `meta` (`key`, `value`) VALUES (?, ?), (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    ['content_version', String(manifest.contentVersion), 'seed_version', String(manifest.seedVersion ?? '')]
  )
  await conn.end()

  const secs = ((Date.now() - started) / 1000).toFixed(1)
  const total = Object.values(manifest.tables).reduce((s, t) => s + t.rows, 0)
  console.log(`[import] 完成：9 表 ${total} 行，meta.content_version=${manifest.contentVersion}，用时 ${secs}s`)
}

// 仅在直接执行（CLI）时运行主流程；被 import 时不执行，供单测复用纯函数
export { TABLES, insertSql, rowValues, loadManifest, loadShard, verifyPack, verifyPackAsync }

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(`[import] 失败: ${e.message}`)
    process.exit(1)
  })
}
