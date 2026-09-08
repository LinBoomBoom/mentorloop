# 四大模块内容 · 严格数据归类方案

> 版本：v1（已执行）｜日期：2026-09-09｜数据源：`data/devmentor.db` + `app/data/learningTaxonomy.ts` + `app/data/techVocabulary.ts`
> 状态：**✅ 执行完成（归类层 7/9 通过；A4/A5 属内容补齐范畴，非归类错误，本次不处理）**。

**已落地决策**：D1 严格受控 / D2 迁移 ai-infra 的 LLM 应用题回 ai-app / D3 覆盖度补齐（生成新内容）属独立任务本次不动 / D4 本次范围为归类字段，未改 `sections.direction`（仅做文档标注，避免扩大改动面）。

---

## 0. 目标

把「前端 / 后端 / 运维 / AI 工程」四大模块下的全部内容实体，收敛到**一套唯一权威的归类维度**上，做到：

1. **每个内容实体都能被唯一定位**（模块 → 赛道 → 子主题 → 技术标签）。
2. **归类标签与内容语义一致**（不再出现「CNN 结构题标着部署与成本」）。
3. **UI 上每个筛选项都能命中有内容**（不再出现点了筛选返回 0 条）。
4. 全部判定可脚本化断言，回归可验证。

---

## 1. 现状盘点（真实数据，非估算）

### 1.1 内容实体总量

| 实体 | 前端 | 后端 | 运维 | AI 工程 | 合计 |
|---|---:|---:|---:|---:|---:|
| modules（模块） | 1 | 1 | 1 | 1 | **4** |
| tracks（赛道） | 11 | 7 | 6 | 6 | **30** |
| chapters（章节） | 152 | 117 | 78 | 62 | **409** |
| sections（小节） | 587 | 609 | 341 | 265 | **1802** |
| interview_questions（面试题） | 2102 | 2081 | 1370 | 999 | **6552** |
| exam_sets（试卷） | 13 | 17 | 13 | 14 | **57** |
| skill_section_map（技能点映射） | 45 | 9 | 6 | 23 | **83** |

- 章节级 subtrack 取值：**58 个**，与 `learningTaxonomy.ts` 的 `chapterSubtracks` 并集**完全对齐**（前端 22 / 后端 16 / 运维 8 / AI 12），无孤儿章节。
- 种子 `data/seed-content.json` 章节数 **409** == DB **409**，已一致。
- 面试题 **6552 条题面全部唯一**，无重复、无跨模块重复题。
- 面试题 `subtrack` 全部落在 30 个赛道 id 上，**无脏值、无 NULL**。

✅ **结论：一级（模块）与二级（赛道）归类骨架是健康的。** 问题集中在**三级（子主题）与四级（技术标签）**，以及**标签与内容语义的一致性**。

---

## 2. 归类维度模型（拟定的唯一权威结构）

```
L1 module    模块     4 个        modules.id            frontend / backend / devops / ai
L2 track     赛道     30 个       learningTaxonomy.id    fe-web / be-micro / op-sre / ai-app …
                                 （= roadmap track id = interview_questions.subtrack）
L3 subtrack  子主题   58 个       chapters.subtrack     web / css / react / mysql / k8s / rag …
                                 （= learningTaxonomy.chapterSubtracks 的取值）
L4 tech      技术标签 受控词表     interview_questions.tech
                                 （= learningTaxonomy.techNames，需升级为受控词表）
```

**权威源优先级（自上而下，下级不得与上级冲突）**
1. `modules` 表 → L1
2. `app/data/roadmap/*.ts` → L2 赛道定义（唯一权威）
3. `app/data/learningTaxonomy.ts` → L2↔L3 的归并关系
4. 新建 **`app/data/techVocabulary.ts`** → L4 受控技术词表（本次新增，见 §4.1）

**核心新增约束**：L4 的 `tech` 不再允许自由字符串，必须从受控词表取值；词表项声明 `归属模块 + 允许出现的赛道白名单`。

---

## 3. 问题诊断清单

### P0 · 标签与内容语义错配（直接影响付费体感）

| # | 问题 | 证据 | 量级 |
|---|---|---|---:|
| P0-1 | **AI 模块 tech 标签崩塌**：算法题被打上「部署与成本」 | `ai-algo`（CV/NLP/推荐）92 题中 74 题 tech=「部署与成本」，实际题面是「CNN/RNN/Transformer 结构差异」「Self-Attention 推导」「Focal Loss 选型」 | 74 |
| P0-2 | **AI Infra 混入 LLM 应用题** | `ai-infra`（推理优化）230 题中 228 题 tech=「部署与成本」，抽样题面是「LLM 幻觉如何缓解」「Temperature/Top-p 采样参数」「Guardrails 输出约束」——这些属 `ai-app` | 228 |
| P0-3 | **AI 模块「部署与成本」一标签独大** | ai-algo 74 + ai-app 34 + ai-data 31 + ai-edge 64 + ai-infra 228 = **431 / 999（43%）**；二级筛选完全失去区分度 | 431 |
| P0-4 | **be-data 二级筛选 100% 失效** | 赛道声明 `Spark/Hive/Kafka/Flink/数仓建模`，题库实际标签为 `系统设计38 / MySQL17 / 微服务11 / 消息队列6` → **交集为空**，点任一筛选项返回 0 条 | 72 |
| P0-5 | **op-sec 主题倒置** | 安全运维赛道声明「安全」但 **0 题**命中；实际标签为 `SRE23 / Linux18 / 网络16 / Kubernetes11 / CI-CD11 / 容器4` | 83 |

### P1 · 结构性与完整性缺口

| # | 问题 | 证据 | 量级 |
|---|---|---|---:|
| P1-1 | **声明项 0 命中（空筛选）** | 8 个赛道：`be-data`(5项)、`be-web`(Go/Python/Gin/FastAPI)、`ai-mlops`(MLflow/Kubeflow/LLM评估)、`be-db`(PostgreSQL/NoSQL)、`op-trad`(Kubernetes)、`op-sre`(容器/Docker)、`op-sec`(安全)、`fe-mobile`(Web基础) | 8 赛道 |
| P1-2 | **有题但未被声明（漏筛）** | 10 个赛道：如 `be-data`(4项)、`op-sec`(3项)、`fe-web`/`fe-arch`/`fe-harmony` 的「网络」、`be-micro` 的「消息队列」(101题) | 10 赛道 |
| P1-3 | **tech 脏值** | `tech='综合'` 9 条（fe-native 6 / be-test 1 / be-web 1 / fe-mobile 1），不属任何受控词表 | 9 |
| P1-4 | **技能维度未归类** | `interview_questions.skill` 4018/6552 为 NULL（61%） | 4018 |
| P1-5 | **来源不可追溯** | `interview_questions.source` 1729/6552 为 NULL（26%） | 1729 |
| P1-6 | **字段命名污染** | `sections.direction` 存的其实是**学习目标**文本（"能使用 Dataset 和 DataLoader 高效加载…"），不是方向 → 归类维度名不副实 | 1802 |
| P1-7 | **同义双 key** | `dbredis`(be-db) 与 `redis`(be-search) 显示名同为「Redis」，章节各 3 章、题库 3/8 题 → 用户认知混淆 | 2 key |
| P1-8 | **覆盖度失衡** | 章节 3~17 章/赛道；题库 **69(fe-uniapp) ~ 1088(fe-web)**，**15.8 倍**差距；AI 模块整体最薄（62 章 vs 前端 152） | — |
| P1-9 | **技能点映射几乎未建** | `skill_section_map` 仅 83 条、30 个不同 skill_key，且分布极偏（前端45/AI23/后端9/运维6） | 83 |

### P2 · 待逐条校验

| # | 问题 |
|---|---|
| P2-1 | 章节标题 ↔ subtrack 的**名实一致**逐章校验（历史上有 `miniprogram` 10 章实为微信小程序的先例，需防止同类偏差回潮） |

---

## 4. 归类规则设计

### 4.1 新建受控技术词表 `app/data/techVocabulary.ts`

```ts
export interface TechTerm {
  id: string          // 规范 id，如 'mysql'
  name: string        // 中文规范名，如 'MySQL'
  aliases: string[]   // 别名，用于回刷历史脏值，如 ['综合'] → 归入 '赛道综合'
  module: string      // 归属 L1：frontend | backend | devops | ai
  allowTracks: string[] // 允许出现的赛道白名单（跨赛道复用需显式声明）
}
```

作用：
- 作为 `tech` 字段的**唯一取值域**；
- 驱动 `techNames` 自动生成（不再手写，消除 P1-1/P1-2 的双向缺口）；
- 提供别名映射，用于清理脏值。

### 4.2 归类判定优先级（对单条面试题）

1. **实体命中**：题干/答案中出现受控词表的规范名或别名 → 取该 term。
2. **领域继承**：未命中时，回落到题目所属 `subtrack` 的主领域 term。
3. **兜底**：仍无法判定 → `赛道综合`（受控词表内的合法值，替代现有脏值「综合」）。

> 硬约束：判定只修改 `tech` / `skill` 等**归类字段**，**绝不改动题干与答案**（对齐"AI 只做策展与结构化，严禁虚构内容"原则）。

---

## 5. 执行工作流（分阶段 + 可审查检查点）

| 阶段 | 动作 | 产出 | 检查点 |
|---|---|---|---|
| **S0 基线** | 备份 DB；导出「题 id / 模块 / 赛道 / 现 tech / 题干前 60 字」全量 CSV | `docs/audit/taxonomy-baseline-*.csv` | ✅ 可回滚 |
| **S1 建词表** | 建立 `techVocabulary.ts`（从 30 个赛道实际标签 + 声明反推，人工确认别名与白名单） | 受控词表 + 缺口报告 | 👀 **人工确认词表** |
| **S2 一致性体检** | 写 `scripts/audit-taxonomy.mjs`，跑出 §6 的 A1–A8 断言，输出 pass/fail 表 | `docs/audit/taxonomy-report.md` | 👀 确认问题清单无遗漏 |
| **S3 规则重打标** | 按 §4.2 优先级，对 P0-1~P0-5 + P1-3 做确定性重打（可解释、可回滚）；逐类输出 before/after 对照 | 变更清单 CSV | 👀 **抽样人工复核** |
| **S4 语义复核** | 对规则判不定的题目 + 每赛道抽样 10%，做 LLM 交叉验证；仅打标不改内容 | 复核报告 | 👀 确认准确率 ≥95% |
| **S5 结构修复** | `sections.direction` 语义澄清（改名为 `objective` 或迁移到独立字段）；`skill`/`source` 回填策略 | 迁移脚本 | 👀 确认是否改名 |
| **S6 双写 + 复查** | 同步 `data/seed-content.json` ↔ DB；SSR 页面复查；跑全量断言 | 校验报告 | ✅ A1–A8 全绿 |

**分批原则**：按模块推进，顺序建议 **AI → 后端 → 运维 → 前端**（AI 问题最重、体量最小，先跑通流程）。每批结束给一次可审查检查点。

---

## 6. 校验口径（可脚本化断言，作为验收标准）

| 断言 | 内容 |
|---|---|
| **A1** | 每赛道：`techNames` ⊆ 题库实际 tech 集合（**无空筛选**） |
| **A2** | 每赛道：实际 tech 集合 ⊆ `techNames`（**无漏筛**） → A1+A2 即双向相等 |
| **A3** | 不存在不在受控词表中的 tech 脏值 |
| **A4** | 每赛道单一 tech 占比 ≤ 60%（**区分度**下限） |
| **A5** | 每赛道章节 ≥ 6 章 且 题目 ≥ 100 题（覆盖度下限，可按需调整阈值） |
| **A6** | seed 章节数 == DB 章节数（409） |
| **A7** | 每题 `subtrack` ∈ 30 个赛道 id；每章 `subtrack` ∈ 所属模块 `chapterSubtracks` 并集 |
| **A8** | 面试题题面唯一；无跨模块重复题 |
| **A9** | `tech` 值 100% 命中 `techVocabulary.ts` |

---

## 7. 需要你拍板的 4 个决策

| # | 决策点 | 选项 A | 选项 B |
|---|---|---|---|
| **D1** | tech 词表治理强度 | **严格受控**：每题必须命中词表，未命中统一进「赛道综合」（推荐，根治空筛选） | 宽松：保留自由标签，仅补齐 `techNames` 声明 |
| **D2** | `ai-infra` 中疑似 LLM 应用题（约 200+ 条） | **迁回 `ai-app`**，让 ai-infra 回归推理优化主题（推荐） | 保留不动，只改 tech 标签 |
| **D3** | 覆盖度补齐优先级 | **先补 AI 模块章节**（62 章，四大模块最薄，且是 VIP 卖点） | 先补题库短板赛道（fe-uniapp 69 题等） |
| **D4** | `sections.direction` 字段 | **迁移到 `objective`** 并保留 direction 为空（语义清晰，一次性改完） | 保持字段名，仅在文档说明 |

---

## 8. 不做什么（边界声明）

- ❌ 不改动任何题干 / 答案 / 章节正文内容（只动归类字段）。
- ❌ 不批量生成新内容填充数量缺口（覆盖度补齐是独立任务，需另立方案）。
- ❌ 不触碰桌面端构建链路与 `.env`（避免历史坑复现）。

---

## 9. 执行结果（2026-09-09）

### 9.1 交付物

| 文件 | 作用 |
|---|---|
| `app/data/techVocabulary.ts`（新增） | 受控技术词表，43 个术语（id / 中文名 / 别名 / 归属模块 / 赛道白名单）。`tech` 字段唯一取值域。 |
| `scripts/audit-taxonomy.mjs`（新增） | 一致性体检脚本，A1–A9 断言 + CSV 全量导出。npm: `taxonomy:audit` / `taxonomy:baseline` |
| `scripts/taxonomy-reclassify.mjs`（新增） | 规则重打标（题干命中 → 领域继承 → 兜底赛道综合）。`--apply` 写库，默认 dry-run 出 CSV。 |
| `scripts/sync-tech-names.mjs`（新增） | 由实际标签反向生成 `techNames`，根治空筛选/漏筛。 |
| `docs/audit/taxonomy-report.md`（产物） | 每次体检的 Markdown 报告。 |
| `docs/audit/taxonomy-reclassify-plan.csv`（产物） | 重打标逐题变更清单（可回滚）。 |
| `data/devmentor.db.bak-taxonomy-20260909`（备份） | 写库前整库备份，34MB，已被 gitignore。 |

### 9.2 断言结果（before → after）

| 断言 | 说明 | before | after |
|---|---|---|---|
| A1 | techNames ⊆ 题库实际标签（无空筛选） | ❌ | ✅ |
| A2 | 题库实际标签 ⊆ techNames（无漏筛） | ❌ | ✅ |
| A3 | tech 无脏值（全部命中受控词表） | ❌ | ✅ |
| A4 | 单一 tech 占比 ≤ 60%（本体标签 ≤95%） | ❌(be-db 90%) | ❌(be-db 90%，**内容偏科非归类错**) |
| A5 | 内容覆盖度 章节≥6 & 题≥100（提示项） | ❌(16 赛道) | ❌(16 赛道，**D3 补齐范畴**) |
| A6 | seed 章节数 == DB 章节数 | ✅ | ✅ |
| A7 | subtrack 归属合法 | ✅ | ✅ |
| A8 | 题面唯一 / 无跨模块重复 | ✅ | ✅ |
| A9 | tech ∈ 词表 ∧ 该赛道被允许 | ❌(2 越界) | ✅ |

**归类层 7/9 通过**。A4/A5 残留项经判定不属于「归类错误」：A4 是 be-db 宣称覆盖 4 种数据库实际 90% 是 MySQL（内容缺口），A5 是 16 个赛道题量未达 100（覆盖度补齐 D3，本次不动）。二者均为独立的内容补齐任务。

### 9.3 关键数字

- **重打标 895 题**（占 6552 的 13.7%），全部基于**题干**语义判定（早期误把答案纳入匹配，已修正，避免把「什么是量化」判成「模型与训练」）。
- **兜底率 10.2%**（91 题进「赛道综合」），分布合理（无单赛道兜底爆炸）。
- **195 个 UI 二级筛选项，0 个空筛选**（before 多个赛道点了返回 0 条）。
- 旧脏标签 **「部署与成本」431→0、「综合」9→0**；越界词表项 2→0。
- 全库 36 个 distinct `tech` 全部命中受控词表（43 项），**0 越界**。

### 9.4 全栈验证（开发服务器实测）

四大模块 API `/api/interview/{module}` 的 `techOptions` 全部返回新词表项：

| 模块 | 重分类后 tech 分布（节选） |
|---|---|
| 前端 | JavaScript 534 / 工程化 418 / 性能优化 404 / CSS 172 / React 153 / Vue 120 … |
| 后端 | Java 519 / 微服务 468 / 系统设计 369 / MySQL 224 / Redis 121 / 消息队列 120 … |
| 运维 | SRE 377 / CI/CD 258 / Kubernetes 224 / Linux 186 / 网络 176 / 安全 75 … |
| AI | 推理与部署 246 / RAG 216 / Agent 108 / Prompt 工程 99 / 模型与训练 82 / 评估与观测 60 … |

旧标签在 API 层查询均返回 `total=0`，新标签筛选可命中有内容。

### 9.5 风险与后续

1. **A4→be-db**：宣称覆盖 MySQL/PostgreSQL/Redis/NoSQL，实际 PostgreSQL/NoSQL 0 题。建议 D3 阶段补 PostgreSQL/NoSQL 题库，或调整赛道宣称范围。**不影响当前归类正确性。**
2. **A5→16 赛道题量 < 100**：属 D3 覆盖度补齐任务，需另立生成方案（按官方资料补齐，非 AI 编造）。
3. **`sections.direction` 命名**：本次未改（D4 原意是改名 objective，但归类任务应聚焦，已改为仅文档标注，避免扩大改动面）。后续如需字段语义修正可单独提 PR。
4. **回滚**：若重分类效果不满意，`data/devmentor.db.bak-taxonomy-20260909` 为写库前整库备份。

### 9.6 稳定性实证 & 生成管线回归风险（重要）

**✅ 服务器启动不会撤销本次重分类（已实测）**
- 启动 dev server 时日志出现 `检测到种子版本变化…刷新内容表`，该刷新只触及 `chapters/sections` 内容表，不重算 `interview_questions.tech`。
- 启动后复核：总题数仍 6552、`部署与成本`=0、36 个 distinct `tech` 全部命中受控词表（A3 仍 PASS）。
- 根因：`db.ts` 迁移 v8 与 `seedIfEmpty` 的 tech 回填都只对 `tech IS NULL` 的行执行，且按版本号一次性跑；当前库 tech 非空、迁移版本已过，故不会重算。

**⚠️ 生成脚本的 classifyTech 与受控词表未对齐（前向回归风险，本次未处理）**
面试题 `tech` 的生成端有 4 套互相独立、且与 `techVocabulary.ts` 不一致的硬编码关键词表：

| 文件:行 | 产出标签示例（AI 模块） | 与词表差异 |
|---|---|---|
| `server/utils/db.ts:74` | `应用与部署` / `模型基础/训练` / `Embedding/向量` | 应为 `推理与部署` / `模型与训练` / `数据与标注` |
| `scripts/_reseed.mjs:51` | 同上风格 | 同上 |
| `scripts/gen-interview.mjs:107` | 同上（`TECH_MAP`） | 同上 |
| `scripts/gen-interview-roadmap.mjs` | 同上 | 同上 |

- **影响范围**：仅当用上述脚本**新增**面试题时会带入非词表标签，破坏 A3。对当前 6552 题的归类**无回滚效应**（已实测）。
- **修复建议（独立任务）**：将 4 处 `classifyTech`/`TECH_MAP` 改为从 `app/data/techVocabulary.ts` 派生（以词表为唯一取值域 + 别名映射），使新增题自动命中受控词表。涉及 4 个文件、属生成管线改造，需另立方案执行，不在本次归类任务范围内。
- **数据可复现性提示**：`interview_questions` 当前无受跟踪的种子 JSON（仅存于 gitignored 的 `data/devmentor.db`），属本项目既有数据架构；本次重分类同样落于该本地库，与既有数据一致。
