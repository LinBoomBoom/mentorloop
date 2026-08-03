import { setResponseHeader } from 'h3'

// 动态生成 sitemap：复用 server/utils/sitemap 的缓存构建（B5 缓存 + B6 批量查询）
export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return getSitemapXml()
})
