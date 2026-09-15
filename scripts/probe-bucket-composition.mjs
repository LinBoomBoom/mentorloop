/**
 * 高占比标签的内容构成分析（只读）。
 *
 * A4 只报「某标签占了百分之多少」，不告诉你这百分之多少里到底装了什么。
 * 本脚本对一个「赛道 × 标签」桶按关键词做粗分组，回答：
 *   这个标签是「内容真的都属于同一方向」（→ 该加豁免），
 *   还是「多个方向被硬塞进一个桶」（→ 该细分词表 + 重打）。
 *
 * 用法：node scripts/_probe-tech.mjs <track> <tech> [groupDefName]
 */
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const db = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })

// 各「赛道/标签」桶的候选切分维度；key 用 `track|tech`
const GROUPS = {
  'op-k8s|Kubernetes': {
    '工作负载': /Deployment|StatefulSet|DaemonSet|Job|CronJob|Pod|ReplicaSet|控制器/,
    '网络': /Service|Ingress|NetworkPolicy|DNS|负载均衡|\bCNI\b|Service Mesh|Istio/,
    '存储': /PV\b|PVC|StorageClass|Volume|持久卷|CSI/,
    '调度与资源': /调度|Scheduler|亲和|污点|Taint|Toleration|资源限制|Limit|Request|QoS|\bHPA\b|驱逐/,
    '运维排障': /排障|故障|排查|诊断|日志|监控|crash|NotReady|Evicted|OOM/,
    '安全与权限': /RBAC|ServiceAccount|权限|认证|Secret|准入|Admission|PSA/,
    '集群与组件': /集群|etcd|kubelet|apiserver|控制面|组件|升级|备份|证书/
  },
  'op-sre|SRE': {
    '监控告警': /监控|告警|指标|Prometheus|Grafana|SLI|SLO|可观测|日志|追踪/,
    '故障与应急': /故障|应急|预案|演练|混沌|Chaos|复盘|postmortem|值守|值班|OnCall/,
    '容量与性能': /容量|性能|压测|瓶颈|扩容|水位|负载|QPS|吞吐|延迟/,
    '发布与变更': /发布|变更|灰度|回滚|上线|部署|CI\/CD|窗口期/,
    '自动化与自愈': /自动化|自愈|脚本|编排|Ansible|运维平台|工单|巡检/,
    '方法论与组织': /方法论|团队|流程|文化|成熟度|协作|SRE 团队|建设|转型/
  },
  'op-devops|CI/CD': {
    '流水线设计': /流水线|Pipeline|Jenkins|GitLab CI|GitHub Actions|构建|编译|打包|工件/,
    '发布策略': /发布|灰度|蓝绿|金丝雀|滚动|回滚|流量|开关|Feature Flag/,
    '质量门禁': /单元测试|测试|覆盖率|代码扫描|Sonar|门禁|卡点|质量|静态检查/,
    '制品与环境': /制品|镜像|仓库|Harbor|Nexus|环境|配置|Helm|Chart/,
    '平台与工具': /平台|工具链|自研|DevOps|基建|工具|PaaS/
  },
  'fe-arch|工程化': {
    '构建工具': /webpack|Vite|Rollup|esbuild|构建|打包|Babel|编译|Tree ?Shaking/,
    ' monorepo 与规范': /monorepo|pnpm|workspace|规范|Lint|ESLint|Prettier|Husky|提交|规范/,
    '架构设计': /架构|微前端|模块|分层|设计|解耦|组件|状态管理|路由/,
    '性能与优化': /性能|优化|首屏|加载|体积|缓存|CDN|拆包/,
    '工程流程': /流程|协作|迭代|发布|文档|规范|团队|CI|部署|测试/
  },
  'op-sec|安全': {
    '主机与系统': /主机|服务器|系统加固|基线|漏洞|补丁|账号|权限|SSH|Linux/,
    '网络安全': /网络|防火墙|WAF|入侵|DDOS|DDoS|流量|隔离|VPC|端口/,
    '应用安全': /应用|\bWeb\b|XSS|CSRF|注入|越权|认证|会话|依赖|SCA|供应链/,
    '数据安全': /数据|加密|脱敏|密钥|证书|备份|泄露|隐私|合规/,
    '安全运营': /运营|应急|响应|演练|审计|日志|监控|SOC|事件|溯源/
  }
}

const track = process.argv[2]
const tech = process.argv[3]
if (!track || !tech) {
  console.log('用法: node scripts/_probe-tech.mjs <track> <tech>')
  console.log('已配置的桶:', Object.keys(GROUPS).join(' | '))
  process.exit(0)
}
const def = GROUPS[`${track}|${tech}`]
if (!def) { console.log(`未配置 ${track}|${tech}。已配置：${Object.keys(GROUPS).join(' | ')}`); process.exit(1) }

const rows = db.prepare('select id, q from interview_questions where subtrack = ? and tech = ?').all(track, tech)
const tally = {}
const sample = {}
for (const r of rows) {
  const q = r.q || ''
  let hit = null
  for (const [g, re] of Object.entries(def)) { if (re.test(q)) { hit = g; break } }
  const k = hit || '未命中'
  tally[k] = (tally[k] || 0) + 1
  if (!sample[k]) sample[k] = q.slice(0, 62)
}
console.log(`===== ${track} / ${tech}（${rows.length} 题）=====`)
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(14)} ${String(v).padStart(4)}  ${(sample[k] || '').slice(0, 62)}`)
}
