# 面试题库 · 质量与去重审计报告

> 生成时间：2026-09-03T15:50:02.241Z
> 数据源：devmentor.db（serve 实际数据）+ seed-content.json（内容真源）
> 本审计**仅读取、不修改任何数据**。

## 一、概览

| 数据源 | 总题数 | 路线图题(rq) | 精确重复簇 | 受影响行 | 任意质量问题行 |
| --- | ---: | ---: | ---: | ---: | ---: |
| DB | 6565 | 2534 | 2 | 4 | 1754 |
| SEED | 6565 | 2534 | 2 | 4 | 1754 |

> 精确重复 = 题干归一(去空白/标点/标签/大小写)后完全一致；近邻重复 = 同赛道内字符二元组 Jaccard≥0.88 的改写/同义重述（需人工确认是否合并）。
> 占位符检测仅用中文编写缺口词（待补充/待完善/待填写/[待）；英文 TODO/FIXME/TBD 因在本语料中多为合法技术内容（TodoMVC、fixme 概念讲解）已剔除，故占位符计数偏保守、仅代表「强信号缺口」。

## 二、质量问题明细

### DB（总 6565 题）

| 问题类型 | 数量 | 说明 |
| --- | ---: | --- |
| placeholder | 2 | 答案含中文编写缺口标记(待补充/待完善/待填写/[待) |
| emptyKeywords | 29 | keywords 为空 |
| nullSource | 1730 | source 为空 → 溯源缺口 |

### SEED（总 6565 题）

| 问题类型 | 数量 | 说明 |
| --- | ---: | --- |
| placeholder | 2 | 答案含中文编写缺口标记(待补充/待完善/待填写/[待) |
| emptyKeywords | 29 | keywords 为空 |
| nullSource | 1730 | source 为空 → 溯源缺口 |

## 三、去重发现（DB 主源）

- 精确归一重复簇：2 个，涉及 4 行
- 近邻重复候选（同赛道 Jaccard≥0.88）：11 对（改写/同义重述，需人工确认）
- 跨赛道同题簇：0 个
- (q,a) 完全同值簇：0 个

### 近邻重复候选样本（前 12 对，按相似度降序）

| # | 相似度 | A (id@track) | B (id@track) |
| ---: | ---: | --- | --- |
| 1 | 0.930 | xq-b-923@backend：条件变量（pthread_cond）为什么要配互斥锁使用？为 | xq-b-924@backend：条件变量（pthread_cond）为什么要配合互斥锁使用？ |
| 2 | 0.920 | xq-b-471@backend：为什么 ConcurrentHashMap 不允许 null | xq-b-472@backend：为什么 ConcurrentHashMap 不允许 null |
| 3 | 0.917 | xq-f-956@frontend：请解释 JavaScript 事件循环中宏任务（task）与 | xq-f-957@frontend：请解释 JavaScript 事件循环中宏任务（task）与 |
| 4 | 0.917 | xq-b-487@backend：为什么 SIGKILL 和 SIGSTOP 不能被捕获、阻塞 | xq-b-488@backend：为什么 SIGKILL 和 SIGSTOP 不能被捕获、阻塞 |
| 5 | 0.913 | xq-o-298@devops：为什么生产环境必须使用包管理器而不是手动编译安装软件？请从一 | xq-o-299@devops：为什么生产环境必须使用包管理器而不是手动编译安装软件？请从一 |
| 6 | 0.912 | xq-o-44@devops：ELK/EFK 与 Loki 在架构设计上有何本质区别？什么 | xq-o-45@devops：ELK/EFK 与 Loki 在架构设计上有何本质区别？什么 |
| 7 | 0.911 | xq-b-22@backend：BeanFactory 和 ApplicationConte | xq-b-23@backend：BeanFactory 和 ApplicationConte |
| 8 | 0.898 | xq-o-33@devops：Docker 的 bridge、host、none、over | xq-o-34@devops：Docker 的 bridge、host、none、over |
| 9 | 0.897 | xq-o-649@devops：请用一句话解释 FinOps 的核心思想，并说明它与传统"I | xq-o-650@devops：请用一句话解释 FinOps 的核心思想，并说明它与传统成本 |
| 10 | 0.889 | xq-f-645@frontend：在列表渲染中，为什么在头部插入元素会导致性能问题？`key` | xq-f-646@frontend：在列表渲染中，为什么在头部插入元素会导致性能问题？key 是 |
| 11 | 0.886 | xq-b-55@backend：Eureka 和 Nacos 在服务发现方面有什么区别？请从 | xq-b-56@backend：Eureka 和 Nacos 在服务发现方面有什么区别？请从 |

### 重复簇样本（前 15 个，含题面 + 重复 ID/赛道）

| # | 归一题面(截断) | 重复数 | 涉及 ID / 赛道 |
| ---: | --- | ---: | --- |
| 1 | ESLint 和 Prettier 的分工边界是什么？为什么说"格式交给 | 2 | xq-f-27@frontend、xq-f-28@frontend |
| 2 | Kafka 中"顺序性"和"幂等性"的本质区别是什么？为什么说"顺序靠分 | 2 | xq-b-127@backend、xq-b-128@backend |

## 四、种子↔DB 对账

- 种子面试题总数：6565；DB 面试题总数：6565
- 种子内 ID 主键冲突：0 个（这些题在 INSERT OR IGNORE 下会被静默丢弃）
- 计数差异（DB - 种子）：0（一致）

## 五、处置建议（本审计未执行任何修改）

1. **去重**：对精确归一重复簇，保留 `skill/subtrack` 最完整、答案最长的一条，其余删除或合并；跨赛道同题按方向归属只留其一。
2. **空/桩题**：`emptyA` / `aTooShort` 的题需 LLM 重写答案或降权；`emptyQ` 直接修或删。
3. **可见性**：`nullSubtrack` 题在 v3 题库 UI 不可见，需补标方向（复用 `interviewSubtrackMap` 的确定性映射，参考迁移 v22）。
4. **溯源**：`nullSource` 缺口由 `_inject-*-sources.mjs` 系列按 tech 补官方根站。
5. **种子主键冲突**：修正种子内重复 ID，避免 `INSERT OR IGNORE` 静默丢题；重新 seed 前先 `SELECT id, COUNT(*) FROM interview_questions GROUP BY id HAVING COUNT(*)>1` 验证。

> 下一步：确认上述任一项后，再编写对应的「修复迁移 + seed 同步」脚本（沿用 v22 幂等迁移 + gen-learn 双写范式）。
