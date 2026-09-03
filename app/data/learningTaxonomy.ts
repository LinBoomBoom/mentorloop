// 学习中心 / 面试题库 · 统一分类（v3，严格对齐技能路线图）
//
// 设计原则（用户拍板 2026-09-02）：
//  1. 一级分类 = 技能路线图 track（app/data/roadmap/*.ts 为唯一权威来源），
//     不再维护一套与路线图脱钩的 ad-hoc 分类。
//  2. 子方向 / 子主题 一律「单选」导航，取消多选 filter（多选会破坏路线图的互斥性）。
//  3. 空赛道（无内置章节）从学习中心主列表隐藏；题库按 subtrack 仍可访问。
//  4. 名实一致：小程序 10 章实为微信小程序内容，子主题标注为「微信小程序」。
//
// 数据来源：
//  - 章节 chapters.subtrack 存的是「子主题级」取值（web/css/react…），通过下方
//    chapterSubtracks 归并到对应 track，无需改库。
//  - 面试题 interview_questions.subtrack 已直接存路线图 track id（fe-web/be-web…），
//    题库按 subtrack 过滤即可，techNames 为赛道内可选技术二级筛选（单选）。

// ---- 子主题 subtrack 取值 → 展示名（修正：miniprogram 标为「微信小程序」）----
export const SUBTRACK_DISPLAY: Record<string, string> = {
  web: 'Web 基础',
  css: 'CSS',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  react: 'React',
  vue: 'Vue',
  performance: '性能优化',
  security: '安全',
  engineering: '工程化',
  harmony: '鸿蒙',
  miniprogram: '微信小程序',
  cross: '跨端 (RN/Flutter)',
  native: '原生客户端',
  visualization: '可视化',
  desktop: '桌面端',
  java: 'Java 后端',
  system: '系统设计',
  micro: '微服务',
  mq: '消息队列',
  mysql: 'MySQL',
  linux: 'Linux',
  network: '网络',
  sre: 'SRE',
  docker: 'Docker',
  cicd: 'CI/CD',
  rag: 'RAG',
  prompt: 'Prompt',
  agent: 'Agent',
  deploy: '部署与成本',
  eval: 'Eval',
  uniapp: 'uni-app',
  k8s: 'Kubernetes',
  algo: '算法',
  searchmw: '搜索中间件',
  mobile: '移动端',
  nodefull: 'Node.js 全栈工程师',
  cloud: '云平台',
  secops: '安全运维',
  bigdata: '大数据',
  gameserver: '游戏服务端',
  sdet: 'SDET',
  traindata: '训练数据',
  edgeai: '端侧AI'
}

export interface SubTopic {
  id: string // = 章节 subtrack 取值
  name: string
  chapterSubtrack: string
}

export interface Track {
  id: string // 路线图 track id，同时是 interview_questions.subtrack 取值
  name: string
  color: string
  order: number
  summary?: string
  chapterSubtracks: string[] // 该赛道下，chapters.subtrack 的取值集合（聚合章节计数用）
  techNames: string[] // 该赛道下，interview_questions.tech 的可选值（题库二级单选筛选）
}

export const LEARNING_TAXONOMY: Record<string, Track[]> = {
  frontend: [
    { id: 'fe-web', name: 'Web 开发工程师', color: '#ff5e7e', order: 0,
      summary: '面向 PC + 移动端浏览器，构建通用 Web 站点与中后台系统。',
      chapterSubtracks: ['web', 'css', 'javascript', 'typescript', 'react', 'vue', 'performance', 'security'],
      techNames: ['Web 基础', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue', '工程化', '性能优化', '安全'] },
    { id: 'fe-arch', name: '前端架构 / 工程化专家', color: '#f43f5e', order: 1,
      summary: '建设脚手架、组件库、设计系统与研发效能平台。',
      chapterSubtracks: ['engineering'],
      techNames: ['工程化', 'JavaScript', '性能优化', 'Vue', 'CSS', 'React'] },
    { id: 'fe-harmony', name: '鸿蒙 HarmonyOS 工程师', color: '#0ea5e9', order: 2,
      summary: 'ArkTS + ArkUI 开发原生鸿蒙应用与元服务。',
      chapterSubtracks: ['harmony'],
      techNames: ['工程化', 'JavaScript', '性能优化', 'TypeScript', '安全', 'CSS'] },
    { id: 'fe-miniprogram', name: '小程序工程师', color: '#22c55e', order: 3,
      summary: '专做微信 / 支付宝 / 抖音等平台小程序与私域生态。',
      chapterSubtracks: ['miniprogram'],
      techNames: ['JavaScript', '性能优化', '工程化', '安全', '网络', 'CSS'] },
    { id: 'fe-app', name: '跨端 App 工程师（RN / Flutter）', color: '#8b5cf6', order: 4,
      summary: '用 React Native / Flutter 一套代码产出接近原生体验的 App。',
      chapterSubtracks: ['cross'],
      techNames: ['工程化', '性能优化', 'JavaScript', '网络', '安全', 'React', 'CSS'] },
    { id: 'fe-native', name: '原生客户端工程师', color: '#64748b', order: 5,
      summary: '用 Kotlin / Swift 做纯原生 App，追求极致性能。',
      chapterSubtracks: ['native'],
      techNames: ['性能优化', '工程化', '安全', 'JavaScript', '网络', 'TypeScript'] },
    { id: 'fe-viz', name: '可视化 / 图形工程师', color: '#d946ef', order: 6,
      summary: '图表、数据大屏、3D 与 Canvas / WebGL 渲染方向。',
      chapterSubtracks: ['visualization'],
      techNames: ['JavaScript', '性能优化', '工程化', 'CSS', '安全', 'Web 基础', 'React'] },
    { id: 'fe-desktop', name: '桌面端工程师（Electron / Tauri）', color: '#78716c', order: 7,
      summary: '用 Web 技术做跨平台桌面软件。',
      chapterSubtracks: ['desktop'],
      techNames: ['工程化', 'JavaScript', '安全', '性能优化', '网络'] },
    { id: 'fe-mobile', name: '移动端工程师（H5 / 响应式）', color: '#0ea5e9', order: 8,
      summary: '专注移动浏览器与混合容器环境，做响应式适配与移动体验优化。',
      chapterSubtracks: ['mobile'], techNames: ['性能优化', 'JavaScript', 'CSS', '网络', '工程化', '安全', 'Web 基础'] },
    { id: 'fe-uniapp', name: 'uni-app 工程师', color: '#10b981', order: 9,
      summary: '一套代码编译到小程序 / App / H5。',
      chapterSubtracks: ['uniapp'], techNames: ['工程化', 'JavaScript', '性能优化', '网络', 'Vue', 'CSS'] },
    { id: 'fe-node', name: 'Node.js 全栈工程师', color: '#16a34a', order: 10,
      summary: '以前端为主、用 Node 打通 BFF 与服务端。',
      chapterSubtracks: ['nodefull'], techNames: ['JavaScript', '工程化', '性能优化', '安全', '网络', 'TypeScript'] }
  ],

  backend: [
    { id: 'be-web', name: 'Web 后端工程师', color: '#14b8a6', order: 0,
      summary: '用 Java / Go / Python 等构建服务端接口与业务系统。',
      chapterSubtracks: ['java'],
      techNames: ['Java', '微服务', '系统设计', 'MySQL', '网络', '消息队列', 'Redis'] },
    { id: 'be-micro', name: '微服务 / 架构师', color: '#0ea5e9', order: 1,
      summary: '服务拆分、治理与平台化建设。',
      chapterSubtracks: ['system', 'micro', 'mq'],
      techNames: ['微服务', 'Java', '系统设计', '网络', 'Redis', 'MySQL'] },
    { id: 'be-db', name: '数据库 / 存储工程师', color: '#3b82f6', order: 2,
      summary: '关系型与 NoSQL 的运维、调优、高可用与容量规划。',
      chapterSubtracks: ['mysql'],
      techNames: ['MySQL', '系统设计', '微服务', '网络', 'Redis'] },
    { id: 'be-data', name: '大数据工程师（数仓 / BI）', color: '#6366f1', order: 3,
      summary: '面向业务分析的离线与实时数仓、指标体系与 BI 供数。',
      chapterSubtracks: ['bigdata'], techNames: ['系统设计', 'MySQL', '微服务', '消息队列', 'Redis'] },
    { id: 'be-game', name: '游戏服务端工程师', color: '#f59e0b', order: 4,
      summary: '高并发长连接、实时同步与状态一致性。',
      chapterSubtracks: ['gameserver'], techNames: ['网络', '系统设计', '微服务', 'Redis', 'Java', '消息队列', 'MySQL'] },
    { id: 'be-search', name: '搜索 / 中间件工程师', color: '#8b5cf6', order: 5,
      summary: '检索系统与消息、缓存等基础中间件的深度使用与调优。',
      chapterSubtracks: ['searchmw'], techNames: ['系统设计', '微服务', '消息队列', 'Redis', 'Java', '网络'] },
    { id: 'be-test', name: '测试开发工程师（SDET）', color: '#ec4899', order: 6,
      summary: '用开发能力做质量保障：自动化框架、测试平台与线上质量度量。',
      chapterSubtracks: ['sdet'], techNames: ['系统设计', 'Java', '网络', '微服务', 'MySQL'] }
  ],

  devops: [
    { id: 'op-trad', name: '运维工程师（传统）', color: '#f59e0b', order: 0,
      summary: '保障服务器、网络与业务系统稳定运行。',
      chapterSubtracks: ['linux', 'network'],
      techNames: ['Linux', '网络', 'CI/CD', 'Kubernetes', '容器/Docker', 'SRE'] },
    { id: 'op-sre', name: 'SRE 工程师', color: '#8b5cf6', order: 1,
      summary: '以软件工程手段提升系统可靠性与效率。',
      chapterSubtracks: ['sre'],
      techNames: ['SRE', 'Linux', '网络', 'CI/CD', 'Kubernetes', '容器/Docker'] },
    { id: 'op-devops', name: '运维开发 / DevOps 平台', color: '#10b981', order: 2,
      summary: '建设 CI/CD、流水线与企业研发效能平台。',
      chapterSubtracks: ['docker', 'cicd'],
      techNames: ['CI/CD', 'Kubernetes', 'SRE', '容器/Docker', 'Linux', '网络'] },
    { id: 'op-k8s', name: '云原生 / Kubernetes 工程师', color: '#0ea5e9', order: 3,
      summary: '以 Kubernetes 为核心的容器平台建设与运维。',
      chapterSubtracks: ['k8s'], techNames: ['Kubernetes', '容器/Docker', 'Linux', '网络', 'SRE', 'CI/CD'] },
    { id: 'op-cloud', name: '云平台工程师', color: '#3b82f6', order: 4,
      summary: '公有云 / 私有云的资源、网络、成本与安全治理。',
      chapterSubtracks: ['cloud'], techNames: ['SRE', 'Linux', '网络', 'CI/CD', 'Kubernetes', '容器/Docker'] },
    { id: 'op-sec', name: '安全运维工程师', color: '#ef4444', order: 5,
      summary: '防护、检测与响应，保障系统与数据安全。',
      chapterSubtracks: ['secops'], techNames: ['安全', 'Linux', '网络', '容器/Docker'] }
  ],

  ai: [
    { id: 'ai-app', name: 'AI 应用工程师（LLM / RAG / Agent）', color: '#8b5cf6', order: 0,
      summary: '把大模型能力落地为可产品化的应用。',
      chapterSubtracks: ['rag', 'prompt', 'agent'],
      techNames: ['RAG', 'Agent', 'Eval', 'Prompt', '部署与成本'] },
    { id: 'ai-infra', name: 'AI Infra / 推理优化工程师', color: '#6366f1', order: 1,
      summary: '让大模型跑得更快更省：推理引擎、显存与算力优化。',
      chapterSubtracks: ['deploy'],
      techNames: ['部署与成本', 'Eval'] },
    { id: 'ai-mlops', name: 'MLOps / 机器学习平台', color: '#0ea5e9', order: 2,
      summary: '让模型可训练、可部署、可监控地规模化运行。',
      chapterSubtracks: ['eval'],
      techNames: ['Eval', '部署与成本', 'RAG'] },
    { id: 'ai-algo', name: '算法工程师（CV / NLP / 推荐）', color: '#d946ef', order: 3,
      summary: '研究与落地机器学习模型，偏科研与建模。',
      chapterSubtracks: ['algo'], techNames: ['部署与成本', 'Eval', 'RAG'] },
    { id: 'ai-data', name: '训练数据 / 标注平台工程师', color: '#14b8a6', order: 4,
      summary: '为模型准备高质量语料与特征。',
      chapterSubtracks: ['traindata'], techNames: ['Eval', '部署与成本', 'RAG', 'Prompt'] },
    { id: 'ai-edge', name: '端侧 AI 工程师', color: '#f59e0b', order: 5,
      summary: '把模型塞进手机 / 车机 / IoT 设备。',
      chapterSubtracks: ['edgeai'], techNames: ['部署与成本', 'Eval'] }
  ]
}

// ---- 查找辅助 ----

export function getTracks (moduleId: string): Track[] {
  return (LEARNING_TAXONOMY[moduleId] || []).slice().sort((a, b) => a.order - b.order)
}

export function getTrack (moduleId: string, trackId: string): Track | null {
  return getTracks(moduleId).find(t => t.id === trackId) || null
}

export function getAllTracks (moduleId: string): Track[] {
  return getTracks(moduleId)
}

// 该赛道是否有内置章节（用于学习中心隐藏空赛道）
export function trackHasChapterContent (track: Track): boolean {
  return track.chapterSubtracks.length > 0
}

// 子主题（章节级）列表，由 chapterSubtracks 推导
export function trackSubTopics (track: Track): SubTopic[] {
  return track.chapterSubtracks.map(st => ({
    id: st,
    name: SUBTRACK_DISPLAY[st] || st,
    chapterSubtrack: st
  }))
}

// 题库按 subtrack 过滤的取值（= 赛道 id）
export function trackInterviewSubtrack (track: Track): string {
  return track.id
}
