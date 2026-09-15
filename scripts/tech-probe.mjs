/**
 * 受控术语 → 题面特征探针（共享）。
 *
 * 用途：判断「打上某标签的题，题干里到底有没有出现该技术」。
 * audit-content-coverage.mjs（D3 背离检出）与 retag-llm.mjs（重打范围筛选）
 * 必须共用同一份，否则两处口径漂移会出现「报告说没问题但重打又改一遍」。
 *
 * 取值规则（校准经验，改之前先读）：
 * - `null`  = 该标签无稳定题面特征（如「综合应用」「数据库原理」），**跳过不判**
 * - 缺省   = 该术语没有登记探针，同样跳过不判
 * - RegExp = 只收「该技术的强特征词」，**不收通用词**
 *
 * 反例（真实踩过）：Linux 探针若加「内存|负载」，「云主机 CPU 负载飙高」会被误判命中，
 * 而它其实是云平台题——标 Linux 是真错标，加通用词等于把问题藏起来。
 * 同理 Go 探针必须收 channel/select/defer，否则「无缓冲 channel 的语义」这类
 * 纯 Go 题会因为题干不写「Go」而被误判成错标。
 */
export const PROBE = {
  'PostgreSQL': /Postgre/i, 'Redis': /Redis/i, 'NoSQL': /NoSQL|MongoDB|Cassandra|HBase|文档数据|键值/i,
  'MySQL': /MySQL|InnoDB|B\+ ?树|聚簇索引/i, '数据库原理': null,
  'ECharts': /ECharts/i, 'D3': /\bD3\b|d3\./i, 'WebGL': /WebGL|Three\.js|着色器|shader/i,
  '可视化基础': null, 'Canvas': /canvas/i,
  'CV': /CV|图像|卷积|目标检测|分割|视觉|YOLO|OCR/i,
  'NLP': /NLP|自然语言|BERT|分词|文本分类|序列标注|翻译/i,
  '推荐系统': /推荐|召回|CTR|协同过滤|双塔|精排/i,
  '模型与训练': null,
  'Elasticsearch': /Elastic|ES 索引|倒排索引|Lucene/i,
  '微服务': /微服务|服务注册|服务发现|熔断|限流|网关|注册中心|Nacos|Consul/i,
  '消息队列': /消息队列|MQ|Kafka|RocketMQ|RabbitMQ|削峰|死信/i,
  'Flutter': /Flutter|Dart|Widget/i,
  'React Native': /React Native|Native Bridge|\bBridge\b|Watchman|Metro|Hermes|FlatList|Expo/i,
  'iOS': /iOS|Swift|UIKit|SwiftUI|Xcode/i, 'Android': /Android|Kotlin|Jetpack|Activity|Fragment/i,
  'Electron': /Electron|主进程|渲染进程|IPC|BrowserWindow/i, 'Tauri': /Tauri|Rust/i,
  'uni-app': /uni-?app/i,
  // DevEco Studio（鸿蒙 IDE）/ router.pushUrl（鸿蒙路由）/ Preferences（鸿蒙轻量存储）
  // 必须收进来：缺这些词时，201 道鸿蒙题里有 85 道会被误判成「题面无鸿蒙特征」。
  'HarmonyOS': /鸿蒙|Harmony|ArkTS|ArkUI|Ability|@State|@Prop|@Link|@Component|方舟|Stage 模型|DevEco|pushUrl|replaceUrl|Preferences|元服务|\bHAP\b|Hvigor|OpenHarmony|ohos/i,
  '小程序': /小程序|wx\.|setData|AppID/i,
  'Node.js': /Node\.js|Node 的|require\(|module\.exports|\bexports\b|CommonJS|\bESM\b|ES Modules|libuv|EventEmitter|Express|Koa|NestJS|npm|package\.json/i,
  'Kafka': /Kafka/i, 'Spark': /Spark|DataFrame|\bRDD\b|Catalyst/i, 'Flink': /Flink/i, 'Hive': /Hive/i,
  'Java/Spring': /Java|Spring|JVM|\bGC\b|HashMap|线程池/i,
  'Go': /Go 语言|Golang|goroutine|\bchannel\b|\bselect\b|defer|sync\.|WaitGroup|panic|recover|Gin/i,
  'Python': /Python|FastAPI|Django|pandas|GIL/i, 'Gin': /Gin|Golang|goroutine/i, 'FastAPI': /FastAPI|Python/i,
  'React': /React|Hook|useState|useEffect|Redux|JSX/i, 'Vue': /Vue|响应式|ref\(|reactive|setup\(/i,
  'TypeScript': /TypeScript|TS 的|泛型|interface|类型断言/i,
  'JavaScript': /JavaScript|\bJS\b|闭包|原型|原型链|事件循环|Promise|async|await|箭头函数|柯里化|防抖|节流|深拷贝|作用域|变量提升|ES6|DOM|BOM/i,
  'RAG': /RAG|检索增强|向量检索|embedding/i, 'Agent': /Agent|智能体|工具调用|function call/i,
  '提示工程': /提示|prompt|few-?shot|思维链/i, '端侧 AI': /端侧|边缘|移动端推理|量化|NPU/i,
  '推理与部署': /推理|部署|TensorRT|ONNX|vLLM|加速/i,
  '性能优化': /性能|优化|首屏|加载|渲染性能/i, '工程化': /工程化|构建|webpack|Vite|CI|打包/i,
  '网络': /HTTP|TCP|TLS|DNS|网络/i, '安全': /安全|XSS|CSRF|注入|越权|加密|鉴权/i,
  'SRE': /SRE|可用性|SLO|SLI|故障|应急预案|值守|自愈|排障|故障演练|混沌/i,
  'CI/CD': /CI\/CD|流水线|持续集成|持续交付|Jenkins|GitLab CI|GitHub Actions|构建部署/i,
  'Kubernetes': /Kubernetes|\bK8s\b|\bPod\b|Deployment|容器编排|kubectl|Helm|Service Mesh/i,
  '综合应用': null, 'Web 基础': null, '系统设计': null, '操作系统': null,
  '数据与标注': /标注|数据质量|样本|清洗|分布偏移|标注一致|IAA|标注者/i,
  '模型评估': null, '数据仓库': /数仓|数据仓库|ETL|维度建模|分层|离线计算/i,
  '调度与集成': /调度|Airflow|DolphinScheduler|任务依赖/i,
  '缓存': /缓存|cache/i,
  'Linux': /\bLinux\b|\bShell\b|脚本|文件描述符|inode|systemd|chmod|进程|线程|内核|系统调用|虚拟内存|中断/i,
  '监控': /监控|Prometheus|Grafana|告警|指标/i,
  '监控与可观测': /监控|Prometheus|Grafana|告警|指标|可观测|追踪|Tracing/i,
  '云原生': /云原生|Serverless|Service Mesh|Istio/i,
  '测试': /测试|单测|用例|覆盖率/i, '游戏': /游戏|帧同步|状态同步|物理引擎/i,
  '搜索': /搜索|召回|倒排|相关性|Query 理解/i, '大数据': /大数据|数仓|ETL|离线计算/i,
  '数据库': /数据库|慢 ?SQL|慢查询|索引|事务|主从|锁等待/i,
  '架构设计': /架构|Design Token|设计系统|模块联邦|Module Federation|微前端|分层|解耦/i,
  '基础设施即代码': /Terraform|\bHCL\b|\bIaC\b|基础设施即代码|Ansible|Puppet/i,
  '推理引擎': /TensorRT|vLLM|Triton|ONNX|推理引擎|推理框架/i,
  '服务化架构': /Serving|模型服务|模型路由|流式输出|Streaming|API 网关/i,
  '模型压缩': /量化|剪枝|蒸馏|Distillation|KV ?Cache|投机解码/i,
  '云计算': /云主机|实例规格|实例类型|镜像|快照|弹性伸缩/i,
  '云存储': /对象存储|\bOSS\b|\bS3\b|云盘|块存储|文件存储/i,
  '云治理': /云治理|合规基线|审计日志|CloudTrail|责任共担|Well-?Architected/i,
  '云平台': /云主机|对象存储|云盘|可用区|地域|云平台|云产品/i
}
