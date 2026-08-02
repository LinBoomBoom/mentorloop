/**
 * charter_ai_bridge.mjs — 让新增的 AI 工程模块双向可导航
 *
 * 背景：ai-c1 七节在审稿稿里已自带「相关知识图谱」指向现有 frontend/backend/devops 节
 *       （出站连通），但现有节没有指回 ai-c1 的链，导致从图里"走不进"AI 工程。
 * 本脚本为最相关的 16 个现有节追加一条指向 ai-c1 的反向互链，使图谱双向可达。
 *
 * 纪律：
 *   1. 零 schema 漂移 —— 只改 section.content 的 相关知识图谱 块。
 *   2. 幂等 —— 若某节已含 `doc:ai/ai-c1/...` 则跳过，重跑 = 0 变更。
 *   3. 链接全部有效 —— 目标必须是 ai-c1 的真实 section id。
 *
 * 用法：node charter_ai_bridge.mjs [--dry]
 */
import fs from 'node:fs';
const SEED = './data/seed-content.json';
const DRY = process.argv.includes('--dry');
const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

// 索引：secId -> {module,chapter,title,sec}
const idx = {};
for (const m of seed.modules) for (const c of m.chapters) for (const s of c.sections)
  idx[s.id] = { module: m.id, chapter: c.id, title: s.title, sec: s };

// 现有节 -> [(指向的 ai-c1 节, 备注)]
const MAP = {
  'be-api-surveil': [], // 占位避免误用
  'be-api-s1': [['ai-c1-s1', '提示工程：契约式表达同源'], ['ai-c1-s7', 'LLM API 接入范式']],
  'fe-c17-s1': [['ai-c1-s1', '提示工程：抽象与接口设计']],
  'be-c2-s1': [['ai-c1-s2', 'RAG 的关系型知识库底座']],
  'be-nosql-s1': [['ai-c1-s2', '向量检索与 RAG']],
  'op-c6-s1': [['ai-c1-s2', 'RAG 索引新鲜度流水线']],
  'be-test-s1': [['ai-c1-s3', '评估即 AI 版的测试工程']],
  'op-c5-s1': [['ai-c1-s3', '可观测性同源']],
  'be-msa-s1': [['ai-c1-s4', 'Agent 工具即微服务']],
  'be-mq-s1': [['ai-c1-s4', '工具调用的异步解耦']],
  'op-c3-s1': [['ai-c1-s4', 'Agent 运行时载体'], ['ai-c1-s6', '算力成本控制']],
  'be-sec-s1': [['ai-c1-s5', '提示注入与越权防护'], ['ai-c1-s7', '密钥不下前端']],
  'op-c7-s1': [['ai-c1-s5', '权限边界与 IAM']],
  'fe-c1-s1': [['ai-c1-s5', '不可信内容渲染的安全观']],
  'be-dist-s1': [['ai-c1-s6', '缓存与一致性思想同源']],
  'be-net-s1': [['ai-c1-s6', '流式输出与延迟优化']],
  'fe-c16-s1': [['ai-c1-s7', '服务端封装 callLLM']],
};

function insertIntoGraph(content, linkText, note) {
  if (!content.includes('## 相关知识图谱')) content += '\n\n## 相关知识图谱';
  const blockStart = content.indexOf('## 相关知识图谱');
  const tail = content.slice(blockStart);
  const nextH2 = tail.search(/\n##\s/);
  const insertAt = nextH2 === -1 ? content.length : blockStart + nextH2;
  const bullet = `\n- ${linkText} — ${note}`;
  return content.slice(0, insertAt) + bullet + content.slice(insertAt);
}

let changed = 0, skippedMissing = 0;
for (const [host, links] of Object.entries(MAP)) {
  if (!links.length) continue;
  const h = idx[host];
  if (!h) { console.log('  [warn] host 不存在，跳过:', host); skippedMissing++; continue; }
  let content = h.sec.content;
  let added = 0;
  for (const [aiSec, note] of links) {
    const a = idx[aiSec];
    if (!a) { console.log('  [warn] ai 目标不存在，跳过:', aiSec); skippedMissing++; continue; }
    if (content.includes(`doc:ai/ai-c1/${aiSec}`)) continue; // 幂等：已存在则跳过
    const linkText = `[${a.title}](doc:ai/ai-c1/${aiSec})`;
    content = insertIntoGraph(content, linkText, note);
    added++;
  }
  if (added) { h.sec.content = content; changed++; }
}

if (DRY) {
  console.log(`[DRY] 将为 ${changed} 个现有节追加指向 AI 工程的反向互链（不写文件）；缺失跳过 ${skippedMissing}`);
  process.exit(0);
}
fs.writeFileSync(SEED, JSON.stringify(seed, null, 2));
console.log(`✅ 已为 ${changed} 个现有节追加指向 AI 工程的反向互链 → ${SEED}（缺失跳过 ${skippedMissing}）`);
console.log('   下一步：_reseed.mjs 重灌（用户无损）后跑 skilltree_audit 复核。');
