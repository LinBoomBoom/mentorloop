# MentorLoop 剩余未完成需求任务清单（跟踪文档）

> 生成日期：2026-08-16 ｜ 整理：WorkBuddy
> ⚠️ **状态核对（08-16）**：本清单初始基于 `launch-checklist(08-05)`，经读码 + 跑测试核对，起步集 6 项（P0#1/#2/#3、A11、A13、A14）与账号安全包（A6/A9/P1#4）此前已在 git 提交中落地；本轮（分支领先 13→14）闭合 P0#2 与 P1#4 的「改密踢下线」。下方已落地项已同步为 `[x]`。
> 数据来源：`docs/master-plan.md`(08-02) · `docs/content-foundation-plan.md`(08-01) · `docs/vip-implementation-plan.md`(08-01) · `docs/launch-checklist.md`(08-05) + 近期工作记忆核对(08-15/16)
> 用法：每个任务项 `[ ]` 待做 / `[x]` 已完成；勾选后提交并补 `docs/` 审稿记录。

> ✅ **全站格式已统一（2026-08-16 收尾）**：四模块知识树（547 节）现已 **100%** 采用 `(可溯源)` 块格式（前端 298 / 后端 143 / 运维 69 / AI 37）。此前"后端 75% / AI 81%"的缺口（后端 36 + AI 7 节旧 `来源=官方` 内联格式）已通过 `scripts/_upgrade-beai.mjs` + `_upgrade-beai2.mjs` 补齐并入库（commit 18f1700）。

> ✅ **前端体验 F1–F4 + 管理后台 G1–G7 已落地（2026-08-17）**：F1 模块总览折叠/搜索（A1）、F2 章节 sticky 阅读进度条（A2）、F3 考试页题号导航网格（A3）+ 断点续考 localStorage 草稿（A4）、F4 面包屑组件（A5）/ 模块页目录抽屉（A6）/ 章节页阅读模式字号 S/M/L+限宽+护眼底色+持久化（A7）/ 返回顶部（default 布局全局挂载）；G1–G7 经读码核对 `server/utils/adminDispatch.ts` 确认 CRUD / 用户 / VIP / 订单 / 看板 / 审计日志全量落地（无新代码，仅状态同步）。详见 §7 / §8 / §9。

---

## 0. 量化基线（现状，2026-08-16 实测 seed-content.json + DB，用于验收对比）

| 资产 | 现状（实测） | 目标 / 验收 |
|---|---|---|
| 知识树 | 4 模块共 **101 章 / 547 节** | 覆盖完整（已建） |
| ├ 前端 | 70 章 / 298 节，(可溯源) 块格式 **298/298 = 100%** | ✅ 达标 |
| ├ 后端 | 16 章 / 143 节，(可溯源) 块格式 **143/143 = 100%** | ✅ 达标 |
| ├ 运维 | 8 章 / 69 节，(可溯源) 块格式 **69/69 = 100%** | ✅ 达标 |
| └ AI | 7 章 / 37 节，(可溯源) 块格式 **37/37 = 100%** | ✅ 达标 |
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

### 1.1 可立即开工（不依赖上述 5 项决策）

下列待办项**不阻塞于资质/决策**，可优先推进（详见各节）：

- **安全收口（§2.2）**：A7/A8/A10/P1#6 已于 08-16 收尾（详见各条目 [x]）
- **VIP 价值线（§6.1/6.3/6.4，免支付）**：T1/T2/T3/T5 已于 08-16 收尾（详见 §6.1 勾选）；剩余 T10 个人中心 VIP 状态 + T11 埋点 + H2/H3/H4 待做
- **前端体验（§7）**：F1–F4 已于 08-17 全量落地（A1–A7：折叠/进度条/题号导航/断点续考/面包屑/目录抽屉/阅读模式）
- **管理后台（§8）**：G1–G7 已于 08-17 核对确认全量落地（admin 路由 + 内容/题库/用户/订单/看板/审计日志 CRUD）
- **内容质量（§5.4/5.5）**：D3 级别标签一致性 + D4 题目质量 + E2 hot/special 权重校准 + E3 查漏

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
- [x] A7 会话永不过期 + `sessions`/`auth_codes` 无清理 → 已补：`db.ts` `createDb()` 内 `setInterval` 每 15 分钟调 `cleanupExpired()` 定时清扫过期行（启动清理原已存在；`createDb` 经 global 记忆化仅执行一次，无重复定时器）
- [x] A8 输入无长度/类型限制（注册名、交卷笔试、提问）→ 已补：① `register.post.ts` 昵称 `assertInput` 限长 32；② `submit.post.ts` 笔试作答截断至 5000 字符并 trim（非字符串/空记「未作答」）；③ `ask.post.ts` 提问 `assertInput` min:2/max:500，命中 `InputError` 返回 400
- [x] A9 账号枚举（login 已统一中性文案"用户名或密码错误"）
- [x] A10 搜索 LIKE 通配符未转义（% / _ 全表匹配）→ 已落地：`security.ts` `likeWrap` + 查询 `ESCAPE '\''`（search.get.ts 与 interview/[track].get.ts 均用），本轮核对确认已生效
- [x] A11 token 存 localStorage → 已迁 HttpOnly Cookie + CSP（security.ts + Cookie 鉴权）
- [x] A12 注销账号闭环（auth/delete.post.ts 调 deleteAccount 级联清 8 表；account/index.vue 密码复核弹窗入口已完备）
- [x] A13 无隐私政策页（privacy.vue 7 章节已完善）
- [x] A14 密码策略弱（assertPassword 已强制 8+ 两类）
- [x] P1#4 封禁/改密不踢下线（getUser 校验 banned 并清会话；本轮补 updateUser 改密/封禁清会话）
- [x] P1#5 LLM 与下单接口限流（vip/resume、interview/start|answer、order/create、exam/submit 此前已限；本轮补 vip-tts 30/60s、vip-asr 60/60s、payment/sandbox/confirm 按 IP 20/60s，无零限流项）
- [x] P1#6 考试倒计时纯前端可控（无 `exam/start`，服务端不记开考时间）→ 已落地：`exam_attempts` 表 + `started_at`；`exam/sets/[id].get.ts` GET 时建/复用 attempt 并记 `serverStartAt`，`submit.post.ts` 按 `started_at` 计算真实用时并钳制（`totalSec` 上限），本轮核对确认已生效
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
- [x] **【收尾·格式统一】后端 36 节 + AI 7 节 旧 `来源=官方` 内联格式 → 升级为 `(可溯源)` 块格式**（commit 18f1700）
  - 后端缺口：be-c1/be-jvm/be-c2 **全章**（各 9/7/10 节）+ be-net(3)/be-mq(1)/be-c3(5)/be-msa(1) 局部 = 36 节
  - AI 缺口：ai-c1 **全章**（7 节）
  - 兼容三类残局：纯文本 `来源：desc url` 行（be-c1/be-jvm/be-c2）、blockquote md 链接（ai-c1）、正文裸链（be-c3 docs.spring.io）、已含子弹缺头行（be-net-s8/be-mq-s8）
  - 代码样例示例地址（httpbin/example/服务名）非真实来源：be-net-s4/s5、be-msa-s3 补权威规范源（MDN HTTP / MDN TLS / Spring Cloud 负载均衡），诚实标注"官方源，可点击回溯"
  - **结果：四模块 547/547 节全部 (可溯源) 块格式，0 残留旧来源行，_reseed 零漂移**

### 5.2 面试题（C2）
- [x] C2 三方向面试题由知识树派生：合计 **6565 条**（前端 2105 / 后端 2087 / 运维 1374 / AI 999），已分 hot/special
- [x] C2 验收（commit 见下，报告 `docs/c2-c3-provenance-report.md`）：新增 `source` 字段，6565 题中 **4835 题（73.6%）带可追溯源**（DB 实测 307 条非枢纽精确/真实 URL + 其余按 tech 映射的权威官方枢纽源；拆分见 `docs/c2-c3-provenance-report.md`）；1730 题（`rq-*` 路线图题）无单一官方源留 null 交专家锚定；抽检 15 题事实正确，发现 2 类粗粒度 tech 标签错配（内容质量任务，另案处理）。DB 已建 `source` 列（db.ts v20 迁移）+ reseed 同步

### 5.3 考卷（C3）
- [x] C3 考卷按知识树覆盖派生：**19 套**（免费 11 / VIP 8），各轨道初级/中级/高级齐全（level：初级4/初中级2/中级5/高级8）
- [x] C3 验收（同源报告）：考卷 319 条目当前 0 官方源，已加 `source` 列留待领域专家按 track/知识点锚定；建议复用 `section_id` 关联知识树小节。UI 渲染"官方源"链接为后续 UI 任务

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
- [x] T1 扩展 `orders` / `subscriptions` 表 + 迁移脚本（**核对：db.ts 早已建表 + `fulfillOrder` 状态机 + `getActiveSubscription` + `expirePendingOrders`，本批仅验收确认，无新代码**）
- [x] T2 `plans` 配置化（enabled + 权益 `implemented` 标记）（08-16：`server/utils/plans.ts` benefits 结构化 `{key,label,implemented}` + `period`；`plans.get.ts` 透传；`vip/index.vue` 区分「已上线/敬请期待」；诚实分级：AI 面试核心/1v1 简历诊断/内推库标 `false`；修正"12 套"夸大文案为真实 8 套）
- [x] T3 新增 3 套 VIP 专属试卷 + 门禁全链路打通（**核对：seed 已有 8 套 `vipOnly:true` 卷（超额满足）；本批补结构化 403 `VIP_REQUIRED` + 套餐摘要，前端 `sets/[id].vue` 识别后弹升级引导**）
- [ ] T4 AI 模拟面试 MVP（⚠ 需 LLM 厂商+Key）
  - [x] 呈现层：阿里云 TTS + 数字人/3D VRM + `/interview/sim` 实时语音流式播报（08-15/16 已落地）
  - [ ] 核心：多轮 LLM 对话 + 评分 + 薄弱点报告（**仍卡决策项②**）
- [x] T5 学习路径定制 MVP（复用 `exam_records` 薄弱点）（08-16：补 `generatePlanLocal` 免 LLM 确定性生成器，`getOrCreateStudyPlan` 在 `!llmEnabled()` 走本地路径不再 503，未接 LLM 前也可用；有 key 仍走 LLM 富化）

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

- [x] F1 模块总览/技能树：默认折叠 + 全部折叠/展开 + 搜索过滤（**08-17：A1 落地**；547 节量级下虚拟滚动非必需，移动端目录抽屉见 F4）
- [x] F2 章节页：分节导航（移动端目录抽屉）+ sticky 顶部阅读进度条（**08-17：A2 落地**）
- [x] F3 考试页：服务端计时 + 题号导航网格（已答/未答/当前态）+ 断点续考 localStorage 草稿（**08-17：A3/A4 落地，与 P1#6 服务端计时联动**）
- [x] F4 全局：面包屑组件 + 模块页目录抽屉 + 返回顶部（default 布局全局挂载）+ 章节页阅读模式（字号 S/M/L + 限宽 + 护眼底色 + 持久化）（**08-17：A5/A6/A7 落地**）
- [x] 已落地（08-16）：学习中心章节三色掌握状态 + 侧栏粉色收敛

---

## 8. 管理后台 + 用户体系（G 系列）

- [x] G1 后台框架：admin 路由守卫 + 侧边布局（**核对 08-17：`server/api/admin/[...slug].ts` + `adminDispatch.ts` 已全量落地**）
- [x] G2 内容 CRUD：模块/章节/小节 增删改查（**08-17 核对：adminDispatch modules/chapters/sections 全 CRUD**）
- [x] G3 题库 CRUD：试卷/选择题/笔试题/面试题 增删改查（**08-17 核对：exam-sets + 题型全 CRUD**）
- [x] G4 用户体系：用户列表、角色、VIP 状态、封禁/解封（**08-17 核对：users 管理 + 封禁清会话**）
- [x] G5 订单/订阅管理（**08-17 核对：orders/subscriptions 管理端点已落地；支付动作仍 mock，卡 ①**）
- [x] G6 数据看板：注册/活跃/考试/付费指标（**08-17 核对：dashboard 指标端点**）
- [x] G7 操作审计日志（**08-17 核对：POST/PATCH/DELETE 自动 logAudit**）

---

## 9. 进度看板（实时统计）

| 类别 | 已完成 | 待做 | 阻塞/卡点 |
|---|---|---|---|
| 上线安全 P0 | 19 | 2 | A4→①支付；A2→③OAuth |
| 数据库后端 | 10 | 0 | — |
| 运维部署 | 6 | 0 | Node 22 已对齐；Caddyfile 域名为部署期配置 |
| 内容基座 | ✅ 全完成 | 0 | 知识树547节100%可溯源 + 题库73.6%带 source + 考卷19预留 source 列 |
| VIP 价值线 | 5（呈现层+T1+T2+T3+T5） | 11 | T4核心→②LLM；T6–T9→①支付；T10/T11/H2/H3/H4 待做 |
| 前端体验 | 4（F1–F4） | 0 | A1–A7 已于 08-17 落地 |
| 管理后台 | 7（G1–G7） | 0 | G5 支付动作仍 mock，卡 ① |

> 合计待办较 08-16 口径减少 11 项（前端体验 F1–F4 + 管理后台 G1–G7 已落地）。剩余最大卡点仍为 5 项决策（支付 / LLM / OAuth / 续费策略 / 部署形态）。**内容基座 Phase 0 全部完成**（知识树 547 节 100% `(可溯源)` 块格式 + 题库 6565 题 73.6% 带结构化 `source` + 考卷 19 套预留 `source` 列；报告见 `docs/c2-c3-provenance-report.md`）。安全(B)/数据库/部署(C)/前端(F)/管理后台(G) 看板项已对齐现状；此前"3/7""~16"等旧数为 08-16 同步时的口径，本次已校正。

---

## 10. 推荐推进节奏（下一阶段起步集）

内容基座已收尾，下一步建议优先"不依赖资质的硬骨头 + 高价值功能"：

**A. 安全收口（低成本高收益，已于 08-16 收尾 ✅）**
1. A7 会话定时清理（sessions/auth_codes 过期清扫）→ ✅ 已落地
2. A8 输入长度/类型校验（注册名、笔试作答、提问）→ ✅ 已落地
3. A10 搜索 LIKE 通配符转义（% / _ 防全表匹配）→ ✅ 早已落地，本次核对确认
4. P1#6 服务端考试计时（开考时间入库，倒计时不可纯前端控）→ ✅ 早已落地，本次核对确认

**B. VIP 价值线（免支付，可独立交付）— 已于 08-16 收尾 ✅**
5. T1 + T2 订单/订阅表扩展 + plans 配置化（权益 `implemented` 标记）✅
6. T3 3 套 VIP 专属试卷 + 门禁全链路打通 ✅（seed 实测 8 套 VIP 卷超额满足）
7. T5 学习路径定制（复用 `exam_records` 薄弱点，免 LLM 兜底）✅

**C. 前端体验 / 管理后台（已于 08-17 全部落地 ✅）**
8. F1–F4 模块总览/章节/考试/全局导航 ✅（A1–A7）
9. G1–G7 管理后台 CRUD + 用户/VIP/订单/看板 ✅（核对 adminDispatch.ts）

支付 / LLM / OAuth / 续费 / 部署 待决策项①–⑤拍板后铺开（A4 / T6–T9 / T4 核心 / A2 等）。

---

## 11. 执行纪律（沿用项目约定）

- 每完成一个任务 `git commit`（中文提交信息，按类别显式 `git add`，不 `-A`）；`git push` 由用户本机执行。
- 内容类改动走"docs/*.md 审稿稿 → 注入 seed → 重灌 → 校验"，零 schema 漂移。
- 数据库改动经 `.workbuddy/memory/` 日志 + `MEMORY.md` 追溯。
- 勾选推进时同步更新第 9 节进度看板数字。
