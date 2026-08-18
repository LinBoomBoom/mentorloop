# MentorLoop 上线前审查清单（代码审查 + 类人浏览器自动化审计）

> 审查时间：2026-08-05
> 范围：核心业务流程 / 业务逻辑 / 安全 / UI 样式 / 资源展示 / SEO
> 方法：① 代码走查（server/api、server/utils）+ ② `ui-ux-audit` 技能真实无头 Chrome 模拟真人操作（21 页面 + 移动端 2 页 + 登录→后台→学习→面试题→考试→交卷→VIP 全流程），截图存 `.workbuddy/audit/shots/`、`shots2/`，报告 `report.md`/`report2.md`。
> 运行服务：http://localhost:3000（Nuxt dev，含最新代码与重分类后 4031 题数据）

---

## 一、类人浏览器自动化审计结论（UI / 交互）

**静态体检（已通过项）**：未加载图片 0、横向溢出 0、空白可点击元素 0、移动端破版 0。

**交互流程（修正测试凭证后全部 ✅）**：
- 登录 admin → HTTP 200；登录后首页 `authed:true / navHasAdmin:true`
- 管理后台 `/admin` → 看板数字真实渲染（5 注册用户 / 1 管理员 / 0 封禁 / 4 模块 / 49 章 / 360 小节 / 23 试卷 / 4031 题）
- 学习模块进入、面试题库切 tab + 开题、模拟答卷开始 + 交卷出分、VIP 页面均正常
- 404 兜底生效（`/no-such-page` 正确返回 404）

**UI 层面待修（见下方分级）**：
- 字体从 `fonts.googleapis.com` 加载 → **中国大陆被墙**，中文用户会 FOUC / 落到系统字体（P1）
- `/skills` 长技能名文字截断 13 处（P2）
- 低对比度 183 处，绝大多数为 antd 组件「白字 + 品牌色底」被脚本误判（已知误报）；但珊瑚/灰字 2.5–2.9:1 on 浅底属真实边界（P2）
- admin 页 `NUXT_E4011`（`<NuxtPage/>` 未使用）dev 警告，需确认生产构建无影响（P2）
- `og:image` 为空 → 社交分享无预览图（P2）

---

## 二、代码审查结论（已逐条源码核实）

### 🔴 P0 — 上线阻塞（必须修）

1. **登出不撤销服务端会话**　`server/api/auth/logout.post.ts:3`
   只从 `x-token` 请求头取 token 删会话，但鉴权已改用 HttpOnly Cookie（`db.ts:655` 优先读 `ml_token`），浏览器无法发 `x-token`。结果：登出仅清本地 Cookie，`sessions` 表的 token 仍有效 7 天。
   → 影响：共享电脑 / token 泄露后无法真正注销，A7 会话治理形同虚设。
   → 修：`const token = getCookie(event,'ml_token') || getHeader(event,'x-token')` 再 DELETE。

2. **「自动续费」语义泄漏（合规高风险）**　`server/utils/db.ts:612 / :617`
   `fulfillOrder` 在 UPDATE 与 INSERT 里**硬编码 `auto_renew=1`**；`vip/status.get.ts` 暴露为 `autoRenew`；`account/index.vue` 据此渲染绿色「自动续费：开启」。而 `vip/index.vue` 写「关闭（一次性付费）」、`terms.vue` 声明「无自动续费」——页面自相矛盾。类人体检已确认：VIP 页显示「关闭」，账户页显示「开启」。
   → 影响：未取得支付资质却对外呈现连续扣款语义，监管投诉高风险。
   → 修：`fulfillOrder` 改 `auto_renew=0`；下线 `subscription.post.ts` 续费开关（或改名状态查询）；同步改 `tests/vip-payment.test.mjs` 里固化 `auto_renew===1` 的断言。

3. **交卷幂等键作用域不一致 → 跨用户 500 / DoS**　`server/api/exam/submit.post.ts:11-12` + `db.ts:215/295`
   唯一索引是**全局** `exam_records(submit_nonce)`，查询却用 `(user_id,set_id,nonce)`；nonce 完全由客户端提供。攻击者提交任意 nonce（如 `"1"`）占位后，其他用户用同 nonce 交卷 SELECT 落空、INSERT 撞唯一索引 → 被 catch 成 500「交卷写入失败」；同用户换卷复用 nonce 同样 500。
   → 修：唯一索引改为 `(user_id, set_id, submit_nonce)`，或服务端派生 nonce；`:56` 的 catch 识别唯一约束冲突后回查返回首条记录。

### 🟠 P1 — 重要（强烈建议上线前修）

4. **封禁 / 改密不踢下线**　`db.ts:664` `getUser` 不校验 `banned`；`utils/admin.ts` 置 `banned=1`、改密码时均未清 `sessions`。
   → 影响：被封禁用户凭旧会话最长 7 天仍可刷题、调 VIP/AI 接口。
   → 修：`getUser` 增加 `if(row.banned) return null`；改 banned/密码时 `DELETE FROM sessions WHERE user_id=?`。

5. **LLM 与下单接口零限流**　全仓 `rateLimit` 仅覆盖 login/register/sendcode/search。
   `vip/resume.post.ts`、`vip/interview/start|answer`、`vip/path.post.ts`、`order/create.post.ts`、`exam/submit.post.ts`、`payment/sandbox/confirm.post.ts` 均无限流。
   → 影响：单 VIP 账号循环打 Deepseek（缓存改一字即绕过）烧额度；下单接口可无限灌订单表。
   → 修：LLM 类接口按 `user.id` 加 5 次/分 + 日配额；下单 3 次/分。

6. **考试倒计时纯前端可控**　无 `exam/start` 接口，服务端不记录开考时间；`submit.post.ts:5` 直接采信客户端 `usedSeconds` 落库，不校验 `set.duration`。
   → 影响：「限时模拟考试」卖点可被绕过，历史耗时数据不可信。
   → 修：新增开考接口落 `started_at`，交卷以服务端时间差为准并超时判负。

7. **Google Fonts 外链 → 中国用户字体失败**　`nuxt.config.ts:50`（与 UI 审计合并）
   → 修：自托管字体（或换成国内可达 CDN），消除 FOUC。

### 🟡 P2 — 建议（可后续迭代）

8. 注册/登录枚举文案不一致（`register`「该账号已注册」 vs `login`「该账号尚未注册」），与 A9 矛盾 → 统一中性文案。
9. `resume` 按 `content_hash` 全局命中缓存、不带 `user_id` → 跨用户复用诊断结果，加 `user_id` 条件。
10. `llm.ts:27` 用 `opts.timeoutMs`，但 `ChatOptions` 未声明该字段 → `nuxt typecheck` 失败，补类型。
11. `verifyPwd` 用 `===` 比较哈希（改 `crypto.timingSafeEqual`）；`users.email/phone` 缺 UNIQUE → 大小写变体可重复注册。
12. `adminDispatch.ts:54` 仅禁删自己，未禁降级/删最后一个 admin → 后台锁死风险。
13. `/skills` 长技能名文字截断（如「线程与 synchronized 内置锁」「JMM：happens-before 与 volatile」）→ 放宽截断阈值或换行。
14. 低对比度边界（珊瑚/灰字 2.5–2.9:1 on 浅底）→ 微调色值达 WCAG AA 4.5:1。
15. admin 页 `NUXT_E4011` dev 警告 → 生产构建验证无碍。
16. SEO：`og:image` 填空 + `routeRules` 预渲染未覆盖 `/privacy` `/terms` `/referral` `/skills` `/search` `/resume` → 补全。

---

## 三、已知上线阻塞（历史项，仍未解）

- **A4b 真实支付**：需营业执照才能接真实支付通道；目前为一次性付费 mock。注意：P0#2 的 `auto_renew=1` 硬编码是当前 mock 通道的**遗留 bug**，必须先修，再接真实通道。
- **#58 真实第三方登录 OAuth**：需相应资质，目前未接入（登录仅邮箱/手机号 + 密码/验证码）。

---

## 四、距离正式上线还需做的事（优先级排序）

| 优先级 | 事项 | 类型 |
|---|---|---|
| 阻塞 | P0#1 登出撤销会话 | 安全 |
| 阻塞 | P0#2 auto_renew 硬编码 + 页面自相矛盾 | 合规 |
| 阻塞 | P0#3 交卷 nonce 全局唯一索引 | 稳定性/安全 |
| 高 | P1#4 封禁/改密踢下线 | 安全 |
| 高 | P1#5 LLM/下单限流 | 成本/安全 |
| 高 | P1#6 考试服务端计时 | 业务可信度 |
| 高 | P1#7 字体自托管（中国可达） | 体验/可用 |
| 高 | A4b 接真实支付（营业执照） | 业务 |
| 中 | #58 真实 OAuth（资质） | 业务 |
| 中 | P2#8–#16 文案/缓存/类型/唯一约束/截断/对比度/SEO | 质量 |
| 中 | 管理后台强密码替换（admin/qwer1234 → 强密码移入 .env） | 安全 |

> 备注：本次审查中类人体检登录 401 为测试凭证误用（真实密码 `qwer1234`，非记忆中误记的 `123456`），非登录代码缺陷；修正后全流程通过。
