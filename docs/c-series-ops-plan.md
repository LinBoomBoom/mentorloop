# C 系列运维 / 部署 — 技术方案 + 工作流

> 生成日期：2026-08-16 ｜ 整理：WorkBuddy
> 数据来源：读码核对 `Dockerfile` / `ecosystem.config.cjs` / `Caddyfile` / `.env.example` / `ci.yml` / `logger.ts` / `healthz.get.ts` / `error-log.ts` / `sitemap.ts` / `db.ts`

## 0. 现状核对（读码结论，非凭旧清单）

| 项 | 现状 | 证据 | 结论 |
|---|---|---|---|
| **C1** `.env` 体系 | 已落地 | `.env.example` 完整 schema；`sitemap.ts:5` / `robots.txt.ts:4` / `payment.ts:54` 均读 `process.env.SITE_URL` | 代码完成；仅 `.env.example` 漏记 `LOG_DIR` / `LOG_LEVEL` 两个变量 |
| **C2** 健康检查接口 | 已落地 | `server/routes/healthz.get.ts` 返回 `status/db/uptime/memory`；`session-touch.ts` 已对 `/healthz` 放行 | 完成 |
| **C3** Docker / PM2 / systemd | 部分 | `Dockerfile` ✓ `ecosystem.config.cjs` ✓ `Caddyfile` ✓；但 `.dockerignore` **漏 `data/`**、**无 systemd 单元**、Node 版本（Docker/CI 用 20，本地托管用 22）不一致 | 收口真实缺口 |
| **C4** CI 跑 build | 已落地 | `.github/workflows/ci.yml` 已 `npm ci && npm test && npm run build`（清单"被注释"为旧结论失效） | 完成 |
| **C5** 日志 / 错误上报 | 已落地 | `logger.ts`（JSON 结构化 + 文件落地 + 分级）；`plugins/error-log.ts`（全局 error hook） | 完成 |
| **C6** 监控 / 告警 | 缺口 | 仅 `healthz` 探活，无组件级状态、无告警 / 外部监控接线 | 真实待做 |

**核心结论**：C1 / C2 / C4 / C5 此前已在 git 提交中落地；本轮真正要交付的是 **C3 收口 + C6 监控告警**，并同步修正 `remaining-tasks.md` 的 stale 标记。

---

## 1. 推荐方案

### C3 收口
1. **`.dockerignore` 补 `data/` + `*.vrm`**：当前仅忽略 `data/*.db`，`COPY . .` 仍会把本地 `data/media`、`data/piper`、`data/backups`、`data/logs` 打进镜像；而 `Dockerfile` 已声明 `VOLUME ["/app/data"]`（运行时用持久卷），baked-in data 无意义。补后镜像更干净、避免误带 dev 库。
2. **新增 `deploy/mentorloop.service`（systemd 单元）**：单实例以 `node .output/server/index.mjs` 直接托管（最透明，不依赖 PM2 守护），`EnvironmentFile=` 注入 `.env`，`Restart=always`。附带启用说明（拷贝到 `/etc/systemd/system` + `systemctl daemon-reload && enable --now`）。PM2 配置保留作备选。
3. **Dockerfile / CI Node 版本对齐**：本地托管运行时为 Node 22，建议 Docker 与 CI 统一 `node:22-slim`，避免 `better-sqlite3` 原生模块 ABI 跨版本差异（Docker build 用 20、运行用 20 虽自洽，但与本地 dev 22 不一致，升级时易踩坑）。—— 见决策点①。
4. **Caddyfile 域名**：仍为占位 `mentorloop.example.com`，部署前替换为真实域名（运行时配置，非代码改动），文档注明。

### C6 监控 / 告警
1. **增强 `healthz.get.ts`**：返回组件级状态 `{ db, tts, diskFreePct, memory }`，整体 `status: 'ok' | 'degraded'`；`db==='down'` 或 `diskFreePct<10%` 标 `degraded`（仍返回 200，便于监控区分"活但异常"）。`tts` 取 `process.env.TTS_PROVIDER` / `DASHSCOPE_API_KEY` 是否就绪。
2. **新增 `scripts/monitor-cron.mjs`**：定时 `curl /healthz`（URL 取 `HEALTH_URL` 或 `${SITE_URL}/healthz`）；`db==='down'` 或 `status!=='ok'` → 写 error 日志 + 可选 `ALERT_WEBHOOK_URL`（钉钉 / Slack / Telegram 通用 webhook）推送。文档给 `crontab` 接入示例（`*/5 * * * * node /app/scripts/monitor-cron.mjs`）。
3. **新增 `docs/ops/monitoring.md`**：外部 UptimeRobot / Pingdom 对接 `/healthz` + 自带 cron 监控两种方案。

---

## 2. 工作流拆解（分阶段、可逐步审查）

| 阶段 | 步骤 | 产出（可验证） | 依赖 | 是否可单测 |
|---|---|---|---|---|
| **W0** | `remaining-tasks.md` 把 C1/C2/C4/C5 标 `[x]`（证据见 §0），C3/C6 保持 `[ ]` 至交付后勾 | 文档同步 | — | — |
| **W1** C3 收口 | W1.1 `.dockerignore` 加 `data/`、`*.vrm` | 镜像不再含本地 data | — | 否（构建验证） |
| | W1.2 新增 `deploy/mentorloop.service` + 启用说明 | systemd 单元文件 | — | 否（文档） |
| | W1.3 Dockerfile / CI 对齐 Node 22（决策点①） | `Dockerfile` + `ci.yml` 版本一致 | — | 否（CI 验证） |
| **W2** C6 监控 | W2.1 抽出 `collectHealth()` 纯函数 + 增强 `healthz` | healthz 返回组件级状态 | — | 是（单测 collectHealth 不依赖 Nuxt） |
| | W2.2 新增 `scripts/monitor-cron.mjs`（含可选 webhook） | 监控脚本 | W2.1 | 是（dry-run 模式单测） |
| | W2.3 新增 `docs/ops/monitoring.md` | 监控文档 | — | 否 |
| **W3** | 勾选 `remaining-tasks.md` C3/C6，提交 | 文档同步 | W1/W2 | — |

**提交纪律**：每步单独 `git commit`（中文信息，显式 `git add`，不 `-A`）；`git push` 由你本机执行。

---

## 3. 决策点（待你拍板）

1. **Node 版本**：Docker + CI 统一 `node:22-slim`（推荐，与本地托管 22 一致）还是保持 `20`？
2. **C6 范围**：仅文档化外部探活（轻量）还是同时交付 `monitor-cron.mjs` + webhook 告警（推荐，闭环可用）？
3. **systemd**：新增 `deploy/mentorloop.service` 单元（推荐）还是仅文档说明用 PM2？

> 说明：A2 第三方登录 / A4 支付闭环仍卡资质（决策项①/③），不在本轮 C 系列范围。
