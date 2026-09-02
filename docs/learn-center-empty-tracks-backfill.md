# 学习中心空赛道内容补齐（Task 2）

> 关联：v3 redesign（d7ded4c）把 13 个"无内置章节"的赛道从学习中心隐藏。
> 本任务用 `scripts/gen-learn.mjs` 基于**官方权威文档**补齐这些赛道的章节内容，
> 全部经 `apply` 双写 `data/seed-content.json` 与 `data/devmentor.db`，
> 并把 `subtrack` 值写回 `learningTaxonomy.ts` 对应赛道的 `chapterSubtracks`，让其在学习中心重新可见。
>
> 铁律（用户拍板）：内容必须来自官方文档、AI 仅策展/结构化、禁止虚构与填充式写作；
> 章数由官方文档真实体量决定，不写死。

## 待补齐的 13 个空赛道

| 模块 | 赛道 | subtrack 值 | 显示名 | 官方来源 |
|------|------|------------|--------|----------|
| frontend | fe-mobile | mobile | 移动端 H5 | MDN 响应式 / web.dev responsive |
| frontend | fe-uniapp | uniapp | uni-app | uniapp.dcloud.net.cn |
| frontend | fe-node | nodefull | Node 全栈 | nodejs.org docs/learn |
| backend | be-data | bigdata | 大数据 | Spark / Kafka / Hive 文档 |
| backend | be-game | gameserver | 游戏服务端 | Colyseus / Node 长连接 |
| backend | be-search | searchmw | 搜索中间件 | Elasticsearch / Redis 文档 |
| backend | be-test | sdet | 测试开发 | Playwright / Selenium 文档 |
| devops | op-k8s | k8s | Kubernetes | kubernetes.io/docs |
| devops | op-cloud | cloud | 云平台 | AWS / Azure 文档 |
| devops | op-sec | secops | 安全运维 | OWASP / CISA |
| ai | ai-algo | algo | 算法 | PyTorch / scikit-learn / TF |
| ai | ai-data | traindata | 训练数据 | HuggingFace datasets / TF datasets |
| ai | ai-edge | edgeai | 端侧 AI | TF Lite / Apple ML |

## 分批计划（每批生成后验证，再进下一批）

- **Batch 1（端到端验证，本批先跑）**：fe-uniapp、op-k8s、ai-algo、be-search
  —— 覆盖 4 个模块、来源最清晰，验证"注册→生成→apply→taxonomy 暴露→学习中心可见"全链路。
- **Batch 2**：fe-mobile、fe-node、op-cloud、op-sec
- **Batch 3**：be-data、be-game、be-test、ai-data、ai-edge

每批完成标准：
1. `gen-learn run <id>` 成功（plan 章节由官方结构驱动、无 JSON 报错）；
2. `gen-learn apply <id>` 写入 seed + DB，章节 `subtrack` = 该赛道 subtrack 值；
3. `learningTaxonomy.ts` 对应赛道 `chapterSubtracks` 含该值、`SUBTRACK_DISPLAY` 有显示名；
4. SSR 复查 `/learn/<module>?group=<trackId>` 出现新章节、无空壳占位。

## 风险与对策
- **LLM 偶发非法 JSON**：extractJson 已加固（有序逗号补全）+ doPlan 重试，P5 已验证根治。
- **API 限流**：每赛道 `--concurrency 5`，批次间错峰；失败有 3 次重试 + 退避。
- **空壳误显**：taxonomy 的 `chapterSubtracks` 仅在对应赛道章节真正 apply 后再写入，避免"赛道可见但 0 章"。
- **DB 并发写**：gen-learn `apply` 直接写 devmentor.db；运行期间 dev 服务只读，apply 后重启服务一次以刷新 schema/数据视图。
