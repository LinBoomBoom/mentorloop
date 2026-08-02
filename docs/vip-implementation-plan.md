# MentorLoop VIP 功能 · 开发者实现计划（Implementation Plan）

> 状态：Draft v1 · 作者：产品通 · 日期：2026-08-01
> 配套文档：`docs/vip-prd.md`（产品规格 / 价值与定价论证）
> 适用：前端（Nuxt/Vue）+ 服务端（Nitro/`server/api`）+ 数据库（better-sqlite3）
>
> **本计划前提（已与产品对齐）**
> 1. **暂不降价**（维持 ¥29/月、¥199/年），故"价格 A/B 实验"降级为 P2 暂缓项（见 T12）。
> 2. **先价值、后链路**：先把真实付费权益做出来，再接支付；避免"能买但买不到东西"。
> 3. **AI 能力目前为零**：`/api/interview/ask` 仅是关键词匹配 + 占位文案，**无 LLM 接入**，AI 相关任务需从零接大模型（见 T4 + 阻塞项）。

---

## 0. 优先级总览（按执行顺序）

| ID | 优先级 | 阶段 | 任务 | 依赖 | 估点* |
|---|---|---|---|---|---|
| T1 | P0 | 地基 | 扩展 `orders` / `subscriptions` 表 + 迁移脚本 | — | S |
| T2 | P0 | 地基 | `plans` 配置化（enabled + 权益元数据） | — | S |
| T3 | P0 | 价值 | 新增 3 套 VIP 试卷 + 门禁全链路打通 | T2 | M |
| T4 | P0 | 价值 | AI 模拟面试 MVP（**需新接 LLM**） | 阻塞项① | L |
| T5 | P0 | 价值 | 学习路径定制 MVP | — | M |
| T6 | P0 | 链路 | 支付服务商接入（create + notify/webhook） | 阻塞项② | L |
| T7 | P0 | 链路 | 开通 / 降级 / 续费状态机 | T6 | M |
| T8 | P0 | 链路 | 退款 | T6 | M |
| T9 | P0 | 链路 | `plans` 启用 + 前端接真实购买 | T6,T7 | M |
| T10 | P1 | 体验 | 个人中心 VIP 状态 / 管理入口 | T7 | M |
| T11 | P1 | 度量 | 埋点事件（转化/留存/使用） | T9 | M |
| T12 | P2 | 实验 | 价格 A/B 框架 + 年包联动重定价（**暂缓**） | T9,T11 | M |

> *估点为相对复杂度（S/M/L），**非人天**，请团队按自身速率校准。P0 建议并行推进 T3/T4/T5（价值线）与 T1/T2（地基），T6–T9（支付线）须等阻塞项②解决。

---

## 1. 地基（P0）

### T1 · 扩展订单与订阅表
- **目标**：为支付闭环提供数据底座。
- **涉及文件**：`server/utils/db.ts`（建表）、`server/db/reset.mjs`（重置/重建，注意保留现有 seed 逻辑）。
- **具体改动**：
  - 新建 `orders`：`id, user_id, plan_id, amount, status(created/paid/refunded), provider, transaction_id, created_at`。
  - 新建 `subscriptions`：`id, user_id, plan_id, period(monthly/yearly), status(active/canceled/expired), provider, transaction_id, started_at, expire_at, cancel_at, created_at`。
  - `users.vip` 已存在（`{level, expireAt}`），补充索引 `user_id`。
- **验收标准**：
  - [ ] `reset.mjs` 执行后两表存在且可写入/读取；
  - [ ] 字段类型与长度满足订单/订阅生命周期。
- **依赖**：无 · **估点**：S

### T2 · `plans` 配置化
- **目标**：套餐可配置、权益可标注"是否已实现"，防止虚假宣传。
- **涉及文件**：`server/api/vip/plans.get.ts`（当前 `enabled:false`，价格写死）。
- **具体改动**：
  - `enabled` 改为可由环境变量 / 配置开关控制（如 `VIP_ENABLED`）。
  - 每个 benefit 增加 `implemented: boolean` 标记，前端仅在 `implemented` 为真时高亮"已上线"。
  - 返回结构：`{ enabled, plans: [{ id, name, price, period, benefits: [{ key, label, implemented }] }] }`。
- **验收标准**：
  - [ ] 不改代码即可通过配置切换上线/下线；
  - [ ] 未实现权益不在前端以"已上线"呈现。
- **依赖**：无 · **估点**：S

---

## 2. 真实付费权益（P0，价值核心）

### T3 · 新增 3 套 VIP 专属试卷 + 门禁全链路
- **目标**：让"付费内容池"从 0 套变成 3 套，门禁对免费用户友好引导而非硬拦截。
- **涉及文件**：
  - `data/seed-content.json`（新增 3 个 `exam_sets`，`vipOnly: true`，含 choice + written 题）；
  - `server/utils/db.ts`（seed 时 `vip_only = set.vipOnly ? 1 : 0` —— 已有该逻辑，确认生效）；
  - `server/api/exam/submit.post.ts`（当前非 VIP 返回 403，需改为返回结构化引导信息）；
  - `app/pages/exam/index.vue`（试卷卡 VIP 角标 —— 代码中已有 `v-if="s.vipOnly"`，确认有数据后展示）；
  - `app/pages/exam/sets/[id].vue`（预览可见题目；交卷时若 `vip_only` 且非 VIP → 引导跳转 `/vip`）。
- **具体改动**：
  - 403 响应体补充：`{ error, code:'VIP_REQUIRED', plan: <当前套餐摘要> }`，前端据此弹引导。
  - 试卷详情页：题目对所有人可见（现有逻辑即如此），仅"交卷"受控。
- **验收标准**：
  - [ ] 3 套试卷标记为 VIP，免费用户可浏览题目但交卷被拦截并引导开通；
  - [ ] VIP 用户可正常交卷、出判分与复盘；
  - [ ] 首页/试卷列表正确显示 VIP 角标。
- **依赖**：T2 · **估点**：M

### T4 · AI 模拟面试 MVP（⚠ 需从零接 LLM）
- **目标**：提供"多轮对话式模拟面试 + 评分 + 薄弱点报告"，这是 VIP 头牌权益。
- **现状**：`/api/interview/ask.post.ts` 仅做关键词匹配，**无任何大模型调用**（见文件第 26 行 `TODO(AI预留)`）。
- **涉及文件**：
  - 新建 `server/utils/llm.ts`（LLM 客户端封装：provider 抽象、超时、重试、密钥走 env）；
  - 新建 `server/api/interview/mock.post.ts`（多轮：入参 `track + history + userAnswer` → 出 `nextQuestion + score + feedback`）；
  - 新建 `server/api/interview/mock/report.get.ts` 或 `report.post.ts`（结束 → 出薄弱点报告）；
  - 前端 `app/pages/interview/` 增加"模拟面试"模式（VIP 专属，需登录）。
- **具体改动**：
  - 定义面试会话状态（track、轮次、历史），由后端或前端维护；
  - Prompt 模板：按方向（前端/后端/运维）出追问、按回答给分与改进建议；
  - 结束生成报告：能力维度评分 + 薄弱点 + 学习建议（可复用 `stats.get` 的雷达维度）。
- **验收标准**：
  - [ ] 多轮面试可连续进行，每轮有评分与反馈；
  - [ ] 结束生成结构化报告；
  - [ ] 仅 VIP / 登录用户可用；失败有降级（如 LLM 超时返回友好提示）。
- **依赖**：**阻塞项①（选 LLM 厂商 + API Key）** · **估点**：L

### T5 · 学习路径定制 MVP
- **目标**：基于用户真实进度/答卷薄弱点，生成"下一步学什么"的个性化路径。
- **涉及文件**：新建 `server/api/recommend/path.get.ts`；复用 `server/api/stats.get.ts` 的薄弱点/模块进度逻辑。
- **具体改动**：
  - 入参：当前用户；输出：推荐章节列表（按模块 → 章节，按薄弱度排序）；
  - 数据源：`exam_records` 得分分布 + `progress` 打卡表；
  - 兜底：无数据时按默认三方向顺序返回。
- **验收标准**：
  - [ ] 登录用户访问返回个性化路径且随进度变化；
  - [ ] 空数据有合理兜底；
  - [ ] 路径项可点击跳转对应学习页。
- **依赖**：`stats.get` 现有逻辑 · **估点**：M

---

## 3. 支付与订阅闭环（P0，受支付资质阻塞）

### T6 · 支付服务商接入
- **目标**：完成"下单 → 支付 → 回调开通"的最小闭环。
- **涉及文件**：
  - 新建 `server/api/payment/create.post.ts`（创建预订单，返回支付参数）；
  - 新建 `server/api/payment/notify.post.ts`（支付商异步回调/webhook，校验签名）；
  - 新建 `server/utils/payment.ts`（支付商适配层：微信支付 JSAPI / 支付宝，密钥走 env）；
  - 配置：`.env` 增加 `VIP_ENABLED`、`PAY_PROVIDER`、`WX_*`/`ALI_*` 密钥（不入仓）。
- **具体改动**：
  - `create`：校验套餐有效 → 写 `orders(status=created)` → 调用支付商下单 → 返回前端拉起支付所需参数；
  - `notify`：校验签名 → 幂等（同 `transaction_id` 不重复处理）→ 写 `orders(status=paid)` + 调 T7 开通。
- **验收标准**：
  - [ ] 能创建订单并返回可拉起支付的参数；
  - [ ] 回调能正确开通 VIP；
  - [ ] 重复回调幂等、签名错误被拒；
  - [ ] 密钥不经过代码仓库。
- **依赖**：**阻塞项②（支付商资质 + 密钥）** · **估点**：L

### T7 · 开通 / 降级 / 续费状态机
- **目标**：VIP 身份随订阅生命周期正确变化。
- **涉及文件**：`server/utils/db.ts`（写 `subscriptions`、更新 `users.vip`）、`server/utils/db.ts` 的 `requireVip`（下沉 `expireAt` 实时校验）、可加定时校验或请求时校验。
- **具体改动**：
  - 开通：`users.vip = { level:1, expireAt: now + period }`，`subscriptions.status=active`；
  - 访问时若 `expireAt < now` 自动 `level=0`（降级）、`subscriptions.status=expired`；
  - 续费：复用 `create`，延长 `expireAt`。
- **验收标准**：
  - [ ] 支付成功即时 `isVip=true`；
  - [ ] 到期自动降级；
  - [ ] 续费正确延长，不重复开通。
- **依赖**：T6 · **估点**：M

### T8 · 退款
- **目标**：支持原路退回与状态对账。
- **涉及文件**：`server/api/payment/refund.post.ts`、`subscriptions/orders` 状态机、前端取消入口。
- **具体改动**：调用支付商退款 API → 更新 `orders/subscriptions.status=refunded` → 若未到期则 `level=0`。
- **验收标准**：
  - [ ] 退款成功并正确更新状态；
  - [ ] 对账字段完整（transaction_id、金额、时间）。
- **依赖**：T6 · **估点**：M

### T9 · `plans` 启用 + 前端接真实购买
- **目标**：VIP 页从"敬请期待"变为可真实下单。
- **涉及文件**：
  - `server/api/vip/plans.get.ts`（`enabled:true`）；
  - `app/pages/vip/index.vue`（`buy(p)` 接 `create` + 拉起支付 + 成功后刷新 `isVip`）；
  - `app/stores/auth.ts`（`isVip` 在支付成功后实时刷新，避免刷新页面才生效）。
- **具体改动**：去掉"留邮箱"占位逻辑（或保留为备选），接真实支付流；支付成功后轮询/事件刷新会员态。
- **验收标准**：
  - [ ] VIP 页展示真实价格与已上线权益；
  - [ ] 点击购买可拉起支付并完成开通；
  - [ ] 开通后 `isVip` 实时变 true，无需刷新。
- **依赖**：T6,T7 · **估点**：M

---

## 4. 购买与展示体验（P1）

### T10 · 个人中心 VIP 状态 / 管理
- **目标**：用户可自助查看与管理订阅。
- **涉及文件**：新建/扩展个人中心页（如 `app/pages/settings.vue` 或 `profile`）；新建 `server/api/subscription.get.ts`。
- **具体改动**：展示 VIP 状态、到期日、当前套餐；提供"续费 / 取消自动续费 / 申请退款"入口（接 T7/T8）。
- **验收标准**：
  - [ ] 显示准确的会员状态与到期日；
  - [ ] 管理操作可用且状态同步。
- **依赖**：T7 · **估点**：M

### T11 · 埋点事件（转化 / 留存 / 使用）
- **目标**：为后续（含暂缓的定价实验）提供数据底座。
- **涉及文件**：前端各触点（`vip/index.vue`、`exam` 门禁、`interview` 模拟面试）、服务端关键动作；分析可先落本地 log 表或 `console`（后续接分析平台）。
- **事件清单**：`vip_view` / `vip_plan_click` / `pay_init` / `pay_success` / `entitlement_grant` / `vip_content_use` / `subscription_renew` / `subscription_cancel`。
- **验收标准**：
  - [ ] 上述事件可被统计；
  - [ ] 可按"价格分组"切片（为 T12 预留）。
- **依赖**：T9 · **估点**：M

---

## 5. 定价实验（P2，暂缓 — 暂不降价）

### T12 · 价格 A/B 框架 + 年包联动重定价
- **目标**：未来若重启降价讨论，可数据化决策（本阶段**暂缓**）。
- **涉及文件**：`plans` 配置加 `experiment` 字段 + 分群逻辑；年包若重定价到 ¥99–129 需同步改 `plans.get`。
- **验收标准**（启用时）：
  - [ ] 可按实验分组返回不同价格；
  - [ ] 按 LTV（客单价 × 毛利 × 1/流失率）而非注册数评估。
- **依赖**：T9, T11 · **估点**：M · **状态**：⏸ 暂缓

---

## 6. 技术决策待确认（Blocking — 开发者无法独自决定）

- [ ] **① LLM 厂商与密钥**：T4 前置。选 OpenAI / DeepSeek / 通义 / 智谱？API Key 与计费由谁承担？需成本预估（每次面试多轮调用）。
- [ ] **② 支付服务商与资质**：T6 前置。微信支付（学生群体优先，需营业执照+类目）还是支付宝？密钥与回调域名配置。
- [ ] **③ 自动续费策略**：是否默认开启连续包月/包年？监管要求在开通前显著明示 + 便捷取消（影响 T6/T9/T10 交互）。
- [ ] **④ 年包权益轻量化**：T12 启用时，1v1 简历诊断 / 内推资源库若落地须限次，否则亏损（当前 PRD 已将其列为 Non-goals）。

---

## 7. 合规清单（贯穿实现）

- [ ] 虚拟商品（会员）退款规则在开通前明示（T6/T9）。
- [ ] 自动续费显著告知 + 便捷取消入口（T9/T10）。
- [ ] 订阅 / 邮箱 / 支付信息加密存储；注销时按要求删除（个保法 / GDPR）（T1/T6）。
- [ ] VIP 页文案与实际权益严格一致，未实现权益不标"已上线"（T2/T3/T4/T5）。
- [ ] 支付回调验签、防重放（T6）。

---

## 8. 建议执行顺序（依赖图）

```
地基:   T1 ─┐
        T2 ─┴─► T3(试卷)  T4(AI面试,等①)  T5(路径)   ← 价值线，可并行
                                                         │
支付线:  (②就绪) ─► T6 ─► T7 ─► T9 ─► T10 ─► T11
                     ├─► T8(退款)
                                                         │
实验线:  (暂不降价) ───────────────► T12(暂缓,等数据)
```

**里程碑建议**
- M1（价值可用，内部可验）：T1–T5 完成 → 即使未接支付，也能用"内部开关"验证权益是否真有价值。
- M2（可收费上线）：T6–T9 完成 → 真实付费闭环。
- M3（体验与度量）：T10–T11 完成 → 可运营、可复盘。
- M4（可选）：T12 重启降价讨论时启用。

---

*本文档所有任务均可直接勾选推进；涉及用户行为数据（转化/留存）的基线需在 T11 上线后观测得出，决策以实测为准。*
