// 测试临时环境统一入口。
//
// 背景：测试若用 os.tmpdir() 建临时库，在 Windows 上会落到 C:\Users\<user>\AppData\Local\Temp。
// 由于库要灌种子（正式种子 43MB → 库 + WAL 约 110MB），且 better-sqlite3 句柄不关时
// Windows 不允许删除文件，rmSync 会因 EBUSY/EPERM 静默失败，导致 C 盘临时目录反复堆积。
//
// 这里统一解决三件事：
//   1）临时目录放到仓库内 node_modules/.test-tmp（随仓库清理，不占系统盘）；
//   2）需要极小数据集的测试用最短种子（tests/fixtures/seed-min.json），不再灌正式种子；
//   3）清理时先 close 掉 sqlite 句柄再删目录（Windows 必需），删不掉则交由 globalSetup 兜底。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// 项目内临时根目录（node_modules 已在 .gitignore 中）
export const TMP_ROOT = path.join(root, 'node_modules', '.test-tmp')

// 最小种子：只含 1 模块 / 1 章节 / 2 小节 / 2 面试题 / 1 套试卷
export const MIN_SEED_PATH = path.join(root, 'tests', 'fixtures', 'seed-min.json')

const createdDirs = []

// 在项目内建一个唯一临时目录（供需要裸文件的测试使用，如 better-sqlite3 直连）
export function makeTmpDir(prefix = 'ml-') {
  fs.mkdirSync(TMP_ROOT, { recursive: true })
  const dir = fs.mkdtempSync(path.join(TMP_ROOT, prefix))
  createdDirs.push(dir)
  return dir
}

// 为当前测试文件准备独立临时库，并把 process.env.DB_PATH 指向它。
// 必须在 import ../server/utils/db 之前调用（db.ts 在模块加载时读 DB_PATH）。
export function useTmpDb(name) {
  const dir = makeTmpDir(`ml-${name}-`)
  const dbPath = path.join(dir, 'test.db')
  process.env.DB_PATH = dbPath
  return { dir, dbPath }
}

// 让本次测试使用最小种子（不依赖真实课程内容的测试用它，避免临时库膨胀到 110MB）。
export function useMinSeed() {
  process.env.SEED_PATH = MIN_SEED_PATH
}

// 测试收尾：先关闭 sqlite 连接释放句柄，再删除本次创建的所有临时目录。
export async function cleanupTmp({ sqlite } = {}) {
  try { await sqlite?.close?.() } catch { /* 无 close 能力或已关闭 */ }
  for (const dir of createdDirs.splice(0)) {
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* 交由 globalSetup 兜底清理 */ }
  }
}
