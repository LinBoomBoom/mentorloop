/**
 * 在「高占比标签」桶里找被吞掉的异构内容（只读）。
 *
 * 场景：某赛道 90% 的题都打同一个标签，其中往往混着完全不属于该方向的题——
 * 它们不是「标签粒度粗」，而是**错标**，只是因为基数大而被占比掩盖。
 */
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })

// 桶 -> 不该出现在这里的异构特征。命中即说明该题落错桶。
const CASES = [
  ['op-sre', 'SRE', {
    'Redis/缓存': /Redis|缓存|RDB|AOF|持久化|击穿|雪崩|穿透/,
    '数据库': /MySQL|PostgreSQL|数据库|索引|事务|慢查询|主从/,
    '消息队列': /Kafka|RocketMQ|RabbitMQ|消息队列|消费组|堆积/,
    '网络': /TCP|HTTP|DNS|TLS|握手|负载均衡|Nginx|网络/
  }],
  ['op-devops', 'CI/CD', {
    'IaC/配置管理': /Terraform|\bHCL\b|IaC|基础设施即代码|Ansible|Puppet|Chef|provider|resource 块|state/,
    '微服务/架构': /微服务|服务拆分|服务治理|架构|领域|边界上下文|DDD/,
    'Kubernetes': /Kubernetes|\bK8s\b|\bPod\b|Deployment|容器编排|kubectl/,
    '监控': /监控|Prometheus|Grafana|告警|指标|可观测/,
    '容器': /Docker|容器|镜像|Dockerfile/
  }],
  ['fe-arch', '工程化', {
    '架构设计': /架构|Design Token|设计系统|模块联邦|Module Federation|微前端|分层|解耦|边界/,
    '框架原理': /React|Vue|响应式|虚拟 DOM|Diff|Hooks|渲染/,
    '浏览器/网络': /浏览器|HTTP|缓存策略|CDN|DNS|渲染流程|重排|重绘/,
    '测试': /测试|单测|E2E|端到端|覆盖率|Mock/
  }],
  ['op-k8s', 'Kubernetes', {
    'CI/CD': /CI\/CD|流水线|Jenkins|GitLab CI|构建|部署流水/,
    '监控': /监控|Prometheus|Grafana|告警|可观测/,
    'Linux/主机': /\bLinux\b|\bShell\b|系统调优|内核|文件描述符/,
    '云平台': /云主机|OSS|对象存储|云盘|可用区|地域/
  }],
  ['fe-mobile', 'CSS', {
    'JavaScript/DOM': /JavaScript|\bJS\b|\bDOM\b|事件|闭包|原型/,
    '框架': /React|Vue|组件|响应式原理/,
    '网络/性能': /HTTP|缓存|加载|性能|CDN|首屏/,
    '浏览器': /浏览器|兼容|前缀|渲染|重排|重绘/,
    '测试/工程化': /测试|构建|webpack|Vite|工程化/
  }],
  ['ai-algo', '模型与训练', {
    'CV': /图像|卷积|目标检测|分割|视觉|YOLO|CNN|OCR/,
    'NLP': /NLP|自然语言|BERT|分词|文本|语言模型|Transformer/,
    '推荐': /推荐|召回|CTR|协同过滤|双塔|精排/,
    '工程/训练框架': /PyTorch|TensorFlow|分布式训练|\bDDP\b|混合精度|显存|梯度累积/,
    '数据/特征': /特征工程|数据增强|样本|标注|归一化|标准化/,
    '评估/调优': /评估|指标|调参|超参|消融|过拟合|正则化/
  }],
  ['be-test', '综合应用', {
    '测试理论': /测试用例|等价类|边界值|判定表|覆盖率|测试金字塔|黑盒|白盒/,
    '自动化': /自动化|Selenium|Playwright|Cypress|Puppeteer|脚本/,
    '性能/压测': /压测|性能|JMeter|Locust|并发|吞吐|基准/,
    '接口/契约': /接口测试|契约|Mock|Pact|Postman|HTTP/,
    '流程/管理': /流程|用例管理|缺陷|Bug|评审|计划|质量门禁|CI/
  }]
]

for (const [track, tech, defs] of CASES) {
  const rows = db.prepare('select id, q from interview_questions where subtrack = ? and tech = ?').all(track, tech)
  const total = db.prepare('select count(*) c from interview_questions where subtrack = ?').get(track).c
  const tally = {}
  const sample = {}
  for (const r of rows) {
    const q = r.q || ''
    for (const [g, re] of Object.entries(defs)) {
      if (re.test(q)) { tally[g] = (tally[g] || 0) + 1; if (!sample[g]) sample[g] = q.slice(0, 58); break }
    }
  }
  const n = Object.values(tally).reduce((a, b) => a + b, 0)
  console.log(`\n===== ${track} / ${tech}：${rows.length} 题（赛道共 ${total}）=====`)
  console.log(`异构题合计 ${n} 道（${(n / rows.length * 100).toFixed(0)}% of 桶，${(n / total * 100).toFixed(0)}% of 赛道）`)
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(14)} ${String(v).padStart(4)}   ${sample[k]}`)
  }
}
