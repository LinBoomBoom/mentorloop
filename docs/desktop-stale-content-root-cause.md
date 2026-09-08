# 桌面端「覆盖安装后仍是旧内容」根因报告

日期：2026-09-08
**状态：已用 1.0.4 验证根治**

结论：**不是数据库问题，也不是安装卸载问题**，是两个构建期/启动期的隐蔽陷阱叠加：

- **坑 A**：Nuxt 预渲染（prerender）把构建机的数据库快照冻结进安装包
- **坑 B**：`.env` 里的 `DB_PATH` 覆盖了 Electron 注入的 `DATA_DIR`，server 读了错误的空库

---

## 一、现象

- Web 端学习中心：152 / 117 / 78 / 62 = 409 章
- 桌面端学习中心：70 / 16 / 8 / 7 = 101 章
- 覆盖安装、卸载重装、杀进程、关 3000 端口，结果全部一样

## 二、已排除的假设

| 假设 | 证据 | 结论 |
|---|---|---|
| 桌面端读的是内置旧库 | `E:\MentorLoop\resources\data\` 只有 `seed-content.json`，**无任何 .db** | 排除 |
| userData 库数据不对 | 三个副本（web / `mentorloop` / `MentorLoop`）实测均为 409 章 152-117-78-62 | 排除 |
| 应用连到了 localhost:3000 旧 dev server | `netstat` 全端口（3000/3210/8080/5173）无 LISTENING | 排除 |
| NSIS 安装没覆盖文件 | `E:\MentorLoop\resources\` 时间戳随构建更新 | 排除 |

## 三、坑 A：预渲染冻结构建期快照（第一轮定位）

`nuxt.config.ts` 曾对关键路由配置 `prerender: true`：

```ts
'/':          { ssr: true, prerender: true },
'/learn':     { ssr: true, prerender: true },
'/interview': { ssr: true, prerender: true },
...
```

`app/pages/learn/index.vue:62` 通过 `await useFetch('/api/modules')` 取数。链条：

1. `nuxt build` 阶段，Nitro **预渲染** `/learn` → 在**构建机上**真实执行一次 SSR
2. 此时未设置 `DATA_DIR`，`paths.ts` 回退 `process.cwd()/data/devmentor.db`，读到**构建机那一刻**的库
3. `/api/modules` 的返回值被序列化冻结进 `.output/public/learn/_payload.json`
4. 该文件随 `extraResources` 原样打进安装包
5. 运行时 Nitro **直接静态返回**这份 `_payload.json`，既不执行 SSR，也不查 userData 的库

**铁证** —— 1.0.1 安装包内快照：

```
E:\MentorLoop\resources\.output\public\learn\_payload.json
"frontend","前端开发","code","#6366f1", ... ,70,298, ...
                                          ↑ chapterCount = 70
```

与用户截图的 **70 / 16 / 8 / 7** 完全一致。

### 附带发现

- 本地 `.output` 曾停留在 8 月 17 日，比安装包内产物还旧 —— `electron-build-all.mjs` 从不清理 `.output`，陈旧预渲染产物会被原样打进包。
- `electron/main.mjs` 健康探针打的是 `/_payload.json`，关掉预渲染后该文件不再生成，探针会永远失败。

## 四、坑 B：`.env` 的 DB_PATH 覆盖 DATA_DIR（第二轮定位，真凶）

修完坑 A 后 1.0.2 **依然**显示 70/16/8/7。重新实测 server：

```bash
# 模拟 electron 注入：设 DATA_DIR=userData，cwd=resources
$ curl /api/modules  →  {"modules":[]}        ← 空！
$ curl /api/health   →  {"ok":true,"db":"up"} ← DB 明明连着
```

userData 库里有 4 个模块 152/117/78/62，server 却返回空 —— **它根本没读 userData 库**。

原因：仓库根 `.env` 第 5 行

```
DB_PATH=data/devmentor.db
```

`server/utils/paths.ts` 原逻辑：

```ts
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'data', 'devmentor.db')
```

Nitro 启动时 dotenv 会**从 cwd 向上找 `.env`** 并注入 `process.env`。electron node 子进程的
`cwd = resourcesPath`（`E:\MentorLoop\resources`），于是：

- `process.env.DB_PATH = 'data/devmentor.db'`（相对路径，**优先级高于 DATA_DIR**）
- server 实际打开 `E:\MentorLoop\resources\data\devmentor.db`
- 该文件是旧版本用 70 章种子 seed 出来的遗留库，**完全绕开 userData 那份 409 章的库**

## 五、修复（commit `097daaa`，4 文件）

| 文件 | 改动 |
|---|---|
| `server/utils/paths.ts` | `DATA_DIR` 显式设置时**强制从它派生** DB_PATH，无视 env DB_PATH；DATA_DIR 未设（web dev）才回退到 env 兜底 |
| `electron/main.mjs` | 显式注入 `DB_PATH` 绝对路径（双保险）；`isDev` 收敛为仅 `ELECTRON_DEV==='1'`；健康探针改 `/api/health` |
| `nuxt.config.ts` | 新增 `DESKTOP_BUILD`（`MENTORLOOP_DESKTOP_BUILD=1`）开关，桌面端 `routeRules` 退化为 `'/**': { ssr: true }`；Web 端保持 prerender（SEO 无损） |
| `scripts/electron-build-all.mjs` | 注入 `MENTORLOOP_DESKTOP_BUILD=1`；新增 `retireOldOutput()` 构建前 rename `.output` → `.output_old_<ts>` |

数据库侧的 `refreshContentIfNeeded()`（比对 `meta.seed_version` 后 upsert）本来就是通的，
只是 server 从没读对库，所以一直没生效。

## 六、验证（1.0.4，2026-09-08 23:44）

| 检查项 | 结果 |
|---|---|
| `package.json` / 种子 / 包内 seedVersion | 均为 **1.0.4** |
| `.output/public/` 内容 | 仅 `_nuxt` + `og-cover.png`，**无任何 `_payload.json` / `*.html`** |
| userData 库 | 409 章 / 152-117-78-62 |
| userData 库 `seed_version` | **1.0.4**（随安装包版本前进） |

**判定铁证**：userData 库的 `seed_version` 会随安装包版本前进 = server 确实在读写 userData 库，
而非那个陈旧的 `resources/data/devmentor.db`。桌面端页面已显示正确的 152/117/78/62。

## 七、以后不再犯：防线清单

1. 桌面端构建后，检查 `.output/public/` **不应**出现 `_payload.json` 或任何 `*.html`（出现即 prerender 未关）。
2. 启动 server 实测 `/api/modules`，返回值必须与 userData 库一致（不能是 `{"modules":[]}`）。
3. **往 `.env` 加任何环境变量前先想**：它会被 Nitro 从 cwd 向上加载，可能覆盖 Electron 注入的
   `DATA_DIR` / `DB_PATH`。桌面端专属路径一律走 `DATA_DIR` 派生，不要走 `.env`。
4. `main.mjs` spawn 子进程的关键 env（`DATA_DIR` / `DB_PATH`）用**绝对路径**显式注入。
5. 排查口诀：**DB 对但页面旧 = ①看 `.output/public/_payload.json` 是否冻结 ②实测 server `/api/modules` 返回值**。
