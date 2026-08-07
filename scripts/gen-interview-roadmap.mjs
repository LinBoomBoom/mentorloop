// 面试题库扩充（按技能路线图）—— 数据源从「课程小节」改为「路线图技能点」
// 思路：对路线图每个「缺口技能点」（覆盖度 <= 阈值），让 Deepseek 全面、周到地推演该技能在面试中
//       可能被考察的所有角度与题型，题量随技能深度/重要度浮动（不卡死固定数）。
// 用法（仓库根目录运行）：
//   试点 2 个技能(dry 不写库)：  node scripts/gen-interview-roadmap.mjs --dry --limit 2
//   仅某赛道(如鸿蒙)：          node scripts/gen-interview-roadmap.mjs --only-sub 鸿蒙
//   全量（后台）：              node scripts/gen-interview-roadmap.mjs --concurrency 6
//
// 容错：沿用 gen-interview.mjs 的 ===Q=== 纯文本分隔，彻底规避 Deepseek 偶发未转义引号导致解析失败。
// 安全：DB 立即落库（断点续跑）+ 种子分批刷新 + 结束对账（DB→seed 补齐 rq- 前缀题），重 seed 不丢题。

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---- 解析 .env 取密钥 ----
function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^\n]*)\s*$/)
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
const ONLY_SUB = args.get('only-sub') || null
const LIMIT = parseInt(args.get('limit') || '0', 10)
const MIN_COV = parseInt(args.get('min-cov') || '2', 10) // 目标：覆盖度 <= 该值的技能点
const CONCURRENCY = Math.min(parseInt(args.get('concurrency') || '6', 10), 10)

// ---- DB ----
const DB = path.join(ROOT, 'data', 'devmentor.db')
const db = new Database(DB, { readonly: false })
db.pragma('journal_mode = WAL')

// ---- 复刻 classifyTech（与 server/utils/db.ts 一致）----
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
const LEVEL_CN = { junior: '初级', mid: '中级', senior: '高级' }

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

// ---- 加载路线图（esbuild 打包 TS 数据模块）----
async function loadRoadmap() {
  const r = await build({
    entryPoints: [path.join(ROOT, 'app/data/skillRoadmap.ts')],
    bundle: true, format: 'esm', write: false, platform: 'node'
  })
  const code = r.outputFiles[0].text
  const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
  return mod.roadmap
}

// ---- 加载覆盖度（.workbuddy/roadmap_skills.json，由 analyze_coverage.mjs 产出）----
function loadCoverage() {
  const p = path.join(ROOT, '.workbuddy', 'roadmap_skills.json')
  if (!fs.existsSync(p)) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null }
}

// 技能唯一键：方向 + 赛道名 + 等级 + 技能名
const skillKey = (track, sub, lv, name) => `${track}|${sub}|${lv}|${name}`

async function main() {
  const roadmap = await loadRoadmap()
  const covRows = loadCoverage()
  const covMap = new Map()
  if (covRows) for (const r of covRows) covMap.set(skillKey(r.track, r.sub, r.lv, r.name), r.cov)

  // 扁平化技能点
  const flat = []
  for (const d of roadmap) {
    for (const st of d.subTracks) {
      for (const lv of st.levels) {
        lv.skills.forEach((s, idx) => {
          flat.push({
            track: d.id, dirName: d.name, subtrackId: st.id, subName: st.name,
            lv: lv.level, skillIdx: idx, name: s.name, desc: s.desc || '', must: !!s.must
          })
        })
      }
    }
  }

  // 目标门控：覆盖度 <= MIN_COV
  let todo = flat.filter(f => {
    const cov = covMap.has(skillKey(f.track, f.subName, f.lv, f.name)) ? covMap.get(skillKey(f.track, f.subName, f.lv, f.name)) : 99
    return cov <= MIN_COV
  })
  if (ONLY_SUB) todo = todo.filter(f => f.subName.includes(ONLY_SUB))
  if (LIMIT > 0) todo = todo.slice(0, LIMIT)
  console.log(`待生成技能点：${todo.length}${DRY ? '（试运行，不写库/种子）' : ''}${ONLY_SUB ? ' only-sub=' + ONLY_SUB : ''} min-cov=${MIN_COV}`)

  // 断点续跑
  const PROGRESS = path.join(ROOT, '.workbuddy', 'gen-interview-roadmap-done.json')
  const doneSet = new Set(fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : [])
  if (doneSet.size) console.log(`已完成（将跳过）：${doneSet.size}`)

  // id：rq-{方向}-{赛道id}-{层级}-{层内技能序号}-{题序号}
  // 注意：skillIdx 是「层内」序号（初/中/高各从 0 起），必须带 lv 才能全局唯一，否则跨层撞 id
  const qid = (track, subtrackId, lv, skillIdx, i) => `rq-${TRACK_SHORT[track]}-${subtrackId}-${lv}-${skillIdx}-${i}`

  // 内容查重
  const normQ = (s) => String(s || '').replace(/\s+/g, '').trim()
  const seenQ = new Set()
  for (const r of db.prepare('SELECT track,q FROM interview_questions').all()) seenQ.add(r.track + '||' + normQ(r.q))

  // 单实例锁
  const LOCK = path.join(ROOT, '.workbuddy', 'gen-interview-roadmap.lock')
  if (!DRY) {
    if (fs.existsSync(LOCK)) {
      const pid = fs.readFileSync(LOCK, 'utf8').trim(); let alive = false
      try { process.kill(Number(pid), 0); alive = true } catch { alive = false }
      if (alive) { console.error(`已有实例在运行（pid ${pid}）。退出。`); process.exit(1) }
    }
    fs.writeFileSync(LOCK, String(process.pid))
    const clean = () => { try { fs.unlinkSync(LOCK) } catch {} }
    process.on('exit', clean); process.on('SIGINT', () => { clean(); process.exit(130) }); process.on('SIGTERM', () => { clean(); process.exit(143) })
  }

  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-content.json'), 'utf8'))
  // 技能树归属：subtrack=赛道id（st.id），skill=技能点名（f.name）。供 /interview 按技能树浏览精确挂载。
  const insertStmt = db.prepare('INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords,difficulty,tech,weight,subtrack,skill) VALUES (?,?,?,?,?,?,?,?,?,?,?)')

  // 路线图→题目映射（用于前端联动）
  const qaMap = new Map()
  // 必须含 lv：skillIdx 是层内序号，不带 lv 会让不同层的同序技能撞 key（断点续跑误跳过 + 映射合并）
  const mapKey = (f) => `${f.track}/${f.subtrackId}/${f.lv}/${f.skillIdx}`
  function recordMap(f, qidVal) {
    const k = mapKey(f); if (!qaMap.has(k)) qaMap.set(k, { dir: f.dirName, sub: f.subName, lv: f.lv, name: f.name, must: f.must, qids: [] })
    qaMap.get(k).qids.push(qidVal)
  }

  function applyToSeed(track, item) {
    const obj = seed.interview[track]
    const arr = item.type === 'special' ? obj.special : obj.hot
    // 写入技能树归属：item.subtrack=赛道id、item.skill=技能点名，由 worker 注入
    arr.push({ id: item.id, q: item.q, keywords: item.keywords, a: item.a, tech: item.tech, difficulty: item.difficulty, subtrack: item.subtrack || null, skill: item.skill || null })
  }

  let done = 0, skipped = 0, failed = 0, genTotal = 0, flushCount = 0
  const failedSkills = []
  let seedDirty = false

  async function callLlm(messages, maxTokens) {
    let lastErr
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
          body: JSON.stringify({ model: MODEL, messages, temperature: 0.6, max_tokens: maxTokens, stream: false }),
          signal: AbortSignal.timeout(90000)
        })
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          // 限流/临时错误退避重试；余额不足(402)等致命错误直接抛
          if (res.status === 429 || res.status >= 500) {
            lastErr = new Error(`LLM ${res.status}: ${txt.slice(0, 120)}`)
            const wait = 3000 * (attempt + 1)
            console.warn(`  ⚠ 限流/临时错误(${res.status})，${wait}ms 后重试(第${attempt + 1}次)`)
            await new Promise(r => setTimeout(r, wait))
            continue
          }
          throw new Error(`LLM ${res.status}: ${txt.slice(0, 200)}`)
        }
        const data = await res.json()
        const c = data?.choices?.[0]?.message?.content?.trim() || ''
        if (!c) throw new Error('LLM 返回空')
        return c
      } catch (e) {
        lastErr = e
        if (attempt < 3) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue }
      }
    }
    throw lastErr || new Error('LLM 调用失败')
  }

  function buildMessages(f) {
    const sys = `你是一位资深技术面试官与讲师。你的任务是：针对给定的一个「技能点」，全面、周到地推演它在技术面试中可能被考察的所有角度与题型，生成高质量、可直接用于面试备考的面试题。严格使用中文。`
    const levelCn = LEVEL_CN[f.lv]
    const mustHint = f.must ? '该技能为「必会」项（面试高频 / 岗位硬门槛），请至少出 5 道，且必须覆盖易错点与实战。' : ''
    const user = `课程方向：${TRACK_CN[f.track]}
所属赛道：${f.subName}
技能等级：${levelCn}${f.must ? '（必会）' : ''}
技能名称：${f.name}
技能描述：${f.desc || '（无补充描述，请基于技能名称自行展开）'}

请基于以上技能点，模拟资深面试官会从该技能出哪些面试题。要求：
1. 全面、周到地覆盖该技能在面试中可能被考察的所有角度与题型。题量随技能重要度/深度浮动：初级 3-4 道、中级 4-6 道、高级 5-8 道；${mustHint}
2. 题型尽量多样，至少涵盖：概念理解题、原理/机制深挖题、常见坑/易错点题、对比辨析题、场景/编码实战题（按技能必要性取舍，不要为凑数出无意义题）。
3. 每道题给出结构化参考答案（markdown）：先一句话核心结论，再分点展开（含代码示例/命令/配置片段），补充「常见坑」，结尾「面试小结」。每答案 300-600 字，精炼不注水。
4. 关键词 3-6 个；难度标注 常规/较难/困难；技术子类从下列列表选最贴合的一个：
${TECH_MAP[f.track].map(r => r.tech).join('、')}
5. 严格按以下格式输出，题与题之间用单独一行的 ===Q=== 分隔，不要输出任何额外说明文字：
===Q===
问：<问题>
答：<参考答案 markdown>
关键词：<k1, k2, k3>
难度：<常规|较难|困难>
技术：<从上述列表选一个>
===Q===`
    return { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }
  }

  function parseDelimited(text) {
    const blocks = text.split(/===Q===/).map(s => s.trim()).filter(Boolean)
    const out = []
    for (const b of blocks) {
      const qm = b.match(/问[：:]\s*([\s\S]*?)(?=\n\s*答[：:])/)
      const am = b.match(/答[：:]\s*([\s\S]*?)(?=\n\s*关键词[：:])/)
      const km = b.match(/关键词[：:]\s*([\s\S]*?)(?=\n\s*难度[：:])/)
      const dm = b.match(/难度[：:]\s*([\s\S]*?)(?=\n\s*技术[：:]|$)/)
      const tm = b.match(/技术[：:]\s*([\s\S]*?)(?=\n|$)/)
      if (!qm || !am) continue
      const q = qm[1].trim(); const a = am[1].trim()
      const keywords = (km ? km[1].trim() : '').split(/[,，、]/).map(s => s.trim()).filter(Boolean).slice(0, 6)
      const difficultyRaw = (dm ? dm[1].trim() : '常规')
      const techRaw = tm ? tm[1].trim() : ''
      if (q && a) out.push({ q, a, keywords, difficultyRaw, techRaw })
    }
    return out
  }

  async function worker(queue) {
    for (const f of queue) {
      const key = mapKey(f)
      try {
        if (doneSet.has(key)) { skipped++; continue }
        const maxTokens = (f.lv === 'senior' || f.must) ? 4200 : 3200
        const { messages } = buildMessages(f)
        const raw = await callLlm(messages, maxTokens)
        const qs = parseDelimited(raw)
        if (!qs.length) throw new Error('未解析出任何题目（格式异常）')

        if (DRY) {
          console.log(`\n########## [${f.track}/${f.subtrackId}/${f.skillIdx}] ${f.subName} :: ${f.name} -> ${qs.length} 题 ##########`)
          qs.slice(0, 2).forEach((x, i) => {
            console.log(`--题${i + 1} [${x.difficultyRaw}] ${x.q}`)
            console.log('   关键词:', x.keywords.join(', '), '| 技术:', x.techRaw)
            console.log('   答:', x.a.slice(0, 140) + '...')
          })
        } else {
          let written = 0, dup = 0
          qs.forEach((x, i) => {
            const dkey = f.track + '||' + normQ(x.q)
            if (seenQ.has(dkey)) { dup++; return }
            seenQ.add(dkey)
            const id = qid(f.track, f.subtrackId, f.lv, f.skillIdx, i + 1)
            const isHard = x.difficultyRaw === '困难'
            const type = isHard ? 'special' : 'hot'
            const difficulty = isHard ? 'hard' : (x.difficultyRaw === '较难' ? 'medium' : 'normal')
            const validTechs = TECH_MAP[f.track].map(r => r.tech)
            const tech = validTechs.includes(x.techRaw) ? x.techRaw : classifyTech(f.track, x.q, JSON.stringify(x.keywords))
            const weight = isHard ? 5 : 3
            // 把技能名塞进关键词，便于现有搜索/筛选命中
            const kws = x.keywords.includes(f.name) ? x.keywords : [...x.keywords, f.name].slice(0, 8)
            // 技能树归属：subtrack=赛道id，skill=技能点名
            insertStmt.run(id, f.track, type, x.q, x.a, JSON.stringify(kws), difficulty, tech, weight, f.subtrackId, f.name)
            applyToSeed(f.track, { id, q: x.q, a: x.a, keywords: kws, type, tech, difficulty, subtrack: f.subtrackId, skill: f.name })
            recordMap(f, id)
            written++
          })
          genTotal += written
          seedDirty = true
          // 每 15 个技能点刷新一次种子（落库是即时的，刷新只是减少最后对账压力）
          flushCount++
          if (flushCount % 15 === 0) {
            fs.writeFileSync(path.join(ROOT, 'data', 'seed-content.json'), JSON.stringify(seed, null, 1))
            seedDirty = false
          }
          console.log(`✓ ${f.track}/${f.subtrackId}/${f.skillIdx} ${f.name} -> ${written} 题${dup ? `（跳过重复 ${dup}）` : ''}（累计新增 ${genTotal}）`)
        }
        doneSet.add(key)
        fs.writeFileSync(PROGRESS, JSON.stringify([...doneSet]))
        done++
      } catch (e) {
        failed++; failedSkills.push(key)
        console.error(`✗ ${f.track}/${f.subtrackId}/${f.skillIdx} ${f.name} 失败: ${e.message}`)
      }
    }
  }

  const chunks = Array.from({ length: CONCURRENCY }, () => [])
  todo.forEach((r, i) => chunks[i % CONCURRENCY].push(r))
  await Promise.all(chunks.map(worker))

  // 结束：确保种子与 DB 一致（把 DB 中 rq- 前缀题补齐进种子）
  if (!DRY) {
    if (seedDirty) { fs.writeFileSync(path.join(ROOT, 'data', 'seed-content.json'), JSON.stringify(seed, null, 1)); seedDirty = false }
    reconcileSeedFromDb(seed)
    // 写出路线图→题目映射
    const mapOut = { generatedAt: new Date().toISOString(), total: qaMap.size, skills: [...qaMap.values()] }
    fs.writeFileSync(path.join(ROOT, '.workbuddy', 'roadmap_qa_index.json'), JSON.stringify(mapOut, null, 1))
    console.log(`✓ 已写出路线图→题目映射 .workbuddy/roadmap_qa_index.json（覆盖技能点 ${qaMap.size}）`)
  }

  console.log(`\n=== 完成：处理技能点=${done} 跳过=${skipped} 失败=${failed} 本批新增题目=${genTotal} ===`)
  if (failedSkills.length) console.log('失败技能 keys:', failedSkills.join(', '))
  db.close()
}

// 对账：DB 中有、种子没有的 rq- 题，补进种子
function reconcileSeedFromDb(seed) {
  const db2 = new Database(path.join(ROOT, 'data', 'devmentor.db'), { readonly: true })
  const rows = db2.prepare("SELECT id,track,type,q,a,keywords,difficulty,tech,subtrack,skill FROM interview_questions WHERE id LIKE 'rq-%'").all()
  let added = 0
  for (const r of rows) {
    const obj = seed.interview[r.track]
    if (!obj) continue
    const arr = r.type === 'special' ? obj.special : obj.hot
    const exist = arr.find(x => x.id === r.id)
    let kws = []
    try { kws = JSON.parse(r.keywords || '[]') } catch {}
    if (exist) {
      // DB 已有该题（如重跑时已存在），同步归属字段，避免种子丢失 subtrack/skill
      exist.subtrack = r.subtrack || null
      exist.skill = r.skill || null
      continue
    }
    arr.push({ id: r.id, q: r.q, keywords: kws, a: r.a, tech: r.tech, difficulty: r.difficulty, subtrack: r.subtrack || null, skill: r.skill || null })
    added++
  }
  db2.close()
  if (added) {
    fs.writeFileSync(path.join(ROOT, 'data', 'seed-content.json'), JSON.stringify(seed, null, 1))
    console.log(`✓ 对账补齐：种子补入 ${added} 道 rq- 题（DB↔seed 一致）`)
  } else {
    console.log('✓ 对账：DB 与种子中的 rq- 题已一致，无需补齐')
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
