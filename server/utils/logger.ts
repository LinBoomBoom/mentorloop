// 结构化日志（C5 可观测性地基）
// 生产环境可写文件（data/logs/），开发仅控制台。错误钩子 server/plugins/error-log.ts 复用本模块。
import fs from 'node:fs'
import path from 'node:path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const currentLevel = LEVELS[(process.env.LOG_LEVEL as LogLevel)] || LEVELS.info

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'data', 'logs')
let fileEnabled = false
try {
  if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    fileEnabled = true
  }
} catch {
  /* 日志目录不可写时不阻断主流程 */
}

export function log(level: LogLevel, msg: string, meta?: any) {
  if (LEVELS[level] < currentLevel) return
  const entry = { t: new Date().toISOString(), level, msg, ...(meta !== undefined ? { meta } : {}) }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
  if (fileEnabled) {
    try {
      const file = level === 'error' ? 'error.log' : 'app.log'
      fs.appendFileSync(path.join(LOG_DIR, file), line + '\n')
    } catch {
      /* 文件写入失败忽略，控制台已输出 */
    }
  }
  return entry
}

export const logDebug = (m: string, meta?: any) => log('debug', m, meta)
export const logInfo = (m: string, meta?: any) => log('info', m, meta)
export const logWarn = (m: string, meta?: any) => log('warn', m, meta)
export const logError = (m: string, meta?: any) => log('error', m, meta)
