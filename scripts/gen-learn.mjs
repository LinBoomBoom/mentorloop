// gen-learn.mjs —— 为「本站无体系化课程的细分赛道」批量生成学习章节
//
// 设计：
//  - 内容严格遵循现有 seed-content.json 的「心智模型」模板：
//      > 时效 | 核验=YYYY-MM-DD | 风险=低/高 | 来源=官方
//      ## 心智模型 / ## 核心知识点（锚定官方） / ## 为什么重要 / ## 常见坑 / ## 动手自测 / ## 面试视角
//  - 大纲(plan)由官方文档结构驱动（深度不套固定数量，由官方真实章节决定）。
//  - 正文(write)由 Deepseek 生成，锚定传入的官方 URL，引用真实出处。
//  - apply 把结果双写到 data/seed-content.json 与 data/devmentor.db（DB 已 seed 时 seedIfEmpty 不会重跑，必须显式插入）。
//
// 用法：
//  node scripts/gen-learn.mjs plan  <subtrackId> [--concurrency 3]
//  node scripts/gen-learn.mjs write <subtrackId> [--concurrency 5] [--limit N]
//  node scripts/gen-learn.mjs apply <subtrackId>
//  node scripts/gen-learn.mjs run   <subtrackId>   # plan + write 连续执行（write 可续跑）
//
// 续跑：write 用 .workbuddy/learn/<id>-done.json 记录已生成 section id，重跑只补缺失。

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { createRequire } from 'node:module'

const ROOT = process.cwd()
const ENV = loadEnv()
const API_KEY = ENV.DEEPSEEK_API_KEY
const BASE = (ENV.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const MODEL = ENV.LLM_MODEL || 'deepseek-chat'
// 北京日期（环境时钟为 UTC，需 +8h 避免核验日期差一天）
const TODAY = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)

// ---------------- 细分赛道注册表（按批次扩展） ----------------
// label：章节标题前缀，也作为路线图按名称查章节的关键词（必须出现在章节标题里）
// prefix：章节/小节 id 前缀（确保不与现有 fe-/be-/op-/ai- 冲突）
export const SUBTRACKS = {
  harmonyos:   { module: 'frontend', label: '鸿蒙', prefix: 'hm', note: 'HarmonyOS / ArkTS / ArkUI',
    urls: ['https://developer.harmonyos.com/', 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/', 'https://developer.huawei.com/consumer/cn/doc/atomic-guides-V5/'] },
  native:      { module: 'frontend', label: '原生', prefix: 'nat', note: 'iOS / Android 原生客户端',
    urls: ['https://developer.apple.com/documentation/', 'https://developer.android.com/guide'] },
  'cross-platform': { module: 'frontend', label: '跨端', prefix: 'xp', note: 'Flutter / React Native 跨端',
    urls: ['https://docs.flutter.dev/', 'https://reactnative.dev/docs/getting-started'] },
  miniprogram: { module: 'frontend', label: '小程序', prefix: 'mp', note: '微信小程序',
    urls: ['https://developers.weixin.qq.com/miniprogram/dev/framework/', 'https://developers.weixin.qq.com/miniprogram/dev/guide/'] },
  desktop:     { module: 'frontend', label: '桌面', prefix: 'dt', note: 'Electron / Tauri 桌面端',
    urls: ['https://www.electronjs.org/docs/latest', 'https://v2.tauri.app/'] },
  'viz-echarts': { module: 'frontend', label: 'ECharts', prefix: 'vze', subtrack: 'echarts', note: '数据图表 / 大屏可视化',
    urls: ['https://echarts.apache.org/'] },
  'viz-d3':      { module: 'frontend', label: 'D3', prefix: 'vzd', subtrack: 'd3', note: '数据驱动文档 / 自定义可视化',
    urls: ['https://d3js.org/'] },
  'viz-webgl':   { module: 'frontend', label: 'WebGL', prefix: 'vzw', subtrack: 'webgl', note: 'Canvas / WebGL 图形渲染',
    urls: ['https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API'] },
  // —— P5：fe-web 核心方向补章（章数由官方文档结构决定，不写死）——
  'web-html':  { module: 'frontend', label: 'Web', subtrack: 'web', prefix: 'ht', note: 'HTML 语义化/表单/多媒体/无障碍',
    urls: ['https://developer.mozilla.org/zh-CN/docs/Web/HTML', 'https://web.dev/learn/html'] },
  'css-core':  { module: 'frontend', label: 'CSS', subtrack: 'css', prefix: 'cs', note: 'CSS 布局/动画/架构/现代特性',
    urls: ['https://developer.mozilla.org/zh-CN/docs/Web/CSS', 'https://web.dev/learn/css'] },
  'react-core': { module: 'frontend', label: 'React', subtrack: 'react', prefix: 'rx', note: 'React 框架（官方 Learn + Reference）',
    urls: ['https://react.dev/learn', 'https://react.dev/reference/react'] },
  'vue-core':  { module: 'frontend', label: 'Vue', subtrack: 'vue', prefix: 'vu', note: 'Vue 3 框架（响应式/组件/Router/Pinia）',
    urls: ['https://vuejs.org/guide/introduction.html', 'https://router.vuejs.org/', 'https://pinia.vuejs.org/'] },
  'web-security': { module: 'frontend', label: '安全', subtrack: 'security', prefix: 'sc', note: 'Web 安全（XSS/CSRF/认证授权）',
    urls: ['https://owasp.org/www-community/attacks/', 'https://developer.mozilla.org/zh-CN/docs/Web/Security'] },
  'web-perf':  { module: 'frontend', label: '性能', subtrack: 'performance', prefix: 'pf', note: 'Web 性能（关键渲染路径/Web Vitals）',
    urls: ['https://web.dev/learn/performance', 'https://developer.mozilla.org/zh-CN/docs/Web/Performance'] },
  'fe-ts':      { module: 'frontend', label: 'TypeScript', prefix: 'fts', subtrack: 'typescript', note: '类型系统 / 泛型 / 高级类型 / 工程实践',
    urls: ['https://www.typescriptlang.org/docs/', 'https://www.typescriptlang.org/docs/handbook/intro.html'] },
  // —— Task 2：13 个空赛道补齐（章数由官方文档结构决定，不写死）——
  // 每条 subtrack 值需与 LEARNING_TAXONOMY 对应赛道的 chapterSubtracks 对齐，apply 后才会在学习中心可见。
  'fe-mobile':  { module: 'frontend', label: '移动端', prefix: 'mb', subtrack: 'mobile', note: '移动端 H5 / 响应式适配',
    urls: ['https://developer.mozilla.org/zh-CN/docs/Learn/CSS/CSS_layout/Responsive_Design', 'https://web.dev/learn/responsive-design'] },
  'fe-uniapp':  { module: 'frontend', label: 'uni-app', prefix: 'ua', subtrack: 'uniapp', note: 'uni-app 跨端框架（小程序/App/H5 一套代码）',
    urls: ['https://uniapp.dcloud.net.cn/', 'https://zh.uniapp.dcloud.net.cn/'] },
  'fe-node':    { module: 'frontend', label: 'Node 全栈', prefix: 'nd', subtrack: 'nodefull', note: 'Node.js 服务端 / BFF',
    urls: ['https://nodejs.org/docs/latest/api/', 'https://nodejs.org/en/learn'] },
  'be-data':    { module: 'backend', label: '离线数仓', prefix: 'bd', subtrack: 'offlinedw', note: 'Spark 批处理 + Hive 数仓建模 + BI 供数',
    urls: ['https://spark.apache.org/docs/latest/', 'https://hive.apache.org/'] },
  'be-game':    { module: 'backend', label: '游戏服务端', prefix: 'gm', subtrack: 'gameserver', note: '高并发长连接 / 实时同步',
    urls: ['https://colyseus.io/docs/', 'https://nodejs.org/en/learn'] },
  // 搜索中间件已拆为 Elasticsearch / Redis 两条独立学习路径（2026-09-04，迁移 v27），故注册项一分为二
  'be-es':      { module: 'backend', label: 'Elasticsearch', prefix: 'se', subtrack: 'es', note: '检索 / 倒排索引 / 聚合分析',
    urls: ['https://www.elastic.co/guide/index.html'] },
  'be-redis':   { module: 'backend', label: 'Redis', prefix: 'rc', subtrack: 'redis', note: '缓存 / 持久化 / 高可用',
    urls: ['https://redis.io/docs/latest/'] },
  'be-mq':      { module: 'backend', label: '消息队列', prefix: 'bmq', subtrack: 'mq', note: 'RabbitMQ / Kafka / NATS / Pulsar 消息模型与可靠性',
    urls: ['https://www.rabbitmq.com/docs', 'https://kafka.apache.org/documentation/', 'https://nats.io/documentation/'] },
  'be-test':    { module: 'backend', label: 'SDET', prefix: 'sd', subtrack: 'sdet', note: '自动化测试框架 / 测试平台',
    urls: ['https://playwright.dev/docs/intro', 'https://www.selenium.dev/documentation/'] },
  'op-k8s':     { module: 'devops', label: 'Kubernetes', prefix: 'k8', subtrack: 'k8s', note: '云原生 / K8s 容器平台',
    urls: ['https://kubernetes.io/docs/', 'https://kubernetes.io/docs/concepts/'] },
  'op-cloud':   { module: 'devops', label: '云平台', prefix: 'cl', subtrack: 'cloud', note: '公有云 / 私有云资源治理',
    urls: ['https://docs.aws.amazon.com/', 'https://learn.microsoft.com/'] },
  'op-sec':     { module: 'devops', label: '安全运维', prefix: 'os', subtrack: 'secops', note: '防护 / 检测 / 响应',
    urls: ['https://owasp.org/www-community/', 'https://www.cisa.gov/'] },
  // 算法赛道已拆为 CV / NLP / 推荐 三条独立学习路径（2026-09-04，迁移 v26），故注册项一分为三
  'ai-cv':      { module: 'ai', label: 'CV', prefix: 'alc', subtrack: 'cv', note: '计算机视觉：分类 / 检测 / 分割 / 生成',
    urls: ['https://pytorch.org/vision/stable/index.html', 'https://www.tensorflow.org/tutorials/images'] },
  'ai-nlp':     { module: 'ai', label: 'NLP', prefix: 'aln', subtrack: 'nlp', note: '自然语言处理：分类 / 标注 / 翻译 / 生成',
    urls: ['https://huggingface.co/docs/transformers/index', 'https://www.tensorflow.org/text'] },
  'ai-rec':     { module: 'ai', label: '推荐', prefix: 'alr', subtrack: 'rec', note: '推荐系统：召回 / 排序 / 重排',
    urls: ['https://scikit-learn.org/stable/documentation.html', 'https://pytorch.org/docs/stable/'] },
  'ai-data':    { module: 'ai', label: '训练数据', prefix: 'td', subtrack: 'traindata', note: '语料 / 标注 / 特征',
    urls: ['https://huggingface.co/docs/datasets', 'https://www.tensorflow.org/datasets'] },
  'ai-edge':    { module: 'ai', label: '端侧AI', prefix: 'ed', subtrack: 'edgeai', note: '手机 / 车机 / IoT 模型部署',
    urls: ['https://www.tensorflow.org/lite', 'https://developer.apple.com/machine-learning/'] },
  // —— 薄弱赛道补章：以下 5 个赛道原先仅 1-2 章（v2 遗留「第N章」老内容）——
  // 这些赛道的 chapterSubtracks 已含目标 subtrack，apply 后自动显现，无需再改 taxonomy。
  'be-db-mysql':   { module: 'backend', label: 'MySQL', prefix: 'dbm', subtrack: 'mysql', note: '关系型存储 / 索引 / 事务',
    urls: ['https://dev.mysql.com/doc/refman/8.0/en/'] },
  'be-db-pg':      { module: 'backend', label: 'PostgreSQL', prefix: 'dbp', subtrack: 'postgresql', note: '关系型存储 / 高级类型 / MVCC',
    urls: ['https://www.postgresql.org/docs/current/'] },
  'be-db-redis':   { module: 'backend', label: 'Redis', prefix: 'dbr', subtrack: 'dbredis', note: '缓存 / 持久化 / 高可用（库内独立前缀，避开 be-search 的 redis）',
    urls: ['https://redis.io/docs/latest/'] },
  'be-db-nosql':   { module: 'backend', label: 'NoSQL', prefix: 'dbn', subtrack: 'dbnosql', note: '文档 / 宽列 / 图数据库与最终一致性',
    urls: ['https://www.mongodb.com/docs/manual/', 'https://cassandra.apache.org/doc/latest/'] },
  'op-sre':     { module: 'devops', label: 'SRE', prefix: 'sre', subtrack: 'sre', note: 'SLI/SLO、可观测性与故障响应',
    urls: ['https://sre.google/books/', 'https://sre.google/workbook/', 'https://prometheus.io/docs/'] },
  'op-devops-docker': { module: 'devops', label: 'Docker', prefix: 'dop', subtrack: 'docker', note: '镜像构建 / 容器运行时 / 编排',
    urls: ['https://docs.docker.com/', 'https://docs.docker.com/build/building/'] },
  'op-devops-cicd':   { module: 'devops', label: 'CI/CD', prefix: 'doc', subtrack: 'cicd', note: '流水线 / 自动化构建部署',
    urls: ['https://docs.github.com/en/actions', 'https://docs.gitlab.com/ee/ci/'] },
  'ai-infra':   { module: 'ai', label: 'AI Infra', prefix: 'inf', subtrack: 'deploy', note: '推理引擎 / 显存与吞吐优化',
    urls: ['https://docs.vllm.ai/', 'https://onnxruntime.ai/docs/', 'https://docs.nvidia.com/deeplearning/tensorrt/'] },
  'ai-mlops':   { module: 'ai', label: 'MLOps · MLflow', prefix: 'mlp', subtrack: 'mlflow', note: '实验追踪 / 模型注册 / 项目流水线',
    urls: ['https://mlflow.org/docs/latest/'] },
  'ai-mlops-kubeflow': { module: 'ai', label: 'MLOps · Kubeflow', prefix: 'kfp', subtrack: 'kubeflow', note: 'Pipelines / 持续训练 / KFServing',
    urls: ['https://www.kubeflow.org/docs/'] },
  'ai-mlops-llmeval': { module: 'ai', label: 'MLOps · LLM 评估', prefix: 'lle', subtrack: 'llmeval', note: 'RAG 评估 / LLM-as-judge / tracing',
    urls: ['https://docs.ragas.io/', 'https://python.langchain.com/docs/guides/evaluation/'] },
  // —— Phase 0 · C1 知识树深度：backend/ops 薄赛道补章（前缀均不与既有章节 id 冲突）——
  // 原种子薄赛道（无既有 gen-learn 条目）：be-web/be-micro/op-trad。
  // 已部分回填、本次追加深度的赛道：be-data/op-sre/op-k8s/op-sec（用 *-2 前缀，apply 跳过重复 id 安全）。
  'be-web':     { module: 'backend', label: 'Java', prefix: 'bw', subtrack: 'java', note: 'Java 服务端 / JVM / Spring 生态',
    urls: ['https://docs.oracle.com/en/java/', 'https://spring.io/guides', 'https://docs.spring.io/spring-framework/docs/current/reference/html/'] },
  // be-web 多技术栈补齐：Go(Gin) / Python(FastAPI) 子主题（prefix 用 bwg/bwp 避开既有 go-/py- 章节 id）
  'be-web-go':  { module: 'backend', label: 'Go 后端', prefix: 'bwg', subtrack: 'go', note: 'Go 服务端 / Gin / 并发 / GORM',
    urls: ['https://go.dev/doc/', 'https://gin-gonic.com/docs/'] },
  'be-web-python': { module: 'backend', label: 'Python 后端', prefix: 'bwp', subtrack: 'python', note: 'Python 服务端 / FastAPI / 异步 / SQLAlchemy',
    urls: ['https://docs.python.org/3/', 'https://fastapi.tiangolo.com/'] },
  'be-micro':   { module: 'backend', label: '微服务', prefix: 'bm', subtrack: 'micro', note: '微服务 / 分布式架构 / 服务治理',
    urls: ['https://microservices.io/patterns/index.html', 'https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/'] },
  'be-data-2':  { module: 'backend', label: '实时流处理', prefix: 'bg', subtrack: 'realtime', note: 'Structured Streaming + Kafka + Flink 实时计算（深度补充）',
    urls: ['https://spark.apache.org/docs/latest/streaming/', 'https://kafka.apache.org/documentation/', 'https://nightlies.apache.org/flink/flink-docs-stable/'] },
  'op-trad':    { module: 'devops', label: 'Linux', prefix: 'ot', subtrack: 'linux', note: 'Linux 运维 / 网络基础',
    urls: ['https://man7.org/linux/man-pages/', 'https://www.rfc-editor.org/'] },
  'op-sre-2':   { module: 'devops', label: 'SRE', prefix: 'sre2', subtrack: 'sre', note: 'SRE / 可观测性（深度补充）',
    urls: ['https://sre.google/books/', 'https://prometheus.io/docs/'] },
  'op-k8s-2':   { module: 'devops', label: 'Kubernetes', prefix: 'k82', subtrack: 'k8s', note: 'K8s 云原生（深度补充）',
    urls: ['https://kubernetes.io/docs/', 'https://kubernetes.io/docs/concepts/'] },
  'op-sec-2':   { module: 'devops', label: '安全运维', prefix: 'os2', subtrack: 'secops', note: '安全运维（深度补充）',
    urls: ['https://owasp.org/www-community/', 'https://www.cisa.gov/'] },
  // —— Phase 1 Batch 1：AI 最热付费方向补章（agent/rag/prompt 此前无 gen-learn 条目，llmeval 复用 ai-mlops-llmeval）——
  // 官方权威源锚定；章数由官方文档结构驱动，不写死。
  'ai-agent':   { module: 'ai', label: 'AI Agent', prefix: 'agt', subtrack: 'agent', note: 'Agent 编排 / 工具调用 / 多智能体协作',
    urls: ['https://openai.github.io/openai-agents-python/', 'https://langchain-ai.github.io/langgraph/', 'https://docs.anthropic.com/en/docs/agents-and-tools/agent-sdks/overview'] },
  'ai-rag':     { module: 'ai', label: 'RAG', prefix: 'agr', subtrack: 'rag', note: '检索增强生成 / 向量检索 / 检索与生成协同',
    urls: ['https://python.langchain.com/docs/tutorials/rag/', 'https://docs.llamaindex.ai/en/stable/'] },
  'ai-prompt':  { module: 'ai', label: 'Prompt 工程', prefix: 'agp', subtrack: 'prompt', note: '提示工程 / 结构化输出 / 护栏与评测',
    urls: ['https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', 'https://platform.openai.com/docs/guides/prompt-engineering'] },
}

// ---------------- 基础设施 ----------------
function loadEnv() {
  const f = path.join(ROOT, '.env')
  if (!fs.existsSync(f)) return {}
  return fs.readFileSync(f, 'utf8').split('\n').reduce((a, l) => {
    const m = l.match(/^([^=]+)=(.*)$/); if (m) a[m[1].trim()] = m[2].trim(); return a
  }, {})
}
let costTotal = 0
async function chat(messages, opts = {}) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 1400,
      stream: false,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`LLM 失败 ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const u = data?.usage
  if (u) costTotal += (Number(u.completion_tokens) || 0) + (Number(u.prompt_tokens) || 0)
  return data?.choices?.[0]?.message?.content?.trim() || ''
}
const require = createRequire(import.meta.url)
let _jsonrepair = null
try { _jsonrepair = require('jsonrepair') } catch { /* 可选依赖：缺失时回退到正则修复 */ }

function extractJson(text) {
  const s = text.indexOf('{'); const e = text.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('无法从 LLM 输出提取 JSON')
  let raw = text.slice(s, e + 1)
  try { return JSON.parse(raw) } catch { /* 进入修复流程 */ }
  // 优先用 jsonrepair 做结构化修复（缺失逗号 / 截断 / 尾随逗号等 LLM 常见畸形）
  if (_jsonrepair) {
    try {
      const repairFn = _jsonrepair.default || _jsonrepair
      return JSON.parse(repairFn(raw))
    } catch { /* 回退到正则修复 */ }
  }
  // 常见 LLM 非法 JSON 的就地修复（按优先级累积尝试）
  const repairs = [
    (x) => x.replace(/,\s*([}\]])/g, '$1'),     // 尾随逗号
    (x) => x.replace(/"\s*"/g, '","'),          // 相邻字符串缺逗号
    (x) => x.replace(/\}\s*\{/g, '},{'),        // 相邻对象缺逗号
    (x) => x.replace(/\]\s*\[/g, '],['),        // 相邻数组缺逗号
    (x) => x.replace(/\}\s*"/g, '},"'),         // } 后字符串缺逗号
    (x) => x.replace(/\]\s*"/g, '],"'),         // ] 后字符串缺逗号
    (x) => x.replace(/"\s*\{/g, '",{'),         // 字符串后对象缺逗号
    (x) => x.replace(/"\s*\[/g, '",['),         // 字符串后数组缺逗号
  ]
  let cur = raw
  for (const step of repairs) {
    try { return JSON.parse(cur) } catch { /* 继续下一步 */ }
    cur = step(cur)
  }
  return JSON.parse(cur) // 仍失败则抛原错误，交由上层 LLM 重试
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  })
  await Promise.all(workers)
  return out
}

// ---------------- 大纲生成（plan） ----------------
const PLAN_SYSTEM = `你是一位资深技术教育课程设计师。你会根据一个技术领域的官方学习路径，设计一套结构化的中文学习大纲。
要求：
1. 大纲必须"镜像"该技术的官方文档/学习路径的章节组织（从基础到进阶），不要随意编造顺序，也不要为了凑数而合并或拆分官方章节。
2. 章节数完全由官方内容体量决定：官网有多少章就列多少章（不预设数量、不设上下限）；每章 3~6 个小节。
3. 每个小节给出：title（小节标题）、direction（用"能……"开头的掌握目标，一句话）、outline（2~4 个要点，说明这节要讲什么、锚定哪些官方主题）。
只输出 JSON，不要任何解释。`

function planUser(st) {
  return `技术领域：${st.note}
官方文档参考（请据此镜像章节结构）：
${st.urls.map((u, i) => `${i + 1}. ${u}`).join('\n')}

请输出该领域的完整学习大纲，严格按如下 JSON 结构：
{
  "chapters": [
    { "title": "章节标题", "goal": "本章掌握目标（一句话）",
      "sections": [
        { "title": "小节标题", "direction": "能……（掌握目标）", "outline": ["要点1","要点2","要点3"] }
      ]
    }
  ]
}`
}

// ---------------- 正文生成（write） ----------------
const WRITE_SYSTEM = `你是一位擅长"心智模型"式技术写作的资深作者。你把枯燥的官方文档，改写成让人真正理解、记得住的中文教程。
写作铁律（必须严格遵守）：
1. 开篇用「心智模型」：用一个生活化类比/比喻，解释这个知识的本质（例如"把 X 想成 Y"）。
2. 「核心知识点（锚定官方）」用要点列表，每条都要落到一个可验证的官方事实/API/概念；技术名词首次出现给英文。
3. 必须引用真实官方文档链接（Markdown 格式 [文字](url)，url 取自给定的官方参考），放在相关位置或段末。
4. 「为什么重要 / 何时会用到」说明实战场景与踩坑代价。
5. 「常见坑」列 2~4 个真实易错点。
6. 若适合，给出「动手自测」（带代码片段，语言贴合该技术）。
7. 「面试视角」列 2~3 个高频考点（以问句或短句）。
语言：简体中文。不要堆砌，要"讲人话"。`

function writeUser(st, ch, sec) {
  return `技术：${st.note}（官方参考：${st.urls.join('、')}）
所属章节：${ch.title}（目标：${ch.goal}）
当前小节：${sec.title}
本节要点（请覆盖）：
${sec.outline.map((o, i) => `${i + 1}. ${o}`).join('\n')}

请按下面的固定模板输出本节完整内容（Markdown），第一行必须是时效头：

> 时效 | 核验=${TODAY} | 风险=低 | 来源=官方

## 心智模型
（生活化类比，讲清本质）

## 核心知识点（锚定官方）
- （要点，技术名词给英文，引用官方链接 [文字](url)）

## 为什么重要 / 何时会用到
（实战场景）

## 常见坑
- （易错点）

## 动手自测
（代码片段，语言贴合该技术；若纯概念可省略此节）

## 面试视角
- （高频考点）

注意：官方链接必须是真实存在的官方地址（可用上面给的官方参考域名下的具体路径），不要编造不存在的页面。`
}

// ---------------- 主流程 ----------------
const WORK = path.join(ROOT, '.workbuddy/learn')
fs.mkdirSync(WORK, { recursive: true })

function draftPath(id) { return path.join(WORK, `${id}.json`) }
function donePath(id) { return path.join(WORK, `${id}-done.json`) }

function getSubtrack(id) {
  const st = SUBTRACKS[id]
  if (!st) { console.error('未知 subtrack:', id, '可选:', Object.keys(SUBTRACKS).join(', ')); process.exit(1) }
  return st
}

async function doPlan(id) {
  const st = getSubtrack(id)
  console.log(`[plan] ${id} (${st.note}) …`)
  let messages = [{ role: 'system', content: PLAN_SYSTEM }, { role: 'user', content: planUser(st) }]
  let txt = await chat(messages, { temperature: 0.4, maxTokens: 8000 })
  let plan
  try {
    plan = extractJson(txt)
  } catch (e) {
    // LLM 偶发输出非法 JSON：追加纠正提示再试一次，避免整方向失败
    console.warn(`  [plan] 首次 JSON 解析失败，追加纠正提示重试：${e.message}`)
    messages = [...messages, { role: 'assistant', content: txt }, { role: 'user', content: '你刚才的输出不是合法 JSON，请只输出一个合法 JSON 对象，数组元素之间必须用英文逗号分隔，不要有任何解释文字。' }]
    txt = await chat(messages, { temperature: 0.2, maxTokens: 3000 })
    plan = extractJson(txt)
  }
  if (!plan.chapters || !plan.chapters.length) throw new Error('plan 未返回 chapters')
  fs.writeFileSync(draftPath(id), JSON.stringify(plan, null, 2))
  console.log(`[plan] 完成：${plan.chapters.length} 章 / ${plan.chapters.reduce((n, c) => n + (c.sections?.length || 0), 0)} 节 → ${draftPath(id)}`)
  // 打印大纲摘要便于抽查
  plan.chapters.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.title}  [${c.sections?.length || 0}节]`)
    ;(c.sections || []).forEach(s => console.log(`      - ${s.title}`))
  })
}

async function doWrite(id, concurrency, limit) {
  const st = getSubtrack(id)
  const plan = JSON.parse(fs.readFileSync(draftPath(id), 'utf8'))
  const doneFile = donePath(id)
  const done = fs.existsSync(doneFile) ? JSON.parse(fs.readFileSync(doneFile, 'utf8')) : {}
  // 展开所有 section 任务
  const tasks = []
  plan.chapters.forEach((c, ci) => (c.sections || []).forEach((s, si) => {
    const sid = `${st.prefix}-c${ci + 1}-s${si + 1}`
    tasks.push({ sid, ci, si, c, s })
  }))
  if (limit) tasks.length = Math.min(tasks.length, limit)
  const pending = tasks.filter(t => !done[t.sid])
  console.log(`[write] ${id}：共 ${tasks.length} 节，已生成 ${tasks.length - pending.length}，待生成 ${pending.length}`)
  let ok = 0, fail = 0
  await pool(pending, concurrency, async (t) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const content = await chat([{ role: 'system', content: WRITE_SYSTEM }, { role: 'user', content: writeUser(st, t.c, t.s) }], { temperature: 0.6, maxTokens: 1500 })
        // 规范化：确保以时效头开头
        let body = content
        if (!body.startsWith('> 时效')) body = `> 时效 | 核验=${TODAY} | 风险=低 | 来源=官方\n\n` + body
        done[t.sid] = { content: body, direction: t.s.direction || t.s.direction }
        ok++
        return
      } catch (e) {
        if (attempt === 3) { console.error(`  ✗ ${t.sid}: ${e.message}`); fail++; }
        else await sleep(800 * attempt)
      }
    }
  })
  // 合并回 plan 的 sections
  const full = JSON.parse(JSON.stringify(plan))
  full.chapters.forEach((c, ci) => (c.sections || []).forEach((s, si) => {
    const sid = `${st.prefix}-c${ci + 1}-s${si + 1}`
    if (done[sid]) { s.id = sid; s.content = done[sid].content; s.direction = done[sid].direction || s.direction }
  }))
  fs.writeFileSync(draftPath(id), JSON.stringify(full, null, 2))
  fs.writeFileSync(doneFile, JSON.stringify(done, null, 2))
  console.log(`[write] 完成：成功 ${ok}，失败 ${fail}。草稿 → ${draftPath(id)}`)
}

function doApply(id) {
  const st = getSubtrack(id)
  const full = JSON.parse(fs.readFileSync(draftPath(id), 'utf8'))
  // 组装章节对象（标题加赛道前缀）；统一核验日期为北京今天
  const normDate = (c) => (c || '').replace(/核验=\d{4}-\d{2}-\d{2}/g, `核验=${TODAY}`)
  const chapters = full.chapters.map((c, ci) => ({
    id: `${st.prefix}-c${ci + 1}`,
    title: `${st.label} · ${c.title}`,
    goal: c.goal,
    subtrack: st.subtrack || st.prefix,
    sections: (c.sections || []).map((s, si) => ({
      id: s.id || `${st.prefix}-c${ci + 1}-s${si + 1}`,
      title: s.title,
      direction: s.direction || '',
      content: normDate(s.content),
    })),
  }))

  // 1) 双写 seed-content.json
  const seedFile = path.join(ROOT, 'data/seed-content.json')
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
  const mod = seed.modules.find(m => m.id === st.module)
  if (!mod) throw new Error('seed 中找不到模块 ' + st.module)
  const existingIds = new Set(mod.chapters.map(c => c.id))
  let dup = 0
  for (const ch of chapters) {
    if (existingIds.has(ch.id)) { dup++; continue }
    mod.chapters.push(ch)
  }
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2))
  console.log(`[apply] seed-content.json：写入 ${chapters.length - dup} 章（跳过重复 ${dup}）`)

  // 2) 双写 data/devmentor.db（已 seed，需显式 INSERT）
  const dbFile = path.join(ROOT, 'data/devmentor.db')
  const db = new Database(dbFile)
  const maxPos = db.prepare('SELECT COALESCE(MAX(position),-1) AS p FROM chapters WHERE module_id=?').get(st.module).p
  const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)')
  const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  const tx = db.transaction(() => {
    let pos = maxPos + 1
    for (const ch of chapters) {
      insCh.run(ch.id, st.module, ch.title, ch.goal, pos++, ch.subtrack)
      ch.sections.forEach((s, si) => insSec.run(s.id, ch.id, s.title, s.direction, s.content, si))
    }
  })
  tx()
  const cnt = db.prepare('SELECT COUNT(*) c FROM chapters WHERE module_id=? AND id LIKE ?').get(st.module, st.prefix + '-%').c
  console.log(`[apply] devmentor.db：写入章节计数(prefix=${st.prefix}) = ${cnt}`)
  db.close()
  console.log(`[apply] ${id} 完成。累计 token ≈ ${costTotal}`)
}

// ---------------- CLI ----------------
const [cmd, id, ...rest] = process.argv.slice(2)
function getOpt(name) {
  const i = rest.findIndex(a => a === name || a.startsWith(name + '='))
  if (i < 0) return null
  const a = rest[i]
  if (a.includes('=')) return a.split('=')[1]
  if (rest[i + 1] && !rest[i + 1].startsWith('--')) return rest[i + 1]
  return null
}
const concurrency = Number(getOpt('--concurrency')) || 5
const limit = Number(getOpt('--limit')) || 0
if (!cmd || !id) { console.error('用法: gen-learn.mjs <plan|write|apply|run> <subtrackId> [--concurrency N] [--limit N]'); process.exit(1) }

;(async () => {
  if (cmd === 'plan') await doPlan(id)
  else if (cmd === 'write') await doWrite(id, concurrency, limit)
  else if (cmd === 'apply') doApply(id)
  else if (cmd === 'run') { await doPlan(id); await doWrite(id, concurrency, limit) }
  else { console.error('未知命令', cmd); process.exit(1) }
  console.log(`=== 累计消耗 token ≈ ${costTotal} ===`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
