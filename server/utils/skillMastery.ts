// 技能掌握度（P0）+ 错题本（P2）+ 技能→章节映射（P1a）服务端工具。
// 设计原则：服务端只做「信号计数 → 状态」的纯计算与持久化，不依赖客户端路线图数据；
// 方向 / 必会 等聚合由前端用已有 roadmap 树合并，避免 server↔client 数据耦合。
import { sqlite } from './db'
import crypto from 'node:crypto'

export function skillKey(track: string, subtrackId: string, name: string): string {
  return [track, subtrackId, name].join('::')
}

export type SkillStatus = 'new' | 'learning' | 'familiar' | 'mastered'

export interface SkillMasteryRow {
  skill_key: string
  marked: number
  practiced_correct: number
  practiced_total: number
  exam_correct: number
  exam_total: number
  learned_sections: number
  learned_total: number
}

// 由信号计数计算状态与掌握度（0-100）。阈值与方向无关，前端再叠加 must 聚合。
export function computeStatus(r: Partial<SkillMasteryRow>): { status: SkillStatus; mastery: number } {
  const marked = r.marked ? 1 : 0
  const pc = r.practiced_correct || 0
  const pt = r.practiced_total || 0
  const ec = r.exam_correct || 0
  const et = r.exam_total || 0
  const ls = r.learned_sections || 0
  const lt = r.learned_total || 0
  if (marked) return { status: 'mastered', mastery: 100 }
  const attempts = pt + et
  if (attempts === 0 && lt === 0) return { status: 'new', mastery: 0 }

  const pRatio = pt ? pc / pt : 0
  const eRatio = et ? ec / et : 0
  const examWeight = et ? 1.5 : 0
  const practiceWeight = pt ? 1 : 0
  const learnWeight = lt ? 0.5 : 0
  const denom = practiceWeight + examWeight + learnWeight
  let mastery: number
  if (denom === 0) {
    mastery = lt ? Math.round((ls / lt) * 60) : 0
  } else {
    const learnRatio = lt ? ls / lt : 0
    const acc = (pRatio * practiceWeight + eRatio * examWeight + learnRatio * learnWeight) / denom
    mastery = Math.round(acc * 100)
  }
  mastery = Math.max(0, Math.min(100, mastery))
  let status: SkillStatus
  if (mastery >= 90 && attempts >= 5) status = 'mastered'
  else if (mastery >= 55) status = 'familiar'
  else if (mastery > 0 || lt > 0) status = 'learning'
  else status = 'new'
  return { status, mastery }
}

// 读取某用户全部技能掌握度（skillKey → 状态/掌握度/信号计数）
export function getMasteryMap(userId: string): Record<string, any> {
  const rows = sqlite.prepare('SELECT * FROM user_skill_mastery WHERE user_id=?').all(userId) as any[]
  const map: Record<string, any> = {}
  for (const r of rows) {
    const { status, mastery } = computeStatus(r)
    map[r.skill_key] = {
      status,
      mastery,
      marked: !!r.marked,
      practiced_total: r.practiced_total || 0,
      exam_total: r.exam_total || 0,
      learned_total: r.learned_total || 0
    }
  }
  return map
}

function upsertMeta(stmt: any, userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, now: number) {
  stmt.run(userId, skillKey, track, subtrackId, skillName, now)
}

// 显式标记掌握 / 取消（免费核心闭环钩子）
export function setMark(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, marked: boolean) {
  const now = Date.now()
  upsertMeta(
    sqlite.prepare(`INSERT OR IGNORE INTO user_skill_mastery (user_id,skill_key,track,subtrack_id,skill_name,updated_at) VALUES (?,?,?,?,?,?)`),
    userId, skillKey, track, subtrackId, skillName, now
  )
  sqlite.prepare(`UPDATE user_skill_mastery SET marked=?, updated_at=? WHERE user_id=? AND skill_key=?`)
    .run(marked ? 1 : 0, now, userId, skillKey)
}

// 题库练习 / 模拟自测 信号累加。correct 表示本次作答是否正确。
export function recordPractice(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, correct: boolean) {
  bump(userId, skillKey, track, subtrackId, skillName, correct ? 'practiced_correct' : null, 'practiced_total')
}
export function recordExamSkill(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, correct: boolean) {
  bump(userId, skillKey, track, subtrackId, skillName, correct ? 'exam_correct' : null, 'exam_total')
}
function bump(userId: string, skillKey: string, track: string, subtrackId: string, skillName: string, correctCol: string | null, totalCol: string) {
  const now = Date.now()
  const cols = ['user_id', 'skill_key', 'track', 'subtrack_id', 'skill_name', totalCol]
  const vals = [userId, skillKey, track, subtrackId, skillName, 1]
  if (correctCol) { cols.push(correctCol); vals.push(1) }
  cols.push('updated_at'); vals.push(now)
  const ph = cols.map(() => '?').join(',')
  const colList = cols.join(',')
  const setParts = [`${totalCol}=${totalCol}+1`]
  if (correctCol) setParts.push(`${correctCol}=${correctCol}+1`)
  setParts.push('updated_at=excluded.updated_at')
  sqlite.prepare(
    `INSERT INTO user_skill_mastery (${colList}) VALUES (${ph})
     ON CONFLICT(user_id,skill_key) DO UPDATE SET ${setParts.join(', ')}`
  ).run(...vals)
}

/* ---------------- 技能 → 课程章节映射（P1a，按需计算并缓存） ----------------
 * 启发式（v2，修复「全部返回空」的根因）：
 *   旧逻辑把归一化后的技能名当作「整串」去 title+chapter 里找子串，几乎永远命中不了
 *   （如技能「HTML 语义化与标签」vs 章节「HTML 语义化与文档结构」——措辞不同即 0 分）。
 *   改为「分词重叠打分」：
 *     - 英文/数字词（>=2 字符）作为强信号（剔除 web/api/app 等过于泛化的词，否则会误命中无关章节）；
 *     - 中文按「长短语(>=3 字) + 2 字 bigram」拆词，长短语权重更高，避免单字噪声；
 *     - 同时用技能 desc（含大量关键词）参与打分，显著提升特异度与覆盖率；
 *     - 候选章节先用可靠的 chapters.module_id = track 过滤（sections.direction 列被污染，不可用）。
 *   评分：标题/章节名命中权重高，正文命中权重低（0.4）仅作补充；要求至少 1 个标题级命中，
 *   杜绝纯正文噪声。结果取分最高的若干小节，并缓存到 skill_section_map。
 */
const STOP_ENG = new Set(['web', 'api', 'app', 'ui', 'dev', 'cli', 'sdk', 'ide', 'os'])
const STOP_CN = new Set(['与', '和', '及', '或', '的', '了', '中', '在', '为', '对', '等', '其', '各', '能', '会', '类', '型', '系', '方', '法', '用', '于', '一', '个', '有', '是', '上', '下', '内', '外', '级', '高', '低', '新', '老', '主', '从', '并', '进', '通', '多', '基', '核', '常', '实'])
function normText(s: string) {
  return (s || '').toLowerCase().replace(/[\s,，。？?、；;：:！!().（）「」"'""'']/g, '')
}
function sectTokens(text: string, scale: number): { t: string; w: number }[] {
  const q = normText(text)
  const out: { t: string; w: number }[] = []
  const eng = q.match(/[a-z0-9]{2,}/g) || []
  for (const w of eng) { if (STOP_ENG.has(w)) continue; out.push({ t: w, w: 6 * scale }) }
  const runs = q.match(/[一-龥]+/g) || []
  for (const run of runs) {
    if (run.length === 1) continue
    if (run.length >= 3 && !STOP_CN.has(run)) out.push({ t: run, w: 3 * scale })
    for (let i = 0; i < run.length - 1; i++) {
      const g = run.slice(i, i + 2)
      if (!STOP_CN.has(g)) out.push({ t: g, w: 1 * scale })
    }
  }
  return out
}

// 章节静态数据（章节/正文不随请求变化），首次加载后模块级缓存，避免每次请求重查+重归一化正文。
let _sectionsCache: any[] | null = null
function loadSections() {
  if (_sectionsCache) return _sectionsCache
  const rows = sqlite.prepare(
    `SELECT s.id, s.title, c.id AS chapter_id, c.module_id AS module_id, c.title AS chapter_title, s.content
     FROM sections s JOIN chapters c ON c.id = s.chapter_id`
  ).all() as any[]
  _sectionsCache = rows.map((r) => {
    const head = normText(r.title) + ' ' + normText(r.chapter_title)
    return { ...r, head, body: head + ' ' + normText(r.content || '') }
  })
  return _sectionsCache
}

export function mapSkillToSections(track: string, skillName: string, desc = '', subtrackId = '', limit = 3): { id: string; title: string; chapterTitle: string; chapterId: string; moduleId: string; score: number }[] {
  // 可靠的按方向过滤：chapters.module_id 是指向 modules 的外键，方向值恰好等于路线图 track（frontend/backend/devops/ai）。
  const rows = loadSections().filter((r: any) => r.module_id === track && !NICHE_PREFIXES.some((p: string) => r.chapter_title.startsWith(p)))
  if (!rows.length) return []
  const toks = sectTokens(skillName, 1).concat(sectTokens(desc, 0.6))
  if (!toks.length) return []
  // 去重（同一词串只保留最高权重），避免「基础」同时出现在技能名与 desc 中被重复计数、绕过门控
  const seen = new Map<string, number>()
  for (const tk of toks) { const p = seen.get(tk.t); if (p === undefined || tk.w > p) seen.set(tk.t, tk.w) }
  const uniqToks = [...seen].map(([t, w]) => ({ t, w }))
  let best: any[] = []
  for (const r of rows) {
    let titleScore = 0, titleHits = 0, strongHit = false
    for (const tk of uniqToks) {
      if (r.head.includes(tk.t)) {
        titleScore += tk.w
        titleHits++
        if (tk.w >= 3) strongHit = true // 英文词(6)或中文长短语(3)视为强信号
      }
    }
    // 门控：至少命中一个强信号，或 ≥2 个标题级词；仅有 1 个标题级 bigram 视为弱关联，跳过（避免误导）
    if (!strongHit && titleHits < 2) continue
    let score = titleScore
    for (const tk of uniqToks) {
      if (!r.head.includes(tk.t) && r.body.includes(tk.t)) score += tk.w * 0.4 // 正文命中仅作弱补充
    }
    if (score < 2) continue
    best.push({ ...r, score })
  }
  best.sort((a: any, b: any) => b.score - a.score)
  best = best.slice(0, limit)
  // 缓存映射（带元数据，便于后续反向联动掌握度）
  const cache = sqlite.prepare(
    `INSERT OR REPLACE INTO skill_section_map (skill_key, section_id, track, subtrack_id, skill_name, score) VALUES (?,?,?,?,?,?)`
  )
  const key = skillKey(track, subtrackId, skillName)
  sqlite.transaction(() => { for (const b of best) cache.run(key, b.id, track, subtrackId, skillName, b.score) })()
  return best.map(({ id, title, chapter_title, chapter_id, module_id, score }) => ({ id, title, chapterTitle: chapter_title, chapterId: chapter_id, moduleId: module_id, score }))
}

/* ---------------- 细分赛道 → 真实章节（确定性，按赛道标签前缀精确查）----------------
 * 这些细分赛道已有「本站体系化课程」（章节标题以赛道标签前缀，如「鸿蒙 · …」），
 * 直接按章节标题前缀精确匹配，杜绝早期「鸿蒙→Vue」这类跨框架模糊错配。
 * 返回 null 表示该 subtrack 不是已知细分赛道，调用方应回退到 mapSkillToSections 模糊匹配；
 * 返回 []（空数组）表示「已查但暂无可匹配章节」（如后端细分赛道尚未生成），调用方应展示空而非回退模糊，避免误导。
 */
export const LEARN_KEYWORD: Record<string, string> = {
  // 前端侧细分赛道（已生成课程，key=路线图 subtrack id，value=章节标题前缀）
  'fe-harmony': '鸿蒙', 'fe-native': '原生', 'fe-app': '跨端', 'fe-uniapp': 'uni-app',
  'fe-miniprogram': '小程序', 'fe-desktop': '桌面', 'fe-viz': '可视化',
  // 后端 / 运维 / AI 侧（后续批次生成后将自动生效，key 待与路线图 id 对齐）
  'be-bigdata': '大数据', 'be-game': '游戏服务端', 'be-search': '搜索', 'be-sdet': 'SDET',
  'op-cloud': '云平台', 'ai-algo': '算法', 'ai-mlops': 'MLOps', 'ai-traindata': '训练数据',
  'ai-infr': 'AI Infra', 'ai-edge': '端侧AI'
}
// 章节标题前缀集合：模糊匹配路径只服务主流技能（细分赛道已走确定性查找），
// 因此排除这些带赛道标签前缀的章节，避免主流技能误混入细分赛道章节。
const NICHE_PREFIXES = Object.values(LEARN_KEYWORD).map((l) => l + ' ·')

export function mapSkillToNicheChapters(track: string, subtrackId: string): { id: string; title: string; chapterTitle: string; chapterId: string; moduleId: string; score: number }[] | null {
  const kw = LEARN_KEYWORD[subtrackId]
  if (!kw) return null // 非细分赛道 → 回退模糊匹配
  const rows = sqlite.prepare(
    `SELECT s.id, s.title, s.chapter_id, c.title AS chapter_title, c.module_id
     FROM sections s JOIN chapters c ON c.id = s.chapter_id
     WHERE c.module_id = ? AND c.title LIKE ?
     ORDER BY c.position, s.position`
  ).all(track, `${kw} · %`) as any[]
  // 注意：即便为空也返回 []（非 null），调用方据此展示「暂无匹配章节」而非回退模糊匹配
  return rows.map((r: any) => ({ id: r.id, title: r.title, chapterTitle: r.chapter_title, chapterId: r.chapter_id, moduleId: r.module_id, score: 0 }))
}

/* ---------------- 错题本（P2）+ 间隔复习 SRS ---------------- */
const SRS_INTERVALS = [1, 3, 7, 16, 30] // 天

export function recordWrongItem(userId: string, item: {
  source: string; itemId: string; track?: string; subtrackId?: string; skillKey?: string;
  q: string; userAnswer?: string; answer?: string
}) {
  const now = Date.now()
  const existing = sqlite.prepare('SELECT id, wrong_count FROM user_wrong_items WHERE user_id=? AND source=? AND item_id=?').get(userId, item.source, item.itemId) as any
  if (existing) {
    sqlite.prepare('UPDATE user_wrong_items SET wrong_count=wrong_count+1, created_at=? WHERE id=?').run(now, existing.id)
    return existing.id
  }
  const id = 'w_' + crypto.randomBytes(6).toString('hex')
  sqlite.prepare(
    `INSERT INTO user_wrong_items (id,user_id,source,item_id,track,subtrack_id,skill_key,q,user_answer,answer,next_review_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, userId, item.source, item.itemId, item.track || null, item.subtrackId || null, item.skillKey || null,
        item.q, item.userAnswer || null, item.answer || null, now, now)
  return id
}

export function listWrongItems(userId: string, dueOnly: boolean) {
  const now = Date.now()
  const rows = sqlite.prepare(
    `SELECT * FROM user_wrong_items WHERE user_id=? ORDER BY wrong_count DESC, created_at DESC`
  ).all(userId) as any[]
  return rows
    .filter(r => !dueOnly || r.next_review_at == null || r.next_review_at <= now)
    .map(r => ({ ...r, due: r.next_review_at == null || r.next_review_at <= now }))
}

// 分页版：默认每页 20，返回 { items, total, dueTotal, page, pageSize }
// 保持 listWrongItems 数组签名不变（单测依赖），分页走此函数。
export function listWrongItemsPaginated(userId: string, dueOnly: boolean, page = 1, pageSize = 20) {
  const now = Date.now()
  const rows = sqlite.prepare(
    `SELECT * FROM user_wrong_items WHERE user_id=? ORDER BY wrong_count DESC, created_at DESC`
  ).all(userId) as any[]
  const filtered = rows
    .filter(r => !dueOnly || r.next_review_at == null || r.next_review_at <= now)
    .map(r => ({ ...r, due: r.next_review_at == null || r.next_review_at <= now }))
  const total = filtered.length
  const dueTotal = filtered.filter(r => r.due).length
  const start = Math.max(0, (page - 1) * pageSize)
  const items = filtered.slice(start, start + pageSize)
  return { items, total, dueTotal, page, pageSize }
}

// action: 'review' 排期下次复习（SRS，按错误次数递增间隔）；'dismiss' 移除该项
export function actWrongItem(userId: string, id: string, action: string) {
  const row = sqlite.prepare('SELECT * FROM user_wrong_items WHERE id=? AND user_id=?').get(id, userId) as any
  if (!row) return null
  if (action === 'dismiss') {
    sqlite.prepare('DELETE FROM user_wrong_items WHERE id=?').run(id)
    return { removed: true }
  }
  if (action === 'review') {
    const idx = Math.min(SRS_INTERVALS.length - 1, (row.wrong_count || 1) - 1)
    const next = Date.now() + SRS_INTERVALS[idx] * 86400000
    sqlite.prepare('UPDATE user_wrong_items SET next_review_at=?, reviewed_at=? WHERE id=?').run(next, Date.now(), id)
    return { next_review_at: next }
  }
  return null
}
