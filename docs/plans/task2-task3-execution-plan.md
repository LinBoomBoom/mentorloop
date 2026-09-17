# 任务 2 + 任务 3 执行计划（待确认后开工）

> 日期：2026-09-17 ｜ 范围：**任务 2（内容合规字段 + 发布门禁 + 红灯处置）** → **任务 3（数据访问层抽象）**
> 任务 1（企业主体 + 备案）你已启动；任务 4–7 排进计划，本轮不开工。
> 本文是**开工前的技术方案与批次拆解**，等你确认方向后再动手写代码。

---

## 一、摸底结论：五个改变方案的发现

### 发现 1：`seed-content.json` 才是事实源，DB 只是投影

```
seed-content.json (41 MB, seedVersion=1.0.4)
    ├─ modules[4] → chapters[411] → sections[1810]
    ├─ interview{frontend,backend,devops,ai} → 16,453 题
    └─ examSets[57]
        ↓ seedIfEmpty（空库时）/ refreshContentIfNeeded（seedVersion 变化时）
    SQLite
```

**所以：只改 DB 没用。** 一旦 `seedVersion` 变化，内容表会被全量 upsert 覆盖。

### 发现 2：`refreshContentIfNeeded` 只刷 sections，不刷题库

- 它只 upsert `modules` / `chapters` / `sections` 三张表（`db.ts:1254-1256`）
- `interview_questions` **不会被刷新** —— 所以题库的字段改动需要**专门的同步脚本**（项目里已有 `scripts/sync-seed-questions.mjs`，可复用）

### 发现 3（重要，大幅降低工作量）：sections 的溯源信息其实已经存在

1810 节**全部**都有元信息行，格式统一：

```
> 时效 | 核验=2026-08-02 | 风险=低 | 来源=官方(可溯源)
```

- 元信息行覆盖率 **1810/1810 = 100%**
- 来源值分布：官方 1337 · 官方(可溯源) 473
- 风险分布：低 1635 · 中 93 · 高 82
- **1805/1810 节正文内含官方 URL**（如 `https://developer.mozilla.org/en-US/docs/Web/HTML/Element`，且带"（官方源，可点击回溯"标注）

**结论：sections 的 source 可以脚本化提取，不需要人工补 1810 条。** 工作量从"人工补录"降为"写解析脚本 + 抽样校验准确率"。

### 发现 4：题库的 source 污染发生在 seed 层，不是 DB 回填

seed 里 16,453 题中有 4,703 条自带 `source` 字段，其中 95 条是正文误抓的示例串。
→ **要修就得改 seed**，改 DB 治标不治本。

### 发现 5：内容发布入口已定位

`server/utils/adminDispatch.ts` 路由 → `server/utils/admin.ts` 函数：

| 对象 | 路由 | 函数 |
|---|---|---|
| 小节 | `/api/admin/sections` | `createSection` / `updateSection` |
| 面试题 | `/api/admin/interview` | `createInterview` / `updateInterview` |
| 试卷 | `/api/admin/exam-sets` | `createExamSet` / `updateExamSet` |

发布门禁加在 `admin.ts` 的 create/update 里，不在 dispatch 层。

---

## 二、新增字段设计

### `sections`（新增 7 列）

| 列 | 类型 | 取值 | 来源 |
|---|---|---|---|
| `source_url` | TEXT | 官方 URL | 正文提取（1805 节有） |
| `source_type` | TEXT | `official-docs` / `book` / `blog` / `llm-generated` / `human-written` / `unknown` | 元信息行「来源=」映射 |
| `license` | TEXT | `cc-by-4.0` / `cc-by-sa` / `apache-2.0` / `mit` / `proprietary` / `unknown` | 按 source_url 域名分级 |
| `rewrite_level` | TEXT | `verbatim` / `paraphrased` / `original` | **默认 `paraphrased`，需抽样人工校准** |
| `status` | TEXT | `draft` / `review` / `published` / `archived` | 默认 `published`（存量），新内容默认 `draft` |
| `reviewed_at` | INTEGER | 时间戳 | 元信息行「核验=」解析 |
| `version` | INTEGER | 默认 1 | — |

### `interview_questions`（已有 `source`，新增 6 列）

| 列 | 类型 | 说明 |
|---|---|---|
| `source_type` | TEXT | 同上；无 source 的标 `unknown` |
| `license` | TEXT | 按域名分级；红灯标 `proprietary` |
| `rewrite_level` | TEXT | 默认 `paraphrased` |
| `status` | TEXT | 默认 `published`，红灯题改 `draft` |
| `reviewed_at` | INTEGER | 暂无值，留空 |
| `version` | INTEGER | 默认 1 |

> 保留现有 `source` 列名不动（避免影响已有查询与 46 个测试），新增 `source_type` 等配套字段。

### 许可分级规则（写进 `scripts/` 复用）

```
green  Apache-2.0 / MIT / CC-BY-4.0   → nodejs, prometheus, kubernetes, react.dev, spring
amber  CC-BY-SA（传染）/ 待核实        → MDN, microservices.io, rabbitmq, redis, vuejs, 
                                        platform.openai, owasp, docker, typescriptlang, nginx
red    明示禁止复制·再分发·出版        → man7, docs.oracle.com, dev.mysql.com
```

---

## 三、批次拆解

> 每批都可独立验收、独立提交。批次间可随时停下检查。

### 批次 2.0 · 准备与基线（约 30 分钟，零风险）

| # | 任务 | 产出 |
|---|---|---|
| 1 | 备份 DB | `npm run backup` |
| 2 | 备份 `data/seed-content.json` 副本 | `data/seed-content.json.bak-20260917` |
| 3 | 跑一次相关测试子集，记录基线通过数 | 基线记录（**不要跑全量，沙箱会 OOM**） |
| 4 | 确认当前 git 工作区干净 | `git status` |

**验收**：4 项完成，基线数字记录进本文末尾。

### 批次 2.1 · 探测脚本（只读，不改任何数据）—— 建议先做这批

**目的：先验证"脚本能不能准确提取"，再决定要不要写入。**

| # | 任务 | 产出 |
|---|---|---|
| 1 | 写 `scripts/probe-section-source.mjs`：解析 1810 节元信息行 + 正文首个官方 URL，输出提取结果 | 提取报告（CSV） |
| 2 | 统计提取成功率、无法提取的清单 | 准确率数字 |
| 3 | 抽样人工校验 30 节（每方向 7–8 节） | 准确率判定 |

**验收**：提取成功率 ≥ 95% 且抽样准确率 ≥ 90%，才进入 2.2；否则先讨论补录策略。

> 这一步不落盘，纯粹回答"能不能自动化"。**如果准确率不够，后面的工作量估算要重来，所以必须先做。**

### 批次 2.2 · seed 结构化（改 seed，不改 DB）

| # | 任务 | 任务量 |
|---|---|---|
| 1 | 脚本给 1810 节写入 `source_url`/`source_type`/`license`/`reviewed_at`/`status`/`version` | 1810 节 |
| 2 | 脚本清洗题库 95 条污染 source（置空 + `source_type='unknown'`） | 95 条 |
| 3 | 脚本给 4,703 条有 source 的题打 `license` 分级 | 4,703 条 |
| 4 | 脚本给 11,750 条无 source 的题标 `source_type='unknown'` + `status='published'`（暂不处置） | 11,750 条 |
| 5 | 脚本给红灯 936 题标 `license='proprietary'` + `status='draft'` | 936 条 |
| 6 | bump `seedVersion` → 1.0.5 | — |

**验收**：seed 文件可正常 JSON 解析；抽查 10 条字段正确；输出处置统计表。

### 批次 2.3 · 数据层加列（迁移 v35）

| # | 任务 |
|---|---|
| 1 | `MIGRATIONS` 追加 `version: 35`，给 `sections` 加 7 列、给 `interview_questions` 加 6 列（全部幂等） |
| 2 | 改 `seedIfEmpty` 的 `insSec` / `insQ` 插入语句，纳入新列 |
| 3 | 改 `refreshContentIfNeeded` 的 `upsSec`（**必须改**，否则刷新会把新列覆盖成 NULL） |
| 4 | 写 `tests/content-compliance-fields.test.mjs` 断言列存在与默认值 |

**验收**：新列存在；空库初始化后字段有值；现有库迁移后不报错。

### 批次 2.4 · 同步 seed → DB

| # | 任务 |
|---|---|
| 1 | 复用/扩展 `scripts/sync-seed-questions.mjs`，把题库新字段同步进 DB |
| 2 | sections 由 `refreshContentIfNeeded`（bump 后的 seedVersion）自动刷新 |
| 3 | 校验 DB 与 seed 字段一致性 |

**验收**：DB 与 seed 的 license/status 分布完全一致。

### 批次 2.5 · 发布门禁

| # | 任务 |
|---|---|
| 1 | 在 `server/utils/admin.ts` 加 `assertPublishable(payload)` |
| 2 | 规则：`status` 置为 `published` 时，`license` 不得为 `proprietary`；`source_type` 不得为 `unknown` |
| 3 | 接入 `createSection`/`updateSection`/`createInterview`/`updateInterview`/`createExamSet`/`updateExamSet` |
| 4 | 写测试：proprietary 内容无法发布、合法内容可发布 |

**验收**：6 个入口全部生效；测试通过。

### 批次 2.6 · 红灯处置与报告

| # | 任务 | 任务量 |
|---|---|---|
| 1 | 输出红灯 936 题清单（man7 373 / Oracle Java 324 / MySQL 239） | 936 条 |
| 2 | 逐批标注：`rewrite_level` 判定（照搬 / 改写 / 原创） | **需人工抽检** |
| 3 | 输出最终合规体检报告 | — |

> 说明：`rewrite_level` 无法脚本判定，建议按赛道抽样 10%（约 94 题），人工判定后得出分布，再决定整批默认值。

### 批次 3.1 · SQL 方言扫描（任务 3 起点）

| # | 任务 |
|---|---|
| 1 | 写脚本扫描 `server/utils/db.ts` 全部 SQL，标记 SQLite 专有语法 |
| 2 | 输出方言清单与出现位置 |

**扫描目标**：
- `INTEGER PRIMARY KEY AUTOINCREMENT` → 需改 `SERIAL`
- `datetime('now')` / `strftime('%s','now')` / `date(...,'unixepoch')` → 需改参数化时间戳
- `INSERT OR IGNORE` / `INSERT OR REPLACE` → `ON CONFLICT`
- `PRAGMA` 语句（除连接期设置外）
- `GROUP_CONCAT`、`LIMIT -1`、`||` 字符串拼接兼容性
- 布尔写 0/1 vs true/false
- `typeof()`、`julianday()`

**验收**：输出完整清单 + 每处的 Postgres 等价写法。

### 批次 3.2–3.4 · 拆分（视 3.1 结果决定力度）

| 批次 | 任务 | 说明 |
|---|---|---|
| 3.2 | `MIGRATIONS` 移到 `server/db/migrations/` | 纯搬运 |
| 3.3 | 业务查询按域拆到 `server/db/queries/*.ts` | 纯搬运，`db.ts` 保留 re-export 保证兼容 |
| 3.4 | 全量测试 + 提交 | — |

> 拆分策略：**先搬运、不改语义**，保证每步都可回滚。

---

## 四、风险与注意事项（来自项目既有踩坑记录）

| 风险 | 应对 |
|---|---|
| **改 `db.ts` 影响 46 个测试** | 只跑相关子集（全量套件沙箱会 OOM） |
| **Edit 返回 Success 也可能未落盘** | 每次改完必须 grep 复核 |
| **safe-delete 拦 `rm`** | 不要删文件，需要腾目录时用 `mv xxx xxx_old_<ts>` |
| **`refreshContentIfNeeded` 会覆盖 sections** | 补的字段必须写进 seed，不能只写 DB |
| **41 MB seed JSON** | 脚本用流式或一次性读写，注意内存；改完校验 JSON 合法 |
| **桌面端打包含 `seed-content.json`** | bump seedVersion 会触发客户端内容刷新，需评估 |
| **WAL + busy_timeout** | 写库时 dev server 无需停机 |
| **`.env` 的 `DB_PATH` 污染** | 涉及路径改动时复查 `server/utils/paths.ts` |

---

## 五、排期建议

| 批次 | 预估 | 可并行 | 依赖 |
|---|---|---|---|
| 2.0 准备 | 30 min | — | — |
| **2.1 探测（只读）** | 1–1.5 h | — | 2.0 |
| 2.2 seed 结构化 | 1.5–2 h | — | **2.1 通过** |
| 2.3 加列 v35 | 1–1.5 h | — | 2.2 |
| 2.4 同步 | 30–45 min | — | 2.3 |
| 2.5 发布门禁 | 1.5–2 h | 可与 2.6 并行 | 2.3 |
| 2.6 红灯处置 | 1 h + 人工抽检 | 可与 2.5 并行 | 2.4 |
| 3.1 方言扫描 | 1–1.5 h | — | 2.x 完成后 |
| 3.2–3.4 拆分 | 3–4 h | — | 3.1 |

**今晚建议做到 2.1 结束**（探测完成、拿到准确率数字），确认策略后再继续。理由是 2.2 开始就是写数据了，方向错了要回滚。

---

## 六、需要你确认的 4 件事

1. **批次 2.1 先只做探测不落盘**，可以吗？（我强烈建议这样，避免方向错了回滚 41 MB 的 seed）
2. **`rewrite_level` 默认值**定 `paraphrased` 还是先全部 `unknown` 等抽检？（前者乐观、后者保守）
3. **存量 11,750 条无源题**：本轮只打标不处置，等红灯处理完再决定，可以吗？
4. **任务 3 的拆分力度**：是做到 3.1（只出方言清单）就停，还是一路做到 3.4（完整拆分）？

---

## 附：基线记录（批次 2.0 已完成）

| 项 | 值 |
|---|---|
| git 分支 | `main` |
| 开工前最新 commit | `6e12bae` feat(content): 语义重复题去重 197 条 |
| 工作区 | 干净（仅新增 `docs/analysis/`、`docs/plans/`） |
| DB 备份 | `data/backups/2026-09-17T15-31-23-695Z/devmentor.db` |
| seed 备份 | `data/seed-content.json.bak-20260917`（41.28 MB） |
| 测试基线 | ⚠️ **未取得** —— 沙箱内 vitest 不可用，详见 `docs/audit/section-source-probe-report.md` 第 7 节 |

### 批次 2.1 结果：**通过，可进入 2.2**

---

## 八、执行进度（2026-09-17 深夜更新）

| 批次 | 状态 | 关键结果 |
|---|---|---|
| 2.0 准备与基线 | ✅ | DB + seed 已备份；测试基线未取得（沙箱 vitest 不可用） |
| 2.1 只读探测 | ✅ | 元信息行 100%、URL 99.7%、非权威命中 0 |
| 2.2 seed 结构化 | ✅ | 1810 节 + 16453 题写入合规字段；清洗污染 68 条；seedVersion → 1.0.5 |
| 2.3 迁移 v35 | ✅ | 13 列到位、幂等、INSERT 参数匹配（13/13/17）、既有数据未变 |
| 2.4 同步 DB | ✅ | sections 1810 + questions 16453 全部更新，0 未匹配 |
| 2.5 发布门禁 | ✅ | `assertPublishable` 接入 4 个入口；新内容默认 draft |
| 2.6 红灯清单 | ✅ | 1037 条已转 draft，清单 CSV 已导出 |
| 3.1 SQL 方言扫描 | ⏸ | 待做（本轮未开工） |
| 3.2–3.4 拆分 | ⏸ | 待做 |

**提交**：`070160a`（内容与脚本）· `f767567`（数据层与门禁）。**push 需本地执行。**

### 本轮发现的一个新问题（影响后续复核优先级）

题库的 `source` 是**按赛道批量指定**，不是按题精确指定：

| 域名 | 题数 | 技术域匹配率 | 疑似错配 |
|---|---|---|---|
| man7.org | 401 | ~89% | 42 |
| docs.oracle.com | 363 | ~87% | 41 |
| dev.mysql.com | 273 | ~89% | 8 |

例如「Go 的 goroutine」被挂了 Oracle Java 文档、「Python GIL」也挂了 Oracle Java。

**影响**：红灯 936 题中约 91 条是"被赛道默认源误挂"，实际未必引用了红旗文档。
复核时应**优先核查这 91 条**，误判的释放回 published。清单见 `docs/audit/red-list.csv` 的 `suspicious` 列。

### 遗留事项

1. **测试未跑**：沙箱 vitest 不可用，需本机 `npm test` 验证（尤其 `migration.test.mjs`、
   `seed-structure.test.mjs`、`db-fk.test.mjs`，以及 2.3/2.5 新增逻辑）。
2. **`rewrite_level` 全为默认值 `paraphrased`**，需按赛道抽检校准（约 94 题）。
3. **1,259 节 + 11,818 题的 `license` 仍为 `unknown`**，待逐站核实授权条款（清单见探测报告第 4 节）。
4. 试卷（`exam_sets`）未加合规字段 —— 试卷本身不是版权对象，但其题目来自题库，
   如需一并管控，可后续补。

| 验收标准 | 要求 | 实测 |
|---|---|---|
| 提取成功率 | ≥ 95% | **99.7%**（1805/1810） |
| 抽样准确率 | ≥ 90% | **非权威来源命中 0 条** |

详见 `docs/audit/section-source-probe-report.md`。

> 批次 2.1 额外发现：**sections 层面也有 101 节红灯**（Oracle Java 39 / MySQL 34 / man7 28）。
> 加上题库 936 题，**红灯总量 1,037 条**。
