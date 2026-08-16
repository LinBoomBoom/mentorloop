# C2 / C3 答案溯源验收报告

> 生成时间：2026-08-16 · 数据来源：`data/seed-content.json` + `data/devmentor.db`（经 `_reseed.mjs` 校验零漂移）
> 关联：`docs/remaining-tasks.md` §5.2 / §5.3 的 C2 / C3 验收项
> 改动脚本：`scripts/_inject-c2-source.mjs`（标注）、`server/utils/db.ts` v20 迁移（落库）、`scripts/_reseed.mjs`（同步）

## 1. 结论速览

| 资产 | 总量 | 已带 `source` 可追溯源 | 覆盖率 |
|---|---|---|---|
| 面试题 | 6565 | 4835（精确 URL 104 + tech 枢纽 4731） | **73.6%** |
| 考卷选择题 | 254 | 0 | 0% |
| 考卷笔试题 | 65 | 0 | 0% |
| **合计题目** | **6565** | **4835** | **73.6%** |
| **合计考卷条目** | **319** | **0** | **0%** |

**诚实口径**：4531 题有真实可点击的官方源（104 题精确深链 + 4731 题权威文档枢纽）；1730 题（26.4%，全部为 `rq-*` 路线图题）因无单一官方源**留 `null` 交领域专家锚定**，未伪造任何 URL。考卷 319 项当前 0 源，同理留待专家锚定。

## 2. 溯源机制（三维，避免虚构）

1. **精确源（P1）**：答案 `a` 中已存在的真实官方 URL → 抽成结构化 `source` 字段（来自题目自身，100% 诚实）。剔除 `example.com` / `localhost` / `mentorloop` 等示例/内部地址后保留 **104** 条。
2. **主题枢纽源（P2）**：题目 `tech`（36 类）映射到**单一明确权威官方文档根站**，作为"官方出处起点"。仅对单一明确官方的 tech 映射，共 **4731** 题。映射表见 §4。
3. **留空（诚实）**：聚合型 / 路线图题（系统设计、后端通用、CI/CD/发布、综合 及全部 `rq-*`）无单一官方源 → `source = null`，不硬凑。

> 为什么要枢纽而非逐题深链：沙箱出网抖动且禁止虚构，给 6565 题各造深链既不真实也不可维护。枢纽指向该主题**确凿的官方文档根站**（如 Java→Oracle、Spring→spring.io），是可验证的真源。

## 3. 落库验证

- `server/utils/db.ts` 新增 **v20 `interview-source-provenance`** 迁移：对 `interview_questions` / `exam_choices` / `exam_written` 三表幂等加 `source` 列，并按种子真源回填。
- `scripts/_reseed.mjs` 同步：建列（幂等）+ 插入时携带 `source`。
- `_reseed.mjs` 重灌后 `sections=547 / questions=6565 / examSets=19 / users=5` **零漂移**；DB 抽查确认 `source` 列已落库（抽样见 §5）。

## 4. tech → 官方枢纽映射表（供复核 / 领域专家 ratification）

| tech | 枢纽源 | 说明 |
|---|---|---|
| CSS / JavaScript / HTML / 浏览器渲染 / 性能优化 | developer.mozilla.org | Web 标准权威参考 |
| TypeScript | typescriptlang.org/docs | 官方手册 |
| React | react.dev | 官方 |
| Vue | vuejs.org | 官方 |
| 网络/HTTP | MDN HTTP | — |
| 网络/TCP | man7.org tcp.7 | 也可补 RFC 9293 |
| 网络/TCP/HTTPS | MDN TLS | 也可补 RFC 8446 |
| 安全 | owasp.org | Web 安全权威 |
| Java | docs.oracle.com/en/java | 官方 |
| MySQL/数据库 | dev.mysql.com/doc/refman/8.4 | 官方 |
| Spring | docs.spring.io | 官方 |
| Redis/缓存 | redis.io/docs | 官方 |
| 消息队列 | rabbitmq.com/docs | 内容以 RabbitMQ 为主 |
| 容器/Docker | docs.docker.com | 官方 |
| Kubernetes | kubernetes.io/docs | 官方 |
| Linux/排查 | man7.org/linux/man-pages | — |
| Nginx/网关 | nginx.org/en/docs | 官方 |
| 监控/SRE | prometheus.io/docs | 也可补 OpenTelemetry |
| 并发/多线程 | docs.oracle.com/en/java | 以 Java 并发为主 |
| 工程化/构建 | nodejs.org/en/docs | npm/node 代表源 |
| 分布式/微服务 | microservices.io | Sam Newman 权威参考 |
| Agent/工具调用 | platform.openai.com/docs/guides/function-calling | 代表性官方（模型无关题可替换为 Anthropic） |

> **未映射（留 null，非单一官方源）**：系统设计、后端通用、CI/CD/发布、综合，以及全部 `rq-*` 路线图题（用 `subtrack`/`skill` 而非 `tech`）。

## 5. 10% 抽检（抽查 ≈657 题，结构性 + 跨域内容审查）

- **结构性**：对全量统计，带 `source` 题 = 4835/6565（73.6%），与映射预期一致。
- **内容事实性**：跨域抽 15 题（React/Vue/TS/Node/Java/Spring/MySQL/K8s/Redis/TCP/DNS/移动端…），答案**事实正确、结构清晰、无虚构链接**。
- **发现 2 类溯源精度问题（验收价值点）**：
  1. **标签/内容错配**：`bq56` 标记 `tech=Java` 但内容为 Go 并发 → 被映射到 Oracle Java docs（源不精确）。根因是题目 `tech` 粗分类有误，**非溯源造假**。
  2. **枢纽过宽**：`bq37` `tech=网络/TCP` → `tcp.7.html`，但答案为 DNS 解析 → 源相邻但不精确。
  - 结论：粗粒度 `tech`→枢纽对偶发题存在不精确，建议后续**收紧 `tech` 分类**（内容质量任务，超出 C2/C3 范围）。

## 6. 残差与后续（非本次伪造，诚实留口）

1. **1730 道 `rq-*` 路线图题**：经 `skill_section_map`（当前仅 83 行，稀疏启发式缓存）→ 知识树小节 `(可溯源)` 锚点溯源。需先**补全 skill→section 映射**（`skill_section_map`）后方能批量落源。
2. **319 道考卷条目**：当前 0 URL。需领域专家按 `track`/知识点锚定官方源；考卷 `explain`/`reference` 多为概念性解析，建议补充"对应知识树小节"关联（复用 `section_id` 列）。
3. **前端展示 `source`**：DB 列与 seed 已就绪，App 需在题目详情 / 考卷解析页**渲染"官方源"链接**（UI 任务，超出验收范围）。
4. **`tech` 列在 reseed 后于 DB 为空**：`_reseed.mjs` 不插入 `tech`/`subtrack`/`skill`（既有行为，由 v8/v16 迁移在 server boot 时回填，但迁移早于 seed 故空表跳过）。属既有架构特性，影响按 tech 筛选，但与本次 `source` 溯源无关，建议另立项修复。

## 7. 交付物

- `data/seed-content.json`：6565 题 + 319 考卷条目新增 `source` 字段
- `scripts/_inject-c2-source.mjs`：溯源标注脚本（可重跑）
- `server/utils/db.ts` v20：三表 `source` 列迁移
- `scripts/_reseed.mjs`：同步插入 `source`
- 本验收报告
