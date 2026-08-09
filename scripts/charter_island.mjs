/**
 * charter_island.mjs — 技能树孤岛治理（宪章「可导航」红线外首项）
 *
 * 目标：为「完全孤岛」节（无入链且无出链）补 doc: 互链，使知识图谱可导航。
 * 纪律（沿用宪章 / charter_fix.mjs）：
 *   1. 零 schema 漂移 —— 只改 section.content markdown，不动种子结构/字段。
 *   2. 幂等 —— 只处理"无出链 doc:"的节；重跑时孤岛集为空 → 0 变更。
 *   3. 链接全部有效 —— 目标 ID 必须存在于种子（审计也强制 0 失效）。
 *   4. 链接有意义 —— 三层级：同章兄弟 / 上游前置章 / 跨模块桥接（课程路径对齐）。
 *
 * 用法：
 *   node charter_island.mjs --dry        # 预览，不写文件
 *   node charter_island.mjs              # 实跑，写 data/seed-content.json
 *   node charter_island.mjs --verbose    # 打印每节新增链接
 */
import fs from 'node:fs';

const SEED = './data/seed-content.json';
const DRY = process.argv.includes('--dry');
const VERBOSE = process.argv.includes('--verbose');

const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const LINK_RE = /\[[^\]]*\]\(doc:([a-z]+)\/([a-z0-9-]+)\/([a-z0-9-]+)\)/g;

// ---- 索引 ----
const valid = new Set();           // "module/chapter/section"
const idx = {};                    // secId -> {module,chapter,title,content,key}
const full = {};                   // secId -> "module/chapter/section"
const chapters = {};               // chId -> {module,title,sections:[secId]}
const moduleOrder = {};            // module -> [chId...]  (学习路径顺序)

for (const m of seed.modules) {
  moduleOrder[m.id] = [];
  for (const c of m.chapters) {
    moduleOrder[m.id].push(c.id);
    chapters[c.id] = { module: m.id, title: c.title, sections: [] };
    for (const s of c.sections) {
      const key = `${m.id}/${c.id}/${s.id}`;
      valid.add(key);
      idx[s.id] = { module: m.id, chapter: c.id, title: s.title, content: s.content, key };
      full[s.id] = key;
      chapters[c.id].sections.push(s.id);
    }
  }
}

// ---- 当前出链检测（用于幂等：只处理无出链节）----
const hasOutbound = (secId) => {
  const c = idx[secId].content; let m; LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(c))) {
    if (valid.has(`${m[1]}/${m[2]}/${m[3]}`)) return true;
  }
  return false;
};
const secByKey = (k) => Object.keys(full).find(s => full[s] === k);

// ---- 课程路径感知的链接计划 ----
// PARENT：同模块内"前置基础"章（该章内容建立于其上）。缺省回退为上一张。
const PARENT = {
  'fe-c2':['fe-c1'], 'fe-c3':['fe-c1'], 'fe-c4':['fe-c3'], 'fe-c5':['fe-c3','fe-c1'],
  'fe-c6':['fe-c5'], 'fe-c7':['fe-c3'], 'fe-c8':['fe-c7'], 'fe-c9':['fe-c7','fe-c8'],
  'fe-c10':['fe-c7','fe-c8'], 'fe-c11':['fe-c9','fe-c10'], 'fe-c12':['fe-c9','fe-c10'],
  'fe-c13':['fe-c6','fe-c9'], 'fe-c14':['fe-c5'], 'fe-c15':['fe-c8'], 'fe-c16':['fe-c3'],
  'fe-c17':['fe-c9','fe-c10'], 'fe-c18':['fe-c5'],
  'be-jvm':['be-c1'], 'be-dsa':['be-c1'], 'be-net':['be-c1'], 'be-os':['be-c1'],
  'be-c2':['be-os','be-net'], 'be-mq':['be-net','be-dist'], 'be-c3':['be-c1'],
  'be-msa':['be-c3','be-dist'], 'be-dist':['be-net','be-os'], 'be-c4':['be-dist','be-c2'],
  'be-c5':['be-c1'], 'be-sec':['be-net','be-c2'], 'be-test':['be-c1'],
  'be-api':['be-net','be-c3'], 'be-nosql':['be-c2','be-dist'],
  'op-c2':['op-c1'], 'op-c3':['op-c1'], 'op-c4':['op-c2','op-c3'],
  'op-c5':['op-c1','op-c3'], 'op-c6':['op-c1'], 'op-c7':['op-c3'],
};
// BRIDGES：有向跨模块/远相关桥接 [from, to, note]
const BRIDGES = [
  // 服务端 JS 双栖
  ['fe-c16','be-c1','前端 Node 与后端语言/并发模型一脉相承'],
  ['be-c1','fe-c16','后端工程师理解 Node 服务端 JS 的捷径'],
  // API 设计三角
  ['be-api','fe-c5','前端通过 fetch/DOM 消费 API'],
  ['fe-c5','be-api','前端调用方应懂后端 API 设计契约'],
  ['be-api','op-c2','网关(Nginx)是 API 的流量入口'],
  ['op-c2','be-api','运维视角下的 API 网关与路由'],
  // 存储双章
  ['be-c2','op-c6','MySQL/Redis 的运维视角在 DBA 章'],
  ['op-c6','be-c2','DBA 视角回看后端存储层'],
  ['be-nosql','be-c2','NoSQL 与关系型存储互补'],
  ['be-c2','be-nosql','关系型之外还有 NoSQL 与搜索'],
  // 微服务梯队
  ['be-mq','be-msa','消息队列是微服务解耦基石'],
  ['be-dist','be-msa','分布式核心支撑微服务'],
  ['op-c3','be-msa','K8s 是微服务的部署载体'],
  ['be-msa','op-c3','微服务最终跑在容器编排上'],
  // CI/CD 衔接构建
  ['op-c4','fe-c8','前端构建产物进入 CI/CD'],
  ['op-c4','be-c3','后端构建(Boot)进入 CI/CD'],
  ['fe-c8','op-c4','工程化构建是持续交付的一环'],
  // 安全三章互链
  ['fe-c14','be-sec','前端安全需配合后端认证授权'],
  ['be-sec','fe-c14','后端安全要在前端落地'],
  ['be-sec','op-c5','安全治理延伸到 SRE'],
  ['op-c5','be-sec','SRE 视角的认证与防护'],
  ['fe-c14','op-c5','安全与 SRE 成本治理交集'],
  // 测试双章
  ['fe-c12','be-test','前后端测试方法论互通'],
  ['be-test','fe-c12','后端测试视角补充前端测试'],
  // 性能三角
  ['fe-c13','be-c4','前端性能需后端高并发支撑'],
  ['be-c4','fe-c13','高并发系统设计含前端性能'],
  ['be-c4','op-c5','高并发稳定性靠 SRE'],
  ['op-c5','be-c4','SRE 保障高并发系统'],
  // 设计模式双章
  ['fe-c17','be-c5','前后端设计模式同源'],
  ['be-c5','fe-c17','后端架构原则补充前端模式'],
  // 网络三章
  ['be-net','op-c2','计算机网络在 Nginx 落地'],
  ['op-c2','be-net','Nginx 是计算机网络的实践'],
  ['be-net','fe-c6','网络栈延伸到浏览器'],
  ['fe-c6','be-net','浏览器网络基于计算机网'],
  // OS 双章
  ['be-os','op-c1','操作系统基础在 Linux/Shell 实践'],
  ['op-c1','be-os','Linux 运维依赖 OS 原理'],
  // 分布式与 K8s
  ['be-dist','op-c3','分布式系统跑在 K8s 上'],
  ['op-c3','be-dist','容器编排承载分布式系统'],
];
// 去掉占位
const BR = BRIDGES.filter(b => b[2] !== '');

// 章锚点节（默认首节；可在此覆盖）
const anchorOf = (chId) => chapters[chId]?.sections[0];

function buildTargets(secId) {
  const meta = idx[secId];
  const chId = meta.chapter;
  const sibs = chapters[chId].sections;
  const i = sibs.indexOf(secId);
  const targets = new Map(); // secId -> note

  // 1) 同章兄弟：最近 2 个（前后各一）
  const neigh = [];
  if (i - 1 >= 0) neigh.push(sibs[i-1]);
  if (i + 1 < sibs.length) neigh.push(sibs[i+1]);
  if (neigh.length < 2) { // 端点补另一侧
    if (i - 2 >= 0) neigh.push(sibs[i-2]);
    if (i + 2 < sibs.length) neigh.push(sibs[i+2]);
  }
  for (const s of neigh) if (s !== secId) targets.set(s, '同章相关小节');

  // 2) 上游前置章
  const parents = PARENT[chId] || (() => {
    const ord = moduleOrder[meta.module]; const pi = ord.indexOf(chId);
    return pi > 0 ? [ord[pi-1]] : [];
  })();
  for (const p of parents) {
    const a = anchorOf(p);
    if (a && a !== secId) targets.set(a, `前置基础：${chapters[p].title.replace(/^第.+?章\s*·\s*/, '')}`);
  }

  // 3) 桥接
  for (const [from, to, note] of BR) {
    if (from !== chId) continue;
    const a = anchorOf(to);
    if (a && a !== secId) targets.set(a, note);
  }
  return targets;
}

// ---- 执行 ----
let changed = 0;
const preview = [];
for (const secId of Object.keys(idx)) {
  if (hasOutbound(secId)) continue;           // 幂等：已连通则跳过
  const targets = buildTargets(secId);
  if (targets.size === 0) continue;

  // 生成 bullet 行
  const bullets = [...targets.entries()].map(([t, note]) => {
    const tMeta = idx[t];
    const link = `[${tMeta.title}](doc:${tMeta.module}/${tMeta.chapter}/${t})`;
    return note ? `- ${link} — ${note}` : `- ${link}`;
  }).join('\n');

  const block = `\n\n## 相关知识图谱\n${bullets}`;
  const content = idx[secId].content;

  if (content.includes('相关知识图谱')) {
    // 已存在标题（极少见）：在标题行后追加
    const lines = content.split('\n');
    const hi = lines.findIndex(l => l.includes('相关知识图谱'));
    const insBullets = bullets.split('\n').map(b => b.replace(/^/, ''));
    lines.splice(hi + 1, 0, ...insBullets);
    idx[secId].content = lines.join('\n');
  } else {
    idx[secId].content = content + block;
  }
  changed++;
  if (VERBOSE || DRY) preview.push({ secId, n: targets.size, links: [...targets.keys()] });
}

if (DRY) {
  console.log(`[DRY] 将为 ${changed} 个孤岛节追加相关知识图谱块（不写文件）`);
  if (VERBOSE) for (const p of preview.slice(0, 12)) console.log(`  ${p.secId} +${p.n}: ${p.links.join(', ')}`);
  console.log(`[DRY] 样本预览上限 12；总 ${changed} 节。`);
  process.exit(0);
}

// 写回
for (const m of seed.modules) {
  for (const c of m.chapters) {
    for (const s of c.sections) {
      if (idx[s.id].content !== s.content) s.content = idx[s.id].content;
    }
  }
}
fs.writeFileSync(SEED, JSON.stringify(seed, null, 2));
console.log(`✅ 已为 ${changed} 个孤岛节写入相关知识图谱互链 → ${SEED}`);
console.log('   下一步：_reseed.mjs 重灌（用户无损）后跑 skilltree_audit 复核。');
