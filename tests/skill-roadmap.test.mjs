// 技能路线图：数据完整性 + 视图构建纯函数护栏
import { describe, it, expect } from 'vitest'
import {
  roadmap,
  levelColor,
  levelLabel,
  matches,
  buildTreeData,
  buildBoardView,
  globalStats
} from '../app/data/skillRoadmap'

describe('技能路线图数据集', () => {
  it('包含四个技术方向', () => {
    expect(roadmap.map(d => d.id)).toEqual(['frontend', 'backend', 'devops', 'ai'])
  })

  it('每个方向都有细分赛道，且每个赛道含 初/中/高 三档', () => {
    for (const d of roadmap) {
      expect(d.subTracks.length).toBeGreaterThan(0)
      for (const st of d.subTracks) {
        const levels = st.levels.map(l => l.level).sort()
        expect(levels).toEqual(['junior', 'mid', 'senior'])
        for (const lv of st.levels) {
          expect(lv.skills.length).toBeGreaterThan(0)
          expect(levelLabel[lv.level]).toBeDefined()
          expect(levelColor[lv.level]).toMatch(/^#/)
        }
      }
    }
  })

  it('前端包含用户点名的细分赛道（Web/移动端/APP/Uniapp）', () => {
    const fe = roadmap.find(d => d.id === 'frontend')
    const names = fe.subTracks.map(s => s.name)
    expect(names.some(n => n.includes('Web'))).toBe(true)
    expect(names.some(n => n.includes('移动端'))).toBe(true)
    expect(names.some(n => n.includes('APP'))).toBe(true)
    expect(names.some(n => n.toLowerCase().includes('uni-app') || n.includes('uni'))).toBe(true)
  })

  it('每个技能点都有名称', () => {
    for (const d of roadmap) for (const st of d.subTracks) for (const lv of st.levels)
      for (const s of lv.skills) expect(s.name.length).toBeGreaterThan(0)
  })
})

describe('树形图构建', () => {
  it('全部视图：根节点「技能路线图」下挂四个方向', () => {
    const tree = buildTreeData('all', '')
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('技能路线图')
    expect(tree[0].children).toHaveLength(4)
    const types = tree[0].children.map(c => c._type)
    expect(types.every(t => t === 'root')).toBe(true)
  })

  it('单方向视图：仅该方向的赛道', () => {
    const tree = buildTreeData('frontend', '')
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('前端')
    expect(tree[0].children.length).toBeGreaterThan(0)
    // 赛道节点下应为等级节点
    const sub = tree[0].children[0]
    expect(sub._type).toBe('subtrack')
    expect(sub.children.every(l => l._type === 'level')).toBe(true)
    // 等级节点下应为技能叶子
    expect(sub.children[0].children.every(s => s._type === 'skill')).toBe(true)
  })

  it('搜索「RAG」命中 AI 应用赛道且不影响结构完整性', () => {
    const tree = buildTreeData('all', 'RAG')
    const aiApp = tree[0].children
      .find(c => c.name === 'AI 工程')
      ?.children.find(s => s.name.includes('AI 应用'))
    expect(aiApp).toBeTruthy()
    const flat = JSON.stringify(aiApp)
    expect(flat).toContain('RAG')
    // 每个节点都有 _meta
    const walk = (n) => { expect(n._meta).toBeTruthy(); (n.children || []).forEach(walk) }
    tree.forEach(walk)
  })

  it('搜索无匹配时返回空树', () => {
    expect(buildTreeData('all', 'zzz_not_exist')).toEqual([])
  })
})

describe('路线图（卡片）构建', () => {
  it('全部视图返回四个方向分组', () => {
    const view = buildBoardView('all', '')
    expect(view).toHaveLength(4)
    for (const g of view) {
      expect(g.direction).toBeTruthy()
      expect(g.subTracks.length).toBeGreaterThan(0)
      for (const st of g.subTracks) {
        expect(st.levels.length).toBeGreaterThan(0)
        for (const lv of st.levels) expect(lv.skills.length).toBeGreaterThan(0)
      }
    }
  })

  it('搜索过滤只保留命中的技能', () => {
    const view = buildBoardView('all', '微服务')
    const allSkills = view.flatMap(g => g.subTracks.flatMap(st => st.levels.flatMap(lv => lv.skills)))
    expect(allSkills.length).toBeGreaterThan(0)
    expect(allSkills.every(s => matches(s, '微服务'))).toBe(true)
  })
})

describe('全局统计', () => {
  it('汇总与各方向明细一致', () => {
    const s = globalStats()
    expect(s.directions).toBe(4)
    let manual = 0, manualMust = 0, manualSub = 0
    for (const d of roadmap) {
      manualSub += d.subTracks.length
      for (const st of d.subTracks) for (const lv of st.levels) {
        manual += lv.skills.length
        manualMust += lv.skills.filter(x => x.must).length
      }
    }
    expect(s.skills).toBe(manual)
    expect(s.must).toBe(manualMust)
    expect(s.subTracks).toBe(manualSub)
    expect(s.skills).toBeGreaterThan(100) // 内容足够丰富才有参考价值
  })
})
