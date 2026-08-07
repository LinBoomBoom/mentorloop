// 技能路线图 —— 类型定义、等级语义与公共技能常量
// 数据规范（由 tests/skill-roadmap.test.mjs 护栏强制）：
//   1. 每个赛道必须恰好有 junior / mid / senior 三档，且顺序固定。
//   2. 每档至少 1 个 must（必会）技能点，否则学习者无法判断优先级。
//   3. 粒度区间：初级 4-8、中级 4-8、高级 3-5。
//   4. 同名技能点视为「同一个技能」，其 desc 必须完全一致 —— 跨赛道复用请走下方 COMMON 常量。

export type LevelKey = 'junior' | 'mid' | 'senior'

export interface SkillNode {
  name: string
  desc?: string
  must?: boolean // 该等级「必会」项（面试高频 / 岗位硬门槛）
}

export interface LevelGroup {
  level: LevelKey
  title: string // 初级 / 中级 / 高级
  stance: string // 该等级能力定位（一句话）
  skills: SkillNode[]
}

export interface SubTrack {
  id: string
  name: string
  icon: string // Icon 组件名
  summary: string
  levels: LevelGroup[]
}

export interface Direction {
  id: string
  name: string
  color: string
  subTracks: SubTrack[]
}

export const LEVELS: Record<LevelKey, { title: string; stance: string }> = {
  junior: { title: '初级', stance: '在指导下完成被分配的具体功能，掌握基础语法与工具，理解核心概念。' },
  mid: { title: '中级', stance: '独立负责模块，懂框架原理，能做性能优化与复杂问题排查，理解基础系统设计。' },
  senior: { title: '高级', stance: '主导架构与技术选型，攻克难点，沉淀方法论，跨团队协作并带人。' },
}

export function grp(level: LevelKey, skills: SkillNode[]): LevelGroup {
  return { level, title: LEVELS[level].title, stance: LEVELS[level].stance, skills }
}

// ===================== 公共技能常量 =====================
// 这些技能天然跨赛道（Git / Linux / SQL / Docker / K8s…）。统一在此定义，
// 保证「同名技能 = 同一份描述」，避免树形图与搜索出现同名不同义的混乱。
// 各赛道按自身情况决定 must：`{ ...COMMON.linux, must: true }`
export const COMMON = {
  git: { name: 'Git 协作与分支模型', desc: 'clone / commit / 分支 / PR、冲突解决与主流分支工作流。' },
  linux: { name: 'Linux 常用操作', desc: '文件权限、进程管理、网络排查、systemd 服务与日志查看。' },
  shell: { name: 'Shell 脚本自动化', desc: 'bash 脚本、管道与文本处理、定时任务，替代重复手工操作。' },
  net: { name: '计算机网络基础', desc: 'TCP/IP、DNS、HTTP/HTTPS、抓包分析与常见网络故障定位。' },
  sql: { name: 'SQL 基础查询', desc: '增删改查、join、聚合分组、索引概念与执行计划入门。' },
  docker: { name: 'Docker 容器基础', desc: '镜像构建、容器运行、数据卷与网络、Dockerfile 编写与优化。' },
  k8sCore: { name: 'Kubernetes 核心对象', desc: 'Pod / Deployment / Service / ConfigMap 的作用与 kubectl 常用操作。' },
  algo: { name: '数据结构与算法', desc: '数组链表树图、排序查找、复杂度分析，笔试与大厂面试硬门槛。' },
  owasp: { name: 'Web 安全 OWASP Top 10', desc: 'SQL 注入、XSS、CSRF、越权、反序列化等常见漏洞原理与防护。' },
  python: { name: 'Python 数据处理', desc: 'pandas / numpy 清洗聚合，脚本化处理大批量数据集。' },
} satisfies Record<string, SkillNode>
