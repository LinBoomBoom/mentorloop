import { describe, it, expect, afterEach } from 'vitest'
import { buildHealthUrl, shouldAlert, formatAlert } from '../scripts/monitor-cron.mjs'

const saved = { HEALTH_URL: process.env.HEALTH_URL, SITE_URL: process.env.SITE_URL }
afterEach(() => {
  if (saved.HEALTH_URL === undefined) delete process.env.HEALTH_URL
  else process.env.HEALTH_URL = saved.HEALTH_URL
  if (saved.SITE_URL === undefined) delete process.env.SITE_URL
  else process.env.SITE_URL = saved.SITE_URL
})

describe('monitor-cron 纯函数', () => {
  it('buildHealthUrl 优先用 HEALTH_URL 并去尾斜杠', () => {
    process.env.HEALTH_URL = 'https://h.example.com/healthz/'
    expect(buildHealthUrl()).toBe('https://h.example.com/healthz')
  })

  it('buildHealthUrl 回落 SITE_URL + /healthz', () => {
    delete process.env.HEALTH_URL
    process.env.SITE_URL = 'https://app.example.com/'
    expect(buildHealthUrl()).toBe('https://app.example.com/healthz')
  })

  it('shouldAlert：探活失败为 true', () => {
    expect(shouldAlert(null)).toBe(true)
  })

  it('shouldAlert：db down 为 true', () => {
    expect(shouldAlert({ status: 'ok', components: { db: 'down' } })).toBe(true)
  })

  it('shouldAlert：status degraded 为 true', () => {
    expect(shouldAlert({ status: 'degraded' })).toBe(true)
  })

  it('shouldAlert：正常为 false', () => {
    expect(shouldAlert({ status: 'ok', components: { db: 'up' } })).toBe(false)
  })

  it('formatAlert 含 url 与 report', () => {
    const s = formatAlert({ status: 'ok' }, 'https://x/healthz', null)
    expect(s).toContain('https://x/healthz')
    expect(s).toContain('ok')
  })
})
