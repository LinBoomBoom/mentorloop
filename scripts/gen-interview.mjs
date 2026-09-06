// 面试题库扩充脚本（内容推演 + 网络真实题佐证 + 变量条数）
// 思路：对课程「每一节」的真实教学内容，让 Deepseek 推演它在面试中可能被考察的所有角度与难点，
//       产出数量随主题深度浮动的面试题（3-8 条），并可选注入从网络抓取的真实面试题作为参考。
// 用法（仓库根目录运行，需先 export CODEBUDDY_SESSION_ID= 等绕过钩子）：
//   试运行前 3 节：          node scripts/gen-interview.mjs --dry --limit 3
//   指定方向：              node scripts/gen-interview.mjs --track frontend
//   注入网络真实题参考：     node scripts/gen-interview.mjs --web-ref .workbuddy/web-ref.json
//   全量（后台）：          node scripts/gen-interview.mjs --concurrency 5
//
// 容错：使用 ===Q=== 分隔的纯文本格式（非 JSON），彻底规避 Deepseek 偶发未转义引号导致解析失败。

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---- 解析 .env 取密钥 ----
function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[m[1]] = v
    }
  }
}
loadEnv()

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const MODEL = process.env.LLM_MODEL || 'deepseek-chat'
if (!DEEPSEEK_KEY) { console.error('缺少 DEEPSEEK_API_KEY'); process.exit(1) }

// ---- 参数 ----
const args = new Map()
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a.startsWith('--')) {
    const eq = a.indexOf('=')
    if (eq > 0) args.set(a.slice(2, eq), a.slice(eq + 1))
    else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) args.set(a.slice(2), process.argv[++i])
    else args.set(a.slice(2), 'true')
  }
}
const DRY = args.has('dry')
const TRACK = args.get('track') || null
const LIMIT = parseInt(args.get('limit') || '0', 10)
const CONCURRENCY = Math.min(parseInt(args.get('concurrency') || '5', 10), 10)
const WEB_REF_PATH = args.get('web-ref') || null

// ---- DB ----
const DB = path.join(ROOT, 'data', 'devmentor.db')
const db = new Database(DB, { readonly: false })
db.pragma('journal_mode = WAL')

// ---- 复刻 classifyTech（与 server/utils/db.ts 一致，保证 tech 归类统一）----
const TECH_MAP = {
  frontend: [
    { tech: 'JavaScript/TS', kw: ['javascript', 'js', 'ts', 'typescript', '闭包', '作用域', '原型', '原型链', '事件循环', 'event loop', '宏任务', '微任务', 'promise', 'async', 'await', 'this', '变量提升', '浅拷贝', '深拷贝', '防抖', '节流', '柯里化', 'es6', 'es2015', '数组', 'proxy', 'reflect', '类型', '继承', 'bind', 'call', 'apply', '事件委托', '手写'] },
    { tech: 'Vue', kw: ['vue', 'vue2', 'vue3', '组合式', 'composition', '响应式', 'defineproperty', 'pinia', 'vuex', 'vdom', 'setup', 'ref', 'reactive', 'nexttick', '虚拟dom'] },
    { tech: 'React', kw: ['react', 'hook', 'hooks', 'usestate', 'useeffect', 'diff', 'redux', 'fiber', 'jsx', '受控', '合成事件', 'reconciliation', 'scheduler'] },
    { tech: 'CSS/HTML', kw: ['css', 'html', 'flex', 'grid', '盒模型', 'bfc', '定位', '层叠', '选择器', '动画', 'transition', 'transform', 'rem', 'em', '响应式', '移动端适配', '像素', 'flexbox', '布局', '样式', '单位'] },
    { tech: '浏览器/渲染', kw: ['浏览器', '渲染', '重排', 'reflow', 'repaint', '输入url', '输入网址', 'url', 'dom', '事件', '冒泡', '捕获', 'storage', 'cookie', 'localstorage', 'sessionstorage', '同源', '事件模型', 'reflow'] },
    { tech: '网络/HTTP', kw: ['http', '缓存', 'cache', 'etag', '304', 'cdn', 'cors', '状态码', '强缓存', '协商缓存', '请求', '响应', 'header', 'keep-alive', 'websocket', 'https', 'tls', '握手'] },
    { tech: '性能优化', kw: ['性能优化', '首屏', '懒加载', 'lighthouse', '打包', 'webpack', 'vite', '骨架屏', 'tree shaking', '加载', '分包', 'code splitting', '压缩', 'gzip', '优化'] },
    { tech: '安全', kw: ['xss', 'csrf', '安全', '攻击', '注入', '防御', '加密', 'sql注入', '点击劫持', 'csp'] },
    { tech: '工程化/构建', kw: ['工程化', '构建', '模块化', 'npm', '包管理', 'monorepo', '微前端', '组件库', 'git', '脚手架', 'babel', 'eslint', '规范'] }
  ],
  backend: [
    { tech: 'Java/Spring', kw: ['java', 'jvm', 'spring', 'bean', 'springboot', '集合', 'hashmap', 'gc', '垃圾回收', '泛型', '反射', '注解', '循环依赖', 'aop', 'ioc', '并发集合', 'jdk'] },
    { tech: 'MySQL/数据库', kw: ['mysql', '数据库', '索引', 'b+树', 'innodb', 'mvcc', '事务', '隔离级别', 'sql', '聚簇', '回表', '分库', '分表', '慢查询', '范式', '锁', '死锁'] },
    { tech: 'Redis/缓存', kw: ['redis', '缓存', '穿透', '击穿', '雪崩', '布隆过滤器', '缓存一致性', '热点', '过期', 'zset', '持久化', '缓存'] },
    { tech: '并发/多线程', kw: ['线程', '线程池', '并发', '多线程', 'synchronized', 'volatile', 'cas', 'aqs', '原子类', 'forkjoin', 'parallel', '锁'] },
    { tech: '分布式/微服务', kw: ['分布式', '微服务', 'rpc', '注册中心', '服务发现', '网关', '限流', '熔断', '降级', 'cap', '一致性', 'seata', 'tcc', 'saga', '最终一致性', '幂等'] },
    { tech: '消息队列', kw: ['消息队列', 'mq', 'kafka', 'rabbitmq', 'rocketmq', '消息丢失', '重复消费', 'ack', '消费者', '生产者'] },
    { tech: '网络/TCP', kw: ['tcp', '三次握手', '四次挥手', 'time_wait', '网络', 'socket', 'udp', '滑动窗口', '拥塞', 'http'] },
    { tech: '系统设计', kw: ['系统设计', '架构', '高并发', '高可用', '设计', '短链', '秒杀', '灰度', '容灾', '扩展性', '限流', '弹性'] }
  ],
  devops: [
    { tech: 'Linux/排查', kw: ['linux', '负载', 'load average', 'top', '排查', 'cpu', '内存', '磁盘', 'io', '命令', '进程', '句柄', 'oom', '调优', '内核'] },
    { tech: '网络/TCP/HTTPS', kw: ['tcp', '三次握手', '四次挥手', 'https', 'tls', '握手', 'udp', 'socket', '网络', 'dns', 'iptables', '防火墙'] },
    { tech: 'Nginx/网关', kw: ['nginx', '反向代理', '负载均衡', 'upstream', '网关', 'location', '代理', 'rewrite'] },
    { tech: '容器/Docker', kw: ['docker', '容器', '虚拟机', 'namespace', 'cgroup', '镜像', 'dockerfile'] },
    { tech: 'Kubernetes', kw: ['k8s', 'kubernetes', 'pod', '调度', 'deployment', 'service', 'ingress', '集群', 'crd', 'operator'] },
    { tech: 'CI/CD/发布', kw: ['cicd', '流水线', '灰度', '蓝绿', '发布', '持续集成', '持续交付', 'jenkins', 'gitlab', '部署', '回滚'] },
    { tech: '监控/SRE', kw: ['sre', 'slo', 'sli', '错误预算', '监控', 'prometheus', 'grafana', '告警', '可观测', '日志', '链路追踪', 'metrics'] }
  ],
  ai: [
    { tech: '提示工程/Prompt', kw: ['提示工程', 'prompt', 'few-shot', 'cot', 'zero-shot', '指令', '上下文', '角色'] },
    { tech: 'RAG', kw: ['rag', '检索增强', '检索', '召回', '重排', 'rerank', 'chunking', '切分', '切片', '知识库'] },
    { tech: 'Embedding/向量', kw: ['embedding', '向量', '相似度', 'ann', '向量库', 'faiss', 'milvus', '余弦', '检索方案'] },
    { tech: '评估/Eval', kw: ['评估', 'evaluation', 'ragas', '指标', '评测', 'benchmark', '质量'] },
    { tech: 'Agent/工具调用', kw: ['agent', 'react', 'function calling', 'tool use', '工具调用', '智能体', '推理', '行动', 'mcp', '规划'] },
    { tech: '模型基础/训练', kw: ['模型', '训练', '微调', 'fine-tuning', '预训练', 'transformer', 'attention', '注意力', 'llm', '大模型', 'token', 'tokenizer', '参数', '涌现'] },
    { tech: '应用与部署', kw: ['部署', '推理', '推理优化', '量化', '蒸馏', '加速', '应用', '落地', '服务化', 'gpu', '显存'] }
  ]
}
const TRACK_CN = { frontend: '前端', backend: '后端', devops: '运维/DevOps', ai: 'AI 工程' }
const TRACK_SHORT = { frontend: 'f', backend: 'b', devops: 'o', ai: 'a' }

function classifyTech(track, q, keywordsJson) {
  const rules = TECH_MAP[track]
  if (!rules) return '综合'
  const text = ((q || '') + ' ' + (keywordsJson || '')).toLowerCase()
  let best = '综合', bestScore = 0
  for (const r of rules) {
    let score = 0
    for (const k of r.kw) if (text.includes(k.toLowerCase())) score++
    if (score > bestScore) { bestScore = score; best = r.tech }
  }
  return best
}

// ---- 防回归：Node.js 运行时专属题必须归 fe-node ----
// 生成期曾把前端题统一打 subtrack=fe-web，导致 require/fs/stream/child_process/worker_threads/
// process/uncaughtException/libuv/Node 事件循环阶段 等纯 Node 运行时题误落 fe-web / fe-arch。
// 守卫规则（高精度，避免误伤）：
//   1) 仅当题面命中【Node 专属内部机制】信号（libuv / process.nextTick / worker_threads /
//      child_process / fs 模块 / 模块解析 / Node 事件循环阶段…）才触发，不依赖泛化「node.js」字样，
//      以免把「事件循环 / CommonJS / 微任务 / Promise」等浏览器与 Node 共享的通用 JS 知识误派。
//   2) 命中后立即排除【平台语境】题：Electron / HarmonyOS / 部署(SPA history/nginx/fallback) /
//      错误监控(window.onerror/sourcemap) 等只是「顺带提及 Node.js」的题，仍归原赛道。
//   3) 仅对 frontend 生效——后端题提及 node.js 属正常技术对比，不应被改派。
const NODE_TRIG = ['libuv', 'process.nexttick', 'worker_threads', 'child_process', 'uncaughtexception', 'fs.readfile', 'fs.watch', 'fs模块', 'node.js中', 'nodejs中', 'node.js的模块', 'node.js流', 'node.js事件循环', 'require的模块解析', 'require.resolve', 'node.js原生', 'node.js服务端', 'node.js服务', 'node.js是单线程', 'node.js项目', 'node.js环境', 'node.js静态', 'node.js的esm', 'node.js的 esm', '流（stream）', 'node.js`eventemitter`']
const NODE_DENY = ['electron', 'harmonyos', '鸿蒙', '主进程', '渲染进程', 'preload', 'n-api', 'tauri', 'flutter', 'react native', 'uniapp', 'uni-app', '小程序', '微信', 'history 模式', 'nginx', 'fallback', 'window.onerror', 'sourcemap', '跨端', '原生插件']
function routeNodeRuntime(track, q, keywordsJson) {
  if (track !== 'frontend') return null
  // 归一化：题面里 "node.js 中" / "node.js 原生" 等空格写法统一成 "node.js中"，避免触发词漏匹配
  const text = ((q || '') + ' ' + (keywordsJson || '')).toLowerCase().replace(/node\.js\s*/g, 'node.js')
  if (!NODE_TRIG.some((k) => text.includes(k))) return null
  if (NODE_DENY.some((k) => text.includes(k))) return null
  return { subtrack: 'fe-node', subtrack_detail: ',nodefull,' }
}

// ---- 收集所有小节（带真实教学内容）----
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-content.json'), 'utf8'))
const secContentMap = new Map()
try {
  const rows = db.prepare('SELECT id, title, content FROM sections').all()
  for (const r of rows) secContentMap.set(r.id, { title: r.title, content: r.content || '' })
} catch (e) { console.warn('读取 sections 表失败（将仅用标题出题）：', e.message) }

const sections = []
for (const m of seed.modules || []) {
  const track = m.id
  if (TRACK && track !== TRACK) continue
  for (const ch of m.chapters || []) {
    for (const sec of ch.sections || []) {
      const dbSec = secContentMap.get(sec.id)
      sections.push({
        id: sec.id,
        track,
        chapterTitle: ch.title,
        chapterGoal: ch.goal || '',
        sectionTitle: sec.title,
        content: (dbSec?.content || '').slice(0, 1400)
      })
    }
  }
}
let todo = sections
if (LIMIT > 0) todo = todo.slice(0, LIMIT)
console.log(`待处理小节数：${todo.length}${DRY ? '（试运行，不写库/种子）' : ''}${TRACK ? ' track=' + TRACK : ''}`)

// ---- 断点续跑 ----
const PROGRESS = path.join(ROOT, '.workbuddy', 'gen-interview-done.json')
const doneSet = new Set(fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : [])
if (doneSet.size) console.log(`已完成小节（将跳过）：${doneSet.size}`)

// ---- id 分配：由小节 id 派生的确定性 id ----
// 历史教训：早先用「启动时读一次 DB 最大编号 + 内存自增」，多进程并发或中断重启会读到相同基数，
// 分配出重复 id；DB 侧 INSERT OR IGNORE 保留先到者、种子侧 push 保留另一条，导致同一 id
// 在两边指向不同题目（曾造成 1406 处错位）。改为 xq-{小节id}-{序号}：小节 id 全局唯一，
// 因此天然免疫并发冲突，且同一节重跑时 id 稳定，不会产生孤儿题。
const qid = (sectionId, i) => `xq-${sectionId}-${i}`

// ---- 内容查重：避免不同小节生成出字面相同的题 ----
const normQ = (s) => String(s || '').replace(/\s+/g, '').trim()
const seenQ = new Set()
for (const r of db.prepare('SELECT track,q FROM interview_questions').all()) seenQ.add(r.track + '||' + normQ(r.q))

// ---- 单实例锁：并发跑同一脚本会互相覆盖种子文件 ----
const LOCK = path.join(ROOT, '.workbuddy', 'gen-interview.lock')
if (!DRY) {
  if (fs.existsSync(LOCK)) {
    const pid = fs.readFileSync(LOCK, 'utf8').trim()
    let alive = false
    try { process.kill(Number(pid), 0); alive = true } catch { alive = false }
    if (alive) { console.error(`已有实例在运行（pid ${pid}）。并发运行会互相覆盖种子文件，已退出。`); process.exit(1) }
    console.warn(`发现残留锁（pid ${pid} 已退出），继续。`)
  }
  fs.writeFileSync(LOCK, String(process.pid))
  const clean = () => { try { fs.unlinkSync(LOCK) } catch { /* 已删除 */ } }
  process.on('exit', clean)
  process.on('SIGINT', () => { clean(); process.exit(130) })
  process.on('SIGTERM', () => { clean(); process.exit(143) })
}

// ---- 网络真实题参考 ----
let webRef = null
if (WEB_REF_PATH && fs.existsSync(WEB_REF_PATH)) {
  try { webRef = JSON.parse(fs.readFileSync(WEB_REF_PATH, 'utf8')) } catch (e) { console.warn('web-ref 解析失败', e.message) }
}
function webRefFor(tech, trackCN, sectionTitle) {
  if (!webRef) return ''
  const pick = []
  const byTech = webRef[tech] || []
  const byTrack = webRef['__track__' + trackCN] || []
  const byKw = (webRef.__keywords__ || []).filter((x) => sectionTitle.includes(x.k) || x.q.includes(sectionTitle)).map((x) => x.q)
  pick.push(...byTech.slice(0, 4), ...byTrack.slice(0, 3), ...byKw.slice(0, 3))
  const uniq = [...new Set(pick)].filter(Boolean)
  if (!uniq.length) return ''
  return '\n\n以下是网络上该主题的真实面试题，可作为出题参考（不必照抄，重在覆盖真实高频考点）：\n' + uniq.map((q) => '- ' + q).join('\n')
}

// ---- LLM ----
async function callLlm(messages, opts = {}) {
  const maxTokens = opts.maxTokens || 3000
  const timeoutMs = opts.timeoutMs || 60000
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.6, max_tokens: maxTokens, stream: false }),
    signal: AbortSignal.timeout(timeoutMs)
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`LLM ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const c = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!c) throw new Error('LLM 返回空')
  return c
}

function buildMessages(sec) {
  const sys = `你是一位资深技术面试官与讲师。你的任务是：针对给定的一小节课程内容，推演它在技术面试中可能被考察的所有角度与难点，生成数量可变、高质量、可直接用于面试备考的面试题。严格使用中文。`
  const web = webRefFor(classifyTech(sec.track, sec.sectionTitle, ''), TRACK_CN[sec.track], sec.sectionTitle)
  const user = `课程方向：${TRACK_CN[sec.track]}
所属章节：${sec.chapterTitle}${sec.chapterGoal ? `（章节目标：${sec.chapterGoal}）` : ''}
本节标题：${sec.sectionTitle}
本节教学内容（节选）：
${sec.content || sec.sectionTitle}

请基于以上内容，模拟一名资深面试官会从这一节出哪些面试题。要求：
1. 数量随主题深度浮动：重要/深入的主题出 5-8 道，普通主题出 3-4 道；不要固定数量，覆盖越全面越好。
2. 题型要多样，至少涵盖：概念理解题、原理/机制深挖题、常见坑/易错点题、对比辨析题、场景/编码实战题（按主题必要性取舍）。
3. 每道题给出结构化参考答案（markdown）：先一句话核心结论，再分点展开（含代码示例/命令/配置片段），补充「常见坑」，结尾「面试小结」。每答案 300-600 字，精炼不注水。
4. 关键词 3-6 个；难度标注 常规/较难/困难；技术子类从下列列表选最贴合的一个：
${TECH_MAP[sec.track].map(r => r.tech).join('、')}
5. 严格按以下格式输出，题与题之间用单独一行的 ===Q=== 分隔，不要输出任何额外说明文字：
===Q===
问：<问题>
答：<参考答案 markdown>
关键词：<k1, k2, k3>
难度：<常规|较难|困难>
技术：<从上述列表选一个>
===Q===${web}`
  return { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }
}

function parseDelimited(text) {
  const blocks = text.split(/===Q===/).map((s) => s.trim()).filter(Boolean)
  const out = []
  for (const b of blocks) {
    const qm = b.match(/问[：:]\s*([\s\S]*?)(?=\n\s*答[：:])/)
    const am = b.match(/答[：:]\s*([\s\S]*?)(?=\n\s*关键词[：:])/)
    const km = b.match(/关键词[：:]\s*([\s\S]*?)(?=\n\s*难度[：:])/)
    const dm = b.match(/难度[：:]\s*([\s\S]*?)(?=\n\s*技术[：:]|$)/)
    const tm = b.match(/技术[：:]\s*([\s\S]*?)(?=\n|$)/)
    if (!qm || !am) continue
    const q = qm[1].trim()
    const a = am[1].trim()
    const keywords = (km ? km[1].trim() : '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean).slice(0, 6)
    const difficultyRaw = (dm ? dm[1].trim() : '常规')
    const techRaw = tm ? tm[1].trim() : ''
    if (q && a) out.push({ q, a, keywords, difficultyRaw, techRaw })
  }
  return out
}

// ---- 入库 / 种子 ----
const insertStmt = db.prepare('INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords,difficulty,tech,weight,subtrack,subtrack_detail) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
function applyToSeed(track, item) {
  const obj = seed.interview[track]
  const arr = item.type === 'special' ? obj.special : obj.hot
  arr.push({ id: item.id, q: item.q, keywords: item.keywords, a: item.a, tech: item.tech, difficulty: item.difficulty, subtrack: item.subtrack ?? null, subtrack_detail: item.subtrack_detail ?? null })
}

let done = 0, skipped = 0, failed = 0, genTotal = 0
const failedIds = []

async function worker(queue) {
  for (const sec of queue) {
    try {
      if (doneSet.has(sec.id)) { skipped++; continue }
      const { messages } = buildMessages(sec)
      const raw = await callLlm(messages, { maxTokens: 3200 })
      const qs = parseDelimited(raw)
      if (!qs.length) throw new Error('未解析出任何题目（格式异常）')

      if (DRY) {
        console.log(`\n########## [${sec.track}/${sec.id}] ${sec.sectionTitle} -> ${qs.length} 题 ##########`)
        qs.slice(0, 2).forEach((x, i) => {
          console.log(`--题${i + 1} [${x.difficultyRaw}] ${x.q}`)
          console.log('   关键词:', x.keywords.join(', '))
          console.log('   答:', x.a.slice(0, 160) + '...')
        })
      } else {
        let written = 0, dup = 0
        qs.forEach((x, i) => {
          // 内容查重：同方向下题干去空白后相同即视为重复，跳过
          const key = sec.track + '||' + normQ(x.q)
          if (seenQ.has(key)) { dup++; return }
          seenQ.add(key)
          const id = qid(sec.id, i + 1)
          const isHard = x.difficultyRaw === '困难'
          const type = isHard ? 'special' : 'hot'
          // 三档难度：困难→hard/special，较难→medium/hot，常规→easy/hot（修复原 2 档塌缩）
          const difficulty = x.difficultyRaw === '困难' ? 'hard' : (x.difficultyRaw === '较难' ? 'medium' : 'easy')
          // 优先采用 LLM 直接归类的技术子类（更准），非法时回退关键词 classifyTech
          const validTechs = TECH_MAP[sec.track].map((r) => r.tech)
          const tech = validTechs.includes(x.techRaw) ? x.techRaw : classifyTech(sec.track, x.q, JSON.stringify(x.keywords))
          const weight = isHard ? 5 : 3
          // 防回归：显式点名 Node 运行时的前端题改派 fe-node（subtrack/subtrack_detail 双写 DB+seed）
          const rt = routeNodeRuntime(sec.track, x.q, JSON.stringify(x.keywords))
          const subtrack = rt ? rt.subtrack : null
          const subtrackDetail = rt ? rt.subtrack_detail : null
          insertStmt.run(id, sec.track, type, x.q, x.a, JSON.stringify(x.keywords), difficulty, tech, weight, subtrack, subtrackDetail)
          applyToSeed(sec.track, { id, q: x.q, a: x.a, keywords: x.keywords, type, tech, difficulty, subtrack, subtrack_detail: subtrackDetail })
          written++
        })
        // 每处理完一节即写回种子（保证断电/中断也不丢）
        fs.writeFileSync(path.join(ROOT, 'data', 'seed-content.json'), JSON.stringify(seed, null, 1))
        genTotal += written
        console.log(`✓ ${sec.track}/${sec.id} ${sec.sectionTitle} -> ${written} 题${dup ? `（跳过重复 ${dup}）` : ''}（累计新增 ${genTotal}）`)
      }
      doneSet.add(sec.id)
      fs.writeFileSync(PROGRESS, JSON.stringify([...doneSet]))
      done++
    } catch (e) {
      failed++; failedIds.push(sec.id)
      console.error(`✗ ${sec.track}/${sec.id} 失败: ${e.message}`)
    }
  }
}

const chunks = Array.from({ length: CONCURRENCY }, () => [])
todo.forEach((r, i) => chunks[i % CONCURRENCY].push(r))
await Promise.all(chunks.map(worker))

console.log(`\n=== 完成：处理小节=${done} 跳过=${skipped} 失败=${failed} 本批新增题目=${genTotal} ===`)
if (failedIds.length) console.log('失败小节 ids:', failedIds.join(', '))
db.close()
