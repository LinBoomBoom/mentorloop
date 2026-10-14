import { describe, it, expect, afterAll } from 'vitest'
import { useMinSeed, useTmpDb, cleanupTmp } from './helpers/tmp-env.mjs'

// 独立临时库：collectHealth 会经 db.ts 打开数据库，此前会落到仓库 data/devmentor.db 并在启动时写迁移/清理。
useMinSeed()
useTmpDb('health')

const { collectHealth } = await import('../server/utils/health')
// 仅为收尾关闭句柄（Windows 下不关句柄会删不掉临时目录）
const { sqlite } = await import('../server/utils/db')

afterAll(() => cleanupTmp({ sqlite }))

describe('collectHealth (C6 组件级健康)', () => {
  it('返回结构化健康报告，含组件级状态', async () => {
    const h = await collectHealth()
    expect(['ok', 'degraded']).toContain(h.status)
    expect(h.components).toHaveProperty('db')
    expect(h.components).toHaveProperty('tts')
    expect(['ready', 'missing']).toContain(h.components.tts)
    expect(typeof h.components.diskFreePct).toBe('number')
    expect(h.memory).toHaveProperty('rssMb')
    expect(typeof h.uptime).toBe('number')
  })
})
