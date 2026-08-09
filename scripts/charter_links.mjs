/**
 * charter_links.mjs — 互链质量审 / 相关性红线（宪章「可导航」红线延伸）
 *
 * 政策：doc: 互链分三类，均带相关性约束——
 *   1) 同章兄弟（同 chapter）—— 天然相关，放行；
 *   2) 同模块跨章——域内相邻，软规则（仅统计抽样，不卡 CI）；
 *   3) 跨模块——必须落在「授权桥接集」（island BRIDGES 的跨模块对 + AI 反向桥接对），
 *      否则视为相关性红线违规，列入待复核。
 *
 * 仅读 seed，零 schema 漂移。输出统计 + 违规清单；
 *   默认 exit 0（作为"质量审"报告进入 CI Artifact）；
 *   加 --strict 则遇跨模块违规即 exit 1（未来翻转成硬门禁）。
 */
import fs from 'node:fs';

const SEED = './data/seed-content.json';
const STRICT = process.argv.includes('--strict');
const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

const LINK_RE = /\[[^\]]*\]\(doc:([a-z]+)\/([a-z0-9-]+)\/([a-z0-9-]+)\)/g;

// ---- 索引 ----
const valid = new Set();                 // "module/chapter/section"
const secMeta = {};                       // secId -> {module, chapter, title}
const chModule = {};                      // chId -> module
for (const m of seed.modules) {
  for (const c of m.chapters) {
    chModule[c.id] = m.id;
    for (const s of c.sections) {
      valid.add(`${m.id}/${c.id}/${s.id}`);
      secMeta[s.id] = { module: m.id, chapter: c.id, title: s.title };
    }
  }
}

// ---- 授权桥接集（与 charter_island / charter_ai_bridge 同源）----
const pairKey = (a, b) => [a, b].sort().join('|');
// island BRIDGES 中「跨模块」章对（无序；构建时排序去重，避免手写出错）
const ISLAND_XMOD_RAW = [
  ['fe-c16', 'be-c1'], ['be-api', 'fe-c5'], ['be-api', 'op-c2'], ['be-c2', 'op-c6'],
  ['op-c3', 'be-msa'], ['op-c4', 'fe-c8'], ['op-c4', 'be-c3'], ['fe-c12', 'be-test'],
  ['fe-c13', 'be-c4'], ['be-c4', 'op-c5'], ['fe-c17', 'be-c5'], ['be-net', 'op-c2'],
  ['be-net', 'fe-c6'], ['be-os', 'op-c1'], ['be-dist', 'op-c3'],
  ['fe-c14', 'be-sec'], ['be-sec', 'op-c5'], ['fe-c14', 'op-c5'],
];
const ISLAND_XMOD = new Set(ISLAND_XMOD_RAW.map(([a, b]) => pairKey(a, b)));
// V2 增强阶段经人工逐条审定的「合法跨引用」（带具体备注，非 chapter 锚点桥接）
// 见 docs/skill-tree-charter.md「相关性红线」附录；仅作审计许可，不改生成脚本。
const VETTED_XMOD_RAW = [
  ['fe-c16', 'be-api'], ['fe-c16', 'op-c3'], ['fe-c16', 'op-c5'],
  ['fe-c16', 'op-c4'], ['fe-c18', 'op-c4'], ['be-test', 'op-c4'],
  ['be-nosql', 'op-c4'], ['be-nosql', 'op-c6'], ['op-c6', 'be-dist'],
];
const VETTED_XMOD = new Set(VETTED_XMOD_RAW.map(([a, b]) => pairKey(a, b)));
// AI 反向桥接宿主章（与 ai-c1 互链）
const AI_HOSTS = new Set([
  'be-api', 'fe-c17', 'be-c2', 'be-nosql', 'op-c6', 'be-test', 'op-c5',
  'be-msa', 'be-mq', 'op-c3', 'be-sec', 'op-c7', 'fe-c1', 'be-dist',
  'be-net', 'fe-c16',
]);
const isSanctionedXMod = (srcCh, tgtCh) =>
  (srcCh === 'ai-c1' && AI_HOSTS.has(tgtCh)) ||
  (tgtCh === 'ai-c1' && AI_HOSTS.has(srcCh)) ||
  ISLAND_XMOD.has(pairKey(srcCh, tgtCh)) ||
  VETTED_XMOD.has(pairKey(srcCh, tgtCh));

// ---- 扫描 ----
let total = 0, sameCh = 0, sameModXCh = 0, xMod = 0, broken = 0;
const xModSanctioned = [], xModViolation = [], brokenList = [];
const sameModXChSample = [];

for (const m of seed.modules) for (const c of m.chapters) for (const s of c.sections) {
  let mm; LINK_RE.lastIndex = 0;
  while ((mm = LINK_RE.exec(s.content))) {
    total++;
    const tMod = mm[1], tCh = mm[2], tSec = mm[3];
    const tKey = `${tMod}/${tCh}/${tSec}`;
    const src = secMeta[s.id];
    if (!valid.has(tKey)) { broken++; brokenList.push(`${m.id}/${c.id}/${s.id} -> ${tKey}`); continue; }
    if (tCh === c.id) { sameCh++; continue; }
    if (tMod === m.id) {
      sameModXCh++;
      if (sameModXChSample.length < 12) sameModXChSample.push(`${m.id}/${c.id}/${s.id} -> ${tKey}`);
      continue;
    }
    // 跨模块
    xMod++;
    const rec = `${m.id}/${c.id}/${s.id} -> ${tKey}`;
    if (isSanctionedXMod(c.id, tCh)) xModSanctioned.push(rec);
    else xModViolation.push(rec);
  }
}

// ---- 报告 ----
console.log('=== 互链质量审 / 相关性红线 ===');
console.log(`总 doc: 链接: ${total}`);
console.log(`  · 同章兄弟:     ${sameCh}  (放行)`);
console.log(`  · 同模块跨章:   ${sameModXCh}  (软规则，仅抽样)`);
console.log(`  · 跨模块:       ${xMod}`);
console.log(`      - 授权桥接(合规): ${xModSanctioned.length}`);
console.log(`      - 红线违规:       ${xModViolation.length}`);
console.log(`失效链接(断裂): ${broken}`);
console.log('');
if (xModViolation.length) {
  console.log('—— 跨模块红线违规（待复核/移除） ——');
  xModViolation.forEach((r) => console.log('  ⚠️ ' + r));
  console.log('');
}
if (broken) {
  console.log('—— 失效链接（必须修复） ——');
  brokenList.slice(0, 20).forEach((r) => console.log('  ❌ ' + r));
  console.log('');
}
if (sameModXChSample.length) {
  console.log('—— 同模块跨章抽样（软规则，人工抽检相关性） ——');
  sameModXChSample.forEach((r) => console.log('  · ' + r));
  console.log('');
}
console.log(
  xModViolation.length || broken
    ? `—— 结论：发现 ${xModViolation.length} 处跨模块红线违规 / ${broken} 处失效，需处理 ——`
    : '—— 结论：跨模块链接全部落在授权桥接集，相关性红线通过 ——'
);

process.exit(STRICT && (xModViolation.length || broken) ? 1 : 0);
