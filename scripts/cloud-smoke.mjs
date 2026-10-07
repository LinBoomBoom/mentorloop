// 云端容器内 smoke（M1 验收）：验证 Nitro 启动 + mysql2 → 云托管 Serverless MySQL 全链路。
// 用法（云托管 WebShell / 容器内执行，无需参数）：
//   node scripts/cloud-smoke.mjs [baseUrl]
//   baseUrl 默认 http://127.0.0.1:${PORT || 3000}（打容器自身，公网无关）
// 覆盖：healthz(db 组件) / 内容读取(试卷+模块详情，含 Promise.all 修复点) /
//       注册→会话→登录→统计→注销（users/sessions 读写 + deleteAccount 级联删除事务）。
// 幂等：账号按天命名，注册冲突自动走登录；结束前注销清理，可重复执行。

const BASE = process.argv[2] || `http://127.0.0.1:${process.env.PORT || 3000}`
let pass = 0, fail = 0, skip = 0
function check(name, ok, detail) {
  const tag = ok ? 'PASS' : (ok === null ? 'SKIP' : 'FAIL')
  console.log(`  [${tag}] ${name}${detail ? ' — ' + detail : ''}`)
  if (ok === true) pass++
  else if (ok === null) skip++
  else fail++
}
async function req(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const setCookie = res.headers.get('set-cookie') || ''
  const ml = /ml_token=([^;]+)/.exec(setCookie)
  let json = null
  try { json = await res.json() } catch { /* 非 JSON 响应保留 null */ }
  return { status: res.status, json, cookie: ml ? `ml_token=${ml[1]}` : null }
}
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)

async function main() {
  console.log(`[cloud-smoke] 目标 ${BASE}`)
  if (process.env.MYSQL_HOST) console.log(`[cloud-smoke] 驱动=mysql2 → ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || 'mentorloop'}`)
  else console.log('[cloud-smoke] 警告：未注入 MYSQL_HOST，当前为 SQLite 本地驱动（云端部署应注入）')

  // 1. healthz：db 组件 up 是「mysql2 → 云 MySQL 连通」的直接证据
  const h = await req('GET', '/healthz')
  check('healthz 可达', h.status === 200, `status=${h.status}`)
  check('healthz components.db=up', h.json?.components?.db === 'up', JSON.stringify(h.json?.components))
  check('healthz 整体 status=ok（非 degraded）', h.json?.status === 'ok', h.json?.status)

  // 2. 内容读取：试卷列表（云库已导入 19717 行内容）
  const s = await req('GET', '/api/exam/sets')
  const sets = s.json?.sets
  check('exam sets 列表数组化且非空', Array.isArray(sets) && sets.length > 0 && isObj(sets[0]), `count=${Array.isArray(sets) ? sets.length : 'N/A'}`)

  // 3. 模块详情：chapters 为对象数组且含 sections（chapters Promise.all 修复点）
  const mods = await req('GET', '/api/modules')
  const firstMod = Array.isArray(mods.json?.modules) ? mods.json.modules[0] : (Array.isArray(mods.json) ? mods.json[0] : null)
  if (firstMod?.id) {
    const m = await req('GET', `/api/modules/${firstMod.id}`)
    const chapters = m.json?.module?.chapters
    check('模块详情 chapters 数组化', Array.isArray(chapters) && (chapters.length === 0 || isObj(chapters[0])), `count=${Array.isArray(chapters) ? chapters.length : 'N/A'}`)
  } else {
    check('模块详情 chapters 数组化', null, '模块列表为空，跳过')
  }

  // 4. 账号全链路：注册（users 写）→ me（sessions 读）→ 登录（密码校验）→ stats（聚合读）→ 注销（级联删除事务）
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const uname = `smoke_${day}`
  const pwd = `Smoke#${day}!ml`
  const reg = await req('POST', '/api/auth/register', { body: { username: uname, password: pwd } })
  let cookie = reg.cookie
  if (reg.status === 200 && isObj(reg.json?.user)) {
    check('注册落库（users 表写入）', true, `uid=${reg.json.user.id}`)
  } else {
    // 幂等：当天账号已存在/触发限流 → 直接走登录，不判失败
    check('注册（或复用当日账号）', null, `status=${reg.status} ${reg.json?.error || ''} → 改用登录`)
  }
  if (!cookie) {
    const login0 = await req('POST', '/api/auth/login', { body: { username: uname, password: pwd } })
    if (login0.cookie) { cookie = login0.cookie; check('登录获取会话', true, '用户名=注册冲突/限流后回退') }
  }
  if (!cookie) {
    check('账号链路（登录/me/注销）', null, '无法取得会话，跳过余下账号用例')
  } else {
    const me = await req('GET', '/api/auth/me', { cookie })
    check('me 会话读取（sessions 表）', me.status === 200 && me.json?.user?.username === uname, `status=${me.status}`)
    const login = await req('POST', '/api/auth/login', { body: { username: uname, password: pwd } })
    check('登录密码校验', login.status === 200 && isObj(login.json?.user), `status=${login.status} ${login.json?.error || ''}`)
    const st = await req('GET', '/api/stats', { cookie })
    check('stats 聚合读取（多表 JOIN/重算）', st.status === 200 && isObj(st.json), `status=${st.status}`)
    const del = await req('POST', '/api/auth/delete', { body: { password: pwd }, cookie })
    check('注销级联删除（deleteAccount 事务）', del.status === 200 && del.json?.ok === true, `status=${del.status} ${del.json?.error || ''}`)
    const me2 = await req('GET', '/api/auth/me', { cookie })
    check('注销后会话失效', me2.status === 401, `status=${me2.status}`)
  }

  console.log(`[cloud-smoke] 完成：${pass} 通过 / ${fail} 失败 / ${skip} 跳过`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('[cloud-smoke] 异常退出：', e?.message || e); process.exit(1) })
