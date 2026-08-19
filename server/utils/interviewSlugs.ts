// 面试题技术子类（track 作用域内）↔ SEO 友好 slug 映射。
// 题目 tech 为有限 curated 标签；slug 用于 /interview/[track]/[tech] 路由段。
// API 仍按真实 tech 名查询，本模块仅做 slug<->tech 双向转换 + 兜底。
// 客户端页面经 `~~/server/utils/interviewSlugs` 引用（同一份真源），服务端经相对导入引用。
// 注意：本文件为纯函数模块，无任何 node / server-only 依赖，可安全被客户端打包。

export const TRACKS = ['frontend', 'backend', 'devops', 'ai'] as const
export type Track = (typeof TRACKS)[number]

export const TRACK_NAMES: Record<Track, string> = {
  frontend: '前端',
  backend: '后端',
  devops: '运维',
  ai: 'AI 工程'
}

export const TRACK_COLORS: Record<Track, string> = {
  frontend: '#ff5e7e',
  backend: '#14b8a6',
  devops: '#f59e0b',
  ai: '#8b5cf6'
}

// tech（真实名）→ slug。覆盖 P1 归一化后的全部 27 个库内 tech + 4 个 official 方向 techName。
// 必须与 interview_questions.tech 的实际取值（及 learningTaxonomy 的 techName）保持一致。
// 中文 tech 必须显式给定 slug，否则 fallbackSlug 会将其压成空串而全部碰撞到 'general'。
const TECH_SLUG_MAP: Record<string, string> = {
  // frontend
  'JavaScript': 'javascript',
  'TypeScript': 'typescript',
  'CSS': 'css',
  'Web 基础': 'web-basic',
  'React': 'react',
  'Vue': 'vue',
  '工程化': 'engineering',
  '性能优化': 'performance',
  '安全': 'security',
  // backend
  'Java': 'java',
  'Node.js': 'nodejs',
  'Python': 'python',
  'Go': 'go',
  'MySQL': 'mysql',
  'Redis': 'redis',
  'MongoDB': 'mongodb',
  '微服务': 'microservices',
  '消息队列': 'message-queue',
  '系统设计': 'system-design',
  // devops
  'Linux': 'linux',
  '网络': 'network',
  '容器/Docker': 'docker',
  'Kubernetes': 'kubernetes',
  'CI/CD': 'cicd',
  'SRE': 'sre',
  // ai
  'Prompt': 'prompt',
  'RAG': 'rag',
  'Agent': 'agent',
  'Eval': 'eval',
  '部署与成本': 'deployment-cost',
  // 跨方向
  '综合': 'general'
}

// 兜底：未知 tech（未来新增标签）生成稳定 slug（小写、非字母数字折为连字符）
function fallbackSlug(tech: string): string {
  const s = tech
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'general'
}

export function techToSlug(tech: string): string {
  return TECH_SLUG_MAP[tech] || fallbackSlug(tech)
}

// 反向：slug → tech（仅已知映射可解析；未知 slug 返回 null，由调用方回退到方向页）
const SLUG_TECH_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TECH_SLUG_MAP).map(([k, v]) => [v, k])
)
export function slugToTech(slug: string): string | null {
  return SLUG_TECH_MAP[slug] || null
}

export function isTrack(t: string): t is Track {
  return (TRACKS as readonly string[]).includes(t)
}
