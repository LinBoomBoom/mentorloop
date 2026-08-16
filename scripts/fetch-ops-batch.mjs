// 批量抓取可达官方站真实正文（仅抓取，不生成）：日志/链路/混沌/多云
// 用法: node scripts/fetch-ops-batch.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/ops-batch';
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { name: 'loki',      url: 'https://grafana.com/docs/loki/latest/' },
  { name: 'tempo',     url: 'https://grafana.com/docs/tempo/latest/' },
  { name: 'elastic',   url: 'https://www.elastic.co/what-is/elk-stack' },
  { name: 'aws-fis',   url: 'https://docs.aws.amazon.com/fis/latest/userguide/what-is.html' },
  { name: 'aws-rel',   url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/reliability-pillar.html' },
  { name: 'terraform', url: 'https://developer.hashicorp.com/terraform/intro' },
];

function cleanHtml(html) {
  // 去掉 head/script/style/noscript/svg 及其内容
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  // 优先取 main/article，否则 body
  let block = '';
  const m = h.match(/<main[\s\S]*?<\/main>/i) || h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<body[\s\S]*?<\/body>/i);
  if (m) block = m[0];
  else block = h;
  // 块级标签换换行
  block = block.replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main)>/gi, '\n');
  // 去所有标签
  block = block.replace(/<[^>]+>/g, ' ');
  // 解码常见实体
  block = block
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&hellip;/g, '…');
  // 折叠空白
  block = block.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  return block;
}

async function fetchOne(t) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(t.url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MentorLoopContentBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { ...t, status: res.status, len: 0 };
    const html = await res.text();
    const text = cleanHtml(html);
    const file = join(OUT, t.name + '.txt');
    writeFileSync(file, text, 'utf8');
    return { ...t, status: res.status, len: text.length, file };
  } catch (e) {
    clearTimeout(timer);
    return { ...t, status: 'ERR', len: 0, err: String(e && e.message || e) };
  }
}

const results = [];
for (const t of TARGETS) {
  const r = await fetchOne(t);
  results.push(r);
  console.log(`${r.name.padEnd(10)} ${String(r.status).padEnd(5)} len=${String(r.len).padStart(7)}  ${r.url}`);
  if (r.err) console.log('   err:', r.err.slice(0, 120));
}
console.log('\nSaved to', OUT);
