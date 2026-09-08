// 统一数据目录解析（桌面端 Electron 集成用）。
//
// 设计要点：
// - 默认回退 process.cwd()，因此 **Web 端行为完全不变**（DATA_DIR 不设置时与历史一致）。
// - 桌面端由 Electron 主进程注入 DATA_DIR（指向 app.getPath('userData') 下的子目录），
//   使更好的 SQLite 库、日志、TTS 缓存、Piper 模型等全部落在有写权限的用户目录，
//   避免安装在 Program Files 等只读路径导致启动崩溃。
//
// ⚠️ DATA_DIR 必须压倒 .env 的 DB_PATH：
// 仓库根的 .env 里有 `DB_PATH=data/devmentor.db`（web dev 用的相对路径），
// Nitro 启动时 dotenv 会从 cwd 向上找 .env 并把它注入 process.env。生产态下
// electron node 子进程 cwd = resourcesPath（如 E:\MentorLoop\resources），
// 如果让 .env 的 DB_PATH 生效，DB 会建到 `resources/data/devmentor.db`（一个空文件），
// 桌面端永远读不到 userData 里的真实库 —— 这是「覆盖安装后仍是旧内容」的第二根因。
// 因此：只要 DATA_DIR 被显式设置（桌面端必经路径），DB_PATH/SEED_PATH 等一律从 DATA_DIR 派生。
import path from 'node:path'

const _hasDataDir = !!process.env.DATA_DIR
const _dataDir = _hasDataDir ? process.env.DATA_DIR! : process.cwd()

export const DATA_DIR = _dataDir

// 桌面端：DATA_DIR 优先；Web 端：保留 .env 的 DB_PATH 兜底（向后兼容）
export const DB_PATH = _hasDataDir
  ? path.join(_dataDir, 'data', 'devmentor.db')
  : (process.env.DB_PATH || path.join(_dataDir, 'data', 'devmentor.db'))
export const SEED_PATH = path.join(_dataDir, 'data', 'seed-content.json')
export const LOG_DIR = process.env.LOG_DIR || path.join(_dataDir, 'data', 'logs')
export const TTS_CACHE_DIR = path.join(_dataDir, 'data', 'media', 'tts')
export const PIPER_BIN =
  process.env.PIPER_BIN ||
  (process.platform === 'win32'
    ? path.join(_dataDir, 'data', 'piper', 'piper.exe')
    : path.join(_dataDir, 'data', 'piper', 'piper'))
export const PIPER_MODELS_DIR = process.env.PIPER_MODELS_DIR || path.join(_dataDir, 'data', 'piper', 'models')
