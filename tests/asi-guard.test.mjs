// ASI 哨兵：防止「前一行以 }) 等结尾 + 下一行以 ( [ 开头」的自动分号插入陷阱再次上线。
// 真实事故：stats.get.ts 登录态 `const prog = {}` 换行后接 `(await ...)` → 运行时 {} 被当函数调用，
// 572 个测试全绿（登录态分支无覆盖）而云托管 500。打包产物保留该结构，源码级扫掉即可根治。
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(import.meta.dirname, '..')

function listTsFiles(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) listTsFiles(p, acc)
    else if (/\.(ts|mjs)$/.test(name)) acc.push(p)
  }
  return acc
}

describe('ASI 哨兵（换行后 ( [ 开头被续接为函数调用）', () => {
  it('server 源码不存在 `}` / `)` 结尾行 + 下条代码行 `(` / `[` 开头的组合', () => {
    const offenders = []
    for (const file of listTsFiles(path.join(ROOT, 'server'))) {
      const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/)
      let prev = '' // 上一个有效代码行（跳过空行与注释）
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i]
        const trimmed = raw.trim()
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
        // 模板字符串内的行（SQL 折行等）不做跨行判断：粗略以反引号奇偶计数跳过字符串体
        const bt = (raw.match(/`/g) || []).length
        // 只查 `(` 开头形态：真实事故形态（{} 之后换行接调用）。
        // `[` 开头不查——类成员 [Symbol.asyncIterator] 惯用法无法与数组索引续接静态区分，误报率高。
        const first = trimmed[0]
        const prevTail = prev.trim().slice(-1)
        if (prev && first === '(' && (prevTail === '}' || prevTail === ')')) {
          offenders.push(`${path.relative(ROOT, file)}:${i + 1} — 前行尾 "${prevTail}" + 本行首 "${first}"`)
        }
        prev = raw
        // 反引号成对出现时正常推进；不成对（跨行模板字符串）时冻结 prev 直到闭合
        if (bt % 2 === 1) {
          // 进入多行模板字符串：跳过直到闭合反引号
          i++
          while (i < lines.length && ((lines[i].match(/`/g) || []).length % 2 === 0 ? false : true) === false) {
            if ((lines[i].includes('`'))) break
            i++
          }
          prev = lines[i] || ''
        }
      }
    }
    expect(offenders, `发现 ASI 陷阱（行首补 ; 或重排）:\n${offenders.join('\n')}`).toEqual([])
  })
})
