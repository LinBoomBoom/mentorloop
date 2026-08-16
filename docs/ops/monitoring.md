# 监控与告警（C6 运维手册）

MentorLoop 通过 **`/healthz` 探活端点** + **`scripts/monitor-cron.mjs` 自检脚本** 组成轻量可观测方案，无需引入外部 SaaS 即可获得"活但异常"的可见性与告警。

## 1. 探活端点 `/healthz`

返回 JSON（不依赖登录态，反代已放行，不参与会话刷新）：

```json
{
  "status": "ok | degraded",
  "time": "2026-08-16T12:00:00.000Z",
  "uptime": 12345,
  "memory": { "rssMb": 128 },
  "components": {
    "db": "up | down",
    "tts": "ready | missing",
    "diskFreePct": 73
  }
}
```

判定规则：
- `db: down`（SQLite 不可达）或磁盘剩余 `< 10%`（且可探测）时 `status: degraded`，但 **HTTP 仍返回 200**，便于监控区分"活着但异常"。
- `tts: missing`：`TTS_PROVIDER` 未配置，或 `aliyun` 但缺 `DASHSCOPE_API_KEY`（语音合成不可用，不影响主流程）。

## 2. 方案 A：外部 Uptime 监控（推荐，零运维）

将 `/healthz` 接入 UptimeRobot / Pingdom / 阿里云监控等：
- 监控 URL：`https://<你的域名>/healthz`
- 告警条件：`HTTP 状态码 ≠ 200`，或响应体 `status === "degraded"`（多数平台支持"包含/等于"关键字断言）。
- 优点：自带历史曲线、多通道通知（邮件/钉钉/Slack/飞书/Telegram），无需自己维护脚本。

## 3. 方案 B：自带 cron 自检（可选，离线可用）

`scripts/monitor-cron.mjs` 周期性探活，异常时写 `error` 日志 + 可选推送 webhook。

### 3.1 运行
```bash
# 基础：读 SITE_URL 拼接 /healthz
node scripts/monitor-cron.mjs

# 显式探活地址 + 异常推钉钉/Slack/Telegram 通用 webhook
HEALTH_URL=https://mentorloop.example.com/healthz \
ALERT_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=xxx \
node scripts/monitor-cron.mjs

# 本地验证（仅打印，不推送）
node scripts/monitor-cron.mjs --dry-run
```

### 3.2 接入 crontab（每 5 分钟）
```bash
crontab -e
# 追加：
*/5 * * * * cd /opt/mentorloop && node scripts/monitor-cron.mjs >> data/logs/monitor.log 2>&1
```

### 3.3 告警 payload
异常时向 `ALERT_WEBHOOK_URL` POST 通用 JSON：
```json
{ "alert": true, "message": "...", "url": "...", "report": {...}, "time": "..." }
```
> 钉钉/企业微信/Slack 的 webhook 对 body 格式要求不同；若需严格适配，可在 `sendAlert` 处按你的平台调整（当前为通用 JSON）。

### 3.4 环境变量
| 变量 | 说明 | 默认 |
|---|---|---|
| `HEALTH_URL` | 探活地址（优先） | 回落 `SITE_URL/healthz` |
| `SITE_URL` | 站点域名（与 `.env` 一致） | `https://mentorloop.example.com` |
| `ALERT_WEBHOOK_URL` | 异常推送 webhook（留空则仅写日志） | 空 |
| `HEALTH_TIMEOUT_MS` | 请求超时 | `5000` |
| `DRY_RUN` | 置 `1` 等同 `--dry-run` | 空 |

## 4. 日志（C5 地基）
生产环境 `logger.ts` 自动写 `data/logs/app.log` 与 `data/logs/error.log`（JSON 一行一事件，含 `level/msg/meta`），全局 `error` hook 已接入。排查时：
```bash
journalctl -u mentorloop -n 200 --no-pager   # systemd 部署
tail -f data/logs/error.log                  # 直接看错误日志
```

## 5. 部署形态联动
- **Docker**：`/healthz` 由容器内 Nitro 提供；Caddy 反代透传，`reverse_proxy localhost:3000` 已配置。
- **systemd**：`deploy/mentorloop.service` 日志走 journald，配合上方 `journalctl` 排障。
- **PM2**：`ecosystem.config.cjs` 备选；`pm2 logs mentorloop` 查看输出。
