const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/backend-v2-batch';
import fs from 'node:fs';

function cleanHtml(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  let b = '';
  const m = h.match(/<main[\s\S]*?<\/main>/i) || h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<body[\s\S]*?<\/body>/i);
  if (m) b = m[0]; else b = h;
  b = b.replace(/<h([1-6])[^>]*>/gi, '\n## ').replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main|ul|ol)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  b = b.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
  return b.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

async function one(url, name) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } });
    clearTimeout(t);
    if (!r.ok) return console.log(name, 'status', r.status);
    const x = cleanHtml(await r.text());
    if (x.length > 1500) fs.writeFileSync(OUT + '/' + name + '.txt', x);
    console.log(name, 'HTTP', r.status, 'len', x.length, x.length > 1500 ? '(saved)' : '(too short)');
  } catch (e) {
    clearTimeout(t);
    console.log(name, 'ERR', String(e.cause?.code || e.message || e).slice(0, 50));
  }
}

await one('https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/', 'k8s-whatis');
await one('https://kubernetes.io/docs/concepts/architecture/', 'k8s-arch');
await one('https://spec.openapis.org/oas/v3.1', 'openapi-spec');
await one('https://www.openapis.org/', 'openapi-org');
