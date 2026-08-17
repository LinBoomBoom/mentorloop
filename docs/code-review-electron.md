# Electron 桌面端集成 — 代码审查报告

审查日期：2026-08-17
审查范围：Electron 集成的全部新增/修改文件（首期 + 后续可选：托盘、菜单、asar、图标）

| 文件 | 角色 | 结论 |
|------|------|------|
| `electron/main.mjs` | 主进程：窗口/托盘/菜单/服务子进程/能力桥 | 良好，1 项安全建议（P1） |
| `electron/preload.mjs` | 能力桥（contextBridge） | 良好 |
| `electron-builder.yml` | 打包配置 | 1 项无效配置（P2） |
| `server/utils/paths.ts` | DATA_DIR 统一解析 | 良好 |
| `server/utils/db.ts` `logger.ts` `speech.ts` | 数据路径切 DATA_DIR | 良好，无残留 |
| `app/composables/useIsDesktop.ts` | 前端桌面检测 | 可用，1 项 hydration 注意（P2） |
| `app/types/electron.d.ts` | 全局类型声明 | 可用，类型偏宽（P3） |
| `scripts/electron-dev.mjs` | 一键开发编排 | 良好（已修 EINVAL） |
| `scripts/make-icon.mjs` | 纯 Node 图标生成 | 良好 |

---

## 总体结论

架构选择稳健：**系统 Node 子进程拉起 Nitro** 避开了 better-sqlite3 的 Electron ABI 重建，是本项目当前环境下最优解。路径切换彻底（`DATA_DIR` 默认回退 `process.cwd()`，Web 行为完全不变），preload 桥的 `contextIsolation/sandbox` 配置符合 Electron 安全基线。

**无阻断级（P0）缺陷。** 建议落地 1 项安全增强（P1-1）与 1 项配置清理（P2-1）。

---

## 发现清单

### P0（阻断 / 必须修）
无。

> 备注：初查曾担心 `electron-builder.yml` 的 `files` 未含 `node_modules` 会导致打包后子进程缺依赖。经验证 `.output/server/node_modules` 已内联 `better-sqlite3` 等全部运行时依赖（Nitro 把 external 依赖打包进 `.output`），`files` 中的 `.output` 已覆盖，故此担忧不成立。

### P1（重要 / 建议修）

**P1-1 `shell.openExternal` 未做协议白名单** — `electron/main.mjs:222`
```js
ipcMain.handle('mentorLoop:openExternal', (_e, url) => { shell.openExternal(url) })
```
Electron 官方安全基线要求：`shell.openExternal` 前必须校验 URL，避免 `file://` 等协议被用来打开本地文件或触发非预期行为。当前 `preload` 暴露的 `openExternal` 会原样转发前端传入的任意 URL。
建议：
```js
ipcMain.handle('mentorLoop:openExternal', (_e, url) => {
  const u = String(url || '')
  if (!/^https?:\/\//i.test(u)) return  // 仅放行 http/https
  shell.openExternal(u)
})
```
风险等级：低（URL 来自应用自身逻辑），但属于桌面端安全规范必做项。

### P2（建议 / 可延后）

**P2-1 `asarUnpack` 含无效条目 `node_modules/**`** — `electron-builder.yml:18-22`
```yaml
asarUnpack:
  - .output/**
  - node_modules/**      # 无效：files 未列根 node_modules，匹配不到任何东西
  - "**/*.node"
  - data/**
```
`files` 字段只列了 `electron` / `.output` / `data/seed-content.json` / `package.json`，**根 `node_modules` 根本没进包**，因此 `node_modules/**` 是死配置，只会误导后续维护者以为"保护了根 node_modules"。真实运行时依赖在 `.output/server/node_modules`，已被 `.output/**` 覆盖解包。
建议：删除 `node_modules/**` 这一行（如要显式保留 native 模块解包，`**/*.node` 已足够）。

**P2-2 `useIsDesktop` 的 SSR/hydration 边界** — `app/composables/useIsDesktop.ts:5-7`
```js
const isDesktop = computed(() => typeof window !== 'undefined' && !!window.mentorLoop)
```
SSR 阶段返回 `false`，客户端返回 `true`。当前仅用于 `openExternal()` 逻辑分支（无 DOM 差异），不会引发 hydration mismatch。但若将来用此 computed 做条件渲染（桌面专属 UI），会产生 SSR 不一致警告。
建议：若用于渲染，用 `process.client` 包裹或在 `onMounted` 后判定。当前用法安全，列为规范提醒。

### P3（可选 / 打磨）

- **P3-1 类型偏宽** — `electron.d.ts:6-7` 的 `showOpenDialog(opts: any)` / `getPath(name: string)` 用 `any`。可改为 `Electron.OpenDialogOptions` / 收窄 name 为 `Electron.PathName`，消除 `any`。
- **P3-2 ICNS 仅 `ic12`** — `make-icon.mjs` 只写 1024 PNG（ic12），macOS 10.7+ 完全可用；极老系统缺 `is32` 兜底，非阻塞。
- **P3-3 NSIS 缺签名/artifactName** — `win.nsis` 未配 `artifactName` 与代码签名；签名需证书（已知前置条件），不在本次范围。
- **P3-4 dev 超时** — `main.mjs:134` 的 `waitForServer(DEV_URL)` 默认 30s，慢机 `nuxt dev` 首启可能超时弹错。可考虑延长至 60s 或轮询 Nuxt 就绪信号。

---

## 验证记录（沙箱内可执行的）
- `electron/main.mjs` `preload.mjs` `electron-dev.mjs` `make-icon.mjs` 均 `node --check` 通过。
- `package.json` JSON 合法，scripts/devDeps 齐全（`electron` `electron-builder` 已列）。
- `npm run make:icon` 实跑生成 `build/icon.{png,ico,icns}` 成功。
- 路径复核：`db.ts` 4 处 seed 走 `SEED_PATH`、`speech.ts` 的 TTS/PIPER 路径走 `DATA_DIR`，无 `process.cwd()/data/` 残留。

## 无法在沙箱验证的项（需你本机）
- `npm i` 拉取 `electron` 二进制（需外网 GitHub）。
- `npm run electron:dev` / `npm run electron:build` 真机运行（Windows NSIS + macOS DMG）。
- 托盘/菜单在真实桌面的交互表现。
