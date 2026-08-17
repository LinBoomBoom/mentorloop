// 统一数据目录解析（桌面端 Electron 集成用）。
//
// 设计要点：
// - 默认回退 process.cwd()，因此 **Web 端行为完全不变**（DATA_DIR 不设置时与历史一致）。
// - 桌面端由 Electron 主进程注入 DATA_DIR（指向 app.getPath('userData') 下的子目录），
//   使更好的 SQLite 库、日志、TTS 缓存、Piper 模型等全部落在有写权限的用户目录，
//   避免安装在 Program Files 等只读路径导致启动崩溃。
import path from 'node:path'

export const DATA_DIR = process.env.DATA_DIR || process.cwd()

export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'data', 'devmentor.db')
export const SEED_PATH = path.join(DATA_DIR, 'data', 'seed-content.json')
export const LOG_DIR = process.env.LOG_DIR || path.join(DATA_DIR, 'data', 'logs')
export const TTS_CACHE_DIR = path.join(DATA_DIR, 'data', 'media', 'tts')
export const PIPER_BIN =
  process.env.PIPER_BIN ||
  (process.platform === 'win32'
    ? path.join(DATA_DIR, 'data', 'piper', 'piper.exe')
    : path.join(DATA_DIR, 'data', 'piper', 'piper'))
export const PIPER_MODELS_DIR = process.env.PIPER_MODELS_DIR || path.join(DATA_DIR, 'data', 'piper', 'models')
