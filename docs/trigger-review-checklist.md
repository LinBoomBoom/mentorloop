# 大版本 / RFC / 大会驱动的复审清单（宪章第六.1条操作化）

> 操作化宪章 **第六条 6.1（触发式复审）**：监听到下列事件后 **2 周内** 完成相关节点复审。
> 配套工具：`scripts/trigger_watchlist.mjs`（自动生成"触发源 → 复审范围"映射表）。

---

## 0. 纪律红线

- 触发式复审**不豁免**日常保鲜：被触发节点仍按其风险 SLA（高 90 / 中 180 / 低 365 天）独立计算到期。
- 复审动作 = 重新核验官方源 → 更新事实 → 更新 `> 时效` 块「核验」日期（零 schema 漂移）。
- 复审必须在 `docs/skill-tree-roadmap.md` 更新记录留痕（宪章 6.3）。

---

## 1. 触发源 → 复审范围映射

运行 `node scripts/trigger_watchlist.mjs` 自动生成下表（基于现有 43 章）。当某事件命中，复审对应章全部 section。

| 触发源 | 关注对象（章） | 失效信号 |
|---|---|---|
| 框架大版本 | React / Vue / Angular / Node.js / TypeScript / Spring | 版本号变更、API 废弃 |
| 基础设施发版 | Kubernetes / Docker / Nginx / 主流云厂商 | 发版 notes、API 版本升级 |
| 标准与提案 | ECMAScript 年度版、重要 RFC、W3C/WHATWG | 提案 stage 变化、新特性定稿 |
| 行业大会 | React Conf / VueConf / KubeCon / QCon / Google I/O | 主题演讲公布的新范式 |
| 重大安全事件 | CVE 高危、供应链攻击 | 安全公告、依赖漏洞 | 
| AI/LLM 生态 | 主流模型代际变化、Agent/RAG 范式变化 | 模型能力跃迁、SDK 变更 |

---

## 2. 各触发源可订阅信号源

| 触发源 | 建议订阅 |
|---|---|
| React | react.dev/blog、React Conf 日程 |
| Vue | blog.vuejs.org、VueConf 日程 |
| Angular | blog.angular.dev |
| Node.js | nodejs.org/en/blog、GitHub releases |
| TypeScript | devblogs.microsoft.com/typescript |
| Spring | spring.io/blog |
| Kubernetes | kubernetes.io/blog、GitHub releases（含 deprecation 段） |
| Docker | docker.com/blog |
| Nginx | nginx.org/en/blog |
| 云厂商 | AWS/Azure/GCP 各自 what's new / changelog |
| ECMAScript | github.com/tc39/proposals、ecma-international |
| RFC | datatracker.ietf.org |
| 大会 | 各 Conf 官网日程 + YouTube 录播 |
| CVE | nvd.nist.gov、Snyk Advisory、GitHub Advisory |
| AI/LLM | 模型厂商变更日志（OpenAI/Anthropic/Google）、arXiv cs.CL |

---

## 3. 事件发生后 2 周内动作清单

```
1. 识别命中触发源 → 跑 `node scripts/trigger_watchlist.mjs` 取得复审章列表
2. 对每章：逐节重新核验官方源 → 事实有变则更新内容
3. 更新每节 `> 时效` 块「核验」日期为当天；版本号变更的更新「版本=」
4. 跑 `npm run audit:tree` + `node scripts/v2_validate.mjs` 确认无退化
5. 在 docs/skill-tree-roadmap.md 更新记录追加：触发源 / 复审章 / 变更摘要
```

---

## 4. 配套工具

- `scripts/trigger_watchlist.mjs`：生成"触发源 → 复审章"映射（基于现有章节主题映射，手工维护触发源↔章关系，零 schema 漂移）。
- 与 `scripts/review_queue.mjs`（时效到期队列）、`scripts/v2_validate.mjs`（合规校验）组成"事件 + 日历"双轨复审工具链。
