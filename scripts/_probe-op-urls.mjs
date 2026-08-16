import fs from 'node:fs';

const IN = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/op-urls.json';
const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/op-probe.json';
const data = JSON.parse(fs.readFileSync(IN, 'utf8'));

// clean + dedupe real urls (strip trailing （... chinese paren and junk)
const clean = (u) => u.replace(/（.*$/, '').replace(/[\s]+$/, '').trim();

const seen = new Map();
for (const r of data.real) {
  const u = clean(r.url);
  if (!/^https?:\/\//.test(u)) continue;
  if (!seen.has(u)) seen.set(u, r.sids);
}
const urls = [...seen.entries()].map(([url, sids]) => ({ url, sids }));
console.log('probing', urls.length, 'clean real URLs');

function cleanHtmlLen(html) {
  // rough text length after stripping scripts/styles
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[\s\S]*?>/g, ' ');
  return h.replace(/\s+/g, ' ').trim().length;
}

async function one({ url, sids }, i) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  const s = Date.now();
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,application/pdf,*/*' }
    });
    let len = 0;
    try {
      const buf = await r.arrayBuffer();
      len = buf.byteLength;
      // try text length for html
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('text/html')) len = cleanHtmlLen(Buffer.from(buf).toString('utf8'));
    } catch (e) { /* ignore */ }
    clearTimeout(t);
    return { url, sids, status: r.status, len, ms: Date.now() - s };
  } catch (e) {
    clearTimeout(t);
    return { url, sids, status: 'ERR', err: String(e.cause?.code || e.message || e).slice(0, 30), ms: Date.now() - s };
  }
}

const CONC = 8;
const results = [];
for (let i = 0; i < urls.length; i += CONC) {
  const batch = urls.slice(i, i + CONC);
  const rs = await Promise.all(batch.map(u => one(u, i)));
  for (const r of rs) {
    results.push(r);
    const tag = r.status === 'ERR' ? 'ERR ' + (r.err || '') : ('HTTP ' + r.status);
    console.log(tag.padEnd(14), (r.len ? (r.len + 'B') : '').padEnd(9), r.url.slice(0, 70));
  }
}
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log('saved', OUT, '| ok=', results.filter(r => r.status === 200).length, 'err=', results.filter(r => r.status === 'ERR').length);
