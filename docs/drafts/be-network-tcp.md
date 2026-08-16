# 草稿 · 计算机网络：TCP 与后端必备网络基础（be-c7）

> 状态：W3.2 后端草稿 · 待审阅 · 生成日期 2026-08-16
> 生产方式：基于官方站**真实抓取资料**组织 v1 学习层（代行策展），非凭训练记忆编造。
> 抓取来源：
> - Linux `tcp(7)` 手册页 — `https://man7.org/linux/man-pages/man7/tcp.7.html`（HTTP 200，已抓取 45240 字真实正文；TCP 协议语义、socket API、内核参数、拥塞控制、Nagle、TIME_WAIT、keepalive 等均来自原文）

> 用途：后端内容基座补强（be-c7）。请评审事实锚定与学习层价值，确认后再写入 `data/seed-content.json` 的 `be` 模块。

---

## 第7章 · 计算机网络：TCP 与后端必备网络基础

**章目标**：理解 TCP 作为后端通信基石的核心语义（可靠、面向连接、流式、全双工）；能解释三次握手、丢包重传、拥塞控制、Nagle、TIME_WAIT、keepalive 等现象及其对服务的影响；能把网络知识用于排查连接超时、端口耗尽、延迟抖动等真实问题。

---

### be-c7-s1 · TCP 协议核心（锚定 man7 tcp(7)）

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方

> 心智模型：TCP 像一根**两端都确认收到的"可靠水管"**——数据按字节流顺序到达、丢了会重传、还带每包校验和；它不保留"消息边界"（你发两次和发一次大块，对端可能一样收），所以**应用层自己要定义边界**（长度前缀/分隔符）。

## 心智模型
Linux 的 TCP 实现遵循 RFC 793、RFC 1122、RFC 2001，并带 NewReno 与 SACK 扩展。它在 `ip(7)` 之上提供**两个 socket 之间可靠、面向流、全双工**的连接：TCP 保证数据**按序到达**并重传丢失包；它对每个包生成并校验 checksum 以捕获传输错误；**TCP 不保留记录边界**（record boundaries）。

建立连接：新建 socket 尚无地址，用 `connect(2)` 发起外出连接；用 `bind(2)` 绑定本地地址端口后 `listen(2)` 进入监听态，再用 `accept(2)` 为每个进来的连接生成新 socket。只有 `accept`/`connect` 成功后的 socket 才能传数据；监听中和尚未连接的 socket 不能发数据。

## 核心知识点（锚定官方）
- **可靠字节流**：保证顺序 + 重传 + 每包校验；不保留消息边界（应用层需自行分帧）。
- **连接建立/接受**：`socket(AF_INET, SOCK_STREAM, 0)` → `bind`/`listen`/`accept`（服务端）或 `connect`（客户端）。
- **高性能扩展（RFC 1323）**：PAWS、Window Scaling、Timestamps——Window Scaling 允许 >64KB 的大窗口，支撑高延迟/高带宽链路；需调大发送/接收缓冲区（`/proc/sys/net/ipv4/tcp_wmem`、`tcp_rmem` 或 `SO_SNDBUF`/`SO_RCVBUF`）。
- **拥塞控制**：`tcp_congestion_control` 设默认算法（"reno" 永远可用）；`TCP_CONGESTION` socket 选项可**按 socket** 指定算法（特权进程可选全部，普通进程受限）。
- **Nagle 算法与 `TCP_NODELAY`**：默认 Nagle 会缓冲小包、凑够再发以省带宽；设 `TCP_NODELAY` 则**立即发送**，避免交互延迟（但与 `TCP_CORK` 有交互）。
- **`TCP_CORK`**： cork 住部分帧，清空选项时才发，适合"先拼头部再 sendfile"或吞吐优化（与 Nagle 不同，是显式批处理）。
- **keepalive**：`SO_KEEPALIVE` 开启后，空闲达 `tcp_keepalive_time`（默认 7200 秒=2 小时）开始探测，每 `tcp_keepalive_intvl`（默认 75 秒）探一次，最多 `tcp_keepalive_probes`（默认 9）次无响应才杀连接；另有 `TCP_KEEPIDLE`/`TCP_KEEPINTVL`/`TCP_KEEPCNT` 按 socket 覆盖。
- **TIME_WAIT 与回收**：`tcp_fin_timeout`（默认 60 秒）控制等最终 FIN 的秒数（规范违规但防 DoS）；`tcp_max_tw_buckets`/`tcp_max_syn_backlog` 限制 TIME_WAIT / 半连接数量以抗简单 DoS；`tcp_tw_reuse` 可在协议安全时复用 TIME_WAIT socket（不建议随意改）。
- **SYN 洪水防护**：`tcp_syncookies`（默认 1）在 syn backlog 溢出时发 syncookie，属"最后手段"，与协议某些扩展冲突，不应用作常规调优；推荐替代是调大 `tcp_max_syn_backlog`/`tcp_synack_retries`/`tcp_abort_on_overflow`。
- **重传与超时**：`tcp_retries1`（默认 3）普通重传、`tcp_retries2`（默认 15，约 13–30 分钟）放弃前最大重传；`TCP_USER_TIMEOUT` 可设"数据未确认多久就强关连接"（fail fast 或抗长断连）。
- **Fast Open（RFC 7413）**：`TCP_FASTOPEN` 允许 SYN 里带数据，握手未完成即可开始交换数据，降低首包延迟。
- **错误**：`EPIPE`（对端意外关闭/在已 shutdown 的 socket 读）、`ETIMEDOUT`（对端迟迟不确认重传数据）等。

> 来源：[man7.org · tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html)

## 为什么重要 / 何时会用到
- 你写的每个 HTTP/gRPC/RPC 调用，底层都是 TCP。理解它才能解释"为什么偶发连接超时""为什么小请求延迟高""为什么短连接把端口耗光"。
- 调优：`tcp_rmem`/`tcp_wmem` 与 window scaling 直接决定高带宽长肥管道（long-fat pipe）的吞吐；`TCP_NODELAY` 决定交互式延迟。
- 排障：TIME_WAIT 堆积、SYN 队列满、keepalive 不生效，都是生产常见网络症状的根因。

## 常见坑
- **短连接耗尽端口**：高 QPS 频繁建连，TIME_WAIT 占满 `tcp_max_tw_buckets` 或本地端口；应改连接池/长连接，而非盲目开 `tcp_tw_reuse`。
- **小包延迟不关 Nagle**：交互式协议（如某些 RPC、游戏）不设这个会顿；但开 `TCP_NODELAY` 又可能增大小包数量，需权衡。
- **以为 TCP 保"消息"边界**：连续 `send` 可能被合并到一个段，接收方一次 `recv` 拿到多段——应用层必须自己分帧。
- **把 syncookies 当常规优化**：它违反协议、可能伤客户端，只在 syn backlog 溢出兜底。
- **keepalive 默认 2 小时太松**：需要快速探活（如微服务健康检查）应显式设 `TCP_KEEPIDLE` 等，别依赖默认。

## 动手自测
1. `ss -tan` 观察连接各状态（ESTABLISHED / TIME_WAIT / SYN_RECV），压一波短连接看 TIME_WAIT 增长。
2. 用 `python` 起一个 echo server，客户端分别用默认与 `setsockopt(TCP_NODELAY)` 发大量小包，用 `tcpdump` 看段数量与延迟差异。
3. 读 `/proc/sys/net/ipv4/tcp_rmem`（min default max）、`tcp_wmem`，理解接收/发送缓冲自动调优（`tcp_moderate_rcvbuf`）。
4. 设 `TCP_USER_TIMEOUT` 为一个小值，断开网络看连接多久被强关，体会 fail-fast。

## 面试视角
"TCP 为什么要三次握手？"答：双方确认彼此收发能力、同步初始序列号，避免历史连接扰乱。"TIME_WAIT 有什么用、为什么不能立刻回收？"答：确保最后 ACK 到达、让旧连接的残留报文在网络中消亡，防止新连接收到旧数据；盲目回收会出乱序。"Nagle 和 TCP_NODELAY 什么关系？"答：Nagle 默认合并小包省带宽，NODELAY 关掉它换延迟。"TCP 怎么保证可靠？"答：序列号+确认+校验和+重传+滑动窗口+拥塞控制。"为什么 TCP 没有消息边界？"答：它是字节流，应用层要自己分帧。

## 相关知识图谱
- [be-c7-s2 网络排障与面试要点](doc:backend/be-c7/be-c7-s2) — 把协议知识用于实战
- [be-c8-s1 Web 安全编码实践](doc:backend/be-c8/be-c8-s1) — TLS/HTTPS 是 TCP 之上的安全层
- [be-c4 系统设计与高并发](doc:backend/be-c4/be-c4-s1) — 连接池与超时设计

---

### be-c7-s2 · 网络排障与面试要点（后端视角）

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=通用后端实践（基于 s1 协议语义推导，非单一官方抓取）

> 心智模型：网络问题不是"通或不通"，而是**"在哪一层断的"**——先用 `ping`（网络层）确认可达，再用 `telnet/nc`（传输层端口）确认对端在听，再用 `curl -v`/抓包看应用层协商；分层定位，别一上来就改代码。

## 心智模型
把一次"调不通"拆成层次：DNS 解析 → 路由/网络层可达（ICMP） → 传输层端口通（TCP connect） → TLS 握手 → 应用层协议（HTTP/gRPC）。哪一环卡住，工具不同、解法不同。

## 核心知识点（通用实践）
- **连接超时 vs 读写超时**：connect 超时是"握不上手"，read 超时是"握上了但不吐数据"——两者根因不同（前者网络/对端没 listen，后者对端慢或死锁）。
- **端口耗尽**：客户端短连接大量 TIME_WAIT 占满本地端口（`tcp_max_tw_buckets` 限制 + 本地端口范围）；解法：连接池、长连接、`tcp_tw_reuse`（谨慎）、扩端口范围。
- **半连接/全连接队列**：服务端 `listen` 的 backlog 与内核 `tcp_max_syn_backlog`、`somaxconn` 决定能接多少并发握手中的连接；队列满则丢 SYN（表现像"偶发连接失败"）。
- **RST 与 FIN**：`ECONNRESET`/对端发 RST 通常是进程崩或防火墙拦截；正常关闭走 FIN。
- **抓包定位**：`tcpdump`/`Wireshark` 看握手、重传（retransmission）、乱序（out-of-order）、零窗口（zero window）——这些是"延迟高/吞吐上不去"的真相。
- **MTU/分片**：大包在长路径被分片或丢分片会表现为"小请求行、大请求卡"；`tcp_mtu_probing` 可缓解 ICMP 黑洞。

## 为什么重要 / 何时会用到
生产"服务偶发连不上""接口时快时慢""容器间调用超时"几乎都落在上面某一项。能分层定位，就从"瞎猜重启"变成"十分钟定位"。

## 常见坑
- **只调应用层不调内核**：连接数上不去先怀疑代码，其实是 `somaxconn`/`tcp_max_syn_backlog` 太小。
- **防火墙只放 ESTABLISHED**：放行业务端口却忘了相关范围，导致被动模式/数据连接被拦。
- **忽略 DNS 缓存/TTL**：DNS 解析慢或解析到旧 IP，表现为"连不上"，根因在网络层外。
- **超时设 0 或设太大**：0 等于不等待（瞬时失败），太大则故障时不 fail-fast、线程/连接堆积。

## 动手自测
1. `time curl -v https://example.com` 看 DNS/TLS/首字节各花多久，定位慢在哪段。
2. 用 `nc -zv host port` 验证传输层端口通；不通时 `tcpdump -i any host x port y` 看 SYN 是否到达、有无 RST。
3. 压测短连接，观察 `ss -tan | grep TIME-WAIT | wc -l`，验证端口耗尽现象与连接池缓解效果。
4. 故意把服务端 `somaxconn` 设很小，压并发连接，看是否出现 SYN 丢弃与偶发失败。

## 面试视角
"服务偶发连接超时但 CPU/内存正常，怎么查？"答：分层——DNS、网络可达、对端 listen、半连接队列（`somaxconn`/`tcp_max_syn_backlog`）、防火墙 RST、本地端口耗尽（TIME_WAIT）。"connect timeout 和 read timeout 区别？"答：前者握手阶段，后者已建立但无数据。"为什么高并发短连接会端口耗尽？"答：TIME_WAIT 占本地端口，需连接池/长连接/谨慎 `tcp_tw_reuse`。"怎么看是不是 TCP 重传导致慢？"答：抓包看 retransmission / zero window。

## 相关知识图谱
- [be-c7-s1 TCP 协议核心](doc:backend/be-c7/be-c7-s1) — 协议语义基础
- [be-c8-s1 Web 安全编码实践](doc:backend/be-c8/be-c8-s1) — HTTPS/TLS 在 TCP 之上
- [be-c4 系统设计与高并发](doc:backend/be-c4/be-c4-s1) — 超时与连接池设计

---

## 评审自检清单（请你据此反馈）
- [ ] **事实锚定**：TCP 协议语义、socket API、内核参数、拥塞控制、Nagle/TIME_WAIT/keepalive 是否全部来自 `man7.org tcp(7)` 真实抓取、来源可回溯？
- [ ] **学习层价值**：相比直接看 man page，是否"更省理解成本"（心智模型/常见坑/自测/面试视角）？
- [ ] **s2 边界**：s2 排障为"基于 s1 协议语义推导的通用后端实践"（非单一官方抓取），是否接受这种划分？
- [ ] **模式认可**：是否认可"脚本抓取真实官方资料 + 我组织 v1 学习层 + 标注来源 + 交你审阅"的代行策展模式？
- [ ] **入库方式**：确认后按现有 seed schema 写入 `data/seed-content.json` 的 `be` 模块 `be-c7`，并跑 `_reseed.mjs` 校验无漂移。
