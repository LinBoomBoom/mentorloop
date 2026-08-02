<!-- title: Node.js 基础与服务端 JS -->
<!-- goal: 掌握 Node.js 运行时模型、模块系统、核心 API（fs/http/stream）与 BFF/SSR 工程化能力，打通前端到服务端的全栈链路。 -->

# fe-c16-s1 | Node 运行时与事件循环
> 为什么 JS 能在服务端单进程扛高并发？答案是 libuv 事件循环，而非多线程。

## 心智模型
把 Node 想成**一个前台 + 一支后台外包队**：前台（单线程 JS）只负责接单和结账（执行同步代码），所有"等 IO"的活（读文件、查库、网络）都甩给后台外包（libuv 线程池 + 操作系统），干完了把结果放进"回执队列"，前台一有空就按序处理回执。所以 Node 单线程却"非阻塞"，擅长 IO 密集而非 CPU 密集。

## 核心知识点（锚定官方）
- **事件循环阶段（官方 docs/guides/event-loop-timers-and-nexttick）**：timers → pending callbacks → idle/prepare → poll → check → close callbacks；`setTimeout` 在 timers，`setImmediate` 在 check，`process.nextTick` 不在循环内、先于微任务前执行。
- **libuv**：Node 跨平台异步 IO 库，文件/子进程的某些操作走其线程池（默认 4 线程），网络 IO 多直接交给系统。
- **单线程 ≠ 单进程**：可用 `cluster` 或 `worker_threads` 利用多核。

## 为什么重要
前端工程化（Vite/Webpack/esbuild）全部跑在 Node 上；SSR（Next/Nuxt）与 BFF 直接依赖 Node 运行时。不懂事件循环，就无法解释"为什么这个接口慢""为什么 CPU 爆了其他请求全卡"。它是全栈与性能排查的地基。

## 常见坑
- 在事件循环里写**同步重计算**（大循环、大 JSON.parse）会阻塞整个进程，所有请求都超时——CPU 密集任务要丢给 worker_threads。
- `setTimeout(fn,0)` 不保证 0 毫秒，受 timers 阶段调度与早已排队的回执影响。
- 误以为"异步=多线程"，用全局变量当请求级状态，导致并发串号。

## 动手自测
1. 写脚本：先后 `setTimeout(0)`、`setImmediate()`、`Promise.resolve().then()`、`process.nextTick()`，观察打印顺序并解释原因。
2. 用 `worker_threads` 把一段斐波那契重算移出主线程，对比主线程是否被阻塞。

## 面试视角
"Node 是单线程还是多线程？事件循环各阶段？nextTick 和 Promise 微任务谁先？如何用多核？"——答清"单线程 JS + libuv 异步 + 事件循环阶段 + worker/cluster 扩展"即可。

# fe-c16-s2 | 模块系统：CommonJS 与 ESM
> 一份 JS 怎么被拆成多文件又被正确组装？两种模块体系必须分清。

## 心智模型
模块系统像**图书馆的借阅规则**：CommonJS 是"闭馆前一次性把所有借的书抱走并登记"（运行时同步加载、`require` 返回已完成对象）；ESM 是"先拿到借书清单、彼此引用、闭馆时按依赖图统一装订"（静态分析、编译期确定依赖、`import` 是引用绑定）。

## 核心知识点（锚定官方）
- **CommonJS（Node 官方 modules/cjs）**：`module.exports` / `exports` 导出，`require(id)` 同步加载并缓存；模块作用域隔离，文件即模块。
- **ES Modules（Node 官方 modules/esm）**：`export` / `import`，静态结构、`live binding`、默认严格模式；`.mjs` 或 `package.json` 的 `"type":"module"` 启用。
- **互操作**：ESM 可用 `import` 加载 CJS（默认导出为 `module.exports`）；CJS 不能 `require` ESM（需用动态 `import()`）。

## 为什么重要
现代前端构建链（Vite/Rollup）以 ESM 为基石，能做静态 tree-shaking；而大量 npm 包仍是 CJS。不清两套规则，会踩"cannot use import statement""default export 解构失败"等工程化坑。

## 常见坑
- 在 CJS 里 `require` 一个 ESM-only 包直接报错；解决用动态 `import()` 或换回 CJS 版。
- ESM 的 `import { a } from 'x'` 是 live binding，改源模块 `a` 会反映到导入方；CJS 的 `require` 拿到的是导出对象快照。
- 循环依赖：CJS 拿到未初始化完的对象、ESM 是临时绑定，行为不同。

## 动手自测
1. 建一个 `"type":"module"` 的包，写 ESM 互相 `import`，再写等价的 CJS `require`，对比循环依赖表现。
2. 用 Rollup 打包一个 ESM 项目，开启 tree-shaking，观察未使用导出是否被剔除。

## 面试视角
"CommonJS 和 ESM 区别？为什么 ESM 能 tree-shaking？CJS 能 import ESM 吗？"——讲清同步/静态、快照/live-binding、互操作限制。

# fe-c16-s3 | 流 Stream 与管道
> 大文件不能一次读进内存，流把数据切成小块边读边处理。

## 心智模型
流像**自来水管道**：数据是一滴一滴（chunk）流过来的，你不必等整池水蓄满才用，边流边接（处理）即可。管道 `pipe` 就是把"水源"和"出水口"接起来，中间还能串滤水器（transform）。

## 核心知识点（锚定官方）
- **四种流（Node streams 文档）**：Readable、Writable、Duplex、Transform。
- **背压（backpressure）**：消费慢于生产时，流内部缓冲上涨，`pipe` 会自动暂停源头，避免内存爆掉。
- **`pipe()`**：`readable.pipe(writable)` 自动管理流动与背压；`pipeline()` 更优（统一错误处理、清理）。

## 为什么重要
文件上传/下载、大日志处理、视频转码、代理转发都靠流。不用流而用 `fs.readFile` 读几百 MB 文件会直接 OOM。它是 Node 处理海量数据的核心抽象。

## 常见坑
- 忘记监听 `error` 事件，流出错进程崩溃（`pipeline` 会自动兜底）。
- 手动 `read()` 不处理背压，缓冲无限增长。
- Writable 的 `end()` 后还 `write()` 报错。

## 动手自测
1. 用 `fs.createReadStream` + `createGzip` + `createWriteStream` 通过 `pipeline` 压缩一个大文件，对比内存占用。
2. 写一个 Transform 流做逐行脱敏，串进管道。

## 面试视角
"什么是流？背压是什么？pipe 如何防止内存溢出？"——讲清四种流、背压自动暂停、暂停/流动模式。

# fe-c16-s4 | 文件系统 fs
> 服务端读文件、写日志、管理静态资源，都绕不开 fs。

## 心智模型
fs 是 Node 给 JS 开的**文件柜台**：同步窗口（`readFileSync`）排队等结果、异步窗口（`readFile`/promise 版）留个回执事后取。绝大多数场景该走异步窗口，别堵柜台。

## 核心知识点（锚定官方）
- **API 双形态**：回调式（`fs.readFile`）、Promise 式（`fs/promises`）、同步式（`fs.readFileSync`）。
- **`fs/promises`**：ESM 下推荐 `import { readFile } from 'node:fs/promises'`，配合 `await` 更清爽。
- **路径安全**：用 `node:path` 处理分隔符与 `path.join`，警惕 `../` 路径穿越；用 `node:fs` 的 `realpath` 校验。

## 为什么重要
SSR 读模板、BFF 代理上传、构建脚本读写产物，全都依赖 fs。用错同步 API 会阻塞事件循环；忽略路径穿越会造成安全漏洞。

## 常见坑
- 在请求处理函数里用 `readFileSync` 读大文件，阻塞整个进程。
- 拼接用户输入路径导致目录穿越（如 `/uploads/../../etc/passwd`）。
- 忘记 `await` promise 版 fs，拿到 Promise 当字符串用。

## 动手自测
1. 用 `fs/promises` 递归遍历目录并统计各扩展名文件大小。
2. 写一个安全的静态文件服务：用 `path.normalize` + 前缀校验防止穿越。

## 面试视角
"fs 同步和异步怎么选？如何防止路径穿越？大文件读取用什么？"——答异步优先、path 校验、流/分块。

# fe-c16-s5 | HTTP 与原生服务器
> 不靠框架也能起一个 HTTP 服务，理解它才懂框架在做什么。

## 心智模型
原生 `http.createServer` 像**一个手搓收发室**：每来一封信（请求）就调一次你的处理函数，你写回信（响应）。框架（Express/Koa/Fastify）只是在这间收发室外面套了分拣柜和模板。

## 核心知识点（锚定官方）
- **`http.createServer((req,res)=>{})`**：`req` 是 IncomingMessage（method/url/headers），`res` 是 ServerResponse（`writeHead`/`end`）。
- **`url` 解析**：用 `node:url` 的 `new URL(req.url, base)` 取 pathname/query，避免手写正则。
- **请求体**：`req` 是 Readable 流，需手动 `collect` 数据再 `JSON.parse`。

## 为什么重要
所有 Node Web 框架底层都是 `http` 模块；理解它能让你在框架"黑盒"出问题时定位到本质，也能在无框架场景（内网工具、健康检查端点）轻量起服务。

## 常见坑
- 忘记 `res.end()`，连接一直挂起。
- 直接 `JSON.parse(req)` 报错（req 是流不是字符串），要先收集 body。
- 每种 content-type 的响应都要设 `Content-Type`，否则浏览器乱解析。

## 动手自测
1. 用 `http` 模块写一个能处理 GET/POST、返回 JSON 的迷你 API（含路由分发）。
2. 在上面加一个 `/static` 前缀，用流把本地文件 pipe 出去。

## 面试视角
"Node 原生怎么起服务？请求体怎么读？为什么框架要用流？"——讲清 req/res 生命周期、流收集 body、框架只是封装。

# fe-c16-s6 | 进程、子进程与多核
> 单进程不够用？child_process 派活、worker_threads 算数、cluster 起多实例。

## 心智模型
Node 主进程像**店长**，活多了两种办法：雇临时工（`child_process` 跑独立 Node/外部程序，通信靠管道/IPC）、或店里开多个收银台（`cluster` 多进程共享端口）、或把重算交给店内 specialist（`worker_threads` 同进程多线程）。

## 核心知识点（锚定官方）
- **`child_process`**：`spawn`（流式、无缓冲上限）、`exec`（缓冲输出、有 shell 注入风险）、`fork`（专门跑 Node、走 IPC）。
- **`worker_threads`**：同进程多线程，共享 `ArrayBuffer`/`SharedArrayBuffer`，适合 CPU 密集。
- **`cluster`**：主进程 `fork` 多个 worker 共享同一 `listen` 端口，由内核负载均衡。

## 为什么重要
CPU 密集（压缩、加密、图像处理）会阻塞事件循环，必须搬出主线程。横向扩展（多核）靠 cluster/worker。这是 Node 性能与可伸缩性的关键手段。

## 常见坑
- 用 `exec` 拼接用户输入命令导致命令注入——优先 `spawn` 且不用 shell。
- 把大量数据通过 IPC 频繁传来传去，序列化开销反而更慢。
- cluster 下把内存状态存在进程变量，多 worker 间不共享（要外置 Redis/DB）。

## 动手自测
1. 用 `worker_threads` 把大数组排序移出主线程，主线程仍能响应。
2. 用 `cluster` 起 4 个 worker，压测观察是否利用了多核。

## 面试视角
"CPU 密集怎么处理？child_process 和 worker_threads 区别？cluster 如何共享端口？"——讲清阻塞问题、三种扩展方式适用场景。

# fe-c16-s7 | 错误处理与异常兜底
> 服务端最怕"未捕获异常直接崩进程"，要有兜底与熔断。

## 心智模型
错误处理像**餐厅的食品安全预案**：平时每道菜（每个 async 函数）自己把关（try/catch），后厨还有总闸（`uncaughtException`/`unhandledRejection`）兜底防止整店停业，但总闸只能用来"安全熄火并记录"，不是用来继续接客。

## 核心知识点（锚定官方）
- **`process.on('uncaughtException')` / `unhandledRejection`**：最后兜底，官方建议在此处记录日志并**优雅退出**重启，而非继续运行（状态可能已损坏）。
- **Promise 链**：`async/await` 配 `try/catch`；未 catch 的 reject 触发 `unhandledRejection`。
- **域/异步资源**：`AsyncLocalStorage` 做请求级上下文（如 traceId）。

## 为什么重要
线上服务任何未兜底异常都会让进程退出、连接中断。良好的错误边界 + 优雅重启（配合 PM2/K8s）才能"单点故障不影响整体"。

## 常见坑
- 在 `uncaughtException` 里继续处理请求，状态已不一致导致更诡异 bug。
- 吞掉错误（空 catch）让问题隐形。
- 用 `throw` 在回调里但外层无 catch，变成 unhandledRejection。

## 动手自测
1. 故意在定时器里 throw，观察 `uncaughtException` 触发；在 `unhandledRejection` 里做优雅退出。
2. 用 `AsyncLocalStorage` 把请求 traceId 注入日志。

## 面试视角
"未捕获异常怎么办？unhandledRejection 和 uncaughtException 区别？为什么不能吞错？"——讲清兜底只做优雅退出、错误边界设计。

# fe-c16-s8 | BFF 与 SSR 运行时
> 前端工程化的两种经典服务端用法：BFF 聚合接口、SSR 直出 HTML。

## 心智模型
- **BFF（Backend For Frontend）**：像**前端的专属秘书**，把后端十几个零散接口聚合成前端要的一两个，顺手做裁剪、鉴权、字段映射，前端只跟秘书打交道。
- **SSR（服务端渲染）**：像**饭店先摆好半成品菜再上桌**，首屏 HTML 在服务端生成，用户秒看内容、爬虫直接抓到，再在浏览器"注水"激活交互。

## 核心知识点（锚定官方）
- **BFF 模式**：通常基于 Node（Express/Fastify/Nest）做 API 网关层，聚合下游服务（GraphQL/REST）。
- **SSR 与 hydration**：框架（Next/Nuxt，本项目即 Nuxt）在服务端跑组件渲染出 HTML，客户端再 hydrate 绑定事件。
- **流式 SSR**：`renderToPipeableStream`（React）用流边渲染边发给浏览器，提升 TTFB。

## 为什么重要
Nuxt 本身就是 SSR 框架——本项目后端正是如此。BFF 能显著降低前端复杂度与请求数；SSR 改善首屏与 SEO。理解运行时模型才能排查"水合不匹配""首屏慢"等问题。

## 常见坑
- SSR 里访问 `window`/`document`（仅浏览器存在）直接报错——要用 `onMounted`/生命周期隔离。
- BFF 不做缓存/限流，被前端 N 次调用打爆下游。
- hydration 时服务端/客户端渲染不一致（如随机值、时间）导致 React 水合警告。

## 动手自测
1. 用 Nuxt 写一个 SSR 页面，故意在 `setup` 顶层读 `window`，观察报错并移到 `onMounted` 修复。
2. 写一个 BFF 接口，聚合两个下游 REST 并裁剪字段返回。

## 面试视角
"BFF 解决什么问题？SSR 和 CSR 区别？hydration 是什么？为什么 SSR 不能碰 window？"——讲清聚合/首屏SEO、水合、生命周期隔离。

# fe-c16-s9 | 包管理与依赖治理
> package.json、语义化版本、lockfile——可复现构建的基石。

## 心智模型
`package.json` 是**项目的食材清单**：`dependencies` 是上桌的菜、`devDependencies` 是后厨工具；版本号（semver）标"能接受哪种更新"；`lockfile` 是**精确到克的采购单**，保证 everyone 装到完全一致的版本。

## 核心知识点（锚定官方）
- **SemVer（semver.org）**：`主.次.补`；`^1.2.3` 允许次/补更新、`~1.2.3` 仅补丁、`1.2.3` 锁定。
- **lockfile**：`package-lock.json`（npm）/ `pnpm-lock.yaml` / `yarn.lock` 锁定依赖树，保证可复现。
- **`npm ci` vs `npm install`**：CI 用 `ci` 严格按 lockfile 装、更快更稳。

## 为什么重要
依赖漂移是"在我机器上是好的"头号元凶；理解 semver 与 lockfile 才能安全升级、快速排障、防供应链投毒（锁定 + 审计 `npm audit`）。

## 常见坑
- 提交代码却忘了提交 lockfile，导致环境不一致。
- 盲目 `npm update` 大版本跳变引入 breaking change。
- 把仅构建期用的包放进 `dependencies`，增大产物体积。

## 动手自测
1. 对比 `npm install lodash@^4` 与 lockfile 锁定后 `npm ci` 的产物一致性。
2. 用 `npm audit` 查一个依赖的已知漏洞并升级修复。

## 面试视角
"semver 各符号含义？lockfile 作用？npm ci 和 install 区别？"——讲清版本范围、可复现构建、CI 最佳实践。
