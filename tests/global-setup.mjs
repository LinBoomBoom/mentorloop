// vitest 全局前置/收尾：清理测试遗留的临时库。
//
// 为什么需要：测试进程若被中断（Ctrl-C、崩溃），afterAll 的清理不会执行，临时库会残留在磁盘上。
// 这里在每轮测试开始前（以及结束后）统一清掉：
//   1）项目内临时目录 node_modules/.test-tmp；
//   2）历史遗留：早期测试直接写在系统 tmp（Windows 即 C:\Users\<user>\AppData\Local\Temp）的库，
//      匹配本仓库测试用过的固定前缀，避免误删他人文件。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TMP_ROOT = path.join(root, 'node_modules', '.test-tmp')

// 本仓库测试历史用过的临时命名前缀（精确匹配，避免误删系统 tmp 里无关文件）
const LEGACY_PREFIXES = [
  'ml-admin-', 'ml-admin-route-', 'ml-mig-', 'ml-sm-', 'ml-fk-', 'ml-split-',
  'ml-mastery-test-', 'ml-seed-', 'ml_m3_', 'ml-bak-',
  'm5test-', 'ivbank-', 'mentorloop-'
]

function rm(target) {
  try { fs.rmSync(target, { recursive: true, force: true }) } catch { /* 仍被占用则留给下一轮 */ }
}

function cleanLegacySystemTmp() {
  let entries = []
  try { entries = fs.readdirSync(os.tmpdir()) } catch { return }
  for (const name of entries) {
    if (LEGACY_PREFIXES.some((p) => name.startsWith(p))) rm(path.join(os.tmpdir(), name))
  }
}

function cleanAll() {
  rm(TMP_ROOT)
  cleanLegacySystemTmp()
}

export function setup() {
  cleanAll()
}

export function teardown() {
  cleanAll()
}
