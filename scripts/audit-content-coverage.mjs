/**
 * 全库「声称覆盖 vs 实际内容」体检。
 *
 * 审计脚本 audit-taxonomy.mjs 的 A1–A9 只校验「分类自洽性」，
 * 不校验「内容真实性」：一个赛道可以在分类上完全合规（标签合法、占比均衡），
 * 但实际题目与它声称覆盖的技术毫无关系。
 *
 * 本脚本检查两类真实缺陷：
 *   D1 空壳标签：techNames 声明了某技术，题库里 0 道题
 *   D2 未生成课程：赛道下的课程小节从未跑过生成（内容缺口的直接原因）
 *   D3 标签-题面背离：打上某标签的题，题干里一次都没出现该技术关键词
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadTs (rel, expr) {
  // Windows 下绝对路径需转成相对说明符，否则 ESM 报 ERR_UNSUPPORTED_ESM_URL_SCHEME
  const code = `import('./${rel}').then(m => console.log(JSON.stringify(${expr})))`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '-e', code], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  }).trim().split('\n').pop())
}

const TAXONOMY = loadTs('app/data/learningTaxonomy.ts', 'm.LEARNING_TAXONOMY')
const VOCAB = loadTs('app/data/techVocabulary.ts', 'm.TECH_VOCABULARY')

// 每个受控术语的「题面必须出现」关键词；缺省用术语名本身
const PROBE = {
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
  // 探针只收「该技术的强特征词」，不收通用词。
  // 反例：Linux 探针若加「内存|负载」，「云主机 CPU 负载飙高」会被误判命中，
  // 但它其实是云平台题——标 Linux 是真错标，必须继续暴露出来。
  'Flutter': /Flutter|Dart|Widget/i,
  'React Native': /React Native|Native Bridge|\bBridge\b|Watchman|Metro|Hermes|FlatList|Expo/i,
  'iOS': /iOS|Swift|UIKit|SwiftUI|Xcode/i, 'Android': /Android|Kotlin|Jetpack|Activity|Fragment/i,
  'Electron': /Electron|主进程|渲染进程|IPC|BrowserWindow/i, 'Tauri': /Tauri|Rust/i,
  'uni-app': /uni-?app/i,
  'HarmonyOS': /鸿蒙|Harmony|ArkTS|ArkUI|Ability|@State|@Prop|@Link|方舟|Stage 模型/i,
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
  '监控': /监控|Prometheus|Grafana|告警|指标/i, '云原生': /云原生|Serverless|Service Mesh|Istio/i,
  '测试': /测试|单测|用例|覆盖率/i, '游戏': /游戏|帧同步|状态同步|物理引擎/i,
  '搜索': /搜索|召回|倒排|相关性|Query 理解/i, '大数据': /大数据|数仓|ETL|离线计算/i
}

const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })
const done = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, '.workbuddy/gen-interview-done.json'), 'utf8')))

const MODULE_OF = {}
for (const [mod, tracks] of Object.entries(TAXONOMY)) for (const t of tracks) MODULE_OF[t.id] = mod

const rows = []
for (const [mod, tracks] of Object.entries(TAXONOMY)) {
  for (const t of tracks) {
    const tid = t.id
    const techNames = t.techNames || []
    const dist = db.prepare('select tech, count(*) c from interview_questions where subtrack = ? group by tech').all(tid)
    const total = dist.reduce((a, b) => a + b.c, 0)
    const byTech = new Map(dist.map(r => [r.tech, r.c]))

    // D1 空壳标签
    const shells = techNames.filter(n => (byTech.get(n) || 0) === 0)

    // D2 未生成小节
    const secs = db.prepare(`select s.id from sections s join chapters c on c.id = s.chapter_id
      where c.subtrack in (${(t.chapterSubtracks || []).map(() => '?').join(',') || "''"})`).all(...(t.chapterSubtracks || []))
    const ungen = secs.filter(s => !done.has(s.id)).length

    // D3 标签-题面背离
    const drift = []
    for (const n of techNames) {
      const c = byTech.get(n) || 0
      if (c < 5) continue
      const re = PROBE[n]
      if (re === null || re === undefined) continue // null = 该标签无稳定题面特征，跳过
      const qs = db.prepare('select q, a from interview_questions where subtrack = ? and tech = ?').all(tid, n)
      const realHit = qs.filter(r => re.test((r.q || '') + ' ' + (r.a || ''))).length
      const rate = realHit / qs.length
      if (rate < 0.5) drift.push({ tech: n, n: qs.length, hit: realHit, rate })
    }

    rows.push({ mod, tid, name: t.name, total, techCount: techNames.length, shells, secTotal: secs.length, ungen, drift })
  }
}

const out = []
out.push('# 全库内容真实性体检\n')
out.push('> 与 audit-taxonomy.mjs（A1–A9，分类自洽性）互补：本表只查「声称 vs 实际」。\n')

out.push('\n## D1 · 空壳标签（techNames 声明了但题库 0 题）\n')
const d1 = rows.filter(r => r.shells.length)
if (!d1.length) out.push('无\n')
else {
  out.push('| 赛道 | 总题数 | 空壳标签 |')
  out.push('|---|---|---|')
  for (const r of d1.sort((a, b) => b.shells.length - a.shells.length)) {
    out.push(`| ${r.name} (\`${r.tid}\`) | ${r.total} | ${r.shells.join('、')} |`)
  }
}

out.push('\n## D2 · 未生成课程小节（内容缺口的直接原因）\n')
const d2 = rows.filter(r => r.ungen > 0)
if (!d2.length) out.push('无\n')
else {
  out.push('| 赛道 | 小节总数 | 未生成 | 完成率 |')
  out.push('|---|---|---|---|')
  for (const r of d2.sort((a, b) => b.ungen - a.ungen)) {
    out.push(`| ${r.name} (\`${r.tid}\`) | ${r.secTotal} | ${r.ungen} | ${((1 - r.ungen / r.secTotal) * 100).toFixed(0)}% |`)
  }
}

out.push('\n## D3 · 标签-题面背离（打该标签的题 ≥5 道，但题面命中该技术关键词 <50%）\n')
const d3 = rows.filter(r => r.drift.length)
if (!d3.length) out.push('无\n')
else {
  out.push('| 赛道 | 标签 | 题数 | 题面命中 | 命中率 |')
  out.push('|---|---|---|---|---|')
  for (const r of d3) for (const d of r.drift) {
    out.push(`| ${r.name} (\`${r.tid}\`) | ${d.tech} | ${d.n} | ${d.hit} | ${(d.rate * 100).toFixed(0)}% |`)
  }
}

const totalSec = rows.reduce((a, r) => a + r.secTotal, 0)
const totalUn = rows.reduce((a, r) => a + r.ungen, 0)
out.push(`\n## 汇总\n`)
out.push(`- 赛道数：${rows.length}`)
out.push(`- 题库总题数：${db.prepare('select count(*) c from interview_questions').get().c}`)
out.push(`- 课程小节：${totalSec}，已生成 ${totalSec - totalUn}，未生成 ${totalUn}（${((1 - totalUn / totalSec) * 100).toFixed(1)}%）`)
out.push(`- 存在空壳标签的赛道：${d1.length}`)
out.push(`- 存在标签背离的赛道：${d3.length}`)

const p = path.join(ROOT, 'docs/audit/content-coverage.md')
fs.writeFileSync(p, out.join('\n'))
console.log(out.join('\n'))
console.log('\n[written] ' + p)
void VOCAB
