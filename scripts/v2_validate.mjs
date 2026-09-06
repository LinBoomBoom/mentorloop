import fs from 'node:fs';
import { SLA_DAYS, parseFresh, localDate, FRESH_RE } from './skilltree.config.mjs';

const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

const need = ['核心知识点（锚定官方）', '为什么重要', '常见坑', '动手自测', '面试视角'];

// 收集所有有效 sectionId
const validIds = new Set();
for (const m of s.modules) for (const ch of m.chapters) for (const sec of ch.sections) {
  validIds.add(`${m.id}/${ch.id}/${sec.id}`);
}

let tc = 0, v1ok = 0;
let nAdv = 0, nExp = 0, nGraph = 0, nDoc = 0, nDia = 0;
const badLinks = [];
const docRe = /\[[^\]]*\]\(doc:([^)]+)\)/g;

// ── 宪章第四条：时效保鲜检测 ──
const RISK_SET = new Set(['高', '中', '低']);
const SRC_SET = new Set(['官方', 'RFC', '论文', '标准']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let noTag = 0;          // 缺少时效块
let badFormat = 0;      // 有时效块但字段非法
const fmtErrs = [];
const riskDist = { 高: 0, 中: 0, 低: 0 };
let overdue = 0;        // 超期节点
const overdueList = [];
const today = localDate();

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localDate(dt);
}
function daysBetween(a, b) { // a,b: YYYY-MM-DD，返回 b-a 天数
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.floor((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000);
}

for (const m of s.modules) for (const ch of m.chapters) for (const sec of ch.sections) {
  tc++;
  const c = sec.content;
  const loc = `${m.id}/${ch.id}/${sec.id}`;
  if (need.filter((k) => c.includes('## ' + k)).length === 6) v1ok++;
  if (c.includes('### 进阶')) nAdv++;
  if (c.includes('### 专家')) nExp++;
  if (c.includes('## 相关知识图谱')) nGraph++;
  if (/```(text|plain)/.test(c)) nDia++;
  let mm;
  while ((mm = docRe.exec(c))) {
    nDoc++;
    if (!validIds.has(mm[1])) badLinks.push(`${loc} -> ${mm[1]}`);
  }

  // 时效块解析
  const f = parseFresh(c);
  if (!f) {
    noTag++;
  } else {
    const errs = [];
    if (!f.核验 || !DATE_RE.test(f.核验)) errs.push('核验日期缺失/格式错(需YYYY-MM-DD)');
    if (!f.风险 || !RISK_SET.has(f.风险)) errs.push('风险缺失/非法(需 高/中/低)');
    if (!f.来源 || !SRC_SET.has(f.来源)) errs.push('来源缺失/非法(需 官方/RFC/论文/标准)');
    if (errs.length) {
      badFormat++;
      fmtErrs.push(`${loc}: ${errs.join('; ')}`);
    } else {
      riskDist[f.风险]++;
      const due = addDays(f.核验, SLA_DAYS[f.风险]);
      if (today > due) {
        overdue++;
        overdueList.push(`${loc} | 风险=${f.风险} | 到期=${due} | 已超期${daysBetween(due, today)}天`);
      }
    }
  }
}

console.log('=== V2 校验报告 ===');
console.log(`总 sections = ${tc}`);
console.log(`V1 六段式达标 = ${v1ok}/${tc} ${v1ok === tc ? '✅ 无退化' : '⚠️ 退化 ' + (tc - v1ok)}`);
console.log('--- V2 标记覆盖 ---');
console.log(`含「### 进阶」= ${nAdv} (${((nAdv / tc) * 100).toFixed(1)}%)`);
console.log(`含「### 专家」= ${nExp} (${((nExp / tc) * 100).toFixed(1)}%)`);
console.log(`含「## 相关知识图谱」= ${nGraph} (${((nGraph / tc) * 100).toFixed(1)}%)`);
console.log(`doc: 互链总数 = ${nDoc}`);
console.log(`含 ASCII 图示 = ${nDia}`);
console.log('--- 互链有效性 ---');
console.log(badLinks.length ? `❌ 失效链接 ${badLinks.length} 条:\n` + badLinks.join('\n') : '✅ 全部 doc: 链接锚点有效');
console.log('--- 时效保鲜（宪章第四条 4.1/4.2/4.3）---');
const tagged = tc - noTag;
console.log(`时效覆盖率 = ${tagged}/${tc} (${((tagged / tc) * 100).toFixed(1)}%) ${tagged === tc ? '✅ 100%' : '⚠️ 缺 ' + noTag + ' 节未标注'}`);
console.log(`风险分布 = 高 ${riskDist.高} / 中 ${riskDist.中} / 低 ${riskDist.低}`);
console.log(`格式错误 = ${badFormat} ${badFormat ? '\n' + fmtErrs.join('\n') : '✅ 全合规'}`);
console.log(`超期节点 = ${overdue} ${overdue ? '\n' + overdueList.join('\n') : '✅ 无超期（基准日 ' + today + '）'}`);
