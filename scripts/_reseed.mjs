import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './data/devmentor.db';
const SEED = './data/seed-content.json';

// 与 server/utils/db.ts seedIfEmpty 保持一致的技术子类规则
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
};

function classifyTech(track, q, keywordsJson, a) {
  const rules = TECH_MAP[track];
  if (!rules) return '综合';
  const text = ((q || '') + ' ' + (keywordsJson || '') + ' ' + (a || '')).toLowerCase();
  let best = '综合';
  let bestScore = 0;
  for (const r of rules) {
    let score = 0;
    for (const k of r.kw) if (text.includes(k.toLowerCase())) score++;
    if (score > bestScore) { bestScore = score; best = r.tech; }
  }
  return best;
}

// 备份
fs.copyFileSync(DB_PATH, DB_PATH + '.bak_bejvm');
console.log('backed up devmentor.db -> devmentor.db.bak_bejvm');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

// 只清内容表，不动 users/sessions/auth_codes/progress/exam_records
const clear = ['sections', 'exam_choices', 'exam_written', 'exam_sets', 'interview_questions', 'chapters', 'modules'];
for (const t of clear) db.prepare(`DELETE FROM ${t}`).run();
console.log('cleared content tables');

// 确保 chapters.subtrack 列存在（老库结构迁移）
{
  const cols = new Set(db.prepare('PRAGMA table_info(chapters)').all().map((r) => r.name));
  if (!cols.has('subtrack')) db.prepare('ALTER TABLE chapters ADD COLUMN subtrack TEXT').run();
}

// 确保 source 列存在（与 db.ts v20 迁移对齐；reseed 独立运行也需此列）
for (const t of ['interview_questions', 'exam_choices', 'exam_written']) {
  const cols = new Set(db.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name));
  if (!cols.has('source')) db.prepare(`ALTER TABLE ${t} ADD COLUMN source TEXT`).run();
}

const content = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

const insMod = db.prepare('INSERT OR IGNORE INTO modules (id,name,icon,color,"desc",position) VALUES (?,?,?,?,?,?)');
const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position,subtrack) VALUES (?,?,?,?,?,?)');
const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)');

// 与 server/utils/db.ts seedIfEmpty 对齐：根据章节标题/ID 推断技术方向
function assignChapterSubtrack(moduleId, chapterId, title) {
  const t = (title || '').toLowerCase();
  if (moduleId === 'frontend') {
    if (chapterId.startsWith('hm-')) return 'harmony';
    if (chapterId.startsWith('nat-')) return 'native';
    if (chapterId.startsWith('xp-')) {
      // 跨端已拆为 Flutter / React Native（dt 拆分，迁移 v25）：xp-c{n}r 属 RN，其余属 Flutter
      if (/^xp-c\d+r(-|$)/.test(chapterId)) return 'reactnative'
      return 'flutter'
    }
    if (chapterId.startsWith('mp-')) return 'miniprogram';
    if (chapterId.startsWith('dt-')) {
      // 桌面端已拆为 Electron / Tauri（迁移 v24）：dt-c1t/c3/c4t/c5t 属 Tauri，其余属 Electron
      if (['dt-c1t', 'dt-c3', 'dt-c4t', 'dt-c5t'].some((p) => chapterId.startsWith(p))) return 'tauri'
      return 'electron'
    }
    if (chapterId.startsWith('vz-')) {
      // 可视化已拆为 ECharts / D3 / WebGL（迁移 v28）：派生章用 e/d/w 后缀区分
      if (/^vz-c\d+e(-|$)/.test(chapterId)) return 'echarts'
      if (/^vz-c\d+d(-|$)/.test(chapterId)) return 'd3'
      if (/^vz-c\d+w(-|$)/.test(chapterId)) return 'webgl'
      const m = /^vz-c(\d+)/.exec(chapterId)
      if (m) { const n = +m[1]; if (n <= 3) return 'echarts'; if (n <= 5) return 'd3'; return 'webgl' }
      return 'echarts'
    }
    if (t.includes('web 基础') || t.includes('html')) return 'web';
    if (t.includes('css')) return 'css';
    if (t.includes('typescript') || t.includes('ts') || t.includes('echarts')) return 'typescript';
    if (t.includes('react')) return 'react';
    if (t.includes('vue') || t.includes('uni-app')) return 'vue';
    if (t.includes('javascript') || t.includes('异步') || t.includes('dom') || t.includes('浏览器')) return 'javascript';
    if (t.includes('工程化') || t.includes('构建') || t.includes('node') || t.includes('架构') || t.includes('设计模式') || t.includes('测试') || t.includes('状态管理') || t.includes('pwa') || t.includes('动画')) return 'engineering';
    if (t.includes('性能')) return 'performance';
    if (t.includes('安全')) return 'security';
    return 'engineering';
  }
  if (moduleId === 'backend') {
    if (chapterId.startsWith('sr-')) {
      // 搜索中间件已拆为 Elasticsearch / Redis（迁移 v27）：sr-c6/c7/c8 属 Redis，其余属 ES
      if (/^sr-c[678](-|$)/.test(chapterId)) return 'redis'
      return 'es'
    }
    if (chapterId.startsWith('dbs-')) {
      // 数据库已拆为 MySQL / PostgreSQL / Redis / NoSQL（迁移 v29）：按 ID 前缀判定，避免被「数据库」关键字误吞
      if (/^dbs-c[12]/.test(chapterId)) return 'mysql'
      if (/^dbs-c[45]/.test(chapterId)) return 'postgresql'
      if (/^dbs-c[678]/.test(chapterId)) return 'dbredis'
      return 'mysql'
    }
    if (chapterId.startsWith('be-nosql')) return 'dbnosql'
    if (chapterId.startsWith('bd-') || chapterId.startsWith('bg-')) {
      // 大数据已拆为 离线数仓 / 实时流处理（迁移 v30）：bd-* 离线数仓，bg-* 实时流处理
      return chapterId.startsWith('bd-') ? 'offlinedw' : 'realtime'
    }
    if (t.includes('java') || t.includes('jvm') || t.includes('spring')) return 'java';
    if (t.includes('node')) return 'nodejs';
    if (t.includes('mysql') || t.includes('数据库') || t.includes('sql')) return 'mysql';
    if (t.includes('redis') || t.includes('缓存')) return 'redis';
    if (t.includes('消息') || t.includes('mq') || t.includes('队列')) return 'mq';
    if (t.includes('微服务') || t.includes('分布式')) return 'micro';
    if (t.includes('系统') || t.includes('设计') || t.includes('架构')) return 'system';
    return 'java';
  }
  if (moduleId === 'devops') {
    if (t.includes('linux')) return 'linux';
    if (t.includes('网络') || t.includes('tcp') || t.includes('https')) return 'network';
    if (t.includes('docker') || t.includes('容器')) return 'docker';
    if (t.includes('k8s') || t.includes('kubernetes')) return 'k8s';
    if (t.includes('ci') || t.includes('cd') || t.includes('发布') || t.includes('部署')) return 'cicd';
    if (t.includes('监控') || t.includes('sre') || t.includes('可观测')) return 'sre';
    return 'linux';
  }
  if (moduleId === 'ai') {
    if (chapterId === 'ai-c5') return 'llmeval';
    if (chapterId.startsWith('mlp-')) {
      const n = parseInt(chapterId.replace('mlp-c', ''), 10);
      return n >= 1 && n <= 3 ? 'mlflow' : 'kubeflow';
    }
    if (chapterId.startsWith('al-')) {
      if (/^al-c\d+n(-|$)/.test(chapterId) || chapterId.startsWith('al-c8')) return 'nlp';
      if (/^al-c\d+r(-|$)/.test(chapterId) || chapterId.startsWith('al-c9')) return 'rec';
      return 'cv';
    }
    if (t.includes('prompt') || t.includes('提示')) return 'prompt';
    if (t.includes('rag') || t.includes('检索')) return 'rag';
    if (t.includes('eval') || t.includes('评估')) return 'eval';
    if (t.includes('agent') || t.includes('工具调用')) return 'agent';
    if (t.includes('部署') || t.includes('成本') || t.includes('推理')) return 'deploy';
    return 'prompt';
  }
  return null;
}
// 与 seedIfEmpty 字段对齐：必须写入 weight/difficulty/tech/subtrack/skill，否则按技能树浏览会显示 0 题
const insQ = db.prepare('INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords,weight,difficulty,tech,subtrack,skill,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
const insSet = db.prepare('INSERT OR IGNORE INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)');
const insC = db.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,explain,source,multi) VALUES (?,?,?,?,?,?,?,?,?)');
const insW = db.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference,source) VALUES (?,?,?,?,?,?)');

function insertQuestion(track, q, type) {
  const kw = JSON.stringify(q.keywords || []);
  const difficulty = q.difficulty || (type === 'special' ? 'hard' : 'easy');
  const weight = typeof q.weight === 'number' ? q.weight : (type === 'special' ? 5 : 3);
  const tech = q.tech || classifyTech(track, q.q, kw, q.a);
  insQ.run(q.id, track, type, q.q, q.a, kw, weight, difficulty, tech, q.subtrack || null, q.skill || null, q.source ?? null);
}

const tx = db.transaction(() => {
  content.modules.forEach((m, mi) => {
    insMod.run(m.id, m.name, m.icon, m.color, m.desc, mi);
    m.chapters.forEach((ch, ci) => {
      insCh.run(ch.id, m.id, ch.title, ch.goal, ci, ch.subtrack || assignChapterSubtrack(m.id, ch.id, ch.title));
      ch.sections.forEach((s, si) => insSec.run(s.id, ch.id, s.title, s.direction, s.content, si));
    });
  });
  Object.entries(content.interview).forEach(([track, bank]) => {
    // 题型按所属数组判定：旧 id[1]==='s' 推导会把 iq-m5-*/xq-*/rq-* 等新前缀误判为 hot
    (bank.hot || []).forEach((q) => insertQuestion(track, q, 'hot'));
    (bank.special || []).forEach((q) => insertQuestion(track, q, 'special'));
  });
  content.examSets.forEach((set) => {
    insSet.run(set.id, set.name, set.track, set.level, set.duration, set.vipOnly ? 1 : 0);
    set.choices.forEach((c) => insC.run(c.id, set.id, c.tag, c.q, JSON.stringify(c.options), JSON.stringify(c.answer), c.explain, c.source ?? null, c.multi ? 1 : 0));
    set.written.forEach((w) => insW.run(w.id, set.id, w.q, JSON.stringify(w.points), w.reference, w.source ?? null));
  });
});
tx();

const counts = {
  modules: db.prepare('SELECT COUNT(*) c FROM modules').get().c,
  chapters: db.prepare('SELECT COUNT(*) c FROM chapters').get().c,
  sections: db.prepare('SELECT COUNT(*) c FROM sections').get().c,
  questions: db.prepare('SELECT COUNT(*) c FROM interview_questions').get().c,
  withSubtrack: db.prepare("SELECT COUNT(*) c FROM interview_questions WHERE subtrack IS NOT NULL AND subtrack!=''").get().c,
  examSets: db.prepare('SELECT COUNT(*) c FROM exam_sets').get().c,
  users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
};
console.log('RESEED COUNTS:', JSON.stringify(counts));

// 校验 be-jvm 落库
const bj = db.prepare("SELECT id,title FROM chapters WHERE id='be-jvm'").get();
const secs = db.prepare("SELECT COUNT(*) c FROM sections WHERE chapter_id='be-jvm'").get().c;
console.log('be-jvm in DB:', bj ? bj.title : 'MISSING', '| sections=', secs);
db.close();
