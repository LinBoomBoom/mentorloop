// 学习模块技术方向配置：与 roadmap / interview 的 subtrack 概念对齐
// 用于首页模块卡片方向标签、模块页方向筛选/选择页

export interface ModuleSubtrack {
  id: string
  name: string
  color: string
  order: number
}

export const MODULE_SUBTRACKS: Record<string, ModuleSubtrack[]> = {
  frontend: [
    { id: 'web', name: 'Web 基础', color: '#6366f1', order: 0 },
    { id: 'css', name: 'CSS', color: '#0ea5e9', order: 1 },
    { id: 'javascript', name: 'JavaScript', color: '#f59e0b', order: 2 },
    { id: 'typescript', name: 'TypeScript', color: '#3178c6', order: 3 },
    { id: 'react', name: 'React', color: '#61dafb', order: 4 },
    { id: 'vue', name: 'Vue', color: '#42b883', order: 5 },
    { id: 'engineering', name: '工程化', color: '#8b5cf6', order: 6 },
    { id: 'performance', name: '性能', color: '#ef4444', order: 7 },
    { id: 'security', name: '安全', color: '#10b981', order: 8 },
    { id: 'harmony', name: '鸿蒙', color: '#007dff', order: 9 },
    { id: 'native', name: '原生', color: '#64748b', order: 10 },
    { id: 'cross', name: '跨端', color: '#06b6d4', order: 11 },
    { id: 'miniprogram', name: '小程序', color: '#22c55e', order: 12 },
    { id: 'desktop', name: '桌面', color: '#78716c', order: 13 },
    { id: 'visualization', name: '可视化', color: '#d946ef', order: 14 }
  ],
  backend: [
    { id: 'java', name: 'Java', color: '#f97316', order: 0 },
    { id: 'nodejs', name: 'Node.js', color: '#22c55e', order: 1 },
    { id: 'mysql', name: 'MySQL', color: '#3b82f6', order: 2 },
    { id: 'redis', name: 'Redis', color: '#ef4444', order: 3 },
    { id: 'mq', name: '消息队列', color: '#8b5cf6', order: 4 },
    { id: 'micro', name: '微服务', color: '#06b6d4', order: 5 },
    { id: 'system', name: '系统设计', color: '#6366f1', order: 6 }
  ],
  devops: [
    { id: 'linux', name: 'Linux', color: '#f59e0b', order: 0 },
    { id: 'network', name: '网络', color: '#3b82f6', order: 1 },
    { id: 'docker', name: 'Docker', color: '#0ea5e9', order: 2 },
    { id: 'k8s', name: 'K8s', color: '#6366f1', order: 3 },
    { id: 'cicd', name: 'CI/CD', color: '#10b981', order: 4 },
    { id: 'sre', name: '可观测/SRE', color: '#8b5cf6', order: 5 }
  ],
  ai: [
    { id: 'prompt', name: 'Prompt', color: '#8b5cf6', order: 0 },
    { id: 'rag', name: 'RAG', color: '#6366f1', order: 1 },
    { id: 'eval', name: 'Eval', color: '#0ea5e9', order: 2 },
    { id: 'agent', name: 'Agent', color: '#f59e0b', order: 3 },
    { id: 'deploy', name: '部署与成本', color: '#10b981', order: 4 }
  ]
}

export function getSubtracks(moduleId: string): ModuleSubtrack[] {
  return MODULE_SUBTRACKS[moduleId] || []
}

export function getSubtrack(moduleId: string, subtrackId: string): ModuleSubtrack | null {
  return (MODULE_SUBTRACKS[moduleId] || []).find(s => s.id === subtrackId) || null
}
