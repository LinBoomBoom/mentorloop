// 题库 subtrack_detail（子主题级）回填 / 校验工具
// 映射来源: app/data/learningTaxonomy.ts 的 LEARNING_TAXONOMY（Track.id → chapterSubtracks）
//   题库 subtrack 是「赛道级」(fe-web/be-web…)，章节 subtrack 是「子主题级」(go/python/vue…)，
//   二者粒度不同无法直接关联。本脚本把赛道级展开为子主题级列表，写入 subtrack_detail（逗号包裹），
//   供 by-section / 题库 sd 过滤按子主题精准匹配，打通「学→练闭环」。
//
// 用法:
//   node scripts/tag-question-subtracks.mjs            # 幂等回填（仅补 NULL）
//   node scripts/tag-question-subtracks.mjs --check    # 仅校验覆盖率，不改库
//   node scripts/tag-question-subtracks.mjs --force    # 全量重算（覆盖已有值）
import Database from 'better-sqlite3'
import fs from 'node:fs'

const DB_PATH = 'data/devmentor.db'

// 赛道级 → 子主题级（与 learningTaxonomy.ts 保持同步）
const TRACK_TO_SUBTRACKS = {
  'fe-web': ['web', 'css', 'javascript', 'typescript', 'react', 'vue', 'performance', 'security'],
  'fe-arch': ['engineering'],
  'fe-harmony': ['harmony'],
  'fe-miniprogram': ['miniprogram'],
  'fe-app': ['flutter', 'reactnative'],
  'fe-native': ['native'],
  'fe-viz': ['echarts', 'd3', 'webgl'],
  'fe-desktop': ['electron', 'tauri'],
  'fe-mobile': ['mobile'],
  'fe-uniapp': ['uniapp'],
  'fe-node': ['nodefull'],
  'be-web': ['java', 'go', 'python'],
  'be-micro': ['system', 'micro', 'mq'],
  'be-db': ['mysql', 'postgresql', 'dbredis', 'dbnosql'],
  'be-data': ['offlinedw', 'realtime'],
  'be-game': ['gameserver'],
  'be-search': ['es', 'redis'],
  'be-test': ['sdet'],
  'op-trad': ['linux', 'network'],
  'op-sre': ['sre'],
  'op-devops': ['docker', 'cicd'],
  'op-k8s': ['k8s'],
  'op-cloud': ['cloud'],
  'op-sec': ['secops'],
  'ai-app': ['rag', 'prompt', 'agent'],
  'ai-infra': ['deploy'],
  'ai-mlops': ['mlflow', 'kubeflow', 'llmeval'],
  'ai-algo': ['cv', 'nlp', 'rec'],
  'ai-data': ['traindata'],
  'ai-edge': ['edgeai']
}

const mode = process.argv[2] || ''
const checkOnly = mode === '--check'
const force = mode === '--force'

if (!fs.existsSync(DB_PATH)) {
  console.error('DB not found:', DB_PATH)
  process.exit(1)
}

const db = new Database(DB_PATH)
const cols = db.prepare("PRAGMA table_info(interview_questions)").all().map((c) => c.name)
if (!cols.includes('subtrack_detail')) {
  if (checkOnly) { console.log('列 subtrack_detail 不存在（需先跑 db.ts v33 迁移）'); process.exit(0) }
  db.exec('ALTER TABLE interview_questions ADD COLUMN subtrack_detail TEXT')
  console.log('已新增列 subtrack_detail')
}

const total = db.prepare('SELECT COUNT(*) c FROM interview_questions').get().c
const knownTracks = new Set(Object.keys(TRACK_TO_SUBTRACKS))

// 未映射的 subtrack（题库里出现但不在映射表）
const unmapped = db.prepare(
  `SELECT subtrack, COUNT(*) c FROM interview_questions
   WHERE subtrack IS NOT NULL AND subtrack <> '' AND subtrack NOT IN (${[...knownTracks].map(() => '?').join(',')})
   GROUP BY subtrack ORDER BY c DESC`
).all(...knownTracks)

if (!checkOnly) {
  const upd = db.prepare(
    'UPDATE interview_questions SET subtrack_detail=? WHERE subtrack=? AND ' +
    (force ? '1=1' : "(subtrack_detail IS NULL OR subtrack_detail='')")
  )
  let changed = 0
  for (const [track, subs] of Object.entries(TRACK_TO_SUBTRACKS)) {
    changed += upd.run(',' + subs.join(',') + ',', track).changes
  }
  console.log(`回填完成: 变更 ${changed} 行`)
} else {
  console.log('校验模式: 未改动数据库')
}

const covered = db.prepare(
  "SELECT COUNT(*) c FROM interview_questions WHERE subtrack_detail IS NOT NULL AND subtrack_detail <> ''"
).get().c
const nullRows = total - covered
console.log(`题目总数: ${total}`)
console.log(`subtrack_detail 已覆盖: ${covered} (${((covered / total) * 100).toFixed(1)}%)`)
console.log(`未覆盖(NULL/空): ${nullRows}`)
if (unmapped.length) {
  console.log('⚠ 未映射的 subtrack（将保持 NULL，走关键词兜底）:')
  for (const r of unmapped) console.log(`   ${r.subtrack}: ${r.c} 题`)
} else {
  console.log('✓ 所有已知 subtrack 均已映射')
}
db.close()
