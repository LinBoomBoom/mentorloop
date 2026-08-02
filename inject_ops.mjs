import fs from 'node:fs';

// 通用注入器：把一个 Markdown 审稿稿转成 devops 某章的 sections 写回 seed-content.json
// 用法: node inject_ops.mjs <chapterId> <mdFile>
// md 约定:
//   <!-- title: 章节干净标题 -->
//   <!-- goal: 章节目标 -->
//   # <sectionId> | <section标题>
//   > direction: 一句话导语
//   ## 心智模型
//   ...
//   ## 核心知识点（锚定官方）
//   ...
//   ## 为什么重要
//   ## 常见坑
//   ## 动手自测
//   ## 面试视角

const [, , chId, mdPath] = process.argv;
if (!chId || !mdPath) {
  console.error('usage: node inject_ops.mjs <chapterId> <mdFile>');
  process.exit(1);
}

const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));
const dev = s.modules.find((m) => m.id === 'devops');
if (!dev) { console.error('devops module missing'); process.exit(1); }
const ch = dev.chapters.find((c) => c.id === chId);
if (!ch) { console.error('chapter not found:', chId); process.exit(1); }

const md = fs.readFileSync(mdPath, 'utf-8');
const titleM = md.match(/<!--\s*title:\s*(.+?)\s*-->/);
const goalM = md.match(/<!--\s*goal:\s*(.+?)\s*-->/);
if (titleM) ch.title = titleM[1].trim();
if (goalM) ch.goal = goalM[1].trim();

const lines = md.split(/\r?\n/);
const points = [];
let cur = null;
const pointRe = /^#\s+(\S+)\s*\|\s*(.+)$/;
const dirRe = /^>\s*direction:\s*(.+)$/;
for (const ln of lines) {
  if (pointRe.test(ln)) {
    if (cur) points.push(cur);
    const m = ln.match(pointRe);
    cur = { id: m[1].trim(), title: m[2].trim(), direction: '', content: [] };
  } else if (dirRe.test(ln)) {
    if (cur) cur.direction = ln.match(dirRe)[1].trim();
  } else if (ln.startsWith('<!--')) {
    // 跳过注释行
  } else {
    if (cur) cur.content.push(ln);
  }
}
if (cur) points.push(cur);

ch.sections = points.map((p, i) => ({
  id: p.id,
  title: p.title,
  direction: p.direction,
  content: p.content.join('\n').replace(/^\n+|\n+$/g, ''),
  position: i,
}));

fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log(`injected ${chId}: title="${ch.title}" sections=${ch.sections.length}`);
