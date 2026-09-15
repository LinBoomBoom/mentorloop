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
  // 跨端：原单一 cross 子主题已拆分为 Flutter / React Native 两条独立学习路径（2026-09-04）
  flutter: 'Flutter',
  reactnative: 'React Native',
  native: '原生客户端',
  echarts: 'ECharts',
  d3: 'D3',
  webgl: 'WebGL',
  java: 'Java 后端',
  go: 'Go',
  python: 'Python',
  system: '系统设计',
  micro: '微服务',
  mq: '消息队列',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  dbredis: 'Redis',
  dbnosql: 'NoSQL',
  linux: 'Linux',
  network: '网络',
  sre: 'SRE',
  docker: 'Docker',
  cicd: 'CI/CD',
  rag: 'RAG',
  prompt: 'Prompt',
  agent: 'Agent',
  deploy: '部署与成本',
  mlflow: 'MLflow',
  kubeflow: 'Kubeflow',
  llmeval: 'LLM 评估',
  uniapp: 'uni-app',
  k8s: 'Kubernetes',
  // 算法：原单一 algo 子主题已拆分为 CV / NLP / 推荐 三条独立学习路径（2026-09-04）
  cv: 'CV',
  nlp: 'NLP',
  rec: '推荐',
  // 搜索中间件：原单一 searchmw 子主题已拆分为 Elasticsearch / Redis 两条独立学习路径（2026-09-04）
  es: 'Elasticsearch',
  redis: 'Redis',
  mobile: '移动端',
  nodefull: 'Node.js 全栈工程师',
  // 桌面端：原单一 desktop 子主题已拆分为 Electron / Tauri 两条独立学习路径（2026-09-04）
  electron: 'Electron',
  tauri: 'Tauri',
  cloud: '云平台',
  secops: '安全运维',
  bigdata: '大数据',
  offlinedw: '离线数仓',
  realtime: '实时流处理',
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
      techNames: ['性能优化', 'React', 'CSS', 'JavaScript', 'Vue', 'TypeScript', '安全', 'Web 基础', '工程化', '网络', '综合应用'] },
    { id: 'fe-arch', name: '前端架构 / 工程化专家', color: '#f43f5e', order: 1,
      summary: '建设脚手架、组件库、设计系统与研发效能平台。',
      chapterSubtracks: ['engineering'],
      techNames: ['工程化', '架构设计', '测试', '性能优化', 'JavaScript', 'CSS', 'Vue', 'React', '网络'] },
    { id: 'fe-harmony', name: '鸿蒙 HarmonyOS 工程师', color: '#0ea5e9', order: 2,
      summary: 'ArkTS + ArkUI 开发原生鸿蒙应用与元服务。',
      chapterSubtracks: ['harmony'],
      techNames: ['HarmonyOS', '性能优化', 'TypeScript', '安全', '工程化', '网络', 'CSS', '综合应用'] },
    { id: 'fe-miniprogram', name: '小程序工程师', color: '#22c55e', order: 3,
      summary: '专做微信 / 支付宝 / 抖音等平台小程序与私域生态。',
      chapterSubtracks: ['miniprogram'],
      techNames: ['小程序', '网络', '性能优化', 'JavaScript', '工程化', '安全', '综合应用', 'CSS'] },
    { id: 'fe-app', name: '跨端 App 工程师（RN / Flutter）', color: '#8b5cf6', order: 4,
      summary: '用 React Native / Flutter 一套代码产出接近原生体验的 App。',
      chapterSubtracks: ['flutter', 'reactnative'],
      techNames: ['React Native', 'Flutter', '性能优化', 'JavaScript', '综合应用', '工程化', 'CSS', 'React', '安全', '测试', 'TypeScript', '网络'] },
    { id: 'fe-native', name: '原生客户端工程师', color: '#64748b', order: 5,
      summary: '用 Kotlin / Swift 做纯原生 App，追求极致性能。',
      chapterSubtracks: ['native'],
      techNames: ['工程化', 'iOS', '综合应用', '性能优化', 'Android', '安全', '网络', 'TypeScript'] },
    { id: 'fe-viz', name: '可视化 / 图形工程师（ECharts / D3 / WebGL）', color: '#d946ef', order: 6,
      summary: '图表、数据大屏、3D 与 Canvas / WebGL 渲染方向。',
      chapterSubtracks: ['echarts', 'd3', 'webgl'],
      techNames: ['ECharts', 'D3', 'WebGL', '性能优化', 'JavaScript', '可视化基础', '综合应用', 'CSS', '工程化', 'Web 基础', 'Canvas', 'React', '安全'] },
    { id: 'fe-desktop', name: '桌面端工程师（Electron / Tauri）', color: '#78716c', order: 7,
      summary: '用 Web 技术做跨平台桌面软件。',
      chapterSubtracks: ['electron', 'tauri'],
      techNames: ['Tauri', '工程化', '安全', 'JavaScript', 'Electron', '性能优化', '综合应用', '网络'] },
    { id: 'fe-mobile', name: '移动端工程师（H5 / 响应式）', color: '#0ea5e9', order: 8,
      summary: '专注移动浏览器与混合容器环境，做响应式适配与移动体验优化。',
      chapterSubtracks: ['mobile'], techNames: ['CSS', '性能优化', 'JavaScript', '综合应用', '工程化', '网络', 'Web 基础', '安全'] },
    { id: 'fe-uniapp', name: 'uni-app 工程师', color: '#10b981', order: 9,
      summary: '一套代码编译到小程序 / App / H5。',
      chapterSubtracks: ['uniapp'], techNames: ['uni-app', '工程化', 'Vue', 'JavaScript', 'CSS', '性能优化', '网络', '综合应用'] },
    { id: 'fe-node', name: 'Node.js 全栈工程师', color: '#16a34a', order: 10,
      summary: '以前端为主、用 Node 打通 BFF 与服务端。',
      chapterSubtracks: ['nodefull'], techNames: ['Node.js', 'JavaScript', '安全', '工程化', '性能优化', '综合应用', '网络', 'TypeScript', 'Web 基础'] }
  ],

  backend: [
    { id: 'be-web', name: 'Web 后端工程师', color: '#14b8a6', order: 0,
      summary: '用 Java / Go / Python 构建服务端接口与业务系统，覆盖语言特性、并发模型与主流 Web 框架。',
      chapterSubtracks: ['java', 'go', 'python'],
      techNames: ['Java', 'Go', 'Python', '网络', 'Redis', 'FastAPI', '微服务', '系统设计', '综合应用', 'Gin', '数据库原理', 'MySQL', '消息队列'] },
    { id: 'be-micro', name: '微服务 / 架构师', color: '#0ea5e9', order: 1,
      summary: '服务拆分、治理与平台化建设。',
      chapterSubtracks: ['system', 'micro', 'mq'],
      techNames: ['系统设计', '消息队列', '微服务', 'Java', '网络', '综合应用', '数据库原理', 'Redis', 'Go', 'MySQL'] },
    { id: 'be-db', name: '数据库 / 存储工程师（MySQL / PostgreSQL / Redis / NoSQL）', color: '#3b82f6', order: 2,
      summary: '关系型与 NoSQL 的运维、调优、高可用与容量规划。',
      chapterSubtracks: ['mysql', 'postgresql', 'dbredis', 'dbnosql'],
      techNames: ['数据库原理', 'PostgreSQL', 'NoSQL', 'MySQL', 'Redis', '系统设计', '综合应用', '网络', 'Elasticsearch', '消息队列'] },
    { id: 'be-data', name: '大数据工程师（离线数仓 / 实时流处理）', color: '#6366f1', order: 3,
      summary: '面向业务分析的离线与实时数仓、指标体系与 BI 供数。',
      chapterSubtracks: ['offlinedw', 'realtime'], techNames: ['Spark', 'Kafka', 'Hive', 'Flink', '数仓建模', '综合应用', '调度与集成', '系统设计', '消息队列', '数据库原理'] },
    { id: 'be-game', name: '游戏服务端工程师', color: '#f59e0b', order: 4,
      summary: '高并发长连接、实时同步与状态一致性。',
      chapterSubtracks: ['gameserver'], techNames: ['网络', '综合应用', '系统设计', 'Redis', 'Java', 'MySQL', '消息队列'] },
    { id: 'be-search', name: '搜索 / 中间件工程师', color: '#8b5cf6', order: 5,
      summary: '检索系统与消息、缓存等基础中间件的深度使用与调优。',
      chapterSubtracks: ['es', 'redis'], techNames: ['Redis', 'Elasticsearch', '系统设计', 'Java', '综合应用', '消息队列', '网络'] },
    { id: 'be-test', name: '测试开发工程师（SDET）', color: '#ec4899', order: 6,
      summary: '用开发能力做质量保障：自动化框架、测试平台与线上质量度量。',
      chapterSubtracks: ['sdet'], techNames: ['自动化测试', '系统设计', 'Java', '综合应用', '网络', '微服务', 'MySQL', '数据库原理', '测试理论'] }
  ],

  devops: [
    { id: 'op-trad', name: '运维工程师（传统）', color: '#f59e0b', order: 0,
      summary: '保障服务器、网络与业务系统稳定运行。',
      chapterSubtracks: ['linux', 'network'],
      techNames: ['Linux', '网络', '容器/Docker', '安全', '综合应用', 'SRE', '监控与可观测', '云治理', 'Kubernetes', '缓存'] },
    { id: 'op-sre', name: 'SRE 工程师', color: '#8b5cf6', order: 1,
      summary: '以软件工程手段提升系统可靠性与效率。',
      chapterSubtracks: ['sre'],
      techNames: ['SRE', '监控与可观测', '数据库', 'Kubernetes', '综合应用', '缓存', 'Linux', 'CI/CD', '云存储', '云平台', '云计算', '网络'] },
    { id: 'op-devops', name: '运维开发 / DevOps 平台', color: '#10b981', order: 2,
      summary: '建设 CI/CD、流水线与企业研发效能平台。',
      chapterSubtracks: ['docker', 'cicd'],
      techNames: ['CI/CD', '容器/Docker', '基础设施即代码', 'Kubernetes', '监控与可观测', '综合应用', 'Linux', '数据库', '网络', 'SRE'] },
    { id: 'op-k8s', name: '云原生 / Kubernetes 工程师', color: '#0ea5e9', order: 3,
      summary: '以 Kubernetes 为核心的容器平台建设与运维。',
      chapterSubtracks: ['k8s'], techNames: ['Kubernetes', '网络', '容器/Docker', '综合应用', 'CI/CD', 'Linux', '监控与可观测', 'SRE'] },
    { id: 'op-cloud', name: '云平台工程师', color: '#3b82f6', order: 4,
      summary: '公有云 / 私有云的资源、网络、成本与安全治理。',
      chapterSubtracks: ['cloud'], techNames: ['云治理', '安全', '网络', '综合应用', '云平台', '基础设施即代码', '监控与可观测', 'CI/CD', '云存储', '云计算', 'Kubernetes', '容器/Docker'] },
    { id: 'op-sec', name: '安全运维工程师', color: '#ef4444', order: 5,
      summary: '防护、检测与响应，保障系统与数据安全。',
      chapterSubtracks: ['secops'], techNames: ['安全', '综合应用', '网络', 'Linux', 'Kubernetes', 'CI/CD', '容器/Docker'] }
  ],

  ai: [
    { id: 'ai-app', name: 'AI 应用工程师（LLM / RAG / Agent）', color: '#8b5cf6', order: 0,
      summary: '把大模型能力落地为可产品化的应用。',
      chapterSubtracks: ['rag', 'prompt', 'agent'],
      techNames: ['RAG', 'Agent', 'Prompt 工程', '评估与观测', '综合应用', '推理与部署', '模型与训练', '数据与标注'] },
    { id: 'ai-infra', name: 'AI Infra / 推理优化工程师', color: '#6366f1', order: 1,
      summary: '让大模型跑得更快更省：推理引擎、显存与算力优化。',
      chapterSubtracks: ['deploy'],
      techNames: ['推理引擎', '推理与部署', '模型压缩', '服务化架构', 'Prompt 工程', '综合应用', '模型与训练', '评估与观测', 'RAG', 'Agent'] },
    { id: 'ai-mlops', name: 'MLOps 工程师（MLflow / Kubeflow / LLM 评估）', color: '#0ea5e9', order: 2,
      summary: '让模型可训练、可部署、可监控地规模化运行。',
      chapterSubtracks: ['mlflow', 'kubeflow', 'llmeval'],
      techNames: ['评估与观测', '推理与部署', '综合应用', 'RAG', '模型与训练', '服务化架构', 'Prompt 工程', 'Agent', '数据与标注'] },
    { id: 'ai-algo', name: '算法工程师（CV / NLP / 推荐）', color: '#d946ef', order: 3,
      summary: '研究与落地机器学习模型，偏科研与建模。',
      chapterSubtracks: ['cv', 'nlp', 'rec'], techNames: ['模型与训练', '推理与部署', 'CV', '评估与观测', 'NLP', '推荐系统', '综合应用', '数据与标注', 'Prompt 工程', 'RAG'] },
    { id: 'ai-data', name: '训练数据 / 标注平台工程师', color: '#14b8a6', order: 4,
      summary: '为模型准备高质量语料与特征。',
      chapterSubtracks: ['traindata'], techNames: ['数据与标注', '模型与训练', '综合应用', 'RAG', '评估与观测', 'CV', 'Prompt 工程', 'NLP'] },
    { id: 'ai-edge', name: '端侧 AI 工程师', color: '#f59e0b', order: 5,
      summary: '把模型塞进手机 / 车机 / IoT 设备。',
      chapterSubtracks: ['edgeai'], techNames: ['端侧 AI', '推理与部署', '模型与训练', 'Prompt 工程', 'Agent', '综合应用', 'RAG'] }
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
