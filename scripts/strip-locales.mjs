// electron-builder afterPack 钩子：裁剪 Electron 自带的多语言包，仅保留中英。
//
// 背景：Electron 运行时自带 55 个 locales/*.pak（约 41MB），本产品只用中/英。
// electron-builder 没有内置的 locales 白名单配置，标准做法就是在 afterPack 里删。
// 本脚本由 electron-builder 子进程加载执行（该进程已被 electron-build.mjs 清空
// NODE_OPTIONS，沙箱 safe-delete shim 不在场，fs.rmSync 可正常删）。
import fs from 'node:fs'
import path from 'node:path'

const KEEP = new Set(['zh-CN.pak', 'en-US.pak'])

export default async function afterPack(context) {
  // Windows / Linux：appOutDir/locales；macOS 的 locales 在 .app 内层，当前只发 Windows 暂不处理。
  const localesDir = path.join(context.appOutDir, 'locales')
  if (!fs.existsSync(localesDir)) return
  let removed = 0
  for (const f of fs.readdirSync(localesDir)) {
    if (f.endsWith('.pak') && !KEEP.has(f)) {
      fs.rmSync(path.join(localesDir, f), { force: true })
      removed++
    }
  }
  console.log(`[strip-locales] 保留 zh-CN/en-US，移除 ${removed} 个语言包（约省 39MB）`)
}
