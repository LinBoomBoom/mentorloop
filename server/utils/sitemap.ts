// sitemap 构建与缓存（B5 缓存 + B6 消除 N+1 嵌套查询）
import { sqlite } from './db'
import { techToSlug } from './interviewSlugs'

const BASE = (process.env.SITE_URL || 'https://mentorloop.example.com').replace(/\/$/, '')
const CACHE_TTL_MS = 3600_000 // 1 小时

let cache: { xml: string; at: number } | null = null

function group<T extends Record<string, any>>(rows: T[], key: string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const r of rows) {
    if (!m.has(r[key])) m.set(r[key], [])
    m.get(r[key])!.push(r)
  }
  return m
}

// 纯函数：根据当前库内容生成全部 URL（批量查询，避免逐节嵌套 SELECT 的 N+1）
export function buildSitemapUrls(base: string = BASE): string[] {
  const urls: string[] = ['', '/learn', '/interview', '/exam', '/vip'].map((p) => base + p)

  const modules = sqlite.prepare('SELECT id FROM modules').all() as any[]
  const chapters = sqlite.prepare('SELECT id, module_id FROM chapters').all() as any[]
  const sections = sqlite.prepare('SELECT id, chapter_id FROM sections').all() as any[]
  const sets = sqlite.prepare('SELECT id FROM exam_sets').all() as any[]

  const chapByMod = group(chapters, 'module_id')
  const secByChap = group(sections, 'chapter_id')

  for (const m of modules) {
    urls.push(`${base}/learn/${m.id}`)
    for (const ch of chapByMod.get(m.id) || []) {
      for (const s of secByChap.get(ch.id) || []) {
        urls.push(`${base}/learn/${m.id}/${ch.id}/${s.id}`)
      }
    }
  }
  for (const st of sets) urls.push(`${base}/exam/sets/${st.id}`)

  // 面试题库：方向页 + 技术子类页（slug 由 techToSlug 统一映射，与服务端/客户端一致）
  const tracks = sqlite.prepare("SELECT DISTINCT track FROM interview_questions").all() as any[]
  const techRows = sqlite.prepare(
    "SELECT DISTINCT track, tech FROM interview_questions WHERE tech IS NOT NULL AND tech != ''"
  ).all() as any[]
  const seen = new Set<string>()
  for (const t of tracks) urls.push(`${base}/interview/${t.track}`)
  for (const r of techRows) {
    const slug = techToSlug(r.tech)
    const key = r.track + '/' + slug
    if (seen.has(key)) continue
    seen.add(key)
    urls.push(`${base}/interview/${r.track}/${slug}`)
  }

  // 单题详情页：每道题一个独立可索引 URL（QAPage 结构化数据在各详情页注入），
  // 让 6565 道真题全部进入搜索引擎收录，最大化题库 SEO 价值。
  const qRows = sqlite.prepare(
    "SELECT id, track, tech FROM interview_questions WHERE id IS NOT NULL AND id != '' AND track IS NOT NULL AND track != ''"
  ).all() as any[]
  for (const r of qRows) {
    const slug = techToSlug(r.tech || '综合')
    urls.push(`${base}/interview/${r.track}/${slug}/${r.id}`)
  }
  return urls
}

export function getSitemapXml(base: string = BASE, force = false): string {
  const now = Date.now()
  if (!force && cache && now - cache.at < CACHE_TTL_MS) return cache.xml
  const urls = buildSitemapUrls(base)
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n'
  cache = { xml, at: now }
  return xml
}
