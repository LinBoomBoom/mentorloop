# 部署方案评估与实施（对应决策 #4）

## 现状架构
- Nuxt 4 全栈：前端（Vue SSR）+ 后端（Nitro server routes）同进程；`better-sqlite3` 单文件库（WAL 模式，`busy_timeout=5000`）。
- 已具备：管理后台 CRUD、VIP 一次性购买（sandbox 闭环）、内容/题库/面试题全量数据。

## 核心问题：能否支撑「多客户 / VIP 充值 / 登录」？
- **多客户（多用户并发）**：✅ 可行。应用采用共享库 + 按 `user` 行级隔离（`users/exam_records/progress/orders` 等皆以 user 为键），属单产品 SaaS 共享库模型，无需租户级物理隔离。SQLite 在 WAL 下支持多读 + 串行写，已配 `busy_timeout` 抗并发。
- **VIP 充值**：按决策 #5 为**一次性付费**，无自动续费。sandbox 已闭环；真实支付待营业执照（决策 #1）。充值频率低，SQLite 完全胜任。
- **登录/鉴权**：✅ 可行（token 当前存 localStorage，待 A11 迁 HttpOnly Cookie 更安全）。

## 推荐部署形态（单一实例起步，可垂直扩展）
1. **运行形态**：Nitro `node-server` 单实例（Docker 容器 **或** PM2），前置 **Caddy** 反向代理做 TLS + 静态 + 限流。
2. **持久化**：挂载卷保存 `data/devmentor.db`（含 `.db-wal/.db-shm`）与 `.env`；容器/进程本身无状态。
3. **水平扩展路径**：若日后并发显著上升，把 `better-sqlite3` 换 Postgres（B8 迁移机制已规划），再把 PM2 `instances` 提到 2–4；当前阶段不必。
4. **备份**：WAL 备份脚本（B4）定时 `PRAGMA wal_checkpoint(TRUNCATE)` + 整库拷贝到对象存储。

## 落地文件
- `Dockerfile`：node:20-slim 构建 + 运行 `.output/server/index.mjs`。
- `.dockerignore`：排除 node_modules/.output/.env/data/*.db 等。
- `ecosystem.config.cjs`：PM2 单实例（cluster `instances:1`，注释说明换 PG 后可提升）。
- `Caddyfile`：自动 TLS 反代 `localhost:3000`。
- `.github/workflows/ci.yml`：push/PR 跑 `npm ci → npm test → npm run build`（C4）。
- `server/api/health.get.ts`：`/api/health` 探活（C2）。

## 上线前仍阻塞
- A4b 真实支付：需营业执照（决策 #1）。
- A2 真实 OAuth：需确认提供方与 App 凭据（决策 #3）。
