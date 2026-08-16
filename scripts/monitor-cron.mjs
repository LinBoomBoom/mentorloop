// 监控探活脚本（C6）：定时 curl /healthz，异常时写 error 日志 + 可选 webhook 推送。
//
// 用法：
//   node scripts/monitor-cron.mjs
//   HEALTH_URL=https://x.example.com/healthz ALERT_WEBHOOK_URL=https://hooks.x/y node scripts/monitor-cron.mjs
//   --dry-run   仅打印，不推送 webhook（便于本地验证）
//
// crontab 接入（每 5 分钟）：
//   */5 * * * * cd /opt/mentorloop && node scripts/monitor-cron.mjs >> data/logs/monitor.log 2>&1
//
// 环境变量：
//   HEALTH_URL          探活地址（不填则回落 SITE_URL + /healthz）
//   SITE_URL            站点域名（与 .env 一致）
//   ALERT_WEBHOOK_URL   异常时 POST 的通用 webhook（钉钉/Slack/Telegram 均可；留空则仅写日志）
//   HEALTH_TIMEOUT_MS   请求超时（默认 5000）
//   DRY_RUN             置 1 等同 --dry-run

const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 5000)
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1'

export function buildHealthUrl() {
  const explicit = process.env.HEALTH_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const base = (process.env.SITE_URL || 'https://mentorloop.example.com').replace(/\/$/, '')
  return `${base}/healthz`
}

// 是否需要告警：探活失败、整体 degraded、或 db 不可达。
export function shouldAlert(report) {
  if (!report) return true
  if (report.status && report.status !== 'ok') return true
  if (report.components && report.components.db === 'down') return true
  return false
}

export function formatAlert(report, url, error) {
  const parts = [`[MentorLoop 监控告警] 探活异常`, `url: ${url}`]
  if (error) parts.push(`error: ${error.message || String(error)}`)
  if (report) parts.push(`report: ${JSON.stringify(report)}`)
  return parts.join('\n')
}

export function buildPayload(report, url, error) {
  return {
    alert: true,
    message: formatAlert(report, url, error),
    url,
    report: report || null,
    time: new Date().toISOString()
  }
}

async function fetchHealth(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function sendAlert(webhook, payload) {
  if (!webhook || DRY_RUN) return
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (e) {
    console.error('[monitor] webhook 推送失败:', e.message || e)
  }
}

export async function checkOnce() {
  const url = buildHealthUrl()
  let report = null
  let error = null
  try {
    report = await fetchHealth(url)
  } catch (e) {
    error = e
  }
  const alert = shouldAlert(report)
  if (alert) {
    const payload = buildPayload(report, url, error)
    console.error('[monitor]', payload.message)
    await sendAlert(process.env.ALERT_WEBHOOK_URL, payload)
  } else {
    console.log('[monitor] ok', JSON.stringify(report))
  }
  return { alert, report, error, url }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  checkOnce()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
