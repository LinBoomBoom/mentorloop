import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('data/seed-content.json', 'utf8');
const data = JSON.parse(raw);

const mod = data.modules.find(m => m.id === 'frontend');
const sections = (mod.chapters || []).flatMap(ch => ch.sections || []);

const isAlready = s => s.content.includes('来源（可溯源锚点）');
const old = sections.filter(s => /https?:\/\//.test(s.content) && !isAlready(s));

// 过滤非来源 URL
const JUNK = /(example\.com|example\.org|localhost|127\.0\.0\.1|0\.0\.0\.0)/i;
const INTERNAL = /(mentorloop\.|devmentor\.)/i; // 本应用自身域名，非外部官方源
function keepUrl(u) {
  try {
    const url = new URL(u);
    if (JUNK.test(u)) return false;
    if (INTERNAL.test(url.hostname)) return false;
    return true;
  } catch { return false; }
}
function hostDesc(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return '官方源'; }
}
function cleanDesc(d) {
  if (!d) return '';
  return d.replace(/[：:]\s*$/, '').trim(); // 去掉结尾冒号，避免双冒号
}

let converted = 0, zeroWarn = [], leftoverWarn = [];
for (const s of old) {
  const c0 = s.content;
  const entries = []; // {desc, url}
  const seen = new Set();
  const push = (desc, url) => {
    if (!url || !keepUrl(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ desc: cleanDesc(desc), url });
  };

  // 1) 内联 markdown 链接 [desc](url)
  const mdRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let m;
  while ((m = mdRe.exec(c0)) !== null) push(m[1], m[2]);

  // 2) 来源行（blockquote 或纯文本，可能含多个 URL，用 空格/、/，/； 分隔）
  const URL_RE = /https?:\/\/[^\s、。，,；;）)]+/g;
  const srcLines = c0.split('\n');
  for (const ln of srcLines) {
    if (/^>\s*来源[：:]/.test(ln)) {
      const urls = ln.match(URL_RE) || [];
      for (const u of urls) push('', u); // 裸链 → 用 host 作描述
    } else if (/^来源[：:]/.test(ln)) {
      const urls = ln.match(URL_RE) || [];
      const before = ln.replace(/^来源[：:]\s*/, '').replace(URL_RE, '').replace(/[：:、。，,；;\s]+$/, '').trim();
      for (const u of urls) push(before, u);
    }
  }

  if (entries.length === 0) { zeroWarn.push(s.id); continue; }

  // 移除独立旧 来源 行（blockquote + plain）
  let body = c0
    .split('\n')
    .filter(ln => !/^>\s*来源[：:]/.test(ln))
    .filter(ln => !/^来源[：:]/.test(ln))
    .join('\n');
  // 压缩多余空行
  body = body.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');

  // 构建锚点块
  const lines = ['', '> 来源（可溯源锚点）：'];
  for (const e of entries) {
    const desc = e.desc || hostDesc(e.url);
    lines.push(`> - ${desc}：${e.url}（官方源，可点击回溯）`);
  }
  let newContent = body + lines.join('\n');
  // 升级 meta（仅替换首个 来源=官方，避免误伤正文）
  newContent = newContent.replace('来源=官方', '来源=官方(可溯源)');

  // 残留旧 来源 行检查
  if (/^>\s*来源[：:]/.test(newContent) || /^来源[：:]/.test(newContent)) {
    leftoverWarn.push(s.id);
  }
  s.content = newContent;
  converted++;
}

// 也要处理“有 URL 但本就是纯文本来源行、无 md 链接”的章节（已在 old 中）

writeFileSync('data/seed-content.json', JSON.stringify(data, null, 2));
console.log('converted:', converted, '/', old.length);
console.log('zero-entry warnings (need manual):', zeroWarn.length, zeroWarn.slice(0, 20));
console.log('leftover 来源-line warnings:', leftoverWarn.length, leftoverWarn.slice(0, 20));
