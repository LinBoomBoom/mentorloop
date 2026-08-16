const TARGETS = [
  // Wikipedia 不同访问路径（同一 host，验证是否 host 级封锁）
  { name: 'wiki-rest',        url: 'https://en.wikipedia.org/api/rest_v1/page/summary/CAP_theorem' },
  { name: 'wiki-action',      url: 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=CAP_theorem&format=json&explaintext=1&exintro=1' },
  { name: 'wiki-mobile',      url: 'https://en.m.wikipedia.org/wiki/CAP_theorem' },
  { name: 'wiki-www',         url: 'https://en.wikipedia.org/wiki/CAP_theorem' },
  // 第三方镜像（不同网络路径，可能未被封锁）
  { name: 'wikiwand',         url: 'https://www.wikiwand.com/en/articles/CAP_theorem' },
  { name: 'wikipedia-org',    url: 'https://wikipedia.org/wiki/CAP_theorem' },
  // 其他被挡的 host 复测
  { name: 'kubernetes',       url: 'https://kubernetes.io/docs/home/' },
  { name: 'gnu',              url: 'https://www.gnu.org/' },
  { name: 'openapi',          url: 'https://www.openapis.org/' },
];

async function probe(t) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const t0 = Date.now();
  try {
    const r = await fetch(t.url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,application/json' },
    });
    clearTimeout(timer);
    const buf = await r.arrayBuffer();
    return { name: t.name, status: r.status, ms: Date.now() - t0, bytes: buf.byteLength };
  } catch (e) {
    clearTimeout(timer);
    return { name: t.name, status: 'ERR', ms: Date.now() - t0, err: (e.cause?.code || e.message || String(e)).slice(0, 40) };
  }
}

for (const t of TARGETS) {
  const r = await probe(t);
  const detail = r.status === 'ERR' ? `ERR ${r.err}` : `HTTP ${r.status} ${r.bytes}B`;
  console.log(`${r.name.padEnd(14)} ${String(r.ms).padStart(5)}ms  ${detail}`);
}
