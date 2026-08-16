# B 组 VIP 价值线（免支付）· 技术方案 + 工作流拆解

> 范围：T1 + T2 + T3 + T5（免支付，不接支付通道、不接 LLM 厂商决策）  
> 日期：2026-08-16 ｜ 依据：读码核对（非 08-01 旧 plan，旧 plan 多处已落地）

## 0. 现状核对（读码事实，非推测）

| 任务     | 旧 plan 描述                              | 代码实测现状                                                                                                                                                                 | 本批真实缺口                                                                                   |
| ------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **T1** | 新建 orders/subscriptions 表 + 迁移         | `db.ts` 已含两表完整 schema + `fulfillOrder()` 状态机 + `getActiveSubscription()` + `expirePendingOrders()`（v1 迁移已建表，状态机随后续提交落地）                                                | **无新代码**，仅验收确认 + 标记完成                                                                    |
| **T2** | plans 配置化（enabled + 权益 implemented 标记） | `server/utils/plans.ts` 有 `PLANS` + `VIP_ENABLED` 开关；`plans.get.ts` 返回 `enabled/provider/plans`，但 `benefits` 是 `string[]`，**无 implemented 标记**；文案含"12 套"（实际 VIP 卷 8 套） | ① benefits 结构化 + implemented 标记；② 修正夸大文案；③ 前端区分"已上线/敬请期待"                                |
| **T3** | 新增 3 套 VIP 专属试卷 + 门禁全链路                | seed 已有 **8 套** `vipOnly:true` 卷（超额满足）；前端 `exam/index.vue` 角标 + `sets/[id].vue` 的 `vipLocked` 提示条 + submit 守卫均已就位                                                      | 仅补"门禁闭环"：后端 403 返回结构化 `VIP_REQUIRED` + 套餐摘要；前端交卷拦截时弹出升级引导（而非一行 error）                    |
| **T5** | 学习路径定制（复用 exam_records 薄弱点）            | `vip/path.post.ts` + `studyplan.ts` 已存在，但 `getOrCreateStudyPlan` 在无 LLM key 时 **抛 503「AI 服务未配置」**，导致未接 LLM 前完全不可用                                                      | 新增**免 LLM 的确定性生成器** `generatePlanLocal()`：有答卷即用真实章节名生成路径，无 LLM key 也能用；有 key 仍走 LLM 富化路径 |



> 结论：本批真正要写代码的是 **T2（结构化 + 文案）**、**T3（403 结构化 + 前端引导）**、**T5（免 LLM 兜底）**；T1 仅验收。

## 1. 推荐方案

### T1 — 验收（无代码）

- 对照 `db.ts` 确认：表存在、`fulfillOrder` 正确写 `subscriptions` 与 `users.vip`、`effectiveVip` 到期回收生效。
- 在 `remaining-tasks.md` 勾选 T1 完成；不重建、不改 schema（B8 迁移机制已稳）。

### T2 — plans 配置化 + implemented 标记（合规重点）

- `server/utils/plans.ts`：
  - `PlanDef.benefits` 由 `string[]` 改为 `{ key: string; label: string; implemented: boolean }[]`。
  - 按"待拍板决策"标记每个权益是否已在本批次真实可用（见 §3）。
  - 修正夸大文案：`quarterly` 的"VIP 专属高阶模拟试卷（12 套）"→ 真实口径（如"高阶模拟试卷"或"8 套高阶试卷"）；`yearly` "全部"保持。
- `server/api/vip/plans.get.ts`：透传 `implemented`；补充 `period`（monthly/quarterly/yearly 映射，便于前端展示"包月/包季/包年"）。
- `app/pages/vip/index.vue`：已实现权益加 ✓「已上线」标签；未实现权益灰显「敬请期待」，绝不渲染成已上线（对齐合规清单：未实现权益不标已上线）。

### T3 — VIP 门禁全链路闭环（免支付）

- `server/api/exam/submit.post.ts`：非 VIP 交卷 403 由纯字符串改为结构化：
  ```ts
  return json(event, 403, {
    error: '该试卷为 VIP 专属，请先开通会员',
    code: 'VIP_REQUIRED',
    plan: { id, name, price, durationDays } // 取 PLANS[0] 摘要，供前端引导
  })
  ```
- `app/pages/exam/sets/[id].vue`：`submit()` 的 catch 中识别 `e.code === 'VIP_REQUIRED'` → 显示升级引导卡（含「去开通」按钮跳 `/vip`），而非仅一行 `err` 文本；题目预览保持对所有人生效（现有逻辑已如此）。
- 验收：免费用户预览 8 套 VIP 卷题目可见、交卷被引导；VIP 用户正常出分复盘。

### T5 — 学习路径定制（免 LLM 可用）

- `server/utils/studyplan.ts` 新增 `generatePlanLocal(track, weakPoints, chapters)`：
  - 把弱标签（如 `网络`/`React`/`MySQL`）与真实章节标题/小节内容做关键词匹配，挑出最相关章节；
  - 按薄弱度（count 降序）聚合成 3–5 个里程碑，输出与 LLM 同构的 `{ summary, milestones:[{title,chapters,focus,tasks,interviewGoal}] }`；
  - 章节名全部取自真实 `chapterIndex(track)`，绝不臆造；无匹配时回退到该方向按 position 顺序的全部章节（默认进阶路径）。
- `getOrCreateStudyPlan` 改造：
  - 有缓存 → 直接返回（不变）；
  - 无缓存且 `llmEnabled()` → 走 LLM 富化（不变）；
  - **无缓存且 `!llmEnabled()` 且有答卷记录** → 走 `generatePlanLocal()`（新增，不再 503）；
  - 无答卷记录 → 仍抛 `NoRecordsError`（保持"请先完成至少一次模拟考试"语义）。
- `decorate()` 已能把章节标题还原成可点击深链，local 路径直接复用。

## 2. 工作流拆解（分阶段、可逐步审查 + commit）

1. **T1 验收**：核对 `db.ts` 状态机，确认无缺口 → 更新 `remaining-tasks.md` 勾选 T1。（无代码，低风险）
2. **T2 结构化**：改 `plans.ts`（benefits→对象 + implemented + 文案修正）→ 改 `plans.get.ts`（透传 + period）→ 改 `vip/index.vue`（已上线/敬请期待 区分）。单测：补 `tests/` 校验 `plans.get` 返回含 `implemented`。
3. **T3 门禁闭环**：改 `submit.post.ts`（结构化 403）→ 改 `sets/[id].vue`（升级引导）→ 手测/补 `exam` 相关断言。
4. **T5 免 LLM 兜底**：`studyplan.ts` 加 `generatePlanLocal` → 改造 `getOrCreateStudyPlan` 分支 → 补 `vip-features.test.mjs` 用例（无 LLM key 用 local 路径）。
5. **联动回归**：跑 `tests/vip-features.test.mjs` + `tests/security.test.mjs`（限流未动） + 相关集；确认 0 回归。
6. **清单同步**：`remaining-tasks.md` 勾选 T1/T2/T3/T5，更新 §9 进度看板（VIP 价值线 1→5）。

每步独立 commit（中文信息、显式 add、不 `-A`），不 push（你本机 push）。

## 3. 待拍板决策（T2 权益标记策略）

决定哪些权益标 `implemented:true`（已上线）、哪些标 `false`（敬请期待）。这直接影响 VIP 页是否诚实，关系到合规清单"未实现权益不标已上线"。

- 确定可标「已上线」：`VIP 专属高阶模拟试卷`（T3，8 套）、`个性化学习路径定制`（T5，本批补免 LLM 后可用）、`全部方向笔试题库与复盘`、`面试错题本自动归集`（wrong-items 已落地）。
- 待定（需你定）：`AI 深度模拟面试`（核心需 LLM，当前仅呈现层）、`1v1 简历诊断`（H3）、`内推资源库`（H4）、`尊享专属答疑通道`（范围未定）。

详见下方问题。

## 4. 风险与对策

- **T5 章节匹配精度**：local 生成器用关键词匹配，可能漏匹配；对策——无匹配回退默认顺序，且 `decorate` 仅对命中章节生成深链，未命中的纯标签降级展示，不报错。
- **T2 文案夸大**：直接按真实数字（8 套）修正，不留"12 套"等虚高表述。
- **不碰支付/LLM**：T6–T9（支付）、T4 核心（LLM）保持阻塞，本批仅交付"免支付价值线"，不引入支付或 LLM 强依赖。
