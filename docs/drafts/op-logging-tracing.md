# 试点草稿 · 日志与链路追踪深化：Loki / Tempo / ELK（op-c10）

> 状态：W3.2 批量草稿（第 2 批）· 待审阅 · 生成日期 2026-08-16
> 生产方式：基于官方站**真实抓取资料**组织 v1 学习层（代行策展），非凭训练记忆编造。
> 抓取来源（HTTP 200，已抓取真实正文）：
> - Grafana Loki 文档首页 — `https://grafana.com/docs/loki/latest/`（13416 字）
> - Grafana Tempo 文档首页 — `https://grafana.com/docs/tempo/latest/`（2701 字）
> - Elastic「What is the ELK Stack」— `https://www.elastic.co/what-is/elk-stack`（3828 字）
> - OpenTelemetry 官方文档 `opentelemetry.io` 当前在沙箱 fetch 间歇性失败（TLS），其信号规范/SDK/Collector 细节**待补官方抓取后并入**（与 op-c9-s3 一致，不臆造）。

---

## 第10章 · 日志与链路追踪深化

**章目标**：在 op-c4 可观测性基础之上，落地"日志"与"链路"两大支柱——能用 Loki 建低成本日志栈并用 LogQL 排查、能用 Tempo 还原一次请求的全链路、理解 ELK 生态定位；厘清三大支柱（metrics/logs/traces）如何联动排障。

---

### op-c10-s1 · 日志体系与 Loki（label 模型 + LogQL）

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方

> 心智模型：Loki 像**"只给日志贴标签、正文塞进压缩块的廉价仓库"**——和 Prometheus 一样用 label 索引，但**不索引日志全文**，正文压缩后丢进对象存储（S3/GCS/本地），所以又省又便宜；查的时候靠标签定位、靠 LogQL 在命中的块里过滤。

## 心智模型
Loki 是一组可组合成完整日志栈的开源组件。**和其他日志系统不同，Loki 只索引日志的元数据（labels，和 Prometheus labels 一个思路）**；日志正文被压缩成 chunks，存在对象存储（Amazon S3 / Google Cloud Storage）甚至本地文件系统。一个小索引 + 高压缩块，让 Loki 的运维极简、成本显著低于全文索引方案。

## 核心知识点（锚定官方）
- **索引模型**：仅对 labels 建索引；日志正文不进索引，仅压缩存储。
- **存储后端**：chunks 存对象存储（S3/GCS）或本地文件系统。
- **LogQL**：受 PromQL 启发，用 labels + 运算符过滤；支持 line filters、`| json` / `| logfmt` / `| pattern` / `| regexp` 等 pipeline。
- **label 即 log stream**：每个唯一的 label 值组合 = 一个新 stream，单独存储与索引。
  - ✅ 低基数、每次查询都会过滤的维度放 label：`env` / `cluster` / `namespace` / `app` / `job`。
  - ❌ 高基数值**不要**放 label：`pod`、instance ID、request ID、user ID、trace ID、HTTP 状态码、IP——每个唯一值都会新建 stream，引发**基数爆炸（cardinality explosion）**，拖垮写入与查询。
- **structured metadata（Loki 3.0 引入）**：给日志条目附加 KV 而**不创建新 stream**，用于"要过滤/展示但太高基数"的值（如经 Alloy 把 `trace_id` 挂为 structured metadata）。
- **查询时解析（parsed fields）**：`| json` / `| logfmt` 等查询时解析，无需改 schema、无索引开销；适合日志内容里的偶发过滤。
- **经验法则**：每次查询都过滤 → 放 label；仅偶发需要或多唯一值 → 用 structured metadata，或在查询时从日志行解析。
- **retention 由 Compactor 负责**（非 ingester、非存储后端）：`retention_enabled: true` 须设在 compactor 块；删除非即时，Compactor 按调度标记后删除（有 grace period）。
- **部署模式**：monolithic（单二进制，本地 FS 后端，最快试手）vs microservices。采集器用 **Alloy**（支持 OTLP / HTTP API 把日志送进 Loki）。

> 来源：[Grafana Loki · Docs](https://grafana.com/docs/loki/latest/)

## 为什么重要 / 何时会用到
日志是"事后查现场"的主力。Loki 的 label 模型把成本压到极低——你不用为全文索引买单，却能用 LogQL 在 Grafana 里做即席查询、甚至"从日志生成指标并告警"。但 label 设计一旦踩高基数，整个栈会写入/查询双崩。

## 常见坑
- **label 高基数爆炸**：把 user_id / request_id / IP 当 label，stream 数指数膨胀。
- **误以为 retention 是 ingester 管**：其实 Compactor 才负责，漏配 `retention_enabled` 或 Compactor 没起，旧数据删不掉。
- **Docker 里 Grafana 连 Loki 用 localhost**：容器内的 localhost 指向自己；须用 compose service 名 `http://loki:3100`。
- **LogQL 指标查询静默返回"no data"**：无匹配时返回空而非 0，破坏比率/告警；用 `or on() vector(0)` 兜底（同 PromQL 套路）。
- **只看日志不接 traces**：出了"某次请求慢"查不动——需 Tempo/OTel 补链路（见 s2）。

## 动手自测
1. 本地 monolithic 起 Loki + Alloy，把某服务日志送进去；在 Grafana 加 Loki 数据源，用 Explore 跑 `|= "error"` 过滤。
2. 故意把 `user_id` 当 label 写入，观察 stream 数飙升；改回用 structured metadata，对比写入压力。
3. 写一条 LogQL 比率告警：`count_over_time({app="x"} | json | status=~"5.." [5m]) / count_over_time({app="x"}[5m])`，用 `or on() vector(0)` 防静默。

## 面试视角
"Loki 和 ELK 最大区别？"答：Loki 只索引 label、正文压缩存对象存储，成本低、和 Prometheus 同思路；ELK 对全文建倒排索引，功能强但成本高。"为什么 label 不能放 user_id？"答：高基数导致 stream 爆炸，写入与查询劣化。追问 structured metadata 与 parsed fields 的取舍。

## 相关知识图谱
- [op-c9-s1 Prometheus 架构](doc:devops/op-c9/op-c9-s1) — labels 模型同源
- [op-c9-s3 三大支柱与 LGTM](doc:devops/op-c9/op-c9-s3) — 日志在三大支柱中的位置
- [op-c10-s2 Tempo 链路](doc:devops/op-c10/op-c10-s2) — 日志如何跳链路

---

### op-c10-s2 · 分布式链路追踪与 Tempo（traces + TraceQL）

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方

> 心智模型：Tempo 像**"给一次请求拍全程的录像带"**——把跨多个服务的调用链（trace）存起来，只依赖对象存储，便宜还能撑海量；你点开一条 trace，就能看到这次请求先后穿过哪些服务、卡在哪一段。

## 心智模型
分布式追踪（distributed tracing）把**一次请求穿过一组应用的生命周期可视化**。Tempo 是开源、易用、高扩展的分布式追踪后端：把 trace 搜出来、从 span 生成指标、并把追踪数据和日志/指标联动。它成本低，只需对象存储即可运行，并与 Grafana、Mimir、Prometheus、Loki 深度集成。

## 核心知识点（锚定官方）
- **定位**：OSS 高扩展分布式追踪后端；可视化一次请求跨应用的完整生命周期。
- **存储**：成本高效，仅需对象存储。
- **生态集成**：与 Grafana / Mimir / Prometheus / Loki 深度集成。
- **协议兼容**：支持开源追踪协议 **Jaeger、Zipkin、OpenTelemetry**。
- **从 span 生成指标**：metrics-generator、TraceQL metrics。
- **跨信号跳转**：**Prometheus exemplars** 从 metrics 跳到 Tempo traces；**Loki derived fields** 从 logs 跳到 traces——形成"指标异常 → 下钻链路 → 比对日志"闭环。
- **TraceQL**：受 PromQL / LogQL 启发的查询语言，精确选 span 并直接跳到满足条件的 span。

> 来源：[Grafana Tempo · Docs](https://grafana.com/docs/tempo/latest/)

## 为什么重要 / 何时会用到
metrics 告警说"错误率升了"但说不清原因，logs 能查但量大难关联——**traces 还原一次请求穿过哪些服务、卡在哪**。微服务下"这次请求为什么慢"基本只能靠链路追踪回答。

## 常见坑
- **只建 metrics 不做 traces**：微服务慢请求无处溯源。
- **链路只覆盖部分服务**：没统一埋点（OTel/SDK），trace 断链、看不全。
- **以为 Tempo 要复杂存储**：其实只需对象存储，过度配置反而增加运维负担。
- **不接 exemplars / derived fields**：metrics 与 traces 各自为政，跳转闭环没打通。

## 动手自测
1. 起 Tempo + Grafana，用 OpenTelemetry/Jaeger 协议给一个多服务 demo 埋点，在 Grafana Tempo 数据源里搜出一条 trace，看跨服务 span。
2. 配 Prometheus exemplars，从一条指标点进对应 trace；再用 Loki derived fields 从一条 error 日志跳到 trace。
3. 用 TraceQL 精确筛选"耗时 > 1s 且 status=error"的 span。

## 面试视角
"什么是分布式追踪？Tempo 做什么？"答：追踪还原请求跨服务路径与耗时；Tempo 是只依赖对象存储的高扩展追踪后端，兼容 Jaeger/Zipkin/OTel。"metrics 和 traces 怎么联动？"答：exemplars 从指标跳链路、derived fields 从日志跳链路，构成排障闭环。追问 OpenTelemetry 定位——厂商中立标准（待补官方资料）。

## 相关知识图谱
- [op-c10-s1 Loki 日志](doc:devops/op-c10/op-c10-s1) — logs→traces 跳转
- [op-c9-s2 Grafana 可视化](doc:devops/op-c9/op-c9-s2) — 统一驾驶舱
- [op-c10-s3 ELK 与选型](doc:devops/op-c10/op-c10-s3) — 日志/链路生态对比

---

### op-c10-s3 · ELK 生态与三大支柱联动（含 OpenTelemetry 待补）

> 时效 | 核验=2026-08-16 | 风险=中 | 来源=官方（Elastic 侧）+ 待补 OpenTelemetry 官方规范

> 心智模型：日志栈有两条主流路线——**Loki（标签派，便宜、和 Prometheus 同源）** vs **ELK（全文索引派，强检索、功能全）**；选哪个看你是"按 label 过滤为主"还是"全文检索/聚合为主"。两者都能接入同一套 Grafana 驾驶舱。

## 心智模型
**Elastic Stack（即 ELK Stack）** = Elasticsearch + Kibana + Beats + Logstash：从任何来源、任何格式可靠且安全地取数，再搜索、分析、可视化。Elasticsearch 是分布式、JSON 基础的搜索与分析引擎；Kibana 是数据可视化的可扩展 UI；Beats 是轻量数据采集器；Logstash 是 ingest 管线。Integrations 提供 200+ 预建集成，从应用/基础设施/公开内容源分钟级接入。

## 核心知识点（锚定官方）
- **Elastic Stack 四件套**：Elasticsearch（搜索/分析引擎）、Kibana（可视化 UI）、Beats（采集）、Logstash（ingest pipeline）。
- **ingest from any source**：通过 Elastic Agent / Beats / web crawler 等从应用、基础设施、公开源采集；200+ 预建集成（含 S3、MySQL 等）。
- **解决方案层**：Logs / Metrics / APM / Uptime / SIEM / Endpoint——ELK 不只是日志，也覆盖指标与 APM。
- **三大支柱联动（Grafana 生态）**：metrics(Prometheus) → 下钻 traces(Tempo) → 比对 logs(Loki/ELK)；Grafana 把三信号统一到一个驾驶舱。
- **OpenTelemetry（待补）**：厂商中立的可观测性标准，统一 traces/metrics/logs 的信号规范与多语言 SDK/Collector。当前 `opentelemetry.io` 在沙箱 fetch 间歇性失败，**其信号规范、SDK 接入、Collector 管线将在补抓官方文档后并入本节**，本草稿不臆造。

> 来源：[Elastic · What is the ELK Stack](https://www.elastic.co/what-is/elk-stack)

## 为什么重要 / 何时会用到
日志/链路不是孤立的——生产排障标配是三支柱联动。Loki 与 ELK 是日志栈的两条路线，理解差异才能按团队场景选型；而无论哪条路线，最终都应汇入统一的 Grafana 驾驶舱与 OpenTelemetry 标准收口。

## 常见坑
- **Loki vs ELK 选型错位**：要全文检索/复杂聚合却选了 Loki；只要 label 过滤却上了 ELK 背了高成本。
- **日志全量无采样、无索引设计**：成本爆炸且查不动（Loki 的 label/ELK 的索引映射都很关键）。
- **OTel 与既有 exporter 混用不清边界**：应以 OTel 标准收口，Alloy/Collector 做兼容转换（见 op-c9-s3）。

## 动手自测
1. 在 Grafana 同一 dashboard 同时挂 Prometheus(metrics) + Loki(logs) + Tempo(traces) +（可选）Elasticsearch(logs)，模拟"错误率告警 → 点进 trace → 看对应日志"。
2. 用 Alloy 收集一端 OTel 格式数据，验证其同时兼容 Prometheus 指标与 OTel trace（呼应 op-c9-s3）。

## 面试视角
"Loki 和 ELK 怎么选？"答：Loki 标签派、成本低、和 Prometheus 同源，适合 label 过滤为主；ELK 全文倒排、检索/聚合强但成本高，适合全文检索场景。"三大支柱如何联动？"答：指标异常→下钻链路→比对日志，Grafana+OTel/LGTM 是主流开源组合。追问 OpenTelemetry 定位——厂商中立标准（待补官方资料）。

## 相关知识图谱
- [op-c10-s1 Loki](doc:devops/op-c10/op-c10-s1) — 标签派日志栈
- [op-c10-s2 Tempo](doc:devops/op-c10/op-c10-s2) — 链路支柱
- [op-c9-s3 三大支柱与 LGTM](doc:devops/op-c9/op-c9-s3) — 选型与 OTel 待补

---

## 代行策展说明（供你审阅）
- 本批草稿全部事实锚定已抓取的**真实官方正文**（grafana.com Loki/Tempo、elastic.co ELK，均 HTTP 200），来源 URL 可回溯，无臆造。
- OpenTelemetry 因沙箱 fetch 受限，按 op-c9 一致口径**诚实标注"待补"**，不编造信号规范细节。
- 若认可，我将在你确认后按现有 seed schema 写入 `data/seed-content.json` 的 `devops` 模块下 `op-c10`，并跑 `_reseed.mjs` 校验无漂移。
