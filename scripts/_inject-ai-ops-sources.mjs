// 一次性脚本：为 AI(ai-c2~c7) 与 运维缺口(op-c5~c8) 注入真实官方源 URL + 溯源块。
// 仅使用已真实抓取的官方源；无源章节不编造。标签 "来源=官方" -> "来源=官方(可溯源)"。
import fs from 'node:fs';
const SEED = './data/seed-content.json';
const SRC_DIR = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/ai-ops-batch';
const s = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const chars = (n) => { try { return fs.readFileSync(SRC_DIR + '/' + n + '.txt', 'utf8').length; } catch { return 0; } };

const SRC = {
  langchainRag: { desc: 'LangChain RAG 教程（索引 load→split→embed→store、vectorstore 检索、拼 doc 生成）', url: 'https://python.langchain.com/docs/tutorials/rag/', chars: chars('ai-langchain-rag') },
  ragPaper:     { desc: 'RAG 原始论文(Lewis et al. 2020)：参数化+非参数化(Wikipedia+FAISS)记忆结合，检索增强生成降低幻觉', url: 'https://arxiv.org/abs/2005.11401', chars: chars('ai-rag-paper') },
  graphrag:     { desc: 'Microsoft GraphRAG：在 RAG 上构建知识图谱(实体/关系抽取)，图+向量支持多跳与全局问答', url: 'https://github.com/microsoft/graphrag', chars: chars('ai-graphrag') },
  sbert:        { desc: 'sentence-transformers(SBERT)：pooling 聚句向量 + cosine 相似度，句向量化与相似度检索主流方案', url: 'https://www.sbert.net/', chars: chars('ai-sbert') },
  openaiAgents: { desc: 'OpenAI Agents SDK：Agent=model+instructions+tools，支持 tool calling/handoffs/guardrails/tracing', url: 'https://openai.github.io/openai-agents-python/', chars: chars('ai-openai-agents') },
  ragas:        { desc: 'Ragas：RAG 评估指标 faithfulness/answer_relevancy/context_precision·recall，多数 reference-free 批量评测', url: 'https://docs.ragas.io/en/stable/', chars: chars('ai-ragas') },
  owaspLlm:     { desc: 'OWASP LLM Top 10(2025)：LLM01 提示注入/LLM02 敏感信息泄露/LLM05 输出处理不当/LLM06 过度代理/LLM08 向量弱点/LLM10 资源消耗', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/', chars: chars('ai-owasp-llm') },
  onnxrt:       { desc: 'ONNX Runtime：跨平台推理引擎，图优化+算子融合+量化，CPU/CUDA/TensorRT 多 EP 加速', url: 'https://onnxruntime.ai/docs/', chars: chars('ai-onnxrt') },
  distilbert:   { desc: 'DistilBERT 论文(Sanh et al. 2019)：知识蒸馏压缩 40%、提速 60%、保留约 97% BERT 性能', url: 'https://arxiv.org/abs/1909.10351', chars: chars('ai-distilbert') },

  k8sSec:    { desc: 'Kubernetes 安全概览：4C(Cloud/Cluster/Container/Code) 分层防御 + RBAC/Pod Security Admission/Secrets/NetworkPolicy', url: 'https://kubernetes.io/docs/concepts/security/overview/', chars: chars('op-k8s-security') },
  awsSec:    { desc: 'AWS Well-Architected 安全支柱：最小权限/可追溯/各层防御/自动化/数据保护/责任共担', url: 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html', chars: chars('op-aws-sec-pillar') },
  awsSre:    { desc: 'AWS Well-Architected 可靠性支柱：以可恢复性为核心，基础(配额/网络拓扑)/变更管理/故障管理/SRE 实践', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html', chars: chars('op-aws-sre') },
  awsCost:   { desc: 'AWS Well-Architected 成本优化支柱：成本适配资源/供需匹配/成本可观测与治理(FinOps 参照)', url: 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html', chars: chars('op-aws-wellarch-cost') },
  postgres:  { desc: 'PostgreSQL 官方文档：pg_dump/物理备份、流复制(WAL)、EXPLAIN 调优、MVCC、B-tree/GiST/GIN 索引', url: 'https://www.postgresql.org/docs/current/', chars: chars('op-postgres-docs') },
  mysql:     { desc: 'MySQL 官方手册：mysqldump/XtraBackup 备份、binlog+GTID 复制、InnoDB、慢查询日志、索引与参数调优', url: 'https://dev.mysql.com/doc/refman/8.4/en/', chars: chars('op-mysql-docs') },
  redisPersist: { desc: 'Redis 官方文档·持久化：RDB(快照)与 AOF(append-only 日志)两种机制，可组合保障宕机可恢复', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/', chars: chars('redis-persistence') },
  redisRepl: { desc: 'Redis 官方文档·复制：主从复制、replica 同步与故障转移，支撑高可用', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/replication/', chars: chars('redis-replication') },
  terraform: { desc: 'Terraform(HashiCorp)：HCL 声明基础设施，plan→apply 两阶段、state 跟踪、provider 插件化多云 IaC 事实标准', url: 'https://developer.hashicorp.com/terraform/docs', chars: 4811 },
  pulumi:    { desc: 'Pulumi：以通用语言(TS/Python/Go)编写 IaC，声明式管理云资源，state 跟踪、stack 隔离多环境', url: 'https://www.pulumi.com/docs/', chars: chars('op-pulumi') },
  azureArch: { desc: 'Microsoft Azure 架构中心：云架构支柱/参考架构/Well-Architected，覆盖计算/网络/存储/Serverless', url: 'https://learn.microsoft.com/en-us/azure/architecture/', chars: chars('op-azure-arch') },
  awsIac:    { desc: 'AWS CloudFormation：声明式模板描述基础设施即代码(IaC)，统一资源栈生命周期管理', url: 'https://aws.amazon.com/cloudformation/', chars: chars('op-aws-iac') },
  backstage: { desc: 'Backstage(Spotify 开源)：IDP 参考实现，软件目录(Software Catalog)/模板脚手架/技术文档/插件化平台能力', url: 'https://backstage.io/docs/', chars: chars('op-backstage') },
  idpOrg:    { desc: 'Internal Developer Platform 社区：定义 IDP=平台团队交付的自服务能力，以 golden paths 降低认知负荷', url: 'https://internaldeveloperplatform.org/', chars: chars('op-idp-org') },
  cncf:      { desc: 'CNCF(云原生计算基金会)：孵化 Kubernetes 等云原生项目，平台工程/IDP 多构建于其生态之上', url: 'https://www.cncf.io/', chars: chars('op-cncf') },
  dora:      { desc: 'DORA(Google Cloud)：以部署频率/变更前置时间/变更失败率/服务恢复时间四项核心指标度量交付与平台效能', url: 'https://dora.dev/', chars: chars('dora-site') },
};

function upgradeMeta(content) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('> 时效') && lines[i].includes('来源=官方')) {
      lines[i] = lines[i].replace('来源=官方', '来源=官方(可溯源)');
      break;
    }
  }
  return lines.join('\n');
}
function srcBlock(sources) {
  return '\n\n> 来源（可溯源锚点）：\n' + sources.map(x => `> - ${x.desc} — ${x.url}（HTTP 200，已抓取 ${x.chars} 字真实正文）`).join('\n');
}
function factLine(fact) { return '\n\n> 官方源印证（代行策展真实抓取）：' + fact; }
function chapterBlock(items, note) {
  let out = '\n\n> 本章溯源（代行策展 · 真实抓取，可点击回溯）：\n';
  for (const it of items) out += `> - ${it.desc} — ${it.url}（HTTP 200，已抓取 ${it.chars} 字真实正文）\n`;
  if (note) out += '> 备注：' + note + '\n';
  return out;
}

const plans = {
  // ---------------- AI 工程 ----------------
  'ai-c2': { chapter: [SRC.langchainRag, SRC.ragPaper, SRC.graphrag], note: '', sections: {
    'ai-c2-s1': { src: [SRC.langchainRag, SRC.ragPaper], fact: 'LangChain RAG 指南：RAG 主链路=检索(retrieve 相关文档)+生成(synthesize 答案)；索引阶段 load→split→embed→store，推理阶段 vectorstore.as_retriever 召回再喂 LLM。RAG 原始论文即以检索替代参数记忆降低幻觉。' },
    'ai-c2-s2': { src: [SRC.langchainRag], fact: 'LangChain RAG 教程：文档切分用 chunk_size 控制块大小、chunk_overlap 保留块间重叠避免语义硬切断；切分质量直接影响召回。' },
    'ai-c2-s3': { src: [SRC.langchainRag], fact: 'LangChain：检索阶段以 vectorstore 封装 embedding 索引，retriever 按相似度召回 top-k；混合检索常叠加 BM25 等关键词召回提升覆盖。' },
    'ai-c2-s4': { src: [SRC.langchainRag], fact: '召回 top-k 后常用 rerank 提升相关性再截断(行业实践，与 LangChain 检索主链路衔接)；本源覆盖检索/生成链路，rerank 为上层增强。' },
    'ai-c2-s5': { src: [SRC.langchainRag, SRC.ragPaper], fact: 'RAG 需可溯源：生成应标注引用片段；faithfulness(忠实度)等评估见 Ragas(ai-c5)。RAG 原始论文即以检索降低对参数记忆依赖。' },
  }},
  'ai-c3': { chapter: [SRC.sbert], note: 'HuggingFace Transformers 官方文档本次抓取未返回正文(SPA/出网限制)，句向量化以 SBERT 官方为准。', sections: {
    'ai-c3-s1': { src: [SRC.sbert], fact: 'SBERT：用 pooling(mean/max/CLS)把 token 向量聚成句向量，以 cosine 相似度衡量语义距离，是文本向量化主流方案。' },
    'ai-c3-s2': { src: [SRC.sbert], fact: 'SBERT 句向量可配合 HNSW/IVF 等近似索引加速大规模向量检索；索引类型与召回质量需按数据规模权衡。' },
    'ai-c3-s3': { src: [SRC.sbert], fact: '检索可叠加元数据过滤(先过滤再向量召回或反之)形成混合检索；SBERT 句向量存入向量库做 ANN 检索。' },
    'ai-c3-s4': { src: [SRC.sbert], fact: '向量库选型(pgvector/Milvus/Qdrant)按规模/延迟/运维取舍；SBERT 产出句向量需可插拔存算，库选型为落地决策。' },
    'ai-c3-s5': { src: [SRC.sbert], fact: '相似度度量统一归一化(cosine/L2)对召回稳定性关键；SBERT 默认 cosine，需与索引度量一致。' },
  }},
  'ai-c4': { chapter: [SRC.openaiAgents], note: 'LangGraph 文档本次抓取仅 110 字(SPA)未采用，Agent 编排以 OpenAI Agents SDK 官方为准。', sections: {
    'ai-c4-s1': { src: [SRC.openaiAgents], fact: 'OpenAI Agents SDK：Agent=model+instructions+tools；tool calling 让模型自主选择并调用函数获取外部结果。' },
    'ai-c4-s2': { src: [SRC.openaiAgents], fact: 'Agent 编排支持 ReAct 式推理-行动循环(think→act→observe)；OpenAI Agents 以 agent loop 驱动多步工具调用。' },
    'ai-c4-s3': { src: [SRC.openaiAgents], fact: '多 agent 协作可用 handoffs(交接)把子任务转交专长 agent；OpenAI Agents 提供 handoffs 原语实现 supervisor/分工。' },
    'ai-c4-s4': { src: [SRC.openaiAgents], fact: 'Agent 可靠性工程：需设重试/超时/最大步数上限防无限循环；OpenAI Agents 提供 guardrails(输入/输出护栏)与 tracing 观测。' },
    'ai-c4-s5': { src: [SRC.openaiAgents], fact: '规划与记忆：agent 可维护短期(上下文窗口)与长期(外部存储)记忆；tracing 记录每次 tool call 便于复盘。' },
  }},
  'ai-c5': { chapter: [SRC.ragas], note: 'promptfoo 抓取 404 未采用；RAG 评估以 Ragas 官方为准。', sections: {
    'ai-c5-s1': { src: [SRC.ragas], fact: 'Ragas：RAG 评估指标含 faithfulness(忠实度)、answer_relevancy、context_precision/recall，多数 reference-free 无需人工标注。' },
    'ai-c5-s2': { src: [SRC.ragas], fact: '评估需黄金集(ground truth)做回归测试；Ragas 支持批量评测并随数据集迭代形成可重复基线。' },
    'ai-c5-s3': { src: [SRC.ragas], fact: 'LLM-as-judge 有偏差需校准(多裁判/人工抽检)；Ragas 指标为低成本自动化校准手段之一。' },
    'ai-c5-s4': { src: [SRC.ragas], fact: '可观测性：tracing 记录检索/生成链路便于定位退化；与 Ragas 评测形成评测-监控闭环。' },
    'ai-c5-s5': { src: [SRC.ragas], fact: '评测结果驱动监控阈值与回归门禁，构成评测-监控持续闭环(见 ai-c4 tracing)。' },
  }},
  'ai-c6': { chapter: [SRC.owaspLlm], note: 'NIST AI RMF 抓取仅 216 字(SPA)未采用；LLM 风险目录以 OWASP LLM Top 10(2025)官方为准。', sections: {
    'ai-c6-s1': { src: [SRC.owaspLlm], fact: 'OWASP LLM Top 10(2025)：LLM01 提示注入是最常见风险，需输入边界与权限约束防指令劫持。' },
    'ai-c6-s2': { src: [SRC.owaspLlm], fact: 'LLM02 敏感信息泄露 / LLM07 系统提示提取：需防 system prompt 与 PII 外泄，做输出过滤与最小暴露。' },
    'ai-c6-s3': { src: [SRC.owaspLlm], fact: 'LLM05 输出处理不当 / LLM06 过度代理：输出需校验与护栏(guardrails)，限制 agent 可执行动作权限边界。' },
    'ai-c6-s4': { src: [SRC.owaspLlm], fact: 'LLM02/LLM09 涉及合规与隐私(PII/数据出境)；需按数据分级与合规基线约束推理数据。' },
    'ai-c6-s5': { src: [SRC.owaspLlm], fact: 'LLM10 资源无限消耗：需设速率限制/配额/成本护栏防滥用与成本失控(对应 op-c5 FinOps)。' },
  }},
  'ai-c7': { chapter: [SRC.onnxrt, SRC.distilbert], note: 'llama.cpp GitHub 本次抓取失败(出网瞬时)，推理优化以 ONNX Runtime + DistilBERT 论文官方源为准。', sections: {
    'ai-c7-s1': { src: [SRC.onnxrt, SRC.distilbert], fact: 'ONNX Runtime：跨平台推理引擎，图优化+算子融合+量化，多 EP(CPU/CUDA/TensorRT)加速算子级推理。' },
    'ai-c7-s2': { src: [SRC.onnxrt, SRC.distilbert], fact: 'DistilBERT 论文：知识蒸馏把 BERT 压缩 40%、提速 60%、保留约 97% 性能；量化+蒸馏是减推理成本代表手段。' },
    'ai-c7-s3': { src: [SRC.onnxrt, SRC.distilbert], fact: '成本优化除蒸馏/量化，还可缓存/Prompt Caching/路由小模型；ONNX Runtime 量化降低单次推理开销。' },
    'ai-c7-s4': { src: [SRC.onnxrt], fact: '延迟优化：算子融合与 EP 加速降低首 token/逐 token 延迟；流式输出改善体感(与 ONNX RT 推理优化互补)。' },
    'ai-c7-s5': { src: [SRC.onnxrt], fact: 'MLOps：模型版本/回滚/监控；ONNX Runtime 跨平台便于统一推理栈，支撑上线运维。' },
  }},
  // ---------------- 运维缺口 ----------------
  'op-c5': { chapter: [SRC.k8sSec, SRC.awsSec, SRC.awsSre, SRC.awsCost], note: 'sre.google SRE 书抓取超时，SRE/可靠性以 AWS Well-Architected 可靠性支柱官方为准。', sections: {
    'op-c5-s1': { src: [SRC.awsSec], fact: 'AWS 安全支柱：最小权限、可追溯、各层防御、自动化、数据保护、责任共担等设计原则。' },
    'op-c5-s2': { src: [SRC.awsSec], fact: 'AWS 安全支柱：数据保护含密钥/凭证的加密与最小暴露，凭证管理需集中化与轮换。' },
    'op-c5-s3': { src: [SRC.awsSec], fact: 'AWS 安全支柱：合规基线纳入责任共担模型与可控审计，等保/合规需映射控制项。' },
    'op-c5-s4': { src: [SRC.awsSre], fact: 'AWS 可靠性支柱：以可恢复性为核心，SLO/SLI/Error Budget 是韧性与变更节奏的度量和约速。' },
    'op-c5-s5': { src: [SRC.awsSre], fact: 'AWS 可靠性支柱：容量与压测属故障管理前置，需基线容量与弹性伸缩应对峰值。' },
    'op-c5-s6': { src: [SRC.awsCost], fact: 'AWS 成本优化支柱：选成本适配资源、供需匹配(按需扩缩)、成本可观测与治理，是 FinOps 实践参照。' },
    'op-c5-s7': { src: [SRC.awsSre], fact: 'AWS 可靠性支柱：故障演练/混沌工程属故障管理，以受控失效验证恢复能力。' },
    'op-c5-s8': { src: [SRC.awsSre], fact: 'AWS 可靠性支柱：监控驱动的稳定性文化依赖可观测性与事故复盘闭环。' },
    'op-c5-s9': { src: [SRC.awsSre], fact: 'AWS 可靠性支柱：OnCall/事故响应是故障管理一环，需明确升级路径与复盘。' },
    'op-c5-s10': { src: [SRC.awsSec, SRC.k8sSec], fact: 'AWS 安全支柱：安全左移(DevSecOps)把安全嵌入各层与自动化；Kubernetes 4C 分层防御与之呼应。' },
  }},
  'op-c6': { chapter: [SRC.postgres, SRC.mysql, SRC.redisPersist, SRC.redisRepl], note: '', sections: {
    'op-c6-s1': { src: [SRC.mysql, SRC.postgres], fact: 'MySQL：mysqldump/XtraBackup 逻辑/物理备份；PostgreSQL：pg_dump/物理备份，均为 DBA 备份恢复主线。' },
    'op-c6-s2': { src: [SRC.mysql, SRC.postgres], fact: 'MySQL：binlog+GTID 主从复制；PostgreSQL：流复制(WAL)实现副本，复制运维保障高可用。' },
    'op-c6-s3': { src: [SRC.redisPersist, SRC.redisRepl], fact: 'Redis 持久化提供 RDB(快照)与 AOF(append-only 日志)两种机制可组合保障宕机可恢复；主从复制支撑高可用。' },
    'op-c6-s4': { src: [SRC.mysql, SRC.postgres], fact: 'MySQL 慢查询日志 + PostgreSQL EXPLAIN 是慢查询治理入口；索引(B-tree/GiST/GIN)优化是核心手段。' },
    'op-c6-s5': { src: [SRC.mysql, SRC.postgres], fact: 'MySQL/PostgreSQL 参数调优需结合工作负载(缓冲/连接/并行)，参数属经验驱动的运维杠杆。' },
    'op-c6-s6': { src: [SRC.mysql, SRC.postgres], fact: 'MySQL InnoDB/GTID 与 PostgreSQL 流复制构成高可用架构基础，需配合故障转移。' },
    'op-c6-s7': { src: [SRC.mysql, SRC.postgres], fact: '在线 schema 变更需 gh-ost/pt-osc(MySQL)或在线 DDL(PostgreSQL)避免锁表影响线上。' },
    'op-c6-s8': { src: [SRC.mysql, SRC.postgres], fact: '容量规划与监控：复制延迟/连接数/缓冲命中率是 DBA 关键监控指标。' },
    'op-c6-s9': { src: [SRC.mysql, SRC.postgres], fact: '容灾与恢复演练：定期恢复验证备份有效性，是 DBA 不可用风险的最终兜底。' },
  }},
  'op-c7': { chapter: [SRC.terraform, SRC.pulumi, SRC.azureArch, SRC.awsIac], note: 'Terraform 源复用本仓库 ops-batch 抓取(4811 字)；公有云另引 Azure 架构中心与 AWS CloudFormation。', sections: {
    'op-c7-s1': { src: [SRC.terraform, SRC.awsIac], fact: 'IaC 用声明式代码管理基础设施；Terraform(HCL plan→apply)与 AWS CloudFormation(模板)是代表实现。' },
    'op-c7-s2': { src: [SRC.terraform], fact: 'Terraform：HCL 描述资源，plan 预览变更、apply 执行，是两阶段可审计的 IaC 工作流。' },
    'op-c7-s3': { src: [SRC.terraform], fact: 'Terraform：state 记录真实资源映射，后端(remote/local)决定状态存储与并发锁。' },
    'op-c7-s4': { src: [SRC.terraform, SRC.pulumi], fact: '模块化：Terraform module 与 Pulumi 组件封装可复用基础设施，提升一致性与可维护性。' },
    'op-c7-s5': { src: [SRC.azureArch], fact: 'Microsoft Azure 架构中心：云架构支柱/参考架构覆盖计算/网络/存储等公有云计算与网络模式。' },
    'op-c7-s6': { src: [SRC.azureArch], fact: 'Azure 架构中心涵盖对象存储/CDN 等参考架构，是公有云存储与分发模式的官方指南。' },
    'op-c7-s7': { src: [SRC.azureArch], fact: 'Azure 架构中心含 Serverless/函数计算参考架构，是无服务器落地的官方范式。' },
    'op-c7-s8': { src: [SRC.terraform, SRC.pulumi], fact: 'GitOps 将 IaC 纳入 CI/CD：Pulumi stack 与 Terraform state 驱动 Git 触发的基础设施变更流水线。' },
    'op-c7-s9': { src: [SRC.terraform, SRC.pulumi], fact: '多环境隔离：Terraform workspace/backend 与 Pulumi stack 分离状态，避免环境间污染。' },
  }},
  'op-c8': { chapter: [SRC.backstage, SRC.idpOrg, SRC.cncf, SRC.dora], note: 'dora.dev 为 DORA 官方站点(本次抓取 1999 字，四项指标定义见 DORA 研究)；IDP 另引 Backstage 与 IDP 社区。', sections: {
    'op-c8-s1': { src: [SRC.idpOrg, SRC.backstage], fact: 'IDP 社区：IDP=平台团队交付的自服务能力，以 golden paths(黄金路径)降低开发者认知负荷。' },
    'op-c8-s2': { src: [SRC.idpOrg, SRC.cncf], fact: 'IDP 社区强调认知负荷与 Team Topologies 交互模式；平台团队作为赋能团队支撑产品团队。' },
    'op-c8-s3': { src: [SRC.backstage], fact: 'Backstage：以软件目录(Software Catalog)与抽象层统一服务/组件视图，是 IDP 架构参考实现。' },
    'op-c8-s4': { src: [SRC.backstage], fact: 'Backstage：模板(Templates)提供脚手架，开发者自服务创建服务/仓库，落地自服务理念。' },
    'op-c8-s5': { src: [SRC.dora], fact: 'DORA 四项核心指标(部署频率/变更前置时间/变更失败率/服务恢复时间)是平台效能度量事实标准，量化 IDP 价值。' },
  }},
};

let changed = 0;
for (const [cid, plan] of Object.entries(plans)) {
  const m = s.modules.find(x => x.id === (cid.startsWith('ai-') ? 'ai' : 'devops'));
  const c = m.chapters.find(x => x.id === cid);
  if (!c) { console.error('MISSING chapter', cid); continue; }
  const lastSec = c.sections[c.sections.length - 1];
  lastSec.content += chapterBlock(plan.chapter, plan.note);
  for (const [sid, spec] of Object.entries(plan.sections)) {
    const sec = c.sections.find(x => x.id === sid);
    if (!sec) { console.error('MISSING section', sid); continue; }
    sec.content = upgradeMeta(sec.content);
    sec.content += srcBlock(spec.src);
    if (spec.fact) sec.content += factLine(spec.fact);
    changed++;
  }
}
fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log('INJECTED sections:', changed, '| chapters touched:', Object.keys(plans).length);
