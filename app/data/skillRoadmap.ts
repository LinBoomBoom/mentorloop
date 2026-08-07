// 技能路线图 —— 方向 → 细分赛道 → 等级(初级/中级/高级) → 技能点
// 用途：/roadmap 页面的「树形图(ECharts)」与「路线图(卡片)」两种视图共用。
//
// 数据按方向拆分在 ./roadmap/ 下，本文件只做汇总 + 视图构建（纯函数、无 Vue 依赖、可测试）。
// 数据规范与公共技能常量见 ./roadmap/types.ts，护栏见 tests/skill-roadmap.test.mjs。

import { frontend } from './roadmap/frontend'
import { backend } from './roadmap/backend'
import { devops } from './roadmap/devops'
import { ai } from './roadmap/ai'
import type { Direction, LevelGroup, LevelKey, SkillNode, SubTrack } from './roadmap/types'

export type { Direction, LevelGroup, LevelKey, SkillNode, SubTrack } from './roadmap/types'
export { COMMON, LEVELS, grp } from './roadmap/types'

export const roadmap: Direction[] = [frontend, backend, devops, ai]

// ===================== 细分赛道官方权威学习资料 =====================
// 这些细分赛道本站「没有」对应体系化课程，其技能点若用内部章节匹配（mapSkillToSections）
// 会因共享「状态管理 / 生命周期 / 架构」等泛化词而错配到无关的 Web 框架章节
// （如「鸿蒙状态管理装饰器」误命中 React Hooks）。因此**不**走内部匹配，直接引导到官方文档。
// 主流赛道（fe-web/fe-node/fe-arch/fe-mobile、be-web/be-micro/be-db、op-*、ai-app 等）仍用内部课程匹配。
export interface OfficialResource {
  title: string
  url: string
  note?: string
}
export const OFFICIAL_RESOURCES: Record<string, OfficialResource[]> = {
  'fe-app': [
    { title: 'React Native 官方文档', url: 'https://reactnative.dev/docs/getting-started', note: 'RN 环境、组件与原生模块。' },
    { title: 'Flutter 官方文档', url: 'https://docs.flutter.dev/', note: 'Dart、Widget 与跨平台渲染。' },
  ],
  'fe-native': [
    { title: 'Android 开发者官网', url: 'https://developer.android.com/', note: 'Kotlin / Jetpack / 应用架构。' },
    { title: 'Apple 开发者文档（iOS）', url: 'https://developer.apple.com/documentation/', note: 'Swift / SwiftUI / 系统框架。' },
  ],
  'fe-harmony': [
    { title: 'HarmonyOS 开发者官网', url: 'https://developer.harmonyos.com/cn/', note: 'ArkTS / ArkUI / 元服务总入口。' },
    { title: '华为鸿蒙应用开发指南', url: 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides', note: 'Ability、分布式能力与上架规范。' },
  ],
  'fe-uniapp': [
    { title: 'uni-app 官方文档', url: 'https://uniapp.dcloud.net.cn/', note: '条件编译、跨端 API 与多端发布。' },
  ],
  'fe-miniprogram': [
    { title: '微信小程序开发文档', url: 'https://developers.weixin.qq.com/miniprogram/dev/framework/', note: '框架、组件、API 与审核规范。' },
  ],
  'fe-desktop': [
    { title: 'Electron 官方文档', url: 'https://www.electronjs.org/docs/latest/', note: '主进程 / 渲染进程 / 打包。' },
    { title: 'Tauri 官方文档', url: 'https://v2.tauri.app/', note: 'Rust 后端 + 前端 WebView。' },
  ],
  'fe-viz': [
    { title: 'D3.js 官方文档', url: 'https://d3js.org/', note: '数据驱动 DOM 与可视化。' },
    { title: 'Apache ECharts 文档', url: 'https://echarts.apache.org/zh/api.html', note: '图表配置与交互（本站即用）。' },
    { title: 'Three.js 文档', url: 'https://threejs.org/docs/', note: 'WebGL 3D 渲染。' },
  ],
  'be-data': [
    { title: 'Apache Spark 文档', url: 'https://spark.apache.org/docs/latest/', note: '批处理 / SQL / 流计算。' },
    { title: 'Apache Flink 文档', url: 'https://nightlies.apache.org/flink/flink-docs-stable/', note: '实时流处理。' },
    { title: 'Apache Hadoop 文档', url: 'https://hadoop.apache.org/docs/stable/', note: 'HDFS / MapReduce / YARN。' },
  ],
  'be-game': [
    { title: 'Unity 联机与专用服务器文档', url: 'https://docs.unity3d.com/Manual/Multiplayer.html', note: '联机架构与专用服务器。' },
    { title: '云风 skynet（经典游戏框架）', url: 'https://github.com/cloudwu/skynet', note: 'Actor 模型高并发网关。' },
  ],
  'be-search': [
    { title: 'Elasticsearch 官方文档', url: 'https://www.elastic.co/guide/index.html', note: '全文检索与聚合。' },
    { title: 'Apache Kafka 文档', url: 'https://kafka.apache.org/documentation/', note: '消息队列与流平台。' },
    { title: 'Redis 官方文档', url: 'https://redis.io/docs/latest/', note: '缓存 / 数据结构 / 集群。' },
  ],
  'be-test': [
    { title: 'Playwright 官方文档', url: 'https://playwright.dev/docs/intro', note: '端到端自动化测试。' },
    { title: 'pytest 官方文档', url: 'https://docs.pytest.org/', note: 'Python 测试框架。' },
    { title: 'Selenium 文档', url: 'https://www.selenium.dev/documentation/', note: 'Web 自动化。' },
  ],
  'op-cloud': [
    { title: '阿里云帮助文档', url: 'https://help.aliyun.com/', note: 'ECS / OSS / 容器服务。' },
    { title: 'AWS 文档', url: 'https://docs.aws.amazon.com/', note: '云资源与最佳实践。' },
    { title: '腾讯云文档', url: 'https://cloud.tencent.com/document', note: '云服务器与中间件。' },
  ],
  'ai-algo': [
    { title: 'PyTorch 官方文档', url: 'https://pytorch.org/docs/stable/', note: '张量 / 自动求导 / 训练。' },
    { title: 'scikit-learn 文档', url: 'https://scikit-learn.org/stable/documentation.html', note: '经典机器学习算法。' },
    { title: 'TensorFlow 文档', url: 'https://www.tensorflow.org/api_docs', note: '深度学习与部署。' },
  ],
  'ai-mlops': [
    { title: 'MLflow 文档', url: 'https://mlflow.org/docs/latest/index.html', note: '实验跟踪与模型注册。' },
    { title: 'Kubeflow 文档', url: 'https://www.kubeflow.org/docs/', note: 'K8s 上的 ML 工作流。' },
  ],
  'ai-data': [
    { title: 'Label Studio 文档', url: 'https://labelstud.io/guide/', note: '数据标注平台。' },
    { title: 'Apache Airflow 文档', url: 'https://airflow.apache.org/docs/', note: '数据管道编排。' },
  ],
  'ai-infra': [
    { title: 'NVIDIA CUDA 文档', url: 'https://docs.nvidia.com/cuda/', note: 'GPU 编程与加速。' },
    { title: 'NVIDIA TensorRT 文档', url: 'https://docs.nvidia.com/deeplearning/tensorrt/', note: '推理优化。' },
    { title: 'vLLM 文档', url: 'https://docs.vllm.ai/', note: '高性能 LLM 推理与服务。' },
  ],
  'ai-edge': [
    { title: 'TensorFlow Lite 指南', url: 'https://www.tensorflow.org/lite/guide', note: '移动 / 嵌入式端推理。' },
    { title: 'ONNX 官方文档', url: 'https://onnx.ai/', note: '模型交换与跨端部署。' },
    { title: '腾讯 NCNN（移动端推理）', url: 'https://github.com/Tencent/ncnn', note: '移动端高性能推理框架。' },
  ],
}

// 等级配色（与品牌主色协调，且深浅对比清晰）
export const levelColor: Record<LevelKey, string> = {
  junior: '#22c55e',
  mid: '#3b82f6',
  senior: '#a855f7',
}

export const levelLabel: Record<LevelKey, string> = {
  junior: '初级',
  mid: '中级',
  senior: '高级',
}

// 统计：单个方向的技能点总数
export function countSkills(d: Direction): number {
  return d.subTracks.reduce((n, s) => n + s.levels.reduce((m, l) => m + l.skills.length, 0), 0)
}

// ===================== 视图构建（纯函数，可测试、无 Vue 依赖） =====================

export function matches(s: SkillNode, k: string): boolean {
  if (!k) return true
  const q = k.toLowerCase()
  return s.name.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q)
}

export interface BoardSubTrack extends SubTrack {
  levels: Array<LevelGroup & { skills: SkillNode[] }>
}
export interface BoardGroup {
  direction: Direction
  subTracks: BoardSubTrack[]
}

// ECharts 树节点（带 _meta 供点击查看详情 / _type 控制符号大小）
interface TreeNode {
  name: string
  _type: 'root' | 'subtrack' | 'level' | 'skill'
  _meta: any
  itemStyle: { color: string }
  children?: TreeNode[]
}

function buildSkillNode(s: SkillNode, lv: LevelGroup, st: SubTrack, d: Direction): TreeNode {
  return {
    name: s.name,
    _type: 'skill',
    _meta: { kind: 'skill', name: s.name, desc: s.desc, must: s.must, level: lv.level, levelTitle: levelLabel[lv.level], subtrack: st.name, direction: d.name, track: d.id, subtrackId: st.id, skillIndex: lv.skills.indexOf(s), official: OFFICIAL_RESOURCES[st.id] || [] },
    itemStyle: { color: levelColor[lv.level] }
  }
}
function buildLevelNode(lv: LevelGroup, st: SubTrack, d: Direction, kw: string): TreeNode | null {
  const skills = lv.skills.filter(s => matches(s, kw))
  if (!skills.length) return null
  return {
    name: lv.title,
    _type: 'level',
    _meta: { kind: 'level', level: lv.level, title: lv.title, stance: lv.stance, count: skills.length, subtrack: st.name, direction: d.name, skills: skills.map(s => s.name) },
    itemStyle: { color: levelColor[lv.level] },
    children: skills.map(s => buildSkillNode(s, lv, st, d))
  }
}
function buildSubNode(st: SubTrack, d: Direction, kw: string): TreeNode | null {
  const levels = st.levels.map(lv => buildLevelNode(lv, st, d, kw)).filter(Boolean) as TreeNode[]
  if (!levels.length) return null
  const total = levels.reduce((n, l) => n + l._meta.count, 0)
  const counts: Record<LevelKey, number> = {
    junior: st.levels.find(l => l.level === 'junior')?.skills.filter(s => matches(s, kw)).length || 0,
    mid: st.levels.find(l => l.level === 'mid')?.skills.filter(s => matches(s, kw)).length || 0,
    senior: st.levels.find(l => l.level === 'senior')?.skills.filter(s => matches(s, kw)).length || 0
  }
  return {
    name: st.name,
    _type: 'subtrack',
    _meta: { kind: 'subtrack', name: st.name, summary: st.summary, total, direction: d.name, counts, official: OFFICIAL_RESOURCES[st.id] || [] },
    itemStyle: { color: d.color },
    children: levels
  }
}
function buildDirectionNode(d: Direction, kw: string): TreeNode | null {
  const subs = d.subTracks.map(st => buildSubNode(st, d, kw)).filter(Boolean) as TreeNode[]
  if (!subs.length) return null
  const total = subs.reduce((n, s) => n + s._meta.total, 0)
  return {
    name: d.name,
    _type: 'root',
    _meta: { kind: 'direction', name: d.name, color: d.color, total, subCount: subs.length },
    itemStyle: { color: d.color },
    children: subs
  }
}

// 树形图数据：activeDir='all' 时根节点为「技能路线图」，下挂四个方向
export function buildTreeData(activeDir = 'all', kw = ''): TreeNode[] {
  if (activeDir === 'all') {
    const children = roadmap.map(d => buildDirectionNode(d, kw)).filter(Boolean) as TreeNode[]
    if (!children.length) return []
    return [{ name: '技能路线图', _type: 'root', _meta: { kind: 'root', name: '技能路线图' }, itemStyle: { color: '#ff5e7e' }, children }]
  }
  const target = roadmap.find(d => d.id === activeDir)
  if (!target) return []
  const node = buildDirectionNode(target, kw)
  return node ? [node] : []
}

// 路线图（卡片）数据
export function buildBoardView(activeDir = 'all', kw = ''): BoardGroup[] {
  const list = activeDir === 'all' ? roadmap : roadmap.filter(d => d.id === activeDir)
  return list.map(d => {
    const subTracks = d.subTracks.map(st => {
      const levels = st.levels
        .map(lv => ({ ...lv, skills: lv.skills.filter(s => matches(s, kw)) }))
        .filter(l => l.skills.length)
      return levels.length ? { ...st, levels } : null
    }).filter(Boolean) as BoardSubTrack[]
    return { direction: d, subTracks }
  }).filter(v => v.subTracks.length)
}

// 全局统计（供汇总卡片）
export function globalStats() {
  let skills = 0, subs = 0, must = 0
  for (const d of roadmap) {
    subs += d.subTracks.length
    for (const st of d.subTracks) {
      for (const lv of st.levels) {
        skills += lv.skills.length
        must += lv.skills.filter(s => s.must).length
      }
    }
  }
  return { directions: roadmap.length, subTracks: subs, skills, must }
}
