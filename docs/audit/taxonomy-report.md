# 内容归类一致性体检报告

> 生成时间：2026-09-15T15:10:50.829Z｜数据源：data/devmentor.db + app/data/learningTaxonomy.ts + app/data/techVocabulary.ts

## 结论：9/9 项断言通过

| 断言 | 说明 | 结果 | 命中赛道数 |
|---|---|---|---:|
| A1 | techNames ⊆ 题库实际标签（无空筛选） | ✅ PASS | 0 |
| A2 | 题库实际标签 ⊆ techNames（无漏筛） | ✅ PASS | 0 |
| A3 | tech 无脏值（全部命中受控词表） | ✅ PASS | 0 |
| A4 | 单一 tech 占比 ≤ 60%（本体标签 ≤95%） | ✅ PASS | 0 |
| A5 | 内容覆盖度：每赛道 章节≥6 且 题目≥100（提示项） | ✅ PASS | 0 |
| A6 | seed 章节数 == DB 章节数 | ✅ PASS | 0 |
| A7 | subtrack 归属合法（题∈赛道 / 章∈模块并集） | ✅ PASS | 0 |
| A8 | 题面唯一 / 无跨模块重复 | ✅ PASS | 0 |
| A9 | tech ∈ 词表 ∧ 该赛道被允许 | ✅ PASS | 0 |

## 现状速览

| 模块 | 赛道 | 章节 | 题目 | 标签数 | 最大标签占比 |
|---|---|---:|---:|---:|---:|
| frontend | fe-web (Web 开发工程师) | 56 | 2372 | 11 | 性能优化 17% |
| frontend | fe-arch (前端架构 / 工程化专家) | 7 | 204 | 7 | 工程化 93% |
| frontend | fe-harmony (鸿蒙 HarmonyOS 工程师) | 8 | 289 | 9 | HarmonyOS 54% |
| frontend | fe-miniprogram (小程序工程师) | 10 | 365 | 8 | 小程序 48% |
| frontend | fe-app (跨端 App 工程师（RN / Flutter）) | 16 | 316 | 11 | React Native 29% |
| frontend | fe-native (原生客户端工程师) | 7 | 229 | 8 | 工程化 21% |
| frontend | fe-viz (可视化 / 图形工程师（ECharts / D3 / WebGL）) | 9 | 269 | 13 | ECharts 26% |
| frontend | fe-desktop (桌面端工程师（Electron / Tauri）) | 8 | 260 | 8 | Tauri 25% |
| frontend | fe-mobile (移动端工程师（H5 / 响应式）) | 10 | 277 | 8 | CSS 56% |
| frontend | fe-uniapp (uni-app 工程师) | 10 | 250 | 8 | uni-app 36% |
| frontend | fe-node (Node.js 全栈工程师) | 11 | 458 | 9 | Node.js 50% |
| backend | be-web (Web 后端工程师) | 37 | 2013 | 13 | Java 33% |
| backend | be-micro (微服务 / 架构师) | 22 | 1032 | 9 | 微服务 53% |
| backend | be-db (数据库 / 存储工程师（MySQL / PostgreSQL / Redis / NoSQL）) | 18 | 811 | 10 | 数据库原理 23% |
| backend | be-data (大数据工程师（离线数仓 / 实时流处理）) | 10 | 415 | 10 | Spark 21% |
| backend | be-game (游戏服务端工程师) | 8 | 344 | 7 | 网络 36% |
| backend | be-search (搜索 / 中间件工程师) | 8 | 261 | 7 | Redis 35% |
| backend | be-test (测试开发工程师（SDET）) | 14 | 342 | 7 | 综合应用 47% |
| devops | op-trad (运维工程师（传统）) | 10 | 385 | 5 | Linux 38% |
| devops | op-sre (SRE 工程师) | 13 | 342 | 6 | SRE 91% |
| devops | op-devops (运维开发 / DevOps 平台) | 12 | 257 | 6 | CI/CD 91% |
| devops | op-k8s (云原生 / Kubernetes 工程师) | 16 | 230 | 6 | Kubernetes 87% |
| devops | op-cloud (云平台工程师) | 10 | 133 | 10 | 云平台 23% |
| devops | op-sec (安全运维工程师) | 17 | 130 | 5 | 安全 76% |
| ai | ai-app (AI 应用工程师（LLM / RAG / Agent）) | 18 | 374 | 8 | RAG 45% |
| ai | ai-infra (AI Infra / 推理优化工程师) | 6 | 230 | 10 | 服务化架构 22% |
| ai | ai-mlops (MLOps 工程师（MLflow / Kubeflow / LLM 评估）) | 12 | 159 | 8 | 推理与部署 31% |
| ai | ai-algo (算法工程师（CV / NLP / 推荐）) | 14 | 242 | 10 | 模型与训练 35% |
| ai | ai-data (训练数据 / 标注平台工程师) | 8 | 132 | 6 | 模型与训练 40% |
| ai | ai-edge (端侧 AI 工程师) | 6 | 134 | 6 | 端侧 AI 49% |
