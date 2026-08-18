// 桌面端打包产物冒烟测试：用安装包内的 node + Nitro 起服务，验证 注册→登录 全链路。
// 用法: node scripts/smoke-desktop-auth.mjs
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const resDir = path.join(root, 'release', 'win-unpacked', 'resources')
const nodeBin = path.join(resDir, 'extraResources', 'node.exe')
const serverEntry = path.join(resDir, '.output', 'server', 'index.mjs')
const PORT = '3215'
const BASE = `http://127.0.0.1:${PORT}`

// 模拟桌面端首启：临时 DATA_DIR + 拷入种子
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-smoke-'))
fs.mkdirSync(path.join(dataDir, 'data'), { recursive: true })
fs.copyFileSync(path.join(resDir, 'data', 'seed-content.json'), path.join(dataDir, 'data', 'seed-content.json'))

const env = {
  ...process.env,
  PORT,
  HOST: '127.0.0.1',
  DATA_DIR: dataDir,
  NODE_ENV: 'production',
  PIPER_BIN: path.join(resDir, 'data', 'piper', 'piper.exe'),
  PIPER_MODELS_DIR: path.join(resDir, 'data', 'piper', 'models'),
}

console.log('[smoke] DATA_DIR =', dataDir)
const child = spawn(nodeBin, [serverEntry], { cwd: resDir, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
child.stdout.on('data', (d) => process.stdout.write('[nitro] ' + d))
child.stderr.on('data', (d) => process.stdout.write('[nitro-err] ' + d))

async function waitReady(timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(BASE + '/_payload.json')
      if (r.ok) return true
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function post(url, body, cookie) {
  const r = await fetch(BASE + url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })
  const setCookie = r.headers.get('set-cookie') || ''
  let json = null
  try { json = await r.json() } catch { /* ignore */ }
  return { status: r.status, json, setCookie }
}

const exit = (code, msg) => {
  console.log(msg)
  try { child.kill() } catch { /* ignore */ }
  // Windows 下给进程树一点退出时间
  setTimeout(() => process.exit(code), 500)
}

if (!(await waitReady())) exit(1, '[smoke] FAIL: 服务 30s 未就绪')
console.log('[smoke] 服务就绪 ✓')

const uname = 'e2e_' + Date.now().toString(36)
const pwd = 'Test1234!'

// 1. 注册
const reg = await post('/api/auth/register', { username: uname, password: pwd, nickname: '冒烟测试' })
if (reg.status !== 200 || !reg.json?.user) exit(1, `[smoke] FAIL: 注册失败 ${reg.status} ${JSON.stringify(reg.json)}`)
console.log('[smoke] 注册成功 ✓ user =', reg.json.user.username)

// 2. 用相同账号密码登录（模拟桌面端登录场景）
const login = await post('/api/auth/login', { username: uname, password: pwd })
if (login.status !== 200 || !login.json?.user) exit(1, `[smoke] FAIL: 登录失败 ${login.status} ${JSON.stringify(login.json)}`)
console.log('[smoke] 登录成功 ✓ user =', login.json.user.username)

// 3. 错误密码应 401
const bad = await post('/api/auth/login', { username: uname, password: 'wrong-pass-1' })
if (bad.status !== 401) exit(1, `[smoke] FAIL: 错误密码未返回 401，实际 ${bad.status}`)
console.log('[smoke] 错误密码正确拒绝(401) ✓')

// 4. 带 cookie 访问 /api/auth/me
const meRes = await fetch(BASE + '/api/auth/me', { headers: { cookie: login.setCookie.split(';')[0] } })
const me = await meRes.json().catch(() => null)
if (meRes.status !== 200 || !me?.user) exit(1, `[smoke] FAIL: /api/auth/me 未识别会话 ${meRes.status}`)
console.log('[smoke] 会话保持 ✓ /api/auth/me 返回', me.user.username)

exit(0, '[smoke] ALL PASS：打包产物的 注册→登录→会话 全链路正常 ✓')
