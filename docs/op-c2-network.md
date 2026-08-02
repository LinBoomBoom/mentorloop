<!-- title: 网络与 Nginx -->
<!-- goal: 理解 TCP/IP、DNS、HTTP/TLS 的运转机制，并能用 Nginx 完成反向代理、负载均衡、缓存压缩、限流与安全加固等核心运维配置。 -->

# op-c2-s1 | TCP/IP 协议栈与连接管理
> direction: 互联网通信的底层契约，三次握手建连、四次挥手断连。

## 心智模型
把网络通信想成**寄信系统**：IP 是信封上的地址（负责把信从 A 送到 B），TCP 是信封里的"可靠投递服务"——它保证信不丢、不乱序、不重复，并在两端建立一条**有序的虚拟连接**。应用层（HTTP）只管写内容，底层可靠性由 TCP 兜底。

## 核心知识点（锚定官方）
- **分层**：链路层（以太网）→ 网络层（IP，寻址与路由）→ 传输层（TCP/UDP，端到端可靠/不可靠传输）→ 应用层（HTTP/DNS）。RFC 791 定义 IPv4，RFC 9293 定义 TCP。
- **TCP 三次握手**：SYN → SYN-ACK → ACK，双方各自确认"我能发也能收"，避免历史重复连接造成的混乱。
- **四次挥手**：FIN → ACK → FIN → ACK；因 TCP 全双工，关闭需双向各发 FIN，故通常四步（可三次合并仅在特定场景）。
- **关键机制**：序列号/确认号保证有序与重传；滑动窗口做流量控制；拥塞控制（慢启动、拥塞避免）防网络过载；TIME_WAIT 状态保活 2×MSL 防最后 ACK 丢失。
- **UDP**：无连接、不保证送达，适合 DNS 查询、音视频等低延迟场景。
来源：RFC 9293 (TCP) https://www.rfc-editor.org/rfc/rfc9293 ；RFC 791 (IP) https://www.rfc-editor.org/rfc/rfc791 ；RFC 1122 (Requirements)

## 为什么重要
连接建立慢（握手 RTT）、TIME_WAIT 堆积、半连接队列溢出、RST 频发——这些线上问题都源于对 TCP 的误用或参数不当。调优与排障必须先懂它。

## 常见坑
- 高并发短连接导致 `TIME_WAIT` 爆量占满端口；靠 `tcp_tw_reuse`/`SO_REUSEADDR` 缓解，而非盲目关 TIME_WAIT（会破坏可靠性）。
- 把 `net.ipv4.tcp_tw_recycle` 在内网/NAT 下开启导致连接被误杀（Linux 4.12 已移除该参数）。
- 没区分 `accept` 队列（全连接）与 `syn` 队列（半连接）溢出，盲目调大 `backlog` 无效。
- 误以为 TCP 保证"实时"，用它传音视频而未处理抖动。

## 动手自测
```bash
ss -tan | awk '{print $1}' | sort | uniq -c   # 看各 TCP 状态分布
ss -ltnp | grep :443                           # 谁在监听 443
# 抓三次握手包
tcpdump -i any -nn 'tcp[tcpflags] & (tcp-syn|tcp-ack) != 0' port 80 -c 20
```

## 面试视角
- 为什么是三次握手不是两次？四次挥手能否合并成三次？
- TIME_WAIT 的作用与过多怎么治理？
- TCP 与 UDP 适用场景区别；拥塞控制解决什么问题？

# op-c2-s2 | DNS 解析全流程
> direction: 把"域名"翻译成"IP"的分布式数据库查询。

## 心智模型
DNS 像一个**全球分层的电话簿**：你只知道"www.example.com"这个名字，递归解析器帮你从根（.）→ 顶级域（.com）→ 权威服务器一路问下去，最终拿到 IP。本地还有**缓存**，避免每次都跑完整链路。

## 核心知识点（锚定官方）
- **记录类型**：A（IPv4）、AAAA（IPv6）、CNAME（别名）、MX（邮件）、TXT（文本/校验）、NS（委派）、PTR（反向解析）。
- **解析链**：浏览器/系统缓存 → `/etc/hosts` → 本地 DNS  resolver（`/etc/resolv.conf` 的 nameserver）→ 递归解析器 → 根 → TLD → 权威。
- **TTL**：每条记录带生存时间，决定缓存时长；改 DNS 后生效慢常因 TTL 未过期。
- **递归 vs 迭代**：客户端向**递归**解析器发请求，解析器向各层级做**迭代**查询并汇总。
- **安全**：DNSSEC 用签名防篡改；DoH/DoT 加密查询防窃听。
来源：RFC 1034/1035 (DNS) https://www.rfc-editor.org/rfc/rfc1035 ；RFC 8499 (DNS Terminology) https://www.rfc-editor.org/rfc/rfc8499 ；RFC 4033 (DNSSEC)

## 为什么重要
"网站打不开但 IP 能 ping 通"八成是 DNS 问题；CDN、多活、灰度都依赖 DNS 调度。理解解析链才能定位是哪个环节慢或错。

## 常见坑
- 改了 A 记录立刻验证，却忘了旧 TTL 仍生效，误判"没生效"。
- CNAME 指向 CNAME 形成链过长，或把 CNAME 放在 zone 顶点（与 NS/SOA 冲突，RFC 不允许）。
- 国内备案/解析分流（分运营商/地域）配置错，导致部分地区无法访问。
- 内网用 `.local` 触发 mDNS 冲突，或 `/etc/hosts` 误写覆盖了真实域名。

## 动手自测
```bash
dig +trace www.example.com          # 完整解析链
dig www.example.com +noall +answer  # 只看答案段
nslookup -type=MX example.com       # 查邮件记录
systemd-resolve --status            # 看本机 DNS 配置
```

## 面试视角
- 从浏览器输入域名到拿到 IP 的完整过程？
- TTL 作用？为什么改 DNS 不是立刻全局生效？
- CNAME 能不能放在 zone 顶点？DNSSEC 解决什么？

# op-c2-s3 | HTTP 语义与请求/响应
> direction: 应用层的事实标准协议，运维要懂状态码、方法、头与连接模型。

## 心智模型
HTTP 是**无状态的请求-响应对话**：客户端发一条"请求"（方法+路径+头+体），服务器回一条"响应"（状态码+头+体）。每一次对话彼此独立，状态靠 Cookie/Token 等机制在外挂。就像餐厅点单：每道菜单独下单，厨师不默认记得你上一道点过什么。

## 核心知识点（锚定官方）
- **方法**：GET（取，幂等）、POST（建/处理）、PUT（整体替换，幂等）、PATCH（局部改）、DELETE（删）、HEAD（只取头）。
- **状态码**：2xx 成功、3xx 重定向（301 永久/302 临时/304 未改）、4xx 客户端错（400/401/403/404/429）、5xx 服务端错（500/502/503/504）。
- **关键头**：`Host`（虚拟主机）、`Content-Type`、`Content-Length`/`Transfer-Encoding: chunked`、`Cache-Control`、`Connection: keep-alive`、`User-Agent`。
- **HTTP/1.1 vs HTTP/2**：1.1 默认 keep-alive 复用 TCP；HTTP/2（RFC 9113）多路复用、头部压缩、单连接并发流，消除队头阻塞。
- **幂等**：GET/PUT/DELETE 幂等，重试安全；POST 非幂等，重试可能重复创建。
来源：RFC 9110 (HTTP Semantics) https://www.rfc-editor.org/rfc/rfc9110 ；RFC 9112 (HTTP/1.1) ；RFC 9113 (HTTP/2)

## 为什么重要
502/504/429 这些报警你每天都会遇到，分不清"是网关问题还是后端问题"就无从下手。理解方法与幂等才能正确设计重试与缓存。

## 常见坑
- 把 502（网关收到无效响应）和 504（网关等待后端超时）混为一谈，定位方向错。
- 前端对 POST 无限重试导致重复下单；应只对幂等方法重试。
- 漏设 `Content-Length` 或错误用 chunked，导致客户端截读。
- 误用 301 永久重定向缓存，后期改不回来（浏览器长期记忆）。

## 动手自测
```bash
curl -sI https://example.com                 # 只看响应头
curl -v https://example.com                  # 看完整请求/响应
curl -X POST -d 'a=1' -i https://api/x       # 发 POST 看状态码
# 模拟 429 限流观察客户端行为
curl -w 'code=%{http_code} time=%{time_total}\n' https://api/x
```

## 面试视角
- 301/302/304 区别？何时用哪个？
- 502 与 504 的根本差异与排查思路？
- 什么是幂等？哪些 HTTP 方法幂等，为何重要？

# op-c2-s4 | TLS/HTTPS 与证书体系
> direction: 在明文 HTTP 上套一层加密与身份校验。

## 心智模型
TLS 像给 HTTP 快递**加了两个保险**：一是**加密**（中途人看不懂内容），二是**身份证书**（确认对方真是它声称的那个人，不是冒充）。握手阶段用非对称加密协商出一把临时对称密钥，之后用对称加密高速传输——兼顾安全与性能。

## 核心知识点（锚定官方）
- **握手（TLS 1.3, RFC 8446）**：ClientHello（含支持的密码套件与 key_share）→ ServerHello（选定套件与证书）→ 双方各自用临时密钥推导共享密钥，1-RTT 完成；1.2 则需 2-RTT 且依赖 RSA/迪菲-赫尔曼。
- **证书链**：叶子证书 ← 中间证书 ← 根证书；服务器须发送**完整链**（含中间），否则部分客户端校验失败。
- **PKI**：CA 签发证书，浏览器/系统内置信任根；证书含域名（SAN）、有效期、公钥。
- **前向安全（PFS）**：用临时 DH 密钥，即使长期私钥泄露也无法解密历史流量。
- **Let's Encrypt**：免费 ACME 自动签发，90 天有效期，配合 `certbot/自动续期`。
来源：RFC 8446 (TLS 1.3) https://www.rfc-editor.org/rfc/rfc8446 ；RFC 5280 (X.509) ；Let's Encrypt https://letsencrypt.org/

## 为什么重要
混合内容（HTTP 资源嵌在 HTTPS 页）、证书过期、链不完整、SNI/证书域名不匹配——这些是导致"小锁变红"的高频原因，直接影响用户信任与 SEO。

## 常见坑
- 证书部署漏发中间证书，导致部分老旧客户端/移动端报"不受信任"。
- 证书过期未自动续期，零点全站变红（监控必须对证书到期告警）。
- 私钥权限 644 太开放，或被提交进代码仓库；私钥一旦泄露等同身份被盗。
- 启用已废弃的 TLS 1.0/1.1 或弱密码套件，过等保/安全扫描不达标。

## 动手自测
```bash
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates -subject
curl -Iv https://example.com         # 看协商的 TLS 版本与证书
# 查证书链是否完整
openssl s_client -connect example.com:443 -showcerts
```

## 面试视角
- TLS 握手为何 1.3 比 1.2 快？前向安全是什么？
- 为什么服务器必须发送中间证书？
- 混合内容（mixed content）为何危险、如何修复？

# op-c2-s5 | Nginx 架构与配置骨架
> direction: 高性能事件驱动 Web 服务器，配置即"分块嵌套"。

## 心智模型
Nginx 像一座**分层调度楼**：最底层 `events` 决定怎么接客（连接模型），中间 `http` 是整栋楼的公共规则，每层 `server` 是一个"虚拟站点"，`location` 是站点内的"分诊台"——按 URL 把请求派去不同后端或静态目录。配置就是逐层嵌套的块（block）。

## 核心知识点（锚定官方）
- **架构**：master 进程管配置/子进程，多个 **worker** 进程各跑一个事件循环（epoll/kqueue），单 worker 可扛数万并发连接，能力强于每连接一线程的模型。
- **配置层级**：`main` → `events { }` → `http { }` → `server { }` → `location { }`。指令就近生效、可继承。
- **核心指令**：`worker_processes`（通常 `auto`）、`worker_connections`、`listen`、`server_name`、`root`、`index`、`location` 匹配（前缀 `=` 精确、`^~` 前缀优先、正则 `~`）。
- **include**：用 `include /etc/nginx/conf.d/*.conf;` 拆分多站点，避免单文件膨胀。
- **热重载**：`nginx -t` 测语法、`nginx -s reload` 平滑重载（不中断连接）。
来源：Nginx Admin Guide https://nginx.org/en/docs/ ；Nginx 架构 https://nginx.org/en/docs/ngx_core_module.html

## 为什么重要
Nginx 是绝大多数站点的入口（反向代理/静态/TLS 终结）。写错 `location` 优先级、配错 `root`，轻则 404，重则把内网暴露公网。

## 常见坑
- `location` 正则与前缀优先级理解错，导致本该走后端的请求被当成静态文件 404。
- `root` 写在 `location` 内与写在 `server` 内解析基准不同，路径错乱。
- 改完没跑 `nginx -t` 直接 `reload`，语法错导致 reload 失败、旧配置僵死。
- `server_name` 用 `_` 通配却忘了默认 server 兜底，未知域名落到错误站点。

## 动手自测
```bash
nginx -t                       # 上线前必跑语法检查
nginx -s reload                # 平滑重载
# 最小站点骨架
cat > /etc/nginx/conf.d/demo.conf <<'EOF'
server {
  listen 80;
  server_name demo.example.com;
  root /var/www/demo;
  location / { try_files $uri $uri/ =404; }
}
EOF
```

## 面试视角
- Nginx master/worker 模型为何高效？
- `location` 优先级规则（`=` / `^~` / `~` / 前缀）？
- `root` 放在 server 与 location 内的区别？

# op-c2-s6 | 反向代理与负载均衡
> direction: Nginx 作为流量中枢，把请求分发给一组后端。

## 心智模型
反向代理是**前台接待**：用户只和 Nginx 打交道，Nginx 悄悄把请求转给后面真正干活的"员工"（应用服务器），再把结果带回。当员工有多名时，Nginx 就是**调度中心**，按策略把活均匀分派，既分摊压力又能在某人休假时自动绕开。

## 核心知识点（锚定官方）
- **反向代理**：`proxy_pass http://backend;` 转发请求；常用配套 `proxy_set_header Host $host;`、`X-Real-IP $remote_addr;`、`X-Forwarded-For`、`X-Forwarded-Proto`。
- **upstream 负载均衡**：`upstream backend { server 10.0.0.1:8080; server 10.0.0.2:8080; }`，默认 **round-robin** 轮询；`weight=` 加权；`ip_hash` 按客户端 IP 黏滞（破坏某些水平扩展）；`least_conn` 转给连接最少者。
- **健康检查**：`max_fails`/`fail_timeout` 让失败节点暂时下线；商业版有主动 health_check。
- **容错**：`proxy_next_upstream error timeout http_502;` 在后端报错时自动重试下一个节点。
来源：Nginx upstream 模块 https://nginx.org/en/docs/http/ngx_http_upstream_module.html ；proxy 模块 https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## 为什么重要
反向代理是水平扩展与高可用的入口。权重配错会导致某节点被打爆；`ip_hash` 在节点扩缩容时造成会话倾斜；不加 `proxy_next_upstream` 则单点故障直接透传 502。

## 常见坑
- `proxy_pass` 末尾有无 `/` 决定 URI 是否拼接，差一个斜杠路径全错。
- 后端拿到的客户端 IP 全是 Nginx 的，漏设 `X-Forwarded-For` 导致限流/审计失效。
- `ip_hash` 让扩容后流量不均，且节点下线时部分用户会话丢失。
- 没设 `proxy_read_timeout`，慢请求被 Nginx 提前断，后端还在跑造成"幽灵请求"。

## 动手自测
```nginx
upstream api {
  least_conn;
  server 10.0.0.1:8080 weight=2 max_fails=3 fail_timeout=15s;
  server 10.0.0.2:8080;
}
server {
  location /api/ {
    proxy_pass http://api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_next_upstream error timeout http_502;
  }
}
```

## 面试视角
- `proxy_pass` 末尾 `/` 的有无对路径的影响？
- 轮询/加权/least_conn/ip_hash 各自适用场景？
- `X-Forwarded-For` 的作用？不加会怎样？

# op-c2-s7 | 静态资源、缓存与压缩
> direction: 用 Nginx 直接高效服务静态文件，并减轻传输与回源压力。

## 心智模型
静态资源（图片/JS/CSS）是**不变的标准件**，最适合在 Nginx 这层"前置仓库"直接发货，不必每次都麻烦后端工厂。再加上**缓存**（浏览器短期自取）和**压缩**（发货前先瘦身），首屏速度和带宽成本同时下降。

## 核心知识点（锚定官方）
- **静态服务**：`root`/`alias` + `try_files`；`sendfile on;` 走内核零拷贝提升吞吐；`tcp_nopush on;` 凑齐包再发。
- **浏览器缓存**：`expires 30d;` 或 `Cache-Control: max-age=2592000`；带哈希指纹的资源可设 `immutable`。`ETag`/`Last-Modified` 配合 `If-None-Match` 返回 304。
- **压缩**：`gzip on; gzip_types text/css application/javascript ...;` 文本类压缩显著；`gzip_comp_level 5/6` 平衡 CPU；Brotli（`brotli on;`）压缩率更优（需模块）。
- **缓存击穿防护**：对回源加 `proxy_cache` 层，`proxy_cache_valid 200 10m;`，`keys_zone` 定义共享内存。
来源：Nginx ngx_http_gzip_module https://nginx.org/en/docs/http/ngx_http_gzip_module.html ；http_core/static https://nginx.org/en/docs/http/ngx_http_core_module.html

## 为什么重要
未压缩的文本资源白白多耗 3-5 倍带宽；缓存策略错会导致用户始终拉最新（慢）或永远用旧版（ bug 修不掉）。Nginx 层做对，后端压力与用户延迟双赢。

## 常见坑
- 对已经压缩的图片再开 gzip，反而浪费 CPU 且体积不减（gzip 只对文本有效）。
- `expires` 设给带哈希指纹文件却过短，没发挥长效缓存；或设给 HTML 过长，发版后用户看不到更新。
- `alias` 与 `location` 路径拼接错误，出现双重路径或越权读文件。
- 开了 `sendfile` 却在容器/网络文件系统上出现"改了文件浏览器仍旧"的缓存错觉（应配合正确缓存头）。

## 动手自测
```nginx
location ~* \.(js|css|png|jpg|svg)$ {
  expires 30d;
  add_header Cache-Control "public, immutable";
}
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_comp_level 6;
```

## 面试视角
- gzip 该对哪些资源开、哪些不该开？为什么？
- 带内容哈希指纹的资源如何设缓存？HTML 为何不同？
- `sendfile` 与零拷贝是什么，为什么能提速？

# op-c2-s8 | 限流、安全头与防盗链
> direction: 在入口处做防护：控流量、补安全头、防资源盗用。

## 心智模型
Nginx 入口像小区门禁：**限流**是限人流（防黄牛刷爆）、**安全响应头**是给每户贴防窃提醒、**防盗链**是阻止别人把你的水管接到自家院子里白用。三层防护在流量最前沿挡掉大部分低级攻击与滥用。

## 核心知识点（锚定官方）
- **限流（limit_req）**：`limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;` + `limit_req zone=one burst=20 nodelay;` 令牌桶限流，防突发与 CC。
- **连接限制（limit_conn）**：`limit_conn_zone $binary_remote_addr zone=addr:10m;` 限制单 IP 并发连接。
- **安全头**：`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Strict-Transport-Security`（HSTS）、`Content-Security-Policy`、`Referrer-Policy`。
- **防盗链（valid_referers）**：`location ~* \.(jpg|png)$ { valid_referers none blocked server_names *.example.com; if ($invalid_referer) { return 403; } }`。
- **隐藏版本**：`server_tokens off;` 不泄露 Nginx 版本，减小信息暴露。
来源：Nginx limit_req https://nginx.org/en/docs/http/ngx_http_limit_req_module.html ；security headers (OWASP) https://owasp.org/www-project-secure-headers/

## 为什么重要
不限流，一个爬虫/恶意脚本就能打满后端；不补安全头，浏览器侧 XSS/MIME 嗅探/点击劫持风险上升；不防盗链，带宽被别人白嫖。这些都在 Nginx 层零成本可挡。

## 常见坑
- `limit_req` 的 `burst` 设太大等于没限；`nodelay` 误用导致瞬时仍被打爆。
- HSTS 一旦开启且 `max-age` 很大，证书出问题后用户短期内无法绕过 HTTPS（应先用小 `max-age` 灰度）。
- `valid_referers` 用 `none` 放行空 Referer，可能放过部分盗链脚本。
- `if` 在 Nginx 里语义特殊（属 rewrite 模块），滥用 `if` 做条件易出非预期行为（尽量用 `map`/`allow`/`deny`）。

## 动手自测
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
server {
  limit_req zone=api burst=40 nodelay;
  server_tokens off;
  add_header X-Content-Type-Options nosniff always;
  add_header Strict-Transport-Security "max-age=31536000" always;
  location ~* \.(jpg|png|mp4)$ {
    valid_referers blocked server_names *.example.com;
    if ($invalid_referer) { return 403; }
  }
}
```

## 面试视角
- `limit_req` 令牌桶的 burst/nodelay 含义？
- HSTS 是什么，开启有哪些风险需注意？
- 防盗链原理？`valid_referers` 的 none/blocked 指什么？

# op-c2-s9 | 网络排障工具链
> direction: 当"连不上/慢/错"发生时，用工具逐层定位。

## 心智模型
排障像**医生问诊**，从外到内逐层排查：先确认物理/网络通不通（ping/traceroute），再看端口与连接（ss），然后看应用层对话（curl），最后抓包看字节级真相（tcpdump）。每一步排除一个假设，直到定位病灶。

## 核心知识点（锚定官方）
- **连通性**：`ping`（ICMP，注意有些环境禁 ICMP）、`traceroute`/`mtr` 看路径与哪一跳丢包。
- **端口与连接**：`ss -ltnp`（监听）、`ss -tanp`（TCP 连接状态）、`netstat`（老牌，逐渐被 ss 取代）。
- **应用层**：`curl -v`（看请求/响应全貌）、`curl -w` 看耗时各阶段（DNS/connect/TTFB）；`wget`。
- **DNS**：`dig`/`nslookup` 查记录与解析链。
- **抓包**：`tcpdump -i any -nn port 443 -w a.pcap` 抓包用 Wireshark 分析；`tcpdump` 现场过滤语法（`host`/`port`/`tcp flags`）。
- **TLS 细查**：`openssl s_client -connect host:443` 看证书与握手。
来源：man1 ss(8)/curl(1)/dig(1)/tcpdump(1)；iproute2 https://wiki.linuxfoundation.org/networking/iproute2

## 为什么重要
"服务挂了"往往是多层中的某一层：DNS 没解析、端口没监听、防火墙挡、TLS 证书错、后端 5xx。不分层排查就会乱试、误改、延长故障。

## 常见坑
- 只看 `ping` 通就判断网络没问题，忽略对方禁 ICMP 或应用层端口未开。
- `netstat` 在容器/新系统可能未安装，应优先 `ss`。
- 抓包没加 `-i any` 或抓错网卡，漏掉流量；大流量抓包不写文件会刷屏且丢包。
- `curl` 不带 `-v`/`--resolve` 直接怀疑后端，其实可能是本地 DNS 或 hosts 问题。

## 动手自测
```bash
ss -tanp | grep :443                 # 443 监听与连接
curl -w 'dns=%{time_namelookup} conn=%{time_connect} ttfb=%{time_starttransfer}\n' https://x
dig +trace example.com               # DNS 解析链
tcpdump -i any -nn 'host 1.2.3.4 and port 80' -c 50   # 抓指定主机流量
mtr -n 8.8.8.8                       # 持续路径质量
```

## 面试视角
- "网站打不开"的系统性排查步骤？
- `ss` 与 `netstat` 关系？`curl -w` 各耗时字段含义？
- 何时用 tcpdump，如何缩小抓包范围避免性能影响？
