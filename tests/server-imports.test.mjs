import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import esbuild from 'esbuild'

// 回归闸门：扫描 server/ 下全部 .ts 源文件，校验其中「相对 import」是否真实可解析。
// 背景：管理后台 catch-all 路由曾误用 ../utils/db（文件在 server/api/admin/ 下应为 ../../utils/db），
// 该错误在 vitest（直接 import adminDispatch，不碰路由文件）与 esbuild transform（只解析不解析依赖）下均无法暴露，
// 直到 Nuxt 构建期才报 "Could not resolve"。本测试用两层校验 100% 复现此类错误：
//   1) 文件系统层：相对 import 指向的文件是否存在；
//   2) 真实打包层：用 esbuild bundle 实际解析整条 import 图（与 Nitro/Vite 解析逻辑一致），
//      任何断链都会让 bundle 失败。后者是本环境无法跑完整 `nuxt build`（被安全删除护栏/杀软拦截）时的等效替代。

const ROOT = path.resolve(__dirname, '..')
const SERVER_DIR = path.join(ROOT, 'server')

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) acc.push(p)
  }
  return acc
}

// 解析相对 import 是否真实存在（支持 .ts/.js/.mjs/.d.ts 与目录 index）
function resolves(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec)
  const candidates = [
    base, base + '.ts', base + '.js', base + '.mjs', base + '.d.ts',
    path.join(base, 'index.ts'), path.join(base, 'index.js'), path.join(base, 'index.mjs')
  ]
  return candidates.some((c) => { try { return fs.existsSync(c) } catch { return false } })
}

// 匹配 import ... from '...' / export ... from '...' / import('...')
const RE = /(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

describe('server 相对 import 全部可解析（防路径回归）', () => {
  const files = walk(SERVER_DIR)
  it(`扫描到 ${files.length} 个 server 源文件`, () => {
    expect(files.length).toBeGreaterThan(0)
  })
  for (const f of files) {
    it(`解析 ${path.relative(ROOT, f)} 的相对 import`, () => {
      const src = fs.readFileSync(f, 'utf8')
      const bad = []
      let m
      while ((m = RE.exec(src))) {
        const spec = m[1] || m[2]
        if (!spec) continue
        if (spec.startsWith('.')) {
          if (!resolves(f, spec)) bad.push(spec)
        }
      }
      expect(bad, `${path.relative(ROOT, f)} 存在无法解析的相对 import: ${bad.join(', ')}`).toEqual([])
    })
  }
})

describe('server 源文件 esbuild 打包可解析整条 import 图（等效 Nitro 解析）', () => {
  const files = walk(SERVER_DIR)
  for (const f of files) {
    it(`bundle ${path.relative(ROOT, f)} 无断链`, async () => {
      let errMsg = ''
      try {
        await esbuild.build({
          entryPoints: [f],
          bundle: true,
          platform: 'node',
          format: 'esm',
          write: false,
          packages: 'external', // 仅解析相对 import；裸包（h3/better-sqlite3 等）视为外部，不触发网络
          logLevel: 'silent'
        })
      } catch (e) {
        errMsg = (e.errors ? e.errors.map((x) => x.text).join('; ') : e.message) || 'unknown'
      }
      expect(errMsg, `${path.relative(ROOT, f)} esbuild 解析失败: ${errMsg}`).toBe('')
    })
  }
})

