# 内容归类一致性体检报告

> 生成时间：2026-09-08T16:41:46.251Z｜数据源：data/devmentor.db + app/data/learningTaxonomy.ts + app/data/techVocabulary.ts

## 结论：7/9 项断言通过

| 断言 | 说明 | 结果 | 命中赛道数 |
|---|---|---|---:|
| A1 | techNames ⊆ 题库实际标签（无空筛选） | ✅ PASS | 0 |
| A2 | 题库实际标签 ⊆ techNames（无漏筛） | ✅ PASS | 0 |
| A3 | tech 无脏值（全部命中受控词表） | ✅ PASS | 0 |
| A4 | 单一 tech 占比 ≤ 60%（本体标签 ≤95%） | ❌ FAIL | 1 |
| A5 | 内容覆盖度：每赛道 章节≥6 且 题目≥100（提示项） | ❌ FAIL | 16 |
| A6 | seed 章节数 == DB 章节数 | ✅ PASS | 0 |
| A7 | subtrack 归属合法（题∈赛道 / 章∈模块并集） | ✅ PASS | 0 |
| A8 | 题面唯一 / 无跨模块重复 | ✅ PASS | 0 |
| A9 | tech ∈ 词表 ∧ 该赛道被允许 | ✅ PASS | 0 |

### ❌ A4 · 单一 tech 占比 ≤ 60%（本体标签 ≤95%）

| 赛道 | 问题 |
|---|---|
| be-db | 「MySQL」占 201/223 = 90%（限 60%） |

### ❌ A5 · 内容覆盖度：每赛道 章节≥6 且 题目≥100（提示项）

| 赛道 | 问题 |
|---|---|
| fe-app | 章节 16 / 题目 79 |
| fe-native | 章节 7 / 题目 95 |
| fe-viz | 章节 9 / 题目 72 |
| fe-desktop | 章节 8 / 题目 71 |
| fe-mobile | 章节 10 / 题目 87 |
| fe-uniapp | 章节 10 / 题目 69 |
| be-data | 章节 10 / 题目 72 |
| be-game | 章节 8 / 题目 82 |
| be-search | 章节 8 / 题目 73 |
| be-test | 章节 14 / 题目 82 |
| op-cloud | 章节 10 / 题目 80 |
| op-sec | 章节 17 / 题目 83 |
| ai-infra | 章节 5 / 题目 230 |
| ai-algo | 章节 14 / 题目 92 |
| ai-data | 章节 8 / 题目 74 |
| ai-edge | 章节 5 / 题目 70 |

## 现状速览

| 模块 | 赛道 | 章节 | 题目 | 标签数 | 最大标签占比 |
|---|---|---:|---:|---:|---:|
| frontend | fe-web (Web 开发工程师) | 56 | 1088 | 10 | JavaScript 27% |
| frontend | fe-arch (前端架构 / 工程化专家) | 7 | 204 | 7 | 工程化 93% |
| frontend | fe-harmony (鸿蒙 HarmonyOS 工程师) | 8 | 102 | 7 | 工程化 31% |
| frontend | fe-miniprogram (小程序工程师) | 10 | 130 | 6 | 网络 42% |
| frontend | fe-app (跨端 App 工程师（RN / Flutter）) | 16 | 79 | 7 | 工程化 39% |
| frontend | fe-native (原生客户端工程师) | 7 | 95 | 7 | 性能优化 38% |
| frontend | fe-viz (可视化 / 图形工程师（ECharts / D3 / WebGL）) | 9 | 72 | 7 | JavaScript 49% |
| frontend | fe-desktop (桌面端工程师（Electron / Tauri）) | 8 | 71 | 5 | 工程化 32% |
| frontend | fe-mobile (移动端工程师（H5 / 响应式）) | 10 | 87 | 7 | 性能优化 32% |
| frontend | fe-uniapp (uni-app 工程师) | 10 | 69 | 6 | 工程化 39% |
| frontend | fe-node (Node.js 全栈工程师) | 11 | 105 | 6 | JavaScript 57% |
| backend | be-web (Web 后端工程师) | 37 | 800 | 8 | Java 60% |
| backend | be-micro (微服务 / 架构师) | 22 | 749 | 7 | 微服务 53% |
| backend | be-db (数据库 / 存储工程师（MySQL / PostgreSQL / Redis / NoSQL）) | 18 | 223 | 5 | MySQL 90% |
| backend | be-data (大数据工程师（离线数仓 / 实时流处理）) | 10 | 72 | 7 | 数仓建模 42% |
| backend | be-game (游戏服务端工程师) | 8 | 82 | 7 | 网络 30% |
| backend | be-search (搜索 / 中间件工程师) | 8 | 73 | 6 | 系统设计 55% |
| backend | be-test (测试开发工程师（SDET）) | 14 | 82 | 6 | 系统设计 56% |
| devops | op-trad (运维工程师（传统）) | 10 | 385 | 5 | Linux 38% |
| devops | op-sre (SRE 工程师) | 13 | 342 | 5 | SRE 91% |
| devops | op-devops (运维开发 / DevOps 平台) | 12 | 257 | 6 | CI/CD 91% |
| devops | op-k8s (云原生 / Kubernetes 工程师) | 16 | 223 | 6 | Kubernetes 88% |
| devops | op-cloud (云平台工程师) | 10 | 80 | 6 | SRE 35% |
| devops | op-sec (安全运维工程师) | 17 | 83 | 5 | 安全 90% |
| ai | ai-app (AI 应用工程师（LLM / RAG / Agent）) | 18 | 374 | 8 | RAG 45% |
| ai | ai-infra (AI Infra / 推理优化工程师) | 5 | 230 | 7 | 推理与部署 60% |
| ai | ai-mlops (MLOps 工程师（MLflow / Kubeflow / LLM 评估）) | 12 | 159 | 8 | 推理与部署 31% |
| ai | ai-algo (算法工程师（CV / NLP / 推荐）) | 14 | 92 | 7 | 模型与训练 48% |
| ai | ai-data (训练数据 / 标注平台工程师) | 8 | 74 | 7 | 数据与标注 51% |
| ai | ai-edge (端侧 AI 工程师) | 5 | 70 | 4 | 端侧 AI 93% |
