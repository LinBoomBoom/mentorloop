// 健康检查逻辑（C6）：抽离为纯函数便于单测，healthz 路由与 monitor-cron 复用。
import fs from 'node:fs'
import path from 'node:path'
import { sqlite } from './db'
import { DB_PATH } from './paths'

export interface HealthReport {
  status: 'ok' | 'degraded'
  time: string
  uptime: number
  memory: { rssMb: number }
  components: {
    db: 'up' | 'down'
    tts: 'ready' | 'missing'
    diskFreePct: number
  }
}

// 取数据卷所在文件系统的剩余空间百分比；无法探测返回 -1（不计入 degraded）。
function diskFreePct(dir: string): number {
  try {
    const stat = fs.statfsSync(dir)
    const total = stat.blocks * stat.bsize
    const free = stat.bavail * stat.bsize
    if (!total) return 100
    return Math.round((free / total) * 100)
  } catch {
    return -1
  }
}

// TTS 是否就绪：aliyun 需 DASHSCOPE_API_KEY；piper/edge/mock 仅需 provider 非空。
function ttsStatus(): 'ready' | 'missing' {
  const provider = process.env.TTS_PROVIDER
  if (!provider) return 'missing'
  if (provider === 'aliyun') return process.env.DASHSCOPE_API_KEY ? 'ready' : 'missing'
  return 'ready'
}

export function collectHealth(): HealthReport {
  let db: 'up' | 'down' = 'down'
  try {
    sqlite.prepare('SELECT 1').get()
    db = 'up'
  } catch {
    /* 仅标记，不抛出，便于监控区分"活但异常" */
  }

  const dataDir = path.dirname(DB_PATH)
  const diskFreePctValue = diskFreePct(dataDir)
  const tts = ttsStatus()
  // db 不可达，或磁盘剩余 < 10%（且可探测）即降级；-1 表示无法探测，不误报。
  const degraded = db === 'down' || (diskFreePctValue >= 0 && diskFreePctValue < 10)

  return {
    status: degraded ? 'degraded' : 'ok',
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: { rssMb: Math.round(process.memoryUsage().rss / 1048576) },
    components: {
      db,
      tts,
      diskFreePct: diskFreePctValue
    }
  }
}
