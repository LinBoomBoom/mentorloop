// 后端溯源补齐：抓取可达官方/权威源（仅非 SPA、落真实正文）
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/backend-v2-batch';
fs.mkdirSync(OUT, { recursive: true });

function cleanHtml(html) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  let b = '';
  const m = h.match(/<main[\s\S]*?<\/main>/i) || h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<body[\s\S]*?<\/body>/i);
  if (m) b = m[0]; else b = h;
  b = b.replace(/<h([1-6])[^>]*>/gi, '\n## ').replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  b = b.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&rarr;|&larr;|&times;|&middot;|&hellip;/g, ' ');
  return b.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

async function fetchOne(url, name, timeout = 18000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MentorLoopCuration/1.0)', 'Accept': 'text/html,application/xhtml+xml' }
    });
    clearTimeout(t);
    if (!r.ok) return { name, url, status: r.status, len: 0 };
    const ct = r.headers.get('content-type') || '';
    if (!/html|xml|text/.test(ct) && !url.endsWith('.html')) {
      // PDF or non-html: skip extraction but note
      return { name, url, status: r.status, len: 0, note: 'non-html(' + ct + ')' };
    }
    const x = cleanHtml(await r.text());
    const ok = x.length > 1500;
    if (ok) fs.writeFileSync(path.join(OUT, name + '.txt'), x);
    return { name, url, status: r.status, len: x.length, saved: ok };
  } catch (e) {
    clearTimeout(t);
    return { name, url, status: 'ERR', len: 0, err: String(e.message || e).slice(0, 80) };
  }
}

// name -> URL  (覆盖 94 缺源小节的主题)
const TARGETS = {
  // --- 数据结构与算法 (be-dsa) ---
  'wiki-bigo': 'https://en.wikipedia.org/wiki/Big_O_notation',
  'wiki-dynarray': 'https://en.wikipedia.org/wiki/Dynamic_array',
  'wiki-linkedlist': 'https://en.wikipedia.org/wiki/Linked_list',
  'py-collections': 'https://docs.python.org/3/library/collections.html',
  'py-stdtypes': 'https://docs.python.org/3/library/stdtypes.html',
  'wiki-tree': 'https://en.wikipedia.org/wiki/Tree_(data_structure)',
  'wiki-heap': 'https://en.wikipedia.org/wiki/Heap_(data_structure)',
  'wiki-graph': 'https://en.wikipedia.org/wiki/Graph_(abstract_data_type)',
  'wiki-sort': 'https://en.wikipedia.org/wiki/Sorting_algorithm',
  'wiki-hashtable': 'https://en.wikipedia.org/wiki/Hash_table',
  'wiki-stack': 'https://en.wikipedia.org/wiki/Stack_(abstract_data_type)',
  'wiki-queue': 'https://en.wikipedia.org/wiki/Queue_(abstract_data_type)',
  'wiki-binsearch': 'https://en.wikipedia.org/wiki/Binary_search_algorithm',
  'wiki-bfs': 'https://en.wikipedia.org/wiki/Breadth-first_search',
  'wiki-dfs': 'https://en.wikipedia.org/wiki/Depth-first_search',
  // --- 网络/IO (be-net) ---
  'man7-epoll': 'https://man7.org/linux/man-pages/man7/epoll.7.html',
  'wiki-udp': 'https://en.wikipedia.org/wiki/User_Datagram_Protocol',
  'wiki-dns': 'https://en.wikipedia.org/wiki/Domain_Name_System',
  // --- 操作系统 (be-os) ---
  'wiki-process': 'https://en.wikipedia.org/wiki/Process_(computing)',
  'wiki-thread': 'https://en.wikipedia.org/wiki/Thread_(computing)',
  'wiki-ipc': 'https://en.wikipedia.org/wiki/Inter-process_communication',
  'wiki-vmem': 'https://en.wikipedia.org/wiki/Virtual_memory',
  'wiki-fs': 'https://en.wikipedia.org/wiki/File_system',
  'gnu-coreutils': 'https://www.gnu.org/software/coreutils/manual/coreutils.html',
  'gnu-bash': 'https://www.gnu.org/software/bash/manual/bash.html',
  'man7-signal': 'https://man7.org/linux/man-pages/man7/signal.7.html',
  'man7-namespaces': 'https://man7.org/linux/man-pages/man7/namespaces.7.html',
  'wiki-cgroup': 'https://en.wikipedia.org/wiki/Cgroup',
  // --- 消息队列 (be-mq) ---
  'wiki-mq': 'https://en.wikipedia.org/wiki/Message_queue',
  'rabbitmq': 'https://www.rabbitmq.com/docs',
  'wiki-kafka': 'https://en.wikipedia.org/wiki/Apache_Kafka',
  // --- Spring (be-c3) ---
  'spring-boot-ref': 'https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/',
  'jakarta-cdi': 'https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0.html',
  // --- 微服务 (be-msa) ---
  'k8s-configmap': 'https://kubernetes.io/docs/concepts/configuration/configmap/',
  'wiki-circuitbreaker': 'https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern',
  'wiki-2pc': 'https://en.wikipedia.org/wiki/Two-phase_commit_protocol',
  // --- 分布式 (be-dist) ---
  'wiki-cap': 'https://en.wikipedia.org/wiki/CAP_theorem',
  'wiki-consistency': 'https://en.wikipedia.org/wiki/Consistency_model',
  'raft-site': 'https://raft.github.io/',
  'redis-locks': 'https://redis.io/docs/latest/develop/use/patterns/distributed-locks/',
  'wiki-snowflake': 'https://en.wikipedia.org/wiki/Snowflake_ID',
  'wiki-conshash': 'https://en.wikipedia.org/wiki/Consistent_hashing',
  'wiki-quorum': 'https://en.wikipedia.org/wiki/Quorum_(distributed_computing)',
  'wiki-replication': 'https://en.wikipedia.org/wiki/Replication_(computing)',
  'wiki-logclock': 'https://en.wikipedia.org/wiki/Logical_clock',
  'wiki-tokenbucket': 'https://en.wikipedia.org/wiki/Token_bucket',
  'wiki-leakybucket': 'https://en.wikipedia.org/wiki/Leaky_bucket',
  'wiki-cdn': 'https://en.wikipedia.org/wiki/Content_delivery_network',
  'wiki-urlshort': 'https://en.wikipedia.org/wiki/URL_shortening',
  'w3c-activitypub': 'https://www.w3.org/TR/activitypub/',
  // --- 设计模式 (be-c5) ---
  'wiki-gof': 'https://en.wikipedia.org/wiki/Design_Patterns',
  'wiki-singleton': 'https://en.wikipedia.org/wiki/Singleton_pattern',
  'wiki-factory': 'https://en.wikipedia.org/wiki/Factory_method_pattern',
  'wiki-adapter': 'https://en.wikipedia.org/wiki/Adapter_pattern',
  'wiki-decorator': 'https://en.wikipedia.org/wiki/Decorator_pattern',
  'wiki-proxy': 'https://en.wikipedia.org/wiki/Proxy_pattern',
  'wiki-strategy': 'https://en.wikipedia.org/wiki/Strategy_pattern',
  'wiki-observer': 'https://en.wikipedia.org/wiki/Observer_pattern',
  'wiki-template': 'https://en.wikipedia.org/wiki/Template_method_pattern',
  'wiki-command': 'https://en.wikipedia.org/wiki/Command_pattern',
  'wiki-ioc': 'https://en.wikipedia.org/wiki/Inversion_of_control',
  'wiki-di': 'https://en.wikipedia.org/wiki/Dependency_injection',
  'wiki-solid': 'https://en.wikipedia.org/wiki/SOLID',
  'wiki-ddd': 'https://en.wikipedia.org/wiki/Domain-driven_design',
  'wiki-hexagonal': 'https://en.wikipedia.org/wiki/Hexagonal_architecture_(software)',
  'wiki-layered': 'https://en.wikipedia.org/wiki/Multitier_architecture',
  'wiki-antipattern': 'https://en.wikipedia.org/wiki/Anti-pattern',
  // --- 安全 (be-sec) ---
  'oauth2': 'https://oauth.net/2/',
  'jwt-intro': 'https://jwt.io/introduction',
  'wiki-auth': 'https://en.wikipedia.org/wiki/Authentication',
  'wiki-authorization': 'https://en.wikipedia.org/wiki/Authorization',
  'wiki-salt': 'https://en.wikipedia.org/wiki/Salt_(cryptography)',
  'wiki-pkc': 'https://en.wikipedia.org/wiki/Public-key_cryptography',
  'wiki-rbac': 'https://en.wikipedia.org/wiki/Role-based_access_control',
  // --- 测试 (be-test) ---
  'wiki-testpyramid': 'https://en.wikipedia.org/wiki/Test_pyramid',
  'wiki-swtest': 'https://en.wikipedia.org/wiki/Software_testing',
  'junit5': 'https://junit.org/junit5/docs/current/user-guide/',
  'mockito': 'https://site.mockito.org/',
  'wiki-mock': 'https://en.wikipedia.org/wiki/Mock_object',
  'testcontainers': 'https://java.testcontainers.org/',
  'wiki-inttest': 'https://en.wikipedia.org/wiki/Integration_testing',
  'pact': 'https://pact.io/',
  'wiki-tdd': 'https://en.wikipedia.org/wiki/Test-driven_development',
  'wiki-coverage': 'https://en.wikipedia.org/wiki/Code_coverage',
  'wiki-fixture': 'https://en.wikipedia.org/wiki/Test_fixture',
  // --- API (be-api) ---
  'wiki-rest': 'https://en.wikipedia.org/wiki/Representational_state_transfer',
  'ms-apiguidelines': 'https://github.com/microsoft/api-guidelines',
  'semver': 'https://semver.org/',
  'openapi': 'https://spec.openapis.org/',
  'graphql': 'https://graphql.org/learn/',
  'grpc': 'https://grpc.io/docs/',
  'owasp-api': 'https://owasp.org/www-project-api-security/',
  // --- NoSQL (be-nosql) ---
  'wiki-nosql': 'https://en.wikipedia.org/wiki/NoSQL',
  'mongodb': 'https://www.mongodb.com/docs/manual/',
  'cassandra': 'https://cassandra.apache.org/doc/latest/',
  'hbase': 'https://hbase.apache.org/book.html',
  'neo4j': 'https://neo4j.com/docs/',
  'wiki-graphdb': 'https://en.wikipedia.org/wiki/Graph_database',
  'wiki-tfidf': 'https://en.wikipedia.org/wiki/Tf%E2%80%93idf',
  'wiki-bm25': 'https://en.wikipedia.org/wiki/Okapi_BM25',
  'wiki-eventual': 'https://en.wikipedia.org/wiki/Eventual_consistency',
  'redis-datatypes': 'https://redis.io/docs/latest/develop/data-types/'
};

const entries = Object.entries(TARGETS);
const CONC = 8;
let done = 0;
async function run() {
  const results = [];
  for (let i = 0; i < entries.length; i += CONC) {
    const batch = entries.slice(i, i + CONC);
    const rs = await Promise.all(batch.map(([n, u]) => fetchOne(u, n)));
    for (const r of rs) {
      done++;
      const tag = r.saved ? 'SAVED' : (r.err ? 'ERR ' : (r.note || 'skip '));
      console.log(`[${done}/${entries.length}] ${tag.padEnd(5)} ${r.name.padEnd(20)} ${r.status} len=${r.len}${r.err ? ' ' + r.err : ''}`);
      results.push(r);
    }
  }
  const saved = results.filter(r => r.saved).length;
  const failed = results.filter(r => r.err);
  console.log(`\n=== DONE: saved=${saved} total=${entries.length} failed=${failed.length} ===`);
  if (failed.length) console.log('FAILED:', failed.map(f => f.name + ':' + (f.err || f.status)).join(', '));
}
run();
