import fs from 'node:fs';

const SEED = 'E:/LsqCoding/MentorLoop/data/seed-content.json';
const CG_PATH = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/backend-v2-batch/man7-cgroups.txt';

// cgroups.7 本会话已抓取的真实正文长度（诚实标注用）
let cgLen = null;
try { cgLen = fs.readFileSync(CG_PATH, 'utf8').trim().length; } catch (e) { cgLen = null; }

const s = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const dev = s.modules.find(m => m.id === 'devops');

function parseSourceLine(line) {
  const body = line.replace(/^\s*来源[:：]\s*/, '');
  const parts = body.split(/[；;]/).map(x => x.trim()).filter(Boolean);
  const entries = [];
  for (const p of parts) {
    const m = p.match(/(https?:\/\/\S+)/);
    if (m) {
      const url = m[1].replace(/[。；;）)\`]+$/, '');
      const desc = p.replace(m[1], '').replace(/[。；;）)\`]+$/, '').trim();
      entries.push({ desc, url, kind: 'url' });
    } else {
      const rfc = p.match(/RFC\s*(\d+)/i);
      if (rfc) {
        entries.push({ desc: p.trim(), url: 'https://www.rfc-editor.org/rfc/rfc' + rfc[1], kind: 'rfc' });
      } else {
        entries.push({ desc: p.trim(), url: null, kind: 'nourl' });
      }
    }
  }
  return entries;
}

const TARGETS = ['op-c1', 'op-c2', 'op-c3', 'op-c4'];
let upgraded = 0, skipped = 0, noSrc = 0;

for (const cid of TARGETS) {
  const c = dev.chapters.find(x => x.id === cid);
  for (const sec of c.sections) {
    if (sec.id === 'op-c3-s4') { skipped++; continue; } // 已升级
    const L = sec.content.split('\n');

    // idempotency: already upgraded block present
    if (/来源（可溯源锚点）/ .test(sec.content)) { skipped++; continue; }

    // meta upgrade
    if (L[0] && /来源=官方/.test(L[0]) && !/来源=官方\(可溯源\)/.test(L[0])) {
      L[0] = L[0].replace('来源=官方', '来源=官方(可溯源)');
    }

    const idx = L.findIndex(l => /^\s*来源[:：]/.test(l));
    if (idx === -1) { noSrc++; continue; }
    const entries = parseSourceLine(L[idx]);
    L.splice(idx, 1); // remove old inline 来源 line

    const block = ['> 来源（可溯源锚点）：'];
    for (const e of entries) {
      if (e.kind === 'nourl') {
        block.push('> - ' + e.desc + '（man 手册页 / 规范条目，未附直接 URL）');
      } else {
        let note = '(官方源，可点击回溯)';
        if (e.kind === 'rfc') note = '(RFC 官方文档，可点击回溯)';
        if (e.url.includes('cgroups.7') && cgLen != null) note = '(官方源，本会话已抓取 ' + cgLen + ' 字真实正文)';
        block.push('> - ' + (e.desc ? e.desc + ': ' : '') + e.url + ' ' + note);
      }
    }

    let out = L.join('\n').replace(/\s*$/, '');
    out += '\n\n' + block.join('\n') + '\n';
    sec.content = out;
    upgraded++;
  }
}

fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log('upgraded=' + upgraded, 'skipped(already done)=' + skipped, 'noSrcLine=' + noSrc, '| cgLen=' + cgLen);
