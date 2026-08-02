// 修正付费考卷门禁：将 8 套「高级 VIP」考卷标记为 vipOnly=true，其余保持免费。
// 幂等：重复运行结果一致（已是 true 不再改变）。改完需运行 _reseed.mjs 重灌库。
import fs from 'node:fs';
import path from 'node:path';

const SEED = './data/seed-content.json';
const content = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

// 显式 VIP 套 id（4 方向 × 2 套：原 vip-1 + 扩建 vip-2）
const VIP_IDS = new Set([
  'exam-fe-vip-1', 'exam-fe-vip-2',
  'exam-be-vip-1', 'exam-be-vip-2',
  'exam-op-vip-1', 'exam-op-vip-2',
  'exam-ai-vip-1', 'exam-ai-vip-2',
]);

let changed = 0;
for (const set of content.examSets) {
  const shouldVip = VIP_IDS.has(set.id);
  if (!!set.vipOnly !== shouldVip) {
    set.vipOnly = shouldVip;
    changed++;
    console.log(`${shouldVip ? 'SET VIP  ' : 'SET FREE '}: ${set.id}`);
  }
}

fs.writeFileSync(SEED, JSON.stringify(content, null, 2));
console.log(`\nvipOnly flags corrected: ${changed} set(s) changed.`);
const vip = content.examSets.filter((s) => s.vipOnly).map((s) => s.id);
console.log('now vipOnly=true:', vip.length, '->', vip.join(', '));
