// 用 CDP 给本地文件截图
// 启动 chrome --remote-debugging-port=<port>，连上后用 CDP Page.captureScreenshot

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const PORT = 9234;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_HTML = 'file://' + path.resolve(process.argv[2] || 'docs/preview/avatar-preview.html').replace(/\\/g, '/');
const OUT = process.argv[3] || '.workbuddy/avatar-preview.png';
const VIEWPORT = { width: 1280, height: 600 };

if (!fs.existsSync(CHROME)) { console.error('chrome not found:', CHROME); process.exit(1); }

const userDataDir = path.resolve('.workbuddy/chrome-shot-' + Date.now());
fs.mkdirSync(userDataDir, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + userDataDir,
  '--window-size=' + VIEWPORT.width + ',' + VIEWPORT.height,
  '--hide-scrollbars',
  URL_HTML
], { stdio: ['ignore', 'ignore', 'pipe'] });

const target = 'http://127.0.0.1:' + PORT + '/json/version';

async function fetchJson(p) {
  return new Promise((res, rej) => {
    http.get(p, (r) => {
      let buf = '';
      r.on('data', d => buf += d);
      r.on('end', () => res(JSON.parse(buf)));
    }).on('error', rej);
  });
}

async function waitForChrome() {
  for (let i = 0; i < 30; i++) {
    try {
      const v = await fetchJson(target);
      return v;
    } catch (e) { await new Promise(r => setTimeout(r, 500)); }
  }
  throw new Error('chrome not ready');
}

(async () => {
  try {
    const ver = await waitForChrome();
    const wsUrl = ver.webSocketDebuggerUrl;
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.on('open', r));

    let id = 0;
    const send = (method, params = {}) => new Promise((res, rej) => {
      const i = ++id;
      const msg = { id: i, method, params };
      ws.once('message', (data) => {
        const r = JSON.parse(data);
        if (r.id === i) { if (r.error) rej(r.error); else res(r.result); }
      });
      ws.send(JSON.stringify(msg));
    });

    // Get list of targets, find our page
    const targets = await send('Target.getTargets');
    const page = targets.targetInfos.find(t => t.type === 'page' && t.url.startsWith('file://'));
    if (!page) throw new Error('no page target');

    const { sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
    const ses = (method, params = {}) => new Promise((res, rej) => {
      const i = ++id;
      ws.once('message', (data) => {
        const r = JSON.parse(data);
        if (r.id === i) { if (r.error) rej(r.error); else res(r.result); }
      });
      ws.send(JSON.stringify({ id: i, sessionId, method, params }));
    });

    await ses('Page.enable');
    await ses('Runtime.enable');
    // wait for svg/object to load
    await new Promise(r => setTimeout(r, 1500));

    const result = await ses('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(OUT, Buffer.from(result.data, 'base64'));
    console.log('screenshot ->', OUT, fs.statSync(OUT).size, 'bytes');

    ws.close();
    chrome.kill();
    try { process.kill(-chrome.pid); } catch {}
    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    try { chrome.kill(); process.kill(-chrome.pid); } catch {}
    process.exit(1);
  }
})();