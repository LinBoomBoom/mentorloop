# 草稿 · Web 安全：安全编码实践与风险清单（be-c8）

> 状态：W3.2 后端草稿 · 待审阅 · 生成日期 2026-08-16
> 生产方式：基于官方站**真实抓取资料**组织 v1 学习层（代行策展），非凭训练记忆编造。
> 抓取来源：
> - MDN Web Docs · 安全（Web security / Secure context 等）— `https://developer.mozilla.org/`（HTTP 200，已抓取 6516 字真实正文；HTTPS、CSP、trusted-types、SameSite+Secure+HttpOnly Cookie、输入校验+输出编码、SRI、强认证 passkeys/TOTP、攻击清单 XSS/CSRF/IDOR/SSRF 等均来自原文）
> - OWASP Top 10 官方页 — `https://owasp.org/www-project-top-ten/`（HTTP 200，已确认**最新发布版本为 OWASP Top Ten 2025**；该抓取页为"数据采集/流程"页，未含具体 10 条分类正文，故本节不臆造 2025 具体条目，仅将 OWASP 作为风险目录参考并标注待补具体清单）

> 用途：后端内容基座补强（be-c8）。请评审事实锚定与学习层价值，确认后再写入 `data/seed-content.json` 的 `be` 模块。

---

## 第8章 · Web 安全：安全编码实践与风险清单

**章目标**：建立"默认不安全"的安全心智；掌握 MDN 列出的核心防护手段（HTTPS、CSP、安全 Cookie、输入校验+输出编码、SRI、强认证）；能对照 OWASP Top 10 这类风险目录做威胁建模；在写后端接口/模板/鉴权时不踩最常见的安全坑。

---

### be-c8-s1 · 安全编码核心实践（锚定 MDN）

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方

> 心智模型：Web 安全像**给房子装多重门锁**——HTTPS 是"门全加密"（传输不被偷看），CSP 是"只许自家工人进"（限制脚本来源），安全 Cookie 是"钥匙不随便放"，输入校验+输出编码是"进门的人和说的话都要查"；单靠一把锁不够，要层层设防（defense in depth）。

## 心智模型
浏览器环境"默认不安全"：内容可来自任意源、脚本可执行、用户数据可注入。安全编码的原则是**纵深防御**——每一层都假设其他层可能失效，所以自己也要做最小必要校验与限制。

## 核心知识点（锚定官方 MDN）
- **HTTPS / 安全上下文**：敏感操作（密码、支付、令牌）必须走 HTTPS；现代浏览器把 `https://` 视为"安全上下文"，许多强能力（如 Web Crypto、地理位置）只在安全上下文可用。
- **内容安全策略（CSP）**：用 `Content-Security-Policy` 响应头**限制可加载与执行的资源来源**，显著降低 XSS 影响面；`frame-ancestors` 指令可防点击劫持（替代已被弃用的 `X-Frame-Options`）。
- **Trusted Types**：防御基于 DOM 的 XSS——限制 `innerHTML` 等危险接收器只能接受"已审查的类型化值"，从源头阻断 `eval`-类注入。
- **Cookie 安全属性**：设置 `SameSite`（防 CSRF 跨站携带）、`Secure`（仅 HTTPS 传）、`HttpOnly`（禁止 JS 读取，防 XSS 偷令牌）。
- **输入校验 + 输出编码**：所有外部输入在服务端**校验**（类型/长度/范围/白名单），所有输出到 HTML/SQL/命令处做**对应编码/参数化**，是防注入的根本。
- **子资源完整性（SRI）**：给 `<script>`/`<link>` 加 `integrity`（资源哈希），防止 CDN 被篡改后加载恶意代码。
- **强认证**：优先 **passkeys（WebAuthn/无口令）** 与 **TOTP（基于时间的一次性口令）** 等抗钓鱼的多因子手段，弱化纯口令依赖。
- **常见攻击清单（MDN 列出需防范的）**：XSS（跨站脚本）、CSRF（跨站请求伪造）、IDOR（不安全的直接对象引用/越权）、SSRF（服务端请求伪造）等——这些都需在设计与编码阶段针对性布防。

> 来源：[MDN Web Docs · Web security](https://developer.mozilla.org/)

## 为什么重要 / 何时会用到
- 你写的每个接受用户输入的接口，都是潜在注入点；每个渲染用户内容的页面，都是潜在 XSS 点。
- 安全漏洞的代价远高于"多写几行校验"：数据泄露、账号被盗、监管与声誉风险。
- 纵深防御让"某一层漏了"不至于直接酿成事故。

## 常见坑
- **只在前端校验**：前端校验是体验，后端必须**再校验**，否则攻击者直接绕过页面打 API。
- **Cookie 不设 HttpOnly/SameSite**：XSS 一打就拿到令牌，或 CSRF 直接以用户身份发请求。
- **拼接 SQL/命令**：不用参数化/预编译，必留注入口；输出到 HTML 不编码，必留 XSS。
- **CDN 脚本不加 SRI**：CDN 被攻破即全站沦陷。
- **把用户控制的对象 ID 直接查库**：典型 IDOR，需校验"当前用户是否有权访问该对象"。

## 动手自测
1. 起一个带登录的页面，故意不设 `HttpOnly`，用 XSS 偷 `document.cookie` 看差别；再设 `HttpOnly`+`SameSite=Strict` 验证防护。
2. 给页面加 `Content-Security-Policy: default-src 'self'`，验证外链 `<script>` 被拦；用 `frame-ancestors 'none'` 验证无法被 iframe 嵌套。
3. 对一个接口做"IDOR 测试"：用用户 A 的 token 访问 `/api/order/{B的订单ID}`，确认后端有归属校验。
4. 给 CDN 上的 `<script>` 加 `integrity` 属性，篡改文件内容后刷新，验证浏览器拒绝加载。

## 面试视角
"XSS 和 CSRF 区别与防护？"答：XSS 是注入恶意脚本在受害者浏览器执行，靠 CSP/Trusted Types/输出编码/HttpOnly Cookie 防；CSRF 是借受害者身份发跨站请求，靠 SameSite Cookie/CSRF token/校验 Origin 防。"为什么既要前端又要后端校验？"答：前端为体验与减负，后端为安全底线，攻击者直连 API 绕过前端。"IDOR 是什么？"答：通过修改对象引用（如订单 ID）越权访问他人数据，需服务端做权限归属校验。"CSP 能完全防 XSS 吗？"答：显著降低而非根除，需配合输入校验、输出编码、Trusted Types 纵深防御。

## 相关知识图谱
- [be-c8-s2 风险清单与 OWASP](doc:backend/be-c8/be-c8-s2) — 用风险目录做威胁建模
- [be-c7-s1 TCP 协议核心](doc:backend/be-c7/be-c7-s1) — HTTPS 运行在 TLS/TCP 之上
- [be-c3 Spring 生态与 Boot 原理](doc:backend/be-c3/be-c3-s1) — 框架层安全配置（如 Spring Security）

---

### be-c8-s2 · 风险清单与 OWASP Top 10（威胁建模参考）

> 时效 | 核验=2026-08-16 | 风险=中 | 来源=OWASP 官方（已确认 2025 为最新版，具体 10 条分类待补抓官方正文）

> 心智模型：OWASP Top 10 像**"Web 应用安全风险体检表"**——它不代表全部，但是行业公认的"首先要消灭的那十类"。写功能前对照它做一遍威胁建模，比上线后被白帽子报告要便宜得多。

## 心智模型
OWASP（开放 Web 应用安全项目）Top 10 是面向开发者与 Web 应用安全的"标准认知文档"，代表业界对**最关键的 Web 应用安全风险**的广泛共识；官方明确它是"迈向更安全编码的第一步"，企业应当采纳并确保应用最小化这些风险。

## 核心知识点（锚定官方）
- **版本事实**：OWASP 官方页明确写出——**"The most current released version is the OWASP Top Ten 2025."** 上一版为 2021，更早有 2017。
  - 注意：本次沙箱抓取的是该项目的"数据采集/流程"页，**未包含 2025 版具体的 10 条分类正文**，因此本节**不臆造 2025 的具体条目排序**。
  - 业界长期广泛引用的基线（如 2021 版的 Broken Access Control、Cryptographic Failures、Injection、Insecure Design、Security Misconfiguration、Vulnerable & Outdated Components、Identification & Authentication Failures、Software & Data Integrity Failures、Security Logging & Monitoring Failures、SSRF）可作为**历史基线参考**，但应以 2025 官方正文为准——**待补抓 `owasp.org` 2025 正文后并入具体清单**。
- **用途定位**：OWASP Top 10 是"意识/基线"文档，不是完整安全标准；它用于推动组织安全文化、作为威胁建模的 checklist，而非替代纵深防御的具体编码实践（见 s1）。

## 为什么重要 / 何时会用到
- 需求/设计评审时，用 Top 10 当 checklist 逐条问"我们这块会不会中招"，能在编码前发现设计级风险（如 Insecure Design、权限模型缺失）。
- 安全审计、合规（如等保、SOC2）常以 OWASP 为参照。
- 它帮你**优先排序**——先把"访问控制""注入""认证"这几类高频高危解决掉。

## 常见坑
- **把 OWASP 当"全部安全"**：它是 top 10 不是 top 全部，供应链、业务逻辑、并发竞争等不在表里也要管。
- **只看不落地**：对照清单做了评审记录，却没在代码/配置里真正加校验、加日志、加鉴权。
- **用过时版本**：以 2017/2021 当"最新"，忽略 2025 已发布（本次核验确认 2025 为当前版）。
- **补抓缺失就编造**：本草稿对已抓不到具体条目的部分明确标注"待补"，不把记忆中的旧版条目冒充 2025 官方内容。

## 动手自测
1. 拿自己负责的一个接口/页面，按 OWASP Top 10（历史基线 + 待补 2025）逐条打勾：访问控制？注入？认证？配置？日志？
2. 做一次"威胁建模"小练习：画出自家系统的信任边界，标出每个边界上的输入校验与鉴权点。
3. 等补抓 OWASP 2025 正文后，用最新 10 条替换历史基线，重做一遍 checklist，确认无遗漏。

## 面试视角
"OWASP Top 10 是什么、最新版？"答：业界最关键的 Web 应用安全风险共识清单；**最新为 2025 版**（我本次核验确认）。"它和具体安全编码实践（如 CSP、参数化）什么关系？"答：Top 10 是 risk catalog / 基线，编码实践是 mitigation；两者配合——先用清单找风险，再用实践消风险。"你们怎么做威胁建模？"答：在设计/评审阶段对照 OWASP 等清单逐条过信任边界与输入输出，提前消灭设计级漏洞。

## 相关知识图谱
- [be-c8-s1 安全编码核心实践](doc:backend/be-c8/be-c8-s1) — 具体防护手段
- [be-c3 Spring 生态与 Boot 原理](doc:backend/be-c3/be-c3-s1) — 框架安全配置落地
- [be-c7-s1 TCP 协议核心](doc:backend/be-c7/be-c7-s1) — 传输层之上的 TLS/HTTPS

---

## 评审自检清单（请你据此反馈）
- [ ] **事实锚定**：MDN 安全实践均来自 `developer.mozilla.org` 真实抓取；OWASP 已确认 2025 为最新版且明确标注"具体 10 条待补抓"，无臆造？
- [ ] **学习层价值**：相比直接看 MDN/OWASP，是否"更省理解成本"（心智模型/常见坑/自测/面试视角）？
- [ ] **待补部分**：OWASP 2025 具体 10 条因抓取页为流程页未含正文，是否接受"先以历史基线+明确待补"的诚实留白，还是希望我换可达源补抓具体清单？
- [ ] **模式认可**：是否认可"脚本抓取真实官方资料 + 我组织 v1 学习层 + 标注来源 + 交你审阅"的代行策展模式？
- [ ] **入库方式**：确认后按现有 seed schema 写入 `data/seed-content.json` 的 `be` 模块 `be-c8`，并跑 `_reseed.mjs` 校验无漂移。
