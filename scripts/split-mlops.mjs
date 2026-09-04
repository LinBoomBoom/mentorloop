// 一次性执行器：将 ai 模块 `eval` subtrack 拆分为 mlflow / kubeflow / llmeval 三个独立子主题。
// 形态 C（参考前次 be-db / be-data）：仅改章节 subtrack，不删除、不重排 position，内容零改写。
// 双写 data/seed-content.json（真源）+ data/devmentor.db（本地库）。支持 --dry-run、幂等可重跑。
//
// 拆分依据（探测结论，零猜测）：
//   ai-c5        : MLOps·评估体系与观测（RAG 评估/LLM-as-judge/tracing）→ llmeval
//   mlp-c1~c3    : MLflow 实验追踪 / 模型注册 / 项目流水线           → mlflow
//   mlp-c4~c6    : Kubeflow 基础 / Pipelines / KFServing 部署监控     → kubeflow
import fs from 'node:fs'
import Database from 'better-sqlite3'

const SEED_PATH = './data/seed-content.json'
const DB_PATH = './data/devmentor.db'
const DRY = process.argv.includes('--dry-run')

// 精确映射：章节 id → 目标 subtrack
const MAP = {
  'ai-c5': 'llmeval',
  'mlp-c1': 'mlflow',
  'mlp-c2': 'mlflow',
  'mlp-c3': 'mlflow',
  'mlp-c4': 'kubeflow',
  'mlp-c5': 'kubeflow',
  'mlp-c6': 'kubeflow',
}
const TARGETS = Object.values(MAP)
const EXPECT = Object.keys(MAP)

function transformSeed() {
  const raw = fs.readFileSync(SEED_PATH, 'utf-8')
  const content = JSON.parse(raw)
  const mod = content.modules.find((m) => m.id === 'ai')
  if (!mod) throw new Error('ai module not found')
  const orig = mod.chapters.filter((c) => EXPECT.includes(c.id))
  const byId = Object.fromEntries(orig.map((c) => [c.id, c]))
  const missing = EXPECT.filter((id) => !byId[id])
  if (missing.length) throw new Error('seed 缺少章节: ' + missing.join(','))

  // 幂等：已全部分配到目标 subtrack 则视为已完成（跳过变换）
  const already = orig.every((c) => MAP[c.id] === c.subtrack)
  if (already) {
    console.log('[seed] 已处于目标状态（幂等跳过）')
    return { content, targets: orig }
  }
  for (const c of orig) c.subtrack = MAP[c.id]
  return { content, targets: orig }
}

function applyDb(targets) {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  const upd = db.prepare('UPDATE chapters SET subtrack=? WHERE id=?')
  const tx = db.transaction(() => {
    for (const c of targets) upd.run(MAP[c.id], c.id)
  })
  tx()
  db.close()
}

if (DRY) {
  const mod = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')).modules.find((m) => m.id === 'ai')
  const chapters = mod.chapters.filter((c) => EXPECT.includes(c.id))
  console.log('[dry-run] 将变更 subtrack 的章节:')
  for (const c of chapters) {
    const cur = c.subtrack
    const next = MAP[c.id]
    console.log(`  ${c.id.padEnd(8)} ${cur.padEnd(10)} → ${next.padEnd(10)} | ${c.title}`)
  }
  console.log('[dry-run] 目标 subtrack 计数:', TARGETS.join(', '))
  console.log('[dry-run] 未做任何修改')
} else {
  const { content, targets } = transformSeed()
  fs.writeFileSync(SEED_PATH, JSON.stringify(content))
  console.log(`[seed] 已写入 ${targets.length} 章的新 subtrack`)
  applyDb(targets)
  console.log('完成。ai-mlops 赛道现为 MLflow / Kubeflow / LLM 评估 三个严格子主题。')
}
