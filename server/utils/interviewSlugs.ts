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

// tech（真实名）→ slug。覆盖当前全部 37 个技术子类 + 跨方向「综合」。
// 注：JavaScript/TS 已拆为 JavaScript + TypeScript；CSS/HTML 已拆为 CSS + HTML；
//     Java/Spring 已拆为 Java + Spring + 后端通用（更细分类利于 SEO 收录）。
const TECH_SLUG_MAP: Record<string, string> = {
  // frontend
  'JavaScript': 'javascript',
  'TypeScript': 'typescript',
  '工程化/构建': 'engineering-build',
  '浏览器/渲染': 'browser-rendering',
  'CSS': 'css',
  'HTML': 'html',
  '性能优化': 'performance',
  'React': 'react',
  'Vue': 'vue',
  '网络/HTTP': 'network-http',
  '安全': 'security',
  // backend
  'Java': 'java',
  'Spring': 'spring',
  '后端通用': 'backend-general',
  '系统设计': 'system-design',
  '分布式/微服务': 'distributed-microservices',
  'MySQL/数据库': 'mysql-database',
  '网络/TCP': 'network-tcp',
  '并发/多线程': 'concurrency',
  '消息队列': 'message-queue',
  'Redis/缓存': 'redis-cache',
  // devops
  '监控/SRE': 'monitoring-sre',
  'CI/CD/发布': 'cicd',
  'Kubernetes': 'kubernetes',
  'Linux/排查': 'linux-troubleshooting',
  '网络/TCP/HTTPS': 'network-tcp-https',
  'Nginx/网关': 'nginx-gateway',
  '容器/Docker': 'docker',
  // ai
  '应用与部署': 'app-deploy',
  '评估/Eval': 'eval',
  '模型基础/训练': 'model-training',
  'RAG': 'rag',
  'Agent/工具调用': 'agent-tool',
  'Embedding/向量': 'embedding',
  '提示工程/Prompt': 'prompt-engineering',
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
