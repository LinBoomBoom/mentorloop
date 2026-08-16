import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('data/seed-content.json', 'utf8');
const data = JSON.parse(raw);
const mod = data.modules.find(m => m.id === 'backend');
const secs = mod.chapters.flatMap(c => (c.sections || []));
const get = id => secs.find(s => s.id === id);

// 仅处理第一遍跳过的 10 节（已是 http 但抽到 0 条源，未被改动）
const headerOnly = ['be-net-s8', 'be-mq-s8'];           // 已有子弹，缺头行
const bareBody = ['be-c3-s1', 'be-c3-s3', 'be-c3-s4', 'be-c3-s5', 'be-c3-s7']; // 正文裸链 docs.spring.io
const addCanonical = {                                   // 代码样例里的示例地址 → 补权威规范源
  'be-net-s4': ['MDN · HTTP 概述', 'https://developer.mozilla.org/en-US/docs/Web/HTTP'],
  'be-net-s5': ['MDN · TLS 传输层安全', 'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
  'be-msa-s3': ['Spring Cloud · 客户端负载均衡', 'https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#spring-cloud-loadbalancer'],
};

const ANCHOR_HEAD = '> 来源（可溯源锚点）：';
const SUFFIX = '（官方源，可点击回溯）';

function upgradeMeta(c) {
  return c.replace('来源=官方', '来源=官方(可溯源)');
}

const report = [];

// 1) headerOnly：在首个 > - 子弹前插入头行
for (const id of headerOnly) {
  const s = get(id);
  let c = s.content;
  const lines = c.split('\n');
  const idx = lines.findIndex(l => /^>\s*-\s/.test(l));
  if (idx >= 0 && !lines.includes(ANCHOR_HEAD)) {
    lines.splice(idx, 0, ANCHOR_HEAD);
  }
  c = lines.join('\n');
  c = upgradeMeta(c);
  s.content = c;
  report.push(`${id}: headerOnly (插入头行 + meta)`);
}

// 2) bareBody：抽取正文 docs.spring.io 裸链建锚点
for (const id of bareBody) {
  const s = get(id);
  let c = s.content;
  const m = c.match(/https?:\/\/docs\.spring\.io\/[^\s):]+/);
  if (!m) { report.push(`${id}: bareBody SKIP (no spring url)`); continue; }
  const url = m[0];
  const body = c.replace(/\s+$/, '');
  const anchor = `${ANCHOR_HEAD}\n> - Spring 官方文档：${url}${SUFFIX}`;
  c = body + '\n' + anchor;
  c = upgradeMeta(c);
  s.content = c;
  report.push(`${id}: bareBody (spring url -> 锚点)`);
}

// 3) addCanonical：代码样例示例地址替换为权威规范源锚点
for (const [id, [desc, url]] of Object.entries(addCanonical)) {
  const s = get(id);
  let c = s.content;
  const body = c.replace(/\s+$/, '');
  const anchor = `${ANCHOR_HEAD}\n> - ${desc}：${url}${SUFFIX}`;
  c = body + '\n' + anchor;
  c = upgradeMeta(c);
  s.content = c;
  report.push(`${id}: addCanonical (${desc})`);
}

writeFileSync('data/seed-content.json', JSON.stringify(data, null, 2));
console.log(report.join('\n'));
console.log('done. total handled:', report.length);
