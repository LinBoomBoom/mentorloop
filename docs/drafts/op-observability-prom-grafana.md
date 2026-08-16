# 试点草稿 · 可观测性深化：Prometheus + Grafana 实战（op-c9）

> 状态：W3.2 试点草稿 · 待审阅 · 生成日期 2026-08-16
> 生产方式：基于官方站**真实抓取资料**组织 v1 学习层（代行策展），非凭训练记忆编造。
> 抓取来源：
> - Prometheus Overview — `https://prometheus.io/docs/introduction/overview/`（HTTP 200，已抓取 4431 字真实正文）
> - Grafana Introduction — `https://grafana.com/docs/grafana/latest/introduction/`（HTTP 200，已抓取 11069 字真实正文）
> - OpenTelemetry 官方文档 `opentelemetry.io` 当前在沙箱 fetch 间歇性失败（TLS），其具体规范与 SDK 细节**待补官方抓取后并入**，本草稿不臆造。

> 用途：作为 plan §5.2「Step 0 试点评审」样本——请你评审质量与方向（事实锚定是否到位、学习层是否比直接看官方更有用、是否认可"基于抓取资料代行策展"模式），确认后再批量推开并写入 `data/seed-content.json`。

---

## 第9章 · 可观测性深化：Prometheus + Grafana 实战

**章目标**：能基于 Prometheus + Grafana 搭建一套指标监控与可视化告警的最小可用栈；理解 pull 模型、PromQL、exporter、dashboard、alert 的端到端链路；厘清 metrics / logs / traces 三大支柱与选型。

---

### op-c9-s1 · Prometheus 核心模型与架构

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方

> 心智模型：Prometheus 像一台**自带数据库的"定时采样器"**——它不被动等别人汇报，而是**主动按节奏去每个目标"拉"（pull）一次指标**，把"数值 + 时间戳 + 标签"存成时间序列。你要查、要看、要告警，都在这张"带标签的时间表"上做文章。

## 心智模型
Prometheus 是开源的**系统监控与告警工具包**（2012 年起源于 SoundCloud，2016 年加入 CNCF，是继 Kubernetes 之后第二个托管项目）。它的核心心智是：**把指标当成带时间戳和标签的时间序列来存、来查、来告警**。不同于"应用主动上报"的思路，Prometheus 采用 **pull 模型**——服务端主动去抓取（scrape）已埋点的目标。

## 核心知识点（锚定官方）
- **数据模型**：指标以**时间序列**存储，即"记录变化时的时间点值"；每条序列由 **metric name + 可选 key/value 标签（labels）** 唯一标识（如 `http_requests_total{code="200",job="api"}`）。多维度的本质是"同一指标按标签自由切分"。
- **PromQL**：专为这种多维模型设计的灵活查询语言，可聚合、切片、计算速率等。
- **采集方式**：默认 **pull over HTTP**——Prometheus 周期性抓取目标暴露的 `/metrics` 端点；**短生命周期任务**无法被稳定 pull，经 **Pushgateway** 中转推送。
- **目标发现**：通过 **service discovery 或服务静态配置**发现 scrape targets。
- **核心组件（官方列出）**：
  - `Prometheus server`：抓取并存储时间序列；
  - `client libraries`：应用代码埋点；
  - `Pushgateway`：承接短任务；
  - `exporters`：把 HAProxy / StatsD / Graphite 等既有系统的指标转成 Prometheus 格式（如 `node_exporter`、`mysqld_exporter`）；
  - `Alertmanager`：专门处理告警（分组、静默、路由）；
  - 各类支持工具。
- **架构链路**：scrape 已埋点 job（直接 or 经 pushgateway）→ 本地存储 → 跑规则**聚合出新序列或生成告警** → 由 **Grafana 或 API 消费者可视化**。
- **适用边界（官方直言）**：适合**纯数值时间序列**——机器中心监控、高度动态的面向服务（微服务）架构尤其强；**不适合**需要 **100% 精确**的场景（如按请求计费），因为采样数据可能不够详尽完整。

> 来源：[Prometheus · Overview](https://prometheus.io/docs/introduction/overview/)

## 为什么重要 / 何时会用到
没有指标，你只能在"用户投诉了"之后才知道系统慢。Prometheus 让你**在故障发生前或发生中**就看到请求耗时、活跃连接数、错误率的变化趋势；每个 server 自治、不依赖远程网络存储，意味着**其他基础设施坏了它还能用**——它是 outage 时你最该依赖的那块"仪表盘"。

## 常见坑
- **把 Prometheus 当计费/审计源**：官方明确说它不为 100% 精确设计，按请求计费这类场景要用别的系统。
- **短任务不接 Pushgateway**：cron、批处理这类"活完就退"的进程，pull 抓不到，必须 push 到 gateway。
- **只埋点不配 Alertmanager**：抓了一堆数据却没告警路由，等于有了仪表盘没人看。
- **label 基数爆炸**：用高基数值（如 user_id）当 label，序列数指数膨胀拖垮存储与查询。

## 动手自测
1. 本地起 Prometheus，配置 `scrape_configs` 抓取自身 `/metrics`；访问 `:9090` 用 PromQL 查 `up` 和 `rate(http_requests_total[5m])`。
2. 起一个 `node_exporter`，把主机 CPU/内存指标接入，画一张 `node_cpu_seconds_total` 图表。
3. 配一条告警规则：当 `up == 0` 持续 1 分钟，经 Alertmanager 推到 Slack——验证"抓取→规则→告警"闭环。

## 面试视角
"Prometheus 为什么用 pull 而不是 push？"答：pull 让服务端自治、目标只需暴露端点，天然适配动态伸缩（目标 IP 变了由 service discovery 解决），且故障隔离好。"PromQL 和 SQL 区别？""PromQL 面向时间序列与维度聚合（rate/irate/by label），SQL 面向表连接。"追问 exporter / Pushgateway / 高基数 label 是常见深坑。

## 相关知识图谱
- [op-c4 可观测性三大支柱](doc:devops/op-c4/op-c4-s1) — 本页是 Prometheus 在"指标"支柱上的落地
- [op-c9-s2 Grafana 可视化与告警](doc:devops/op-c9/op-c9-s2) — Prometheus 数据如何被可视化
- [op-c6 数据库运维监控](doc:devops/op-c6/op-c6-s8) — 监控落地到 DB 场景

---

### op-c9-s2 · Grafana 可视化与告警

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方

> 心智模型：Grafana 是**把所有数据源的"仪表盘"集中到一个驾驶舱**——Prometheus 负责采数，Grafana 负责把数变成你能一眼看懂的图、能报警的线、能下钻的查询。

## 心智模型
Grafana 开源软件让你**查询、可视化、告警、探索**存放在任何地方的 metrics / logs / traces。它把时间序列数据库（TSDB）的数据变成有洞察的图表；插件框架还能连 NoSQL/SQL、Jira/ServiceNow、GitLab 等数据源——**一个界面統管多源观测数据**。

## 核心知识点（锚定官方）
- **核心能力**：query / visualize / alert / explore，覆盖 metrics、logs、traces 三类信号。
- **Explore**：ad-hoc 查询与动态下钻；split view 可并排对比不同时间范围、查询、数据源。
- **Alerts**：支持 PagerDuty / SMS / email / VictorOps / OpsGenie / Slack 等通知渠道；可**可视化定义最重要指标的告警规则**。
- **Annotations**：用来自不同数据源的富事件标注图表，hover 看完整元数据——便于出问题时关联"那次发布/那次扩容"。
- **Dashboards & 模板变量**：官方库有数百个现成 dashboard/plugin；**模板变量**让同一张图复用到生产/测试等多场景，向下钻取（全量→北美→德州）。
- **Provisioning**：脚本自动化批量建 dashboard / 数据源（如新起 K8s 集群顺带拉起锁定配置的 Grafana）。
- **Auth**：支持 LDAP / OAuth，用户映射到组织/团队。
- **生态项目（官方列出，构成 LGTM 栈）**：
  - **Loki**：日志栈（logs）
  - **Tempo**：高吞吐分布式追踪后端（traces）
  - **Mimir**：Prometheus 的可扩展长期存储（metrics 长存）
  - **Pyroscope**：持续 profiling（精确到代码行的资源占用）
  - **Faro**：前端 RUM agent（性能/日志/异常/事件/traces）
  - **Beyla**：基于 eBPF 的应用自动埋点（无需改代码）
  - **Alloy**：OpenTelemetry Collector 的灵活、vendor-neutral 发行版，**兼容 OTel 与 Prometheus**
  - **k6**：负载测试
  - **OnCall**：事件响应管理
- **版本形态**：OSS（免费自托管）/ Enterprise（自管+企业特性）/ Cloud（全托管，含免费层）。

> 来源：[Grafana · Introduction](https://grafana.com/docs/grafana/latest/introduction/)

## 为什么重要 / 何时会用到
采了一堆指标（Prometheus）、一堆日志（Loki）、一堆链路（Tempo），但**散在不同系统里人就瞎了**。Grafana 把三者汇到一个驾驶舱，做"指标异常→下钻日志→关联链路→定位慢调用"的闭环。没有它，可观测性三大支柱是割裂的三块屏幕。

## 常见坑
- **只在 Grafana 里手点建 dashboard，不 Provisioning**：环境一多就管不过来，配置漂移。
- **告警规则只配不路由**：Alertmanager/Grafana Alerting 没接通知渠道，告警石沉大海。
- **把 Grafana 当长期存储**：Grafana 是可视化层，长期留存靠 Mimir/LTS，别让它背存储锅。
- **忽视了 traces 支柱**：只盯 metrics，遇到"为什么这次请求慢"答不上来——需 Tempo/OTel 补链路。

## 动手自测
1. 起 Grafana，加 Prometheus 为数据源，导入官方 `Node Exporter Full` dashboard，看到主机图表。
2. 在 Grafana 里可视化定义一条告警：某指标 5 分钟超阈 → 推 Slack，验证"指标→告警→通知"闭环。
3. 用模板变量做一张"按环境切换"的 dashboard，验证一份配置多场景复用。

## 面试视角
"Prometheus 和 Grafana 什么关系？"答：前者采数+存+查（含 PromQL 和基础图），后者是更丰富的**可视化与告警前端**，可叠加 Loki/Tempo 做三支柱统一。"LGTM 栈是什么？"答：Loki(Grafana 日志)+Grafana(可视化)+Tempo(追踪)+Mimir(指标长期存储)。追问 Tempo/Alloy 与 OpenTelemetry 关系——Alloy 兼容 OTel Collector。

## 相关知识图谱
- [op-c9-s1 Prometheus 架构](doc:devops/op-c9/op-c9-s1) — 数据从哪来
- [op-c9-s3 三大支柱与选型](doc:devops/op-c9/op-c9-s3) — 为什么需要 logs/traces 补 metrics
- [op-c4 CI/CD 与可观测性](doc:devops/op-c4/op-c4-s1) — 可观测性基础概念

---

### op-c9-s3 · 可观测性三大支柱与 LGTM 选型

> 时效 | 核验=2026-08-16 | 风险=中 | 来源=官方（Grafana 侧）+ 待补 OpenTelemetry 官方规范

> 心智模型：可观测性三件套像**给系统装"体温计 + 黑匣子 + 监控录像"**——metrics 是体温计（趋势/告警）、logs 是黑匣子（事后查现场）、traces 是录像（还原一次请求穿过哪些服务、卡在哪）。只看体温计，你只知道"发烧了"，看不全"为什么烧"。

## 心智模型
可观测性三大支柱：
- **Metrics（指标）**：数值化度量（如 QPS、延迟、错误率），适合趋势与告警——回答"系统整体健不健康"。
- **Logs（日志）**：离散事件记录，适合事后查"那一刻到底发生了什么"。
- **Traces（链路）**：一次请求跨越多个服务的完整路径与耗时，适合定位"慢在哪一段"。

Grafana 生态把三者收进 **LGTM 栈**：**L**oki(logs) + **G**rafana(可视化) + **T**empo(traces) + **M**imir(metrics 长期存储)，配合 **Alloy**（兼容 OTel/Prometheus 的采集器）统一采集。

## 核心知识点（锚定官方）
- **Grafana 官方明确把三信号并列**：Grafana OSS 可 query/visualize/alert/explore **metrics, logs, and traces wherever they are stored**。
- **Loki** 是日志栈、**Tempo** 是分布式追踪后端、**Mimir** 是 Prometheus 长期存储、**Alloy** 是 vendor-neutral 的 OTel Collector 发行版（兼容 OTel 与 Prometheus）。
- **OpenTelemetry（待补）**：作为厂商中立的可观测性标准，定义 traces/metrics/logs 的信号规范与多语言 SDK/Collector。当前 `opentelemetry.io` 在沙箱 fetch 间歇性失败，**其信号规范细节、SDK 接入、Collector 管线将在补抓官方文档后并入本节**，本草稿不臆造。

## 为什么重要 / 何时会用到
单个支柱都有盲区：metrics 告警说"错误率升了"但说不清原因；logs 能查但量大难关联；traces 能定位但只覆盖有埋点的请求。三支柱联动（指标异常→下钻链路→比对日志）才是 production 排障的标配。

## 常见坑
- **只建 metrics，不做 traces**：微服务下"慢请求"无处溯源。
- **日志全量无采样、无索引**：成本爆炸且查不动——Loki 的 label 设计很关键。
- **OTel 与既有 exporter 混用不清边界**：应以 OTel 标准收口，Alloy 做兼容转换。

## 动手自测
1. 在 Grafana 同一 dashboard 里同时挂 Prometheus(metrics) + Loki(logs) + Tempo(traces) 三个数据源，模拟"错误率告警→点进 trace→看对应日志"。
2. 用 Alloy 收集一端 OTel 格式数据，验证其同时兼容 Prometheus 指标与 OTel trace。

## 面试视角
"三大支柱区别与如何选型？"答：metrics 看趋势告警、logs 查现场、traces 还原请求路径；生产环境三者互补，LGTM+OTel 是主流开源组合。追问 OpenTelemetry 定位——厂商中立标准，统一信号规范与采集。

## 相关知识图谱
- [op-c9-s1 Prometheus](doc:devops/op-c9/op-c9-s1) — metrics 支柱
- [op-c9-s2 Grafana](doc:devops/op-c9/op-c9-s2) — 三支柱统一驾驶舱
- [op-c4 可观测性基础](doc:devops/op-c4/op-c4-s1) — 可观测性概念起点

---

## 试点评审自检清单（请你据此反馈）
- [ ] **事实锚定**：所有事实是否都来自已抓取的真实官方资料、来源 URL 可回溯？有无臆造？
- [ ] **学习层价值**：相比直接看 Prometheus/Grafana 官方文档，这份是否"更省理解成本"（心智模型/常见坑/自测/面试视角）？
- [ ] **待补部分**：OpenTelemetry 因抓取受限被标注"待补"，是否接受这种诚实留白，还是希望我换可达源（如用 Grafana Alloy/OTel 兼容说明先铺垫）？
- [ ] **模式认可**：是否认可"脚本抓取真实官方资料 + 我组织 v1 学习层 + 标注来源 + 交你审阅"的代行策展模式？认可后我按此批量推开剩余主题域。
- [ ] **入库方式**：确认后我按现有 seed schema（`modules→chapters→sections.content`）写入 `data/seed-content.json` 的 `devops` 模块下 `op-c9`，并跑 `_reseed.mjs` 校验无漂移。
