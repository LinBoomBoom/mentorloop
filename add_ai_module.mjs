import fs from 'node:fs';

// 幂等预建 ai 模块壳：供 inject_any.mjs 注入章节使用。
// 已存在则跳过（重跑安全）。仅改 seed-content.json，零 schema 漂移。
const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

if (s.modules.some((m) => m.id === 'ai')) {
  console.log('[SKIP] module "ai" already exists');
  process.exit(0);
}

const positions = s.modules.map((m) => m.position ?? 0);
const nextPos = positions.length ? Math.max(...positions) + 1 : 0;

s.modules.push({
  id: 'ai',
  name: 'AI 工程',
  icon: '🤖',
  color: '#8b5cf6',
  desc: '从提示工程、RAG、评估观测、Agent 工具调用，到安全合规与成本延迟权衡——构建可靠 LLM 应用的工程化路径。',
  position: nextPos,
  chapters: [],
});

fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log(`[NEW] module "ai" added at position ${nextPos}`);
