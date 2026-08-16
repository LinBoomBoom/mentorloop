// 一次性脚本：为后端 4 章（be-mq/be-net/be-sec/be-msa）注入真实官方源 URL + 溯源块。
// 仅使用已真实抓取的官方源；无源章节不编造。源字段改 "来源=官方" -> "来源=官方(可溯源)"。
import fs from 'node:fs';

const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const be = s.modules.find(m => m.id === 'backend');

const SRC = {
  redis:  { desc: 'Redis 官方文档 · Streams（XADD/XGROUP/XACK/PEL/裁剪，消息队列实现范例）', url: 'https://redis.io/docs/latest/develop/data-types/streams/', chars: 561795 },
  man7:   { desc: 'Linux man-pages · tcp(7)（TCP 协议语义、socket API、拥塞控制、Nagle、TIME_WAIT、keepalive）', url: 'https://man7.org/linux/man-pages/man7/tcp.7.html', chars: 45240 },
  mdn:    { desc: 'MDN Web Docs · Web Security（HTTPS/CSP/trusted-types/SameSite+Secure+HttpOnly/输入校验+输出编码/SRI/passkeys/TOTP）', url: 'https://developer.mozilla.org/en-US/docs/Web/Security', chars: 6510 },
  owasp:  { desc: 'OWASP Top 10 官方（已确认 2025 为最新版；本次抓取页为流程页，具体 10 条待补抓正文）', url: 'https://owasp.org/www-project-top-ten/', chars: 17246 },
  msio:   { desc: 'microservices.io（微服务定义、bounded context、Strangler Fig、Saga/CQRS/API Composition）', url: 'https://microservices.io/', chars: 9689 },
  mslearn:{ desc: 'Microsoft Learn · Microservices architecture style（组件、收益、挑战、最佳实践、反模式）', url: 'https://learn.microsoft.com/azure/architecture/guide/architecture-styles/microservices', chars: 17449 },
};

function upgradeMeta(content) {
  return content.replace(/^(> 时效 \| 核验=2026-08-02 \| 风险=(?:低|中|高) \| 来源=)官方$/m, '$1官方(可溯源)');
}
function srcBlock(sources) {
  const lines = sources.map(x => `> - ${x.desc} — ${x.url}（HTTP 200，已抓取 ${x.chars} 字真实正文）`);
  return '\n\n> 来源（可溯源锚点）：\n' + lines.join('\n');
}
function factLine(fact) {
  return '\n\n> 官方源印证（代行策展真实抓取）：' + fact;
}

// 章节级溯源块（挂到该章最后一节）
function chapterBlock(items, note) {
  let out = '\n\n> 本章溯源（代行策展 · 真实抓取，可点击回溯）：\n';
  for (const it of items) out += `> - ${it.desc} — ${it.url}（HTTP 200，已抓取 ${it.chars} 字真实正文）\n`;
  if (note) out += '> 备注：' + note + '\n';
  return out;
}

const plans = {
  'be-mq': {
    note: 'Kafka 官方文档(kafka.apache.org)为 JS-SPA，沙箱抓取仅 14 字未做正文提取，相关 Kafka 陈述以通用消息队列知识呈现；Redis Streams 以官方源补足。',
    chapter: [SRC.redis],
    sections: {
      'be-mq-s1': { src: [SRC.redis], fact: 'Redis Streams 是 append-only log，支持 O(1) 随机访问与 consumer groups 等复杂消费策略（redis.io 真实抓取）。' },
      'be-mq-s3': { src: [SRC.redis], fact: 'Redis Streams 支持多消费策略（XREAD / XREADGROUP / XRANGE）与多种裁剪策略防止无限增长（redis.io）。' },
      'be-mq-s7': { src: [SRC.redis], fact: 'Redis Streams 用 consumer group + PEL（pending entries list）+ XACK 实现至少一次投递与重试（redis.io）。' },
    },
  },
  'be-net': {
    note: '',
    chapter: [SRC.man7],
    sections: {
      'be-net-s1': { src: [SRC.man7], fact: 'TCP 运行于 ip(7) 之上，提供两 socket 间可靠/面向流/全双工连接（man7 tcp(7)）。' },
      'be-net-s2': { src: [SRC.man7], fact: 'man7 tcp(7)：TCP 保证按序到达并重传丢失包、每包校验和，但不保留记录边界；connect/accept 建连；含拥塞控制、窗口缩放、TCP_NODELAY/Nagle、keepalive、TIME_WAIT 等内核参数。' },
    },
  },
  'be-sec': {
    note: 'OWASP Top 10 已确认 2025 为最新版；本次抓取页为"数据采集/流程"页，未含具体 10 条分类正文，故仅作风险目录参考，具体清单待补抓。',
    chapter: [SRC.mdn, SRC.owasp],
    sections: {
      'be-sec-s7': { src: [SRC.mdn], fact: 'MDN：所有外部输入需服务端校验（类型/长度/范围/白名单），所有输出按 HTML/SQL/命令对应编码/参数化，是防注入根本。' },
      'be-sec-s8': { src: [SRC.mdn], fact: 'MDN：XSS 靠 CSP/trusted-types/输出编码/HttpOnly Cookie 防；CSRF 靠 SameSite Cookie/CSRF token/校验 Origin 防；列表还含 IDOR/SSRF。' },
      'be-sec-s10': { src: [SRC.mdn, SRC.owasp], fact: 'MDN：CSP（含 frame-ancestors 防点击劫持）、SRI（防 CDN 篡改）、Cookie 三属性(SameSite/Secure/HttpOnly) 属纵深防御关键响应头；OWASP Top 10 作风险目录。' },
    },
  },
  'be-msa': {
    note: '',
    chapter: [SRC.msio, SRC.mslearn],
    sections: {
      'be-msa-s1': { src: [SRC.msio, SRC.mslearn], fact: 'microservices.io + MS Learn：微服务是 small/autonomous/independently deployable/loosely coupled 的服务集合，围绕 business capabilities 组织。' },
      'be-msa-s2': { src: [SRC.mslearn], fact: 'MS Learn：每服务在 bounded context 内实现单一能力、拥有自己数据与 schema（polyglot persistence），不共享代码/数据。' },
      'be-msa-s5': { src: [SRC.mslearn], fact: 'MS Learn：API 网关作统一入口，处理认证/日志/负载均衡等横切关注点；网关不应持有领域知识。' },
      'be-msa-s7': { src: [SRC.mslearn], fact: 'MS Learn：消息中间件(Kafka/Service Bus)支撑异步通信、松耦合、事件驱动，是 BASE 最终一致的基础。' },
      'be-msa-s9': { src: [SRC.mslearn], fact: 'MS Learn：可观测性=集中日志+APM/OpenTelemetry 实时监控+分布式追踪跨服务边界定位瓶颈。' },
    },
  },
};

let changed = 0;
for (const [cid, plan] of Object.entries(plans)) {
  const c = be.chapters.find(x => x.id === cid);
  if (!c) { console.error('MISSING chapter', cid); continue; }
  const lastSec = c.sections[c.sections.length - 1];
  // 章节级溯源块挂最后一节
  lastSec.content += chapterBlock(plan.chapter, plan.note);
  // 小节级注入
  for (const [sid, spec] of Object.entries(plan.sections)) {
    const sec = c.sections.find(x => x.id === sid);
    if (!sec) { console.error('MISSING section', sid); continue; }
    sec.content = upgradeMeta(sec.content);
    sec.content += srcBlock(spec.src);
    if (spec.fact) sec.content += factLine(spec.fact);
    changed++;
  }
}

fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log('INJECTED sections:', changed, '| chapters touched:', Object.keys(plans).length);
