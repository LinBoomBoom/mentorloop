<!-- title: CI/CD 与可观测性 -->
<!-- goal: 掌握从代码提交到生产部署的自动化流水线设计、发布策略，以及用指标/日志/追踪三大支柱构建可观测系统，能用 Prometheus/Grafana/OpenTelemetry 落地监控告警与排障。 -->

# op-c4-s1 | CI/CD 流水线设计
> direction: 把"提交代码→上线"的每一步自动化、可重复、可回溯。

## 心智模型
CI/CD 像一条**自动化流水线工厂**：代码推上来先过**质检关（CI：构建+单测+扫描）**，合格才进入**发货关（CD：打包+部署）**。目标不是"能跑就行"，而是**频繁、小步、低风险**地交付——每次提交都可能是一次安全发布。衡量它好坏用 DORA 四大指标。

## 核心知识点（锚定官方）
- **阶段划分**：`build`（编译/镜像构建）→ `test`（单元/集成/端到端）→ `package`（打制品/镜像）→ `deploy`（到环境）→ `verify`（冒烟/健康检查）。每阶段失败则流水线中止。
- **CI（持续集成）**：开发者频繁合并主干，每次合并自动构建测试，尽早暴露冲突与回归。
- **CD（持续交付/部署）**：交付=随时可发布（常需手动点）；部署=自动上生产。区别在"最后一步是否自动"。
- **DORA 四指标**：部署频率（越高越好）、变更前置时间（越短越好）、变更失败率（越低越好）、服务恢复时间 MTTR（越短越好）。高效能团队远超低效能。
- **流水线即代码**：`.gitlab-ci.yml`/`Jenkinsfile`/`GitHub Actions workflow`，版本化管理，随仓库演进。
来源：DORA / Accelerate (Google Cloud) https://dora.dev/ ；GitLab CI 文档 https://docs.gitlab.com/ee/ci/ ；GitHub Actions https://docs.github.com/actions

## 为什么重要
手工发布=出错温床（漏步骤、环境差、半夜救火）。自动化流水线把"人易错环节"固化，并让每次变更可追踪、可回滚。DORA 指标直接关联组织交付效能。

## 常见坑
- 只在 CI 跑"能通过的测试"，单测覆盖率低、缺集成测试，生产才暴露。
- 把密钥写进流水线脚本或明文环境变量，CI 日志泄露。
- 流水线串行过长、无缓存，一次构建 40 分钟，倒逼开发者跳过 CI 直接合。
- 把 CD 误配成"任意合并即自动上生产"，无门禁、无审批、无金丝雀。

## 动手自测
```yaml
# GitHub Actions 最小 CI
on: [push]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm run build
```
问：如何在测试通过前禁止合并？（设 branch protection + required status check）

## 面试视角
- CI 与 CD 区别？持续交付与持续部署差异？
- DORA 四指标是什么，各自衡量什么？
- 为什么流水线要把"易错的人工步骤"自动化？

# op-c4-s2 | Git 分支策略与语义化版本
> direction: 用分支模型管理并行开发，用版本号传达变更性质。

## 心智模型
分支策略是团队的**协作交通规则**：它规定"功能在哪开发、何时合主干、怎么发版"，避免所有人改同一处乱成一锅。语义化版本（SemVer）则是**给版本的说明书**：`主.次.修订` 三个数字直接告诉你"这次改动有多猛、要不要怕"。

## 核心知识点（锚定官方）
- **Trunk-Based（主干开发）**：几乎所有开发在短生命周期分支或直接在主干，频繁合并（推荐高效能团队）；配合特性开关（feature flag）隐藏未完成功能。
- **GitFlow**：`main`/`develop` 长分支 + `feature`/`release`/`hotfix` 短分支，结构清晰但较重，适合发布节奏固定、多版本并行维护的项目。
- **GitHub Flow**：只有 `main` + 短 PR 分支，合并即部署，简单适合 SaaS 持续部署。
- **SemVer（semver.org）**：`MAJOR.MINOR.PATCH`——MAJOR 不兼容变更、MINOR 向后兼容新功能、PATCH 向后兼容修复；预发 `-beta.1`、元数据 `+build`。
- **Tag**：用 `git tag v1.2.0` 标记发布点，便于回溯与制品对应。
来源：SemVer https://semver.org/ ；Trunk-Based Development https://trunkbaseddevelopment.com/ ；Git 官方 https://git-scm.com/doc

## 为什么重要
分支模型选错，要么流程臃肿拖慢交付，要么随意合代码互相踩；版本号乱标（如"1.0→2.0 其实只改了文案"）会让消费方误判兼容风险，或反之漏标 breaking 引发事故。

## 常见坑
- GitFlow 的 `release` 分支长期存在，与 `develop` 双向同步痛苦，对 SaaS 过度设计。
- 主干开发却没特性开关，半成品直接暴露给用户。
- SemVer 把不兼容改动当 MINOR 发，破坏下游（"我升级了次版本，怎么挂了"）。
- 用 commit hash 当版本号，无法表达变更性质。

## 动手自测
```bash
git tag -a v1.2.0 -m "release 1.2.0" && git push origin v1.2.0
# 语义化版本决策：删了一个公开 API → MAJOR 升
# 新增可选参数且兼容 → MINOR 升；修 bug → PATCH 升
git branch -m feature/x                    # 短生命周期分支
git rebase main                            # 保持线性历史
```

## 面试视角
- Trunk-Based 与 GitFlow 适用场景差异？
- SemVer 三段各代表什么，何时升 MAJOR？
- 主干开发如何避免半成品暴露（特性开关）？

# op-c4-s3 | 制品管理与镜像仓库
> direction: 构建产物要"一次构建、处处部署"，且可追溯、不可篡改。

## 心智模型
制品（artifact）是**构建的出厂成品**——Jar、npm 包、Docker 镜像、Helm chart。把它存进**制品仓库**就像进正规仓库：同一份构建产物在所有环境（测试→预发→生产）复用，杜绝"测试过的包和生产跑的不是同一个"。配合**不可变 + 签名**，保证没人能偷偷改已发布的包。

## 核心知识点（锚定官方）
- **制品仓库类型**：Docker Registry（镜像，如 Harbor/ACR/ECR）、Maven/Nexus（Jar）、npm registry、Helm registry、通用制品（Artifactory）。
- **不可变制品**：镜像 tag 不覆盖重写；用**唯一 digest**（`sha256:...`，`docker pull repo@sha256:...`）精确拉取，避免 `:latest` 漂移。
- **签名与 Supply Chain**：cosign（Sigstore）给镜像签名，`notation`；校验来源防止投毒；SLSA 框架定义构建完整性等级。
- **SBOM**：软件物料清单（如 CycloneDX/Syft 生成），列明全部依赖，便于漏洞追踪。
- **清理策略**：按保留天数/版本数滚动清理，防仓库膨胀。
来源：OCI Distribution Spec https://github.com/opencontainers/distribution-spec ；Sigstore cosign https://github.com/sigstore/cosign ；SLSA https://slsa.dev/ ；SemVer（制品版本）

## 为什么重要
用 `:latest` 部署，今天和明天拉到的可能不是同一镜像，排障无从复现；制品不签名，供应链投毒（如恶意依赖）直接进入生产。可追溯、不可变是合规与稳定性的底线。

## 常见坑
- 生产用 `image:latest`，回滚/排障时不知跑的是哪版；应锁 digest 或明确 tag。
- 覆盖重写已发布 tag，导致历史环境无法复现同一版本。
- 制品仓库无访问控制，任意人可推包（投毒风险）。
- 不生成 SBOM，出现 CVE（如 log4j）时无法快速定位受影响服务。

## 动手自测
```bash
docker build -t registry/app:1.3.0 .
docker push registry/app:1.3.0
docker inspect --format='{{index .RepoDigests 0}}' registry/app:1.3.0   # 取 digest
docker pull registry/app@sha256:xxxx      # 按 digest 精确拉取
cosign sign registry/app:1.3.0            # 签名
```

## 面试视角
- 为什么生产不该用 `:latest`？digest 有何作用？
- 制品签名（cosign）解决什么问题？SBOM 是什么？
- "一次构建、处处部署"为什么重要？

# op-c4-s4 | 发布策略
> direction: 让新版本上线风险可控，出问题能秒级切回。

## 心智模型
发布策略是**换血的姿势**：直接全量替换（重建）最简单但最危险；**滚动**一点一点换；**蓝绿**先备一套新环境、切流量瞬间切换；**金丝雀**先放 1% 用户当"小白鼠"，指标 OK 再放大。核心思想——**用小范围验证替代全量赌博**，出错影响面可控。

## 核心知识点（锚定官方）
- **滚动更新（Rolling）**：逐批替换旧实例，零额外资源但过程新旧混跑，出问题需回滚。
- **蓝绿（Blue-Green）**：两套全等环境，流量在 LB/Ingress 层一次性从蓝切到绿；回滚=切回；需双倍资源。
- **金丝雀（Canary）**：先把少量流量（如 5%）导到新版本，监控错误率/延迟，逐步放量（5%→25%→100%），异常即停。Argo Rollouts / Nginx 加权实现。
- **灰度/特性开关**：按用户属性（白名单、地域）逐步开放，与金丝雀互补。
- **回滚机制**：保留旧版本镜像/ReplicaSet，异常时快速切回；数据库变更需向前兼容（可回滚的 schema）。
来源：K8s 滚动更新 https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ ；Argo Rollouts https://argoproj.github.io/rollouts/ ；Martin Fowler BlueGreen/Canary https://martinfowler.com/bliki/

## 为什么重要
"全量上线=赌一把"：一旦新版本有 bug，100% 用户受影响。蓝绿/金丝雀把爆炸半径压到最小，且回滚是秒级流量切换而非重新部署，MTTR 大幅下降。

## 常见坑
- 金丝雀只看"服务起来了"没看错误率/延迟，放量后才发现 bug 已扩散。
- 蓝绿切流量但数据库 schema 不兼容旧版，旧环境回切即崩。
- 滚动更新 `maxUnavailable:0` 但节点资源不足，发布卡死。
- 回滚只回了应用没回数据库，数据层新旧版本不兼容。

## 动手自测
```yaml
# Argo Rollouts canary 片段
strategy:
  canary:
    steps:
      - setWeight: 5
      - pause: { duration: 5m }
      - setWeight: 25
      - pause: { duration: 10m }
      - setWeight: 100
```
```bash
kubectl argo rollouts abort myapp    # 异常中止回滚
```

## 面试视角
- 蓝绿与金丝雀的核心区别与资源代价？
- 金丝雀放量除了"服务起来"还应看哪些指标？
- 为什么数据库变更也要可回滚（向前兼容）？

# op-c4-s5 | 监控指标体系（Prometheus）
> direction: 用统一的数据模型把系统"血压"量出来。

## 心智模型
监控像给系统装**仪表盘**：Prometheus 定期去各目标"抽血"（拉取指标），存成带标签的时间序列。指标分四种"体温计"：**计数器**（只增不减，如请求数）、**量表**（可升可降，如在线连接数）、**直方图**（看分布，如请求耗时分桶）、**摘要**（类似直方图但服务端算分位数）。所有指标都靠 `标签（label）` 这一维度切片。

## 核心知识点（锚定官方）
- **数据模型**：每条时间序列 = `指标名{标签键值对}` + 时间戳+值；`up{job="api"}` 这类。
- **四种指标类型**：Counter（累加）、Gauge（瞬时值）、Histogram（观测值分桶+`_count/_sum/_bucket`）、Summary（客户端分位数）。
- **Pull 模型**：Prometheus Server 按 `scrape_interval` 主动拉 `/metrics` 端点；区别于 Pushgateway（短任务推送）。
- **PromQL**：`rate(http_requests_total[5m])` 求 QPS；`histogram_quantile(0.95, ...)` 求 P95 延迟；支持 `by (label)` 聚合。
- **exporter**：node_exporter（主机）、cadvisor（容器）、各中间件自带 `/metrics`。
来源：Prometheus 数据模型 https://prometheus.io/docs/concepts/data_model/ ；指标类型 https://prometheus.io/docs/concepts/metric_types/ ；PromQL https://prometheus.io/docs/prometheus/latest/querying/basics/

## 为什么重要
没有指标就没有"系统健康"的客观证据，一切靠"感觉没挂"。Counter/Gauge 选错会导致 rate 算出负值或无法算速率；不理解 label 基数爆炸会拖垮 Prometheus 本身。

## 常见坑
- 用 Gauge 记录"累计请求数"导致无法用 `rate` 算 QPS（应为 Counter）。
- 在高基数字段（如 user_id）上打 label，时间序列爆炸、Prometheus OOM。
- `rate` 用的时间窗口小于 `scrape_interval`，结果不稳定/为 0。
- 只监控"是否存活 up"，没监控延迟/错误率/饱和度（USE/RED 方法缺失）。

## 动手自测
```promql
rate(http_requests_total{job="api"}[5m])                 # QPS
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
up{job="api"} == 0                                       # 实例宕了
```
```bash
curl -s localhost:9090/metrics | grep -E '^go_goroutines'   # 看原始指标
```

## 面试视角
- Counter 与 Gauge 区别，为什么 QPS 必须用 Counter？
- 什么是 label 基数爆炸，怎么避免？
- `rate()` 的时间窗口为什么要大于 scrape_interval？

# op-c4-s6 | 可视化与告警
> direction: 把数字变成能一眼看懂的图，把异常变成能行动的通知。

## 心智模型
**Grafana 是仪表盘工厂**：把 Prometheus 的指标画成曲线/热力/表格，让值班人扫一眼就懂系统状态。**Alertmanager 是警报调度员**：指标越界时，它负责"发给谁、去哪（钉钉/企微/邮件）、静默多久、如何分组去重"，避免报警风暴把人淹没。

## 核心知识点（锚定官方）
- **Grafana 看板**：数据源接 Prometheus；Panel 用 PromQL 查询；Dashboard 模板可导入（如 Node Exporter Full）。
- **告警规则**：在 Prometheus 定义 `alerting rules`（如 `rate(errors[5m]) > 0.05`），触发后推给 Alertmanager。
- **Alertmanager**：`route` 路由分组、`receiver` 接收器、`group_by` 聚合、`inhibit_rules` 抑制（如"主机宕"抑制其下"服务宕"）、`silence` 静默。
- **告警质量**：告警应**可行动**（收到就知道干嘛）；避免"狼来了"——阈值过松漏报、过紧误报导致告警疲劳（alert fatigue）。
- **RED/USE 方法**：RED（请求率/错误率/时延）看服务，USE（利用率/饱和度/错误）看资源。
来源：Grafana 文档 https://grafana.com/docs/ ；Prometheus Alerting https://prometheus.io/docs/alerting/latest/overview/ ；Alertmanager https://prometheus.io/docs/alerting/latest/alertmanager/

## 为什么重要
指标堆在库里不画出来没人看；告警不分组去重，值班人会在一波故障里收几十条重复短信然后全屏蔽。好的可视化+精准告警=故障被发现得早、定位得快。

## 常见坑
- 看板堆满指标无重点，真正关键曲线埋在角落。
- 告警无 `for: 5m` 持续时间，瞬时抖动就狂叫，养成"忽略告警"习惯。
- 没配 `inhibit_rules`，主机宕时同时收到主机+其上所有服务的告警（噪声翻倍）。
- 告警只发不 actionable（"CPU 高"但不说影响谁、怎么办）。

## 动手自测
```yaml
# Prometheus 告警规则示例
- alert: HighErrorRate
  expr: rate(http_requests_total{code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m
  labels: { severity: page }
  annotations: { summary: "错误率超 5%", runbook: "https://wiki/runbook/api" }
```
```bash
amtool alert query        # 查当前告警
```

## 面试视角
- 告警疲劳怎么产生、如何用 for/inhibit/分组缓解？
- RED 与 USE 方法分别看什么？
- 一条好告警应具备什么特征（可行动性）？

# op-c4-s7 | 日志体系
> direction: 系统出事后，日志是最忠实的"黑匣子"。

## 心智模型
日志是系统**按时间写下的日记**。零散日志没用，要建成**集中式日志系统**：应用输出**结构化日志（JSON，带 timestamp/level/traceId）**，被 agent 采集、传输、集中存储、可检索。就像把全公司各部门的笔记本收进一个可全文搜索的档案库——出事时一键翻出"那几分钟谁说了什么"。

## 核心知识点（锚定官方）
- **结构化日志**：用 JSON 而非纯文本，字段可被索引检索；含 `level`(INFO/WARN/ERROR)、`ts`、`msg`、`trace_id`、`service`。
- **ELK/EFK 栈**：Elasticsearch（存储+检索）+ Logstash/Fluentd（采集处理）+ Kibana（可视化）；或 Loki（只索引 label、按日志流存储，轻量）+ Promtail + Grafana。
- **采集链路**：应用 → stdout（容器）→ 节点 log agent（Fluent Bit/Filebeat）→ 中心存储；K8s 下推荐走 stdout 由 DaemonSet 采集。
- **分级与采样**：ERROR 必存，DEBUG 生产按需开；高频日志采样避免成本爆炸。
- **关联**：用 `trace_id` 把一次请求跨服务的日志串起来（与追踪联动）。
来源：Elastic docs https://www.elastic.co/guide/index.html ；Grafana Loki https://grafana.com/docs/loki/ ；Fluent Bit https://docs.fluentbit.io/ ；12-Factor 日志（到 stdout）https://12factor.net/logs

## 为什么重要
没有集中日志，排障靠"登十几台机器 grep"；纯文本日志无法按字段检索，定位慢。结构化+集中化把 MTTR 从小时级压到分钟级，且能跨服务还原一次请求的完整轨迹。

## 常见坑
- 把日志直接写文件又不采集，容器重建即丢；应走 stdout 由平台统一采。
- 日志打明文密码/token/PII，集中存储后泄露面更大。
- 生产开 DEBUG 全量日志，存储成本与噪声双高，应用性能也受影响。
- 日志没带 `trace_id`，跨服务问题无法串联，只能逐台翻。

## 动手自测
```json
{"ts":"2026-08-01T10:00:00Z","level":"ERROR","service":"payment","trace_id":"abc123","msg":"charge failed","order_id":"O123"}
```
```bash
# Loki 按 label 查
{service="payment", level="ERROR"} |= "charge failed"
# Kibana DSL: 查某 trace_id 全链路
```

## 面试视角
- 为什么生产日志应走 stdout 而非写文件？
- 结构化日志（JSON）相比纯文本的优势？
- `trace_id` 在日志体系中的作用？

# op-c4-s8 | 分布式追踪
> direction: 在微服务迷宫里，追踪一次请求走过的所有"站点"。

## 心智模型
一个用户请求往往穿过十几个服务，像**快递经过多个中转站**。分布式追踪给每次请求发一张"全程运单"（trace），每个服务处理它的一段叫 **span**，span 之间父子串联。拿着运单，你就能看清"这次慢，卡在第三个中转站（服务）的数据库查询"——这是日志和指标单独做不到的。

## 核心知识点（锚定官方）
- **核心概念**：Trace（一次完整请求）、Span（一个工作单元，含起止时间、操作名、状态）、SpanContext（传播标识：trace_id + span_id + flags）。
- **上下文传播（Propagation）**：跨进程/网络通过 HTTP header（如 `traceparent`，W3C Trace Context）传递 SpanContext，串起链路。
- **OpenTelemetry（OTel）**：厂商中立的**标准与 SDK/Collector**，统一采集 traces/metrics/logs，可导出到 Jaeger/Tempo/各 APM；`auto-instrumentation` 减少改码。
- **采样**：生产全量追踪成本高，用 `parentbased`/尾部采样控制；错误与慢请求优先采。
- **W3C Trace Context**：`traceparent` 头格式标准化跨系统传播。
来源：OpenTelemetry https://opentelemetry.io/docs/ ；W3C Trace Context https://www.w3.org/TR/trace-context/ ；Jaeger https://www.jaegertracing.io/

## 为什么重要
指标告诉你"系统慢了"，日志告诉你"某服务报错了"，但**只有追踪告诉你"慢/错发生在调用链的哪一跳、被谁拖累"**。微服务排障没有它基本靠猜。

## 常见坑
- 只在一个服务埋点，跨服务链路断裂，看不到全貌（须全链路传播）。
- 上下文传播 header 被网关/Nginx 误删或未透传，trace 断链。
- 生产全量采样，Collector 与存储被打爆、成本失控。
- 把追踪数据（可能含 URL/参数）落到第三方 APM 未脱敏，泄露敏感信息。

## 动手自测
```bash
# W3C traceparent 头示例（跨服务透传）
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
# OTel Collector 接收并导出到 Jaeger
otelcol --config collector.yaml
# 在服务间确保透传 header（HTTP 客户端须转发 traceparent）
```
```bash
jaeger query        # 按 trace_id 查完整调用链
```

## 面试视角
- Trace / Span / SpanContext 分别是什么？
- 为什么上下文传播（traceparent）对全链路追踪至关重要？
- 生产为什么不能全量追踪，采样策略怎么定？

# op-c4-s9 | 可观测性三位一体与 OnCall
> direction: 指标、日志、追踪合体，再加 SLO 驱动的值班，才是真"看得清"。

## 心智模型
**可观测性 = 指标（量体温）+ 日志（看病史）+ 追踪（查传染路径）** 三位一体，单看任何一个都是盲人摸象。把它们用 `trace_id`/`service`/`instance` 关联，再立起 **SLO（服务目标）** 这把尺子——当错误预算烧完就亮红灯、自动降速发布。OnCall 则是"谁来盯着尺子、出事按 runbook 救火"的组织保障。

## 核心知识点（锚定官方）
- **三支柱关联**：同一个 `trace_id` 既能跳到对应日志，也能在指标上看该请求所属服务的 RED；Grafana 等支持 trace↔log↔metric 跳转。
- **SLO/SLI/Error Budget**：SLI 是实际测量的健康度（如成功率），SLO 是目标（如 99.9%），Error Budget = 1 - SLO 允许的失败额度；预算耗尽触发发布冻结/事后复盘。
- **OnCall 机制**：告警分级（page vs ticket）、rotation 轮班、runbook（标准处置手册）、事后无指责复盘（postmortem）。
- **告警即 SLO 违规**：基于"用户可感知的错误"而非基础设施指标设告警，更贴近业务。
- **可观测性 vs 监控**：监控回答"已知问题是否发生"，可观测性让你从未知症状反推根因（靠高基数数据探索）。
来源：Google SRE Book（Monitoring/SLI-SLO）https://sre.google/sre-book/ ；OpenTelemetry Observability https://opentelemetry.io/docs/concepts/observability-primer/ ；Grafana 关联 https://grafana.com/

## 为什么重要
只监控不关联，排障要跨三个系统手工拼图；没有 SLO，团队对"多差算差"无共识，要么过度告警要么放任。OnCall 无 runbook，半夜叫醒的人只能现查，MTTR 失控。

## 常见坑
- 三支柱各自为政，trace_id 没打通，排障仍要人工拼。
- SLO 设成 100%（无 error budget），等于没 SLO，且任何抖动都违规。
- 告警按"CPU 高"而非"用户错误率"，业务方无感、SRE 背锅。
- OnCall 无 runbook、无复盘，同样故障反复发生。

## 动手自测
```yaml
# SLO 示例：月度成功率 99.9% → error budget 0.1%
sli: rate(errors[30d]) / rate(requests[30d]) <= 0.001
# 预算耗尽时冻结发布、触发复盘
```
```bash
# Grafana 中从 trace 跳日志：同一 trace_id 在 Loki 查询
{service="api"} | json | trace_id="abc123"
```

## 面试视角
- 可观测性三支柱是什么，为何必须关联？
- SLO/SLI/Error Budget 的关系，SLO 能设 100% 吗？
- 为什么告警应基于 SLO（用户可感知错误）而非纯基础设施指标？
