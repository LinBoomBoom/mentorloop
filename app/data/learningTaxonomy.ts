// 学习中心方向分类 · 两层分类权威模型（v2）
//
// 取代 `moduleSubtracks.ts`（旧文件暂保留，至 P3 页面改造完成后删除）。
// 本模型是「学习中心方向 / 题库·技能树 / 题库·技术筛选」三处唯一权威来源。
//
// 结构：模块 → 大类 DirectionGroup → 子方向 Direction
//   - select: 'nav'   = 单选子导航（如小程序各框架，互斥切换）
//   - select: 'filter'= 多选筛选 chip（如 fe-web 的 React/Vue/TS，可叠加筛选，不单独占 tab）
//   - chapterSubtracks: 命中 chapters.subtrack 的取值（聚合计数用；P1 阶段保持旧值，避免改库破坏线上）
//   - techName: 规范后的 interview_questions.tech 取值（题库归并/展示用，P1 迁移脚本已归一）
//   - official: true = 无内部章节，展示为官方文档/路线图入口（不计入 phantom）

export type SelectMode = 'nav' | 'filter'

export interface Direction {
  id: string
  name: string
  select: SelectMode
  chapterSubtracks: string[]
  techName?: string
  official?: boolean
}

export interface DirectionGroup {
  id: string
  name: string
  color: string
  order: number
  directions: Direction[]
}

export const LEARNING_TAXONOMY: Record<string, DirectionGroup[]> = {
  frontend: [
    {
      id: 'fe-web',
      name: 'Web 基础与框架',
      color: '#6366f1',
      order: 0,
      directions: [
        { id: 'fe-web-basic', name: 'Web 基础', select: 'filter', chapterSubtracks: ['web'], techName: 'Web 基础' },
        { id: 'fe-web-css', name: 'CSS', select: 'filter', chapterSubtracks: ['css'], techName: 'CSS' },
        { id: 'fe-web-javascript', name: 'JavaScript', select: 'filter', chapterSubtracks: ['javascript'], techName: 'JavaScript' },
        { id: 'fe-web-typescript', name: 'TypeScript', select: 'filter', chapterSubtracks: ['typescript'], techName: 'TypeScript' },
        { id: 'fe-web-react', name: 'React', select: 'filter', chapterSubtracks: ['react'], techName: 'React' },
        { id: 'fe-web-vue', name: 'Vue', select: 'filter', chapterSubtracks: ['vue'], techName: 'Vue' },
        { id: 'fe-web-engineering', name: '工程化', select: 'filter', chapterSubtracks: ['engineering'], techName: '工程化' },
        { id: 'fe-web-performance', name: '性能优化', select: 'filter', chapterSubtracks: ['performance'], techName: '性能优化' },
        { id: 'fe-web-security', name: '安全', select: 'filter', chapterSubtracks: ['security'], techName: '安全' }
      ]
    },
    {
      id: 'fe-miniprogram',
      name: '小程序',
      color: '#22c55e',
      order: 1,
      directions: [
        { id: 'fe-miniprogram', name: '小程序（综合）', select: 'nav', chapterSubtracks: ['miniprogram'] },
        { id: 'fe-miniprogram-wechat', name: '微信小程序', select: 'nav', chapterSubtracks: [], official: true },
        { id: 'fe-miniprogram-alipay', name: '支付宝小程序', select: 'nav', chapterSubtracks: [], official: true },
        { id: 'fe-miniprogram-douyin', name: '抖音小程序', select: 'nav', chapterSubtracks: [], official: true },
        { id: 'fe-miniprogram-uniapp', name: 'uni-app', select: 'nav', chapterSubtracks: [], official: true },
        { id: 'fe-miniprogram-taro', name: 'Taro', select: 'nav', chapterSubtracks: [], official: true }
      ]
    },
    { id: 'fe-harmony', name: '鸿蒙', color: '#007dff', order: 2, directions: [{ id: 'fe-harmony', name: '鸿蒙', select: 'nav', chapterSubtracks: ['harmony'] }] },
    { id: 'fe-cross', name: '跨端', color: '#06b6d4', order: 3, directions: [{ id: 'fe-cross', name: '跨端', select: 'nav', chapterSubtracks: ['cross'] }] },
    { id: 'fe-native', name: '原生客户端', color: '#64748b', order: 4, directions: [{ id: 'fe-native', name: '原生客户端', select: 'nav', chapterSubtracks: ['native'] }] },
    { id: 'fe-desktop', name: '桌面端', color: '#78716c', order: 5, directions: [{ id: 'fe-desktop', name: '桌面端', select: 'nav', chapterSubtracks: ['desktop'] }] },
    { id: 'fe-viz', name: '可视化', color: '#d946ef', order: 6, directions: [{ id: 'fe-viz', name: '可视化', select: 'nav', chapterSubtracks: ['visualization'] }] },
    {
      id: 'fe-mobile',
      name: '移动端 H5/响应式',
      color: '#0ea5e9',
      order: 7,
      directions: [{ id: 'fe-mobile', name: '移动端 H5/响应式', select: 'filter', chapterSubtracks: [], official: true }]
    }
  ],

  backend: [
    {
      id: 'be-web',
      name: '服务端开发',
      color: '#f97316',
      order: 0,
      directions: [
        { id: 'be-web-java', name: 'Java', select: 'filter', chapterSubtracks: ['java'], techName: 'Java' },
        { id: 'be-web-nodejs', name: 'Node.js', select: 'filter', chapterSubtracks: [], official: true, techName: 'Node.js' },
        { id: 'be-web-python', name: 'Python', select: 'filter', chapterSubtracks: [], official: true, techName: 'Python' },
        { id: 'be-web-go', name: 'Go', select: 'filter', chapterSubtracks: [], official: true, techName: 'Go' }
      ]
    },
    {
      id: 'be-data',
      name: '数据存储',
      color: '#3b82f6',
      order: 1,
      directions: [
        { id: 'be-data-mysql', name: 'MySQL', select: 'filter', chapterSubtracks: ['mysql'], techName: 'MySQL' },
        { id: 'be-data-redis', name: 'Redis', select: 'filter', chapterSubtracks: [], official: true, techName: 'Redis' },
        { id: 'be-data-mongodb', name: 'MongoDB', select: 'filter', chapterSubtracks: [], official: true, techName: 'MongoDB' }
      ]
    },
    {
      id: 'be-arch',
      name: '架构与中间件',
      color: '#6366f1',
      order: 2,
      directions: [
        { id: 'be-arch-micro', name: '微服务', select: 'filter', chapterSubtracks: ['micro'], techName: '微服务' },
        { id: 'be-arch-mq', name: '消息队列', select: 'filter', chapterSubtracks: ['mq'], techName: '消息队列' },
        { id: 'be-arch-system', name: '系统设计', select: 'filter', chapterSubtracks: ['system'], techName: '系统设计' }
      ]
    }
  ],

  devops: [
    {
      id: 'do-os',
      name: '系统与网络',
      color: '#f59e0b',
      order: 0,
      directions: [
        { id: 'do-os-linux', name: 'Linux', select: 'filter', chapterSubtracks: ['linux'], techName: 'Linux' },
        { id: 'do-os-network', name: '网络', select: 'filter', chapterSubtracks: ['network'], techName: '网络' }
      ]
    },
    {
      id: 'do-container',
      name: '容器与编排',
      color: '#0ea5e9',
      order: 1,
      directions: [
        { id: 'do-container-docker', name: '容器/Docker', select: 'filter', chapterSubtracks: ['docker'], techName: '容器/Docker' },
        { id: 'do-container-k8s', name: 'Kubernetes', select: 'filter', chapterSubtracks: [], official: true, techName: 'Kubernetes' }
      ]
    },
    { id: 'do-cicd', name: 'CI/CD', color: '#10b981', order: 2, directions: [{ id: 'do-cicd', name: 'CI/CD', select: 'filter', chapterSubtracks: ['cicd'], techName: 'CI/CD' }] },
    { id: 'do-sre', name: 'SRE/可观测', color: '#8b5cf6', order: 3, directions: [{ id: 'do-sre', name: 'SRE', select: 'filter', chapterSubtracks: ['sre'], techName: 'SRE' }] }
  ],

  ai: [
    {
      id: 'ai-app',
      name: 'AI 应用工程',
      color: '#8b5cf6',
      order: 0,
      directions: [
        { id: 'ai-app-prompt', name: 'Prompt', select: 'nav', chapterSubtracks: ['prompt'], techName: 'Prompt' },
        { id: 'ai-app-rag', name: 'RAG', select: 'nav', chapterSubtracks: ['rag'], techName: 'RAG' },
        { id: 'ai-app-agent', name: 'Agent', select: 'nav', chapterSubtracks: ['agent'], techName: 'Agent' },
        { id: 'ai-app-eval', name: 'Eval', select: 'nav', chapterSubtracks: ['eval'], techName: 'Eval' },
        { id: 'ai-app-deploy', name: '部署与成本', select: 'nav', chapterSubtracks: ['deploy'], techName: '部署与成本' }
      ]
    }
  ]
}

// ---- 兼容 / 查找辅助 ----

export function getGroups (moduleId: string): DirectionGroup[] {
  return LEARNING_TAXONOMY[moduleId] || []
}

export function getAllDirections (moduleId: string): Direction[] {
  return getGroups(moduleId).flatMap(g => g.directions)
}

export function getDirection (moduleId: string, directionId: string): Direction | null {
  return getAllDirections(moduleId).find(d => d.id === directionId) || null
}

export function getGroup (moduleId: string, groupId: string): DirectionGroup | null {
  return getGroups(moduleId).find(g => g.id === groupId) || null
}

// 题库 tech 规范名 -> 该模块下的 directionId（用于聚合/分组）
export function directionIdByTech (moduleId: string, tech: string): string | null {
  const d = getAllDirections(moduleId).find(x => x.techName === tech)
  return d ? d.id : null
}
