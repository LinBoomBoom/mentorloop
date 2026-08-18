// 用 CDP 打开真实页面，客观测量横向溢出与方向条滚动状态。
// 用法: node scripts/cdp-check-overflow.cjs <url> [outPng]
// 退出码 0 = 无溢出；1 = 检测到溢出（便于 && 串联到 git commit 前）

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const PORT = 9235;
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
];
const CHROME = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
const URL_TARGET = process.argv[2] || 'http://localhost:3000/learn/frontend';
const OUT = process.argv[3] || '.workbuddy/overflow-check.png';
const VIEWPORT = { width: 1440, height: 900 };

if (!CHROME) { console.error('chrome not found in:', CHROME_CANDIDATES); process.exit(2); }

const userDataDir = path.resolve('.workbuddy/chrome-ovf-' + Date.now());
fs.mkdirSync(userDataDir, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + userDataDir,
  '--window-size=' + VIEWPORT.width + ',' + VIEWPORT.height,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

function fetchJson(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => {
      let buf = '';
      r.on('data', (d) => (buf += d));
      r.on('end', () => { try { res(JSON.parse(buf)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

async function waitForChrome() {
  for (let i = 0; i < 60; i++) {
    try { return await fetchJson('http://127.0.0.1:' + PORT + '/json/version'); }
    catch (e) { await new Promise((r) => setTimeout(r, 300)); }
  }
  throw new Error('chrome devtools not reachable');
}

// 在页面中执行的测量脚本：返回文档级溢出 + 方向条状态
const PROBE = `(() => {
  const de = document.documentElement;
  const docOverflow = de.scrollWidth - de.clientWidth;

  // 判断一个元素是否被任何祖先的 overflow 裁剪。若被裁剪，即使 rect 超出视口也不算页面溢出。
  function isClipped(el) {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      const ov = cs.overflowX;
      const pr = p.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      if ((ov === 'auto' || ov === 'hidden' || ov === 'scroll') && (er.right > pr.right + 1 || er.left < pr.left - 1)) {
        return true;
      }
      p = p.parentElement;
    }
    return false;
  }

  // 找出所有真正超出视口右边界且未被裁剪的元素（排除 fixed 遮罩类）
  const offenders = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') return;
    if (r.right > de.clientWidth + 1 && !isClipped(el)) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 90),
        right: Math.round(r.right),
        width: Math.round(r.width),
      });
    }
  });

  // 方向条滚动容器状态
  const scroller = document.querySelector('.scrollbar-hide');
  let dir = null;
  if (scroller) {
    dir = {
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
      scrollable: scroller.scrollWidth > scroller.clientWidth,
      overflowX: getComputedStyle(scroller).overflowX,
      cardCount: scroller.querySelectorAll('.direction-card').length,
      rightEdge: Math.round(scroller.getBoundingClientRect().right),
    };
  }

  // grid 列容器实际宽度
  const gridItem = document.querySelector('.lg\\\\:grid > div');
  const grid = gridItem ? {
    width: Math.round(gridItem.getBoundingClientRect().width),
    minWidth: getComputedStyle(gridItem).minWidth,
  } : null;

  const navBtns = document.querySelectorAll('.dir-nav').length;
  const visibleNav = Array.from(document.querySelectorAll('.dir-nav'))
    .filter((b) => getComputedStyle(b).display !== 'none').length;

  return JSON.stringify({
    viewportWidth: de.clientWidth,
    docOverflow,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 8),
    dir,
    grid,
    navBtns,
    visibleNav,
  });
})()`;

(async () => {
  let ws;
  try {
    await waitForChrome();
    const targets = await fetchJson('http://127.0.0.1:' + PORT + '/json/list');
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target');

    const WebSocket = require('ws');
    ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
    let id = 0;
    const pending = new Map();

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const mid = ++id;
        pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
      });

    await new Promise((r) => ws.on('open', r));

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false,
    });

    await send('Page.navigate', { url: URL_TARGET });
    // 等页面渲染 + 数据请求完成
    await new Promise((r) => setTimeout(r, 5000));

    const res = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const data = JSON.parse(res.result.value);

    console.log('=== OVERFLOW REPORT ===');
    console.log('url            :', URL_TARGET);
    console.log('viewportWidth  :', data.viewportWidth);
    console.log('docOverflow    :', data.docOverflow, data.docOverflow > 1 ? '  <-- 页面横向溢出!' : '  (ok)');
    console.log('offenderCount  :', data.offenderCount);
    if (data.offenders.length) console.log('offenders      :', JSON.stringify(data.offenders, null, 2));
    console.log('gridItem       :', JSON.stringify(data.grid));
    console.log('dirScroller    :', JSON.stringify(data.dir));
    console.log('navBtns/visible:', data.navBtns, '/', data.visibleNav);

    // 截图留证
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
    fs.writeFileSync(path.resolve(OUT), Buffer.from(shot.data, 'base64'));
    console.log('screenshot     :', path.resolve(OUT));

    const bad = data.docOverflow > 1 || data.offenderCount > 0;
    console.log(bad ? '=== FAIL: 存在横向溢出 ===' : '=== PASS: 无横向溢出 ===');
    ws.close();
    chrome.kill();
    process.exit(bad ? 1 : 0);
  } catch (e) {
    console.error('ERROR:', e.message);
    try { ws && ws.close(); } catch (_) {}
    chrome.kill();
    process.exit(2);
  }
})();
