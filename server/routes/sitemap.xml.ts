import { setResponseHeader } from 'h3'

// 动态生成 sitemap：遍历全部公开内容页（模块/章节/小节/试卷）
export default defineEventHandler((event) => {
  const base = (process.env.SITE_URL || 'https://mentorloop.example.com').replace(/\/$/, '')
  const urls: string[] = ['', '/learn', '/interview', '/exam', '/vip'].map((p) => base + p)

  const modules = sqlite.prepare('SELECT id FROM modules').all() as any[]
  for (const m of modules) {
    urls.push(`${base}/learn/${m.id}`)
    const chapters = sqlite.prepare('SELECT id FROM chapters WHERE module_id = ?').all(m.id) as any[]
    for (const ch of chapters) {
      const sections = sqlite.prepare('SELECT id FROM sections WHERE chapter_id = ?').all(ch.id) as any[]
      for (const s of sections) urls.push(`${base}/learn/${m.id}/${ch.id}/${s.id}`)
    }
  }
  const sets = sqlite.prepare('SELECT id FROM exam_sets').all() as any[]
  for (const st of sets) urls.push(`${base}/exam/sets/${st.id}`)

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n'

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
