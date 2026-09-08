#!/usr/bin/env node
// 面试题 tech 标签重打标（L4 归类治理）
//
// 用法：
//   node scripts/taxonomy-reclassify.mjs             # dry-run：只统计 + 输出变更计划 CSV
//   node scripts/taxonomy-reclassify.mjs --apply     # 写库（自动备份 + 事务）
//
// 硬约束：只改 interview_questions.tech，绝不改动题干 / 答案 / subtrack。
// 判定优先级：实体命中（关键词规则）→ 领域继承（赛道默认）→ 兜底「综合应用」。

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'

const ROOT = process.cwd()
const DB_PATH = path.join(ROOT, 'data/devmentor.db')
const APPLY = process.argv.includes('--apply')

function loadTs (rel, expr) {
  const code = `import('./${rel}').then(m => console.log(JSON.stringify(${expr})))`
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '-e', code], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  })
  return JSON.parse(out.trim().split('\n').pop())
}
const VOCAB = loadTs('app/data/techVocabulary.ts', 'm.TECH_VOCABULARY')

const termsFor = (module, trackId) =>
  VOCAB.filter(v => v.module === module && (v.allowTracks === '*' || v.allowTracks.includes(trackId)))
const termByName = (module, name) => VOCAB.find(v => v.module === module && v.name === name)

// ---------------- 关键词规则 ----------------
// 每条规则：{ tech: 目标展示名, kw: 正则 }
// 顺序即优先级，先命中者胜。
const RULES = {
  ai: [
    { tech: '端侧 AI', kw: /端侧|边缘(设备|计算|推理)|ONNX|TFLite|MNN|NCNN|CoreML|算子融合|嵌入式|手机端|移动端推理|移动设备|树莓派|NPU|量化感知|QAT|PTQ|模型转换|端上/ },
    { tech: 'RAG', kw: /RAG|检索增强|向量数据库|向量库|向量检索|Embedding|embedding|嵌入|FAISS|Milvus|Qdrant|pgvector|Weaviate|RRF|语义缓存|chunk|Chunking|文本切分|分块|结构感知切分|召回|重排|rerank|查询改写|查询扩展|知识库|语义检索|BM25|混合检索|Self-RAG|索引构建|向量索引|倒排|相似度|向量模型/ },
    { tech: 'Agent', kw: /Agent|智能体|ReAct|工具调用|工具定义|Function\s?Call|JSON Schema|Schema|LangChain|LlamaIndex|MCP|Model Context Protocol|上下文协议|反思|Reflection|任务规划|任务分解|多轮对话|对话记忆|长期记忆|记忆机制|自主规划|插件|编排框架/ },
    { tech: '模型与训练', kw: /CNN|RNN|LSTM|GRU|Transformer|自注意力|Self-Attention|多头注意力|掩码|Mask|mask|梯度|反向传播|前向传播|损失函数|交叉熵|Focal|Triplet|优化器|Adam|SGD|动量|学习率|epoch|batch size|过拟合|欠拟合|正则化|Dropout|BatchNorm|激活函数|PyTorch|TensorFlow|Keras|torch|张量|训练循环|训练过程|线性回归|逻辑回归|朴素贝叶斯|决策树|随机森林|XGBoost|特征工程|特征构造|特征选择|标准化|归一化|极大似然|最大后验|MLE|MAP|随机种子|实验管理|实验方案|对照实验|消融|可复现|权重初始化|数值稳定性|自动微分|autograd|DataLoader|残差|ResNet|模型宽度|模型深度|精度提升/ },
    { tech: '推理与部署', kw: /量化|INT8|INT4|FP8|FP16|投机解码|Speculative|continuous batching|静态批处理|MoE|混合专家|HPA|自动扩缩|扩缩容|显存|GPU|吞吐|延迟|首字|QPS|vLLM|TensorRT|推理引擎|推理服务|模型服务|成本|计费|Token 计费|供应商|开源模型|闭源|KV\s?Cache|KV缓存|批处理|蒸馏|模型路由|流式输出|流式中断|停止生成|取消生成|中断|Streaming|SSE|并发推理|批量推理|服务化部署|上线|部署|P99|P95|压测|容量|API|鉴权|密钥|API ?Key|限流|429|熔断|重试|重试风暴|OWASP|拒绝服务|资源耗尽|版本化|回滚|模型导出|ONNX|TorchScript|A\/B|灰度|MLOps|LLMOps|备份|快照|容灾/ },
    { tech: '数据与标注', kw: /训练集|验证集|测试集|数据集划分|数据划分|标注|语料|数据清洗|数据质量|数据飞轮|分布偏移|采样偏差|样本偏差|数据增强|标签噪声|人机协同标注|标注平台|特征存储|样本均衡|分层划分|时间泄漏/ },
    { tech: '评估与观测', kw: /评估|评测|评价指标|指标体系|基准|benchmark|准确率|精确率|召回率|F1|AUC|BLEU|ROUGE|回归测试|离线评测|在线评测|人工评估|打分|评分|可观测|监控告警|监控|链路追踪|追踪|Tracing|TraceId|埋点|审计日志|日志|幻觉检测|漂移检测|质量度量|bad case|坏样本|根因|G-Eval|LLM-as-judge|裁判|红队|Red Teaming|校准|偏差|bias|偏好|忠实|流畅|实验记录|实验追踪|MLflow|WandB|W&B|观测体系|告警/ },
    { tech: 'Prompt 工程', kw: /提示|prompt|Prompt|采样参数|temperature|Temperature|top-?p|top-?k|上下文窗口|上下文|长文本|少样本|few-?shot|零样本|zero-?shot|微调|Fine-?tuning|fine-?tuning|蒸馏模型|幻觉|Hallucination|hallucination|Guardrails|护栏|输出约束|输出格式|结构化输出|结构化数据|JSON|多模态|注入|内容安全|合规|隐私|PII|脱敏|敏感|系统提示|角色设定|思维链|CoT|Chain of Thought|告知|降级策略|安全/ }
  ],
  'backend:be-data': [
    { tech: '数仓建模', kw: /数仓|数据仓库|分层|ODS|DWD|DWS|ADS|维度建模|星型模型|雪花模型|事实表|维度表|指标体系|口径|指标平台|缓慢变化维|SCD|数据资产|维度一致性|度量/ },
    { tech: 'Flink', kw: /Flink|实时流|流式计算|水位线|Watermark|窗口计算|状态后端|CEP|实时数仓/ },
    { tech: 'Kafka', kw: /Kafka|消息队列|Topic|分区|消费者组|offset|削峰|流处理/ },
    { tech: 'Spark', kw: /Spark|RDD|Spark SQL|spark|Executor|Driver|shuffle|宽依赖|窄依赖/ },
    { tech: 'Hive', kw: /Hive|HQL|分区表|外部表|ORC|Parquet|Metastore/ },
    { tech: '调度与集成', kw: /Airflow|DolphinScheduler|DAG|调度|调度器|任务依赖|重试机制|DataX|Canal|Flume|数据同步|全量同步|增量同步|binlog|CDC|数据质量|数据集成|ETL/ },
    { tech: 'Python', kw: /Python|pandas|NumPy|PySpark/ }
  ],
  'devops:op-sec': [
    { tech: '安全', kw: /安全|渗透|漏洞|XSS|CSRF|SQL ?注入|注入攻击|加密|解密|证书|TLS|HTTPS|防火墙|WAF|审计|合规|最小权限|权限|OWASP|攻击|防护|防御|入侵|恶意|病毒|木马|勒索|APT|社工|钓鱼|脱敏|密钥|凭证|凭据|硬编码|堡垒机|JumpServer|加固|泄露|泄漏|等保|风险评估|威胁|HIDS|IDS|基线|情报/ },
    { tech: 'Kubernetes', kw: /Kubernetes|K8s|k8s|Pod|Deployment|Service|Ingress|ConfigMap|Secret|Namespace|etcd/ },
    { tech: 'CI/CD', kw: /CI\/CD|流水线|Jenkins|GitLab CI|GitHub Actions|构建|发布|部署流水线|制品|镜像仓库|蓝绿|金丝雀|回滚/ },
    { tech: '容器/Docker', kw: /容器|Docker|镜像|containerd|Dockerfile|命名空间隔离|cgroup/ },
    { tech: '网络', kw: /网络|DNS|TCP|HTTP|CDN|负载均衡|iptables|VPC|子网|路由|抓包|tcpdump|防火墙|端口/ },
    { tech: 'Linux', kw: /Linux|Shell|进程|文件系统|inode|权限位|chmod|systemd|日志|cron/ },
    { tech: 'SRE', kw: /SRE|SLO|SLI|SLA|告警|值班|故障|复盘|监控|可观测|错误预算|容量规划|应急响应/ }
  ]
}

// ---------------- 判定 ----------------
function classify (row) {
  // 只用题干判定：答案文本长且覆盖面广，纳入匹配会导致大量误判
  // （实测「什么是量化？」因答案里出现「训练」被误判为「模型与训练」）。
  const text = String(row.q || '').slice(0, 600)
  const key = `${row.module}:${row.subtrack}`
  const rules = RULES[key] || RULES[row.module] || []
  for (const r of rules) {
    if (r.kw.test(text)) {
      const term = termByName(row.module, r.tech)
      if (term && (term.allowTracks === '*' || term.allowTracks.includes(row.subtrack))) return { tech: r.tech, rule: r.tech }
    }
  }
  return { tech: '综合应用', rule: '兜底' }
}

// ---------------- 主流程 ----------------
const db = new Database(DB_PATH, { readonly: !APPLY })
const rows = db.prepare('select id, track, subtrack, tech, q, a from interview_questions').all()

// 需要重打的范围：AI 全模块（旧标签「部署与成本」已废弃）+ be-data + op-sec + 脏值
const TARGET_TRACKS = new Set(['ai-app', 'ai-infra', 'ai-mlops', 'ai-algo', 'ai-data', 'ai-edge', 'be-data', 'op-sec'])
const VOCAB_NAMES = new Map(VOCAB.map(v => [`${v.module}|${v.name}`, v]))

const changes = []
let scanned = 0
for (const r of rows) {
  const isDirty = !VOCAB_NAMES.has(`${r.track === 'ai' ? 'ai' : r.track}|${r.tech}`) // 粗略：按 track 归类模块
  if (!TARGET_TRACKS.has(r.subtrack) && !isDirty) continue
  scanned++
  const { tech, rule } = classify({ ...r, module: r.track })
  if (tech !== r.tech) changes.push({ id: r.id, track: r.track, subtrack: r.subtrack, old: r.tech, neu: tech, rule })
}

console.log(`扫描 ${scanned} 题，计划变更 ${changes.length} 题`)
const byRule = {}
for (const c of changes) byRule[c.rule] = (byRule[c.rule] || 0) + 1
console.log('新标签分布：', JSON.stringify(byRule, null, 0))
const byTrack = {}
for (const c of changes) (byTrack[c.subtrack] ||= {})[`${c.old}→${c.neu}`] = ((byTrack[c.subtrack] || {})[`${c.old}→${c.neu}`] || 0) + 1
console.log('\n按赛道变更明细：')
for (const [t, m] of Object.entries(byTrack)) {
  console.log(` [${t}] ` + Object.entries(m).map(([k, v]) => `${k}×${v}`).join(' | '))
}

fs.mkdirSync(path.join(ROOT, 'docs/audit'), { recursive: true })
const csv = ['id,track,subtrack,old_tech,new_tech,rule']
  .concat(changes.map(c => [c.id, c.track, c.subtrack, c.old, c.neu, c.rule].map(s => `"${String(s ?? '').replace(/"/g, '""')}"`).join(',')))
  .join('\n')
const csvPath = path.join(ROOT, 'docs/audit/taxonomy-reclassify-plan.csv')
fs.writeFileSync(csvPath, '\uFEFF' + csv, 'utf8')
console.log('\n变更计划：' + path.relative(ROOT, csvPath))

if (!APPLY) {
  console.log('\n[dry-run] 未写库。加 --apply 执行。')
  process.exit(0)
}

// ---- 写库 ----
const bak = `${DB_PATH}.bak-${Date.now()}`
fs.copyFileSync(DB_PATH, bak)
console.log('\n已备份：' + path.basename(bak))
const upd = db.prepare('update interview_questions set tech = ? where id = ?')
const tx = db.transaction(list => { for (const c of list) upd.run(c.neu, c.id) })
tx(changes)
console.log(`已更新 ${changes.length} 题`)
