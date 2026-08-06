// MentorLoop 数据访问与认证核心（better-sqlite3 + 原生 SQL）
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getHeader, getCookie, setCookie, setResponseStatus, createError } from 'h3'
import { logWarn } from './logger'

/* ---------------- 单例数据库 ---------------- */
const g = globalThis as any
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'devmentor.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

/* ---------------- 版本化迁移（B8：替代脆弱的内联 CREATE + try/catch ALTER） ----------------
 * 规则：每个迁移均幂等（IF NOT EXISTS / 列存在性检查），因此对"已存在的老库"重跑也是安全的 no-op。
 * 新增 schema 改动时，只需在 MIGRATIONS 末尾追加一个 { version, name, up }，不要再散落 ALTER 到各处。
 */
function colExists(db: any, table: string, col: string): boolean {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[]
  return info.some((c: any) => c.name === col)
}

/* ---------------- 面试题技术细分（#152） ----------------
 * 依据题目 q 文本 + keywords 做关键词命中计分，把每道题归入其方向下的技术子类。
 * 该分类器在「迁移 v8（补齐列）」与「seedIfEmpty（新库回填）」两处复用，逻辑保持一致。
 * 未命中任何技术关键词的题目归入该方向的「综合」桶。
 */
type TechRule = { tech: string; kw: string[] }
const TECH_MAP: Record<string, TechRule[]> = {
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

function classifyTech(track: string, q: string, keywordsJson?: string, a?: string): string {
  const rules = TECH_MAP[track]
  if (!rules) return '综合'
  // 兜底增强：除题干+关键词外，也对参考答案正文做关键词命中，降低落入「综合」兜底的比例
  const text = ((q || '') + ' ' + (keywordsJson || '') + ' ' + (a || '')).toLowerCase()
  let best = '综合'
  let bestScore = 0
  for (const r of rules) {
    let score = 0
    for (const k of r.kw) if (text.includes(k.toLowerCase())) score++
    if (score > bestScore) { bestScore = score; best = r.tech }
  }
  return best
}

const MIGRATIONS: { version: number; name: string; up: (db: any) => void }[] = [
  {
    version: 1,
    name: 'base-schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY, username TEXT UNIQUE, nickname TEXT,
          email TEXT, phone TEXT, password TEXT, avatar TEXT,
          providers TEXT DEFAULT '{}', vip TEXT DEFAULT '{"level":0,"expireAt":null}', created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, user_id TEXT, created_at INTEGER, expires_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS login_attempts (
          key TEXT PRIMARY KEY, fails INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0, updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS auth_codes (
          key TEXT PRIMARY KEY, code TEXT, expires_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS modules (
          id TEXT PRIMARY KEY, name TEXT, icon TEXT, color TEXT, desc TEXT, position INTEGER
        );
        CREATE TABLE IF NOT EXISTS chapters (
          id TEXT PRIMARY KEY, module_id TEXT, title TEXT, goal TEXT, position INTEGER
        );
        CREATE TABLE IF NOT EXISTS sections (
          id TEXT PRIMARY KEY, chapter_id TEXT, title TEXT, direction TEXT, content TEXT, position INTEGER
        );
        CREATE TABLE IF NOT EXISTS interview_questions (
          id TEXT PRIMARY KEY, track TEXT, type TEXT, q TEXT, a TEXT, keywords TEXT
        );
        CREATE TABLE IF NOT EXISTS exam_sets (
          id TEXT PRIMARY KEY, name TEXT, track TEXT, level TEXT, duration INTEGER, vip_only INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS exam_choices (
          id TEXT PRIMARY KEY, set_id TEXT, tag TEXT, q TEXT, options TEXT, answer TEXT, explain TEXT, multi INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS exam_written (
          id TEXT PRIMARY KEY, set_id TEXT, q TEXT, points TEXT, reference TEXT
        );
        CREATE TABLE IF NOT EXISTS progress (
          user_id TEXT, module_id TEXT, chapter_id TEXT, section_id TEXT, done_at INTEGER,
          PRIMARY KEY (user_id, section_id)
        );
        CREATE TABLE IF NOT EXISTS exam_records (
          id TEXT PRIMARY KEY, user_id TEXT, set_id TEXT, set_name TEXT, track TEXT,
          score INTEGER, correct INTEGER, total INTEGER, weak_points TEXT, level TEXT,
          advice TEXT, used_seconds INTEGER, choice_review TEXT, written_review TEXT, created_at INTEGER,
          submit_nonce TEXT
        );
        CREATE TABLE IF NOT EXISTS interview_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          track TEXT,
          level TEXT,
          goal TEXT,
          status TEXT DEFAULT 'active',
          messages TEXT,
          turns INTEGER DEFAULT 0,
          score REAL,
          summary TEXT,
          created_at INTEGER,
          updated_at INTEGER,
          finished_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_sessions(user_id);
        CREATE TABLE IF NOT EXISTS study_plans (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          track TEXT,
          weak_points TEXT,
          plan TEXT,
          created_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_studyplan_user ON study_plans(user_id);
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY, admin_id TEXT, action TEXT, target TEXT, meta TEXT, created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          plan_id TEXT NOT NULL,
          amount INTEGER NOT NULL,
          currency TEXT DEFAULT 'CNY',
          status TEXT DEFAULT 'pending',
          provider TEXT,
          provider_order_id TEXT,
          subject TEXT,
          created_at INTEGER,
          paid_at INTEGER,
          expire_at INTEGER,
          meta TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          plan_id TEXT NOT NULL,
          level INTEGER NOT NULL,
          status TEXT DEFAULT 'active',
          auto_renew INTEGER DEFAULT 0,
          start_at INTEGER,
          expire_at INTEGER,
          created_at INTEGER,
          canceled_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
        CREATE TABLE IF NOT EXISTS checkins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          check_date TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          UNIQUE (user_id, check_date),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
      `)
    }
  },
  {
    version: 2,
    name: 'columns-and-indexes',
    up: (db) => {
      if (!colExists(db, 'users', 'role')) db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run()
      if (!colExists(db, 'users', 'banned')) db.prepare('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0').run()
      if (!colExists(db, 'sessions', 'expires_at')) db.prepare('ALTER TABLE sessions ADD COLUMN expires_at INTEGER').run()
      if (!colExists(db, 'exam_records', 'submit_nonce')) db.prepare('ALTER TABLE exam_records ADD COLUMN submit_nonce TEXT').run()
      // B10 幂等索引：作用域必须包含 user_id，否则客户端 nonce 可跨用户碰撞导致 500
      db.exec('DROP INDEX IF EXISTS idx_exam_records_nonce')
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_records_nonce ON exam_records(user_id, set_id, submit_nonce) WHERE submit_nonce IS NOT NULL')
    }
  },
  {
    version: 3,
    name: 'foreign-keys',
    up: (db) => {
      // B2 外键作用域化：为逻辑父子表补 FOREIGN KEY 子句（含 ON DELETE CASCADE）。
      // SQLite 不支持 ALTER ADD FK，故采用「重命名临时表 → 建带 FK 新表 → 拷贝 → 删临时表」。
      // 幂等：若表已带 FK（foreign_key_list 非空）则跳过；孤儿清理确保拷贝不违反 FK。
      // foreign_keys pragma 已在 createDb 开启，事务包裹保证失败时整体回滚。

      // 1) 孤儿清理：子表引用必须指向有效父行，否则 INSERT 会因 FK 失败
      db.exec('DELETE FROM chapters WHERE module_id NOT IN (SELECT id FROM modules)')
      db.exec('DELETE FROM sections WHERE chapter_id NOT IN (SELECT id FROM chapters)')
      db.exec('DELETE FROM exam_choices WHERE set_id NOT IN (SELECT id FROM exam_sets)')
      db.exec('DELETE FROM exam_written WHERE set_id NOT IN (SELECT id FROM exam_sets)')
      db.exec('DELETE FROM exam_records WHERE user_id NOT IN (SELECT id FROM users)')
      db.exec('DELETE FROM progress WHERE user_id NOT IN (SELECT id FROM users)')
      db.exec('DELETE FROM interview_sessions WHERE user_id NOT IN (SELECT id FROM users)')
      db.exec('DELETE FROM study_plans WHERE user_id NOT IN (SELECT id FROM users)')

      const recreate = (table: string, createSql: string) => {
        const fks = db.prepare(`PRAGMA foreign_key_list(${table})`).all() as any[]
        if (fks.length > 0) return // 已带 FK，跳过（保证幂等，新库也安全）
        const tmp = `_${table}_old`
        db.exec(`ALTER TABLE ${table} RENAME TO ${tmp}`)
        db.exec(createSql)
        db.exec(`INSERT INTO ${table} SELECT * FROM ${tmp}`)
        db.exec(`DROP TABLE ${tmp}`)
      }

      recreate('chapters',
        `CREATE TABLE chapters (
          id TEXT PRIMARY KEY, module_id TEXT, title TEXT, goal TEXT, position INTEGER,
          FOREIGN KEY(module_id) REFERENCES modules(id) ON DELETE CASCADE
        )`)
      recreate('sections',
        `CREATE TABLE sections (
          id TEXT PRIMARY KEY, chapter_id TEXT, title TEXT, direction TEXT, content TEXT, position INTEGER,
          FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
        )`)
      recreate('exam_choices',
        `CREATE TABLE exam_choices (
          id TEXT PRIMARY KEY, set_id TEXT, tag TEXT, q TEXT, options TEXT, answer TEXT, explain TEXT, multi INTEGER DEFAULT 0,
          FOREIGN KEY(set_id) REFERENCES exam_sets(id) ON DELETE CASCADE
        )`)
      recreate('exam_written',
        `CREATE TABLE exam_written (
          id TEXT PRIMARY KEY, set_id TEXT, q TEXT, points TEXT, reference TEXT,
          FOREIGN KEY(set_id) REFERENCES exam_sets(id) ON DELETE CASCADE
        )`)
      recreate('exam_records',
        `CREATE TABLE exam_records (
          id TEXT PRIMARY KEY, user_id TEXT, set_id TEXT, set_name TEXT, track TEXT,
          score INTEGER, correct INTEGER, total INTEGER, weak_points TEXT, level TEXT,
          advice TEXT, used_seconds INTEGER, choice_review TEXT, written_review TEXT, created_at INTEGER,
          submit_nonce TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`)
      recreate('progress',
        `CREATE TABLE progress (
          user_id TEXT, module_id TEXT, chapter_id TEXT, section_id TEXT, done_at INTEGER,
          PRIMARY KEY (user_id, section_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`)
      recreate('interview_sessions',
        `CREATE TABLE interview_sessions (
          id TEXT PRIMARY KEY, user_id TEXT NOT NULL, track TEXT, level TEXT, goal TEXT,
          status TEXT DEFAULT 'active', messages TEXT, turns INTEGER DEFAULT 0, score REAL,
          summary TEXT, created_at INTEGER, updated_at INTEGER, finished_at INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`)
      recreate('study_plans',
        `CREATE TABLE study_plans (
          id TEXT PRIMARY KEY, user_id TEXT NOT NULL, track TEXT, weak_points TEXT, plan TEXT, created_at INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`)

      // 2) 重建 recreate 随旧表一并移除的索引（幂等）
      // B10 幂等索引：作用域必须包含 user_id，否则客户端 nonce 可跨用户碰撞导致 500
      db.exec('DROP INDEX IF EXISTS idx_exam_records_nonce')
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_records_nonce ON exam_records(user_id, set_id, submit_nonce) WHERE submit_nonce IS NOT NULL')
      db.exec('CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_sessions(user_id)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_studyplan_user ON study_plans(user_id)')
    }
  },
  {
    version: 4,
    name: 'exam-review-split',
    up: (db) => {
      // B7 拆表：将 exam_records 的 choice_review/written_review 大文本字段拆到子表，消除行膨胀。
      // 安全策略：保留主表老列（新数据双写 + 回滚安全网），读取统一走子表（子表为空 fallback 主表老列）。
      db.exec(`CREATE TABLE IF NOT EXISTS exam_choice_reviews (
        id TEXT PRIMARY KEY, record_id TEXT NOT NULL, choice_id TEXT, q TEXT, options TEXT,
        user_answer TEXT, answer TEXT, right INTEGER, explain TEXT, tag TEXT,
        FOREIGN KEY(record_id) REFERENCES exam_records(id) ON DELETE CASCADE
      )`)
      db.exec('CREATE INDEX IF NOT EXISTS idx_ecr_record ON exam_choice_reviews(record_id)')
      db.exec(`CREATE TABLE IF NOT EXISTS exam_written_reviews (
        id TEXT PRIMARY KEY, record_id TEXT NOT NULL, written_id TEXT, q TEXT,
        user_answer TEXT, reference TEXT, points TEXT,
        FOREIGN KEY(record_id) REFERENCES exam_records(id) ON DELETE CASCADE
      )`)
      db.exec('CREATE INDEX IF NOT EXISTS idx_ewr_record ON exam_written_reviews(record_id)')
      backfillExamReviews(db)
    }
  },
  {
    version: 5,
    name: 'vip-resume-referral',
    up: (db) => {
      // M3 · H3 简历诊断 + H4 内推资源库
      db.exec(`CREATE TABLE IF NOT EXISTS resume_diags (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, content_hash TEXT,
        content TEXT, result TEXT, created_at INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`)
      db.exec('CREATE INDEX IF NOT EXISTS idx_resumediag_user ON resume_diags(user_id)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_resumediag_hash ON resume_diags(content_hash)')
      db.exec(`CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY, company TEXT, title TEXT, track TEXT, city TEXT,
        level TEXT, type TEXT, requirement TEXT, intro TEXT, contact TEXT, created_at INTEGER
      )`)
      db.exec('CREATE INDEX IF NOT EXISTS idx_referrals_track ON referrals(track)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_referrals_city ON referrals(city)')
      db.exec(`CREATE TABLE IF NOT EXISTS referral_applications (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, referral_id TEXT NOT NULL,
        name TEXT, contact TEXT, note TEXT, status TEXT DEFAULT 'pending', created_at INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(referral_id) REFERENCES referrals(id) ON DELETE CASCADE
      )`)
      db.exec('CREATE INDEX IF NOT EXISTS idx_refapp_user ON referral_applications(user_id)')
      // 初始内推资源（仅当为空时写入；后续由管理后台 M4 维护编辑）
      const cnt = (db.prepare('SELECT COUNT(*) AS c FROM referrals').get() as any).c
      if (cnt === 0) {
        const ins = db.prepare('INSERT INTO referrals (id,company,title,track,city,level,type,requirement,intro,contact,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        const now = Date.now()
        const seed: any[] = [
          ['rf_1', '字节跳动', '前端工程师', 'frontend', '北京', 'mid', '社招', '精通 React/Vue，有组件库或工程化经验优先', '抖音电商前端团队，业务体量大、技术氛围好', 'refer-fe@mentorloop.example', now],
          ['rf_2', '阿里巴巴', '后端开发工程师', 'backend', '杭州', 'mid', '社招', 'Java/Go 熟练，熟悉分布式与高并发', '淘天集团核心交易链路，成长快', 'refer-be@mentorloop.example', now],
          ['rf_3', '腾讯', 'DevOps 工程师', 'devops', '深圳', 'senior', '社招', '精通 Kubernetes/Docker，有 CI/CD 平台经验', '云原生 PaaS 团队，基础设施稳定', 'refer-ops@mentorloop.example', now],
          ['rf_4', '百度', 'AI 算法工程师', 'ai', '北京', 'junior', '校招', '掌握 Python/PyTorch，有 CV/NLP 项目经历', '文心大模型相关方向，学术与工程结合', 'refer-ai@mentorloop.example', now],
          ['rf_5', '美团', '高级前端工程师', 'frontend', '北京', 'senior', '社招', '前端工程化、性能优化、微前端经验', '到店业务前端，技术挑战丰富', 'refer-fe2@mentorloop.example', now],
          ['rf_6', '京东', '后端开发工程师', 'backend', '北京', 'junior', '校招', 'Java 基础扎实，了解 Spring 生态', '零售供应链系统，业务稳定', 'refer-be2@mentorloop.example', now],
          ['rf_7', '字节跳动', '测试开发工程师', 'backend', '上海', 'mid', '社招', '熟悉自动化测试框架与质量保障流程', '多产品线质量中台，覆盖面广', 'refer-qa@mentorloop.example', now],
          ['rf_8', '华为', '云原生工程师', 'devops', '东莞', 'mid', '社招', 'K8s/容器编排，有公有云经验优先', '华为云底座团队，技术深度足', 'refer-ops2@mentorloop.example', now],
          ['rf_9', '商汤科技', 'AI 平台工程师', 'ai', '上海', 'mid', '社招', '深度学习框架、推理优化经验', '多模态大模型平台，前沿性强', 'refer-ai2@mentorloop.example', now],
          ['rf_10', '蚂蚁集团', '后端技术专家', 'backend', '杭州', 'senior', '社招', '分布式架构、高可用、金融级稳定性', '支付宝核心系统，技术壁垒高', 'refer-be3@mentorloop.example', now]
        ]
        const tx = db.transaction(() => { for (const r of seed) ins.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]) })
        tx()
      }
    }
  },
  {
    version: 6,
    name: 'interview-weight',
    up: (db) => {
      // M5 · 面试题权重化：支持按权重/难度抽题（VIP 模拟面试、智能练习）
      if (!colExists(db, 'interview_questions', 'weight')) {
        db.prepare("ALTER TABLE interview_questions ADD COLUMN weight INTEGER DEFAULT 3").run()
      }
      if (!colExists(db, 'interview_questions', 'difficulty')) {
        db.prepare("ALTER TABLE interview_questions ADD COLUMN difficulty TEXT DEFAULT 'normal'").run()
      }
      // 存量回填：专项(special)题权重更高、难度 hard；热点(hot)常规
      db.prepare("UPDATE interview_questions SET weight=5, difficulty='hard' WHERE type='special' AND weight IS NULL").run()
      db.prepare("UPDATE interview_questions SET weight=3, difficulty='normal' WHERE type='hot' AND weight IS NULL").run()
    }
  },
  {
    version: 7,
    name: 'checkins',
    up: (db) => {
      // 每日打卡：幂等（同一天唯一），删除用户时级联清理
      db.exec(`
        CREATE TABLE IF NOT EXISTS checkins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          check_date TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          UNIQUE (user_id, check_date),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      db.exec('CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id)')
    }
  },
  {
    version: 8,
    name: 'interview-tech',
    up: (db) => {
      // #152 面试题技术细分：新增 tech 字段，并基于 keywords/q 关键词命中回填全部存量题。
      if (!colExists(db, 'interview_questions', 'tech')) {
        db.prepare('ALTER TABLE interview_questions ADD COLUMN tech TEXT').run()
      }
      const upd = db.prepare('UPDATE interview_questions SET tech=? WHERE id=?')
      const rows = db.prepare('SELECT id,track,q,keywords FROM interview_questions WHERE tech IS NULL').all() as any[]
      const tx = db.transaction(() => {
        for (const r of rows) upd.run(classifyTech(r.track, r.q, r.keywords), r.id)
      })
      tx()
    }
  },
  {
    version: 9,
    name: 'interview-type-weight-heal',
    up: (db) => {
      // 题库由 300 扩到 2600+ 后暴露的两处存量漂移，此迁移一次性自愈（新库为空表时自动空跑）：
      //
      // ① 题型误判：seedIfEmpty 曾用 id[1]==='s' 推导题型，只对 fq/fs 两字母前缀成立。
      //    iq-m5-* / xq-* 等新前缀会被一律判成 hot。以种子文件为准回正（种子是内容唯一真源）。
      // ② 权重/难度未回填：v6 的回填跑在 runMigrations 阶段，早于 seedIfEmpty，空表上等于没跑，
      //    列 DEFAULT 让 special 题停留在 weight=3 / difficulty='normal'，UI 的「较难」标签从不出现。
      const has = (c: string) => colExists(db, 'interview_questions', c)
      if (!has('weight') || !has('difficulty')) return
      // 新库此时表还是空的（迁移早于 seed），直接跳过：修正逻辑已内置在 seedIfEmpty 的插入里
      if ((db.prepare('SELECT COUNT(*) c FROM interview_questions').get() as any).c === 0) return

      // ① 以种子为准回正 type / difficulty / weight（种子是内容唯一真源）。
      //    只改与种子不一致的行；三者必须一起对齐，否则会留下 hot 题却带 hard 难度这类残缺状态。
      try {
        const file = path.join(process.cwd(), 'data', 'seed-content.json')
        if (fs.existsSync(file)) {
          const seed = JSON.parse(fs.readFileSync(file, 'utf-8'))
          const wanted = new Map<string, { type: string; difficulty: string; weight: number }>()
          const collect = (list: any[], type: string) => {
            for (const q of list || []) {
              const difficulty = q.difficulty || (type === 'special' ? 'hard' : 'normal')
              const weight = typeof q.weight === 'number' ? q.weight : (difficulty === 'hard' ? 5 : 3)
              wanted.set(q.id, { type, difficulty, weight })
            }
          }
          for (const bank of Object.values(seed.interview || {}) as any[]) {
            collect(bank.hot, 'hot')
            collect(bank.special, 'special')
          }
          const upd = db.prepare(
            `UPDATE interview_questions SET type=?, difficulty=?, weight=?
             WHERE id=? AND (type<>? OR difficulty IS NOT ? OR weight IS NOT ?)`
          )
          const tx = db.transaction(() => {
            for (const [id, v] of wanted) {
              upd.run(v.type, v.difficulty, v.weight, id, v.type, v.difficulty, v.weight)
            }
          })
          tx()
        }
      } catch { /* 种子缺失或损坏时跳过，不阻塞启动 */ }

      // ② 兜底：种子里没有的行（例如后台手工新增的题）按题型补齐空值，不覆盖已有设定
      db.prepare("UPDATE interview_questions SET weight=5 WHERE type='special' AND weight IS NULL").run()
      db.prepare("UPDATE interview_questions SET difficulty='hard' WHERE type='special' AND (difficulty IS NULL OR difficulty='')").run()
      db.prepare("UPDATE interview_questions SET weight=3 WHERE type='hot' AND weight IS NULL").run()
      db.prepare("UPDATE interview_questions SET difficulty='normal' WHERE type='hot' AND (difficulty IS NULL OR difficulty='')").run()
    }
  },
  {
    version: 10,
    name: 'exam-nonce-scope',
    up: (db) => {
      // P0：旧全局唯一索引 idx_exam_records_nonce(submit_nonce) 允许不同用户/试卷使用相同 nonce 时 500。
      // 改为 (user_id, set_id, submit_nonce) 作用域，既保证同用户同卷幂等，又避免跨用户碰撞。
      db.exec('DROP INDEX IF EXISTS idx_exam_records_nonce')
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_records_nonce ON exam_records(user_id, set_id, submit_nonce) WHERE submit_nonce IS NOT NULL')
    }
  },
  {
    version: 11,
    name: 'exam-attempts',
    up: (db) => {
      // P1-6：考试倒计时改为服务端控制。为每次答题生成独立 attempt，记录服务端开考时间。
      db.exec(`CREATE TABLE IF NOT EXISTS exam_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        set_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(set_id) REFERENCES exam_sets(id) ON DELETE CASCADE
      )`)
      db.exec('CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_set ON exam_attempts(user_id, set_id, status, started_at)')
    }
  },
  {
    version: 12,
    name: 'user-questions',
    up: (db) => {
      // M6 内容扩建：面试题库「待补充池」。收录用户提问中题库未命中的题目，
      // 经 LLM 语义化增强标题/标签后供管理员审核、回流进面试题库。
      db.exec(`CREATE TABLE IF NOT EXISTS user_questions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        track TEXT,
        raw_question TEXT NOT NULL,
        enhanced_title TEXT,
        enhanced_tags TEXT,
        ai_answer TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER,
        updated_at INTEGER
      )`)
      db.exec('CREATE INDEX IF NOT EXISTS idx_user_questions_status ON user_questions(status, created_at DESC)')
    }
  },
  {
    version: 13,
    name: 'user_questions_review',
    up: (db) => {
      // 审核回溯：记录采纳后生成的正式面试题 ID 与审核时间，便于后台追踪与去重展示。
      try { db.exec('ALTER TABLE user_questions ADD COLUMN result_question_id TEXT') } catch { /* 列已存在则忽略 */ }
      try { db.exec('ALTER TABLE user_questions ADD COLUMN reviewed_at INTEGER') } catch { /* 列已存在则忽略 */ }
    }
  }
]

function runMigrations(db: any) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at INTEGER)')
  const applied = new Set((db.prepare('SELECT version FROM schema_migrations').all() as any[]).map((r: any) => r.version))
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue
    db.transaction(() => {
      m.up(db)
      db.prepare('INSERT INTO schema_migrations (version,name,applied_at) VALUES (?,?,?)').run(m.version, m.name, Date.now())
    })()
  }
}

function createDb() {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  runMigrations(db) // B8：版本化迁移（幂等，兼容老库），见上方 MIGRATIONS
  // 启动清理：过期会话与验证码（到期回收由 getUser 兜底；此处避免无限堆积）
  db.prepare('DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < ?').run(Date.now())
  db.prepare('DELETE FROM auth_codes WHERE expires_at < ?').run(Date.now())
  seedIfEmpty(db)
  return db
}

function seedIfEmpty(db: any) {
  const c = (db.prepare('SELECT COUNT(*) AS c FROM modules').get() as any).c
  if (c > 0) return
  const file = path.join(process.cwd(), 'data', 'seed-content.json')
  if (!fs.existsSync(file)) return
  const content = JSON.parse(fs.readFileSync(file, 'utf-8'))
  const insMod = db.prepare('INSERT OR IGNORE INTO modules (id,name,icon,color,desc,position) VALUES (?,?,?,?,?,?)')
  const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position) VALUES (?,?,?,?,?)')
  const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)')
  // 题型 / 权重 / 难度必须在插入时写死，原因见下方 insQ.run 处注释
  const insQ = db.prepare(
    'INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords,weight,difficulty,tech) VALUES (?,?,?,?,?,?,?,?,?)'
  )
  const insSet = db.prepare('INSERT OR IGNORE INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)')
  const insC = db.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,explain,multi) VALUES (?,?,?,?,?,?,?,?)')
  const insW = db.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference) VALUES (?,?,?,?,?)')
  const tx = db.transaction(() => {
    content.modules.forEach((m: any, mi: number) => {
      insMod.run(m.id, m.name, m.icon, m.color, m.desc, mi)
      m.chapters.forEach((ch: any, ci: number) => {
        insCh.run(ch.id, m.id, ch.title, ch.goal, ci)
        ch.sections.forEach((s: any, si: number) => {
          insSec.run(s.id, ch.id, s.title, s.direction, s.content, si)
        })
      })
    })
    // ① 题型按所属数组判定，不再用 id[1]==='s' 推导。
    //    旧写法只对 fq/fs 这类两字母前缀成立，iq-m5-*、xq-* 等新前缀会被一律判成 hot（实测误判 128 道 special）。
    // ② 权重/难度在此显式写入：迁移 v6 的回填跑在 runMigrations 阶段，早于 seedIfEmpty，
    //    空表上执行等于没跑；列上的 DEFAULT 3 / 'normal' 会让 special 题永远拿不到 weight=5 / difficulty='hard'，
    //    前端「较难」标签因此从不出现。种子若自带 difficulty 则以种子为准。
    Object.entries(content.interview).forEach(([track, bank]: any) => {
      const rows = [
        ...(bank.hot || []).map((q: any) => [q, 'hot'] as const),
        ...(bank.special || []).map((q: any) => [q, 'special'] as const)
      ]
      for (const [q, type] of rows) {
        const kw = JSON.stringify(q.keywords || [])
        const difficulty = q.difficulty || (type === 'special' ? 'hard' : 'normal')
        const weight = typeof q.weight === 'number' ? q.weight : (type === 'special' ? 5 : 3)
        insQ.run(q.id, track, type, q.q, q.a, kw, weight, difficulty, q.tech || classifyTech(track, q.q, kw))
      }
    })
    content.examSets.forEach((set: any) => {
      insSet.run(set.id, set.name, set.track, set.level, set.duration, set.vipOnly ? 1 : 0)
      set.choices.forEach((c: any) => insC.run(c.id, set.id, c.tag, c.q, JSON.stringify(c.options), JSON.stringify(c.answer), c.explain, c.multi ? 1 : 0))
      set.written.forEach((w: any) => insW.run(w.id, set.id, w.q, JSON.stringify(w.points), w.reference))
    })
  })
  tx()
  // #152 新库回填：seed 未写入 tech，按关键词补充分类（幂等：仅处理 tech 为空的行）
  const updTech = db.prepare('UPDATE interview_questions SET tech=? WHERE id=?')
  const qrows = db.prepare('SELECT id,track,q,keywords FROM interview_questions WHERE tech IS NULL').all() as any[]
  const qtx = db.transaction(() => {
    for (const r of qrows) updTech.run(classifyTech(r.track, r.q, r.keywords), r.id)
  })
  qtx()
}

export const sqlite = g.__dmDb ?? (g.__dmDb = createDb())

/* ---------------- 工具 ---------------- */
export const DEV_CODE = process.env.DEV_CODE === 'true' // 演示模式：验证码明文下发；生产必须 unset / 置 false，并接入真实短信/邮件

// 会话有效期（毫秒）：7 天。配合 getUser 到期回收，避免长期有效的盗用风险。
export const SESSION_TTL_MS = 7 * 86400000

export function hashPwd(pwd: string, salt?: string): string {
  salt = salt || crypto.randomBytes(8).toString('hex')
  const hash = crypto.scryptSync(pwd, salt, 32).toString('hex')
  return salt + ':' + hash
}
export function verifyPwd(pwd: string, stored?: string): boolean {
  if (!stored) return false
  const [salt] = stored.split(':')
  return hashPwd(pwd, salt) === stored
}
export function publicUser(u: any) {
  return {
    id: u.id, username: u.username, nickname: u.nickname,
    email: u.email || null, phone: u.phone || null, avatar: u.avatar || null,
    role: u.role || 'user',
    banned: !!u.banned,
    vip: effectiveVip(u),
    createdAt: u.created_at
  }
}

// 返回「有效」会员状态：到期自动失效（与后端门禁 requireVip 逻辑一致）
export function effectiveVip(u: any) {
  let v: any = { level: 0, expireAt: null }
  try { v = typeof u.vip === 'string' ? JSON.parse(u.vip) : (u.vip || v) } catch { /* ignore */ }
  const active = !!v && v.level > 0 && (!v.expireAt || v.expireAt > Date.now())
  return { level: v.level || 0, expireAt: v.expireAt || null, active }
}

const VIP_LEVEL_BY_PLAN: Record<string, number> = { monthly: 1, quarterly: 1, yearly: 3 }

// 开通/续费状态机：支付成功后调用。首次购买创建订阅，续费则顺延 expireAt。
export function fulfillOrder(orderId: string, transactionId?: string, paidAt?: number) {
  const now = Date.now()
  const order = sqlite.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as any
  if (!order || order.status === 'paid') return false
  const planLevel = VIP_LEVEL_BY_PLAN[order.plan_id] || 1
  const durationMs = planDurationMs(order.plan_id)
  const tx = sqlite.transaction(() => {
    sqlite.prepare(`UPDATE orders SET status='paid', paid_at=?, provider_order_id=? WHERE id=?`)
      .run(paidAt || now, transactionId || null, orderId)
    const existing = sqlite.prepare(
      `SELECT * FROM subscriptions WHERE user_id=? AND status='active' AND expire_at>? ORDER BY expire_at DESC LIMIT 1`
    ).get(order.user_id, now) as any
    let newExpire: number
    if (existing) {
      newExpire = Math.max(existing.expire_at, now) + durationMs
      // A4b：当前为一次性付费（无自动续费），强制写入 0；待真实支付通道与资质就绪后再按用户选择切换
      sqlite.prepare(`UPDATE subscriptions SET expire_at=?, level=?, plan_id=?, auto_renew=0 WHERE id=?`)
        .run(newExpire, planLevel, order.plan_id, existing.id)
    } else {
      newExpire = now + durationMs
      sqlite.prepare(`INSERT INTO subscriptions (id,user_id,plan_id,level,status,auto_renew,start_at,expire_at,created_at)
        VALUES (?,?,?,?,'active',0,?,?,?)`)
        .run(uid('s_'), order.user_id, order.plan_id, planLevel, now, newExpire, now)
    }
    sqlite.prepare(`UPDATE users SET vip=? WHERE id=?`)
      .run(JSON.stringify({ level: planLevel, expireAt: newExpire }), order.user_id)
  })
  tx()
  return true
}

// 计划时长（毫秒）。计划定义见 server/utils/plans.ts，这里做兜底映射避免循环依赖。
function planDurationMs(planId: string): number {
  const days: Record<string, number> = { monthly: 31, quarterly: 93, yearly: 366 }
  return (days[planId] || 31) * 86400000
}

// 待支付订单超时收敛：把超过 expire_at 仍未支付的订单落库为 expired。
// 只处理 pending 且已设置 expire_at 的行，已支付/已退款订单不受影响。
// userId 省略时对全表生效（供定时任务/维护脚本使用）。
export function expirePendingOrders(userId?: string, now = Date.now()): number {
  const sql = userId
    ? `UPDATE orders SET status='expired' WHERE user_id=? AND status='pending' AND expire_at IS NOT NULL AND expire_at < ?`
    : `UPDATE orders SET status='expired' WHERE status='pending' AND expire_at IS NOT NULL AND expire_at < ?`
  const args = userId ? [userId, now] : [now]
  try {
    return sqlite.prepare(sql).run(...args).changes || 0
  } catch {
    return 0
  }
}

export function getActiveSubscription(userId: string): any {
  return sqlite.prepare(
    `SELECT * FROM subscriptions WHERE user_id=? AND status='active' AND expire_at>? ORDER BY expire_at DESC LIMIT 1`
  ).get(userId, Date.now()) || null
}
export function getUser(event: any): any {
  // 优先 HttpOnly Cookie（A11：JS 不可读，防 XSS 盗用）；兼容旧 x-token 头（过渡期）
  const token = (event && getCookie(event, 'ml_token')) || getHeader(event, 'x-token')
  if (!token) return null
  const row = sqlite.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as any
  if (!row) return null
  const now = Date.now()
  if (row.expires_at && row.expires_at < now) {
    sqlite.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  const u = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as any
  if (u && u.banned) {
    // 被封禁用户：立即撤销其所有会话（改密/封禁后旧 token 不再有效）
    try { sqlite.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id) } catch { /* ignore */ }
    return null
  }
  return u || null
}

/* ---------------- 会话滑动续期 ----------------
 * 只要用户在活跃，有效期就从「最后一次访问」重新计算 7 天，避免用着用着被动登出。
 * 由 server/middleware/session-touch.ts 在真实请求上调用（拿得到真实 res 才能刷新 Cookie）。
 * 每天最多续一次，写库开销可忽略。
 */
const SESSION_RENEW_AFTER_MS = 86400000
export function touchSession(event: any): void {
  try {
    const token = getCookie(event, 'ml_token')
    if (!token) return
    const row = sqlite.prepare('SELECT expires_at FROM sessions WHERE token=?').get(token) as any
    if (!row) return
    const now = Date.now()
    if (row.expires_at && row.expires_at < now) return // 已过期交给 getUser 回收
    // 剩余有效期仍接近满额（说明今天已续过）→ 跳过
    if (row.expires_at && row.expires_at - now > SESSION_TTL_MS - SESSION_RENEW_AFTER_MS) return
    sqlite.prepare('UPDATE sessions SET expires_at=? WHERE token=?').run(now + SESSION_TTL_MS, token)
    if (event?.node?.res && !event.node.res.headersSent) {
      setCookie(event, 'ml_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(SESSION_TTL_MS / 1000)
      })
    }
  } catch { /* 续期失败不影响本次请求 */ }
}
export function newToken(user: any): string {
  const t = crypto.randomBytes(16).toString('hex')
  const expires = Date.now() + SESSION_TTL_MS
  sqlite.prepare('INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)').run(t, user.id, Date.now(), expires)
  return t
}
export function genCode() { return String(crypto.randomInt(100000, 1000000)) }
export function uid(prefix = 'u_') { return prefix + crypto.randomBytes(6).toString('hex') }

export function safeJson(s: any, d: any) {
  try { return JSON.parse(s) } catch { return d }
}
// 将任意值规整为数组：数字/字符串/对象 → [值]；已是数组则原样返回；null/undefined → []
// 用于兼容旧数据中单选题 userAnswer 以标量（如数字下标）存储的情况
export function toArr(x: any) {
  if (Array.isArray(x)) return x
  if (x == null) return []
  if (typeof x === 'string') {
    try { const p = JSON.parse(x); return Array.isArray(p) ? p : [x] } catch { return [x] }
  }
  return [x]
}
// 将答案规整为「下标数组」：兼容两种存储形态——
//  · 字母形态（如 "D" / ["A","B"]，来自 exam_choices.answer 的真实数据）
//  · 下标形态（如 3 / [0,1]，前端 choiceAnswers 与入库复盘使用）
// optCount 为该题选项数量，超出范围的下标会被丢弃，避免脏数据误判。
export function normalizeAnswer(raw: any, optCount = 99): number[] {
  let arr: any[]
  if (Array.isArray(raw)) arr = raw
  else if (raw == null) return []
  else arr = [raw]
  const out: number[] = []
  for (const x of arr) {
    if (typeof x === 'number') {
      if (x >= 0 && x < optCount) out.push(Math.floor(x))
    } else if (typeof x === 'string') {
      const s = x.trim()
      if (/^[A-Za-z]$/.test(s)) {
        const idx = s.toUpperCase().charCodeAt(0) - 65 // 'A'->0
        if (idx >= 0 && idx < optCount) out.push(idx)
      } else {
        const n = Number(s)
        if (!isNaN(n) && n >= 0 && n < optCount) out.push(Math.floor(n))
      }
    }
  }
  return out
}
// 单选题/多选题判分：将答案规整为下标数组后排序比对（空答案视为未作答=错）
export function isAnswerRight(answerRaw: any, userRaw: any, optCount: number): boolean {
  const a = normalizeAnswer(answerRaw, optCount).sort((x, y) => x - y)
  const u = normalizeAnswer(userRaw, optCount).sort((x, y) => x - y)
  return a.length > 0 && a.join(',') === u.join(',')
}

// B7 拆表后统一读取作答复盘：优先子表（结构化、可查询），子表为空则 fallback 主表老列
// 关键：answer/userAnswer 统一规整为「下标数组」再判分，并就地重算 right/correct/score，
// 使早期以字母存储答案、或判分逻辑有误的历史记录也能正确展示，无需数据迁移。
export function loadExamReviews(recordId: string, fallbackChoice?: string | null, fallbackWritten?: string | null) {
  const cr = sqlite.prepare('SELECT * FROM exam_choice_reviews WHERE record_id=? ORDER BY rowid').all(recordId) as any[]
  const wr = sqlite.prepare('SELECT * FROM exam_written_reviews WHERE record_id=? ORDER BY rowid').all(recordId) as any[]
  if (cr.length) {
    const choiceReview = cr.map((r) => {
      const optCount = (safeJson(r.options, []) || []).length
      const answer = normalizeAnswer(safeJson(r.answer, []), optCount)
      const userAnswer = normalizeAnswer(safeJson(r.user_answer, []), optCount)
      const right = isAnswerRight(answer, userAnswer, optCount)
      return {
        id: r.choice_id, q: r.q,
        options: safeJson(r.options, []),
        userAnswer, answer, right, explain: r.explain, tag: r.tag
      }
    })
    const correct = choiceReview.filter((c: any) => c.right).length
    const score = choiceReview.length ? Math.round(correct / choiceReview.length * 100) : 0
    return {
      choiceReview,
      writtenReview: wr.map((r) => ({
        id: r.written_id, q: r.q,
        userAnswer: r.user_answer || '（未作答）',
        reference: r.reference,
        points: safeJson(r.points, [])
      })),
      correct, score, total: choiceReview.length
    }
  }
  const fcr = (safeJson(fallbackChoice, []) as any[]).map((c: any) => {
    const optCount = (toArr(c.options) || []).length
    const answer = normalizeAnswer(c.answer, optCount)
    const userAnswer = normalizeAnswer(c.userAnswer, optCount)
    return { ...c, userAnswer, answer, right: isAnswerRight(answer, userAnswer, optCount) }
  })
  const correct = fcr.filter((c: any) => c.right).length
  const score = fcr.length ? Math.round(correct / fcr.length * 100) : 0
  return {
    choiceReview: fcr,
    writtenReview: safeJson(fallbackWritten, []),
    correct, score, total: fcr.length
  }
}

// 重算单条答卷的得分/正确数/总分/薄弱点/等级建议。
// 统一供列表、统计、详情等所有读取 exam_records.score 的入口调用，保证与判分逻辑一致；
// 历史脏数据（字母答案、标量 userAnswer 等）在读取时即被修正，无需数据迁移。
export function recomputeRecordScore(recordId: string, fallbackChoice?: string | null, fallbackWritten?: string | null) {
  const { choiceReview, correct, score, total } = loadExamReviews(recordId, fallbackChoice, fallbackWritten)
  const wrongTags: any = {}
  choiceReview.filter((c: any) => !c.right).forEach((c: any) => { wrongTags[c.tag] = (wrongTags[c.tag] || 0) + 1 })
  const weakPoints = Object.entries(wrongTags).sort((a: any, b: any) => b[1] - a[1]).map(([tag, n]) => ({ tag, count: n }))
  let level: string, advice: string
  if (score >= 90) { level = '优秀'; advice = '基础非常扎实！建议挑战更高难度试卷，并重点打磨笔试题的表达深度与项目实战案例。' }
  else if (score >= 70) { level = '良好'; advice = '整体掌握不错，但仍有薄弱知识点。建议针对下方薄弱标签回到学习中心对应章节复习，一周后重做本卷验证。' }
  else if (score >= 50) { level = '及格'; advice = '基础存在明显漏洞。建议暂缓刷题，优先回到学习中心系统学习薄弱模块，掌握原理后再回来实战。' }
  else { level = '待加强'; advice = '当前阶段不建议直接面试。请从学习中心第一章开始系统学习，配合高频面试题理解概念，循序渐进。' }
  return { score, correct, total, weakPoints, level, advice }
}

// B7 迁移回填：解析主表 choice_review/written_review JSON 写入子表（幂等：已有子表记录则跳过）
export function backfillExamReviews(db: any) {
  const rows = db.prepare("SELECT id, choice_review, written_review FROM exam_records WHERE choice_review IS NOT NULL AND choice_review <> '[]'").all() as any[]
  const insC = db.prepare('INSERT OR IGNORE INTO exam_choice_reviews (id,record_id,choice_id,q,options,user_answer,answer,right,explain,tag) VALUES (?,?,?,?,?,?,?,?,?,?)')
  const insW = db.prepare('INSERT OR IGNORE INTO exam_written_reviews (id,record_id,written_id,q,user_answer,reference,points) VALUES (?,?,?,?,?,?,?)')
  for (const rec of rows) {
    const cnt = (db.prepare('SELECT COUNT(*) c FROM exam_choice_reviews WHERE record_id=?').get(rec.id) as any).c
    if (cnt > 0) continue
    try {
      const cr = JSON.parse(rec.choice_review || '[]')
      for (const c of cr) insC.run(uid('cr_'), rec.id, c.id, c.q, JSON.stringify(c.options), JSON.stringify(c.userAnswer), JSON.stringify(c.answer), c.right ? 1 : 0, c.explain, c.tag)
    } catch { /* ignore malformed */ }
    try {
      const wr = JSON.parse(rec.written_review || '[]')
      for (const w of wr) insW.run(uid('wr_'), rec.id, w.id, w.q, w.userAnswer, w.reference, JSON.stringify(w.points))
    } catch { /* ignore malformed */ }
  }
}
export function sendCode(type: string, identifier: string): string {
  const code = genCode()
  sqlite.prepare('INSERT OR REPLACE INTO auth_codes (key, code, expires_at) VALUES (?,?,?)')
    .run(type + ':' + String(identifier).toLowerCase(), code, Date.now() + 5 * 60 * 1000)
  return code
}
export function verifyCode(type: string, identifier: string, code: string): boolean {
  const key = type + ':' + String(identifier).toLowerCase()
  const row = sqlite.prepare('SELECT * FROM auth_codes WHERE key = ?').get(key) as any
  if (!row) return false
  if (row.expires_at < Date.now()) { sqlite.prepare('DELETE FROM auth_codes WHERE key=?').run(key); return false }
  if (String(row.code) !== String(code)) return false
  sqlite.prepare('DELETE FROM auth_codes WHERE key=?').run(key)
  return true
}
export function findByIdentifier(type: string, identifier: string): any {
  const id = String(identifier || '').toLowerCase()
  const row = type === 'email'
    ? sqlite.prepare('SELECT * FROM users WHERE lower(email)=?').get(id)
    : sqlite.prepare('SELECT * FROM users WHERE lower(phone)=?').get(id)
  return row || null
}
export function requireVip(user: any, item: any): boolean {
  if (user && user.role === 'admin') return true // 管理员恒放行
  if (item && item.vip_only) {
    if (!user) return false
    const v = typeof user.vip === 'string' ? JSON.parse(user.vip) : user.vip
    if (!v || v.level < 1) return false
    if (v.expireAt && v.expireAt < Date.now()) return false // 到期回收（P0-A3：防止付费会员到期后权益不回收）
  }
  return true
}

// 管理后台闸口：未登录 401 / 非管理员 403。需在事件处理函数中调用，失败抛出 h3 错误。
export function requireAdmin(event: any): any {
  const user = getUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '未登录' })
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: '需要管理员权限' })
  return user
}

// VIP 门禁：未登录 401 / 非有效会员 403。与 effectiveVip 到期回收逻辑一致。
export function requireVipUser(event: any): any {
  const user = getUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '未登录' })
  if (!effectiveVip(user).active) throw createError({ statusCode: 403, statusMessage: '该功能为 VIP 专属，请先开通会员' })
  return user
}
export function json(event: any, code: number, data: any) {
  setResponseStatus(event, code)
  return data
}

// 清理过期会话与验证码（可由定时任务/启动钩子调用）。getUser 也兜底回收单次过期会话。
export function cleanupExpired() {
  const now = Date.now()
  sqlite.prepare('DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < ?').run(now)
  sqlite.prepare('DELETE FROM auth_codes WHERE expires_at < ?').run(now)
}

// G7 操作审计：写入审计日志（失败仅告警，不阻断主流程）。
export function logAudit(adminId: string, action: string, target: string, meta?: any) {
  try {
    sqlite.prepare('INSERT INTO audit_logs (id,admin_id,action,target,meta,created_at) VALUES (?,?,?,?,?,?)')
      .run(uid('a_'), adminId, action, target, meta !== undefined ? JSON.stringify(meta) : null, Date.now())
  } catch (e: any) {
    logWarn('audit.write_failed', { error: e?.message })
  }
}

// A12 账号注销：级联清理该用户全部数据后删除账号（个保法删除权）。
export function deleteAccount(userId: string) {
  const tx = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM exam_records WHERE user_id=?').run(userId)
    sqlite.prepare('DELETE FROM progress WHERE user_id=?').run(userId)
    sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(userId)
    sqlite.prepare('DELETE FROM orders WHERE user_id=?').run(userId)
    sqlite.prepare('DELETE FROM subscriptions WHERE user_id=?').run(userId)
    sqlite.prepare('DELETE FROM users WHERE id=?').run(userId)
  })
  tx()
}
