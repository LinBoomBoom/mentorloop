// 批量抓取 AI 工程 + 运维缺口域的「真实可达官方源」正文（仅抓取，不生成）
// 用法: node scripts/fetch-ai-ops-batch.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/ai-ops-batch';
mkdirSync(OUT, { recursive: true });

// topic 标签: 用于后续把源映射到具体小节
const TARGETS = [
  // ---------------- AI 工程 ----------------
  { name: 'ai-sbert', topic: 'ai-c3-embedding', url: 'https://www.sbert.net/' },
  { name: 'ai-ragas', topic: 'ai-c5-eval', url: 'https://docs.ragas.io/en/stable/' },
  { name: 'ai-owasp-llm', topic: 'ai-c6-safety', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/' },
  { name: 'ai-rag-paper', topic: 'ai-c2-rag', url: 'https://arxiv.org/abs/2005.11401' },
  { name: 'ai-graphrag', topic: 'ai-c2-rag', url: 'https://github.com/microsoft/graphrag' },
  { name: 'ai-llamacpp', topic: 'ai-c7-infer', url: 'https://github.com/ggerganov/llama.cpp' },
  { name: 'ai-onnxrt', topic: 'ai-c7-infer', url: 'https://onnxruntime.ai/docs/' },
  { name: 'ai-openai-agents', topic: 'ai-c4-agent', url: 'https://openai.github.io/openai-agents-python/' },
  { name: 'ai-langgraph', topic: 'ai-c4-agent', url: 'https://langchain-ai.github.io/langgraph/' },
  { name: 'ai-promptfoo', topic: 'ai-c5-eval', url: 'https://www.promptfoo.com/docs/introduction/' },
  { name: 'ai-nist-aiframework', topic: 'ai-c6-safety', url: 'https://www.nist.gov/itl/ai-risk-management-framework' },
  { name: 'ai-distilbert', topic: 'ai-c7-infer', url: 'https://arxiv.org/abs/1909.10351' },
  { name: 'ai-hf-transformers', topic: 'ai-c3-embedding', url: 'https://huggingface.co/docs/transformers/index' },
  { name: 'ai-langchain-rag', topic: 'ai-c2-rag', url: 'https://python.langchain.com/docs/tutorials/rag/' },

  // ---------------- 运维缺口 ----------------
  { name: 'op-sre-book', topic: 'op-c5-sre', url: 'https://sre.google/sre-book/table-of-contents/' },
  { name: 'op-k8s-security', topic: 'op-c5-security', url: 'https://kubernetes.io/docs/concepts/security/' },
  { name: 'op-postgres-docs', topic: 'op-c6-dba', url: 'https://www.postgresql.org/docs/current/' },
  { name: 'op-mysql-docs', topic: 'op-c6-dba', url: 'https://dev.mysql.com/doc/refman/8.4/en/' },
  { name: 'op-aws-iac', topic: 'op-c7-iac', url: 'https://aws.amazon.com/what-is/infrastructure-as-code/' },
  { name: 'op-pulumi', topic: 'op-c7-iac', url: 'https://www.pulumi.com/docs/' },
  { name: 'op-azure-arch', topic: 'op-c7-cloud', url: 'https://learn.microsoft.com/en-us/azure/architecture/' },
  { name: 'op-backstage', topic: 'op-c8-idp', url: 'https://backstage.io/docs/' },
  { name: 'op-idp-org', topic: 'op-c8-idp', url: 'https://internaldeveloperplatform.org/' },
  { name: 'op-gitlab-cicd', topic: 'op-c4-cicd', url: 'https://docs.gitlab.com/ee/ci/' },
  { name: 'op-prometheus-docs', topic: 'op-c4-observability', url: 'https://prometheus.io/docs/introduction/overview/' },
  { name: 'op-grafana-docs', topic: 'op-c4-observability', url: 'https://grafana.com/docs/grafana/latest/' },
  { name: 'op-cncf', topic: 'op-c8-idp', url: 'https://www.cncf.io/ ' },
  { name: 'op-aws-wellarch-cost', topic: 'op-c5-cost', url: 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html' },
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
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(t.url.trim(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MentorLoopContentBot/1.0)', 'Accept': 'text/html,application/xhtml+xml' },
    });
    clearTimeout(timer);
    if (!res.ok) return { ...t, status: res.status, len: 0 };
    const html = await res.text();
    const text = cleanHtml(html);
    if (text.length > 1500) writeFileSync(join(OUT, t.name + '.txt'), text, 'utf8');
    return { ...t, status: res.status, len: text.length, saved: text.length > 1500 };
  } catch (e) {
    clearTimeout(timer);
    return { ...t, status: 'ERR', len: 0, err: String((e && e.message) || e) };
  }
}

const results = await Promise.all(TARGETS.map(fetchOne));
console.log('name'.padEnd(22), 'topic'.padEnd(20), 'status'.padEnd(6), 'len');
for (const r of results) {
  console.log(String(r.name).padEnd(22), String(r.topic).padEnd(20), String(r.status).padEnd(6), String(r.len).padStart(7), r.saved ? '(saved)' : '');
  if (r.err) console.log('   err:', r.err.slice(0, 100));
}
console.log('\nSaved reachable text to', OUT);
