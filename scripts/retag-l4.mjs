#!/usr/bin/env node
// L4「tech」标签定向重打标（词表扩展后的精准修复）
//
// 与 scripts/taxonomy-reclassify.mjs 的区别：
//   - 后者是 ai/be-data/op-sec 的全量重打（规则已调优，勿重复跑以免回归）；
//   - 本脚本是**定向**修复：只处理显式声明的 (赛道 × 原标签) 桶，零回归风险。
//
// 分类器：打分制（统计命中的独立正则数，取最高分；同分按候选声明顺序），
//         比「首匹配即返回」更能正确处理「对比 A 与 B」这类同时命中多个候选的题。
// 判定只用题干：答案文本覆盖面广，纳入会引入大量误判（历史教训）。
//
// 用法：
//   node scripts/retag-l4.mjs             # dry-run：变更前后分布 + 抽样明细
//   node scripts/retag-l4.mjs --samples N # dry-run 抽样条数（默认 12）
//   node scripts/retag-l4.mjs --apply     # 写库（自动备份 + 事务）

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'

const ROOT = process.cwd()
const DB_PATH = path.join(ROOT, 'data/devmentor.db')
const APPLY = process.argv.includes('--apply')
const SAMPLES = Number(process.argv[process.argv.indexOf('--samples') + 1]) || 12

function loadTs (rel, expr) {
  const code = `import('./${rel}').then(m => console.log(JSON.stringify(${expr})))`
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '-e', code], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  })
  return JSON.parse(out.trim().split('\n').pop())
}
const VOCAB = loadTs('app/data/techVocabulary.ts', 'm.TECH_VOCABULARY')
const termOf = (module, name) => VOCAB.find(v => v.module === module && v.name === name)

// ============================ 修复范围 ============================
// 每项：{ track, module, from: 需重打的原标签, cands: 候选(按同分优先级), default: 零分兜底 }
const SCOPES = [
  // ---------- A9：赛道本体标签缺失导致的错标 ----------
  {
    track: 'fe-app', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'Flutter', kw: [/Flutter/i, /Dart|\bWidget\b/, /go_router|ShellRoute|Navigator [12]\.0|BottomNavigationBar/, /Riverpod|Provider|ChangeNotifier|ValueNotifier/, /InheritedWidget/, /setState|StatefulWidget|StatelessWidget/, /BuildContext/, /\bbuild\(\)/] },
      // 注意：不要收录「桥接 / Bridge」——Flutter 与 RN 架构对比题会同时命中，
      // 导致 Flutter 题被判成 RN（xq-xp-c1f-s1-1 的教训）。
      { tech: 'React Native', kw: [/React Native|\bRN\b/, /原生模块|NativeModules/, /Metro|Hermes/, /FlatList/, /CodePush/] }
    ]
  },
  {
    track: 'fe-native', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'iOS', kw: [/\biOS\b/, /Swift|SwiftUI|UIKit/, /AppDelegate|SceneDelegate|UIScene/, /NavigationStack|NavigationView/, /Objective-?C/, /UIViewController|ViewController/, /@State|@Binding|@ObservedObject|@EnvironmentObject/] },
      { tech: 'Android', kw: [/Android/, /Activity|Fragment/, /Kotlin/, /Jetpack|Compose/, /Intent/, /RecyclerView|ViewModel/] }
    ]
  },
  {
    track: 'fe-desktop', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'Electron', kw: [/Electron/i, /主进程|渲染进程/, /BrowserWindow/, /ipcMain|ipcRenderer|contextBridge|preload/, /shell\.open|dialog\.show/, /asar/] },
      { tech: 'Tauri', kw: [/Tauri/i, /\bRust\b/] }
    ]
  },
  {
    track: 'fe-uniapp', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'uni-app', kw: [/uni-?app/i, /uni\./, /onLoad|onReady|onShow/, /createSelectorQuery/] }
    ]
  },
  {
    track: 'fe-viz', module: 'frontend', from: ['Vue'], default: '综合应用',
    cands: [
      { tech: 'ECharts', kw: [/ECharts/i, /echarts-?for/] },
      { tech: 'React', kw: [/React/] }
    ]
  },
  {
    track: 'be-search', module: 'backend', from: ['MySQL'], default: '综合应用',
    cands: [
      { tech: 'Elasticsearch', kw: [/Elasticsearch|ElasticSearch/i, /\bES\b/, /Lucene/, /倒排索引|分词器|Mapping|ik_/] }
    ]
  },

  // ---------- A4：单一标签过度集中，需要细分 ----------
  {
    track: 'fe-viz', module: 'frontend', from: ['JavaScript'], default: 'JavaScript',
    cands: [
      { tech: 'ECharts', kw: [/ECharts/i, /setOption|\boption\s*[=.]|series\b/, /tooltip|legend/, /dataset|visualMap|dataZoom/, /图表实例|图表组件/] },
      { tech: 'D3', kw: [/\bD3\b|D3\.js/i, /\bd3\./, /力导向|force(Layout)?/, /比例尺|scaleLinear/, /selection\.data|enter\(\)|exit\(\)/] },
      { tech: 'WebGL', kw: [/WebGL/i, /Three\.?js/i, /GLSL|着色器|shader/i, /顶点着色|片元/, /纹理|texture/i, /点云|pointcloud/i] },
      { tech: 'Canvas', kw: [/Canvas/i, /\bSVG\b/, /getContext|2D 上下文/, /离屏|OffscreenCanvas/] },
      { tech: '可视化基础', kw: [/坐标系|笛卡尔|极坐标/, /投影/, /视觉编码/, /色阶|配色|调色/, /缩放|平移|brush/, /\bgeo\b|地图/] },
      { tech: '性能优化', kw: [/性能|卡顿|帧率|\bFPS\b/, /大数据量|万级|十万级|百万级/, /内存(占用|泄漏)/, /重绘|回流|repaint|reflow/, /增量渲染|虚拟滚动|降级渲染/] }
    ]
  },
  {
    track: 'be-db', module: 'backend', from: ['MySQL'], default: '数据库原理',
    // 权重说明：题面显式点名 MySQL 视为强信号（权重 2）。
    // 否则「MySQL 为什么用 B+ 树」这类"借 MySQL 讲通用原理"的题会被判成数据库原理，
    // 与「MySQL 慢查询排查」这类判成 MySQL 的结果自相矛盾。
    cands: [
      { tech: 'MySQL', kw: [[/MySQL/i, 2], /InnoDB|MyISAM/i, /binlog/i, /redo ?log|undo ?log/i, /聚簇索引|回表|覆盖索引|最左前缀/, /GTID|半同步|\bMGR\b/, /Buffer Pool|change buffer|doublewrite/i, /自适应哈希/] },
      { tech: 'PostgreSQL', kw: [[/PostgreSQL|Postgres/i, 2], /\bPG\b/, /\bpg_/] },
      { tech: 'Redis', kw: [[/Redis/i, 2]] },
      { tech: 'NoSQL', kw: [[/MongoDB|Mongo/i, 2], [/NoSQL/i, 2], [/Cassandra|HBase/i, 2], /文档数据库|键值数据库|列族|图数据库/] },
      { tech: 'Elasticsearch', min: 2, kw: [[/Elasticsearch|ElasticSearch/i, 2], /Lucene|倒排索引|bool 查询|分词器/] },
      { tech: '数据库原理', kw: [/索引/, /B\+ ?树|\bB ?树\b|BTree/i, /事务|\bACID\b/, /隔离级别|\bMVCC\b/, /死锁|行锁|表锁|间隙锁|next-key/i, /执行计划|\bExplain\b/i, /范式|ER ?图|ER 模型/, /查询优化|慢查询/, /一致性|\bCAP\b|\bBASE\b/, /连接池/, /备份|恢复|容灾/, /数据类型|字段类型|字符集|排序规则/] }
    ]
  },
  {
    track: 'ai-algo', module: 'ai', from: ['模型与训练'], default: '模型与训练',
    // 「模型与训练」必须作为显式候选参与打分，而不是只当兜底：
    // 否则「CNN/RNN/Transformer 结构对比」「梯度下降」这类通用训练理论题，
    // 会因题干顺带出现「图像」一词（权重 1 > 兜底 0）被误判为 CV。
    // 注意顺序：模型与训练放首位。领域标签只有**明确压过**通用训练理论时才生效，
    // 避免「CNN/RNN/Transformer 结构对比」这类通用题因平局被判成 CV。
    cands: [
      { tech: '模型与训练', kw: [/梯度|反向传播|优化器|学习率/, /损失函数|交叉熵|正则化|Dropout/, /过拟合|欠拟合|泛化/, /Transformer|自注意力|RNN|LSTM|GRU/i, /线性回归|逻辑回归|决策树|随机森林/, /特征工程|标准化|归一化/, /\bepoch\b|batch size|批大小|收敛/, /PyTorch|TensorFlow|\btorch\b/i, /实验(方案|设计)|消融|对照实验|可复现|精度提升|随机种子/] },
      // min:2 —— 领域标签要求题干至少命中 2 个独立领域信号，
      // 否则「CNN/RNN/Transformer 结构对比」「训练图像分类模型」这类通用题会被误划入 CV。
      { tech: 'CV', min: 2, kw: [/\bCV\b|计算机视觉/i, /图像分类|图像识别|图像处理|视觉模型/, /\bCNN\b|卷积/, /目标检测|\bYOLO\b|R-?CNN/, /语义分割|实例分割|图像分割/, /\bOCR\b|人脸识别|目标跟踪|关键点/, /ResNet|\bViT\b|Vision Transformer/i] },
      { tech: 'NLP', min: 2, kw: [/\bNLP\b|自然语言/i, /\bBERT\b|RoBERTa|ALBERT/, /分词|tokeniz/i, /词向量|Word2Vec|GloVe/i, /文本分类|情感分析|命名实体|\bNER\b/, /语言模型/, /\bBPE\b|子词/] },
      { tech: '推荐系统', min: 2, kw: [/推荐(系统|算法|模型)|Recommender|RecSys/i, /召回|粗排|精排|重排/, /\bCTR\b|点击率|转化率/, /双塔|DSSM|Wide ?& ?Deep|DeepFM|\bDIN\b/, /协同过滤|矩阵分解/, /冷启动|探索与利用|\bEE\b/, /用户画像|物品画像/] }
    ]
  },

  // ==================================================================
  // 第二轮：老分类器遗留的「跨领域错标」
  //
  // 早期 TECH_MAP 每个模块只六七个候选标签，不在专业领域内的题统统落进最近的桶。
  // 由 audit-content-coverage.mjs 的 D3 检出（题面命中该标签关键词 <35%）：
  //   be-data   的 Spark DataFrame 题 → 标「微服务」（命中率 3%）
  //   op-cloud  的云主机/快照题      → 标「SRE」（22%）
  //   fe-native 的 MVVM/MVI 架构题   → 标「JavaScript」（27%）
  //   op-trad   的变更窗口/配置管理题 → 标「CI/CD」（0%）
  // 这些题的 subtrack（赛道归属）是对的，只有 L4 标签错，故只在赛道内重选。
  // ==================================================================

  {
    track: 'be-data', module: 'backend', from: ['微服务'], default: '综合应用',
    cands: [
      { tech: 'Spark', kw: [[/\bSpark\b|SparkSQL|Spark SQL/i, 2], /DataFrame|\bRDD\b|\bDataset\b/, /Catalyst|钨丝计划|Tungsten/, /\bExecutor\b|\bDriver\b|DAGScheduler/, /宽依赖|窄依赖|Stage 划分|shuffle/i, /惰性执行|transformation|action 操作/] },
      { tech: '数仓建模', kw: [/数仓|数据仓库|维度建模|分层|事实表|维度表|缓慢变化|拉链表/i, [/\bETL\b|血缘|宽表|星型模型|雪花模型/i, 2]] },
      { tech: 'Kafka', kw: [[/\bKafka\b/i, 2], /消费组|分区|offset|重平衡|rebalance/i] },
      { tech: 'Flink', kw: [[/\bFlink\b/i, 2], /水位线|Watermark|Checkpoint|状态后端|背压/i] },
      { tech: 'Hive', kw: [[/\bHive\b/i, 2], /分区表|桶表|\bHQL\b|Metastore/i] },
      { tech: '调度与集成', kw: [[/调度|Airflow|DolphinScheduler|任务依赖|补数|回溯/i, 2]] }
    ]
  },
  {
    // 中间件集群搭建 / 限流隔离 / 社区跟进 —— 属于中间件工程，不是微服务
    track: 'be-search', module: 'backend', from: ['微服务'], default: '综合应用',
    cands: [
      { tech: 'Elasticsearch', kw: [[/Elasticsearch|ElasticSearch/i, 2], /Lucene|倒排索引|分词器|\bMapping\b|ik_|Query DSL/i] },
      { tech: 'Redis', kw: [[/\bRedis\b/i, 2], /缓存|分布式锁|限流/i] },
      { tech: '消息队列', kw: [[/消息队列|\bMQ\b|Kafka|RocketMQ|RabbitMQ/i, 2], /削峰|死信|堆积/i] }
    ]
  },
  {
    // 分库分表 / 数据库选型对比 —— 属数据库范畴，不属微服务
    track: 'be-db', module: 'backend', from: ['微服务'], default: '数据库原理',
    cands: [
      { tech: 'NoSQL', kw: [[/MongoDB|Cassandra|HBase|NoSQL/i, 2], /文档数据库|键值数据库|列族/i] },
      { tech: 'Elasticsearch', kw: [[/Elasticsearch|ElasticSearch/i, 2], /Lucene|倒排索引/i] },
      { tech: '数据库原理', kw: [/分库分表|Sharding|ShardingSphere|MyCat|Vitess/i, /全局唯一 ?ID|雪花算法|Snowflake/i, /双写|灰度切流|数据迁移/i, /主从|读写分离|复制/i, /索引|B\+ ?树/i, /事务|隔离级别|MVCC/i] }
    ]
  },
  {
    // 帧同步 / 单线程逻辑模型 / 金币并发 —— 游戏服务端特有，无对应受控标签，落综合应用
    track: 'be-game', module: 'backend', from: ['微服务'], default: '综合应用',
    cands: [
      { tech: 'Redis', kw: [[/\bRedis\b/i, 2], /缓存|分布式锁/i] },
      { tech: 'MySQL', kw: [[/MySQL|数据库|事务|锁/i, 2]] },
      { tech: '消息队列', kw: [[/消息队列|\bMQ\b|Kafka/i, 2]] }
    ]
  },
  {
    // 分布偏移 / 标注一致性（IAA）/ 维度灾难 —— 是数据质量，不是推理部署
    track: 'ai-data', module: 'ai', from: ['推理与部署'], default: '数据与标注',
    cands: [
      { tech: '数据与标注', kw: [[/标注|数据质量|样本|清洗|分布偏移|标注一致|IAA|标注者/i, 2], /维度灾难|降维|向量化|数据集/i] },
      { tech: '模型与训练', kw: [[/训练|梯度|模型|特征工程/i, 2]] }
    ]
  },
  {
    track: 'op-sec', module: 'devops', from: ['SRE'], default: '安全',
    cands: [
      { tech: '安全', kw: [[/安全|XSS|CSRF|注入|越权|加密|鉴权|漏洞|渗透|防火墙|\bWAF\b|审计|合规|脱敏/i, 2]] },
      { tech: 'Linux', kw: [[/\bLinux\b|\bShell\b|文件描述符|inode|systemd|chmod/i, 2]] }
    ]
  },
  {
    // 云主机规格 / 镜像快照 / 对象存储生命周期 —— 云平台，不是 SRE 方法论
    track: 'op-cloud', module: 'devops', from: ['SRE'], default: '云平台',
    cands: [
      { tech: '云平台', kw: [[/云主机|实例规格|镜像|快照|对象存储|\bOSS\b|\bS3\b|云盘|\bVPC\b|负载均衡|\bSLB\b|弹性伸缩|\bCDN\b|可用区|地域|计费|包年包月/i, 2]] },
      { tech: 'Kubernetes', kw: [[/Kubernetes|\bK8s\b|\bPod\b|容器|kubectl|Helm/i, 2]] },
      { tech: 'SRE', kw: [[/\bSRE\b|可用性|\bSLO\b|\bSLI\b|自愈|排障|值班|混沌|故障演练/i, 2]] }
    ]
  },
  {
    track: 'op-cloud', module: 'devops', from: ['Linux'], default: '综合应用',
    cands: [
      { tech: '云平台', kw: [[/云主机|实例规格|镜像|快照|对象存储|\bOSS\b|\bS3\b|云盘|\bVPC\b|负载均衡|弹性伸缩|\bCDN\b|可用区|地域/i, 2]] },
      { tech: 'Linux', kw: [[/\bLinux\b|\bShell\b|文件描述符|inode|systemd|chmod|系统调用|虚拟内存/i, 2]] }
    ]
  },
  {
    track: 'op-sre', module: 'devops', from: ['CI/CD'], default: '综合应用',
    cands: [
      { tech: 'SRE', kw: [[/\bSRE\b|可用性|\bSLO\b|\bSLI\b|自愈|排障|值班|告警|混沌|故障演练|应急预案/i, 2]] },
      { tech: 'CI/CD', kw: [[/CI\/CD|流水线|持续集成|持续交付|Jenkins|GitLab CI|GitHub Actions/i, 2]] }
    ]
  },
  {
    // 变更三板斧 / 变更窗口期 / 配置管理推广 —— 运维流程方法论，不是 CI/CD
    track: 'op-trad', module: 'devops', from: ['CI/CD'], default: '综合应用',
    cands: [
      { tech: 'SRE', kw: [[/\bSRE\b|可用性|\bSLO\b|\bSLI\b|值守|故障|应急预案/i, 2]] },
      { tech: 'CI/CD', kw: [[/CI\/CD|流水线|持续集成|Jenkins|构建部署/i, 2]] }
    ]
  },
  {
    // op-sre「SRE」占 91%。探针量化后发现 331 题里有 74 道是错标（数据库 56 / Redis 18），
    // 其余可按 SRE 职责拆出「监控与可观测」。op-k8s 则相反——356 题里只有 10 道异构（3%），
    // 内容确实都属于 K8s，那种情况保持现状才是正确的，不要为了降占比而硬拆。
    track: 'op-sre', module: 'devops', from: ['SRE'], default: 'SRE',
    cands: [
      { tech: '数据库', kw: [[/慢 ?SQL|慢查询|锁等待|死锁|数据库|主从|主备|读写分离|分库分表|Binlog|执行计划/i, 2], /索引|事务|连接池|\bSQL\b|表结构/i] },
      { tech: '缓存', kw: [[/\bRedis\b|缓存|RDB|\bAOF\b|持久化|击穿|雪崩|穿透|热 key|大 key/i, 2]] },
      { tech: '监控与可观测', kw: [[/监控|告警|指标|Prometheus|Grafana|可观测|日志采集|链路追踪|Tracing|仪表盘|SLI|SLO/i, 2], /采集|采样|埋点/i] },
      { tech: 'SRE', kw: [[/故障|应急|预案|演练|混沌|Chaos|复盘|postmortem|值守|值班|OnCall|容量|压测|错误预算|Error Budget/i, 2]] }
    ]
  },
  {
    // op-devops「CI/CD」占 91%，其中 43% 是错标：Terraform/IaC 60 题、监控 17 题、微服务 15 题。
    track: 'op-devops', module: 'devops', from: ['CI/CD'], default: 'CI/CD',
    cands: [
      { tech: '基础设施即代码', kw: [[/Terraform|\bHCL\b|\bIaC\b|基础设施即代码|Ansible|Puppet|Chef|SaltStack/i, 2], /provider|resource 块|variable|output 块|state 文件|模块化|plan\/apply/i] },
      { tech: '监控与可观测', kw: [[/监控|Prometheus|Grafana|告警|指标|可观测|DORA|追踪|日志/i, 2]] },
      { tech: '数据库', kw: [[/数据库|慢 ?SQL|索引|事务|主从/i, 2]] },
      { tech: '容器/Docker', kw: [[/Docker|容器|镜像|Dockerfile|Registry|Harbor|Artifactory|Nexus|制品仓库/i, 2]] },
      { tech: 'Kubernetes', kw: [[/Kubernetes|\bK8s\b|\bPod\b|kubectl|Helm|容器编排/i, 2]] },
      { tech: 'CI/CD', kw: [[/流水线|Pipeline|Jenkins|GitLab CI|GitHub Actions|构建|编译|打包|灰度|蓝绿|金丝雀|滚动|回滚|门禁/i, 2]] }
    ]
  },
  {
    // fe-arch「工程化」占 93%，其中 31% 是错标：架构设计 35 题（Design Token / 模块联邦）、测试 18 题。
    track: 'fe-arch', module: 'frontend', from: ['工程化'], default: '工程化',
    cands: [
      { tech: '架构设计', kw: [[/架构|Design Token|设计系统|模块联邦|Module Federation|微前端|分层|解耦|边界|治理|monorepo 架构|组件库/i, 2], /模式|原则|权衡|选型/i] },
      { tech: '测试', kw: [[/测试|单测|单元测试|\bE2E\b|端到端|覆盖率|\bMock\b|断言|Jest|Vitest|Cypress|Playwright|契约测试/i, 2]] },
      // 注意不要把 Tree Shaking 放进性能优化：它是构建工具特性（webpack/Vite 的产物优化），
      // 题干常只写「Tree Shaking 为什么只对 ESM 有效」而不出现性能类词汇，
      // 放进来会把这类题从工程化抢走。
      { tech: '性能优化', kw: [[/性能优化|首屏|FCP|LCP|加载性能|体积优化|拆包|代码分割|预加载|懒加载|长任务|重排|重绘/i, 2]] },
      { tech: '工程化', kw: [[/webpack|Vite|Rollup|esbuild|构建|打包|Babel|编译|Source ?Map|Tree ?Shaking|ES ?Modules?|ESM|CommonJS/i, 2], [/pnpm|workspace|ESLint|Prettier|Husky|commitlint|规范/i, 2]] }
    ]
  },
  {
    // ai-infra 推理栈再细分：蒸馏/量化/KV Cache → 模型压缩，Serving/路由/流式 → 服务化架构，
    // TensorRT/vLLM/ONNX → 推理引擎。不做这步 ai-infra 正好卡在 A4 的 60% 红线上。
    track: 'ai-infra', module: 'ai', from: ['推理与部署'], default: '推理与部署',
    cands: [
      { tech: '模型压缩', kw: [[/量化|剪枝|蒸馏|Distillation|Quantization|Pruning/i, 2], [/KV ?Cache|投机解码|Speculative|MoE|混合专家|显存优化|算子融合/i, 2], /INT8|INT4|FP16|低比特|压缩比/i] },
      { tech: '推理引擎', kw: [[/TensorRT|TensorRT-LLM|vLLM|\bTGI\b|Triton|ONNX|TorchServe|TensorFlow Serving|llama\.cpp|Ollama/i, 2], /推理引擎|推理框架|\bRuntime\b|算子/i] },
      { tech: '服务化架构', kw: [[/\bServing\b|模型服务|模型路由|Model Routing|流式输出|Streaming|\bSSE\b|WebSocket/i, 2], [/\bAPI\b|网关|负载均衡|自动扩缩|\bHPA\b|弹性|并发|QPS|吞吐|限流|熔断/i, 2], /批处理|Batching|连续批|Continuous Batching/i] },
      { tech: '推理与部署', kw: [[/部署|上线|灰度|回滚|发布流程|CI\/CD|监控|可观测|staging/i, 2]] }
    ]
  },
  {
    // 云平台再细分：云主机/镜像快照 → 云计算，OSS/对象存储 → 云存储，
    // 合规基线/审计日志/Well-Architected → 云治理。
    // 不做这步的话 op-cloud 会变成「云平台」独占 65%，A4 挂且筛选失效。
    track: 'op-cloud', module: 'devops', from: ['云平台'], default: '云平台',
    cands: [
      { tech: '云计算', kw: [[/云主机|实例规格|实例类型|Instance Type|镜像|快照|弹性伸缩|裸金属|抢占式|专宿主机/i, 2], /算力|vCPU|规格族|升配|降配/i] },
      // 注意：S3/OSS 只给权重 1。「编写一个 IAM 策略允许对 S3 桶执行 GetObject」本质是权限题，
      // 若 OSS/S3 给权重 2 会压过安全特征被误判成云存储。
      { tech: '云存储', kw: [[/对象存储|\bOSS\b|\bS3\b|云盘|块存储|文件存储|\bNAS\b|归档存储|生命周期管理/i, 1], [/存储桶|bucket|分片上传|断点续传/i, 2]] },
      { tech: '云治理', kw: [[/云治理|合规基线|合规检查|审计日志|CloudTrail|ActionTrail|OpenSCAP|责任共担|成熟度|治理框架/i, 2], /Well-?Architected|CAF|云采用框架|Azure Policy|Organi[sz]ation|订阅/i, [/Config/i, 1]] },
      { tech: '安全', kw: [[/安全组|\bWAF\b|DDoS|DDOS|证书|密钥|\bKMS\b|\bRAM\b|\bIAM\b|权限|多账号|访问控制|零信任|身份|凭据|加密/i, 2]] },
      { tech: '网络', kw: [[/\bVPC\b|负载均衡|\bSLB\b|\bCLB\b|\bCDN\b|\bDNS\b|专线|\bVPN\b|NAT 网关|弹性公网|\bEIP\b|带宽/i, 2]] }
    ]
  },
  {
    // MVVM / MVI / VIPER 架构模式 —— 跨端架构设计，不是 JS 语言特性
    track: 'fe-native', module: 'frontend', from: ['JavaScript'], default: '综合应用',
    cands: [
      { tech: 'iOS', kw: [[/\biOS\b|Swift|SwiftUI|UIKit|ViewController|Xcode/i, 2]] },
      { tech: 'Android', kw: [[/Android|Kotlin|Jetpack|Activity|Fragment/i, 2]] }
    ]
  }
]

// ============================ 判定 ============================
function classify (text, scope) {
  let best = null, bestScore = 0
  for (const c of scope.cands) {
    let s = 0
    for (const p of c.kw) {
      // kw 项支持两种写法：RegExp（权重 1）或 [RegExp, weight]（显式权重）
      const [re, w] = Array.isArray(p) ? [p[0], p[1]] : [p, 1]
      if (re.test(text)) s += w
    }
    // min：该候选生效的最低分。用于给「领域标签」设门槛——
    // 题干只有 1 个弱信号（如顺带提到「图像」）不足以推翻通用标签。
    if (s < (c.min || 1)) continue
    if (s > bestScore) { bestScore = s; best = c.tech }
  }
  return { tech: bestScore > 0 ? best : scope.default, score: bestScore }
}

// ============================ 主流程 ============================
const db = new Database(DB_PATH, { readonly: !APPLY })

// 安全校验：所有候选与兜底标签必须被该赛道允许，否则宁可不跑
for (const sc of SCOPES) {
  for (const name of [...sc.cands.map(c => c.tech), sc.default]) {
    const term = termOf(sc.module, name)
    if (!term) throw new Error(`词表缺少术语：${sc.module}/${name}`)
    if (term.allowTracks !== '*' && !term.allowTracks.includes(sc.track)) {
      throw new Error(`术语「${name}」不允许出现在赛道 ${sc.track}`)
    }
  }
}

const OUT = []
const P = s => { OUT.push(s); }
let totalChanges = 0

for (const sc of SCOPES) {
  const ph = sc.from.map(() => '?').join(',')
  const rows = db.prepare(
    `select id, subtrack, tech, q from interview_questions where subtrack = ? and tech in (${ph})`
  ).all(sc.track, ...sc.from)

  const before = {}, after = {}
  const changes = []
  const samplesByTech = {}
  for (const r of rows) {
    before[r.tech] = (before[r.tech] || 0) + 1
    const text = String(r.q || '').slice(0, 800)
    const { tech, score } = classify(text, sc)
    after[tech] = (after[tech] || 0) + 1
    if (tech !== r.tech) changes.push({ id: r.id, old: r.tech, neu: tech, score, q: String(r.q || '').replace(/\s+/g, ' ').slice(0, 100) })
    ;(samplesByTech[tech] ||= []).push({ id: r.id, score, q: String(r.q || '').replace(/\s+/g, ' ').slice(0, 100) })
  }

  // 该赛道重打后的最终全局分布：先扣掉本次重打桶的原有计数，再加上新判定计数。
  // （此前直接 set 会覆盖范围外同名标签的存量计数，导致占比算错。）
  const all = db.prepare('select tech, count(*) c from interview_questions where subtrack = ? group by tech').all(sc.track)
  const finalMap = new Map(all.map(r => [r.tech, r.c]))
  for (const [t, c] of Object.entries(before)) finalMap.set(t, (finalMap.get(t) || 0) - c)
  for (const [t, c] of Object.entries(after)) finalMap.set(t, (finalMap.get(t) || 0) + c)
  for (const [t, c] of [...finalMap]) if (c <= 0) finalMap.delete(t)
  const finalTotal = [...finalMap.values()].reduce((a, b) => a + b, 0)
  const top = [...finalMap.entries()].sort((a, b) => b[1] - a[1])[0]

  P('')
  P(`===== ${sc.track} · 重打范围 [${sc.from.join(' / ')}] (${rows.length} 题) =====`)
  P(`  判定分布： ` + Object.entries(after).map(([k, v]) => `${k} ${v}`).join(' | '))
  P(`  重打后赛道全局 TOP：` + [...finalMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([k, v]) => `${k} ${v}(${(v / finalTotal * 100).toFixed(0)}%)`).join(' | '))
  P(`  最大占比：${top[0]} ${(top[1] / finalTotal * 100).toFixed(0)}%`)
  P(`  变更 ${changes.length} 题`)
  for (const t of Object.keys(after)) {
    P(`  -- 抽查「${t}」--`)
    for (const s of (samplesByTech[t] || []).slice(0, SAMPLES)) P(`     [${s.score}] ${s.q}`)
  }
  totalChanges += changes.length
  sc._changes = changes
}

fs.writeFileSync(path.join(ROOT, '.workbuddy/_retag-dryrun.txt'), OUT.join('\n'), 'utf8')
console.log(OUT.join('\n'))
console.log(`\n合计变更 ${totalChanges} 题；明细已写入 .workbuddy/_retag-dryrun.txt`)

if (!APPLY) { console.log('[dry-run] 未写库。加 --apply 执行。'); process.exit(0) }

const bak = `${DB_PATH}.bak-${Date.now()}`
fs.copyFileSync(DB_PATH, bak)
console.log('\n已备份：' + path.basename(bak))
const upd = db.prepare('update interview_questions set tech = ? where id = ?')
const tx = db.transaction(list => { for (const c of list) upd.run(c.neu, c.id) })
const all = SCOPES.flatMap(s => s._changes || [])
tx(all)
console.log(`已更新 ${all.length} 题`)
