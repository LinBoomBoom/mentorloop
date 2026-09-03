# MentorLoop Phase 0 · 内容基座补齐（重定范围方案）

> 状态：✅ 已完成（2026-09-03 收口，C1/C2/C3 全部落地）
> 日期：2026-09-03
> 背景：原记忆「后端/运维知识树仅 5 章/11 知识点、试卷仅 1 套」是 **回填前** 的旧数据。本次先实测盘点，发现现状已变，故重定范围。

---

## 一、现状量化（实测，非凭记忆）

### 1. 知识树（chapters）—— 共 280 章
按模块/赛道章数（subtrack 聚合）：

| 模块 | 赛道 | 当前章数 | 评价 |
|---|---|---|---|
| backend | be-web (java) | 7 | 偏薄 |
| backend | be-micro (system+micro+mq) | 7 | 偏薄 |
| backend | be-db (mysql) | 12 | 接近 |
| backend | be-data (bigdata) | 6 | 偏薄 |
| backend | be-game (gameserver) | 8 | 中 |
| backend | be-search (searchmw) | 8 | 中 |
| backend | be-test (sdet) | 14 | 充足 |
| devops | op-trad (linux+network) | 5 | 偏薄 |
| devops | op-sre (sre) | 7 | 偏薄 |
| devops | op-devops (docker+cicd) | 12 | 接近 |
| devops | op-k8s (k8s) | 6 | 偏薄 |
| devops | op-cloud (cloud) | 10 | 中 |
| devops | op-sec (secops) | 5 | 偏薄 |
| frontend | 多数赛道 | 10–14 | 充足（对标基准） |
| ai | 多数赛道 | 5–9 | 中 |

**结论**：知识树总量已不缺，真实短板是 **backend/ops 多个赛道深度不足**（5–8 章 vs 前端 10–14 章）。

### 2. 面试题（interview_questions）—— 共 6565 道
- 已按 v3 方向打标（`subtrack`=方向 id，如 `be-web`）：约 **2534 道**（每方向 69–134 道，深度充足）。
- **遗留未打标（`subtrack`=NULL）：4031 道**，其 `track` 列有值：
  - backend 1476 / frontend 1180 / devops 854 / ai 521。
  - 抽样均为真实好题（如「CSS 盒模型与 BFC」「CSS 优先级与层叠规则」），**非 padding**。
  - 因 v3 题库按 `subtrack` 过滤，这 4031 道在当前 UI 下完全不可见。
- **结论**：面试题数量充足，真正缺口是 **4031 道遗留题未映射进 v3 方向体系**，等于"有货没上架"。

### 3. 试卷（exam_sets）—— 共 19 套，seed↔DB 已一致
- frontend 5 / backend 5 / devops 5 / ai 4（含 basic/inter/vip 档）。
- 均为**模块级**（track=模块），非方向级（track=be-web 之类）。
- **结论**：试卷并非"仅 1 套"，已具基础；差距是**未下沉到方向级**，且 VIP 深度可加。

---

## 二、重定范围的 Phase 0（C1 / C2 / C3）

| 子项 | 真实缺口 | 推荐做法 | 是否主战场 |
|---|---|---|---|
| **C1 知识树深度** | backend/ops 7 个赛道仅 5–8 章 | 复用 `gen-learn.mjs` 双写管线（官方文档→章节），把薄赛道补到 ~12–14 章 | ✅ 主战场 |
| **C2 面试题上架** | 4031 道遗留题 `subtrack`=NULL 不可见 | **确定性回填**（见技术方案），无需 LLM、零成本、可幂等重跑 | ✅ 主战场（性价比最高） |
| **C3 试卷下沉** | 试卷为模块级，未到方向级 | 在方向级题池够深的赛道，用现有题池**组装方向级试卷**（轻量扩展） | ⚠️ 轻量/可延后 |

> 说明：原"重建知识树+面试题+试卷"的前提（三块都缺）已不成立。本方案**聚焦真实缺口**，避免对已有充足内容做无谓重生成。

---

## 三、技术方案

### C1 · 知识树深度补齐（复用既有管线）
- 复用 `scripts/gen-learn.mjs` 的 `SUBTRACKS` 注册表 + `run <id>`（Deepseek plan+write 出草稿）→ `apply <id>`（双写 `seed-content.json` + `devmentor.db`，`INSERT OR IGNORE`）。
- 目标赛道与增量（对齐官方文档，禁止虚构）：
  - `be-web` 7→13（Java/Spring 深度）、`be-micro` 7→13（系统设计/微服务/消息队列）、`be-data` 6→12（数仓/BI）
  - `op-trad` 5→11（Linux/网络）、`op-sre` 7→12（SRE/可观测）、`op-k8s` 6→12（K8s 进阶）、`op-sec` 5→11（安全运维）
  - 视情况 `be-db` 12→14。
- 每个赛道 = 1 个 `SUBTRACKS` 条目（prefix 不复用已有，避免 `INSERT OR IGNORE` 跳过）；生成后强制 grep 复核 `learningTaxonomy.ts` 的 `chapterSubtracks` 已暴露（踩过的坑：Edit 未落盘）。
- 校验：seed↔DB 章数同数；SSR 复查取真实 DB title 前缀做 needle。

### C2 · 4031 遗留题上架（确定性回填，v22 迁移）
- 新增 `MIGRATIONS` v22 `interview-legacy-subtrack-backfill`：
  - 对 `subtrack IS NULL` 的行，按 `(track 模块, tech)` 推导 `subtrack`（方向 id）：
    1. `tech` → 反查 `SUBTRACK_DISPLAY` 得 subtrack 值 `S`；在 **同模块** `LEARNING_TAXONOMY[track]` 中找 `chapterSubtracks` 含 `S` 的赛道 → `subtrack = 该 track.id`。
    2. 兜底：同模块内 `techNames` 含 `tech` 的赛道 → 取其 `track.id`。
    3. 仍无匹配（如 `综合`）：保留 NULL，单独清单交人工。
  - 幂等：仅处理 `subtrack IS NULL`；已登记版本不重跑；空表跳过。
- **优势**：纯确定性映射，零 LLM 成本、可重跑、可审计；4031 道真实题一键上架到对应方向。
- 风险：少数 `tech`（如「系统设计」跨多赛道）会落到模块内某一条赛道——可接受的近似（至少可见），不丢题。

### C3 · 试卷下沉到方向级（轻量）
- 在方向级题池深的赛道（如 `be-web` 134 道、`fe-web` 123 道、`op-k8s` 100 道），从现有 `interview_questions`（含 C2 上架后的遗留题）**组装方向级试卷**（每方向 1 套基础 + 1 套进阶）。
- 组装方式：脚本从题池按 tech 分布抽样组卷，写入 `exam_sets` + `exam_choices`（复用 db.ts 既有表结构）。
- 若用户选择"延后 C3"，则 19 套模块级试卷维持现状，不影响 C1/C2 上线。

---

## 四、工作流拆解（分阶段、可逐步审查）

- **阶段 0 · 对齐确认**：用户确认本方案范围与下方决策点 → 开工。
- **阶段 1 · C2 上架（先于 C1，性价比最高、零成本）**
  1. 写 v22 迁移 + 裸脚本 `(dry-run)` 统计将上架/将留 NULL 的数量。
  2. `apply` 回填；校验 `subtrack IS NULL` 从 4031 降到接近 0。
  3. 抽样核对映射正确性（如 `tech=CSS` → `fe-web`）。
  4. 单独 commit（migration + 校验脚本）。
- **阶段 2 · C1 知识树深度（分两批，每批可审查）**
  5. 在 `gen-learn.mjs` 注册 7 个薄赛道的 `SUBTRACKS` 条目（prefix 不复用）。
  6. 批量 `run` → 人工/自动抽查草稿质量 → `apply` 双写。
  7. grep 复核 `learningTaxonomy.ts` `chapterSubtracks` 暴露；seed↔DB 章数同数；SSR 复查。
  8. 按模块 commit（C1-backend / C1-devops）。
- **阶段 3 · C3 试卷下沉（可选，按决策）**
  9. 方向级组卷脚本；写入 exam_sets/choices；seed↔DB 一致。
  10. commit。
- **阶段 4 · 收口**
  11. 全量回归（章节/面试题/试卷计数、SSR、类型检查）；更新 `docs` 与 memory。

---

## 五、风险与对策
- **Edit 未落盘**：taxonomy 改动一律 grep 复核（已踩坑，记入 memory）。
- **Deepseek 402/429**：大批量 `run` 前先 `fetch /chat/completions` 探活；遇限频分段重试。
- **prefix 冲突致 `INSERT OR IGNORE` 静默跳过**：新赛道用全新 prefix，不复用已有。
- **C2 映射近似**：跨赛道 tech 落点不完美但保证可见；NULL 残留交人工清单。
- **桌面端建库**：C2 回填需同步进 `seed-content.json` 的 interview 结构（或直接走 migration，桌面端首启 `seedIfEmpty` 已覆盖）——需确认桌面端读取路径（见决策点）。

---

## 六、待用户拍板的决策点
1. **Phase 0 范围**：(A) C1+C2+C3 全做【推荐】 / (B) 先 C1+C2，C3 延后 / (C) 仅 backend/ops 不做全模块。
2. **C2 方法**：(A) 确定性回填（零成本、可重跑）【推荐】 / (B) LLM 精分类（更准但耗额度）。
3. **C3 试卷**：(A) 下沉到方向级（轻量组卷）【推荐】 / (B) 维持模块级 19 套不动。
4. **C2 桌面端同步**：遗留题回填是否需同时写 `seed-content.json`（保证桌面端首启即含），还是仅改 dev DB（桌面端走 `seedIfEmpty` 重建时再由 seed 覆盖）。

> 确认后我将按工作流分阶段执行，每阶段单独 commit、可审查。

---

## 七、完成状态（2026-09-03 收口）

### C2 · 遗留面试题上架 ✅
- 新增 `server/utils/interviewSubtrackMap.ts`（从 `learningTaxonomy` 派生 `(模块,tech)→方向` 映射，单一真源）；`server/utils/db.ts` MIGRATIONS 追加 **v22** 幂等迁移。
- dev DB `subtrack IS NULL`：**4031 → 0**；seed JSON **6565/6565** 含方向标签（桌面端首启 `seedIfEmpty` 一致）。
- 方向分布健康（fe-web 1124 / be-web 801 / be-micro 754 …），关键映射已抽样核对（MySQL→be-db、Linux→op-trad、Kubernetes→op-k8s、RAG/Agent→ai-app 等）。
- 提交：`195512a`（映射+迁移）、`e3e6a0f`（seed 回填）。

### C1 · 知识树深度 ✅
- 复用 `gen-learn.mjs` 双写管线，新增 7 个薄赛道 `SUBTRACKS` 条目（全新 prefix 防冲突）。
- **backend 组**（提交 `39ecfdc`）：be-web 8章/36节 + be-micro 10章/31节 + be-data-2 4章/20节（22章/87节）。
- **devops 组**（提交 `d0f9633`）：op-trad 5章/24节 + op-sre-2 6章/22节 + op-k8s-2 10章/41节 + op-sec-2 12章/36节（33章/123节），含 op-trad network 子方向空壳修正。
- 新增 **55 章 / 210 节**，全部 100% 锚定官方源、节内容最短 2369 字、零空壳；`subtrack` 对齐 `learningTaxonomy.chapterSubtracks`，学习中心自动可见。

### C3 · 方向级试卷 ✅
- 新增 `scripts/gen-exam.mjs`：为 10 个方向（be-web/be-micro/be-data/be-db/op-trad/op-sre/op-k8s/op-sec/fe-web/ai-app）生成 **基础+进阶** 选择题卷（各 15 题，共 **20 套 / 300 题**）。
- 复用现有 `exam_sets`/`exam_choices` 体系，`track` 填模块级、方向名写入 `name`，前端零改动即见可用。
- 修复：原 INSERT 漏写 `explain` 列，已从 seed 回填 554 行，DB 新卷 **300/300 题有解析**。
- SSR 复查：`/api/exam/sets` 总数列 39（原19+新20），新卷 20/20 命中、每套 15 题、track 分布正确。
- 提交：`b584d9d`（脚本）、`88c375a`（seed 数据）。

### 收尾
- 全量回归通过；dev server 已关闭，无遗留后台进程。
- **待用户本地 `git push`**：本阶段新增提交 `195512a / e3e6a0f / 39ecfdc / d0f9633 / b584d9d / 88c375a`（共 6 个），无头环境无法代推。
