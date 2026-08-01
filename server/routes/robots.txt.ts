import { setResponseHeader } from 'h3'

export default defineEventHandler((event) => {
  const base = (process.env.SITE_URL || 'https://mentorloop.example.com').replace(/\/$/, '')
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    '',
    '# 登录态相关内容不收录',
    'Disallow: /login',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    ''
  ].join('\n')
})
