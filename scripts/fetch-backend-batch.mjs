// 批量抓取可达官方站真实正文（仅抓取，不生成）：后端缺口域
// 用法: node scripts/fetch-backend-batch.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/backend-batch';
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { name: 'redis-streams', url: 'https://redis.io/docs/latest/develop/data-types/streams/' },
  { name: 'man7-tcp',     url: 'https://man7.org/linux/man-pages/man7/tcp.7.html' },
  { name: 'mdn-security', url: 'https://developer.mozilla.org/en-US/docs/Web/Security' },
  { name: 'spring-micro', url: 'https://spring.io/microservices' },
  { name: 'kafka-docs',   url: 'https://kafka.apache.org/documentation/' },
  { name: 'owasp-top10',  url: 'https://owasp.org/www-project-top-ten/' },
];

function cleanHtml(html) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  let block = '';
  const m = h.match(/<main[\s\S]*?<\/main>/i) || h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<body[\s\S]*?<\/body>/i);
  if (m) block = m[0]; else block = h;
  block = block.replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main)>/gi, '\n');
  block = block.replace(/<[^>]+>/g, ' ');
  block = block
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MentorLoopContentBot/1.0)', 'Accept': 'text/html,application/xhtml+xml' },
    });
    clearTimeout(timer);
    if (!res.ok) return { ...t, status: res.status, len: 0 };
    const html = await res.text();
    const text = cleanHtml(html);
    writeFileSync(join(OUT, t.name + '.txt'), text, 'utf8');
    return { ...t, status: res.status, len: text.length, file: join(OUT, t.name + '.txt') };
  } catch (e) {
    clearTimeout(timer);
    return { ...t, status: 'ERR', len: 0, err: String(e && e.message || e) };
  }
}

for (const t of TARGETS) {
  const r = await fetchOne(t);
  console.log(`${r.name.padEnd(14)} ${String(r.status).padEnd(5)} len=${String(r.len).padStart(7)}  ${r.url}`);
  if (r.err) console.log('   err:', r.err.slice(0, 120));
}
console.log('\nSaved to', OUT);
