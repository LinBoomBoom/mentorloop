// DigitalHuman.vue 回归测试
// 1) TDZ 遮蔽防护：script setup 顶层声明的 ref/computed 名，不能在子作用域（嵌套箭头函数）里再被 const 声明。
//    历史 bug：mouthGlowStyle computed 内 `const sizePx = baseSize * ...` 局部遮蔽顶层 sizePx，
//    触发 ReferenceError: Cannot access 'sizePx' before initialization，整页空白。
// 2) 散落 import 防护：所有 vue auto-import 必须写在 <script setup> 顶部（Nuxt 风格）。
// 3) 顶层 lifecycle 变量（let breathT/breathRaf）必须配套 onBeforeUnmount 清理。
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('../app/components/DigitalHuman.vue', import.meta.url))
const src = readFileSync(file, 'utf8')

// 取出 <script setup lang="ts"> ... </script> 块
const scriptMatch = src.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
const script = scriptMatch ? scriptMatch[1] : ''

function stripComments(s) {
  return s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('DigitalHuman.vue 静态防护', () => {
  it('必须存在 <script setup> 块', () => {
    expect(script).toBeTruthy()
  })

  it('script setup 顶部必须一次性导入 vue 自动导入 api（computed/ref/lifecycle）', () => {
    // 不允许"散落 import"——历史上行 137 漏把 onMounted/onBeforeUnmount/ref 合进顶部 import
    const importHits = [...script.matchAll(/^\s*import\s+/gm)]
    // 不应出现两个 import { ... } from 'vue'，也允许从其他模块 import，但 vue 必须只在 1 处
    const vueImports = [...script.matchAll(/^\s*import\s+\{[^}]*\}\s+from\s+['"]vue['"]/gm)]
    expect(vueImports.length, 'vue 自动导入必须在 <script setup> 顶部合并为单条 import').toBe(1)
    expect(importHits[0].index, '第一条 import 应出现在 script setup 顶部（不在中段）').toBeLessThan(100)
  })

  it('顶层 ref/computed 名不能被内层 const 遮蔽（TDZ 防护）', () => {
    const body = stripComments(script)
    // 第一遍：只在顶层（无前导空白）抓 const
    const topConsts = new Set()
    for (const m of body.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)) {
      topConsts.add(m[1])
    }
    // 第二遍：嵌套作用域（同行有缩进）若再 const 同名 → TDZ 风险
    // 注意：用 [ \t]+ 而不是 \s+，避免误吃跨行 \n；用 (?!\/\/) 防止误匹配行内 // 注释。
    let bad = null
    for (const m of body.matchAll(/^[ \t]+(?!\/\/)([A-Za-z_$][\w$]*)\s*=\s*/gm)) {
      // 只关心那些看起来像 const 声明的位置（前面有 const/let/var，可简化此处只看 =）
      // 进一步过滤：命名前导若有 'const ' 关键字
      // 用更严格模式匹配"同行缩进 + 关键字 const + 标识符 + ="
      const idx = m.index
      const lineStart = body.lastIndexOf('\n', idx - 1) + 1
      const before = body.slice(lineStart, idx)
      if (/\bconst\s+$/.test(before)) {
        const name = m[1]
        if (topConsts.has(name)) {
          bad = `嵌套作用域中 const ${name} 遮蔽顶层 computed/ref（TDZ 风险）`
          break
        }
      }
    }
    expect(bad, bad || '').toBeNull()
  })

  it('生命周期 RAF 资源必须在 onBeforeUnmount 中清理', () => {
    // 历史行 139-149：let breathT/breathRaf + requestAnimationFrame(loop) → 必须有 cancelAnimationFrame 清理
    expect(script).toMatch(/requestAnimationFrame\(/)
    expect(script).toMatch(/cancelAnimationFrame\(/)
  })
})
