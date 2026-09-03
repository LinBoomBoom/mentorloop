# 学习中心空赛道补齐 —— 完成报告

日期：2026-09-03
范围：`Task 1`（面试题库 tech 列自愈）+ `Task 2`（13 个空赛道内容补齐）
状态：**全部完成**

---

## 一、Task 1 · DB `tech` 列自愈

v3 redesign 时遗留的自动打标把 AI 赛道 370 道题错标成 `容器/Docker`，导致题库里混入与 AI 无关的技术筛选项。

| 项 | 结果 |
|---|---|
| 修复方式 | `server/utils/db.ts` 新增 v21 迁移 `interview-ai-tech-docker-heal` |
| 作用域 | 严格限定 `track='ai' AND tech='容器/Docker'` → 归并到 `部署与成本` |
| AI 赛道 `容器/Docker` | 370 → **0** |
| devops 合法 `容器/Docker` | 79 道 **保留**（未被波及） |
| commit | `05a6264` |

选择迁移而非改种子：经核查 `seed-content.json` 里的 `容器/Docker` 全部落在 devops，AI 赛道为 0，
即脏数据只存在于存量 DB，用迁移可在任何环境（含桌面端新建库后回填）自愈。

---

## 二、Task 2 · 13 个空赛道补齐

v3 redesign 后学习中心隐藏了 13 个无章节赛道。现按官方文档全部补齐，**合计 109 章**。

### Batch 1 — `1924051`

| 赛道 | subtrack | 章数 | 官方来源 |
|---|---|---|---|
| fe-uniapp | `uniapp` | 10 | uni-app 官方文档 |
| op-k8s | `k8s` | 6 | Kubernetes 官方文档 |
| ai-algo | `algo` | 9 | PyTorch / scikit-learn 官方教程 |
| be-search | `searchmw` | 8 | Elasticsearch 官方指南 / Redis 官方文档 |

### Batch 2 — `6d285dd`

| 赛道 | subtrack | 章数 | 官方来源 |
|---|---|---|---|
| fe-mobile | `mobile` | 10 | MDN 响应式设计 / 移动 Web |
| fe-node | `nodefull` | 11 | Node.js 官方文档 |
| op-cloud | `cloud` | 10 | AWS 文档 / Microsoft Learn |
| op-sec | `secops` | 5 | OWASP / CISA |

### Batch 3 — `ac1ece1`

| 赛道 | subtrack | 章数 | 官方来源 |
|---|---|---|---|
| be-data | `bigdata` | 6 | Apache Spark / Kafka / Hive 官方文档 |
| be-game | `gameserver` | 7 | Colyseus 官方文档 / Node.js WebSocket |
| be-test | `sdet` | 14 | Playwright 官方文档 |
| ai-data | `traindata` | 8 | HuggingFace Datasets 官方文档 |
| ai-edge | `edgeai` | 5 | 端侧推理官方资料 |

---

## 三、本轮修复的遗留问题

1. **`chapterSubtracks` 未落盘**：Batch-1 的 `fe-uniapp`、`op-k8s` 此前编辑未持久化，学习中心仍隐藏。
   本轮全量 grep 复核后发现并补齐。
2. **展示名与管线 label 不一致**：`SUBTRACK_DISPLAY.searchmw` 为 `搜索/中间件`，而章节标题实际为
   `搜索中间件 · X`，已统一为 `搜索中间件`。
3. **过时注释清理**：移除 3 处「暂无内置章节 / 学习中心隐藏」注释（113/138/190 行）。

---

## 四、验证结果

| 校验项 | 结果 |
|---|---|
| gen-learn 管线失败数 | **0**（13 赛道全部成功） |
| DB 章节 subtrack 单一性 | 13/13 均为预期单一值 |
| seed ↔ DB 章节数一致性 | 243 章，13 子方向**零差异** |
| SSR 复查（13 个赛道页） | **13/13 PASS**：HTTP 200、章节真实渲染、无空壳占位 |
| 工作树 | 干净 |

SSR 章节渲染计数（页面 3 次/章，÷3 即实际章数）：
`fe-mobile 30`、`fe-uniapp 30`、`fe-node 33`、`be-data 18`、`be-game 21`、`be-search 24`、
`be-test 42`、`op-k8s 18`、`op-cloud 30`、`op-sec 15`、`ai-algo 27`、`ai-data 24`、`ai-edge 15`。

---

## 五、提交与后续

| commit | 内容 |
|---|---|
| `05a6264` | fix(interview): v21 迁移自愈 AI 赛道 容器/Docker 脏标签 |
| `1924051` | feat(learn-center): Batch-1 补齐 4 个空赛道章节 |
| `6d285dd` | feat(learn-center): Batch-2 补齐 4 个空赛道章节 |
| `ac1ece1` | feat(learn-center): Batch-3 补齐最后 5 个空赛道章节 |

`git push` 需本地执行（无头环境无法弹凭据）。

### 已知内容取舍
- **be-game** 的权威来源集中在 Node 生态（Colyseus + Node.js WebSocket）。若需覆盖 Java/C++ 游戏服务端
  体系，需另找权威来源并新增 subtrack，不能由 AI 补写。
- 各赛道章数由官方文档真实结构决定，未做配额对齐（如 be-test 14 章因 Playwright 官方指南本身体量大）。
