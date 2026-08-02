import fs from 'node:fs';

// 幂等反向桥接：为相关旧章追加指向 op-c8 的 doc: 互链，打通知识网络。
// 已含目标链接则跳过；复用既有「相关知识图谱」块，不重复创建。
const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

// 目标：把指定 doc: 链接追加进某 section 的「相关知识图谱」块
const bridges = [
  {
    sectionId: 'op-c4-s1',
    link: '- [op-c8-s1 平台即产品与黄金路径](doc:devops/op-c8/op-c8-s1) — 黄金路径跑在 CI/CD 之上，平台团队借此为开发者降本',
  },
  {
    sectionId: 'op-c5-s1',
    link: '- [op-c8-s3 IDP 架构与抽象层](doc:devops/op-c8/op-c8-s3) — 抽象层须默认最小权限（见最小权限原则）',
  },
  {
    sectionId: 'op-c7-s1',
    link: '- [op-c8-s3 IDP 架构与抽象层](doc:devops/op-c8/op-c8-s3) — IDP 建在 IaC 之上，是开发者友好的上层抽象',
  },
];

// 定位 section（跨模块按 id 查找）
function findSection(id) {
  for (const m of s.modules) {
    for (const c of m.chapters) {
      const x = c.sections.find((sec) => sec.id === id);
      if (x) return x;
    }
  }
  return null;
}

let changed = 0;
for (const { sectionId, link } of bridges) {
  const sec = findSection(sectionId);
  if (!sec) { console.log(`[WARN] ${sectionId} 未找到，跳过`); continue; }
  if (sec.content.includes('op-c8-s')) { console.log(`[SKIP] ${sectionId} 已含 op-c8 互链`); continue; }
  const marker = '## 相关知识图谱';
  if (sec.content.includes(marker)) {
    // 插到「相关知识图谱」标题后第一行
    const idx = sec.content.indexOf(marker) + marker.length;
    sec.content = sec.content.slice(0, idx) + '\n' + link + sec.content.slice(idx);
  } else {
    sec.content = sec.content.replace(/\s*$/, '') + '\n\n## 相关知识图谱\n' + link + '\n';
  }
  changed++;
  console.log(`[ADD] ${sectionId} ← ${link.split(']')[0].slice(1)}`);
}

if (changed > 0) fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log(`完成：本次新增 ${changed} 条反向互链`);
