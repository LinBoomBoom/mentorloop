/**
 * 触发式复审范围映射（宪章第六.1条操作化）
 * 把 6 类触发源映射到当前树的复审章，事件命中时据此排复审范围。
 * 触发源↔章关系手工维护（基于章节主题），零 schema 漂移；只读 seed，幂等。
 */
import fs from 'node:fs';
const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

// 章索引：id → {title, moduleId, n}
const chIndex = {};
for (const m of s.modules) for (const ch of m.chapters) {
  chIndex[ch.id] = { title: ch.title, moduleId: m.id, n: ch.sections.length };
}

// 触发源 → 关联章 id（基于章节主题，手工维护）
const TRIGGERS = {
  '框架大版本 (React/Vue/Angular/Node/TS/Spring)': ['fe-c9', 'fe-c10', 'fe-c7', 'fe-c16', 'be-c3'],
  '基础设施发版 (K8s/Docker/Nginx/云厂商)': ['op-c3', 'op-c7', 'op-c2', 'op-c1'],
  '标准与提案 (ECMAScript/RFC/W3C)': ['fe-c3', 'fe-c4', 'be-net', 'be-os'],
  '行业大会 (React Conf/VueConf/KubeCon/QCon/IO)': ['fe-c9', 'fe-c10', 'op-c3', 'op-c7', 'be-c4'],
  '重大安全事件 (CVE/供应链)': ['op-c5', 'be-sec', 'fe-c14'],
  'AI/LLM 生态 (模型/Agent/RAG)': ['ai-c1'],
};

console.log('=== 触发式复审范围映射（宪章 6.1）===');
let totalSections = 0;
for (const [src, ids] of Object.entries(TRIGGERS)) {
  const valid = ids.filter((id) => chIndex[id]);
  const missing = ids.filter((id) => !chIndex[id]);
  const nSec = valid.reduce((a, id) => a + chIndex[id].n, 0);
  totalSections += nSec;
  console.log(`\n■ ${src}`);
  console.log(`  复审章 ${valid.length} 个 / ${nSec} 节：`);
  valid.forEach((id) => console.log(`    - ${id} 《${chIndex[id].title}》(${chIndex[id].n}节)`));
  if (missing.length) console.log(`  ⚠️ 映射失效章（已从树移除）: ${missing.join(', ')}`);
}
console.log(`\n—— 全树触发覆盖合计：${totalSections} 节（去重前；多触发源可重叠）——`);
