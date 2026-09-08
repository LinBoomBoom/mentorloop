// 技术标签受控词表（L4 归类维度 · 唯一取值域）
//
// 背景（2026-09-09）：`interview_questions.tech` 此前是自由字符串，导致三类事故：
//   1. 赛道声明的 techNames 与题库实际标签交集为空 → 用户点筛选返回 0 条（be-data 全灭）；
//   2. 标签与题面语义脱节 → ai-algo 的「CNN/Transformer」题被打上「部署与成本」；
//   3. 存在不受控脏值（如「综合」）。
//
// 设计原则：
//   - 本文件是 tech 的**唯一权威源**；`learningTaxonomy.ts` 的 techNames 必须与之一致
//     （由 scripts/audit-taxonomy.mjs 的 A1/A2/A9 断言强制）。
//   - 每个 term 归属唯一 module，并声明允许出现的赛道白名单（跨赛道复用需显式列出）。
//   - 同名不同模块（如「网络」在前端/后端/运维含义不同）按 module 分开存，key = `${module}/${id}`。
//   - `general`（综合应用）是合法兜底值，取代历史脏值「综合」。

export interface TechTerm {
  /** 模块内唯一短码 */
  id: string
  /** UI 展示名（中文规范名） */
  name: string
  /** 归属一级模块 */
  module: 'frontend' | 'backend' | 'devops' | 'ai'
  /** 允许出现的赛道白名单；'*' 表示该模块下全部赛道 */
  allowTracks: string[] | '*'
  /** 历史别名，用于回刷旧数据（含脏值） */
  aliases?: string[]
}

export const TECH_VOCABULARY: TechTerm[] = [
  // ---------------- 前端 ----------------
  { id: 'web', name: 'Web 基础', module: 'frontend', allowTracks: ['fe-web', 'fe-mobile', 'fe-node', 'fe-viz'] },
  { id: 'css', name: 'CSS', module: 'frontend', allowTracks: '*' },
  { id: 'javascript', name: 'JavaScript', module: 'frontend', allowTracks: '*' },
  { id: 'typescript', name: 'TypeScript', module: 'frontend', allowTracks: '*' },
  { id: 'react', name: 'React', module: 'frontend', allowTracks: ['fe-web', 'fe-arch', 'fe-app', 'fe-viz'] },
  { id: 'vue', name: 'Vue', module: 'frontend', allowTracks: ['fe-web', 'fe-arch', 'fe-uniapp'] },
  { id: 'engineering', name: '工程化', module: 'frontend', allowTracks: '*' },
  { id: 'performance', name: '性能优化', module: 'frontend', allowTracks: '*' },
  { id: 'security', name: '安全', module: 'frontend', allowTracks: '*' },
  { id: 'network', name: '网络', module: 'frontend', allowTracks: '*' },
  { id: 'general', name: '综合应用', module: 'frontend', allowTracks: '*', aliases: ['综合'] },

  // ---------------- 后端 ----------------
  { id: 'java', name: 'Java', module: 'backend', allowTracks: ['be-web', 'be-micro', 'be-game', 'be-search', 'be-test'] },
  { id: 'go', name: 'Go', module: 'backend', allowTracks: ['be-web', 'be-micro'] },
  { id: 'python', name: 'Python', module: 'backend', allowTracks: ['be-web', 'be-data'] },
  { id: 'gin', name: 'Gin', module: 'backend', allowTracks: ['be-web'] },
  { id: 'fastapi', name: 'FastAPI', module: 'backend', allowTracks: ['be-web'] },
  { id: 'system', name: '系统设计', module: 'backend', allowTracks: '*' },
  { id: 'micro', name: '微服务', module: 'backend', allowTracks: '*' },
  { id: 'mq', name: '消息队列', module: 'backend', allowTracks: '*' },
  { id: 'mysql', name: 'MySQL', module: 'backend', allowTracks: ['be-web', 'be-db', 'be-data', 'be-game', 'be-test', 'be-micro'] },
  { id: 'postgresql', name: 'PostgreSQL', module: 'backend', allowTracks: ['be-db'] },
  { id: 'redis', name: 'Redis', module: 'backend', allowTracks: '*' },
  { id: 'nosql', name: 'NoSQL', module: 'backend', allowTracks: ['be-db'] },
  { id: 'network', name: '网络', module: 'backend', allowTracks: '*' },
  { id: 'spark', name: 'Spark', module: 'backend', allowTracks: ['be-data'] },
  { id: 'hive', name: 'Hive', module: 'backend', allowTracks: ['be-data'] },
  { id: 'kafka', name: 'Kafka', module: 'backend', allowTracks: ['be-data'] },
  { id: 'flink', name: 'Flink', module: 'backend', allowTracks: ['be-data'] },
  { id: 'dw', name: '数仓建模', module: 'backend', allowTracks: ['be-data'] },
  { id: 'sched', name: '调度与集成', module: 'backend', allowTracks: ['be-data'] },
  { id: 'general', name: '综合应用', module: 'backend', allowTracks: '*', aliases: ['综合'] },

  // ---------------- 运维 ----------------
  { id: 'linux', name: 'Linux', module: 'devops', allowTracks: '*' },
  { id: 'network', name: '网络', module: 'devops', allowTracks: '*' },
  { id: 'sre', name: 'SRE', module: 'devops', allowTracks: '*' },
  { id: 'docker', name: '容器/Docker', module: 'devops', allowTracks: '*' },
  { id: 'cicd', name: 'CI/CD', module: 'devops', allowTracks: '*' },
  { id: 'k8s', name: 'Kubernetes', module: 'devops', allowTracks: '*' },
  { id: 'cloud', name: '云平台', module: 'devops', allowTracks: ['op-cloud', 'op-trad', 'op-sre'] },
  { id: 'security', name: '安全', module: 'devops', allowTracks: ['op-sec', 'op-cloud', 'op-trad'] },
  { id: 'general', name: '综合应用', module: 'devops', allowTracks: '*', aliases: ['综合'] },

  // ---------------- AI 工程 ----------------
  // 说明：原「部署与成本」单标签覆盖了 43% 的 AI 题目（算法/应用/推理混在一起），
  //       此处按内容语义拆为 train / infra / eval 等可区分的标签。
  // AI 各赛道内容本就高度交叉，除 edge 外一律放开跨赛道使用。
  { id: 'prompt', name: 'Prompt 工程', module: 'ai', allowTracks: '*' },
  { id: 'rag', name: 'RAG', module: 'ai', allowTracks: '*' },
  { id: 'agent', name: 'Agent', module: 'ai', allowTracks: '*' },
  { id: 'train', name: '模型与训练', module: 'ai', allowTracks: '*' },
  { id: 'infra', name: '推理与部署', module: 'ai', allowTracks: '*' },
  { id: 'eval', name: '评估与观测', module: 'ai', allowTracks: '*' },
  { id: 'data', name: '数据与标注', module: 'ai', allowTracks: '*' },
  { id: 'edge', name: '端侧 AI', module: 'ai', allowTracks: ['ai-edge'] },
  // 注：「部署与成本」是历史遗留的过度宽泛标签（覆盖 43% 的 AI 题目），不做别名直映，
  //     改由 scripts/taxonomy-reclassify.mjs 按题面语义细分；仅规则判不出的才落 general。
  { id: 'general', name: '综合应用', module: 'ai', allowTracks: '*', aliases: ['综合'] }
]

// ---- 查找辅助 ----

export function techTermsOf (module: string): TechTerm[] {
  return TECH_VOCABULARY.filter(t => t.module === module)
}

/** 某赛道允许使用的技术标签（用于生成/校验 techNames） */
export function techTermsForTrack (module: string, trackId: string): TechTerm[] {
  return techTermsOf(module).filter(t => t.allowTracks === '*' || t.allowTracks.includes(trackId))
}

/** 该赛道是否允许使用某个展示名 */
export function trackAllowsTechName (module: string, trackId: string, techName: string): boolean {
  return techTermsForTrack(module, trackId).some(t => t.name === techName)
}

/** 历史值 → 规范展示名（命中别名表则转换，否则原样返回） */
export function normalizeTechName (module: string, raw: string): string | null {
  if (!raw) return null
  const hit = TECH_VOCABULARY.find(
    t => t.module === module && (t.name === raw || (t.aliases || []).includes(raw))
  )
  return hit ? hit.name : null
}
