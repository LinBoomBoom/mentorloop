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
    _meta: { kind: 'skill', name: s.name, desc: s.desc, must: s.must, level: lv.level, levelTitle: levelLabel[lv.level], subtrack: st.name, direction: d.name, track: d.id, subtrackId: st.id, skillIndex: lv.skills.indexOf(s) },
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
    _meta: { kind: 'subtrack', name: st.name, summary: st.summary, total, direction: d.name, counts },
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
