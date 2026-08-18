# 不依赖资质高价值项 · 技术方案 + 工作流（开工前确认）

> 整理：WorkBuddy（Senior Developer）｜时间：2026-08-17
> 方法：先读码核对现状，再定方向（避免按过时清单重复劳动）
> 范围：用户拍板的「不依赖资质、可立即开工的高价值项」

## 0. 现状核对（读码结论，重大修正）

读码对象：`server/utils/adminDispatch.ts`、`server/utils/admin.ts`、`app/layouts/default.vue`、`app/pages/learn/[module]/index.vue`、`app/pages/learn/[module]/[chapter]/index.vue`、`app/pages/exam/sets/[id].vue`、`app/components/BackToTop.vue`。

> ⚠️ `docs/remaining-tasks.md` 把 **G1–G7 标「0/7 待做」、F1–F4 标「4/4 待做」——均已过时**（与 08-16 的 P0/A 系列同模式：代码已落地但清单未勾选）。

| 原清单项 | 真实状态（读码证实） | 证据 |
|---|---|---|
| G1 后台框架 + 路由守卫 | ✅ 已落地 | `server/api/admin/[...slug].ts` 调 `requireAdmin`（401/403）；`default.vue` 含 admin nav |
| G2 内容 CRUD | ✅ 已落地 | `adminDispatch` modules/chapters/sections 全 GET/POST/PATCH/DELETE |
| G3 题库 CRUD | ✅ 已落地 | exam-sets / interview 全 CRUD |
| G4 用户体系 | ✅ 已落地 | users list/create/get/patch/delete（禁删自己） |
| G5 订单/订阅 | ✅ 已落地 | orders / subscriptions list |
| G6 数据看板 | ✅ 已落地 | `dashboardStats()` |
| G7 审计日志 | ✅ 已落地 | `adminDispatch` 对 POST/PATCH/DELETE 自动 `logAudit` |
| F1 模块总览 | 部分：✅搜索过滤 + ✅粘性侧栏 TOC；❌默认折叠 | `learn/[module]/index.vue` |
| F2 章节分节导航 | 部分：✅小节列表导航；❌sticky 阅读进度条 | `learn/[module]/[chapter]/index.vue` |
| F3 考试页 | 部分：✅计时器 + ✅自动交卷 + ✅VIP门禁 + ✅时间紧张提示；❌题号导航；❌断点续考 | `exam/sets/[id].vue` |
| F4 全局 | 部分：✅返回顶部（BackToTop 全局挂载）；❌全局面包屑组件；❌目录抽屉；❌阅读模式 | `default.vue` + `BackToTop.vue` |

**结论：G 系列已清零，无需再做。真正可立即开工 = A 批（F 系列真缺口 7 项）+ B 批（内容质量数据审计 4 项）。**

---

## 1. A 批：前端体验补强（7 项，纯前端，零资质，可预览 / 可单测）

### A1 · F1 默认折叠（`learn/[module]/index.vue`）
- **现状**：16 章（前端 70 章）全展开，长模块滚动长。
- **方案**：章节卡片加可折叠（默认折叠、提供「展开全部 / 收起」按钮）；折叠态保留「X 节」计数。仅改模板 + 一个 `collapsed` 状态，不碰数据层。
- **验证**：浏览器预览折叠/展开；SSR 无 hydration 报错（`collapsed` 初值需 SSR/CSR 一致）。

### A2 · F2 sticky 阅读进度条（`learn/[module]/[chapter]/index.vue`）
- **方案**：章节页顶部加 sticky 阅读进度条（监听 `window.scrollY` 算本章页面滚动比例；或按「已掌握小节 / 总小节」算掌握进度）。轻量 `onMounted` 监听 + `onBeforeUnmount` 移除。
- **验证**：滚动时进度条增长；sticky 不遮挡内容。

### A3 · F3 题号导航（`exam/sets/[id].vue`）
- **方案**：答题区顶部加题号网格（选择 1..N / 笔试 1..M），状态派生自现有 `choiceAnswers` / `writtenAnswers`：已答 / 未答 / 当前（滚动锚点）。点击 `scrollIntoView` 跳题。
- **复用**：不新增状态，纯派生渲染；与现有计时器/交卷逻辑解耦。
- **验证**：点击跳题、状态色正确、交卷后复盘态不渲染导航。

### A4 · F3 断点续考（`exam/sets/[id].vue`）
- **现状**：`abandonAttempt()` 在离开（SPA 跳转/刷新/关页）即作废 attempt，再进为全新计时 —— 已作答内容不恢复。
- **方案**：离开时不立即作废，改为把已选答案存 `localStorage`（key=`attempt:<attemptId>`）；再进同 attempt 时恢复答案 + 复用 `serverStartAt` 计时。超时仍判负（服务端为准）。
- **风险**：需与现有「离开即作废」策略取舍 —— 见决策点③。
- **验证**：选几题 → 刷新 → 答案与计时恢复；超时仍自动交卷。

### A5 · F4 全局面包屑组件（`app/components/Breadcrumb.vue` + 各内容页）
- **方案**：抽 `Breadcrumb.vue`（接收 `items` 或按 `route` 自动派生），替换 `learn/[module]/index.vue`、`learn/[module]/[chapter]/index.vue`、`exam/sets/[id].vue` 等现有局部面包屑，保证一致可点。
- **验证**：各页面包屑层级正确、可跳转。

### A6 · F4 目录抽屉（`default.vue` + 新组件）
- **方案**：全局「目录」按钮（移动端优先）→ `a-drawer` 显示当前模块/章节树，快速跳转（复用现有 `module.chapters/sections` 数据）。
- **验证**：移动端抽屉开合、跳转正常、不遮挡 BackToTop。

### A7 · F4 阅读模式（`default.vue` 或内容页 + `localStorage`）
- **方案**：阅读模式切换（字号 S/M/L + 限宽 + 护眼底色），持久化 `localStorage`，作用于内容页正文。
- **验证**：切换生效、刷新保留。
- **范围**：可能超出 MVP，见决策点④。

---

## 2. B 批：内容质量审计（D3 / D4 / E2 / E3，数据层）

> 非写代码，先跑脚本抽样审计，出报告再决定是否改 `seed-content.json`。

- **B1 D3 级别标签一致性**：统计 `exam_sets` / `interview_questions` 的 `level` 分布，抽样核对与题量/难度匹配。
- **B2 D4 题目质量**：按 `tech` 抽核心考点覆盖，标记凑数/重复题。
- **B3 E2 hot/special 权重校准**：统计 hot/special 分桶分布，按真实面试权重建议调桶。
- **B4 E3 查漏**：对照 408 路线图节点，查缺未覆盖知识点。
- **产出**：`docs/content-quality-audit.md`（报告）；如需改数据则走既有 seed 注入 + `_reseed` 流程（零漂移）。

---

## 3. C 批（收尾）：同步 `remaining-tasks.md`

- G1–G7 标记 `[x]`；F 系列拆分「已做 / 待做」；§9 看板更新。避免后续重复劳动（与 08-16 经验一致）。

---

## 4. 待拍板决策点

1. **起步批次**：A（前端体验）/ B（内容审计）/ A+B 并行？
2. **A 批内部优先级**：F3（考试高频，A3+A4）优先，还是 F4（全局导航，A5+A6+A7）优先？
3. **A4 断点续考 vs 现有「离开即作废」**：是否改为「离开可恢复草稿」？
4. **A7 阅读模式**：是否纳入本轮 MVP（可能超出范围）？

## 5. 建议起步集（供参考）

**A 批 F3 优先（A3 题号导航 + A4 断点续考）** —— 考试是用户最高频、最易感知的痛点，且纯前端、零风险、不依赖任何资质。确认后我先建任务清单并动手 A3 → A4，每完成一块单独 commit。

> 注：所有改动遵循「按模块单独 commit」「不 `-A`」「内容改动走 seed 注入 + 重灌校验」的项目约定。
