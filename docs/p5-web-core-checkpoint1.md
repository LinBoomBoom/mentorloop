# P5 Checkpoint #1 — fe-web 核心方向补章

> 目标：消除"核心语言/框架各 1 章、平台赛道各 7–10 章"的倒挂，让核心方向的内容体量与其在分类中的重要性匹配。
> 执行方式：复用既有合规管线 `scripts/gen-learn.mjs`（LLM 基于官方 URL 写稿 + 时效/核验/来源元数据），不手工杜撰。
> 本文件为**可审查 checkpoint**：确认范围后我才跑 `plan → write → apply`。

## 1. 现状（实测，2026-08-19）

前端各方向章节深度（章节 | 小节 | 平均小节长度字符）：

| 方向 | 现有 | 判定 |
|---|---|---|
| miniprogram | 10 / 33 | 充足（平台赛道） |
| vue* | 8 / 28 | 含 uni-app 7 章，vue 本体仅 1（fe-c10） |
| harmony | 8 / 26 | 充足 |
| cross | 8 / 33 | 充足 |
| visualization | 7 / 30 | 充足 |
| native | 7 / 21 | 充足 |
| engineering | 7 / 48 | 充足 |
| desktop | 5 / 22 | 充足 |
| javascript | 4 / 23 | 中等 |
| **web (HTML)** | **1 / 5** | 最薄 |
| **typescript** | 1 / 6 @4321 | 单章但很厚，可拆分（低优先） |
| **security** | 1 / 5 | 薄 |
| **react** | 1 / 7 @3806 | 单章偏厚，顶流框架偏薄 |
| **performance** | 1 / 5 | 薄 |
| **css** | 1 / 6 | 偏薄 |

> 注：平台赛道（鸿蒙/小程序/跨端/原生/桌面/可视化）已由 P0/早期经 `gen-learn.mjs` 补齐，本次**不触碰**。

## 2. 补章范围（本次 Checkpoint 目标）

**章数不写死**：每个方向新增章节**完全镜像其官方文档的章节结构**——官网有多少章，就写多少章。管线 `plan` 阶段即以官方 URL 为蓝本生成大纲，不预设配额（已据此修正 `gen-learn.mjs` 的 plan 提示，移除"通常 5~10 章"之类的软配额暗示）。

本次覆盖的六个方向（均走 `gen-learn.mjs` 管线，官方来源驱动章数）：

| 方向 | 现有 | 官方来源（驱动章数） |
|---|---|---|
| **web (HTML)** | 1 章 | MDN HTML、web.dev/learn/html |
| **css** | 1 章 | MDN CSS、web.dev/learn/css |
| **react** | 1 章 | react.dev（官方 Learn + Reference 结构） |
| **vue（本体）** | 1 章 | vuejs.org、pinia.vuejs.org、router.vuejs.org |
| **security** | 1 章 | OWASP、MDN Web Security |
| **performance** | 1 章 | web.dev/learn/performance、MDN Performance |

> 下列仅作"官方文档典型范畴"示例，**非固定清单**，最终章节由 `plan` 阶段按官网结构生成：
> - web/HTML：语义化、表单、多媒体嵌入、无障碍 A11y、meta/SEO…
> - css：布局体系、动画过渡、架构命名、现代特性（容器查询/子网格/逻辑属性）…
> - react：JSX、Hooks、状态管理、性能与并发…
> - vue：响应式、组件高级、Router、Pinia…
> - security：XSS/CSRF 防护、认证授权与 HTTPS…
> - performance：关键渲染路径、Web Vitals、运行时优化…

**typescript 默认不做**（现有 1 章已 6 小节 @4321 字符，足够厚）；如需拆分可后续单独 checkpoint。

## 3. 管线改造（必须先做，否则新章节 subtrack=NULL 不归类）

`scripts/gen-learn.mjs` 当前 `doApply` 不写 `subtrack`，且 `seed-content.json` 章节无该字段。改造点：

1. **SUBTRACKS 注册表**新增上述核心方向条目（module:`frontend`，各自 prefix 不与现有 `fe-/hm-/mp-/xp-/nat-/dt-/vz-/ua-` 冲突，如 `ht-/cs-/rx-/vu-/sc-/pf-/ts2-`），每条带 `subtrack` 值（`web/css/react/vue/security/performance/typescript`）。
2. **doApply** 在组装章节时写入 `subtrack` 字段，并同步到：
   - seed JSON 章节对象（补 `subtrack`）
   - DB `INSERT` 语句（已有 `insCh` 占位，补 subtrack 列）
3. **apply 幂等**：沿用现有 `INSERT OR IGNORE` + done 文件续跑机制，重跑只补缺失，不重复。

> 验证点：apply 后 `SELECT subtrack, COUNT(*) FROM chapters WHERE module_id='frontend' GROUP BY subtrack` 中 `web/css/react/vue/security/performance` 计数应按预期上升，且无 `NULL`。

## 4. 执行步骤（确认后我按顺序执行）

1. 备份 `data/seed-content.json` 与 `data/devmentor.db`（带时间戳 `.bak`）。
2. 改 `scripts/gen-learn.mjs`：注册表 + subtrack 赋值（Task 0）。
3. 对每个方向：`node scripts/gen-learn.mjs run <id> --concurrency 5`（plan+write 连续；write 可续跑）。
4. 逐方向 `apply`，每次 apply 后跑一个计数校验。
5. SSR 复查：`/learn/frontend`、`/interview/frontend` 渲染含新章节、方向与计数正确、无横滑。
6. 记录今日工作日志；本 checkpoint 完成后提交并请求 review。

## 5. 风险与边界

- **Token 成本**：约 90–110 小节 × ~1.5k tokens ≈ 150k–180k tokens（含 plan）。可控。
- **内容合规**：管线强制"锚定官方 URL、引用真实链接、来源=官方、核验日期"，不虚构；与项目铁律一致。
- **不破坏线上**：仅新增章节（INSERT OR IGNORE），不改现有 fe-c1..fe-c18；备份可回滚。
- **typescript 默认跳过**，除非你勾选。

## 6. 执行进度（实时更新）

- ✅ 管线改造：`gen-learn.mjs` 移除软配额 + 注册六方向 + `doApply` 写入 `subtrack`（DB 与 seed JSON 均带）。
- ✅ 备份：`data/.bak/seed-content.2026-08-19T06-13-46Z.json` + `devmentor.db.2026-08-19T06-13-46Z`。
- ✅ **Pilot web-html**：plan 5 章/21 节（镜像 MDN HTML：基础/语义化/表单/多媒体/无障碍）→ write 21/21 成功 → apply 写入。验证：subtrack 均=web、web 方向 1→6 章、全库前端 NULL subtrack=0。
- 🔄 **批量生成中**（后台任务 zia37O，日志 `/tmp/p5gen.log`）：css-core / react-core / vue-core / web-security / web-perf 五方向 `run`(plan+write)+`apply` 已启动，完成后自动通知。
- ⏳ 待批量完成后：验证六方向计数与 subtrack、SSR 复查、提交。

> 用户纠偏（已落实）：章数不写死，由官方文档结构决定。
