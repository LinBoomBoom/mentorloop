# MentorLoop 剩余未完成需求任务清单（跟踪文档）

> 生成日期：2026-08-16 ｜ 整理：WorkBuddy
> ⚠️ **状态核对（08-16）**：本清单初始基于 `launch-checklist(08-05)`，经读码 + 跑测试核对，起步集 6 项（P0#1/#2/#3、A11、A13、A14）与账号安全包（A6/A9/P1#4）此前已在 git 提交中落地；本轮（分支领先 13→14）闭合 P0#2 与 P1#4 的「改密踢下线」。下方已落地项已同步为 `[x]`。
> 数据来源：`docs/master-plan.md`(08-02) · `docs/content-foundation-plan.md`(08-01) · `docs/vip-implementation-plan.md`(08-01) · `docs/launch-checklist.md`(08-05) + 近期工作记忆核对(08-15/16)
> 用法：每个任务项 `[ ]` 待做 / `[x]` 已完成；勾选后提交并补 `docs/` 审稿记录。

> ⚠️ **关键校正（2026-08-16 末）**：此前"四模块格式已一致 / 溯源 100%"指 **URL 覆盖率**。按 `(可溯源)` 块格式严格核对，前端/运维已 100%，但**后端 75%、AI 81%** 仍有旧 `来源=官方` 内联格式节未升级（见 §5.1 收尾项）。下文已据实同步。

---

## 0. 量化基线（现状，2026-08-16 实测 seed-content.json + DB，用于验收对比）

| 资产 | 现状（实测） | 目标 / 验收 |
|---|---|---|
| 知识树 | 4 模块共 **101 章 / 547 节** | 覆盖完整（已建） |
| ├ 前端 | 70 章 / 298 节，(可溯源) 块格式 **298/298 = 100%** | ✅ 达标 |
| ├ 后端 | 16 章 / 143 节，URL 覆盖 100%，(可溯源) 块格式 **107/143 = 75%** | 余 36 节旧格式待升级 |
| ├ 运维 | 8 章 / 69 节，(可溯源) 块格式 **69/69 = 100%** | ✅ 达标 |
| └ AI | 7 章 / 37 节，URL 覆盖 100%，(可溯源) 块格式 **30/37 = 81%** | 余 7 节旧格式待升级 |
| 面试题 | **6565 条**（前端 2105 / 后端 2087 / 运维 1374 / AI 999），分 hot/special | 由知识树派生（量级已达）；验收=答案带官方源 URL |
| 考卷 | **19 套**（免费 11 / VIP 8），各轨道初级/中级/高级齐全 | 套数达标；验收=答案键锚定官方信源 |
| AI 模块 | 7 章（ai-c1~c7） | ✅ 达标（原目标 6–8 章） |
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
- [x] C3 Docker / PM2 / systemd 编排（Dockerfile✓ `ecosystem.config.cjs`✓ `Caddyfile`✓；本轮收口：`.dockerignore` 排除 `data/`、新增 `deploy/mentorloop.service`、Docker+CI 对齐 `node:22-slim`、Caddyfile 域名部署期替换）
- [x] C4 CI 跑 build（`.github/workflows/ci.yml` 已 `npm ci && npm test && npm run build`；"被注释"为旧快照失效）
- [x] C5 日志 / 错误上报（`logger.ts` JSON 结构化 + 文件落地 + 分级；`plugins/error-log.ts` 全局 error hook）
- [x] C6 监控 / 告警（healthz 返回组件级状态 `{db,tts,diskFreePct}` + `ok|degraded`；`scripts/monitor-cron.mjs` 探活 + 可选 webhook 告警；`docs/ops/monitoring.md` 两套方案）

---

## 5. 内容基座（Phase 0：C1/C2/C3 + 题库 D + 内容 E）

> 实测：四模块知识树内容**已全部建成**（101 章 / 547 节），题库 6565 条、考卷 19 套均已就位。剩余为**格式统一收尾**与**溯源/质量验收**，不再是"从零补建"。

### 5.1 知识树（C1）+ (可溯源) 块格式
- [x] C1-B 后端知识树 **16 章**（be-c1/be-jvm/be-dsa/be-net/be-os/be-c2/be-mq/be-c3/be-msa/be-dist/be-c4/be-c5/be-sec/be-test/be-api/be-nosql），143 节，URL 覆盖 100%
- [x] C1-D 运维知识树 **8 章**（op-c1~c8），69 节，(可溯源) 块格式 100%
- [x] C1-F 前端知识树 **70 章**，298 节，(可溯源) 块格式 100%（含 fe-c5~c18 全改造 + hm/nat/xp/ua/mp/dt/vz 等子类）
- [x] C1-A AI 知识树 **7 章**（ai-c1~c7），37 节，URL 覆盖 100%
- [ ] **【收尾·格式统一】后端 36 节 + AI 7 节 旧 `来源=官方` 内联格式 → 升级为 `(可溯源)` 块格式**
  - 后端缺口：be-c1/be-jvm/be-c2 **全章**（各 9/7/10 节）+ be-net(3)/be-mq(1)/be-c3(5)/be-msa(1) 局部 = 36 节
  - AI 缺口：ai-c1 **全章**（7 节）
  - 与前端/运维对齐，达到四模块 100% 块格式一致（可用通用升级脚本，同 `_upgrade-fe271.mjs` 思路批量处理）

### 5.2 面试题（C2）
- [x] C2 三方向面试题由知识树派生：合计 **6565 条**（前端 2105 / 后端 2087 / 运维 1374 / AI 999），已分 hot/special
- [ ] C2 验收：抽查 10% 答案是否带官方源 URL、事实与官方一致（题库尚未统一锚定 source URL，需补"答案可溯源"标注）

### 5.3 考卷（C3）
- [x] C3 考卷按知识树覆盖派生：**19 套**（免费 11 / VIP 8），各轨道初级/中级/高级齐全（level：初级4/初中级2/中级5/高级8）
- [ ] C3 验收：答案键锚定官方信源、VIP/免费梯度复核

### 5.4 题库 / 试卷扩建（master-plan D）
- [x] D1 免费卷扩题量：每份已含 25–30 选择 + 5–8 笔试（待抽样复核）
- [x] D2 增试卷份数：4 轨道共 19 套（≥ 12–16 目标）
- [ ] D3 级别标签补全且与题量/难度匹配（已有 level 字段，待一致性复核）
- [ ] D4 题目质量：覆盖核心考点，不凑数（持续）

### 5.5 内容扩充（master-plan E）
- [x] E1 AI 模块扩章：1→7 章（ai-c1~c7）
- [ ] E2 面试题分布重构：按真实面试权重校准 hot/special 分桶（当前已有分桶，待权重校准）
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
| 运维部署 | 6 | 0 | Node 22 已对齐；Caddyfile 域名为部署期配置 |
| 内容基座 | 知识树4模块全建(547节)+题库6565+考卷19 | 格式收尾43节 + C2/C3溯源验收 | 后端/AI格式升级 |
| VIP 价值线 | 1（呈现层） | 11 | ①支付 ②LLM |
| 前端体验 | 局部 | 4 | — |
| 管理后台 | 0 | 7 | — |

> 合计待办约 50 项（内容基座由 14 项收敛至 3 项：后端/AI 格式升级 43 节 + C2/C3 溯源验收）；最大卡点仍为 3 个资质决策（支付 / LLM / OAuth）。安全/数据库/部署等看板项于 08-16 同步，如需可单独立项复核。

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
