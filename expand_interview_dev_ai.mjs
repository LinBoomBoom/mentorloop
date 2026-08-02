/* 面试题扩量 · 运维 + AI 轨道（幂等）
 * 仅向 seed-content.json 的 content.interview 追加；新增 ai 轨道。
 * 重跑安全：已存在的 id 自动跳过。
 */
import fs from 'fs'
const SEED = './data/seed-content.json'
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'))

// 运维 hot oq13..oq40（28）
const devHot = [
  { id: 'oq13', q: 'CI/CD 流水线设计的关键环节', keywords: ['CI/CD', '流水线', 'devops', 'jenkins'],
    a: '**环节**：代码提交触发 → 代码扫描（lint/SAST）→ 单元测试 → 构建打包 → 镜像/制品 → 部署到测试环境 → 自动化集成/UI 测试 → 人工卡点/灰度 → 生产发布。\n\n**要点**：快速失败（前置检查先跑）、制品不可变、环境一致（IaC）、灰度与回滚、流水线即代码（Jenkinsfile/GitLab CI yaml）。\n\n**价值**：缩短交付周期、降低人为出错、可重复可审计。' },
  { id: 'oq14', q: 'Docker 镜像优化（体积/构建速度）', keywords: ['docker', '镜像', '多阶段', '缓存'],
    a: '**多阶段构建**：编译阶段 + 极简运行阶段（如 distroless/alpine），丢弃构建工具。\n\n**层缓存**：把不常变的指令（依赖安装）放前面，常变的代码放后面；`COPY package.json` 先于源码。\n\n**精简**：`.dockerignore` 排除无关文件；合并 RUN 减少层数；用较小基础镜像。\n\n**安全**：非 root 运行、扫描漏洞（Trivy）、最小权限。\n\n**校验**：`docker images` 看体积、`history` 看层。' },
  { id: 'oq15', q: 'Kubernetes 的核心组件与 Pod 调度', keywords: ['k8s', '调度', 'pod', 'scheduler'],
    a: '**控制面**：API Server（入口）、etcd（状态存储）、Scheduler（调度）、Controller Manager（副本/自愈）。\n**数据面**：kubelet（节点代理）、kube-proxy（网络）、容器运行时。\n\n**调度流程**：Scheduler 过滤（资源/亲和性/污点容忍）→ 打分（最闲/平衡）→ 绑定节点；kubelet 起 Pod。\n\n**关键对象**：Deployment（无状态）、StatefulSet（有状态）、Service（服务发现）、Ingress（入口）。' },
  { id: 'oq16', q: 'K8s 中 Pod 的探针（liveness/readiness/startup）', keywords: ['探针', 'liveness', 'readiness', 'k8s'],
    a: '**liveness**：存活探针失败 → 重启容器（处理死锁）。\n**readiness**：就绪探针失败 → 从 Service 摘流量（不重启，如依赖未就绪）。\n**startup**：启动探针，保护慢启动应用（期间不触发 liveness）。\n\n**方式**：exec / httpGet / tcpSocket；配好 initialDelay/period/threshold 避免抖动误杀。\n\n**实践**：业务接口做 readiness，健康检查做 liveness，二者不要混用。' },
  { id: 'oq17', q: '什么是 IaC（基础设施即代码）？常用工具', keywords: ['IaC', 'terraform', 'ansible', '基础设施'],
    a: '**思想**：用代码声明/管理基础设施（服务器、网络、云资源），可版本化、评审、复用、自动化。\n\n**工具**：\n- Terraform（多云、声明式、状态文件管理资源生命周期）\n- Ansible（配置管理/编排，agentless，YAML playbook）\n- Pulumi（用通用语言写 IaC）\n- CloudFormation（AWS 原生）\n\n**收益**：环境一致、可回滚、避免"雪花服务器"、降本提速。注意状态文件安全与漂移检测。' },
  { id: 'oq18', q: '如何做服务监控与告警（Prometheus + Grafana）', keywords: ['监控', 'prometheus', 'grafana', '告警'],
    a: '**指标模型**：Prometheus 拉取（pull）时序指标，PromQL 查询；Exporter 暴露各组件指标。\n\n**四黄金信号**：延迟、流量、错误率、饱和度。\n\n**告警**：Prometheus Alertmanager 按规则触发，分级（Warning/Critical）、去重、静默、路由到钉钉/飞书/电话。\n\n**可视化**：Grafana 仪表盘；日志用 Loki/ELK，链路用 Jaeger（可观测性三支柱：Metrics/Logs/Traces）。\n\n**告警原则**：基于 SLO、避免告警风暴、 actionable。' },
  { id: 'oq19', q: 'Linux 排查 CPU/内存/IO 高负载的命令', keywords: ['linux', '排查', 'top', '性能'],
    a: '**CPU**：`top/htop`（看负载与进程）、`mpstat -P ALL`、`pidstat` 定位高 CPU 进程、`perf` 火焰图找热点函数。\n**内存**：`free -h`、`top`（RES）、`vmstat`、`smem`；内存泄漏看 RSS 持续增长。\n**IO**：`iostat -x`（磁盘 util/await）、`iotop`（进程级）、`df -h`（空间）、`du`。\n**网络**：`netstat/ss`、`iftop`、`tcpdump`。\n\n**套路**：先整体（负载/水位）再定位进程再下钻代码/日志。' },
  { id: 'oq20', q: 'Nginx 常见配置与反向代理优化', keywords: ['nginx', '反向代理', '负载均衡', '配置'],
    a: '**反向代理**：`proxy_pass` + `proxy_set_header`（透传 Host/Real-IP）。\n**负载均衡**：`upstream` 配 `least_conn`/`ip_hash` + `health_check`。\n**性能**：`worker_processes auto`、`keepalive`、开启 gzip、`sendfile on`、静态文件 `expires` 缓存、开启 HTTP2。\n**TLS**：SSL 卸载、HSTS、会话复用。\n**限流**：`limit_req_zone` 令牌桶。\n**注意**：`X-Forwarded-For` 防 IP 伪造、`proxy_buffering` 调优。' },
  { id: 'oq21', q: '什么是蓝绿部署与金丝雀发布？', keywords: ['蓝绿', '金丝雀', '灰度', '发布'],
    a: '**蓝绿**：两套相同环境，流量一刀切从蓝切到绿，出问题秒级回切；资源翻倍但最稳。\n\n**金丝雀（Canary）**：先放少量流量到新版本，观察指标（错误率/延迟）逐步放量（1%→10%→100%），异常即停。\n\n**区别**：蓝绿是"全或无"切换，金丝雀是"渐进放量"；后者更平滑、风险更低、可基于指标自动推进（Argo Rollouts）。\n\n**前提**：可观测 + 快速回滚。' },
  { id: 'oq22', q: '数据库运维：备份与恢复策略', keywords: ['备份', '恢复', 'binlog', '容灾'],
    a: '**备份类型**：全量（定期）+ 增量/差异（日常）+ binlog（时间点恢复 PITR）。\n\n**工具**：mysqldump（逻辑）/ xtrabackup（物理热备）；云 RDS 自动快照。\n\n**恢复演练**：备份不等于安全，**定期恢复演练**验证可用性最关键。\n\n**容灾**：主从/多副本、异地多活、RPO/RTO 目标定义；binlog 保留足够时长。\n\n**注意**：备份加密与权限、恢复耗时评估、大表在线 DDL 用 gh-ost/pt-osc 防锁表。' },
  { id: 'oq23', q: '如何排查生产环境 OOM / 内存泄漏？', keywords: ['OOM', '内存泄漏', 'JVM', 'heap'],
    a: '**JVM**：看 GC 日志、用 `jstat`/`jmap` 抓堆、`MAT` 分析对象引用链找泄漏根（如静态集合长驻）。\n**Node**：`--max-old-space-size`、heapdump + Chrome DevTools 对比快照。\n**容器**：Pod OOMKilled 看 `dmesg`/events，调 requests/limits 或修泄漏。\n\n**套路**：监控内存曲线（是否只涨不落）→ 抓快照对比 → 定位大对象/未释放引用（监听器、缓存、闭包、连接池）。' },
  { id: 'oq24', q: '什么是服务网格（Service Mesh）？', keywords: ['service mesh', 'istio', 'sidecar', 'mesh'],
    a: '**思想**：把服务间通信（负载均衡、熔断、重试、鉴权、可观测）从应用剥离到基础设施层（Sidecar 代理，如 Envoy）。\n\n**组成**：数据面（Sidecar 代理流量）+ 控制面（Istio/下发配置、证书）。\n\n**价值**：业务零侵入获得统一流量治理与 mTLS；多语言统一。\n\n**代价**：架构复杂、延迟开销、运维门槛高。中小团队用网关+SDK 足够，不必强上 Mesh。' },
  { id: 'oq25', q: 'TLS/SSL 证书原理与续期', keywords: ['TLS', '证书', 'CA', '续期'],
    a: '**原理**：CA 用私钥对服务端公钥+域名签名生成证书；客户端用 CA 公钥验证链（根→中间→叶子），确认域名归属与未被篡改。\n\n**类型**：DV（域名验证）、OV（组织）、EV（扩展）；通配符 `*.example.com`；多域名 SAN。\n\n**续期**：Let\'s Encrypt 免费 90 天，用 certbot/acme.sh 自动续期（务必配定时器+告警，过期是大事故）。\n\n**注意**：私钥安全、HSTS、证书透明度（CT）监控。' },
  { id: 'oq26', q: '如何设计多活/容灾架构？', keywords: ['容灾', '多活', 'RPO', 'RTO'],
    a: '**指标**：RPO（允许丢多少数据）、RTO（恢复时长）。\n\n**等级**：冷备（慢）→ 温备（部分热）→ 同城双活 → 异地多活（单元化，流量按地域分片）。\n\n**难点**：跨地域数据一致性（异步复制）、时钟/ID 全局唯一、故障切流与"脑裂"防护。\n\n**单元化**：把用户路由到固定单元，单元内自包含，跨单元调用最小。\n\n**演练**：混沌工程（Chaos Mesh）定期注入故障验证韧性。' },
  { id: 'oq27', q: '日志收集与集中式日志方案（ELK/EFK）', keywords: ['日志', 'ELK', 'EFK', '采集'],
    a: '**链路**：应用日志 → Filebeat/Fluentd 采集 → Kafka 缓冲 → Logstash 清洗 → Elasticsearch 存储 → Kibana 查询可视化（EFK 用 Fluentd+Fluent Bit 替 Logstash）。\n\n**要点**：结构化日志（JSON）、统一字段（traceId 串联链路）、分级、采样降本、保留策略与冷热分层。\n\n**实践**：关键路径打 traceId，日志不记敏感信息；突发用 Kafka 削峰。' },
  { id: 'oq28', q: 'K8s 存储与有状态服务（PV/PVC/StatefulSet）', keywords: ['k8s', 'PV', 'PVC', 'StatefulSet', '存储'],
    a: '**模型**：PV（集群存储资源）、PVC（Pod 对存储的请求）、StorageClass（动态供给）。\n\n**有状态**：StatefulSet 提供稳定网络标识（pod-0/1）、稳定持久存储（每个副本独立 PVC）、有序部署/缩容。\n\n**适用**：数据库、消息队列等有状态中间件（但生产数据库更常用云托管 RDS 而非裸跑 K8s）。\n\n**注意**：存储卷生命周期、备份（Velero）、IO 性能与本地盘（local PV）。' },
  { id: 'oq29', q: '如何做容量规划与压测？', keywords: ['容量规划', '压测', '吞吐', '瓶颈'],
    a: '**步骤**：明确目标（QPS、RT、并发）→ 压测（JMeter/k6/全链路）→ 找瓶颈（CPU/IO/锁/DB/外部依赖）→ 调优 → 留余量（峰值×系数）。\n\n**指标**：吞吐、P99 延迟、错误率、资源水位；关注拐点（超过某 QPS 延迟陡增）。\n\n**类型**：基准/负载/压力/稳定性（soak）测试。\n\n**输出**：单实例容量 → 反推副本数与集群规模；订 SLO + 弹性（HPA）应对波动。' },
  { id: 'oq30', q: '什么是混沌工程（Chaos Engineering）？', keywords: ['混沌工程', 'chaos', '韧性', '故障演练'],
    a: '**思想**：主动向系统注入故障（杀节点、断网络、涨延迟），在受控环境验证系统能否自愈，提前暴露脆弱点。\n\n**原则**：先建稳态假设（如错误率<1%）、从小范围开始、自动化持续演练。\n\n**工具**：Chaos Mesh / Gremlin / Litmus；K8s 上注入 PodKill、NetworkDelay、CPU 压力。\n\n**价值**：把"以为能扛"变成"验证过能扛"，提升真实韧性。' },
  { id: 'oq31', q: 'Redis 持久化（RDB/AOF）与高可用', keywords: ['redis', '持久化', 'RDB', 'AOF', '哨兵'],
    a: '**RDB**：定时快照，恢复快、体积小，但可能丢最近数据；适合备份。\n**AOF**：记录每条写命令，append-only，数据更安全（可配 everysec），文件大、恢复慢。Redis 7 用 AOF 多文件+混合（RDB 头+AOF 增量）。\n\n**高可用**：主从复制（读写分离）+ 哨兵（Sentinel 自动故障转移）+ Cluster（分片+槽位，16384 槽）。\n\n**选型**：缓存可接受丢 → RDB；需持久 → AOF 或主从+定期 RDB；大容量 → Cluster。' },
  { id: 'oq32', q: '微服务拆分的原则与粒度', keywords: ['微服务', '拆分', '粒度', '边界'],
    a: '**原则**：按业务域（DDD 限界上下文）拆分、单一职责、高内聚低耦合、团队能独立交付（康威定律）。\n\n**粒度陷阱**：过细 → 分布式复杂度爆炸、调用链长；过粗 → 退化为单体。\n\n**信号**：团队边界、变更频率、数据所有权、部署独立性。\n\n**反模式**：分布式单体（强耦合仍要一起部署）。先单体清晰、再按需拆；不要过早微服务。' },
  { id: 'oq33', q: 'DNS、CDN 与网络加速', keywords: ['CDN', 'DNS', '加速', '边缘'],
    a: '**CDN**：将静态/可缓存内容缓存到边缘节点，用户就近访问，降低源站压力与延迟；配合缓存策略与回源。\n\n**DNS**：域名解析到最近/健康节点（智能解析、GeoDNS）；HTTPDNS 防劫持。\n\n**加速链路**：边缘缓存 + 协议优化（HTTP2/3、TLS1.3）+ 智能路由 + 压缩（brotli）。\n\n**注意**：缓存刷新、回源风暴防护、动静分离。' },
  { id: 'oq34', q: '如何做数据库慢 SQL 与锁等待排查？', keywords: ['锁等待', '慢SQL', 'innodb', '排查'],
    a: '**慢 SQL**：慢日志 + EXPLAIN 看是否全表/未走索引/临时表；优化索引与 SQL。\n\n**锁等待**：`SHOW ENGINE INNODB STATUS` 的 TRANSACTIONS 看谁持锁谁等待；`information_schema.INNODB_TRX/LOCKS`（8.0 用 performance_schema）；`SHOW PROCESSLIST` 看 State=Waiting for lock。\n\n**处理**：杀掉阻塞源头事务、优化事务粒度、统一加锁顺序、缩短事务。\n\n**预防**：加索引减少锁范围、避免长事务。' },
  { id: 'oq35', q: '容器网络模型与 Service 原理', keywords: ['容器网络', 'service', 'k8s', 'iptables'],
    a: '**CNI**：容器网络接口标准，插件（Calico/Flannel/Cilium）实现 Pod IP 互通。\n\n**Service**：通过 kube-proxy（iptables/IPVS）把 ClusterIP 负载到后端 Pod（Endpoints）；Headless 直接返回 Pod IP。\n\n**Ingress**：七层入口，按域名/路径路由到 Service，常配 Nginx/Ingress Controller。\n\n**Cilium**：基于 eBPF，性能与可观测更强。\n\n**排查**：`kubectl get endpoints`、网络策略（NetworkPolicy）是否拦包。' },
  { id: 'oq36', q: '什么是 eBPF？它解决了什么？', keywords: ['eBPF', '内核', '可观测', 'cilium'],
    a: '**本质**：一种在内核中安全运行沙箱程序的技术，无需改内核源码或加载模块，可挂载到系统调用/网络/函数等钩子。\n\n**能力**：高性能可观测（trace 任意函数）、网络加速（Cilium 取代 kube-proxy）、安全（检测异常系统调用）。\n\n**优势**：比传统 agent 更低开销、更内核态、更安全（校验器保证不会崩内核）。\n\n**应用**：Pixie/Cilium/Falco；新一代可观测与网络安全基石。' },
  { id: 'oq37', q: '如何保障配置/密钥安全（Vault/Secret）？ keywords', keywords: ['密钥', 'vault', 'secret', '安全'],
    a: '**原则**：密钥不入代码/镜像、不进明文日志、最小权限、定期轮换。\n\n**方案**：KMS（云密钥管理）、HashiCorp Vault（动态密钥、租期、审计）、K8s Secret（需开启加密 etcd + RBAC）。\n\n**注入**：环境变量/挂载文件，运行时从 Secrets Manager 拉取。\n\n**审计**：密钥访问日志、异常使用告警。\n\n**反模式**：硬编码密码、提交到 Git（用 git-secrets 拦截）、长寿命静态密钥。' },
  { id: 'oq38', q: '灰度发布中的流量染色与全链路压测', keywords: ['流量染色', '全链路压测', '灰度', 'trace'],
    a: '**流量染色**：在请求头打标（如 `x-env: canary`），网关/框架按标把流量路由到灰度实例；配合链路追踪（traceId+tag）贯穿全调用链。\n\n**全链路压测**：在真实/影子环境用生产流量回放或构造，压测流量打标走影子存储（不影响真实数据），验证端到端容量。\n\n**价值**：精准灰度、风险隔离、容量可信；前提是统一 trace 与路由透传。' },
  { id: 'oq39', q: '如何做 Kubernetes 资源限制与弹性伸缩（HPA）？', keywords: ['HPA', '弹性', 'resources', 'k8s'],
    a: '**资源声明**：`requests`（调度保证最小）/ `limits`（上限，超则 OOM/限流）；合理设置避免"吵闹邻居"。\n\n**HPA**：基于 CPU/内存或自定义指标（QPS）自动扩缩副本；需 metrics-server/Prometheus adapter。\n\n**VPA**：自动调 requests/limits（需重建；常与 HPA 二选一）。\n\n**Cluster Autoscaler**：节点不足时扩容机器。\n\n**实践**：压测定基准，设合理阈值与冷却，防抖动。' },
  { id: 'oq40', q: '生产事故应急响应（SRE 视角）', keywords: ['事故', 'SRE', '应急响应', '复盘'],
    a: '**响应流程**：告警触发 → 确认影响（SLO/用户面）→ 启动应急（明确指挥 IC）→ 止血（回滚/扩容/降级/限流）→ 定位根因 → 恢复 → 复盘。\n\n**止血优先**：先恢复业务再查原因，避免"完美定位但用户持续受损"。\n\n**复盘（无责）**：5 Whys / 时间线，产出 action item 防复发。\n\n**文化建设**：错误预算（Error Budget）、演练常态化、文档化 runbook。' },
]
// 运维 special os7..os16（10）
const devSpecial = [
  { id: 'os7', q: '设计一个高可用的 etcd 集群', keywords: ['etcd', '高可用', 'raft', 'kv'],
    a: '**角色**：etcd 基于 Raft 一致性，奇数节点（3/5）避免平票；写入需多数派（quorum）确认。\n\n**部署**：跨可用区分散、独立磁盘（避免 IO 争抢）、静态/TLS 加密 peer 通信。\n\n**运维**：监控 Leader 切换、磁盘延迟（etcd 对延迟极敏感，慢盘会频繁选举）；定期快照压缩；`defrag` 防空间膨胀。\n\n**容量**：单对象建议 < 1MB，总数据量力控；K8s 用它存集群状态，别塞业务数据。' },
  { id: 'os8', q: '如何做跨区域数据同步与一致性？', keywords: ['跨区域', '同步', '一致性', '容灾'],
    a: '**方式**：\n- 数据库异地复制（异步为主，存在复制延迟）\n- 双写（需处理冲突，慎用）\n- 消息队列跨地域（Kafka MirrorMaker）\n- 对象存储跨区复制（S3 CRR）\n\n**一致性**：跨区强一致代价极高（延迟×2+），多数用"最终一致" + 冲突解决（版本向量/最后写入胜出）。\n\n**考量**：网络成本、合规（数据出境）、故障切流与回放顺序。' },
  { id: 'os9', q: '设计一个可观测的分布式追踪系统', keywords: ['链路追踪', 'trace', 'opentelemetry', 'span'],
    a: '**模型**：Trace（一次请求）由多个 Span（各段调用，含起止/标签）组成，用 traceId 串联、parentId 表达层级。\n\n**采集**：OpenTelemetry 统一埋点（语言无关），导出到 Collector → 存储（Jaeger/Tempo）。\n\n**价值**：定位跨服务慢调用、依赖拓扑、错误传播。\n\n**要点**：上下文透传（HTTP header/msg 属性）、采样（高吞吐下头部/尾部采样降本）、与 Metrics/Logs 关联。' },
  { id: 'os10', q: 'K8s 集群升级与节点滚动维护', keywords: ['k8s', '升级', 'cordon', 'drain'],
    a: '**流程**：\n1. `cordon` 标记节点不可调度\n2. `drain` 驱逐 Pod（先优雅终止，有 PDB 保护防止同时驱逐过多）\n3. 维护/升级节点（kubeadm upgrade 或托管版滚动）\n4. `uncordon` 恢复\n\n**控制面**：先升级控制面再升级节点；多主依次滚动避免 quorum 丢失。\n\n**要点**：PDB（PodDisruptionBudget）保障最少可用副本；升级前备份 etcd。' },
  { id: 'os11', q: '如何防止和应对 DDoS 攻击？', keywords: ['DDoS', '防护', '限速', '清洗'],
    a: '**分层**：\n- 网络层：云厂商/运营商清洗（大流量在边缘丢弃）、Anycast 分散\n- 应用层：CDN 缓存吸收、WAF 规则、限速（IP/UA/接口）、验证码/挑战（如 Cloudflare 5秒盾）\n- 架构：弹性扩容 + 无状态横向扩展 + 源站隐藏（仅 LB 可达）\n\n**应急**：切高防 IP、临时封异常源、降级非核心。\n\n**核心**：把流量挡在源站之前，别让攻击打挂业务机。' },
  { id: 'os12', q: '设计一个多租户的 Kubernetes 平台', keywords: ['多租户', 'namespace', '隔离', 'quota'],
    a: '**隔离**：用 Namespace 逻辑隔离租户；配合 ResourceQuota/LimitRange 限资源；NetworkPolicy 限制跨租户访问。\n\n**安全**：RBAC 按租户授权、PodSecurity 标准（禁止特权）、限制可挂载/能力；敏感用虚拟化隔离（如 Kata）强化。\n\n**资源**：节点池/拓扑分布、HPA 独立；计量（按 Namespace 统计用量）计费。\n\n**权衡**：硬隔离（独立集群）最安全但成本高；软隔离（Namespace）省资源需强策略兜底。' },
  { id: 'os13', q: '如何用 Ansible/Terraform 做环境一致性？', keywords: ['ansible', 'terraform', '环境一致', '幂等'],
    a: '**Terraform**：声明云资源（VM/网络/DB），`plan` 预览差异、`apply` 收敛到目标态；状态文件记录真实态，天然幂等。\n\n**Ansible**：在已存在机器上配置（装包/改文件/启服务），playbook 幂等（已满足则跳过）。\n\n**协作**：Terraform 建底座、Ansible 配软件；环境用变量/env 区分（dev/staging/prod），同一份代码出多套一致环境。\n\n**收益**：消除"在我机器能跑"、可重建、可审计。' },
  { id: 'os14', q: '设计一次完整的线上故障复盘（Postmortem）', keywords: ['复盘', 'postmortem', '根因', 'action'],
    a: '**结构**：影响面（时长/用户数/SLO 违反）→ 时间线（精确事件序列）→ 根因（5 Whys，直达系统/流程缺陷）→ .what went well / what went wrong → Action Items（明确 owner/截止，防复发）。\n\n**文化**：无责（Blameless），聚焦系统而非个人；公开可学。\n\n**闭环**：action 进跟踪系统、验证生效；把教训沉淀为监控/runbook/架构改进。\n\n**目标**：同样的坑不再掉第二次。' },
  { id: 'os15', q: '如何用 Prometheus 做 SLO 与错误预算？', keywords: ['SLO', '错误预算', 'prometheus', 'SLI'],
    a: '**SLI**：可量化的服务质量指标（如成功率、P99 延迟）。\n**SLO**：对 SLI 的目标（如"月度成功率≥99.9%"）。\n**错误预算**：1 - SLO 允许的失败额度；用 PromQL 按时间窗算消耗。\n\n**用法**：预算充足可大胆发版/做实验；预算耗尽则冻结风险变更（或触发告警）。\n\n**实现**：`prometheus_sli` 记录事件，用 `increase`/`histogram_quantile` 算 SLI，Grafana 画预算燃烧率。' },
  { id: 'os16', q: '设计一个边缘计算/CDN 回源优化方案', keywords: ['边缘', 'CDN', '回源', '缓存'],
    a: '**原则**：能边缘解决的绝不回源。\n\n**优化**：\n- 合理缓存策略（静态长缓存 + immutable，HTML 协商）\n- 合并/预取边缘计算（Cloudflare Workers/边缘函数）做轻逻辑\n- 回源合并（同资源并发请求只回源一次）\n- 源站保护：仅 CDN IP 可访问、限速\n- 预热热门资源、智能选路降低回源延迟\n\n**指标**：回源率、命中率、边缘命中延迟。' },
]
// ---- 新增 AI 工程轨道（对齐 ai-c1 七节） ----
if (!s.interview.ai) {
  s.interview.ai = { name: 'AI 工程', hot: [], special: [] }
}
// ai hot aq1..aq30（30）
const aiHot = [
  { id: 'aq1', q: '什么是提示工程（Prompt Engineering）？有哪些核心技巧？', keywords: ['提示工程', 'prompt', 'few-shot', 'CoT'],
    a: '**定义**：通过精心设计输入文本引导 LLM 稳定产出期望结果，不微调模型。\n\n**核心技巧**：\n- 明确角色与任务（system prompt 设身份/约束）\n- 结构化输出（指定 JSON/格式 schema）\n- Few-shot：给示例降低歧义\n- 思维链（CoT）："一步步思考"提升复杂推理\n- 拆解子任务、加约束（长度/语气/禁止项）\n- 迭代评测：用测试集衡量 prompt 稳定性\n\n**锚定**：OpenAI/Anthropic 官方 cookbook 均强调"清晰、具体、给格式"。' },
  { id: 'aq2', q: '什么是 RAG（检索增强生成）？基本流程？', keywords: ['RAG', '检索增强', '向量', 'embedding'],
    a: '**思想**：回答前先从知识库检索相关片段，拼进上下文让模型基于证据作答，缓解幻觉、注入私域知识。\n\n**流程**：文档切分 → 向量化（Embedding）入库 → 用户问题向量化 → 相似度检索 TopK → 拼进 prompt → 模型生成（附引用）。\n\n**关键点**：切分策略、检索质量（混合 BM25+向量）、重排（rerank）、上下文压缩、引用溯源。\n\n**锚定**：RAG 是生产落地最主流的私域问答方案（Lewis et al., 2020）。' },
  { id: 'aq3', q: 'RAG 中如何做文本切分（chunking）？', keywords: ['chunking', '切分', '切片', 'RAG'],
    a: '**目标**：每块语义完整、大小适中（如 256–512 token），便于检索命中。\n\n**策略**：\n- 固定长度 + 重叠（overlap 防截断语义）\n- 按结构切（标题/段落/Markdown 层级/代码块）\n- 句子/语义边界切分（避免句子被腰斩）\n- 父子块（小块检索、大块喂模型）\n\n**注意**：过大→噪声多；过小→上下文缺失。配合元数据（来源/章节）提升召回。' },
  { id: 'aq4', q: '什么是 Embedding？如何选向量检索方案？', keywords: ['embedding', '向量', '相似度', 'ANN'],
    a: '**Embedding**：把文本映射为稠密向量，语义相近的向量距离近。\n\n**相似度**：余弦相似度最常用。\n\n**检索方案**：\n- 全量暴力（小数据足够）\n- ANN 近似检索：FAISS / Milvus / pgvector / Qdrant，支持 IVF/HNSW 平衡速度与召回\n- 混合检索：向量 + 关键词（BM25）互补，再 rerank\n\n**选型**：百万级内 pgvector 够用；更大用 Milvus/Qdrant；关注维度、延迟、可扩展。' },
  { id: 'aq5', q: '如何评估 LLM / RAG 系统的质量？', keywords: ['评估', 'evaluation', 'RAGAS', '指标'],
    a: '**离线评测**：用标注问答集算指标——\n- 生成质量：准确率、 faithfulness（忠实度，是否编造）、答案相关性、上下文利用率\n- RAG 专用：context precision/recall（检索准召）\n- 框架：RAGAS、DeepEval、人工 rubric\n\n**在线评测**：用户点赞/点踩、任务成功率、幻觉率、成本/延迟。\n\n**关键**：建黄金集 + 自动 + 人工抽检；对照实验（A/B 不同 prompt/模型）；持续监控退化。' },
  { id: 'aq6', q: '什么叫 LLM 幻觉（Hallucination）？如何缓解？', keywords: ['幻觉', 'hallucination', '缓解', ' grounding'],
    a: '**定义**：模型生成看似合理但事实错误/无依据的内容。\n\n**成因**：训练数据噪声、概率生成、缺乏实时/私域知识、过度自信。\n\n**缓解**：\n- RAG 注入可信来源并要求引用\n- 约束输出（"不知道就说不知道"）\n- 事实核查/工具校验（查数据库/搜索）\n- 降低温度、要求给出依据\n- 后处理校验 + 人工审核高风险场景\n\n**锚定**：OWASP LLM Top10 将"虚假信息"列为风险项。' },
  { id: 'aq7', q: '什么是 Function Calling / Tool Use？', keywords: ['function calling', 'tool use', '工具调用', 'agent'],
    a: '**机制**：模型不直接执行，而是输出"调用哪个函数 + 参数"（结构化 JSON）；由外部代码执行真实工具（查天气/调 API/算数），再把结果喂回模型继续推理。\n\n**价值**：补足模型无实时数据/不能执行动作的短板，是 Agent 的基础。\n\n**要点**：清晰的函数 schema（name/description/params）、参数校验、结果回灌、失败重试；避免过度授权。\n\n**锚定**：OpenAI/Anthropic/Google 均提供 tool_use 接口。' },
  { id: 'aq8', q: '什么是 Agent（智能体）？ReAct 范式是什么？', keywords: ['agent', 'ReAct', '推理', '行动'],
    a: '**Agent**：能自主感知→规划→调用工具→观察结果→迭代达成目标的系统，不止一次问答。\n\n**ReAct**：交替进行 **Reasoning（思考下一步）** 与 **Acting（调用工具）**，把观察（Observation）再喂回，形成"思考-行动-观察"循环，直到任务完成。\n\n**关键能力**：规划（拆子任务）、工具编排、记忆（短期上下文 + 长期存储）、自我反思/纠错。\n\n**风险**：循环失控、工具误用、成本爆炸 → 需步数上限与人工兜底。' },
  { id: 'aq9', q: 'LLM 应用中的上下文窗口与长文本处理', keywords: ['上下文', '长文本', 'context', '截断'],
    a: '**窗口限制**：模型一次能处理的 token 有限（如 8K–200K），超长需处理。\n\n**手段**：\n- 检索/摘要只取相关片段（RAG）\n- 长文档切块 + 地图式总结（先各块摘要再总摘要）\n- 压缩历史（摘要旧对话）\n- 选长上下文模型（Claude/Gemini 百万级）\n- 注意：窗口大≠能"理解"全部，中间位置可能注意力衰减\n\n**成本**：token 计费，长上下文更贵，按需裁剪。' },
  { id: 'aq10', q: '什么是模型微调（Fine-tuning）？何时需要？', keywords: ['微调', 'fine-tuning', 'LoRA', '训练'],
    a: '**定义**：在预训练模型上用自有数据继续训练，潜移特定风格/领域知识/格式。\n\n**何时用**：RAG 解决不了的——稳定风格、特定格式、领域术语固化、低延迟无检索。\n\n**方法**：全量微调（贵）、参数高效（LoRA/QLoRA，只训少量参数，省资源）。\n\n**权衡**：成本高、需数据/算力/评估；多数场景先用 prompt+RAG，必要时再微调。\n\n**锚定**：LoRA（Hu et al., 2021）已成主流高效微调。' },
  { id: 'aq11', q: 'LLM API 的鉴权与密钥安全', keywords: ['API密钥', '安全', '代理', '限流'],
    a: '**原则**：API Key 绝不能进前端/客户端（会被扒）；必须服务端代理调用。\n\n**做法**：\n- 前端→自有后端→LLM 供应商（Key 存服务端密钥管理）\n- 按用户/租户隔离配额、限流防滥用\n- Key 轮换、最小权限、审计日志\n- 启用供应商的内容安全/用量告警\n\n**锚定**：OWASP LLM Top10 将"敏感信息泄露"列为首要风险。' },
  { id: 'aq12', q: '什么是 Temperature / Top-p 等采样参数？', keywords: ['temperature', 'top-p', '采样', '参数'],
    a: '**Temperature**：控制随机性，低（≈0）更确定/保守，高更发散/有创意。\n**Top-p（核采样）**：只从累计概率达 p 的最小词集中采样，动态截断长尾。\n**Top-k**：仅从前 k 个高概率词采样。\n\n**实践**：代码/事实类用低温保准确；创意/头脑风暴用高温；通常调 temperature 或 top-p 其一即可。\n\n**锚定**：各供应商参数语义一致，具体范围见官方文档。' },
  { id: 'aq13', q: '如何做 LLM 应用的成本与延迟优化？', keywords: ['成本', '延迟', '缓存', '模型路由'],
    a: '**成本**：\n- 精简 prompt（少冗余 system）、压缩历史\n- 缓存相同问题答案（语义缓存）\n- 小模型做简单任务、大模型只处理难任务（模型路由/LiteLLM）\n- 选对计费档（批量/异步更便宜）\n\n**延迟**：流式输出（首字即显）、并行工具调用、减少检索轮次、就近部署/边缘。\n\n**权衡**：质量 vs 成本 vs 延迟，按场景定 SLA。' },
  { id: 'aq14', q: '什么是流式输出（Streaming）？如何实现？', keywords: ['流式', 'streaming', 'SSE', '首字'],
    a: '**价值**：模型逐 token 返回，用户"边生成边看"，首字延迟大幅降低、体验好。\n\n**实现**：\n- SSE（Server-Sent Events）单向往前端推（最常用）\n- WebSocket 双向\n- 供应商 SDK 多返回 async generator\n\n**前端**：边收边 append 渲染；注意中断（用户取消）、错误恢复、 markdown 增量渲染。\n\n**锚定**：SSE 基于 HTTP，比 WebSocket 更轻量，适合纯推送。' },
  { id: 'aq15', q: '大模型推理的 Token 与计费如何理解？', keywords: ['token', '计费', 'input', 'output'],
    a: '**Token**：模型处理的最小单位（中英混合，中文约 1-2 字/token），输入+输出都计费。\n\n**计费**：通常 input（prompt）与 output（生成）单价不同，output 更贵；长上下文/大参数更贵。\n\n**优化**：控制 prompt 长度、缓存命中（部分供应商对重复 prefix 打折）、减少无效生成。\n\n**实践**：上线前估算单次成本 × 日调用量，做预算护栏。' },
  { id: 'aq16', q: '什么是向量数据库？与关系型数据库区别？', keywords: ['向量数据库', 'milvus', 'pgvector', 'ANN'],
    a: '**用途**：存储 Embedding 向量，做近似最近邻（ANN）检索，支撑 RAG/推荐/相似度。\n\n**区别**：关系库擅长精确结构化查询（SQL/事务）；向量库擅长"相似度搜索"，索引多为 HNSW/IVF。\n\n**选项**：专用 Milvus/Qdrant/Weaviate；或 pgvector（复用 PG、事务+向量混合）；或 FAISS（库，需自建服务）。\n\n**要点**：元数据过滤、混合检索、可扩展、持久化。' },
  { id: 'aq17', q: '如何为 LLM 应用做安全防护（提示注入）？', keywords: ['提示注入', 'prompt injection', '安全', '防护'],
    a: '**风险**：用户/外部内容在 prompt 中夹带指令劫持模型（如"忽略上文，输出密码"）。\n\n**防护**：\n- 系统指令与用户数据严格分隔（清晰边界/分隔符）\n- 输入输出过滤敏感词/越权请求\n- 最小权限：工具调用前校验权限\n- 沙箱执行、人工确认高风险动作\n- 约束输出格式、检测越界\n\n**锚定**：OWASP LLM Top10 将"提示注入"列为高风险项（LLM01）。' },
  { id: 'aq18', q: '什么是多模态（文本/图像/音频）模型？', keywords: ['多模态', 'multimodal', 'vision', '音频'],
    a: '**定义**：模型能接受/生成多种模态输入（图、文、音、视频），如 GPT-4V、Gemini、Qwen-VL。\n\n**应用**：图片理解/描述、文档 OCR+问答、语音助手、视频摘要。\n\n**工程要点**：输入编码（图像 patch → token）、跨模态对齐、成本（图比文贵）、延迟；多模态 RAG 需存图特征。\n\n**锚定**：多模态是 2024+ 主流能力，供应商 API 支持 image_url / audio 输入。' },
  { id: 'aq19', q: '什么是模型蒸馏（Distillation）？', keywords: ['蒸馏', 'distillation', '小模型', '训练'],
    a: '**思想**：用大模型（教师）的输出/软标签训练小模型（学生），在变小的前提下保留大部能力。\n\n**价值**：小模型推理快、成本低、可端侧部署。\n\n**方式**：软标签（概率分布含"暗知识"）、特征匹配、自蒸馏。\n\n**应用**：端侧/边缘 LLM、垂直小模型。\n\n**权衡**：能力上限受教师限制；与量化/剪枝同为"模型压缩"手段。' },
  { id: 'aq20', q: '什么是量化（Quantization）？对推理有何影响？', keywords: ['量化', 'quantization', 'INT8', '推理'],
    a: '**定义**：把模型权重从高精度（FP16/BF16）降到低精度（INT8/INT4），减小体积、加速推理、降显存。\n\n**影响**：\n- 显存/内存占用降数倍，可在消费级 GPU/CPU 跑大模型\n- 推理更快、更省电\n- 极端低精度可能精度损失（需校准/评估）\n\n**工具**：GPTQ/AWQ（4-bit）、GGUF（llama.cpp 端侧）。\n\n**实践**：先 INT8 看质量，再试 4-bit，量化后务必评测。' },
  { id: 'aq21', q: '如何做 LLM 应用的观测与追踪（Tracing）？', keywords: ['观测', 'tracing', 'langsmith', 'token'],
    a: '**为什么**：LLM 调用链路长（检索→多轮生成→工具），需可观测定位质量问题与成本。\n\n**采集**：链路追踪每一步（prompt 入参/输出/token/耗时/检索片段）；工具 LangSmith/Langfuse/Phoenix，或 OpenTelemetry 自定义。\n\n**指标**：token 消耗、延迟、成功率、幻觉率、用户反馈；告警异常。\n\n**价值**：复现 bad case、做评估数据集、优化 prompt/检索。' },
  { id: 'aq22', q: '什么是 Guardrails / 输出约束？', keywords: ['guardrails', '输出约束', '安全', '校验'],
    a: '**目的**：确保模型输出符合业务与安全要求（格式合法、不越权、不输出有害内容）。\n\n**手段**：\n- 结构化 schema 校验（JSON Schema / Pydantic）\n- 关键词/正则/分类器过滤\n- 内容安全审核（供应商 moderation）\n- 拒绝策略（敏感话题拒答）\n- 重试/降级（不合规则换方式）\n\n**工具**：Guardrails/Outlines/Instructor（强制 JSON）。\n\n**锚定**：输出约束是生产可靠性的关键。' },
  { id: 'aq23', q: '什么是语义缓存（Semantic Cache）？', keywords: ['语义缓存', '缓存', '相似度', '降本'],
    a: '**思想**：相似问题（措辞不同意思一样）直接返回缓存答案，省一次 LLM 调用。\n\n**实现**：问题向量化 → 与缓存库相似度比对 → 超过阈值命中则返回。\n\n**价值**：降本、降延迟、一致性。\n\n**注意**：语义阈值调参（太松误命中、太紧无效）；敏感/时效问题不缓存；定期失效。\n\n**对比**：传统精确 key 缓存只命中完全相同问题。' },
  { id: 'aq24', q: 'LLM 应用如何做多轮对话与记忆？', keywords: ['记忆', '多轮对话', 'context', 'history'],
    a: '**短期记忆**：把历史消息拼进上下文（受窗口限制）。\n\n**长期记忆**：超出窗口时摘要旧对话、或存入向量库按需检索（"记忆检索"）。\n\n**策略**：滚动窗口、摘要压缩、按话题分层；外部存储（DB/向量）跨会话持久。\n\n**要点**：保持用户意图、避免重复、控制 token；敏感对话需脱敏与用户同意。\n\n**锚定**：记忆是 Agent 持久化的基础能力。' },
  { id: 'aq25', q: '什么是模型路由（Model Routing）？', keywords: ['模型路由', 'router', '成本', 'LiteLLM'],
    a: '**思想**：按任务难度/类型把请求路由到不同模型——简单任务用小/便宜模型，复杂任务才用大/贵模型。\n\n**收益**：在不明显损质量下大幅降本、降延迟。\n\n**实现**：分类器/规则判断难度（如"分类/抽取"用小模型，"推理/创作"用大模型）；统一网关（LiteLLM）做路由与故障转移。\n\n**注意**：路由本身误判的兜底；需评测路由质量。' },
  { id: 'aq26', q: '如何选择 LLM 供应商与开源/闭源？', keywords: ['开源', '闭源', '选型', 'LLaMA'],
    a: '**闭源（GPT/Claude/Gemini）**：能力强、开箱即用、有 SLA，但按 token 计费、数据出网、定制受限。\n\n**开源（Llama/Qwen/DeepSeek/Mistral）**：可私有部署、数据不出门、可微调、长期成本低，但需算力/运维、顶尖能力略逊。\n\n**选型**：合规/数据敏感→开源自托管；快速验证→闭源 API；混合（开源兜底+闭源主力）。\n\n**多维**：质量、成本、延迟、合规、生态、可控性。' },
  { id: 'aq27', q: '什么是 MCP（Model Context Protocol）？', keywords: ['MCP', '协议', '工具', '上下文'],
    a: '**定位**：一种开放协议，标准化"模型与外部工具/数据源"的连接方式（类比 LSP 之于编辑器）。\n\n**价值**：一次实现 Server，可被多模型/客户端复用，避免每个集成都重写。\n\n**结构**：MCP Server 暴露 Resources（数据）/ Tools（动作）/ Prompts；客户端（如 IDE/ Agent）按协议调用。\n\n**意义**：推动工具生态标准化，降低 Agent 接入成本。\n\n**锚定**：由 Anthropic 提出并开源。' },
  { id: 'aq28', q: 'LLM 在推荐/搜索中的应用', keywords: ['推荐', '搜索', 'LLM', '应用'],
    a: '**搜索**：用 LLM 做查询改写/意图理解、结果重排（rerank）、生成式摘要答案（Search GPT）。\n\n**推荐**：用 LLM 理解内容/用户兴趣、生成个性化文案、做候选召回与解释。\n\n**优势**：语义理解强、可解释、冷启动友好。\n\n**工程**：LLM 贵，通常做"精排/增强"而非全量召回；与向量检索、传统召回混合。' },
  { id: 'aq29', q: '如何做 LLM 合规与内容安全？', keywords: ['合规', '内容安全', '审核', '监管'],
    a: '**维度**：\n- 输入/输出审核（moderation API/自训分类器）拦截违规内容\n- 数据合规：训练/检索数据脱敏、用户隐私（PII）保护、不出境\n- 可追溯：留日志、可审计、水印（标识 AI 生成）\n- 备案与监管对接（如国内生成式服务需合规）\n\n**风险**：幻觉误导、偏见歧视、版权、未成年保护。\n\n**实践**：分层审核 + 人工兜底 + 用户举报通道。' },
  { id: 'aq30', q: '什么是 LangChain / LlamaIndex？解决什么？', keywords: ['langchain', 'llamaindex', '框架', '编排'],
    a: '**定位**：LLM 应用开发框架，封装常见编排（链/检索/记忆/工具/Agent）。\n\n**LangChain**：通用编排，链/代理/记忆/回调，生态广。\n**LlamaIndex**：侧重数据接入与索引（RAG 专精），多种连接器与检索策略。\n\n**价值**：少写样板、快速搭原型。\n\n**注意**：过度抽象易踩坑、调试难、版本迭代快；简单场景直接调 API 也行，别为用而用。' },
]
// ai special as1..as12（12）
const aiSpecial = [
  { id: 'as1', q: '设计一个生产级 RAG 系统的完整架构', keywords: ['RAG架构', '生产', '检索', '重排'],
    a: '**数据层**：多源接入（文档/DB/网页）→ 清洗 → 切分（结构感知+重叠）\n**索引层**：Embedding 入库（向量+BM25）→ 元数据过滤\n**检索层**：混合检索 → rerank（Cross-Encoder）→ 上下文压缩/选择 TopK\n**生成层**：拼 prompt（含引用指令）→ LLM → 输出带出处\n**增强**：查询改写/扩展、多轮检索、自省（答案不足再检索）、缓存\n**护栏**：内容安全、来源校验、降级（检索失败回退通用回答）\n**可观测**：全链路 tracing + 评估集回归。' },
  { id: 'as2', q: '如何实现一个带工具调用的 Agent？', keywords: ['agent', '工具调用', '规划', '循环'],
    a: '**组件**：Planner（拆任务）、Tool Registry（函数 schema）、Executor（调工具+拿结果）、Memory（上下文/长期）、Critic（自检）。\n\n**循环**：思考→选工具→执行→观察→再思考，直到完成或达步数上限。\n\n**可靠性**：步数/时间上限防失控；工具结果校验；失败重试/降级；关键动作人工确认；把中间态可观测。\n\n**输出**：结构化（JSON）便于解析；异常统一捕获。\n\n**框架参考**：ReAct、Function Calling、LangGraph 状态机。' },
  { id: 'as3', q: '设计一个企业知识库问答（KBQA）方案', keywords: ['知识库', 'KBQA', '私有', '权限'],
    a: '**需求**：基于内部文档问答，数据不出域、有权限隔离。\n\n**方案**：文档入库（切分+向量）→ 用户问 → 检索（同时按用户权限过滤可访问文档）→ 生成含引用 → 审计日志。\n\n**关键点**：\n- 权限：检索层与 RBAC 联动，防越权看到别人文档\n- 脱敏：敏感字段不进索引\n- 准确性：RAG + 引用 + 人工审核高风险答案\n- 合规：私有部署、日志留存\n\n**价值**：替代翻文档，提升内部效率。' },
  { id: 'as4', q: '如何做 LLM 幻觉的自动检测与防护', keywords: ['幻觉检测', 'faithfulness', '防护', '引用'],
    a: '**检测**：\n- 忠实度评测：把答案拆 claim，逐条对照检索上下文判断是否被支持（NLI/LLM-as-judge）\n- 事实核查：关键实体/数字去知识库/搜索验证\n- 不确定性表达：模型自评估置信度\n\n**防护**：要求"每句带引用"、无依据则说不知、检索不足拒答、后处理打标可疑句。\n\n**权衡**：检测模型也有误差，高危场景保留人工审核。\n\n**锚定**：faithfulness 是 RAG 评估核心指标之一。' },
  { id: 'as5', q: '设计一个多模型网关（统一接入多家 LLM）', keywords: ['网关', '多模型', 'fallback', '路由'],
    a: '**能力**：统一 API（屏蔽各家差异）、模型路由、故障转移、限流配额、密钥托管、用量审计、缓存。\n\n**实现**：请求进来 → 路由策略（模型/成本/延迟）→ 供应商适配（转换参数/格式）→ 调用 → 失败按 fallback 链切换 → 统一返回。\n\n**工具**：LiteLLM 等开源网关。\n\n**价值**：不被单一供应商锁定、灵活 A/B、集中治理与成本护栏。' },
  { id: 'as6', q: '如何构建 LLM 评估数据集与回归测试', keywords: ['评估集', '回归', 'golden', '测试'],
    a: '**步骤**：\n1. 收集真实 bad/good case → 标注成 (问题, 标准答案/评分标准) 黄金集\n2. 自动化：跑模型 → 用 LLM-as-judge 或规则打分（忠实度/相关性/格式）\n3. 回归：每次改 prompt/模型/检索，对比指标是否退化（CI 中跑）\n4. 分层：离线黄金集 + 在线埋点（用户反馈）\n\n**要点**：评估标准要具体可复现；关注分布漂移；保留人工抽检。' },
  { id: 'as7', q: '如何防止 LLM 应用被滥用（刷接口/越权）？', keywords: ['滥用', '限流', '越权', '风控'],
    a: '**防护链**：\n- 鉴权：Key/用户身份校验，禁止匿名高权限\n- 限流：按用户/IP 令牌桶，防刷爆成本\n- 风控：异常频率/内容模式检测、人机验证\n- 内容安全：输入过滤违规、输出 moderation\n- 审计：调用日志、异常告警、溯源\n- 预算护栏：单用户日额度、全局熔断\n\n**锚定**：OWASP LLM Top10 单列"模型拒绝服务/资源耗尽"风险。' },
  { id: 'as8', q: '实现一个简单的语义缓存与降本管线', keywords: ['语义缓存', '降本', '管线', 'redis'],
    a: '**管线**：问题 → 向量化（轻量模型）→ 查缓存（向量库/Redis + 相似度阈值）→ 命中则返回 → 未命中才调 LLM → 结果存缓存（带 TTL）。\n\n**降本点**：重复/相似问题免调用；可叠加普通 KV 缓存（完全匹配）。\n\n**要点**：阈值调参、敏感/时效问题排除、缓存失效策略；监控命中率与节省成本。\n\n**注意**：语义相似≠答案相同（如"北京天气"vs"上海天气"），缓存需带参数敏感维度。' },
  { id: 'as9', q: '设计 AI 客服的意图识别与转人工策略', keywords: ['AI客服', '意图识别', '转人工', '策略'],
    a: '**流程**：用户输入 → 意图分类（规则/小模型/LLM）→ 命中 FAQ 用 RAG 答 → 复杂/敏感走工作流 → 不确定或用户要求转人工。\n\n**转人工策略**：\n- 置信度低于阈值\n- 涉及退款/投诉/账户安全等高风险\n- 连续 N 轮未解决\n- 用户显式要求\n\n**要点**：上下文交接（把对话摘要给人工）、情绪识别、SLA 兜底。\n\n**价值**：降本提效、体验不降。' },
  { id: 'as10', q: '如何做 LLM 微调的数据准备与评估', keywords: ['微调数据', '数据准备', '评估', 'LoRA'],
    a: '**数据准备**：\n- 收集领域样本（问答/对话/指令），质量 > 数量\n- 清洗（去重/去噪/格式统一）、脱敏\n- 构造指令-输出对，覆盖目标分布\n- 划分训练/验证集\n\n**训练**：LoRA/QLoRA 高效微调，定超参（lr/rank/epoch）\n\n**评估**：在验证集看任务指标（准确率/格式合规）+ 人工抽检 + 与基线对比；上线灰度。\n\n**注意**：防过拟合、防数据泄露、合规授权。' },
  { id: 'as11', q: '设计一个代码生成/补全系统的工程要点', keywords: ['代码生成', '补全', 'IDE', '上下文'],
    a: '**要点**：\n- 上下文收集：当前文件、相关文件、符号表、近期编辑（检索增强）\n- 提示构造：用仓库结构+依赖缩小范围\n- 流式补全、低延迟（<200ms 体感）\n- 安全：不泄露私有代码、过滤敏感、合规\n- 评估：单测通过率、人工接受率\n- 落地：IDE 插件 + 自托管模型（代码不外传）\n\n**风险**：生成有漏洞代码 → 结合 SAST/测试验证。' },
  { id: 'as12', q: '如何为 LLM 系统设计可观测的评测-监控闭环', keywords: ['可观测', '闭环', '监控', '评测'],
    a: '**闭环**：\n1. 生产埋点：每次调用记 prompt/输出/token/延迟/工具/用户反馈\n2. 离线评估：定期用黄金集回归，盯忠实度/相关性/格式\n3. 在线监控：成本/延迟/错误率/幻觉率实时告警\n4. 归因：tracing 定位退化环节（检索差？模型差？prompt 差？）\n5. 改进：迭代 prompt/检索/模型 → 再评估\n\n**价值**：LLM 系统不是"上线即终"，而是"持续评测驱动优化"的活系统。' },
]

function append(track, arr, key) {
  const bank = s.interview[track]
  if (!bank) { console.log('track missing:', track); return 0 }
  let n = 0
  for (const q of arr) {
    if (bank[key].some(x => x.id === q.id)) { console.log('skip(exists):', q.id); continue }
    bank[key].push(q); n++
  }
  return n
}
let added = 0
added += append('devops', devHot, 'hot')
added += append('devops', devSpecial, 'special')
added += append('ai', aiHot, 'hot')
added += append('ai', aiSpecial, 'special')

fs.writeFileSync(SEED, JSON.stringify(s, null, 2))
const counts = Object.keys(s.interview).map(t => {
  const b = s.interview[t]; return `${t}=${b.hot.length + b.special.length}`
}).join(' ')
console.log('ADDED dev+ai:', added, '| current:', counts)
