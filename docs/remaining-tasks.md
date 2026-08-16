# MentorLoop 剩余未完成需求任务清单（跟踪文档）

> 生成日期：2026-08-16 ｜ 整理：WorkBuddy
> ⚠️ **状态核对（08-16）**：本清单初始基于 `launch-checklist(08-05)`，经读码 + 跑测试核对，起步集 6 项（P0#1/#2/#3、A11、A13、A14）与账号安全包（A6/A9/P1#4）此前已在 git 提交中落地；本轮（分支领先 13→14）闭合 P0#2 与 P1#4 的「改密踢下线」。下方已落地项已同步为 `[x]`。
> 数据来源：`docs/master-plan.md`(08-02) · `docs/content-foundation-plan.md`(08-01) · `docs/vip-implementation-plan.md`(08-01) · `docs/launch-checklist.md`(08-05) + 近期工作记忆核对(08-15/16)
> 用法：每个任务项 `[ ]` 待做 / `[x]` 已完成；勾选后提交并补 `docs/` 审稿记录。

---

## 0. 量化基线（现状，用于验收对比）

| 资产 | 现状 | 目标 |
|---|---|---|
| 试卷 | 7 套（免费 3 / VIP 4） | 12–16 套，免费卷 25–30 选择 + 5–8 笔试 |
| 面试题 | 210 条（56/56/56/42 机械对等） | 按权重重分配（约 120/120/70/80 量级），由知识树派生 |
| AI 模块 | 1 章 7 节 | 6–8 章 |
| 后端知识树 | 13 章已建 ✅ | 保持（单点深度已对齐前端） |
| 运维知识树 | 5 章 / 11 点 / 0.7 万字 | 按官方信源完整重建 |
| 前端知识树 | 15 章，fe-c3/c4 已改造，fe-c5~c15 待改造 | v1 模板逐章推进 |
| 管理员 | admin@mentorloop.com 已建 | 强密码移入 `.env`（上线前） |

---

## 1. 阻塞决策项（需你拍板，否则相关任务卡住）

- [ ] **① 支付资质**：微信/支付宝商户号 + 营业执照 → 阻塞 A4 / T6 / T7 / T8 / T9 / G5
- [ ] **② LLM 厂商 + Key**：AI 模拟面试/路径/简历诊断用哪家（DeepSeek/通义/智谱/OpenAI），谁出密钥 → 阻塞 T4 / H1 核心
- [ ] **③ 第三方 OAuth**：是否上真实微信/QQ/GitHub 登录，还是上线前先下架入口 → 阻塞 A2 / #58
- [ ] **④ 自动续费策略**：默认开启连续包月/包年？影响 T6/T9 交互与合规文案
- [ ] **⑤ 部署形态**：Docker / PM2 / 云托管 → 决定 C3 WAL 跨进程与备份方案

---

## 2. 上线阻塞（P0，最高优先）

### 2.1 代码审查新发现（launch-checklist，尚未纳入 master-plan）
- [x] **P0#1** 登出不撤销服务端会话 → 已落地（`logout.post.ts` 读 `AUTH_COOKIE` 并 `DELETE FROM sessions`）
- [x] **P0#2** `auto_renew=1` 硬编码 + VIP 页/账户页自相矛盾 → 已闭合（本轮：fulfillOrder 写 0 + 测试断言同步 + 禁用 `subscription.enable` + 前端文案一致）
- [x] **P0#3** 交卷 nonce 全局唯一索引 → 已修复（db.ts 复合唯一索引 `(user_id,set_id,submit_nonce)`）

### 2.2 安全合规（master-plan A 系列）
- [x] A1 验证码明文回传（DEV_CODE）→ 已 gate
- [ ] A2 第三方登录假实现（任意 qrToken 可伪造登录）
- [x] A3 `requireVip` 校验 expireAt → 已修（注：会话治理 A7 仍缺，见 P0#1）
- [ ] A4 支付闭环未接入（仍 mock）
- [x] A5 全站 rate limit（security.ts 内存滑动窗口；覆盖 auth/login|register|send-code、order/create、search、exam/submit、interview/ask、vip-path|resume|referral|interview 系列，及本轮补的 tts/asr/practice/account-delete/abandon/checkin/progress-toggle/wrong/skill-mastery/sandbox-confirm）
- [x] A6 登录无防爆破（security.ts `getLoginLock` 已实现失败锁定）
- [ ] A7 会话永不过期 + `sessions`/`auth_codes` 无清理
- [ ] A8 输入无长度/类型限制（注册名、交卷笔试、提问）
- [x] A9 账号枚举（login 已统一中性文案"用户名或密码错误"）
- [ ] A10 搜索 LIKE 通配符未转义（% / _ 全表匹配）
- [x] A11 token 存 localStorage → 已迁 HttpOnly Cookie + CSP（security.ts + Cookie 鉴权）
- [x] A12 注销账号闭环（auth/delete.post.ts 调 deleteAccount 级联清 8 表；account/index.vue 密码复核弹窗入口已完备）
- [x] A13 无隐私政策页（privacy.vue 7 章节已完善）
- [x] A14 密码策略弱（assertPassword 已强制 8+ 两类）
- [x] P1#4 封禁/改密不踢下线（getUser 校验 banned 并清会话；本轮补 updateUser 改密/封禁清会话）
- [x] P1#5 LLM 与下单接口限流（vip/resume、interview/start|answer、order/create、exam/submit 此前已限；本轮补 vip-tts 30/60s、vip-asr 60/60s、payment/sandbox/confirm 按 IP 20/60s，无零限流项）
- [ ] P1#6 考试倒计时纯前端可控（无 `exam/start`，服务端不记开考时间）
- [x] P1#7 字体去外部依赖（main.css + nuxt.config 改用系统字体栈消除国内 FOUC；本轮清 app.vue 死引用 Sora、CSP font-src/img-src 移除 Google Fonts 域名）

---

## 3. 数据库 / 后端健壮性（B 系列）

- [x] B1 零业务索引 → 已建 8 个
- [x] B2 外键子句（迁移 v3 `foreign-keys` 重建 chapters/sections/exam_choices/exam_written/exam_records/progress/interview_sessions/study_plans 带 FK + ON DELETE CASCADE）
- [x] B3 DB_PATH 依赖 cwd → 已修
- [x] B4 WAL 备份（createDb 已 `journal_mode = WAL`；scripts/backup-db.mjs 只读 `VACUUM INTO` 自包含快照 + integrity_check，已挂 `npm run backup`，实跑通过）
- [x] B5 sitemap 缓存（server/utils/sitemap.ts 1h 缓存 + server/routes/sitemap.xml.ts 复用；批量查询构 URL）
- [x] B6 N+1 消除（modules.get.ts GROUP BY 聚合；sitemap.ts 批量查询替代逐节嵌套 SELECT）
- [x] B7 exam_records 拆表（迁移 v4 拆出 exam_choice_reviews / exam_written_reviews 子表，主表双写 + 读取走子表 fallback 主表老列）
- [x] B8 迁移机制（db.ts MIGRATIONS 版本化幂等迁移 + colExists 守卫，新增 schema 仅追加 migration）
- [x] B9 未显式 busy_timeout → 已设
- [x] B10 交卷幂等（idx_exam_records_nonce 复合唯一索引 (user_id,set_id,submit_nonce)，迁移 v2/v10；submit.post.ts 按 nonce 查询去重）

---

## 4. 运维 / 部署（C 系列）

- [x] C1 `.env` 体系（`.env.example` + `.env` 已建；`sitemap.ts`/`robots.txt.ts`/`payment.ts` 均读 `process.env.SITE_URL`；SITE_URL 仍占位 `mentorloop.example.com` 属部署期配置非代码缺口）
- [x] C2 健康检查接口（`server/routes/healthz.get.ts` 返回 status/db/uptime/memory；`session-touch.ts` 已放行 `/healthz`）
- [ ] C3 Docker / PM2 / systemd 编排（Dockerfile✓ `ecosystem.config.cjs`✓ `Caddyfile`✓ 已存在；本轮收口：`.dockerignore` 补 `data/`、新增 systemd unit、Node 版本对齐 22、Caddyfile 域名部署期替换）
- [x] C4 CI 跑 build（`.github/workflows/ci.yml` 已 `npm ci && npm test && npm run build`；"被注释"为旧快照失效）
- [x] C5 日志 / 错误上报（`logger.ts` JSON 结构化 + 文件落地 + 分级；`plugins/error-log.ts` 全局 error hook）
- [ ] C6 监控 / 告警（仅 healthz 探活，无组件级状态与告警接线；本轮交付：healthz 组件级状态 + `scripts/monitor-cron.mjs` + webhook 告警 + `docs/ops/monitoring.md`）

---

## 5. 内容基座（Phase 0：C1/C2/C3 + 题库 D + 内容 E）

### 5.1 知识树（C1）
- [x] C1-B 后端知识树 13 章（be-c1/be-jvm/be-dsa/be-net/be-os/be-c2/be-mq/be-c3/be-msa/be-dist/be-c4/be-c5/be-sec）
- [ ] C1-D 运维知识树从零补建（Linux/网络/DNS/Nginx/DBA/Docker/K8s/CI-CD/监控/SRE/安全加固/成本/故障演练/多云/工程实践）
- [ ] C1-F 前端 fe-c5~fe-c15（11 章）按 v1 模板改造（fe-c3/c4 已入库）

### 5.2 面试题（C2）
- [ ] C2 三方向面试题由知识树派生（概念/场景/手写设计，附官方来源 URL，规模随覆盖生长）

### 5.3 考卷（C3）
- [ ] C3 考卷按知识树覆盖派生 + VIP 草案（`vipOnly:true`）

### 5.4 题库 / 试卷扩建（master-plan D）
- [ ] D1 免费卷扩题量：每份 25–30 选择 + 5–8 笔试
- [ ] D2 增试卷份数：每轨道至少 初级/中级/高级 各 1 免费 + 对应 VIP（→ 约 12–16 套）
- [ ] D3 级别标签补全且与题量/难度匹配
- [ ] D4 题目质量：覆盖核心考点，不凑数（持续）

### 5.5 内容扩充（master-plan E）
- [ ] E1 AI 模块扩章：1→6–8 章（RAG/Agent 框架/评估/安全合规/成本优化/工程化/向量库/微调蒸馏）
- [ ] E2 面试题分布重构：按真实面试权重，分 hot/special 标签
- [ ] E3 其他模块查漏（宪章复审，可选持续）

---

## 6. VIP 价值线（vip-implementation-plan T1–T12）

### 6.1 价值线（可立即开工，不依赖支付资质）
- [ ] T1 扩展 `orders` / `subscriptions` 表 + 迁移脚本
- [ ] T2 `plans` 配置化（enabled + 权益 `implemented` 标记）
- [ ] T3 新增 3 套 VIP 专属试卷 + 门禁全链路打通
- [ ] T4 AI 模拟面试 MVP（⚠ 需 LLM 厂商+Key）
  - [x] 呈现层：阿里云 TTS + 数字人/3D VRM + `/interview/sim` 实时语音流式播报（08-15/16 已落地）
  - [ ] 核心：多轮 LLM 对话 + 评分 + 薄弱点报告（**仍卡决策项②**）
- [ ] T5 学习路径定制 MVP（复用 `exam_records` 薄弱点）

### 6.2 支付线（卡支付资质 ①）
- [ ] T6 支付服务商接入（create + notify/webhook）
- [ ] T7 开通 / 降级 / 续费状态机
- [ ] T8 退款
- [ ] T9 `plans` 启用 + 前端接真实购买

### 6.3 体验 / 度量 / 实验
- [ ] T10 个人中心 VIP 状态 / 管理入口
- [ ] T11 埋点事件（转化/留存/使用）
- [ ] T12 价格 A/B 框架 + 年包联动重定价（**暂缓，暂不降价**）

### 6.4 其它 VIP 权益（master-plan H）
- [ ] H2 学习路径定制（可由 T5 覆盖）
- [ ] H3 1v1 简历诊断（上传 + AI/人工）
- [ ] H4 内推资源库（资源 CRUD + 展示）

---

## 7. 前端布局与体验（F 系列）

- [ ] F1 模块总览/技能树：虚拟滚动或分页 + 默认折叠 + 侧边 TOC + 搜索过滤
- [ ] F2 章节页：分节导航 + sticky 进度条
- [ ] F3 考试页：计时器、题号导航、断点续考（与 P1#6 服务端计时联动）
- [ ] F4 全局：面包屑、目录抽屉、返回顶部、阅读模式
- [ ] 已落地（08-16）：学习中心章节三色掌握状态 + 侧栏粉色收敛（局部体验，非 F1–F4 全集）

---

## 8. 管理后台 + 用户体系（G 系列）

- [ ] G1 后台框架：admin 路由守卫 + 侧边布局
- [ ] G2 内容 CRUD：模块/章节/小节 增删改查
- [ ] G3 题库 CRUD：试卷/选择题/笔试题/面试题 增删改查
- [ ] G4 用户体系：用户列表、角色、VIP 状态、封禁/解封
- [ ] G5 订单/订阅管理（配合 A4/T7/T8）
- [ ] G6 数据看板：注册/活跃/考试/付费指标
- [ ] G7 操作审计日志

---

## 9. 进度看板（实时统计）

| 类别 | 已完成 | 待做 | 阻塞/卡点 |
|---|---|---|---|
| 上线安全 P0 | 3 | ~16 | ①支付 ②LLM ③OAuth ④续费 |
| 数据库后端 | 3 | 7 | — |
| 运维部署 | 0 | 6 | ⑤部署形态 |
| 内容基座 | 1（后端树） | 14 | 量大、需专家落笔 |
| VIP 价值线 | 1（呈现层） | 11 | ①支付 ②LLM |
| 前端体验 | 局部 | 4 | — |
| 管理后台 | 0 | 7 | — |

> 合计待办约 65 项；最大卡点为 3 个资质决策（支付 / LLM / OAuth）。

---

## 10. 推荐推进节奏（最小上线阻塞集）

若优先"消上线阻塞"，建议起步集（不依赖资质）：
1. P0#1 登出撤销会话
2. P0#2 auto_renew 硬编码 + 页面矛盾
3. P0#3 交卷 nonce 作用域
4. A13 隐私政策页
5. A14 密码策略 8+ 复杂度
6. A11 token 迁 HttpOnly Cookie + CSP

其余（支付/LLM/OAuth/部署）待决策项①–⑤拍板后铺开。

---

## 11. 执行纪律（沿用项目约定）

- 每完成一个任务 `git commit`（中文提交信息，按类别显式 `git add`，不 `-A`）；`git push` 由用户本机执行。
- 内容类改动走"docs/*.md 审稿稿 → 注入 seed → 重灌 → 校验"，零 schema 漂移。
- 数据库改动经 `.workbuddy/memory/` 日志 + `MEMORY.md` 追溯。
- 勾选推进时同步更新第 9 节进度看板数字。
