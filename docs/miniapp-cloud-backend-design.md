# 小程序云端后端与数据同步设计方案（v2 · 微信云开发版）

> 状态：设计稿 v2 · 2026-10-07
> 前置条件（已具备）：
> 1. 小程序端为**新仓库，uniapp 框架**（Vue3 语法，与现有桌面端心智一致）
> 2. 域名**ICP 备案已完成**
> 3. **微信云开发服务已开通**（含云函数/云数据库/云存储/云托管/云调用/微信支付免鉴权）
> 范围：面试题库 / 考卷(exam) / 学习中心(learn) 三大内容域云端化 + 桌面端(Electron) 与小程序的内容、用户数据双端同步。

---

## 1. 背景与结论

现状：MentorLoop 桌面端（Nuxt 4 + Electron + better-sqlite3）数据全在本地 `data/devmentor.db`（约 56MB），Nitro 服务层（57 个 API）以 `spawn .output/server/index.mjs` 常驻 `127.0.0.1:3210`，Electron 不直接读 DB、全部走 HTTP API；判分/计时/幂等已服务端化；无云同步。

核心结论（相比 v1 的 VPS 自建方案，改为全托管云开发）：

1. **后端整体迁入「微信云托管」容器**，而非租 VPS：云托管支持任意语言/框架容器常驻运行，现有 Nitro 产物 Docker 化后直接部署，业务逻辑零重写。
2. **数据库用云托管 Serverless MySQL**，替代 better-sqlite3（本地盘不持久 + SQLite 不支持网络盘，不可用 SQLite 上云）。DB 层由同步改异步是主要工程量（见 §4.3）。
3. **小程序免登录**：uniapp 走 `wx.cloud.callContainer`，请求经微信私有链路自动携带 `X-WX-OPENID/X-WX-UNIONID`，服务端免 code2session、免 access_token；微信支付在容器内免鉴权免证书。
4. **桌面端走备案域名公网 HTTPS**（云托管绑定自定义域名），Bearer token 认证；内容同步协议沿用「版本号 + 增量日志」。
5. 云开发其它组件定位：**云数据库/云函数本期不使用**（避免文档型 DB 与现有 SQL 语义割裂、双源真相）；云存储可用于后续放内容静态包；内容 CMS 作为运营侧可选项。

### 云托管 vs 云函数+云数据库（为何选云托管）

| 维度 | 云托管（选定） | 云函数 + 云数据库 |
|---|---|---|
| 现有 57 个 API | 容器直接跑，逻辑零重写 | 全部重写为云函数 |
| 数据库 | Serverless MySQL，SQL 迁移即可 | 文档型 DB，schema 语义重设计 |
| 微信登录/支付 | 请求头自带 openid；支付免鉴权 | 同样具备 |
| 桌面端接入 | 备案域名 HTTPS，天然支持 | 需经 HTTP API 包装云函数，链路绕 |
| 冷启动 | 常驻/最小实例 1，无冷启动 | 单实例单并发，有冷启动 |
| 运维 | 全托管 | 全托管 |

---

## 2. 总体架构

```
┌──────────────────────────┐        ┌──────────────────────────────┐
│ 桌面端 Electron            │        │ uniapp 小程序（新仓库）          │
│ Nuxt UI + admin 内容生产    │        │ 页面层 + pinia + storage 缓存   │
│ 本地 SQLite（缓存+outbox）  │        │ wx.cloud.callContainer        │
└────────────┬─────────────┘        └──────────────┬───────────────┘
             │ ②内容推送/增量同步                    │ ③API 调用（免域名，自动带 openid）
             │ 备案域名 HTTPS + Bearer              │
             ▼                                     ▼
        ┌─────────────────────────────────────────────────┐
        │        微信云托管容器服务（现有 Nitro .output）        │
        │  · 57 个存量 API 原样运行                            │
        │  · getUser() = Bearer token(桌面) ∥ X-WX-OPENID(mp) │
        │  · 内容同步 API（manifest/delta/snapshot/push）       │
        │  · 微信支付免鉴权 · 订阅消息/内容安全云调用免 access_token │
        └───────────────┬─────────────────────────────────┘
                        ▼
            ┌───────────────────────────┐
            │ 云托管 Serverless MySQL     │
            │ 唯一内容源 + 用户数据权威      │
            └───────────────────────────┘
  AI（DeepSeek/阿里云 TTS/ASR）：容器内直连，密钥仅存云托管环境变量
```

- ①（图中略）：桌面 admin 编辑 → 本地落库 → `POST /api/admin/content/push` → 云端 `content_version+1`。
- ②：桌面启动 `GET /api/content/manifest` 比版本 → `delta` 增量 upsert 本地缓存。
- ③：小程序按需调 API + storage 缓存目录树/精选/最近学习。

---

## 3. 云托管部署设计

| 项 | 方案 |
|---|---|
| 服务形态 | 云托管「服务」1 个（起名 `mentorloop-api`），容器监听 HTTP 端口（Nitro 默认 3000，容器内 `PORT=3000`） |
| 镜像 | Dockerfile 已有（`Dockerfile` 打包 Nuxt `.output`），按云托管规范调整：监听 `0.0.0.0`、暴露 PORT、无状态 |
| 实例策略 | 起步：最小实例数 1 + 缩容保底（消除冷启动）；流量稳定后评估「缩容到 0 + 20s 扩容」省钱模式。**注意最小 1 实例≠持久磁盘，数据必须全在 MySQL** |
| 数据库 | 云托管开通 Serverless MySQL；容器内网连接（VPC），连接数走连接池（见 §4.3） |
| 对象存储 | 内容静态包/图片放云存储（自带 CDN）或 COS |
| 公网访问 | 绑定**已备案自定义域名**（`api.<domain>`），云托管自带 HTTPS 证书托管与负载均衡；小程序主链路走 callContainer（免域名），公网域名仅供桌面端与调试 |
| 环境变量 | `WX_ENV_ID`、`DB_HOST/USER/PASSWORD`（云托管 MySQL 内网）、`DEEPSEEK_API_KEY`、`DASHSCOPE_API_KEY` 等；⚠️ 现有 `.env` 已含真实 key，上云前先轮换 |
| 日志/监控 | 云托管自带实时日志、监控告警、版本灰度与回滚 |
| 计费 | 按量（CPU/内存/出流量/构建）+ MySQL Serverless；起步月成本预计几十元级，免费额度（试用赠 400 元/3 个月）可覆盖开发期 |

### 3.1 桌面端接入云端（修复「全新安装数据/服务不全」）

背景：当前桌面端为纯本地自给架构，存在三个单点依赖——① 46MB seed JSON 首启建库（导入失败/中断即内容全空）；② AI 密钥构建时烘焙进 `.output`（换机构建/密钥轮换即失效）；③ 无云端兜底。云化后三者全部消除。

桌面端本地 Nitro 由「全功能服务器」降级为**云端代理 + 离线缓存**：

| 环节 | 云化后行为 |
|---|---|
| 内容读取 | 云优先：本地缓存版本落后则转发云端并写缓存；断网时读本地缓存（标 stale 提示） |
| 全新安装 | **不再依赖 seed**：登录后 `GET /api/content/snapshot/:tbl` 拉全量建本地缓存库（分表按需）；seed JSON 保留为可选「离线安装包」 |
| 用户数据 | 登录云端账号后以云端为权威；离线操作写入本地 outbox，联网补同步（§6.3） |
| AI/TTS/ASR | 本地服务不再持有密钥，转发云端业务接口，密钥仅存云托管环境变量 |
| admin 内容生产 | 不变：本地编辑落库 → outbox → push 云端（§6.2） |

实现要点：桌面端新增 `API_BASE`（云托管公网域名）配置与 `sync` 模块；本地 server 在内容 handler 前置「缓存命中 → 云端回源」代理层，renderer 与页面零改动。

---

## 4. 数据库设计

### 4.1 选型与划分

- 云端 = **云托管 Serverless MySQL（8.0）**，InnoDB；表结构由现有 SQLite schema（v1~v35 迁移）**整合翻译为一份基准 DDL**（云端是新库，无需重放 35 版迁移）。
- 三类表：**内容表**（云端唯一源）、**用户表**（云端权威）、**同步基础设施表**（新增）。

### 4.2 类型映射规则（SQLite → MySQL）

| SQLite | MySQL | 说明 |
|---|---|---|
| `TEXT` 主键（如 `rq-xxxx`） | `VARCHAR(64)` | 现有 id 均为短字符串 |
| `INTEGER` 时间戳(ms) | `BIGINT` | 保持毫秒语义不变 |
| 长文本（sections.content、a、explain） | `MEDIUMTEXT` | 最长小节约数十字节 KB 级 |
| JSON 文本（options/vip/providers/messages/choice_review） | `JSON` 类型 | 可查询；保留 TEXT 也可 |
| `INTEGER DEFAULT 0` 布尔 | `TINYINT(1)` | |
| `AUTOINCREMENT` | `AUTO_INCREMENT` | |
| `INSERT OR IGNORE / OR REPLACE` | `INSERT IGNORE / ON DUPLICATE KEY UPDATE` | |
| `db.transaction(fn)` 同步 | 异步事务助手（见 §4.3） | |
| `PRAGMA foreign_keys=ON` | InnoDB 外键原生生效 | `ON DELETE CASCADE` 语义保留 |

### 4.3 DB 层改造（主要工程量）

- better-sqlite3（同步）→ `mysql2/promise`（异步）：新增 `server/utils/db/mysql.ts` 实现同等原语 `query/insert/upsert/tx`，**57 个 handler 的 DB 调用加 `await`**。
- 连接池：`createPool({ connectionLimit: 10, enableKeepAlive: true })`；缩容到 0 模式下冷启动首查延迟可接受。
- 桌面端**不动**：本地仍用 better-sqlite3（缓存库 + outbox），仅同步模块走 HTTPS 调云 API。
- 新增 `scripts/content-import-mysql.mjs`：云端首启从内容包导入 MySQL。

### 4.4 内容表（云端唯一源，列名与本地一致）

| 表 | 关键列 | 行数量级 | MySQL 要点 |
|---|---|---|---|
| `modules` | id, name, icon, color, desc, position | 4 | |
| `chapters` | id, module_id, title, goal, position, subtrack | 411 | FK modules |
| `sections` | id, chapter_id, title, objective, content, position + 合规列(source_url, source_type, license, rewrite_level, **status**, reviewed_at, **version**) | 1,810 | content=MEDIUMTEXT；`status='published'` 才对外 |
| `interview_questions` | id, track, type, q, a, keywords, weight, difficulty, tech, subtrack, skill, section_id, subtrack_detail, source + 合规列(status, license, version…) | 16,453 | 索引：(track,subtrack)、(track,skill)、status、license |
| `exam_sets` | id, name, track, level, duration, vip_only | 57 | |
| `exam_choices` | id, set_id, tag, q, options(JSON), answer, explain, multi | 824 | **answer/explain 不下发** |
| `exam_written` | id, set_id, q, points, reference | 65 | **reference 不下发** |
| `skill_section_map` | skill_key, section_id, track, subtrack_id, skill_name, score | 83 | 复合主键(skill_key, section_id) |
| `referrals` | id, company, title, track, city, level, type, requirement, intro, contact, created_at | 10 | |

### 4.5 用户表（云端权威）

| 表 | 关键列 | 说明 |
|---|---|---|
| `users` | id, username, nickname, email, phone, password, avatar, providers(JSON), vip(JSON), role, banned, created_at | 微信用户 password 为空 |
| `sessions` | token, user_id, created_at, expires_at, **platform**('desktop'/'web'/'mp'), device, last_active_at | mp 端主要靠 openid，token 供桌面/调试 |
| `auth_identities`（新） | id, user_id, provider('wechat-mp'), provider_uid(openid), unionid, created_at, UNIQUE(provider, provider_uid) | 微信身份绑定，手机号归一双端账号 |
| `progress` | user_id, module_id, chapter_id, section_id, done_at, **updated_at** | PK(user_id, section_id) |
| `user_skill_mastery` | user_id, skill_key, track, subtrack_id, skill_name, marked, practiced_correct/total, exam_correct/total, learned_sections/total, updated_at | PK(user_id, skill_key) |
| `user_wrong_items` | id, user_id, source, item_id, track, subtrack_id, skill_key, q, user_answer, answer, wrong_count, next_review_at, reviewed_at, created_at, **updated_at** | SRS |
| `exam_attempts` | id, user_id, set_id, started_at, status | 服务端计时 |
| `exam_records` | id, user_id, set_id, set_name, track, score, correct, total, weak_points(JSON), level, advice, used_seconds, choice_review(JSON), written_review(JSON), created_at, submit_nonce | UNIQUE(user_id, set_id, submit_nonce) |
| `exam_choice_reviews` / `exam_written_reviews` | record_id FK 级联 | 随 record |
| `interview_sessions` / `interview_transcripts` / `interview_media` | messages(JSON), mode, turns, score, summary… | AI 陪练会话 |
| `study_plans`, `user_questions`, `ai_answer_cache`, `resume_diags` | — | 云端权威 |
| `orders` | plan_id, amount, currency, status, **provider('wxpay')**, provider_order_id, subject, paid_at, expire_at, meta | 云托管免鉴权支付回调 |
| `subscriptions`, `checkins`, `referral_applications`, `login_attempts`, `auth_codes`, `audit_logs` | — | 云端权威 |
| `meta` | key, value | `content_version` 等 |

### 4.6 v2 新增同步基础设施表（云端 MySQL）

```sql
-- 内容增量日志：全局版本链
CREATE TABLE content_changes (
  seq        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tbl        VARCHAR(64)  NOT NULL,
  row_id     VARCHAR(64)  NOT NULL,
  version    BIGINT       NOT NULL,          -- 变更后的 content_version
  op         VARCHAR(16)  NOT NULL DEFAULT 'upsert',  -- upsert|delete
  changed_at BIGINT       NOT NULL,
  KEY idx_cc_version (version, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设备同步游标（服务端留档）
CREATE TABLE sync_state (
  user_id          VARCHAR(64) NOT NULL,
  device_id        VARCHAR(64) NOT NULL,
  last_push_at     BIGINT,
  last_pull_cursor BIGINT,
  PRIMARY KEY (user_id, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- content_version 存 meta 表：meta['content_version']
-- 保留策略：content_changes 保留 90 天或 1000 版本，cron 清理
```

### 4.7 基准 DDL 样例（其余表同规则翻译）

```sql
CREATE TABLE sections (
  id            VARCHAR(64) PRIMARY KEY,
  chapter_id    VARCHAR(64) NOT NULL,
  title         VARCHAR(255),
  objective     TEXT,
  content       MEDIUMTEXT,
  position      INT DEFAULT 0,
  source_url    VARCHAR(512),
  source_type   VARCHAR(32),
  license       VARCHAR(64),
  rewrite_level VARCHAR(16) DEFAULT 'paraphrased',
  status        VARCHAR(16) DEFAULT 'published',
  reviewed_at   BIGINT,
  version       INT DEFAULT 1,
  KEY idx_sections_status (status),
  CONSTRAINT fk_sec_ch FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 5. 接口定义

### 5.0 通用约定

- 双端 Base：小程序 `wx.cloud.callContainer({ config:{ env }, path })`；桌面端 `https://api.<domain>`。
- 鉴权统一入口 `getUser()`（改造点，一处生效全局）：
  1. 桌面端/Web：Cookie `ml_token` 或 `Authorization: Bearer`（沿用）
  2. 小程序：`X-WX-OPENID` / `X-WX-UNIONID` 请求头（callContainer 自动注入）→ 查 `auth_identities` 得 user，**无需 token**
- 状态码：401 未登录 · 403 VIP/权限门禁 · 409 版本冲突 · 410 需全量重同步 · 429 限流。
- 响应风格、分页沿用现有接口约定。

### 5.1 内容同步 API（新增，为桌面端设计）

| 方法/路径 | 鉴权 | 说明 |
|---|---|---|
| `GET /api/content/manifest` | 公开 | `{ content_version, tables: { <tbl>: { rows } } }` |
| `GET /api/content/delta` | 公开 | `?since=<version>&limit=500&cursor=<seq>` → `{ changes:[{ tbl, op, row }], nextVersion, nextCursor, done }` |
| `GET /api/content/snapshot/:tbl` | 公开 | 全量分页（首启/410 后重建）：`?cursor=&limit=500` |
| `POST /api/admin/content/push` | admin + IP 白名单 | `{ baseVersion, changes:[{ tbl, op, row }] }`；事务内校验 `baseVersion` → 应用行 → 写 `content_changes` → `content_version+1`；冲突 409；写 audit_logs |

要点：内容表一切变更必须经 push（或云端运维通道），禁止绕过日志直改；`delta` 全文随行下发（仅桌面端调用）。

### 5.2 认证 / 用户 API（新增）

| 方法/路径 | 鉴权 | 说明 |
|---|---|---|
| `POST /api/auth/wx-session` | callContainer 注入头 | 小程序首启调用：读 `X-WX-OPENID` → 查/建 `auth_identities` + `users` → 返回 `{ user }`。**无 token、无 code2session** |
| `POST /api/auth/wx-phone` | 同上 | 小程序 `getPhoneNumber` 的 code → 云调用 `phonenumber.getUserPhoneNumber` 免 access_token → 绑定 `users.phone`，按手机号合并桌面账号 |
| `POST /api/auth/login` 等 | — | 桌面端沿用现有邮箱/短信登录 |

### 5.3 内容读取 API（复用为主 + 小程序裁剪）

| 接口 | 约定 |
|---|---|
| `GET /api/modules` | 复用；响应小可整包缓存 storage |
| `GET /api/modules/:id?mode=tree`（改造） | 只返回章节/小节树（不含 content），供目录与缓存 |
| `GET /api/sections/:id`（新增） | 单节全文，阅读页按需取 + LRU 缓存 |
| `GET /api/interview/overview/featured/tree/:track`、`GET /api/interview/:track`（分页筛选）、`GET /api/interview/question/:id` | 复用 |
| `GET /api/exam/sets`、`/api/exam/sets/:id`、`POST /api/exam/submit`、`GET /api/exam/records/*`、`POST /api/exam/attempt/abandon` | 复用；题目下发、答案/解析永不下发，判分在服务端 |
| `GET /api/search` | 复用 |
| `GET /api/content/version`（新增轻量） | 小程序启动探测缓存是否需刷新 |

### 5.4 用户数据同步 API（新增，桌面端离线双写用）

小程序直接调既有业务接口（progress/toggle、wrong、exam/submit…），不走本节协议。

| 方法/路径 | 说明 |
|---|---|
| `POST /api/user/sync/push` | `{ deviceId, changes:[{ tbl, op, row }] }`，tbl ∈ progress / user_skill_mastery / user_wrong_items；按 §6.3 合并，返回逐行 `{ status: applied|merged|rejected, row }` |
| `GET /api/user/sync/pull` | `?since=<ts>&limit=500` 下行增量 + nextCursor |
| `GET /api/user/sync/state` | 服务端最新 updated_at，校准游标 |

### 5.5 AI / 语音（复用）

`/api/interview/ask`、`vip/interview/*`（TTS/ASR/ws）复用；密钥在容器环境变量。小程序侧 ask/tts 按用户限流（429）。

---

## 6. 同步策略

### 6.1 内容同步总流程（桌面端）

```
启动 → GET /api/content/manifest（公网域名）
  ├─ 版本一致 → 结束
  ├─ 在保留窗口内 → GET /api/content/delta?since=本地 → 事务 upsert/delete → 更新本地版本
  └─ 410 过旧 → 逐表 snapshot 全量重建内容表
断网/云端不可达 → 本地缓存继续可用（标 stale），UI 提示
```

幂等：delta 按主键 upsert，cursor 基于 `content_changes.seq`，不重不漏；每 500 行一个事务。

### 6.2 内容生产流（桌面 admin → 云端 → 所有端）

```
admin 编辑 → 本地落库（立即可用）→ outbox 攒批
  → POST /api/admin/content/push { baseVersion, changes }
      ├─ 200 → 清队列
      └─ 409 → 拉 delta 合并冲突行 → 本地重放 → 重推
```

### 6.3 用户数据合并规则（桌面 ⇄ 云端）

| 表 | 规则 | 依据 |
|---|---|---|
| `progress` | OR 合并，`done_at` 取较新 | 进度不可倒退 |
| `user_skill_mastery` | 计数器逐项 max；marked 取 OR | 统计字段 |
| `user_wrong_items` | newer-wins（updated_at）；同 item 双端皆错时 wrong_count 取 max、next_review_at 取更早 | SRS 语义 |

桌面端本地新表 `outbox`（tbl/row/updated_at）记录待上行变更；登录且在线分批 push，`rejected` 行以服务端返回回写本地。

### 6.4 版本保留与全量兜底

- `content_changes` 保留 90 天 / 1000 版本（cron）。
- 过旧客户端 delta 返回 410 → snapshot 全量（16.4k 题约 33 请求）。
- 小程序：启动调 `GET /api/content/version`，版本变化 → 作废 storage 中目录树/精选缓存重拉；storage 上限 10MB，只缓存目录树、精选题、最近学习 section 全文。

### 6.5 存量迁移（一次性）

1. 云托管开服务 + MySQL，导入基准 DDL（§4.4~4.6）。
2. `scripts/content-export.mjs`：本地 SQLite 导出 9 张内容表 → 分片 JSON 内容包 → 上传云存储。
3. `scripts/content-import-mysql.mjs`：云端导入 → 行数/抽样校验 → `meta.content_version = 1`。
4. 桌面端发版：本地服务改造为云端代理（§3.1，内容读取云优先/本地兜底），接入 manifest/snapshot；**全新安装不再依赖 seed**，此后云端为源。
5. 用户数据不搬迁：桌面端本地历史数据经 §6.3 协议自然上行合并。

### 6.6 降级与回滚

- 云端故障：桌面端完全离线可用；恢复后自动补推/补拉。
- 内容误推：content_changes 可回放反向变更。
- callContainer 异常时小程序可降级走备案域名 HTTPS（同一服务公网入口），API 封装层双通道（§7）。

---

## 7. uniapp 小程序端设计（新仓库）

### 7.1 工程结构

```
miniapp/                      # uniapp Vue3 + Vite + pinia + tailwind(可选)
├── src/
│   ├── pages/
│   │   ├── interview/        # 题库：列表(track/tech/subtrack 筛选)、详情、AI 追问
│   │   ├── exam/             # 考卷：列表、答题(计时)、成绩复盘
│   │   ├── learn/            # 学习中心：模块→章节→小节、阅读页
│   │   └── mine/             # 登录态、VIP、进度、错题本
│   ├── api/
│   │   ├── client.ts         # 双通道封装（见 7.2）
│   │   └── modules/{interview,exam,learn,user}.ts
│   ├── store/                # pinia：user、内容缓存索引、答题状态
│   └── utils/cache.ts        # storage LRU（目录树/精选/最近学习）
└── manifest.json             # mp-weixin.appid；微信开发者工具中关联云环境
```

### 7.2 API 双通道封装（条件编译）

```ts
// api/client.ts
const CLOUD_ENV = 'mentorloop-prod'      // 云托管所属云开发环境 ID
const PUBLIC_BASE = 'https://api.example.com' // 备案域名（桌面同源）

export async function request(path: string, opts: { method?: string, data?: any, auth?: boolean } = {}) {
  // #ifdef MP-WEIXIN
  const res = await wx.cloud.callContainer({
    config: { env: CLOUD_ENV },
    path,
    method: opts.method ?? 'GET',
    data: opts.data,
    header: opts.auth ? { 'x-ml-device': uni.getDeviceInfo().deviceId } : {},
  })
  return handle(res.data)                 // 服务端从 X-WX-OPENID 识别用户，无需 token
  // #endif
  // #ifndef MP-WEIXIN
  const res = await uni.request({ url: PUBLIC_BASE + path, method: opts.method ?? 'GET', data: opts.data,
    header: { Authorization: `Bearer ${uni.getStorageSync('token') || ''}` } })
  return handle(res.data)
  // #endif
}
```

- `App.onLaunch`：`wx.cloud.init({ env: CLOUD_ENV })`（仅 MP-WEIXIN）。
- VIP 门禁、`vip_only` 考卷逻辑完全复用服务端实现。

### 7.3 页面与缓存策略

| 模块 | 首屏数据 | 缓存 |
|---|---|---|
| 学习中心 | `/api/modules` + `/api/modules/:id?mode=tree` | 目录树缓存，`content_version` 变更时失效 |
| 小节阅读 | `/api/sections/:id` | 最近 20 篇 LRU |
| 题库 | `/api/interview/:track`（分页） | 列表不缓存，题目详情 LRU |
| 考卷 | `/api/exam/sets` → sets/:id → submit | 不缓存；断网禁考 |

### 7.4 微信能力

- 登录：`wx.cloud.callContainer` 自动带 openid，无需 wx.login 换 code（wx.cloud.init 后链路自带登录态）。
- 手机号：`button open-type="getPhoneNumber"` → `/api/auth/wx-phone`。
- 支付：服务端云托管内免鉴权调用微信支付下单，`orders.provider='wxpay'`；回调免证书。iOS 虚拟商品按微信规则规避（引导桌面端/H5 购买）。
- 内容安全：`user_questions`（用户提问池）入库前用云调用 `msgSecCheck` 免鉴权审核。
- 订阅消息：成绩发布/复习提醒经云调用免 access_token。

---

## 8. 安全与合规

| 项 | 措施 |
|---|---|
| 密钥 | 上云前轮换 `.env` 已暴露的 DEEPSEEK/DASHSCOPE key；密钥仅存云托管环境变量 |
| 公网入口 | 桌面端域名入口：Bearer + `security.ts` 限流 + admin IP 白名单；小程序主链路走微信私有链路（防爬防刷） |
| 答案防泄漏 | exam_choices.answer/explain、exam_written.reference 仅判分后经 records 下发 |
| 数据库 | MySQL 仅 VPC 内网可达；最小权限账号；每日逻辑备份（mysqldump → 云存储）+ 异地 |
| 内容合规 | sections/questions 已有 status/license 门禁；用户生成内容 msgSecCheck |
| 支付合规 | iOS 虚拟商品规避；价格与权益展示与 vip 契约一致 |
| 小程序合规 | 类目资质自查（教育/学习类）；隐私协议声明手机号/学习数据收集 |

---

## 9. 实施里程碑

| 阶段 | 内容 | 交付物 |
|---|---|---|
| M1 后端上云 | DB 层 mysql2 改造 + 基准 DDL；容器镜像适配云托管；内容导出/导入；manifest/version 接口 | 云托管服务可跑通存量 API，桌面端不受影响 |
| M2 内容同步 | delta/snapshot/push；桌面端「云端代理 + 离线缓存」改造（admin push、启动拉取、outbox） | 桌面 ⇄ 云内容双向打通，**全新安装可纯云端初始化** |
| M3 小程序 MVP | uniapp 仓库脚手架 + 双通道 client；wx-session/手机号绑定；题库/考卷/学习中心三模块 | 小程序可浏览、学习、答题 |
| M4 用户数据与 VIP | sync push/pull；wxpay 支付闭环；订阅消息 | 双端进度/错题/成绩一致，VIP 可购买 |
| M5 上线 | 压测（callContainer 并发与 MySQL 连接数）、告警、审核发布 | 正式发布 |

---

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| DB 层同步→异步改造波及 57 个 handler | 一次性机械改造 + `npm test`（vitest 已有）回归；改造后 handler 仍是 async Nitro 函数，模式不变 |
| 云托管 MySQL 连接数（缩扩容抖动） | 连接池上限 10 + enableKeepAlive；Serverless MySQL 自动休眠/唤醒，最小实例 1 常驻规避首查抖动 |
| callContainer 平台锁定 | API 层双通道封装（§7.2），公网域名兜底；未来多端（H5/App）自然切换 |
| 微信支付 iOS 虚拟商品限制 | 按平台隐藏支付入口，引导桌面端/H5 |
| 内容误推送 | push 乐观锁 + audit + content_changes 可回放 |
| 审核类目 | 提前核对教育类目资质；内容 status/license 门禁已具备 |
| 成本超预期 | 按量计费 + 缩容到 0 模式可选；监控告警阈值 |
| 桌面端首启依赖网络 | 保留 seed 作为可选离线安装包；缓存降级策略（stale 可用） |
| 云端故障影响双端 | 桌面端离线缓存兜底；云托管多可用区 + 版本回滚 + 告警 |
