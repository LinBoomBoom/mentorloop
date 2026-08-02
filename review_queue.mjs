/**
 * 复审队列生成器（宪章第六.2条 / 第四.4条）
 * 基于 seed 中每节「> 时效」块的核验日期 + 风险 SLA，
 * 列出超期节点与临期（默认 30 天）节点，按紧急度排序，供季度/月度复审排期。
 * 只读 seed，幂等，可安全重跑。
 */
import fs from 'node:fs';
import { SLA_DAYS, parseFresh, localDate } from './skilltree.config.mjs';

const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));
const today = localDate();
const HORIZON = 30; // 临期窗口（天）

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localDate(dt);
}
function daysBetween(a, b) { // 返回 b - a 的天数（负数=a 已晚于 b）
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.floor((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000);
}

const rows = [];
for (const m of s.modules) for (const ch of m.chapters) for (const sec of ch.sections) {
  const f = parseFresh(sec.content);
  if (!f || !f.核验 || !f.风险 || !SLA_DAYS[f.风险]) continue;
  const due = addDays(f.核验, SLA_DAYS[f.风险]);
  const left = daysBetween(today, due); // <0 超期；>=0 剩余天数
  rows.push({ loc: `${m.id}/${ch.id}/${sec.id}`, risk: f.风险, due, left, title: sec.title });
}
// 排序：超期优先（left 升序，最负的排最前），临期次之
rows.sort((a, b) => a.left - b.left);

const overdue = rows.filter((r) => r.left < 0);
const soon = rows.filter((r) => r.left >= 0 && r.left <= HORIZON);

console.log('=== 复审队列（基准日 ' + today + ' · 临期窗口 ' + HORIZON + ' 天）===');
console.log('总监控节点: ' + rows.length + ' | 超期: ' + overdue.length + ' | 临期: ' + soon.length);
console.log('');
console.log('—— 超期（立即复审，进入队列首位）——');
if (overdue.length === 0) console.log('  ✅ 无超期节点');
else overdue.forEach((r) => console.log(`  [超期${-r.left}天] ${r.loc} | 风险=${r.risk} | 到期=${r.due} | ${r.title}`));
console.log('');
console.log(`—— 临期（${HORIZON} 天内，按剩余天数升序）——`);
if (soon.length === 0) console.log('  ✅ 未来 ' + HORIZON + ' 天无节点到期');
else soon.forEach((r) => console.log(`  [剩${r.left}天] ${r.loc} | 风险=${r.risk} | 到期=${r.due} | ${r.title}`));
console.log('');
console.log('—— 本季待办合计: ' + (overdue.length + soon.length) + ' ——');
