import { describe, it, expect, afterAll } from 'vitest'
import { useMinSeed, useTmpDb, cleanupTmp } from './helpers/tmp-env.mjs'

// B5/B6：sitemap URL 构建——批量查询（无 N+1）+ 缓存返回合法 XML。
// 本文件自建 m1/c1/s1 数据，不依赖真实课程内容，用最小种子避免临时库膨胀。
useMinSeed()
useTmpDb('sm')

const { sqlite } = await import('../server/utils/db')
const { buildSitemapUrls, getSitemapXml } = await import('../server/utils/sitemap')

afterAll(() => cleanupTmp({ sqlite }))

describe('B5/B6 sitemap 构建与缓存', () => {
  it('构建包含基础路由与层级内容 URL（批量查询，无逐节 N+1）', async () => {
    await sqlite.prepare("INSERT INTO modules (id,name,icon,color,desc,position) VALUES ('m1','前端','i','c','d',0)").run()
    await sqlite.prepare("INSERT INTO chapters (id,module_id,title,goal,position) VALUES ('c1','m1','基础','',0)").run()
    await sqlite.prepare("INSERT INTO sections (id,chapter_id,title,objective,content,position) VALUES ('s1','c1','变量','front','x',0)").run()
    await sqlite.prepare("INSERT INTO exam_sets (id,name,track,level,duration,vip_only) VALUES ('e1','模拟卷','front','中级',60,0)").run()

    const urls = await buildSitemapUrls('https://example.com')
    expect(urls).toContain('https://example.com/learn')
    expect(urls).toContain('https://example.com/learn/m1')
    expect(urls).toContain('https://example.com/learn/m1/c1/s1')
    expect(urls).toContain('https://example.com/exam/sets/e1')
  })

  it('getSitemapXml 返回合法 XML 且包含层级 URL', async () => {
    const xml = await getSitemapXml('https://example.com')
    expect(xml.startsWith('<?xml')).toBe(true)
    expect(xml).toContain('<loc>https://example.com/learn/m1/c1/s1</loc>')
  })
})
