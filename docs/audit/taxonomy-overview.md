# 四大模块内容严格归类 · 执行概览（含第二阶段）

> 日期：2026-09-09｜状态：✅ 归类层 7/9 + 防回归闸与字段语义修复完成
> commits：`63390ce`（归类归一）→ `6cad6f4`（生成脚本过闸）→ `e7f0a0c`（D4 改名 + 功能失效修复）→ `b99b69f`（空库初始化修复）

## 一、归类归一（第一阶段）

对「前端 / 后端 / 运维 / AI 工程」四大模块的面试题 `tech` 做严格归一，建立唯一权威取值域，打通 DB → 受控词表 → UI 筛选器全链路。

| 交付物 | 说明 |
|---|---|
| `app/data/techVocabulary.ts`（新） | 受控技术词表（含别名、归属模块、赛道白名单），`tech` 唯一取值域 |
| `scripts/audit-taxonomy.mjs`（新） | 一致性体检 A1–A9 + CSV 导出 |
| `scripts/taxonomy-reclassify.mjs`（新） | 规则重打标：题干命中 → 领域继承 → 兜底；默认 dry-run |
| `scripts/sync-tech-names.mjs`（新） | 由实际标签反向生成 `techNames`，根治空筛选 |
| `app/data/learningTaxonomy.ts`（改） | `techNames` 同步 |

**结果**：重打标 895 题（占 6552 的 13.7%）；脏标签 `部署与成本` 431→0、`综合` 9→0；越界项 2→0；
195 个二级筛选项 **0 空筛选**；全库 36 个 distinct `tech` 全部命中词表；体检 3/9 → **7/9**。

## 二、P0 防回归闸（第二阶段 · commit `6cad6f4`）

4 套硬编码 `classifyTech`/`TECH_MAP`（`db.ts`、`_reseed.mjs`、`gen-interview.mjs`、`gen-interview-roadmap.mjs`）
产出非词表标签，一旦用 gen 脚本补题就会破坏 A3。

**做法**：不推翻已调优的关键词评分逻辑，而是在**写入前**统一过闸——词表新增 `TECH_RESOLVE`/`resolveTech`/`canonicalizeTech`
（含 31 条 legacy 别名映射），4 个写入点全部改为 `canonicalizeTech(...)`；gen 脚本提示词候选技术名同步改规范名。
`部署与成本` 按设计不做直映（须按题面细分）。

## 三、D4 改名 + 连带修复的功能失效（commit `e7f0a0c`）

`sections.direction` 存的实际是小节学习目标（"能……"，1802/1802），字段名严重误导，
**且该误导已造成真实功能失效**——多处代码拿赛道 id（`frontend/backend/devops/ai`）匹配该列，**查询恒返回 0 行**：

| 位置 | 影响 |
|---|---|
| `db.ts` `findBestSection` | 题 → 小节自动关联永远返回 `null` |
| `studyplan.ts` `chapterIndex`/`chapterKeywordIndex` | 学习计划章节深链全部降级为纯文本，且交给 LLM 的候选章节列表为空 |
| `admin.ts` `listSections` | 后台按方向筛选小节永远为空 |

**修复**：迁移 v34 `RENAME COLUMN direction TO objective`（保留数据、幂等）；3 处方向过滤改按
`chapters.module_id = ?`。实测命中 **0 → 587 / 609 / 341 / 265**。
写入侧保留 `s.objective ?? s.direction` 回退，历史一次性脚本仍可用。

## 四、顺带修复：全新空库初始化崩溃（commit `b99b69f`，既有缺陷）

`seedIfEmpty` 无条件 `set.written.forEach(...)`，但 57 套试卷中 **38 套本就没有问答题**
（缺 `written` 是合法数据）→ 全新空库初始化抛 `TypeError`、首次启动即失败。
既有库因跳过 seed 而未暴露。改为 `(set.written || [])`；实测空库已能完整 seed 至 1.0.4。

## 五、测试与验证

- `tests/taxonomy-vocabulary.test.mjs`（新，14 断言）：词表自洽、31 条 legacy 标签 100% 可解析、
  `canonicalizeTech` 封闭性、闸口存在性、库内 `tech` ⊆ 词表、脏值清零。
- `tests/sections-objective.test.mjs`（新，7 断言）：列名不回退、禁止再用学习目标列做方向过滤、
  迁移语义不得退化为空操作、改名后数据不丢。
- 相关测试子集 **72/72 通过**（db-fk / m5-content / sitemap / skill-roadmap / skill-mastery / 上述两个新测试）。
- 运行时实证：dev server `/api/health` 200；`/api/interview/{module}` 的 `techOptions` 全为受控词表项；
  `/api/modules/frontend` 返回 `objective`、不再有 `direction`。

## 六、剩余（均属 D3 内容生成，需另立方案）

- **A4**：`be-db` 宣称 4 种数据库，实际 90% 是 MySQL（PostgreSQL/NoSQL 0 题）。
- **A5**：16 个赛道题量 < 100。
- **`iq.skill` 仅 38.7% 填充**：392 个细粒度取值、每类约 5 个样本，规则填充不可行（需 LLM）。
  注：skill 在 UI 仅作展示标签（`v-if="item.skill"`），**不是筛选项**，故不属"点了没题"类功能缺陷。
- **待定**：`dbredis`(be-db) 与 `redis`(be-search) 显示名同为「Redis」，是否改名需用户定命名。

## 数据落点与回滚

改动落在 gitignored 的 `data/devmentor.db`（本项目既有数据架构，面试题无受跟踪种子 JSON）。
备份：`data/devmentor.db.bak-taxonomy-20260909`（重打标前）、`data/devmentor.db.bak-d4-20260909`（改名迁移前）。

## 复跑方式

```bash
npm run taxonomy:audit      # 一致性体检（A1-A9）
npm run taxonomy:reclassify # dry-run 预览重打标（--apply 写库）
npm run taxonomy:sync       # 同步 techNames
npx vitest run tests/taxonomy-vocabulary.test.mjs tests/sections-objective.test.mjs
```
