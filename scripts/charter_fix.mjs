#!/usr/bin/env node
/**
 * 合宪化工具 (Charter Enforcement)
 * 把《技能树活运营宪章》的机械性要求批量落到 data/seed-content.json。
 *
 *   node charter_fix.mjs --naming        归一章标题（宪章 8.5）
 *   node charter_fix.mjs --fresh         补时效元数据块（宪章 4.1）
 *   node charter_fix.mjs --all           两者都做
 *   node charter_fix.mjs --all --dry     只预览，不写盘
 *   node charter_fix.mjs --fresh --date=2026-08-02   指定核验日期
 *
 * ★ 幂等：已合规的章/节一律跳过，可安全重复运行，绝不重复追加。
 * ★ 零 schema 漂移：只改 chapter.title 与 section.content，不新增任何字段。
 */
import fs from 'node:fs';
import { LAYER_MAP, CHAPTER_NAME_RE, FRESH_RE, chapterPrefix, riskOf, freshBlock, localDate } from './skilltree.config.mjs';

const SEED = './data/seed-content.json';
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };

const DRY = has('--dry');
const DO_ALL = has('--all');
const DO_NAMING = DO_ALL || has('--naming');
const DO_FRESH = DO_ALL || has('--fresh');
const DATE = val('date', localDate());

if (!DO_NAMING && !DO_FRESH) {
  console.log('用法: node charter_fix.mjs [--naming] [--fresh] [--all] [--dry] [--date=YYYY-MM-DD]');
  process.exit(0);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) { console.error(`✖ 日期格式错: ${DATE}`); process.exit(1); }

const C = { g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' };
const seed = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

let renamed = 0, tagged = 0, skipName = 0, skipFresh = 0;
const riskTally = { 高: 0, 中: 0, 低: 0 };
const changes = [];

for (const m of seed.modules) {
  m.chapters.forEach((ch, i) => {
    /* ── 宪章 8.5 · 章标题归一 ── */
    if (DO_NAMING) {
      if (CHAPTER_NAME_RE.test(ch.title)) skipName++;
      else {
        const before = ch.title;
        const after = chapterPrefix(m.id, i + 1) + ch.title.trim();
        if (!DRY) ch.title = after;
        renamed++;
        changes.push(`  ${C.g}✎${C.x} ${m.id}/${ch.id}  ${C.d}${before}${C.x}  →  ${C.b}${after}${C.x}`);
      }
    }

    /* ── 宪章 4.1 · 时效元数据块 ── */
    if (DO_FRESH) {
      if (!LAYER_MAP[ch.id]) {
        console.warn(`${C.y}⚠ ${m.id}/${ch.id} 未在宪章 2.4 分层表中登记，风险按「中」推定${C.x}`);
      }
      const risk = riskOf(ch.id);
      for (const sec of ch.sections) {
        if (FRESH_RE.test(sec.content || '')) { skipFresh++; continue; }
        const block = freshBlock({ checked: DATE, risk, source: '官方' });
        if (!DRY) sec.content = `${block}\n\n${sec.content}`;
        tagged++; riskTally[risk]++;
      }
    }
  });
}

console.log(`\n${C.b}=== 合宪化${DRY ? '（预演 DRY-RUN，未写盘）' : ''} ===${C.x}`);
if (DO_NAMING) {
  console.log(`\n${C.b}[宪章 8.5] 章标题归一${C.x}`);
  console.log(`  改名 ${renamed} 章 ｜ 已合规跳过 ${skipName} 章`);
  changes.forEach((l) => console.log(l));
}
if (DO_FRESH) {
  console.log(`\n${C.b}[宪章 4.1] 时效元数据块${C.x}`);
  console.log(`  新增 ${tagged} 节 ｜ 已有跳过 ${skipFresh} 节 ｜ 核验日期 ${DATE}`);
  console.log(`  风险分布： 高 ${riskTally['高']} (90d复核) ｜ 中 ${riskTally['中']} (180d) ｜ 低 ${riskTally['低']} (365d)`);
}

if (DRY) {
  console.log(`\n${C.y}预演结束，未修改任何文件。去掉 --dry 执行。${C.x}\n`);
  process.exit(0);
}
if (renamed === 0 && tagged === 0) {
  console.log(`\n${C.g}✅ 已全部合规，无需改动（幂等）${C.x}\n`);
  process.exit(0);
}

fs.writeFileSync(SEED, JSON.stringify(seed, null, 2), 'utf-8');
console.log(`\n${C.g}✅ 已写入 ${SEED}${C.x}`);
console.log(`${C.d}下一步： node _reseed.mjs   重灌数据库使改动在应用内生效${C.x}\n`);
