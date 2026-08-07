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
    const names = fe.subTracks.map(s => s.name.toLowerCase())
    expect(names.some(n => n.includes('web'))).toBe(true)
    expect(names.some(n => n.includes('移动端'))).toBe(true)
    expect(names.some(n => n.includes('app'))).toBe(true)
    expect(names.some(n => n.includes('uni'))).toBe(true)
  })

  it('每个技能点都有名称', () => {
    for (const d of roadmap) for (const st of d.subTracks) for (const lv of st.levels)
      for (const s of lv.skills) expect(s.name.length).toBeGreaterThan(0)
  })
})

// ===== 内容覆盖度护栏：对标 roadmap.sh 与 2026 国内 JD 审计出的必须覆盖项 =====
describe('内容覆盖度（防回退）', () => {
  const flat = []
  for (const d of roadmap) for (const st of d.subTracks) for (const lv of st.levels)
    for (const s of lv.skills) flat.push({ dir: d.id, track: st.name, level: lv.level, text: `${s.name} ${s.desc || ''}` })

  const hit = (re, filter = () => true) => flat.filter(x => filter(x) && re.test(x.text))

  it('运维方向必须覆盖 Kubernetes 核心能力（此前为 0，P0 缺口）', () => {
    const ops = x => x.dir === 'devops'
    expect(hit(/Kubernetes|K8s/i, ops).length).toBeGreaterThan(0)
    expect(hit(/Pod/i, ops).length).toBeGreaterThan(0)
    expect(hit(/Ingress/i, ops).length).toBeGreaterThan(0)
    expect(hit(/RBAC/i, ops).length).toBeGreaterThan(0)
    expect(hit(/Helm/i, ops).length).toBeGreaterThan(0)
    // 云原生须是独立赛道，而非零散技能点
    const ks = roadmap.find(d => d.id === 'devops').subTracks.map(s => s.name)
    expect(ks.some(n => /Kubernetes|云原生/.test(n))).toBe(true)
  })

  it('前端覆盖鸿蒙 ArkTS 与原生客户端两个赛道', () => {
    const names = roadmap.find(d => d.id === 'frontend').subTracks.map(s => s.name)
    expect(names.some(n => /鸿蒙|HarmonyOS/.test(n))).toBe(true)
    expect(names.some(n => /原生客户端|Android|iOS/.test(n))).toBe(true)
    expect(hit(/ArkTS/i).length).toBeGreaterThan(0)
    expect(hit(/Kotlin|Swift/i).length).toBeGreaterThan(0)
  })

  it('覆盖面试高频通用技能点（a11y / OWASP / 算法 / gRPC / 设计模式 等）', () => {
    const required = [
      ['无障碍 a11y', /无障碍|a11y|ARIA/i],
      ['OWASP', /OWASP/i],
      ['数据结构与算法', /数据结构与算法/],
      ['gRPC', /gRPC/i],
      ['Linux', /Linux/i],
      ['跨域 CORS', /CORS|跨域/i],
      ['单元测试', /单元测试/],
      ['XSS/CSRF', /XSS|CSRF/i],
      ['包管理', /包管理/],
      ['设计模式', /设计模式/],
    ]
    const missing = required.filter(([, re]) => hit(re).length === 0).map(([n]) => n)
    expect(missing).toEqual([])
  })

  it('TypeScript 属于初级必会（2026 国内 JD 已是入门要求）', () => {
    const fe = roadmap.find(d => d.id === 'frontend')
    const web = fe.subTracks.find(s => s.name.includes('Web'))
    const jun = web.levels.find(l => l.level === 'junior')
    const ts = jun.skills.find(s => /TypeScript/i.test(s.name))
    expect(ts).toBeTruthy()
    expect(ts.must).toBe(true)
  })

  it('大数据(后端) 与 训练数据(AI) 职责边界清晰，不再重叠', () => {
    const be = roadmap.find(d => d.id === 'backend').subTracks.find(s => /大数据/.test(s.name))
    const aiData = roadmap.find(d => d.id === 'ai').subTracks.find(s => /训练数据|标注/.test(s.name))
    expect(be).toBeTruthy()
    expect(aiData).toBeTruthy()
    expect(be.name).toMatch(/数仓|BI/)
    expect(aiData.name).toMatch(/训练数据|标注/)
    // 两者技能点不应大面积同名
    const nameOf = st => new Set(st.levels.flatMap(l => l.skills.map(s => s.name)))
    const a = nameOf(be), b = nameOf(aiData)
    const overlap = [...a].filter(n => b.has(n))
    expect(overlap.length).toBeLessThanOrEqual(1)
  })
})

// ===== 数据规范护栏（对应 app/data/roadmap/types.ts 顶部约定）=====
describe('数据规范', () => {
  it('赛道 id 全局唯一，且等级顺序固定为 初→中→高', () => {
    const ids = new Set()
    for (const d of roadmap) for (const st of d.subTracks) {
      expect(ids.has(st.id)).toBe(false)
      ids.add(st.id)
      expect(st.levels.map(l => l.level)).toEqual(['junior', 'mid', 'senior'])
    }
  })

  it('每个等级至少有 1 个必会（must）技能点', () => {
    const bad = []
    for (const d of roadmap) for (const st of d.subTracks) for (const lv of st.levels)
      if (!lv.skills.some(s => s.must)) bad.push(`${d.name}/${st.name}/${lv.title}`)
    expect(bad).toEqual([])
  })

  it('技能点粒度均衡：初/中级 4-8 个，高级 3-5 个', () => {
    const bad = []
    for (const d of roadmap) for (const st of d.subTracks) for (const lv of st.levels) {
      const [lo, hi] = lv.level === 'senior' ? [3, 5] : [4, 8]
      const n = lv.skills.length
      if (n < lo || n > hi) bad.push(`${d.name}/${st.name}/${lv.title}=${n}`)
    }
    expect(bad).toEqual([])
  })

  it('同名技能点必须同义（描述一致），避免搜索串味', () => {
    const byName = new Map()
    for (const d of roadmap) for (const st of d.subTracks) for (const lv of st.levels)
      for (const s of lv.skills) {
        if (!byName.has(s.name)) byName.set(s.name, new Set())
        byName.get(s.name).add(s.desc || '')
      }
    const conflict = [...byName.entries()].filter(([, descs]) => descs.size > 1).map(([n]) => n)
    expect(conflict).toEqual([])
  })

  it('每个技能点都有描述，且赛道有 summary / icon', () => {
    for (const d of roadmap) for (const st of d.subTracks) {
      expect(st.summary.length).toBeGreaterThan(5)
      expect(st.icon.length).toBeGreaterThan(0)
      for (const lv of st.levels) {
        expect(lv.stance.length).toBeGreaterThan(5)
        for (const s of lv.skills) expect((s.desc || '').length).toBeGreaterThan(5)
      }
    }
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
    // 2026-08-07 内容审计后：30 赛道 / 400+ 技能点，不允许回退
    expect(s.subTracks).toBeGreaterThanOrEqual(30)
    expect(s.skills).toBeGreaterThanOrEqual(400)
  })
})
