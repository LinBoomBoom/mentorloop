// 内容基座盘点：章节/小节、题库、试卷 三维度量化 + 覆盖缺口告警
// 用法: node scripts/audit-content-baseline.mjs [--top N]
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new Database(path.join(root, 'data', 'devmentor.db'), { readonly: true });

const pad = (s, n) => String(s ?? '').padEnd(n);
const padL = (s, n) => String(s ?? '').padStart(n);
const hr = (t) => console.log('\n=== ' + t + ' ===');

const modCols = db.prepare('PRAGMA table_info(modules)').all().map(c => c.name);
const tCol = modCols.includes('title') ? 'title' : (modCols.includes('name') ? 'name' : null);

hr('1. 模块总览 (chapters / sections)');
const modSql = `SELECT m.id AS id, ${tCol ? 'm.' + tCol : "''"} AS mtitle,
 (SELECT COUNT(*) FROM chapters c WHERE c.module_id=m.id) AS chs,
 (SELECT COUNT(*) FROM sections s JOIN chapters c2 ON s.chapter_id=c2.id WHERE c2.module_id=m.id) AS secs
 FROM modules m ORDER BY m.id`;
const modRows = db.prepare(modSql).all();
for (const r of modRows) {
  console.log(`  ${pad(r.id, 12)} ${padL(r.chs, 4)}章 ${padL(r.secs, 5)}节   ${r.mtitle || ''}`);
}
console.log(`  ${pad('TOTAL', 12)} ${padL(modRows.reduce((a, r) => a + r.chs, 0), 4)}章 ${padL(modRows.reduce((a, r) => a + r.secs, 0), 5)}节`);

hr('2. 赛道(subtrack) 章节/小节');
const subSql = `SELECT c.module_id AS mid, COALESCE(NULLIF(TRIM(c.subtrack),''),'(none)') AS st,
 COUNT(DISTINCT c.id) AS chs, COUNT(s.id) AS secs
 FROM chapters c LEFT JOIN sections s ON s.chapter_id=c.id
 GROUP BY c.module_id, st ORDER BY c.module_id, chs DESC`;
const subRows = db.prepare(subSql).all();
let curMod = null;
for (const r of subRows) {
  if (r.mid !== curMod) { curMod = r.mid; console.log(`  [${curMod}]`); }
  console.log(`     ${pad(r.st, 16)} ${padL(r.chs, 4)}章 ${padL(r.secs, 5)}节`);
}

hr('3. 题库(interview_questions) 按 track');
const qSql = `SELECT COALESCE(NULLIF(TRIM(track),''),'(none)') AS t, COUNT(*) AS n,
 SUM(CASE WHEN difficulty='easy' THEN 1 ELSE 0 END) AS e,
 SUM(CASE WHEN difficulty='medium' THEN 1 ELSE 0 END) AS m,
 SUM(CASE WHEN difficulty='hard' THEN 1 ELSE 0 END) AS h
 FROM interview_questions GROUP BY t ORDER BY n DESC`;
const qRows = db.prepare(qSql).all();
for (const r of qRows) {
  console.log(`  ${pad(r.t, 18)} ${padL(r.n, 5)}题  (易${padL(r.e, 4)}/中${padL(r.m, 4)}/难${padL(r.h, 4)})`);
}
console.log(`  ${pad('TOTAL', 18)} ${padL(qRows.reduce((a, r) => a + r.n, 0), 5)}题`);

// 注意：题库 subtrack 存的是「赛道 id」(fe-web/be-web...)，与 chapters.subtrack(子主题) 粒度不同，不可直接比对
hr('3b. 题库 按 subtrack(赛道级)');
const qsSql = `SELECT COALESCE(NULLIF(TRIM(subtrack),''),'(empty)') AS st, COUNT(*) AS n
 FROM interview_questions GROUP BY st ORDER BY n DESC`;
const qsRows = db.prepare(qsSql).all();
for (const r of qsRows) console.log(`  ${pad(r.st, 18)} ${padL(r.n, 5)}题`);

hr('3c. 难度取值分布（检测非标准值）');
const STD = new Set(['easy', 'medium', 'hard']);
const dRows = db.prepare(`SELECT COALESCE(difficulty,'(NULL)') AS d, COUNT(*) AS n
 FROM interview_questions GROUP BY d ORDER BY n DESC`).all();
for (const r of dRows) {
  const bad = !STD.has(r.d) ? '  <== 非标准值' : '';
  console.log(`  ${pad(r.d, 18)} ${padL(r.n, 5)}${bad}`);
}

hr('4. 试卷(exam_sets) 按 track');
const eSql = `SELECT COALESCE(NULLIF(TRIM(es.track),''),'(none)') AS t,
 COUNT(DISTINCT es.id) AS sets, COUNT(ec.id) AS qs,
 SUM(CASE WHEN es.vip_only=1 THEN 1 ELSE 0 END) AS vip
 FROM exam_sets es LEFT JOIN exam_choices ec ON ec.set_id=es.id
 GROUP BY t ORDER BY sets DESC`;
const eRows = db.prepare(eSql).all();
for (const r of eRows) {
  console.log(`  ${pad(r.t, 18)} ${padL(r.sets, 3)}套 ${padL(r.qs, 5)}题  (VIP ${r.vip})`);
}
console.log(`  ${pad('TOTAL', 18)} ${padL(eRows.reduce((a, r) => a + r.sets, 0), 3)}套 ${padL(eRows.reduce((a, r) => a + r.qs, 0), 5)}题`);

hr('5. 覆盖缺口告警');
// 5.1 章节薄弱子主题（chapters.subtrack 是子主题级，指标有效）
const thin = subRows.filter(r => r.chs < 5 && r.st !== '(none)');
console.log(`  章节 <5 的薄弱子主题 (${thin.length}):`);
for (const r of thin) console.log(`     ${pad(r.mid, 10)} ${pad(r.st, 16)} ${r.chs}章 ${r.secs}节`);

// 5.2 难度非标准值
const badDiff = dRows.filter(r => !STD.has(r.d));
const badTotal = badDiff.reduce((a, r) => a + r.n, 0);
console.log(`  难度非标准值 (${badDiff.length} 类 / 共 ${badTotal} 题, 占比 ${(badTotal / qRows.reduce((a, r) => a + r.n, 0) * 100).toFixed(1)}%): ${badDiff.map(r => r.d + ':' + r.n).join(', ')}`);

// 5.3 粒度说明（避免误报）
console.log('  注: 题库.subtrack(赛道级,如 fe-web/be-web) 与 章节.subtrack(子主题级,如 vue/react) 粒度不同,');
console.log('       不可直接比对; 题库/试卷仅分 4 个方向(track), 细分赛道需映射后另行核对。');

// 5.4 试卷方向分布
const sparseExam = eRows.filter(r => r.sets < 10);
console.log(`  试卷偏少方向 (<10 套): ${sparseExam.map(r => r.t + ':' + r.sets + '套').join(', ') || '—'}`);

db.close();
