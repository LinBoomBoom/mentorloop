#!/usr/bin/env node
// L4「tech」标签定向重打标（词表扩展后的精准修复）
//
// 与 scripts/taxonomy-reclassify.mjs 的区别：
//   - 后者是 ai/be-data/op-sec 的全量重打（规则已调优，勿重复跑以免回归）；
//   - 本脚本是**定向**修复：只处理显式声明的 (赛道 × 原标签) 桶，零回归风险。
//
// 分类器：打分制（统计命中的独立正则数，取最高分；同分按候选声明顺序），
//         比「首匹配即返回」更能正确处理「对比 A 与 B」这类同时命中多个候选的题。
// 判定只用题干：答案文本覆盖面广，纳入会引入大量误判（历史教训）。
//
// 用法：
//   node scripts/retag-l4.mjs             # dry-run：变更前后分布 + 抽样明细
//   node scripts/retag-l4.mjs --samples N # dry-run 抽样条数（默认 12）
//   node scripts/retag-l4.mjs --apply     # 写库（自动备份 + 事务）

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'

const ROOT = process.cwd()
const DB_PATH = path.join(ROOT, 'data/devmentor.db')
const APPLY = process.argv.includes('--apply')
const SAMPLES = Number(process.argv[process.argv.indexOf('--samples') + 1]) || 12

function loadTs (rel, expr) {
  const code = `import('./${rel}').then(m => console.log(JSON.stringify(${expr})))`
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '-e', code], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  })
  return JSON.parse(out.trim().split('\n').pop())
}
const VOCAB = loadTs('app/data/techVocabulary.ts', 'm.TECH_VOCABULARY')
const termOf = (module, name) => VOCAB.find(v => v.module === module && v.name === name)

// ============================ 修复范围 ============================
// 每项：{ track, module, from: 需重打的原标签, cands: 候选(按同分优先级), default: 零分兜底 }
const SCOPES = [
  // ---------- A9：赛道本体标签缺失导致的错标 ----------
  {
    track: 'fe-app', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'Flutter', kw: [/Flutter/i, /Dart|\bWidget\b/, /go_router|ShellRoute|Navigator [12]\.0|BottomNavigationBar/, /Riverpod|Provider|ChangeNotifier|ValueNotifier/, /InheritedWidget/, /setState|StatefulWidget|StatelessWidget/, /BuildContext/, /\bbuild\(\)/] },
      // 注意：不要收录「桥接 / Bridge」——Flutter 与 RN 架构对比题会同时命中，
      // 导致 Flutter 题被判成 RN（xq-xp-c1f-s1-1 的教训）。
      { tech: 'React Native', kw: [/React Native|\bRN\b/, /原生模块|NativeModules/, /Metro|Hermes/, /FlatList/, /CodePush/] }
    ]
  },
  {
    track: 'fe-native', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'iOS', kw: [/\biOS\b/, /Swift|SwiftUI|UIKit/, /AppDelegate|SceneDelegate|UIScene/, /NavigationStack|NavigationView/, /Objective-?C/, /UIViewController|ViewController/, /@State|@Binding|@ObservedObject|@EnvironmentObject/] },
      { tech: 'Android', kw: [/Android/, /Activity|Fragment/, /Kotlin/, /Jetpack|Compose/, /Intent/, /RecyclerView|ViewModel/] }
    ]
  },
  {
    track: 'fe-desktop', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'Electron', kw: [/Electron/i, /主进程|渲染进程/, /BrowserWindow/, /ipcMain|ipcRenderer|contextBridge|preload/, /shell\.open|dialog\.show/, /asar/] },
      { tech: 'Tauri', kw: [/Tauri/i, /\bRust\b/] }
    ]
  },
  {
    track: 'fe-uniapp', module: 'frontend', from: ['Web 基础'], default: '综合应用',
    cands: [
      { tech: 'uni-app', kw: [/uni-?app/i, /uni\./, /onLoad|onReady|onShow/, /createSelectorQuery/] }
    ]
  },
  {
    track: 'fe-viz', module: 'frontend', from: ['Vue'], default: '综合应用',
    cands: [
      { tech: 'ECharts', kw: [/ECharts/i, /echarts-?for/] },
      { tech: 'React', kw: [/React/] }
    ]
  },
  {
    track: 'be-search', module: 'backend', from: ['MySQL'], default: '综合应用',
    cands: [
      { tech: 'Elasticsearch', kw: [/Elasticsearch|ElasticSearch/i, /\bES\b/, /Lucene/, /倒排索引|分词器|Mapping|ik_/] }
    ]
  },

  // ---------- A4：单一标签过度集中，需要细分 ----------
  {
    track: 'fe-viz', module: 'frontend', from: ['JavaScript'], default: 'JavaScript',
    cands: [
      { tech: 'ECharts', kw: [/ECharts/i, /setOption|\boption\s*[=.]|series\b/, /tooltip|legend/, /dataset|visualMap|dataZoom/, /图表实例|图表组件/] },
      { tech: 'D3', kw: [/\bD3\b|D3\.js/i, /\bd3\./, /力导向|force(Layout)?/, /比例尺|scaleLinear/, /selection\.data|enter\(\)|exit\(\)/] },
      { tech: 'WebGL', kw: [/WebGL/i, /Three\.?js/i, /GLSL|着色器|shader/i, /顶点着色|片元/, /纹理|texture/i, /点云|pointcloud/i] },
      { tech: 'Canvas', kw: [/Canvas/i, /\bSVG\b/, /getContext|2D 上下文/, /离屏|OffscreenCanvas/] },
      { tech: '可视化基础', kw: [/坐标系|笛卡尔|极坐标/, /投影/, /视觉编码/, /色阶|配色|调色/, /缩放|平移|brush/, /\bgeo\b|地图/] },
      { tech: '性能优化', kw: [/性能|卡顿|帧率|\bFPS\b/, /大数据量|万级|十万级|百万级/, /内存(占用|泄漏)/, /重绘|回流|repaint|reflow/, /增量渲染|虚拟滚动|降级渲染/] }
    ]
  },
  {
    track: 'be-db', module: 'backend', from: ['MySQL'], default: '数据库原理',
    // 权重说明：题面显式点名 MySQL 视为强信号（权重 2）。
    // 否则「MySQL 为什么用 B+ 树」这类"借 MySQL 讲通用原理"的题会被判成数据库原理，
    // 与「MySQL 慢查询排查」这类判成 MySQL 的结果自相矛盾。
    cands: [
      { tech: 'MySQL', kw: [[/MySQL/i, 2], /InnoDB|MyISAM/i, /binlog/i, /redo ?log|undo ?log/i, /聚簇索引|回表|覆盖索引|最左前缀/, /GTID|半同步|\bMGR\b/, /Buffer Pool|change buffer|doublewrite/i, /自适应哈希/] },
      { tech: 'PostgreSQL', kw: [[/PostgreSQL|Postgres/i, 2], /\bPG\b/, /\bpg_/] },
      { tech: 'Redis', kw: [[/Redis/i, 2]] },
      { tech: 'NoSQL', kw: [[/MongoDB|Mongo/i, 2], [/NoSQL/i, 2], [/Cassandra|HBase/i, 2], /文档数据库|键值数据库|列族|图数据库/] },
      { tech: 'Elasticsearch', min: 2, kw: [[/Elasticsearch|ElasticSearch/i, 2], /Lucene|倒排索引|bool 查询|分词器/] },
      { tech: '数据库原理', kw: [/索引/, /B\+ ?树|\bB ?树\b|BTree/i, /事务|\bACID\b/, /隔离级别|\bMVCC\b/, /死锁|行锁|表锁|间隙锁|next-key/i, /执行计划|\bExplain\b/i, /范式|ER ?图|ER 模型/, /查询优化|慢查询/, /一致性|\bCAP\b|\bBASE\b/, /连接池/, /备份|恢复|容灾/, /数据类型|字段类型|字符集|排序规则/] }
    ]
  },
  {
    track: 'ai-algo', module: 'ai', from: ['模型与训练'], default: '模型与训练',
    // 「模型与训练」必须作为显式候选参与打分，而不是只当兜底：
    // 否则「CNN/RNN/Transformer 结构对比」「梯度下降」这类通用训练理论题，
    // 会因题干顺带出现「图像」一词（权重 1 > 兜底 0）被误判为 CV。
    // 注意顺序：模型与训练放首位。领域标签只有**明确压过**通用训练理论时才生效，
    // 避免「CNN/RNN/Transformer 结构对比」这类通用题因平局被判成 CV。
    cands: [
      { tech: '模型与训练', kw: [/梯度|反向传播|优化器|学习率/, /损失函数|交叉熵|正则化|Dropout/, /过拟合|欠拟合|泛化/, /Transformer|自注意力|RNN|LSTM|GRU/i, /线性回归|逻辑回归|决策树|随机森林/, /特征工程|标准化|归一化/, /\bepoch\b|batch size|批大小|收敛/, /PyTorch|TensorFlow|\btorch\b/i, /实验(方案|设计)|消融|对照实验|可复现|精度提升|随机种子/] },
      // min:2 —— 领域标签要求题干至少命中 2 个独立领域信号，
      // 否则「CNN/RNN/Transformer 结构对比」「训练图像分类模型」这类通用题会被误划入 CV。
      { tech: 'CV', min: 2, kw: [/\bCV\b|计算机视觉/i, /图像分类|图像识别|图像处理|视觉模型/, /\bCNN\b|卷积/, /目标检测|\bYOLO\b|R-?CNN/, /语义分割|实例分割|图像分割/, /\bOCR\b|人脸识别|目标跟踪|关键点/, /ResNet|\bViT\b|Vision Transformer/i] },
      { tech: 'NLP', min: 2, kw: [/\bNLP\b|自然语言/i, /\bBERT\b|RoBERTa|ALBERT/, /分词|tokeniz/i, /词向量|Word2Vec|GloVe/i, /文本分类|情感分析|命名实体|\bNER\b/, /语言模型/, /\bBPE\b|子词/] },
      { tech: '推荐系统', min: 2, kw: [/推荐(系统|算法|模型)|Recommender|RecSys/i, /召回|粗排|精排|重排/, /\bCTR\b|点击率|转化率/, /双塔|DSSM|Wide ?& ?Deep|DeepFM|\bDIN\b/, /协同过滤|矩阵分解/, /冷启动|探索与利用|\bEE\b/, /用户画像|物品画像/] }
    ]
  }
]

// ============================ 判定 ============================
function classify (text, scope) {
  let best = null, bestScore = 0
  for (const c of scope.cands) {
    let s = 0
    for (const p of c.kw) {
      // kw 项支持两种写法：RegExp（权重 1）或 [RegExp, weight]（显式权重）
      const [re, w] = Array.isArray(p) ? [p[0], p[1]] : [p, 1]
      if (re.test(text)) s += w
    }
    // min：该候选生效的最低分。用于给「领域标签」设门槛——
    // 题干只有 1 个弱信号（如顺带提到「图像」）不足以推翻通用标签。
    if (s < (c.min || 1)) continue
    if (s > bestScore) { bestScore = s; best = c.tech }
  }
  return { tech: bestScore > 0 ? best : scope.default, score: bestScore }
}

// ============================ 主流程 ============================
const db = new Database(DB_PATH, { readonly: !APPLY })

// 安全校验：所有候选与兜底标签必须被该赛道允许，否则宁可不跑
for (const sc of SCOPES) {
  for (const name of [...sc.cands.map(c => c.tech), sc.default]) {
    const term = termOf(sc.module, name)
    if (!term) throw new Error(`词表缺少术语：${sc.module}/${name}`)
    if (term.allowTracks !== '*' && !term.allowTracks.includes(sc.track)) {
      throw new Error(`术语「${name}」不允许出现在赛道 ${sc.track}`)
    }
  }
}

const OUT = []
const P = s => { OUT.push(s); }
let totalChanges = 0

for (const sc of SCOPES) {
  const ph = sc.from.map(() => '?').join(',')
  const rows = db.prepare(
    `select id, subtrack, tech, q from interview_questions where subtrack = ? and tech in (${ph})`
  ).all(sc.track, ...sc.from)

  const before = {}, after = {}
  const changes = []
  const samplesByTech = {}
  for (const r of rows) {
    before[r.tech] = (before[r.tech] || 0) + 1
    const text = String(r.q || '').slice(0, 800)
    const { tech, score } = classify(text, sc)
    after[tech] = (after[tech] || 0) + 1
    if (tech !== r.tech) changes.push({ id: r.id, old: r.tech, neu: tech, score, q: String(r.q || '').replace(/\s+/g, ' ').slice(0, 100) })
    ;(samplesByTech[tech] ||= []).push({ id: r.id, score, q: String(r.q || '').replace(/\s+/g, ' ').slice(0, 100) })
  }

  // 该赛道重打后的最终全局分布：先扣掉本次重打桶的原有计数，再加上新判定计数。
  // （此前直接 set 会覆盖范围外同名标签的存量计数，导致占比算错。）
  const all = db.prepare('select tech, count(*) c from interview_questions where subtrack = ? group by tech').all(sc.track)
  const finalMap = new Map(all.map(r => [r.tech, r.c]))
  for (const [t, c] of Object.entries(before)) finalMap.set(t, (finalMap.get(t) || 0) - c)
  for (const [t, c] of Object.entries(after)) finalMap.set(t, (finalMap.get(t) || 0) + c)
  for (const [t, c] of [...finalMap]) if (c <= 0) finalMap.delete(t)
  const finalTotal = [...finalMap.values()].reduce((a, b) => a + b, 0)
  const top = [...finalMap.entries()].sort((a, b) => b[1] - a[1])[0]

  P('')
  P(`===== ${sc.track} · 重打范围 [${sc.from.join(' / ')}] (${rows.length} 题) =====`)
  P(`  判定分布： ` + Object.entries(after).map(([k, v]) => `${k} ${v}`).join(' | '))
  P(`  重打后赛道全局 TOP：` + [...finalMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([k, v]) => `${k} ${v}(${(v / finalTotal * 100).toFixed(0)}%)`).join(' | '))
  P(`  最大占比：${top[0]} ${(top[1] / finalTotal * 100).toFixed(0)}%`)
  P(`  变更 ${changes.length} 题`)
  for (const t of Object.keys(after)) {
    P(`  -- 抽查「${t}」--`)
    for (const s of (samplesByTech[t] || []).slice(0, SAMPLES)) P(`     [${s.score}] ${s.q}`)
  }
  totalChanges += changes.length
  sc._changes = changes
}

fs.writeFileSync(path.join(ROOT, '.workbuddy/_retag-dryrun.txt'), OUT.join('\n'), 'utf8')
console.log(OUT.join('\n'))
console.log(`\n合计变更 ${totalChanges} 题；明细已写入 .workbuddy/_retag-dryrun.txt`)

if (!APPLY) { console.log('[dry-run] 未写库。加 --apply 执行。'); process.exit(0) }

const bak = `${DB_PATH}.bak-${Date.now()}`
fs.copyFileSync(DB_PATH, bak)
console.log('\n已备份：' + path.basename(bak))
const upd = db.prepare('update interview_questions set tech = ? where id = ?')
const tx = db.transaction(list => { for (const c of list) upd.run(c.neu, c.id) })
const all = SCOPES.flatMap(s => s._changes || [])
tx(all)
console.log(`已更新 ${all.length} 题`)
