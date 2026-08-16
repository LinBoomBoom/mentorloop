import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('data/seed-content.json', 'utf8');
const data = JSON.parse(raw);

// 仅对“单一明确官方源”的 tech 映射（其余留 null，交专家锚定，避免伪造）
const TECH_HUB = {
  'CSS': 'https://developer.mozilla.org/zh-CN/docs/Web/CSS',
  'JavaScript': 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript',
  'HTML': 'https://developer.mozilla.org/zh-CN/docs/Web/HTML',
  'TypeScript': 'https://www.typescriptlang.org/docs/',
  'React': 'https://react.dev/',
  'Vue': 'https://vuejs.org/',
  '网络/HTTP': 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP',
  '网络/TCP': 'https://man7.org/linux/man-pages/man7/tcp.7.html',
  '网络/TCP/HTTPS': 'https://developer.mozilla.org/zh-CN/docs/Web/Security/Transport_Layer_Security',
  '浏览器/渲染': 'https://developer.mozilla.org/zh-CN/docs/Web/Performance',
  '性能优化': 'https://developer.mozilla.org/zh-CN/docs/Web/Performance',
  '安全': 'https://owasp.org/',
  'Java': 'https://docs.oracle.com/en/java/',
  'MySQL/数据库': 'https://dev.mysql.com/doc/refman/8.4/en/',
  'Spring': 'https://docs.spring.io/spring-framework/reference/',
  'Redis/缓存': 'https://redis.io/docs/latest/',
  '消息队列': 'https://www.rabbitmq.com/docs/',
  '容器/Docker': 'https://docs.docker.com/',
  'Kubernetes': 'https://kubernetes.io/docs/',
  'Linux/排查': 'https://man7.org/linux/man-pages/',
  'Nginx/网关': 'https://nginx.org/en/docs/',
  '监控/SRE': 'https://prometheus.io/docs/',
  '并发/多线程': 'https://docs.oracle.com/en/java/',
  '工程化/构建': 'https://nodejs.org/en/docs',
  '分布式/微服务': 'https://microservices.io/',
  'Agent/工具调用': 'https://platform.openai.com/docs/guides/function-calling',
};

// 过滤：剔除示例/内部/非官方域名
const JUNK = /(example\.com|example\.org|localhost|127\.0\.0\.1|0\.0\.0\.0|mentorloop|devmentor)/i;
function isGood(u) {
  try {
    const url = new URL(u);
    if (JUNK.test(u)) return false;
    if (/(mentorloop|devmentor)/i.test(url.hostname)) return false;
    return true;
  } catch { return false; }
}

function extractUrl(text) {
  const re = /https?:\/\/[^\s)\]】]+/g;
  const found = text.match(re) || [];
  for (const u of found) if (isGood(u)) return u.replace(/[。，,；;：:）)]+$/, '');
  return null;
}

const iv = data.interview;
let totalQ = 0, fromAnswer = 0, fromHub = 0, nulled = 0;
const hubUsed = {};

for (const m of ['frontend', 'backend', 'devops', 'ai']) {
  const grp = iv[m];
  if (!grp) continue;
  for (const b of Object.keys(grp).filter(k => Array.isArray(grp[k]))) {
    for (const q of grp[b]) {
      totalQ++;
      let src = null;
      // P1: 答案里已有的真实 URL
      if (q.a) src = extractUrl(q.a);
      if (src) { fromAnswer++; q.source = src; continue; }
      // P2: tech → 官方枢纽
      if (q.tech && TECH_HUB[q.tech]) {
        src = TECH_HUB[q.tech];
        fromHub++; hubUsed[q.tech] = (hubUsed[q.tech] || 0) + 1;
        q.source = src; continue;
      }
      // 其余留 null
      q.source = null; nulled++;
    }
  }
}

// examSets：仅抽取 explain/reference/q 中已有 URL；无则留 null
const es = data.examSets;
let esItems = 0, esFromAnswer = 0, esNull = 0;
for (const e of es) {
  for (const c of (e.choices || [])) {
    esItems++;
    const u = extractUrl([c.explain, c.q].filter(Boolean).join('\n'));
    if (u) { c.source = u; esFromAnswer++; } else { c.source = null; esNull++; }
  }
  for (const w of (e.written || [])) {
    esItems++;
    const u = extractUrl([w.reference, w.q].filter(Boolean).join('\n'));
    if (u) { w.source = u; esFromAnswer++; } else { w.source = null; esNull++; }
  }
}

writeFileSync('data/seed-content.json', JSON.stringify(data, null, 2));
console.log(`题库: 总=${totalQ} 精确URL=${fromAnswer} 枢纽源=${fromHub} 留null=${nulled}`);
console.log(`考卷条目: 总=${esItems} 精确URL=${esFromAnswer} 留null=${esNull}`);
console.log('枢纽命中 tech:', Object.entries(hubUsed).map(([k,v])=>`${k}:${v}`).join('  '));
