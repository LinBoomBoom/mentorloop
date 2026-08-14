// CSP 中间件防护
// 历史 bug：server/middleware/security.ts 漏写 worker-src，DiceBear 浏览器端 fork blob: worker
// 被默认 script-src 兜底规则拦截，浏览器反复打 "Refused to create a worker from 'blob:...'" 警告。
// 防护：worker-src 'self' blob: 必须显式声明；ws: / wss: 必须放行（实时面试 ws + Caddy 反代）。
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('../server/middleware/security.ts', import.meta.url))
const src = readFileSync(file, 'utf8')

// 抽取 CSP 数组（[] 部分）
const cspArrayText = (() => {
  const m = src.match(/const CSP\s*=\s*\[([\s\S]*?)\]/)
  return m ? m[1] : ''
})()

function directives() {
  return cspArrayText.split(/,\s*/).map(s => s.replace(/['"`]/g, '').trim()).filter(Boolean)
}

describe('CSP middleware 防护', () => {
  it('CSP 数组必须存在', () => {
    expect(cspArrayText).toBeTruthy()
  })

  it("显式声明 worker-src 'self' blob:（DiceBear 头像引擎会 fork blob: worker）", () => {
    const ds = directives()
    const ws = ds.find(d => d.startsWith('worker-src'))
    expect(ws, '必须存在 worker-src 指令').toBeTruthy()
    expect(ws).toMatch(/\bself\b/)
    expect(ws, 'worker-src 必须允许 blob:（DiceBear fork 的 blob worker 不会被 CSP 拦）').toMatch(/blob:/)
  })

  it('connect-src 放行 ws: / wss:（实时面试 ws 需要）', () => {
    const ds = directives()
    const cs = ds.find(d => d.startsWith('connect-src'))
    expect(cs).toBeTruthy()
    expect(cs).toMatch(/\bself\b/)
    expect(cs).toMatch(/\bws:/)
    expect(cs).toMatch(/\bwss:/)
  })

  it('基础防嗅探 / 防劫持 头不能丢', () => {
    expect(src).toMatch(/X-Content-Type-Options.*nosniff|X-Content-Type-Options\',\s*'nosniff'/)
    expect(src).toMatch(/X-Frame-Options.*DENY|X-Frame-Options\',\s*'DENY'/)
    expect(src).toMatch(/Referrer-Policy/)
    expect(src).toMatch(/Permissions-Policy/)
  })
})
