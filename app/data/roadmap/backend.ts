import { grp, COMMON, type Direction } from './types'

export const backend: Direction = {
  id: 'backend',
  name: '后端',
  color: '#14b8a6',
  subTracks: [
    {
      id: 'be-web',
      name: 'Web 后端工程师',
      icon: 'server',
      summary: '用 Java / Go / Python 等构建服务端接口与业务系统，后端岗位的主干路径。',
      levels: [
        grp('junior', [
          { name: '一门后端语言精通', desc: 'Java / Go / Python 之一：语法、集合、面向对象与并发基础。', must: true },
          { ...COMMON.algo, must: true },
          { name: '后端 Web 框架', desc: 'Spring Boot / Gin / FastAPI 的路由、分层与依赖注入。' },
          { name: 'RESTful 接口设计', desc: '资源建模、状态码语义、幂等性、版本与参数校验。' },
          { ...COMMON.sql },
          { ...COMMON.linux },
          { ...COMMON.net },
          { ...COMMON.git },
        ]),
        grp('mid', [
          { name: '数据库事务与索引优化', desc: '隔离级别、锁与死锁、慢 SQL 定位、联合索引与回表。', must: true },
          { name: 'Redis 缓存设计', desc: '数据结构选型、缓存一致性、穿透击穿雪崩与分布式锁。', must: true },
          { name: '消息队列与异步解耦', desc: 'Kafka / RabbitMQ 的投递语义、堆积处理与重复消费。' },
          { name: '并发编程与线程模型', desc: '线程池参数、锁与无锁结构、协程与异步编程模型。' },
          { name: '认证授权（JWT / OAuth2）', desc: 'Session 与 Token 方案、单点登录、权限模型设计。' },
          { ...COMMON.owasp },
          { name: '单元测试与集成测试', desc: 'Mock 与桩、测试数据构造、覆盖率与回归防护。' },
          { name: 'gRPC 与实时通信', desc: 'gRPC / GraphQL / WebSocket 的适用场景与协议取舍。' },
        ]),
        grp('senior', [
          { name: '高并发系统设计', desc: '读写分离、异步削峰、热点隔离、压测与容量评估。', must: true },
          { name: '服务稳定性保障', desc: '限流降级熔断、灰度回滚、故障预案与可观测建设。', must: true },
          { name: '领域驱动设计 DDD', desc: '限界上下文、聚合根、防腐层与业务建模落地。' },
          { name: '分布式事务与一致性', desc: 'CAP 取舍、TCC / Saga / 本地消息表、最终一致性。' },
          { name: '后端技术方案评审', desc: '方案权衡与文档、规范制定、Code Review 与带人。' },
        ]),
      ],
    },
    {
      id: 'be-micro',
      name: '微服务 / 架构师',
      icon: 'network',
      summary: '服务拆分、治理与平台化建设，让几十上百个服务稳定协同。',
      levels: [
        grp('junior', [
          { name: '服务化与 RPC 概念', desc: '进程间调用、序列化、超时重试与幂等的基本认知。', must: true },
          { ...COMMON.docker, must: true },
          { name: '接口契约与版本管理', desc: 'IDL 定义、向后兼容、契约测试与文档同步。' },
          { name: '配置与环境隔离', desc: '配置外置、多环境区分、敏感信息不入代码库。' },
        ]),
        grp('mid', [
          { name: '微服务框架实践', desc: 'Spring Cloud / Dubbo / go-micro 的服务通信与容错。', must: true },
          { name: '服务注册发现与配置中心', desc: 'Nacos / Consul / etcd，动态上下线与配置热更新。' },
          { name: 'API 网关与流量入口', desc: '路由转发、鉴权限流、灰度分流与协议转换。' },
          { name: '分布式链路追踪', desc: 'TraceId 透传、OpenTelemetry、日志与调用链关联。' },
          { name: 'gRPC 与 Protobuf', desc: 'IDL 定义、流式调用、性能特性与跨语言互通。' },
          { name: '设计模式与重构', desc: '工厂、策略、责任链等常用模式的适用场景，以及坏味道识别与安全重构手法。' },
        ]),
        grp('senior', [
          { name: '服务拆分与边界设计', desc: '单体演进策略、边界划分原则、数据归属与反模式规避。', must: true },
          { name: '中台与平台化能力复用', desc: '通用能力下沉、多租户隔离、SDK 与接入成本控制。' },
          { name: '服务容错与故障演练', desc: '故障注入、依赖降级验证、演练常态化与预案沉淀。' },
          { name: '微服务治理规范', desc: '接口规范、SLA 约定、依赖治理与架构评审机制。' },
        ]),
      ],
    },
    {
      id: 'be-data',
      name: '大数据工程师（数仓 / BI）',
      icon: 'database',
      summary: '面向业务分析的离线与实时数仓、指标体系与 BI 供数（区别于 AI 方向的训练数据）。',
      levels: [
        grp('junior', [
          { name: '数仓分层建模', desc: 'ODS / DWD / DWS / ADS 分层、维度建模与事实表设计。', must: true },
          { name: 'Hive 与 SQL 开发', desc: 'HiveSQL 语法、分区分桶、UDF 与常见性能陷阱。', must: true },
          { ...COMMON.shell },
          { name: '数据同步与采集工具', desc: 'DataX / Canal / Flume 的全量与增量同步方案。' },
        ]),
        grp('mid', [
          { name: 'Spark 离线计算', desc: 'RDD 与 DataFrame、shuffle 原理、常见调优参数。', must: true },
          { name: 'Flink 实时计算', desc: '流批一体、状态与 checkpoint、窗口与水位线。' },
          { name: 'Kafka 与数据总线', desc: '分区与消费组、顺序性、积压治理与端到端语义。' },
          { name: '任务调度平台', desc: 'Airflow / DolphinScheduler 的依赖编排、重跑与告警。' },
          { name: '数据质量校验', desc: '空值与主键校验、波动监控、数据对账与稽核。' },
        ]),
        grp('senior', [
          { name: '湖仓一体架构', desc: 'Iceberg / Hudi、批流统一、存储与计算分离设计。', must: true },
          { name: '指标体系与数据资产', desc: '口径统一、指标平台、维度一致性与自助分析。' },
          { name: '大数据性能与成本调优', desc: '数据倾斜、小文件治理、资源队列与账单优化。' },
          { name: '数据治理与血缘', desc: '元数据管理、血缘追踪、生命周期与权限管控。' },
        ]),
      ],
    },
    {
      id: 'be-db',
      name: '数据库 / 存储工程师',
      icon: 'database',
      summary: '关系型与 NoSQL 的运维、调优、高可用与容量规划。',
      levels: [
        grp('junior', [
          { name: '复杂 SQL 与窗口函数', desc: '多表关联、子查询、窗口函数与集合运算。', must: true },
          { name: '数据库备份与恢复', desc: '逻辑与物理备份、增量与 binlog、恢复演练。' },
          { name: '数据库权限与账号管理', desc: '最小权限、账号审计、敏感表访问控制。' },
          { ...COMMON.linux },
        ]),
        grp('mid', [
          { name: '执行计划与索引调优', desc: 'EXPLAIN 解读、索引选择性、覆盖索引与索引失效。', must: true },
          { name: '主从复制与高可用', desc: '复制原理与延迟、故障切换、MHA / Orchestrator。' },
          { name: 'NoSQL 选型与使用', desc: 'Redis / MongoDB / Elasticsearch 的场景边界与陷阱。' },
          { name: '数据库参数与配置调优', desc: '缓冲池、连接数、刷盘策略与硬件匹配。' },
          { name: '慢查询治理与监控', desc: '慢日志采集、TopSQL 分析、监控指标与告警。' },
        ]),
        grp('senior', [
          { name: '分库分表与多活架构', desc: '分片键设计、路由中间件、跨分片查询与全局 ID。', must: true },
          { name: '存储引擎原理', desc: 'InnoDB B+ 树与 MVCC、LSM Tree 的写放大与压缩。' },
          { name: '数据库容量规划', desc: '增长预测、冷热分离、归档与成本平衡。' },
          { name: '数据迁移与不停机变更', desc: 'Online DDL、双写与灰度切流、回滚方案。' },
        ]),
      ],
    },
    {
      id: 'be-game',
      name: '游戏服务端工程师',
      icon: 'activity',
      summary: '高并发长连接、实时同步与状态一致性，游戏与实时互动行业的核心岗位。',
      levels: [
        grp('junior', [
          { name: 'C++ 或 Go 服务端语法', desc: '内存与指针 / 协程与 channel、常用容器与工具链。', must: true },
          { name: '游戏网络通信', desc: 'TCP 与 UDP 取舍、长连接维持、心跳与断线重连。', must: true },
          { name: '同步模型概念', desc: '帧同步与状态同步的原理、适用品类与优缺点。' },
          { name: '游戏数据存储与缓存', desc: '玩家数据落库、缓存回写、存档一致性。' },
        ]),
        grp('mid', [
          { name: '高并发连接与网络模型', desc: 'epoll / IOCP、Reactor 模式、连接数与吞吐优化。', must: true },
          { name: '游戏逻辑架构', desc: '房间 / 场景 / 战斗服拆分、单线程逻辑与消息驱动。' },
          { name: '协议设计与序列化', desc: 'Protobuf / FlatBuffers、协议版本兼容与压缩。' },
          { name: '游戏防作弊与安全', desc: '服务端校验、加密与签名、异常行为检测。' },
          { name: '热更新与停服维护', desc: '配置热加载、脚本热更、平滑重启与数据迁移。' },
        ]),
        grp('senior', [
          { name: '分布式游戏服架构', desc: '网关与逻辑服分离、跨服通信、全局服务与一致性。', must: true },
          { name: '大世界与分区分线设计', desc: 'AOI 视野管理、动态负载与玩家迁移。' },
          { name: '服务端延迟与性能优化', desc: '帧耗时分析、GC 与内存池、网络抖动补偿。' },
        ]),
      ],
    },
    {
      id: 'be-search',
      name: '搜索 / 中间件工程师',
      icon: 'layers',
      summary: '检索系统与消息、缓存等基础中间件的深度使用、调优与自研。',
      levels: [
        grp('junior', [
          { name: '倒排索引原理', desc: '分词、词典与倒排表、TF-IDF 与打分基础。', must: true },
          { name: 'Elasticsearch 基础操作', desc: 'Mapping 设计、DSL 查询、聚合与分页。', must: true },
          { name: '分词与文本处理', desc: '中文分词器、同义词与停用词、拼音与纠错。' },
          { name: '中间件部署与运维基础', desc: '集群搭建、配置调整、日志与基础监控。' },
        ]),
        grp('mid', [
          { name: '检索相关性调优', desc: '打分函数、Boost 与 rescore、召回率与准确率权衡。', must: true },
          { name: 'ES 集群与分片设计', desc: '分片数与副本、冷热架构、写入与查询性能瓶颈。' },
          { name: '消息中间件原理', desc: 'Kafka / RocketMQ 的存储模型、副本机制与事务消息。' },
          { name: '缓存中间件原理', desc: 'Redis 持久化、集群与哨兵、大 key 与热点治理。' },
          { name: '向量检索与语义召回', desc: 'Embedding 索引、HNSW / IVF、与关键词的混合检索。' },
        ]),
        grp('senior', [
          { name: '搜索架构与召回排序体系', desc: '多路召回、粗排精排、实时索引与效果评估。', must: true },
          { name: '中间件自研与二次开发', desc: '插件扩展、源码定制、性能剖析与社区跟进。' },
          { name: '中间件稳定性与容量治理', desc: '容量模型、限流隔离、升级演练与故障预案。' },
        ]),
      ],
    },
    {
      id: 'be-test',
      name: '测试开发工程师（SDET）',
      icon: 'shield',
      summary: '用开发能力做质量保障：自动化框架、测试平台与线上质量度量（横跨前后端与运维）。',
      levels: [
        grp('junior', [
          { name: '测试用例设计方法', desc: '等价类、边界值、场景法与用例评审要点。', must: true },
          { name: '接口自动化测试', desc: 'Postman / pytest + requests、断言与数据驱动。', must: true },
          { name: 'Python 自动化脚本', desc: '用 Python 编写测试脚本、封装工具与构造测试数据。' },
          { name: '缺陷管理与回归流程', desc: '缺陷定级、复现记录、回归范围与发布准入。' },
        ]),
        grp('mid', [
          { name: 'UI 自动化框架', desc: 'Playwright / Selenium / Appium 的元素定位与稳定性治理。', must: true },
          { name: '性能压测与分析', desc: 'JMeter / k6 施压模型、指标解读与瓶颈定位。' },
          { name: '测试环境与数据治理', desc: '环境隔离、数据构造与清理、依赖服务 Mock。' },
          { name: '流水线中的测试门禁', desc: '自动化用例接入 CI、失败拦截与报告可视化。' },
          { name: '白盒测试与覆盖率', desc: '单元测试补齐、覆盖率统计与增量覆盖门槛。' },
        ]),
        grp('senior', [
          { name: '质量保障体系建设', desc: '质量左移、分层测试策略、度量指标与改进闭环。', must: true },
          { name: '测试平台与工具自研', desc: '用例管理、任务调度、报告与效能工具建设。' },
          { name: '精准测试与线上质量', desc: '代码变更影响分析、线上巡检与故障预警。' },
        ]),
      ],
    },
  ],
}
