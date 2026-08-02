#!/usr/bin/env node
/**
 * 技能树健康度审计器 (Skill-Tree Health Audit)
 * 实现《技能树活运营宪章》第七条：八项指标 + 三条红线。
 *
 *   npm run audit:tree              正常审计
 *   npm run audit:tree -- --verbose 打印超期/孤岛/缺标签完整明细
 *
 * 退出码：0 = 合宪；1 = 触碰红线（CI 应失败）。
 * 纪律：只读 seed，不写任何文件。
 */
import fs from 'node:fs';
import {
  LAYER_MAP, SLA_DAYS, DEFAULT_RISK, CHAPTER_NAME_RE,
  V1_SECTIONS, REDLINE, parseFresh, localDate,
} from './skilltree.config.mjs';

const SEED = './data/seed-content.json';
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const DOC_RE = /\[[^\]]*\]\(doc:([^)]+)\)/g;

const pct = (n, d) => (d === 0 ? '0.0' : ((n / d) * 100).toFixed(1));
const C = { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };

if (!fs.existsSync(SEED)) {
  console.error(`${C.r}✖ 找不到 ${SEED}${C.x}`);
  process.exit(1);
}
const seed = JSON.parse(fs.readFileSync(SEED, 'utf-8'));
const today = new Date();

/* ── 扫描 ── */
const validIds = new Set();
for (const m of seed.modules) for (const ch of m.chapters) for (const s of ch.sections) validIds.add(`${m.id}/${ch.id}/${s.id}`);

const st = { modules: seed.modules.length, chapters: 0, sections: 0, v1ok: 0, adv: 0, exp: 0, graph: 0, diagram: 0, evolution: 0, fresh: 0, docLinks: 0 };
const layerCh = { trunk: 0, branch: 0, unmapped: 0 };
const layerSec = { trunk: 0, branch: 0, unmapped: 0 };
const unmapped = [], badNaming = [], badLinks = [], noFresh = [], overdue = [], badFresh = [];
const outbound = new Map(), inbound = new Map();
const perModule = [];

for (const m of seed.modules) {
  const mod = { name: m.name, chapters: m.chapters.length, sections: 0, trunk: 0, branch: 0, fresh: 0 };
  for (const ch of m.chapters) {
    st.chapters++;
    const layer = LAYER_MAP[ch.id];
    if (!layer) { layerCh.unmapped++; unmapped.push(`${m.id}/${ch.id} 「${ch.title}」`); }
    else { layerCh[layer]++; mod[layer]++; }
    if (!CHAPTER_NAME_RE.test(ch.title)) badNaming.push(`${m.id}/${ch.id} 「${ch.title}」`);

    for (const sec of ch.sections) {
      st.sections++; mod.sections++;
      const key = `${m.id}/${ch.id}/${sec.id}`;
      const c = sec.content || '';
      layerSec[layer || 'unmapped']++;

      if (V1_SECTIONS.filter((k) => c.includes('## ' + k)).length === 6) st.v1ok++;
      if (c.includes('### 进阶')) st.adv++;
      if (c.includes('### 专家')) st.exp++;
      if (c.includes('## 相关知识图谱')) st.graph++;
      if (c.includes('### 演进脉络')) st.evolution++;
      if (/```(text|plain)/.test(c)) st.diagram++;

      // 宪章第四条 · 时效
      const f = parseFresh(c);
      if (!f) noFresh.push(key);
      else {
        st.fresh++; mod.fresh++;
        const checked = f['核验'];
        const risk = SLA_DAYS[f['风险']] ? f['风险'] : (DEFAULT_RISK[layer] || '中');
        if (!checked || !/^\d{4}-\d{2}-\d{2}$/.test(checked) || !f['来源']) badFresh.push(key);
        else {
          const days = Math.floor((today - new Date(checked)) / 86400000);
          const sla = SLA_DAYS[risk];
          if (days > sla) overdue.push({ key, risk, days, over: days - sla });
        }
      }

      // 互链
      let mm; DOC_RE.lastIndex = 0;
      const outs = new Set();
      while ((mm = DOC_RE.exec(c))) {
        st.docLinks++;
        outs.add(mm[1]);
        if (!validIds.has(mm[1])) badLinks.push(`${key} → ${mm[1]}`);
        else inbound.set(mm[1], (inbound.get(mm[1]) || 0) + 1);
      }
      outbound.set(key, outs.size);
    }
  }
  perModule.push(mod);
}
const islands = [...validIds].filter((k) => !(outbound.get(k) > 0) && !(inbound.get(k) > 0));

/* ── 报告 ── */
const T = st.sections;
const trunkRatio = st.chapters ? layerCh.trunk / st.chapters : 0;
const v1Rate = T ? st.v1ok / T : 0;

console.log(`\n${C.b}╔══════════════════════════════════════════════════════╗${C.x}`);
console.log(`${C.b}║   技能树健康度审计 · 宪章第七条                      ║${C.x}`);
console.log(`${C.b}╚══════════════════════════════════════════════════════╝${C.x}`);
console.log(`${C.d}审计日期 ${localDate(today)} ｜ 依据 docs/skill-tree-charter.md v1.0${C.x}\n`);

console.log(`${C.b}【指标1】规模${C.x}`);
console.log(`  模块 ${st.modules} ｜ 章 ${st.chapters} ｜ 知识点 ${T}`);
for (const m of perModule) console.log(`  ${C.d}·${C.x} ${m.name.padEnd(12)} ${String(m.chapters).padStart(2)} 章 / ${String(m.sections).padStart(3)} 节  ${C.d}(trunk ${m.trunk} · branch ${m.branch})${C.x}`);

console.log(`\n${C.b}【指标2】分层分布${C.x} ${C.d}(红线 trunk ≥ 40%)${C.x}`);
console.log(`  trunk  ${String(layerCh.trunk).padStart(2)} 章 (${pct(layerCh.trunk, st.chapters)}%) / ${layerSec.trunk} 节`);
console.log(`  branch ${String(layerCh.branch).padStart(2)} 章 (${pct(layerCh.branch, st.chapters)}%) / ${layerSec.branch} 节`);
if (layerCh.unmapped) {
  console.log(`  ${C.y}未分层 ${layerCh.unmapped} 章 — 新增章须登记进宪章 2.4 与 LAYER_MAP${C.x}`);
  unmapped.forEach((s) => console.log(`     ${C.y}⚠${C.x} ${s}`));
}

console.log(`\n${C.b}【指标3】V1 六段式达标率${C.x} ${C.d}(红线 100%)${C.x}`);
console.log(`  ${st.v1ok}/${T} = ${pct(st.v1ok, T)}%  ${v1Rate === 1 ? C.g + '✅ 合格' + C.x : C.r + '❌ 退化 ' + (T - st.v1ok) + ' 节' + C.x}`);

console.log(`\n${C.b}【指标4】V2 深度覆盖${C.x} ${C.d}(目标 滚动提升)${C.x}`);
const bar = (n) => { const w = Math.round((n / T) * 20); return C.d + '['.concat('█'.repeat(w).padEnd(20, '·'), ']') + C.x; };
console.log(`  「### 进阶」    ${String(st.adv).padStart(3)} (${pct(st.adv, T).padStart(5)}%) ${bar(st.adv)}`);
console.log(`  「### 专家」    ${String(st.exp).padStart(3)} (${pct(st.exp, T).padStart(5)}%) ${bar(st.exp)}`);
console.log(`  「相关知识图谱」${String(st.graph).padStart(3)} (${pct(st.graph, T).padStart(5)}%) ${bar(st.graph)}`);
console.log(`  「### 演进脉络」${String(st.evolution).padStart(3)} (${pct(st.evolution, T).padStart(5)}%) ${bar(st.evolution)}`);
console.log(`  ASCII 图示      ${String(st.diagram).padStart(3)} (${pct(st.diagram, T).padStart(5)}%) ${bar(st.diagram)}`);

console.log(`\n${C.b}【指标5】互链健康${C.x} ${C.d}(红线 失效链接 = 0)${C.x}`);
console.log(`  doc: 互链总数 ${st.docLinks}`);
console.log(`  失效链接 ${badLinks.length} ${badLinks.length === 0 ? C.g + '✅' + C.x : C.r + '❌' + C.x}`);
badLinks.slice(0, VERBOSE ? 999 : 10).forEach((s) => console.log(`     ${C.r}✖${C.x} ${s}`));
console.log(`  孤岛节点 ${islands.length}/${T} (${pct(islands.length, T)}%) ${islands.length === 0 ? C.g + '✅' + C.x : C.y + '⚠ 不可导航，应补互链' + C.x}`);
if (islands.length && VERBOSE) islands.forEach((s) => console.log(`     ${C.d}·${C.x} ${s}`));

console.log(`\n${C.b}【指标6】时效覆盖率${C.x} ${C.d}(目标 100%)${C.x}`);
console.log(`  含时效块 ${st.fresh}/${T} = ${pct(st.fresh, T)}% ${st.fresh === T ? C.g + '✅' + C.x : C.y + `⚠ 缺 ${noFresh.length} 节` + C.x}`);
if (badFresh.length) console.log(`  ${C.y}⚠ 格式不合规 ${badFresh.length} 条（缺 核验/来源 或日期格式错）${C.x}`);
if (noFresh.length && VERBOSE) noFresh.forEach((s) => console.log(`     ${C.d}·${C.x} ${s}`));

console.log(`\n${C.b}【指标7】超期节点${C.x} ${C.d}(SLA 高 90d / 中 180d / 低 365d)${C.x}`);
const overdueHigh = overdue.filter((o) => o.risk === '高');
if (!overdue.length) console.log(`  ${C.g}✅ 无超期节点${C.x}`);
else {
  console.log(`  超期 ${overdue.length} 节（高风险 ${overdueHigh.length}）`);
  overdue.sort((a, b) => b.over - a.over).slice(0, VERBOSE ? 999 : 10)
    .forEach((o) => console.log(`     ${C.y}⚠${C.x} [${o.risk}] ${o.key} — 距核验 ${o.days}d，超 SLA ${o.over}d`));
}

console.log(`\n${C.b}【指标8】命名规范${C.x} ${C.d}(章标题须为「第N章 · 标题」)${C.x}`);
console.log(`  不合规 ${badNaming.length}/${st.chapters} ${badNaming.length === 0 ? C.g + '✅' + C.x : C.y + '⚠' + C.x}`);
badNaming.slice(0, VERBOSE ? 999 : 10).forEach((s) => console.log(`     ${C.y}⚠${C.x} ${s}`));

/* ── 红线裁决（宪章 7.2） ── */
const violations = [];
if (v1Rate < REDLINE.v1Rate) violations.push(`V1 六段式达标率 ${pct(st.v1ok, T)}% < 100%（内容地基退化）`);
if (badLinks.length > REDLINE.badLinks) violations.push(`存在 ${badLinks.length} 条失效 doc: 互链（导航断裂）`);
if (trunkRatio < REDLINE.minTrunkRatio) violations.push(`trunk 章占比 ${pct(layerCh.trunk, st.chapters)}% < 40%（树被叶子淹没）`);

console.log(`\n${C.b}────────────── 红线裁决（宪章 7.2） ──────────────${C.x}`);
if (!violations.length) {
  console.log(`${C.g}${C.b}✅ 合宪：三条红线全部通过${C.x}`);
  console.log(`${C.d}   · V1 达标率 ${pct(st.v1ok, T)}%   · 失效互链 ${badLinks.length}   · trunk 占比 ${pct(layerCh.trunk, st.chapters)}%${C.x}`);
} else {
  console.log(`${C.r}${C.b}❌ 违宪 ${violations.length} 项：${C.x}`);
  violations.forEach((v, i) => console.log(`${C.r}   ${i + 1}. ${v}${C.x}`));
}

const warns = [];
if (st.fresh < T) warns.push(`时效标签缺 ${T - st.fresh} 节（宪章第四条）→ 任务 #44`);
if (overdueHigh.length) warns.push(`高风险超期 ${overdueHigh.length} 节（宪章 4.4）`);
if (islands.length) warns.push(`孤岛节点 ${islands.length} 节，占 ${pct(islands.length, T)}%（宪章"可导航"）`);
if (badNaming.length) warns.push(`章命名不合规 ${badNaming.length} 章（宪章 8.5）`);
if (layerCh.unmapped) warns.push(`未分层 ${layerCh.unmapped} 章（宪章 2.4）`);
if (warns.length) {
  console.log(`\n${C.y}${C.b}⚠ 待办告警 ${warns.length} 项（不阻断，须进复审队列）：${C.x}`);
  warns.forEach((w, i) => console.log(`${C.y}   ${i + 1}. ${w}${C.x}`));
}
if (!VERBOSE) console.log(`\n${C.d}提示：加 --verbose 查看完整明细${C.x}`);
console.log('');

process.exit(violations.length ? 1 : 0);
