import { test, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const root = path.resolve(__dirname, '..')
const seedSrc = path.join(root, 'data', 'seed-content.json')

function hash(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
}
function copySeed() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-seed-'))
  const dst = path.join(dir, 'seed-content.json')
  fs.copyFileSync(seedSrc, dst)
  return dst
}
function cleanup(seedPath) {
  try {
    fs.rmSync(path.dirname(seedPath), { recursive: true, force: true })
  } catch {
    /* 临时目录在系统 tmp，清理失败不影响仓库 */
  }
}
function runOn(seedPath, script) {
  return spawnSync('node', [script, '--seed', seedPath], { cwd: root, encoding: 'utf-8' })
}

test('enhance_opc5_devsecops.mjs 幂等：注入一次后重复跑不再改动', () => {
  const seedPath = copySeed()
  // 模拟「注入前」状态：从临时副本移除目标小节
  const s = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
  const ch = s.modules.find((m) => m.id === 'devops').chapters.find((c) => c.id === 'op-c5')
  ch.sections = ch.sections.filter((x) => x.id !== 'op-c5-s10')
  fs.writeFileSync(seedPath, JSON.stringify(s, null, 2))
  const before = hash(seedPath)

  const r1 = runOn(seedPath, 'scripts/enhance_opc5_devsecops.mjs')
  expect(r1.status).toBe(0)
  const afterFirst = hash(seedPath)
  expect(afterFirst).not.toBe(before) // 首次确实写入了 DevSecOps 小节

  const r2 = runOn(seedPath, 'scripts/enhance_opc5_devsecops.mjs')
  expect(r2.status).toBe(0)
  const afterSecond = hash(seedPath)
  expect(afterSecond).toBe(afterFirst) // 第二次为 no-op

  cleanup(seedPath)
})

test('bridge_opc8.mjs 幂等：补链一次后重复跑不再改动', () => {
  const seedPath = copySeed()
  // 模拟「补链前」状态：从三个目标小节移除 op-c8 互链
  const s = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
  const targets = new Set(['op-c4-s1', 'op-c5-s1', 'op-c7-s1'])
  for (const m of s.modules) {
    for (const c of m.chapters) {
      for (const sec of c.sections) {
        if (!targets.has(sec.id)) continue
        sec.content = sec.content
          .split('\n')
          .filter((line) => !/op-c8-s/.test(line))
          .join('\n')
          .replace(/op-c8-s\d/g, '')
      }
    }
  }
  fs.writeFileSync(seedPath, JSON.stringify(s, null, 2))
  const before = hash(seedPath)

  const r1 = runOn(seedPath, 'scripts/bridge_opc8.mjs')
  expect(r1.status).toBe(0)
  const afterFirst = hash(seedPath)
  expect(afterFirst).not.toBe(before) // 首次确实补回了互链

  const r2 = runOn(seedPath, 'scripts/bridge_opc8.mjs')
  expect(r2.status).toBe(0)
  const afterSecond = hash(seedPath)
  expect(afterSecond).toBe(afterFirst) // 第二次为 no-op

  cleanup(seedPath)
})

test('enrich_depth_89.mjs 幂等：深度块写入一次后重复跑不再改动', () => {
  const seedPath = copySeed()
  // 模拟「增强前」状态：从 9 个目标小节移除 ### 演进脉络 / ### 结构图示 块
  const targets = new Set([
    'ai-c1-s1', 'ai-c1-s2', 'ai-c1-s4',
    'be-dist-s1', 'be-dist-s4', 'be-dist-s9',
    'op-c8-s1', 'op-c8-s3', 'op-c8-s5',
  ])
  const stripDepth = (content) =>
    content
      .replace(/### 演进脉络[\s\S]*?(?=\n## |\n### |$)/g, '')
      .replace(/### 结构图示[\s\S]*?(?=\n## |\n### |$)/g, '')
      .replace(/\n{3,}/g, '\n\n')
  const s = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
  for (const m of s.modules) {
    for (const c of m.chapters) {
      for (const sec of c.sections) {
        if (targets.has(sec.id)) sec.content = stripDepth(sec.content)
      }
    }
  }
  fs.writeFileSync(seedPath, JSON.stringify(s, null, 2))
  const before = hash(seedPath)

  const r1 = runOn(seedPath, 'scripts/enrich_depth_89.mjs')
  expect(r1.status).toBe(0)
  const afterFirst = hash(seedPath)
  expect(afterFirst).not.toBe(before) // 首次确实写入了深度块

  const r2 = runOn(seedPath, 'scripts/enrich_depth_89.mjs')
  expect(r2.status).toBe(0)
  const afterSecond = hash(seedPath)
  expect(afterSecond).toBe(afterFirst) // 第二次为 no-op

  cleanup(seedPath)
})
