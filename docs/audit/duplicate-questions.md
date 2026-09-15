# 语义重复题检测

> 阈值：bigram Jaccard ≥ 0.72，或（实体词重合 ≥0.8 且 Jaccard ≥0.5，用于抓同义替换）。跨赛道按 tech 分桶。 比较 2686892 次


- 重复组：**188**
- 可去重题数：**197**（占题库 1.18%）
- 题库总量：16650


## 重复组明细（按组内题数降序）


### tech:JavaScript · 4 条
- `xq-f-571` (a=604字, easy) 以下代码的输出顺序是什么？请逐步分析事件循环的执行过程。
```js
console.log('1');
setTimeout(() => 
- `xq-f-783` (a=621字, easy) 请写出以下代码的输出顺序，并逐步解释事件循环的调度过程：
```js
console.log('A');
setTimeout(() => 
- `xq-f-791` (a=615字, easy) 请分析以下代码的输出顺序，并解释每一步的事件循环行为：
```js
console.log('A');
setTimeout(() => c
- `xq-f-1095` (a=821字, easy) 请预测以下代码的输出顺序，并解释每一步的事件循环机制：
```js
console.log('A');
setTimeout(() => c

### tech:CSS · 3 条
- `xq-f-199` (a=635字, easy) `<meta name="viewport" content="width=device-width, initial-scale=1">`
- `xq-f-200` (a=904字, easy) `<meta name="viewport" content="width=device-width, initial-scale=1">`
- `xq-mb-c1-s3-2` (a=716字, easy) `<meta name="viewport">`标签中，`width=device-width`和`initial-scale=1`分别控制

### tech:CSS · 3 条
- `xq-f-484` (a=764字, easy) 什么是 BFC（Block Formatting Context）？请列举至少 5 种触发方式，并说明它解决了哪些经典布局问题。
- `xq-f-485` (a=977字, easy) 什么是 BFC（Block Formatting Context）？请列出至少五种触发 BFC 的方式，并说明 BFC 能解决哪些布局问题。
- `xq-f-486` (a=719字, easy) 什么是 BFC（Block Formatting Context，块级格式化上下文）？请列出所有触发 BFC 的方式，并解释 BFC 解决了

### tech:JavaScript · 3 条
- `xq-f-305` (a=833字, easy) `process.nextTick` 与 `Promise.then` 在 Node.js 中的执行顺序有何不同？为什么？
- `xq-f-306` (a=783字, easy) `process.nextTick` 与 `Promise.then` 都是微任务，它们在 Node.js 中的执行顺序有何不同？请给出代码
- `rq-f-fe-node-junior-0-2` (a=1111字, medium) 请详细描述 Node.js 事件循环的六个阶段，并说明 `process.nextTick()` 与 `Promise.then()` 在事

### tech:网络 · 3 条
- `xq-b-1065` (a=704字, easy) 请完整描述从用户在浏览器输入 www.example.com 到拿到 IP 地址的整个 DNS 解析过程，并说明每一层缓存的作用。
- `xq-b-1066` (a=906字, easy) 请完整描述从用户在浏览器输入"www.example.com"到获得 IP 地址的整个 DNS 解析过程，并说明每一步涉及哪些组件和缓存。
- `xq-o-564` (a=937字, easy) 请完整描述从浏览器输入 www.example.com 到获取 IP 地址的整个 DNS 解析流程，并说明每一步的缓存层级。

### tech:性能优化 · 3 条
- `xq-f-535` (a=845字, medium) 什么是强制同步布局（Forced Synchronous Layout / Layout Thrashing）？请给出一个典型场景并说明如何
- `xq-f-536` (a=1036字, medium) 什么是强制同步布局（Forced Synchronous Layout）和布局抖动（Layout Thrashing）？请用代码示例说明其危
- `xq-f-538` (a=968字, medium) 什么是强制同步布局（forced synchronous layout / layout thrashing）？请用代码示例说明其危害与解决

### tech:Java · 3 条
- `xq-b-273` (a=775字, easy) Spring AOP 的底层代理机制是什么？JDK 动态代理和 CGLIB 代理有什么区别？在什么情况下 Spring 会选择哪种代理方式？
- `xq-b-274` (a=798字, easy) Spring AOP 的底层代理机制是什么？JDK 动态代理和 CGLIB 代理的区别与选择逻辑是什么？
- `xq-bw-c4-s3-3` (a=773字, medium) Spring AOP 的代理机制是怎样的？JDK 动态代理和 CGLIB 分别在什么情况下使用？

### tech:Kubernetes · 3 条
- `xq-o-16` (a=634字, easy) ConfigMap 和 Secret 在 Kubernetes 中的核心区别是什么？为什么 Secret 的 base64 编码不是加密？
- `xq-o-17` (a=582字, easy) ConfigMap 和 Secret 在 Kubernetes 中的核心设计理念是什么？为什么说"镜像应该是无味的可执行"？
- `xq-k82-c6-s4-2` (a=862字, medium) ConfigMap 和 Secret 在结构上几乎一样，为什么 Kubernetes 还要分成两个对象？Secret 的 Base64 编码

### tech:CSS · 2 条
- `xq-f-274` (a=889字, easy) `justify-content`、`align-items`、`align-content` 三者有什么区别？请分别说明它们控制哪个轴、在
- `xq-f-275` (a=1059字, easy) `justify-content`、`align-items`、`align-content` 三者有何区别？请分别说明它们控制哪个轴、在什

### tech:CSS · 2 条
- `xq-f-674` (a=643字, easy) 媒体查询的断点（breakpoint）应该如何确定？为什么不建议按设备型号（如 iPhone 375px）硬编码？
- `xq-f-675` (a=480字, easy) 媒体查询的断点（breakpoint）应该怎么定？为什么不建议按设备型号（如 iPhone 375px）硬编码？

### tech:CSS · 2 条
- `xq-f-739` (a=858字, easy) 渐进增强（Progressive Enhancement）与优雅降级（Graceful Degradation）的核心区别是什么？为什么在现
- `xq-f-1027` (a=545字, easy) 请解释渐进增强（Progressive Enhancement）与优雅降级（Graceful Degradation）的核心区别，并说明为什

### tech:CSS · 2 条
- `xq-f-768` (a=1024字, easy) 表单控件的"可访问名称"（Accessible Name）有哪几种提供方式？它们的优先级顺序是什么？请结合代码说明。
- `xq-f-769` (a=1200字, easy) 表单控件的可访问名称（Accessible Name）有哪几种提供方式？它们的优先级顺序是什么？请举例说明。

### tech:CSS · 2 条
- `xq-f-828` (a=825字, easy) 请对比 Flexbox 与 CSS Grid 的适用场景。为什么说"一维排布用 Flex，二维布局用 Grid"？请给出一个用 Flex 实
- `xq-f-829` (a=769字, easy) 请对比 Flexbox 与 Grid 的适用场景。为什么说"一维用 Flex，二维用 Grid"？请给出一个选型错误的具体案例。

### tech:CSS · 2 条
- `xq-f-933` (a=817字, medium) 请解释 CSS Grid 中 `fr` 单位的工作原理，它与 `%` 或 `auto` 在轨道尺寸分配上有何本质区别？
- `xq-f-934` (a=741字, medium) 请解释 CSS Grid 中 `fr` 单位的工作原理，它和百分比、`auto` 在轨道尺寸分配上有何本质区别？

### tech:CSS · 2 条
- `xq-cs-c2-s5-4` (a=737字, easy) `repeat(auto-fit, minmax(200px, 1fr))` 为什么能实现无媒体查询的响应式布局？请解释其计算过程。
- `xq-mb-c4-s2-1` (a=681字, easy) 请解释 `repeat(auto-fill, minmax(200px, 1fr))` 中每个部分的含义，以及为什么这一行代码能实现"无需媒

### tech:CSS · 2 条
- `xq-cs-c2-s3-3` (a=780字, medium) `repeat(auto-fill, minmax(200px, 1fr))` 和 `repeat(auto-fit, minmax(200
- `xq-cs-c3-s4-3` (a=769字, medium) `repeat(auto-fill, minmax(250px, 1fr))` 和 `repeat(auto-fit, minmax(250

### tech:JavaScript · 2 条
- `xq-f-43` (a=816字, easy) JS 是单线程的，为什么还能处理异步？请从事件循环机制角度完整解释。
- `xq-f-44` (a=623字, easy) JS 是单线程的，为什么还能处理异步？请从事件循环机制角度解释。

### tech:JavaScript · 2 条
- `xq-f-84` (a=877字, easy) Promise 有哪几种状态？状态之间如何流转？settled 之后还能改变吗？请结合代码说明。
- `xq-f-85` (a=932字, easy) Promise 有哪几种状态？状态之间是如何流转的？settled 之后还能改变吗？请结合代码说明。

### tech:JavaScript · 2 条
- `xq-f-227` (a=989字, easy) `async/await` 的本质是什么？为什么说它是 Promise 的语法糖？它解决了什么问题？
- `xq-f-343` (a=841字, easy) async/await 是什么？它和 Promise 的本质关系是什么？为什么说它是"语法糖"？

### tech:JavaScript · 2 条
- `xq-f-253` (a=1278字, easy) `event.target` 与 `event.currentTarget` 有什么区别？在事件委托中为什么必须用 `closest()` 
- `xq-f-1062` (a=787字, easy) 请详细解释 `event.target` 与 `event.currentTarget` 的区别，并说明在事件委托中为什么必须用 `clos

### tech:JavaScript · 2 条
- `xq-f-271` (a=825字, easy) `instanceof` 的原理是什么？请实现一个 `_instanceof` 函数，并说明 `Object.create(null)` 的
- `xq-f-272` (a=1015字, easy) `instanceof` 的原理是什么？请手写一个 `_instanceof(obj, F)` 函数，并说明 `Object.create(

### tech:JavaScript · 2 条
- `xq-f-371` (a=1160字, easy) querySelectorAll 返回的 NodeList 和 getElementsByClassName 返回的 HTMLCollect
- `xq-f-372` (a=1044字, easy) querySelectorAll 返回的 NodeList 和 getElementsByClassName 返回的 HTMLCollect

### tech:JavaScript · 2 条
- `xq-f-426` (a=989字, easy) 为什么 `const opts = { method: "GET" }` 中 `opts.method` 会被推断为 `string` 而不
- `xq-f-427` (a=862字, easy) 为什么 `const opts = { url: "/api", method: "GET" }` 中 `method` 被推断为 `str

### tech:JavaScript · 2 条
- `xq-f-807` (a=876字, easy) 请完整解释 JavaScript 中的变量提升（Hoisting）机制，并对比 var、let、const、函数声明、函数表达式在提升时的具
- `xq-f-1054` (a=789字, medium) 请详细解释 JavaScript 中变量提升（Hoisting）的完整机制，并对比 var、let、const 三种声明方式在提升过程中的具

### tech:JavaScript · 2 条
- `xq-f-858` (a=882字, easy) 请对比 `setTimeout(fn, 0)`、`Promise.resolve().then(fn)`、`queueMicrotask(f
- `xq-f-859` (a=1043字, easy) 请对比 `setTimeout(fn, 0)`、`Promise.resolve().then(fn)`、`queueMicrotask(f

### tech:JavaScript · 2 条
- `xq-f-892` (a=1097字, medium) 请手写实现 `Function.prototype.bind`，要求支持：返回新函数、调用时可传参（柯里化）、被 `new` 调用时忽略绑定
- `xq-f-893` (a=1147字, easy) 请手写实现 `Function.prototype.bind`，要求支持：返回新函数、预设参数（柯里化）、以及被 `new` 调用时忽略绑定

### tech:网络 · 2 条
- `xq-f-210` (a=708字, easy) `Cache-Control`中的`no-cache`和`no-store`有什么区别？请结合具体场景说明各自适用场景。
- `xq-pf-c5-s1-1` (a=546字, easy) 请解释 `Cache-Control: no-cache` 和 `no-store` 的区别，并说明各自适合什么场景。

### tech:网络 · 2 条
- `xq-f-345` (a=1167字, easy) fetch 在什么情况下会 reject？HTTP 404 或 500 会触发 reject 吗？请详细说明 fetch 的 Promise
- `xq-f-346` (a=1201字, easy) fetch 在什么情况下会 reject？HTTP 404/500 会触发 reject 吗？请结合 Promise 机制说明。

### tech:网络 · 2 条
- `xq-b-251` (a=793字, easy) SIGTERM 和 SIGKILL 有什么区别？为什么说"优雅停机"依赖 SIGTERM 而不是 SIGKILL？
- `xq-b-252` (a=673字, easy) SIGTERM 和 SIGKILL 有什么区别？为什么说"优雅停机"依赖 SIGTERM 而非 SIGKILL？

### tech:网络 · 2 条
- `xq-b-473` (a=744字, easy) 为什么 DNS 查询默认使用 UDP 而不是 TCP？什么情况下 DNS 会回退到 TCP？
- `xq-b-44` (a=765字, hard) DNS 查询为什么默认使用 UDP 而不是 TCP？什么情况下 DNS 会切换到 TCP？请从协议设计角度分析。

### tech:网络 · 2 条
- `xq-b-490` (a=656字, easy) 为什么 TCP 建立连接需要三次握手而不是两次？如果只有两次握手会发生什么？
- `xq-o-281` (a=614字, easy) 为什么TCP建立连接需要三次握手而不是两次？如果只有两次握手会带来什么问题？

### tech:网络 · 2 条
- `xq-o-2` (a=1456字, medium) 502 Bad Gateway 与 504 Gateway Timeout 的根本差异是什么？请从 Nginx 作为反向代理的角度，给出两者
- `xq-o-573` (a=915字, medium) 请对比 502 Bad Gateway 与 504 Gateway Timeout 的根本差异，并给出从 Nginx 视角的完整排查思路。

### tech:网络 · 2 条
- `xq-o-92` (a=1094字, easy) Nginx 中 `root` 和 `alias` 指令的区别是什么？在配置静态资源服务时如何选择？请举例说明。
- `xq-o-94` (a=1017字, easy) Nginx 中 root 和 alias 指令有什么区别？在配置静态资源服务时如何选择？请给出典型配置示例并说明常见的路径拼接错误。

### tech:网络 · 2 条
- `xq-o-192` (a=1158字, easy) `curl -w` 中的 `time_namelookup`、`time_connect`、`time_appconnect`、`time_
- `xq-o-193` (a=897字, easy) `curl -w` 中的 `time_namelookup`、`time_connect`、`time_starttransfer`、`ti

### tech:性能优化 · 2 条
- `fq14` (a=1546字, easy) requestAnimationFrame 与 setTimeout 做动画的区别
- `fq31` (a=1878字, easy) requestAnimationFrame 与 setTimeout 的区别

### tech:性能优化 · 2 条
- `xq-f-243` (a=620字, medium) `content-visibility: auto` 是如何跳过离屏渲染的？为什么必须搭配 `contain-intrinsic-size`
- `xq-f-344` (a=1047字, medium) content-visibility: auto 是如何跳过离屏渲染的？为什么需要配合 contain-intrinsic-size 使用？

### tech:性能优化 · 2 条
- `xq-f-269` (a=743字, easy) `insertAdjacentHTML` 和 `innerHTML` 在插入 HTML 时有什么本质区别？为什么说前者在某些场景下更高效？
- `xq-f-270` (a=845字, easy) `insertAdjacentHTML` 和 `innerHTML` 在插入内容时有什么本质区别？为什么说 `insertAdjacentH

### tech:性能优化 · 2 条
- `xq-f-379` (a=774字, medium) setTimeout、setInterval 和 requestAnimationFrame 三者在实现动画时的本质区别是什么？为什么说 s
- `rq-f-fe-viz-4-1` (a=915字, easy) 请解释 requestAnimationFrame 的核心机制，以及它与 setTimeout/setInterval 驱动动画的本质区别是

### tech:性能优化 · 2 条
- `xq-f-441` (a=682字, medium) 为什么减少启动时的 JavaScript 体积能直接改善 INP（Interaction to Next Paint）指标？请从浏览器主线程
- `xq-f-442` (a=678字, medium) 为什么减少启动期 JavaScript 体积能直接改善 INP（Interaction to Next Paint）指标？请从浏览器主线程调

### tech:性能优化 · 2 条
- `xq-f-454` (a=947字, easy) 为什么用 `left/top` 做位移动画会卡顿，而 `transform` 不会？请从浏览器渲染管线的角度解释，并说明哪些属性适合做动画。
- `xq-f-456` (a=760字, medium) 为什么用 transform 做位移动画比用 left/top 更流畅？请从浏览器渲染管线的角度解释。

### tech:性能优化 · 2 条
- `xq-f-542` (a=924字, medium) 什么是性能预算（Performance Budget）？如何将其落地到 CI/CD 流程中，实现"超标即报警"？
- `xq-f-543` (a=1025字, medium) 什么是性能预算（Performance Budget）？如何将性能预算落地到 CI 流程中实现自动化拦截？

### tech:性能优化 · 2 条
- `xq-f-698` (a=828字, easy) 对比 scrollTo、scrollBy 和 scrollIntoView 三个滚动 API 的区别，并说明各自适用的业务场景。
- `xq-f-868` (a=831字, easy) 请对比 scrollTo、scrollBy、scrollIntoView 三种滚动控制方法的区别，并说明各自适用场景。

### tech:性能优化 · 2 条
- `xq-f-775` (a=935字, easy) 请从容量、生命周期、作用域、是否随请求发送、读写方式五个维度，对比 localStorage、sessionStorage 和 Cookie
- `xq-f-1050` (a=680字, easy) 请详细对比 localStorage、sessionStorage 和 Cookie 三者的区别，并说明各自最典型的使用场景。

### tech:性能优化 · 2 条
- `xq-f-787` (a=1382字, easy) 请分别列举 LCP、INP、CLS 各两个核心优化手段，并说明其背后的原理。
- `xq-f-789` (a=1156字, medium) 请分别针对 LCP、INP、CLS 各举两个优化手段，并说明每个手段背后的原理依据。

### tech:性能优化 · 2 条
- `xq-f-944` (a=950字, medium) 请解释 Field Data（现场数据）与 Lab Data（实验室数据）的本质区别，为什么说"lab 不能替代 field"？
- `xq-f-945` (a=869字, medium) 请解释 Field Data（真实用户监控数据）与 Lab Data（实验室数据）的本质区别，以及为什么说 "lab 不能替代 field"

### tech:性能优化 · 2 条
- `xq-f-973` (a=761字, easy) 请解释 `<meta charset="utf-8">` 的作用，以及为什么它必须放在 `<head>` 的最前面？如果遗漏会发生什么？
- `xq-f-974` (a=608字, easy) 请解释 `<meta charset="utf-8">` 的作用，并说明为什么它必须放在 `<head>` 的最前面？如果漏写或放错位置会发

### tech:性能优化 · 2 条
- `xq-f-1030` (a=870字, medium) 请解释重排（Reflow/Layout）、重绘（Repaint）与合成（Composite）三者的本质区别，并说明为什么性能优化的方向是"能
- `xq-f-1031` (a=600字, medium) 请解释重排（Reflow/Layout）、重绘（Repaint）与合成（Composite）三者的本质区别，并说明为什么说"Layout i

### tech:性能优化 · 2 条
- `xq-f-1065` (a=612字, easy) 请详细解释 clientWidth、offsetWidth、scrollWidth 三者的区别，并分别给出一个典型的使用场景。
- `xq-f-1066` (a=665字, easy) 请详细解释 clientWidth、offsetWidth、scrollWidth 三者的区别，并说明各自的实际应用场景。

### tech:性能优化 · 2 条
- `xq-cs-c7-s1-7` (a=723字, hard) `will-change` 和 `transform: translateZ(0)` 都能提升合成层，它们的区别是什么？使用时要避免哪些坑？
- `xq-pf-c2-s4-7` (a=812字, medium) `will-change` 和 `transform: translateZ(0)` 都能提升合成层，二者有何区别？应该优先用哪个？

### tech:性能优化 · 2 条
- `xq-pf-c6-s1-1` (a=836字, easy) 什么是长任务（Long Task）？为什么阈值是 50ms 而不是 100ms 或 16ms？长任务会带来哪些具体影响？
- `xq-pf-c7-s4-2` (a=886字, medium) 什么是长任务（Long Task）？为什么阈值是 50ms 而不是 100ms？如何用代码检测长任务并上报？

### tech:React · 2 条
- `xq-f-87` (a=1172字, easy) React Router 的 `useFetcher` 与 `loader` 有何区别？在什么场景下必须使用 `useFetcher`？
- `xq-f-88` (a=1105字, medium) React Router 的 `useFetcher` 与传统的 `useNavigate` + `loader` 在数据交互上有什么本质区

### tech:React · 2 条
- `xq-f-91` (a=698字, medium) React Router 的三种模式（Declarative、Data、Framework）分别是什么？它们之间的核心区别是什么？
- `xq-f-92` (a=1103字, medium) React Router 的三种模式（Declarative、Data、Framework）分别是什么？它们之间的核心区别是什么？为什么说功

### tech:React · 2 条
- `xq-f-109` (a=1183字, medium) Redux 与 React 的 Context + useReducer 都可以管理全局状态，它们的核心区别是什么？在什么场景下应该选择 R
- `xq-f-113` (a=1121字, easy) Redux 和 React 的 Context + useReducer 都能管理状态，它们的核心区别是什么？什么场景下应该选 Contex

### tech:React · 2 条
- `xq-f-413` (a=733字, medium) 为什么 JSX 中 `class` 要写成 `className`，而 `aria-*` 和 `data-*` 却保留连字符？请从编译机制角
- `xq-f-425` (a=769字, easy) 为什么 `class` 要写成 `className`？`aria-*` 和 `data-*` 为什么可以保留连字符？请从 JSX 属性机制

### tech:工程化 · 2 条
- `fq35` (a=1430字, medium) Tree Shaking 的原理与前提
- `fq10` (a=1824字, medium) 说说 Tree Shaking 的原理与前提条件

### tech:工程化 · 2 条
- `xq-f-745` (a=545字, medium) 状态管理的本质是什么？为什么说"装个库"不等于做了状态管理？
- `xq-f-746` (a=623字, hard) 状态管理的本质是什么？为什么说"装个库"不等于状态管理？

### tech:工程化 · 2 条
- `xq-f-995` (a=1121字, easy) 请解释 `package.json`、`package-lock.json` 和 `node_modules` 三者在依赖管理中的角色与关系
- `xq-f-1003` (a=809字, easy) 请解释 package.json、package-lock.json 和 node_modules 三者的关系，以及为什么 CI 环境应该使

### tech:工程化 · 2 条
- `rq-f-fe-web-5-4` (a=656字, medium) 什么是“幽灵依赖”（Phantom Dependency）？它是如何产生的？pnpm 如何解决这个问题？
- `xq-f-507` (a=891字, hard) 什么是"幽灵依赖"（Phantom Dependency）？它是如何产生的？npm 的依赖提升（hoisting）机制与它有什么关系？pnp

### tech:工程化 · 2 条
- `rq-f-fe-arch-3-2` (a=756字, easy) `package.json` 中 `dependencies`、`devDependencies`、`peerDependencies` 三
- `xq-nd-c1-s1-4` (a=739字, easy) npm 是什么？它和 Node.js 是什么关系？请说明 `package.json` 中 `dependencies`、`devDepen

### tech:TypeScript · 2 条
- `xq-f-522` (a=665字, medium) 什么是分发式条件类型（Distributive Conditional Types）？为什么 `ToArray<string | numbe
- `xq-f-521` (a=820字, hard) 什么是分发式条件类型（Distributive Conditional Types）？为什么 `ToArray<string | numbe

### tech:TypeScript · 2 条
- `xq-f-726` (a=761字, easy) 条件类型 `T extends U ? X : Y` 的判定依据是什么？为什么在 true 分支中 TS 能对泛型进行收窄？请举例说明。
- `xq-f-727` (a=771字, medium) 条件类型 `T extends U ? X : Y` 的执行机制是什么？为什么说在 true 分支中 TS 会把泛型进一步收窄？请举例说明。

### tech:Vue · 2 条
- `xq-f-73` (a=987字, easy) Pinia 中为什么直接解构 store 会丢失响应式？`storeToRefs` 是如何解决这个问题的？
- `xq-vu-c6-s1-3` (a=982字, medium) 为什么直接解构 store 会丢失响应性？`storeToRefs` 是如何解决这个问题的？

### tech:Vue · 2 条
- `xq-f-157` (a=960字, medium) Vue 3 的 Proxy 响应式相比 Vue 2 的 Object.defineProperty 解决了哪些核心问题？请从原理层面展开说明
- `xq-f-158` (a=979字, medium) Vue 3 的 Proxy 响应式相比 Vue 2 的 Object.defineProperty 解决了哪些核心问题？请从实现机制、边界场

### tech:Vue · 2 条
- `xq-f-161` (a=894字, medium) Vue 3 的三大编译期优化（Cache Static、Patch Flags、Tree Flattening）分别解决了什么问题？它们如何
- `xq-f-1061` (a=792字, medium) 请详细解释 Vue 的三大编译期优化（Cache Static、Patch Flags、Tree Flattening）分别解决了什么问题？

### tech:Vue · 2 条
- `xq-f-166` (a=845字, medium) Vue 3.4+ 的 Computed 稳定性优化是什么？它解决了什么问题？与 Vue 3.0-3.3 的 computed 行为有何不同？
- `xq-f-167` (a=893字, medium) Vue 3.4+ 的 Computed 稳定性优化是什么？它解决了什么问题？与 Vue 3.4 之前的 computed 行为有何不同？

### tech:Vue · 2 条
- `xq-f-171` (a=950字, easy) Vue Router 中，从 `/users/johnny` 导航到 `/users/jolyne`，组件实例会被复用，哪些生命周期钩子不会
- `xq-f-172` (a=892字, easy) Vue Router 中，从 `/users/johnny` 导航到 `/users/jolyne`，组件实例会被复用，此时哪些生命周期钩子

### tech:Vue · 2 条
- `xq-f-204` (a=997字, medium) `<script setup>` 相比普通 `<script>` + setup() 有哪些编译时优化？defineProps/define
- `xq-f-205` (a=970字, medium) `<script setup>` 相比普通 `setup()` 函数有哪些编译时优化？`defineProps`、`defineEmits`

### tech:安全 · 2 条
- `xq-f-750` (a=817字, hard) 登录态 token 应该放在 Cookie（HttpOnly）还是 localStorage？请从 XSS 和 CSRF 两个攻击面做权衡分
- `xq-f-1107` (a=1051字, hard) 面试官常问："token 放 Cookie(HttpOnly) 还是 localStorage？"请从 XSS 和 CSRF 两个攻击向度展

### tech:安全 · 2 条
- `xq-sc-c4-s1-4` (a=905字, medium) 什么是会话固定攻击（Session Fixation）？服务端应如何在登录流程中防御？
- `xq-nd-c9-s2-5` (a=726字, medium) 什么是会话固定攻击（Session Fixation）？登录流程中应如何防御？

### tech:Web 基础 · 2 条
- `xq-f-490` (a=1152字, easy) 什么是 JSON-LD 结构化数据？请为"一篇技术博客文章"编写 JSON-LD 代码，并说明它如何帮助搜索引擎生成富结果（Rich Res
- `xq-f-491` (a=1366字, easy) 什么是 JSON-LD 结构化数据？请以"文章"（Article）类型为例，写出一个完整的 JSON-LD 示例，并说明它如何帮助搜索引擎生

### tech:测试 · 2 条
- `xq-f-1092` (a=833字, medium) 请辨析"端到端测试"、"UI 测试"、"面向用户的测试"三者的区别。为什么说"富前端 UI 行为大部分可用 JS 单元/组件测试覆盖"？
- `xq-f-1093` (a=1039字, medium) 请辨析"端到端测试"、"UI 测试"和"面向用户的测试"三者的区别，并说明为什么富前端 UI 行为大部分可以用 JS 单元/组件测试覆盖？

### tech:综合应用 · 2 条
- `xq-b-464` (a=698字, easy) 一次「下单接口变慢」的投诉进来，你如何用 Trace + Metric + Log 三步定位到具体慢服务？请给出完整排查流程。
- `xq-b-465` (a=754字, medium) 一次「下单接口变慢」的投诉进来，你如何用 Trace + Metric + Log 三步定位到具体慢服务？请给出完整的排查思路。

### tech:综合应用 · 2 条
- `xq-a-33` (a=691字, medium) OWASP LLM Top 10 中 LLM01（提示注入）与 LLM02（敏感信息泄露）常常相互触发，请分析两者的关联机制，并给出一个同时
- `xq-a-34` (a=663字, medium) OWASP LLM Top 10 中，LLM01（提示注入）与 LLM02（敏感信息泄露）常被同时提及。请分析二者在攻击链上的关联，并给出一

### tech:Flutter · 2 条
- `xq-xp-c1f-s2-4` (a=879字, medium) Flutter 的 Hot Reload 与 Hot Restart 在底层实现上有何本质区别？为什么 Hot Reload 无法应用 `m
- `xq-xp-c1f-s3-1` (a=967字, medium) Flutter 的 Hot Reload 和 Hot Restart 在实现机制上有何本质区别？为什么 Hot Reload 不能修改 `m

### tech:微服务 · 2 条
- `xq-bw-c5-s4-4` (a=848字, medium) 客户端负载均衡和服务端负载均衡有什么区别？Spring Cloud LoadBalancer 是如何工作的？
- `xq-bm-c3-s1-3` (a=875字, easy) 服务端负载均衡与客户端负载均衡有什么区别？Spring Cloud LoadBalancer 属于哪一种，工作流程是什么？

### tech:微服务 · 2 条
- `xq-bw-c8-s1-6` (a=1132字, medium) Spring Cloud Gateway 中 GatewayFilter 与 GlobalFilter 有什么区别？如何自定义一个全局过滤器
- `xq-bm-c4-s2-2` (a=1162字, easy) Spring Cloud Gateway 中 GatewayFilter 与 GlobalFilter 有什么区别？分别在什么场景下使用？请

### tech:数据库原理 · 2 条
- `xq-dbs-c1-s3-3` (a=843字, medium) 为什么金融场景金额字段必须用 `DECIMAL` 而不是 `FLOAT`/`DOUBLE`？请从二进制浮点表示原理说明。
- `xq-dbs-c10-s1-2` (a=650字, easy) 电商系统金额字段为什么必须用 DECIMAL 而不是 FLOAT/DOUBLE？请从底层存储原理说明，并给出正确的字段定义。

### tech:数据库原理 · 2 条
- `xq-py-c2-s5-5` (a=776字, medium) 连接池参数 `pool_size`、`max_overflow`、`pool_pre_ping`、`pool_recycle` 分别解决什么
- `xq-py-c4-s6-4` (a=977字, medium) 异步引擎的连接池在生产环境应该如何配置？`pool_pre_ping`、`pool_recycle`、`pool_size`、`max_ov

### tech:系统设计 · 2 条
- `xq-b-209` (a=952字, medium) Raft 如何保证日志复制的一致性？「日志匹配特性」（Log Matching Property）具体指什么？如果 Follower 日志与
- `xq-b-210` (a=827字, medium) Raft 如何保证日志复制的一致性？「日志匹配特性」（Log Matching Property）具体指什么？如果某个 Follower 日

### tech:系统设计 · 2 条
- `xq-b-403` (a=859字, easy) `fork()` 之后信号处置（disposition）是继承还是重置？`execve` 呢？这对多进程服务设计有什么影响？
- `xq-b-405` (a=726字, easy) `fork()` 后信号处置（disposition）如何继承？`execve()` 后如何变化？这对多进程服务设计有什么影响？

### tech:系统设计 · 2 条
- `xq-b-406` (a=1089字, easy) `free -h` 中 available 和 used 的区别是什么？为什么说"只看 used 不看 available 会误判内存不足"
- `xq-b-407` (a=779字, medium) `free -h` 输出中，`used` 和 `available` 的区别是什么？为什么说只看 `used` 会误判内存不足？在什么场景下

### tech:系统设计 · 2 条
- `xq-b-649` (a=841字, easy) 信号处理器（signal handler）中为什么不能调用 printf、malloc 等函数？什么是 async-signal-safe 
- `xq-b-650` (a=931字, medium) 信号处理器（signal handler）中为什么不能随意调用 printf 或 malloc？什么是 async-signal-safe 

### tech:系统设计 · 2 条
- `xq-b-864` (a=652字, easy) 对比 Snowflake、UUID、数据库自增主键、Redis INCR 四种分布式 ID 方案，从有序性、性能、可用性、存储开销四个维度分
- `xq-b-865` (a=851字, medium) 对比 Snowflake、UUID、数据库自增主键、Redis INCR 生成分布式 ID 的优缺点，并说明各自适用场景。

### tech:系统设计 · 2 条
- `xq-b-998` (a=624字, medium) 缺页中断（page fault）有哪几种类型？分别如何处理？为什么说缺页中断是虚拟内存机制的核心？
- `xq-b-999` (a=670字, easy) 缺页中断（page fault）有哪几种类型？分别对应什么处理流程？为什么说缺页中断是虚拟内存机制的核心？

### tech:系统设计 · 2 条
- `xq-b-1035` (a=1045字, easy) 请使用主定理（Master Theorem）求解以下三个递归式的时间复杂度，并说明主定理的适用条件和局限性：
(1) T(n) = 2T(n
- `xq-b-1200` (a=973字, easy) 请用主定理（Master Theorem）求解以下三个递归式，并说明它们分别对应哪些经典算法：
1. T(n) = 2T(n/2) + O(

### tech:Go · 2 条
- `xq-go-c1-s4-4` (a=1299字, medium) `sync.WaitGroup` 的 `Add`、`Done`、`Wait` 三者配合有哪些易错点？为什么 `Add` 必须在 `go` 语
- `xq-go-c3-s2-2` (a=885字, medium) `sync.WaitGroup` 的 `Add` 为什么必须在 `go` 语句之前调用？请结合底层机制说明。

### tech:Go · 2 条
- `xq-go-c3-s6-6` (a=764字, medium) 当 worker pool 中某个任务 panic 时会发生什么？如何设计才能让单个任务失败不影响整个池？
- `xq-go-c3-s3-5` (a=925字, medium) 在 Worker Pool 中，如果某个任务发生 panic，会发生什么？如何设计才能让单个任务的 panic 不影响整个池？

### tech:Java · 2 条
- `xq-b-23` (a=1129字, easy) BeanFactory 和 ApplicationContext 有什么区别？为什么日常开发都用 ApplicationContext？
- `xq-bw-c4-s1-2` (a=1220字, easy) BeanFactory 和 ApplicationContext 有什么区别？为什么实战中几乎只用 ApplicationContext？

### tech:Java · 2 条
- `xq-b-40` (a=927字, medium) ConcurrentHashMap 的迭代器是弱一致的，与 HashMap 的 fail-fast 迭代器有何本质区别？弱一致在实际开发中会
- `xq-b-41` (a=627字, medium) ConcurrentHashMap 的迭代器是弱一致的，它与 HashMap 的 fail-fast 迭代器有何本质区别？弱一致迭代器在实际

### tech:Java · 2 条
- `xq-b-73` (a=841字, medium) Gateway 为什么基于 WebFlux/Netty 而非传统 Servlet 容器？请从线程模型和性能角度深入解释。
- `xq-b-489` (a=768字, medium) 为什么 Spring Cloud Gateway 必须基于 WebFlux/Netty 而非传统 Servlet 容器？请从线程模型和性能角

### tech:Java · 2 条
- `xq-b-106` (a=700字, medium) JFR（Java Flight Recorder）相比 jstack/jmap 的核心优势是什么？在什么场景下选择 JFR 而不是传统工具？
- `xq-b-107` (a=756字, medium) JFR（Java Flight Recorder）相比 jstat/jmap 有什么优势？在什么场景下你会选择 JFR 而不是其他工具？

### tech:Java · 2 条
- `xq-b-276` (a=733字, easy) Spring AOP 的核心概念是什么？它与 OOP 有何区别？请解释切面（Aspect）、切点（Pointcut）、通知（Advice）三
- `xq-b-277` (a=752字, easy) Spring AOP 的核心概念是什么？它和 OOP 有什么区别？请解释切面（Aspect）、切点（Pointcut）、通知（Advice）

### tech:Java · 2 条
- `xq-b-278` (a=946字, easy) Spring Boot 2.7 之后自动配置的注册文件从 `spring.factories` 迁移到了 `AutoConfiguratio
- `xq-b-279` (a=1406字, medium) Spring Boot 2.7 之后，自动配置类的注册机制从 `spring.factories` 迁移到了 `AutoConfigurat

### tech:Java · 2 条
- `xq-b-294` (a=1199字, easy) Spring MVC 中如何实现全局统一异常处理？`@ExceptionHandler`、`@ControllerAdvice` 和 `Ha
- `xq-b-1250` (a=1066字, easy) 请解释 Spring MVC 中 `@ExceptionHandler`、`@ControllerAdvice` 和 `HandlerExc

### tech:Java · 2 条
- `xq-b-320` (a=1022字, easy) Spring 默认的 Bean 作用域是什么？`singleton` 和 `prototype` 在实例创建时机、生命周期管理、线程安全三方
- `xq-b-436` (a=986字, easy) singleton 与 prototype 作用域在 Bean 的创建时机、生命周期管理、线程安全方面有何本质区别？请用代码示例说明。

### tech:Java · 2 条
- `xq-b-367` (a=791字, easy) `@Controller` 和 `@RestController` 的区别是什么？为什么漏写 `@ResponseBody` 会导致 404
- `xq-b-378` (a=967字, easy) `@RestController` 和 `@Controller` 的区别是什么？`@ResponseBody` 在其中扮演什么角色？

### tech:Java · 2 条
- `xq-b-369` (a=804字, easy) `@PostConstruct`、`InitializingBean.afterPropertiesSet()`、`init-method`
- `xq-b-1058` (a=1462字, easy) 请完整描述 Spring Bean 的生命周期，并指出 `@PostConstruct`、`InitializingBean.afterPr

### tech:Java · 2 条
- `xq-b-379` (a=832字, easy) `@Service`、`@Repository`、`@Controller` 与 `@Component` 功能上完全相同吗？`@Repos
- `xq-bw-c4-s1-5` (a=955字, easy) @Component、@Service、@Repository、@Controller 有什么区别？@Repository 有什么特殊之处？

### tech:Java · 2 条
- `xq-b-391` (a=576字, easy) `ClassNotFoundException` 和 `NoClassDefFoundError` 有什么区别？分别对应类生命周期的哪个阶段
- `xq-b-879` (a=1045字, easy) 对比辨析：`ClassNotFoundException` 和 `NoClassDefFoundError` 有什么区别？分别对应类生命周期

### tech:Java · 2 条
- `xq-b-476` (a=685字, medium) 为什么 HashMap 的容量必须是 2 的幂？负载因子为什么默认是 0.75？这两个参数如何影响性能？
- `xq-b-504` (a=779字, easy) 为什么HashMap的容量必须是2的幂？负载因子为什么默认是0.75？

### tech:Java · 2 条
- `xq-b-525` (a=741字, easy) 为什么方法内能修改 List 的内容（如 add/remove），却不能通过 `list = new ArrayList<>()` 换掉外部
- `xq-b-527` (a=834字, easy) 为什么方法能修改传入 List 的内容（如 add/remove），却不能通过 `list = new ArrayList<>()` 替换掉

### tech:Java · 2 条
- `xq-b-991` (a=760字, easy) 给定一个场景：`new ThreadPoolExecutor(2, 4, 60, SECONDS, new ArrayBlockingQue
- `xq-b-1045` (a=686字, easy) 请分析以下代码的行为：`new ThreadPoolExecutor(2, 4, 60, SECONDS, new ArrayBlockin

### tech:Java · 2 条
- `xq-b-1062` (a=608字, medium) 请完整描述 ThreadPoolExecutor 处理一个新提交任务的执行顺序，并解释为什么很多人会记错这个顺序。
- `xq-b-1063` (a=655字, easy) 请完整描述 ThreadPoolExecutor 处理新任务的精确顺序，并解释为什么很多人会记错这个顺序。

### tech:Java · 2 条
- `xq-b-1083` (a=618字, easy) 请对比 AVL 树和红黑树的区别，并说明为什么 Java 的 TreeMap 选择红黑树而不是 AVL 树？
- `xq-b-1084` (a=601字, easy) 请对比 AVL 树和红黑树的区别，并说明为什么 Java 的 TreeMap 选择红黑树而非 AVL 树？

### tech:Java · 2 条
- `xq-b-1104` (a=975字, medium) 请对比 Serial、Parallel、CMS、G1、ZGC 五种垃圾收集器的核心设计思想与适用场景，并说明为什么 G1 能成为 Java 
- `xq-b-1105` (a=928字, medium) 请对比 Serial、Parallel、CMS、G1、ZGC 这五种垃圾收集器的核心设计思想，并说明各自最适合的应用场景是什么？

### tech:Java · 2 条
- `xq-b-1282` (a=825字, easy) 请解释均摊复杂度（Amortized Complexity）的概念，并以 Java 的 ArrayList 动态扩容为例，说明为什么"偶尔 
- `xq-b-1283` (a=750字, easy) 请解释均摊复杂度（Amortized Complexity）的概念，并以 Java 的 ArrayList 动态扩容为例，说明为什么单次 a

### tech:Java · 2 条
- `xq-b-1349` (a=785字, easy) 请详细解释四种内置拒绝策略（AbortPolicy、CallerRunsPolicy、DiscardPolicy、DiscardOldest
- `xq-b-1358` (a=741字, easy) 请详细说明 ThreadPoolExecutor 的四种内置拒绝策略（AbortPolicy、CallerRunsPolicy、Discar

### tech:Java · 2 条
- `xq-bw-c4-s4-3` (a=809字, medium) 请解释 Spring 的 7 种事务传播行为，并说明 `REQUIRED`、`REQUIRES_NEW`、`NESTED` 的区别与典型场景
- `xq-bw-c6-s4-2` (a=835字, medium) 请详细解释 Spring 的 7 种事务传播行为，重点说明 `REQUIRED`、`REQUIRES_NEW`、`NESTED` 三者的区别

### tech:消息队列 · 2 条
- `bq8` (a=1750字, easy) 消息队列如何保证消息不丢失、不重复消费？
- `bs10` (a=1261字, hard) 如何保证消息队列不重复消费、不丢失？

### tech:消息队列 · 2 条
- `xq-b-146` (a=940字, medium) Kafka 消费者如何通过 offset 实现消息重放？重置 offset 到 earliest 会有什么风险？如何安全地执行重放？
- `xq-b-1385` (a=755字, medium) 重置 Kafka 消费者 offset 到 earliest 或 latest 有什么风险？如何安全地执行重放？

### tech:消息队列 · 2 条
- `xq-b-298` (a=1014字, easy) Spring 事件机制与消息队列（如 RabbitMQ/Kafka）在实现"发布-订阅"上有何本质区别？什么场景下应该用事件机制，什么场景应
- `xq-b-299` (a=920字, easy) Spring 事件机制与消息队列（如 RabbitMQ、Kafka）在实现"发布-订阅"上有何本质区别？各自适用的场景是什么？能否用事件机制

### tech:消息队列 · 2 条
- `xq-b-1233` (a=819字, easy) 请解释 Kafka 中三种消息投递语义（At most once / At least once / Exactly once）的定义，以及
- `xq-b-1234` (a=841字, easy) 请解释 Kafka 的三种消息投递语义（At most once / At least once / Exactly once），并说明各自

### tech:MySQL · 2 条
- `xq-b-477` (a=879字, medium) 为什么 InnoDB 在 RR 隔离级别下能防幻读，而 RC 不能？请从锁机制角度解释。
- `xq-b-733` (a=926字, medium) 在 RR 隔离级别下，InnoDB 为什么能防幻读而 RC 不能？请从锁机制和 MVCC 两个维度分别解释。

### tech:MySQL · 2 条
- `xq-b-494` (a=664字, medium) 为什么 `WHERE phone = 13800000000`（phone 为 VARCHAR 类型）会导致索引失效？MySQL 内部到底做
- `xq-b-495` (a=584字, medium) 为什么 `WHERE phone = 13800000000`（phone 是 VARCHAR 类型）会导致索引失效？请从 MySQL 类型

### tech:Redis · 2 条
- `xq-b-11` (a=597字, easy) AOF 的三种 fsync 策略（always / everysec / no）分别是什么？为什么默认推荐 everysec？
- `xq-b-1320` (a=761字, easy) 请详细对比 AOF 三种 fsync 策略（always/everysec/no）的取舍，并说明为什么 `everysec` 是官方默认推荐

### tech:Redis · 2 条
- `xq-b-239` (a=747字, easy) Redis 重启时如果 RDB 和 AOF 文件同时存在，会优先加载哪个？为什么？如果 AOF 文件损坏了怎么办？
- `xq-dbs-c7-s2-3` (a=499字, easy) Redis 启动时同时存在 RDB 和 AOF 文件，会优先加载哪个？为什么？

### tech:Redis · 2 条
- `xq-b-759` (a=634字, medium) 在什么场景下使用 Redis 分布式锁“没问题”？请给出判断标准，并举例说明。
- `xq-b-760` (a=755字, medium) 在什么场景下使用 Redis 分布式锁是“没问题”的？请给出判断标准，并举例说明。

### tech:Redis · 2 条
- `xq-dbs-c9-s3-3` (a=711字, easy) Redis 的 MULTI/EXEC 事务为什么不支持回滚？它与关系型数据库事务的本质区别是什么？
- `xq-dbs-c10-s2-4` (a=656字, medium) 为什么 Redis 事务（MULTI/EXEC）不支持回滚？这和数据库事务的本质区别是什么？

### tech:Elasticsearch · 2 条
- `xq-sr-c5-s1-2` (a=710字, easy) 请解释 Elasticsearch 集群健康状态 green、yellow、red 的含义，并说明在单节点集群下为什么健康状态通常是 yel
- `xq-sr-c5-s3-1` (a=890字, easy) 请解释 Elasticsearch 集群健康状态 `green`、`yellow`、`red` 的含义，并说明当集群处于 `yellow` 

### tech:NoSQL · 2 条
- `xq-dbn-c2-s3-1` (a=761字, easy) MongoDB 中 readConcern 的 `local`、`majority`、`linearizable` 三个级别分别是什么含义？
- `xq-dbn-c4-s4-3` (a=600字, medium) `readConcern: "local"`、`"majority"`、`"linearizable"` 三者的区别是什么？分别在什么场景下

### tech:Python · 2 条
- `xq-py-c10-s1-5` (a=1067字, easy) `collections.deque` 和 `list` 都能当队列用，为什么官方推荐用 deque 做两端操作？请从底层实现和复杂度对比说
- `xq-py-c10-s7-6` (a=697字, easy) `collections.deque` 和普通 `list` 都能当队列用，为什么 BFS 要用 deque？请从底层实现和复杂度角度解释。

### tech:Kafka · 2 条
- `xq-bd-c3-s1-1` (a=852字, easy) 请解释 Kafka 中 Topic、Partition、Offset 三者的关系，并说明为什么 Partition 是并行读写的最小单位。
- `xq-bg-c2-s1-1` (a=825字, easy) 请解释 Kafka 中 Topic、Partition、Offset 三者的关系，并说明为什么 Partition 是 Kafka 并行度的

### tech:Spark · 2 条
- `xq-bd-c2-s3-1` (a=610字, easy) Structured Streaming 中“无界表”（unbounded table）模型的核心思想是什么？它与传统批处理中的 DataF
- `xq-bg-c1-s3-1` (a=823字, easy) 什么是 Structured Streaming 中的“无界表（Unbounded Table）”？它与传统流处理模型（如 DStream）

### tech:CI/CD · 2 条
- `xq-o-59` (a=866字, medium) GitOps 的核心思想是什么？它和传统 CI/CD 在基础设施管理上有什么本质区别？
- `xq-o-60` (a=832字, medium) GitOps 的核心理念是什么？它与传统 CI/CD 在基础设施管理上的本质区别在哪里？

### tech:CI/CD · 2 条
- `xq-o-347` (a=675字, easy) 什么是平台工程（Platform Engineering）？它的核心目标是什么？请结合 CNCF 的定义阐述。
- `xq-o-348` (a=707字, medium) 什么是平台工程（Platform Engineering）？请结合 CNCF 的定义，说明它与传统 DevOps 的核心区别是什么？

### tech:CI/CD · 2 条
- `xq-o-543` (a=809字, easy) 语义化版本（SemVer）中 MAJOR、MINOR、PATCH 三个数字各自代表什么？请举例说明什么情况下必须升 MAJOR 版本？
- `xq-o-767` (a=778字, easy) 请详细解释语义化版本（SemVer）中 MAJOR、MINOR、PATCH 三段的含义，并说明在什么情况下必须升 MAJOR 版本？请结合具

### tech:容器/Docker · 2 条
- `xq-o-38` (a=750字, easy) Docker 镜像的分层结构是如何工作的？为什么说"写时复制"是镜像高效复用的关键？
- `xq-o-43` (a=558字, easy) Docker镜像的分层结构是如何工作的？为什么说"写时复制"是镜像设计的关键？

### tech:容器/Docker · 2 条
- `xq-o-40` (a=623字, easy) Dockerfile 中 COPY 和 ADD 指令有什么区别？为什么最佳实践推荐优先使用 COPY？
- `xq-o-41` (a=943字, easy) Dockerfile 中 COPY 和 ADD 有什么区别？为什么官方推荐优先使用 COPY？

### tech:容器/Docker · 2 条
- `xq-o-472` (a=746字, easy) 对比 Serverless 函数计算与容器（如 ECS/Kubernetes）在以下维度的差异：适用场景、运维复杂度、成本模型、弹性伸缩、状
- `xq-o-479` (a=610字, easy) 对比Serverless函数计算与容器（如Kubernetes/ECS）在以下维度的差异：适用场景、扩缩容机制、成本模型、运维复杂度。并给出

### tech:Kubernetes · 2 条
- `xq-o-28` (a=1053字, medium) Deployment 的滚动更新机制是如何工作的？maxSurge 与 maxUnavailable 分别控制什么？请结合一次实际发布过程说
- `xq-o-29` (a=808字, medium) Deployment 的滚动更新机制是如何工作的？请详细说明 `maxSurge` 和 `maxUnavailable` 的语义，并解释回滚

### tech:Kubernetes · 2 条
- `xq-o-67` (a=1092字, easy) Ingress 和 Service 中的 NodePort/LoadBalancer 在对外暴露服务上有何本质区别？在什么场景下必须用 In
- `xq-o-68` (a=906字, easy) Ingress 和 Service（NodePort/LoadBalancer）在对外暴露服务上有何本质区别？为什么说 Ingress 是七

### tech:Kubernetes · 2 条
- `xq-o-72` (a=749字, easy) Kubernetes 中 Pod 的 `requests` 和 `limits` 分别控制什么？如果只设置 `limits` 而不设置 `r
- `xq-o-73` (a=686字, easy) Kubernetes 中 Pod 的 requests 和 limits 分别是什么？如果只设置 limits 而不设置 requests，

### tech:Kubernetes · 2 条
- `xq-o-75` (a=1153字, easy) Kubernetes 中 livenessProbe、readinessProbe 和 startupProbe 三者有什么区别？各自适用于
- `xq-o-76` (a=798字, easy) Kubernetes 中 livenessProbe、readinessProbe 和 startupProbe 三者的核心区别是什么？它们

### tech:Kubernetes · 2 条
- `xq-o-134` (a=1095字, easy) Secret 有哪几种类型？`Opaque`、`docker-registry`、`tls` 分别适用于什么场景？如何创建和使用 `tls`
- `xq-o-135` (a=1087字, easy) Secret 有哪几种类型？`docker-registry` 和 `tls` 类型分别用于什么场景？如何创建和使用？

### tech:Kubernetes · 2 条
- `xq-o-754` (a=1061字, medium) 请详细解释 Kubernetes 滚动更新（Rolling Update）的完整流程，并说明 maxSurge 和 maxUnavailab
- `xq-o-775` (a=994字, easy) 请详细说明滚动更新（Rolling Update）的工作原理，并解释 `maxUnavailable` 和 `maxSurge` 两个参数如

### tech:Kubernetes · 2 条
- `rq-o-op-k8s-junior-2-1` (a=1001字, easy) 请解释 kubectl apply 与 kubectl create 的核心区别，并说明为什么在 Kubernetes 生产环境中推荐使用 
- `xq-k82-c10-s1-1` (a=817字, easy) 请解释 `kubectl apply` 与 `kubectl create` 的核心区别，并说明为什么生产环境更推荐 `apply`？

### tech:Kubernetes · 2 条
- `rq-o-op-k8s-mid-6-1` (a=749字, easy) 请解释 Kubernetes 中 requests 和 limits 的区别，以及它们分别作用于哪些资源维度？如果只设置 limits 而不
- `xq-k8-c6-s2-1` (a=955字, easy) 请解释 Kubernetes 中 requests 与 limits 的区别，以及它们分别由哪个组件负责保证？如果只设置 limits 不设

### tech:Kubernetes · 2 条
- `rq-o-op-k8s-mid-1-1` (a=973字, easy) Kubernetes 中 Service 的 ClusterIP、NodePort、LoadBalancer 三种类型分别适用于什么场景？它
- `xq-k8-c3-s4-2` (a=800字, easy) ClusterIP、NodePort、LoadBalancer、ExternalName 四种 Service 类型分别适用于什么场景？它们

### tech:Kubernetes · 2 条
- `rq-o-op-k8s-mid-0-4` (a=1170字, easy) 请对比 Deployment、StatefulSet、DaemonSet 三者之间的核心差异。在什么场景下必须使用 StatefulSet 
- `xq-k82-c3-s4-5` (a=968字, easy) 请对比 Deployment、StatefulSet、DaemonSet 三种工作负载的适用场景与关键差异。

### tech:Kubernetes · 2 条
- `rq-o-op-sre-junior-2-3` (a=870字, medium) Service 有哪几种类型（ClusterIP、NodePort、LoadBalancer、ExternalName）？各自适用场景是什么
- `xq-k8-c1-s5-2` (a=858字, easy) 请对比 ClusterIP、NodePort、LoadBalancer、ExternalName 四种 Service 类型的区别与适用场景

### tech:Kubernetes · 2 条
- `xq-k8-c2-s5-6` (a=966字, medium) kubelet 的 `--system-reserved` 和 `--kube-reserved` 有什么区别？它们如何影响可调度资源容量？
- `xq-k82-c2-s4-4` (a=736字, medium) kubelet 的 `--system-reserved` 和 `--kube-reserved` 是做什么的？如果不设置会有什么后果？

### tech:Kubernetes · 2 条
- `xq-k8-c5-s2-4` (a=810字, easy) Kubebuilder 和 Operator SDK 有什么区别与联系？实际选型时如何决策？
- `xq-k82-c9-s2-4` (a=819字, medium) Kubebuilder 和 Operator SDK 有什么区别？新项目应该选哪个？

### tech:Kubernetes · 2 条
- `xq-k8-c4-s3-3` (a=750字, medium) `volumeBindingMode` 的 `Immediate` 和 `WaitForFirstConsumer` 有何区别？本地持久卷为
- `xq-k82-c5-s3-4` (a=597字, medium) volumeBindingMode 的 Immediate 和 WaitForFirstConsumer 有什么区别？为什么延迟绑定很重要？

### tech:Kubernetes · 2 条
- `xq-k8-c3-s3-3` (a=855字, medium) `kubectl rollout undo` 的回滚原理是什么？`revisionHistoryLimit` 设置过小会有什么问题？
- `xq-k82-c3-s4-2` (a=888字, medium) `kubectl rollout undo` 回滚的底层原理是什么？`revisionHistoryLimit` 设置过小会有什么后果？

### tech:Kubernetes · 2 条
- `xq-k8-c1-s3-5` (a=837字, easy) Service 是如何为一组 Pod 提供稳定访问入口的？ClusterIP、NodePort、LoadBalancer 三种类型分别适用于
- `xq-dop-c4-s1-4` (a=847字, easy) Service 是如何为一组 Pod 提供稳定访问入口的？请说明 ClusterIP、NodePort、LoadBalancer 三种类型的

### tech:Kubernetes · 2 条
- `xq-dop-c4-s5-5` (a=821字, medium) StatefulSet 的 volumeClaimTemplates 是如何工作的？为什么有状态应用要用它而不是 Deployment + 
- `xq-k82-c5-s4-3` (a=856字, easy) 为什么有状态应用推荐用 StatefulSet + volumeClaimTemplates，而不是 Deployment + 共享 PVC

### tech:Kubernetes · 2 条
- `xq-dop-c4-s1-7` (a=901字, medium) 一个 Pod 一直处于 Pending 状态，你会如何系统性地排查？请给出排查思路和常用命令。
- `xq-k82-c5-s2-5` (a=973字, hard) 一个 PVC 一直处于 Pending 状态，你会如何系统性排查？请给出排查思路和常用命令。

### tech:Kubernetes · 2 条
- `xq-dop-c4-s3-8` (a=617字, hard) kube-proxy 的 iptables 模式与 IPVS 模式有什么区别？大规模集群下应如何选择？
- `xq-k82-c4-s1-5` (a=648字, medium) kube-proxy 有哪几种工作模式？iptables 和 IPVS 模式有什么区别？

### tech:Linux · 2 条
- `xq-o-211` (a=641字, easy) `pkill -f nginx` 和 `killall nginx` 有什么区别？使用 `pkill -f` 有什么风险？
- `xq-o-212` (a=960字, easy) `pkill -f nginx` 和 `killall nginx` 有什么区别？如何精确匹配进程名杀进程，避免误杀？

### tech:Linux · 2 条
- `xq-o-260` (a=870字, medium) load average 高但 CPU 使用率低，可能的原因是什么？如何排查？
- `xq-o-261` (a=791字, medium) load average（负载均值）和 CPU 使用率的区别是什么？load average 高但 CPU 低可能是什么原因？

### tech:Linux · 2 条
- `xq-o-642` (a=771字, medium) 请深入解释 SUID 特殊权限的完整机制。为什么 `/usr/bin/passwd` 需要 SUID？它存在哪些安全风险，如何审计系统中的 
- `xq-o-690` (a=881字, easy) 请解释 SUID 特殊权限的作用机制。为什么 `/usr/bin/passwd` 需要设置 SUID？如果系统中出现了一个非预期的 SUID

### tech:Linux · 2 条
- `xq-o-706` (a=799字, easy) 请解释 `find` 命令中 `-exec` 与 `-delete` 的区别和各自风险。为什么强调"先演习再执行"？请给出一个安全的批量删除
- `xq-o-707` (a=992字, easy) 请解释 `find` 命令中 `-exec` 与 `-delete` 的区别，并说明为什么 `find ... -delete` 必须先"空

### tech:Linux · 2 条
- `rq-o-op-trad-junior-1-3` (a=938字, medium) 请编写一个 bash 脚本，实现以下功能：监控指定目录下所有 `.log` 文件，若文件大小超过 100MB 则自动压缩为 `.tar.gz
- `rq-o-op-sre-junior-1-4` (a=1194字, medium) 请编写一个bash脚本，实现以下功能：监控一个指定目录（如`/data/logs`）下的`.log`文件，当文件大小超过100MB时，自动压

### tech:SRE · 2 条
- `xq-o-608` (a=659字, easy) 请对比"预留实例（RI）"与"Savings Plans"的异同，并说明在什么场景下你会优先选择 Savings Plans 而非 RI？
- `xq-o-622` (a=790字, easy) 请对比预留实例（Reserved Instance, RI）与 Savings Plans（SP）的异同。在什么场景下应该优先选择 Savi

### tech:SRE · 2 条
- `xq-o-699` (a=829字, medium) 请解释 Trace、Span、SpanContext 三者的关系，并说明为什么 SpanContext 是分布式追踪中"牵一发动全身"的关键
- `xq-sre-c3-s4-1` (a=764字, easy) 请解释 Trace、Span、SpanContext 三者的关系，为什么说 SpanContext 是分布式追踪的基石？

### tech:SRE · 2 条
- `xq-sre-c4-s4-4` (a=734字, medium) Alertmanager 的路由树（route tree）是如何工作的？`continue` 字段有什么作用？
- `xq-sre2-c5-s3-5` (a=783字, medium) Alertmanager 的路由（route）是如何工作的？请说明路由树的匹配逻辑，以及 `continue` 字段的作用。

### tech:基础设施即代码 · 2 条
- `xq-o-165` (a=1035字, easy) Terraform 模块的 `source` 参数支持哪些来源？各自适用场景与注意事项是什么？如何实现模块的版本化？
- `xq-o-166` (a=928字, hard) Terraform 模块的 `source` 参数支持哪些来源？各自适用场景是什么？如何实现模块版本化？

### tech:基础设施即代码 · 2 条
- `xq-o-280` (a=823字, medium) 为什么 dev/prod 共用同一个 state backend 是运维安全底线问题？请从 Terraform 状态文件的作用和误操作链路两
- `xq-o-440` (a=707字, medium) 多环境隔离的核心目标是什么？为什么 dev/prod 共用同一个 Terraform state backend 是运维安全底线问题？

### tech:基础设施即代码 · 2 条
- `xq-o-287` (a=580字, easy) 为什么必须使用 `required_providers` 锁定 provider 版本？不锁版本会带来哪些具体风险？请给出一个配置示例。
- `xq-o-288` (a=941字, easy) 为什么必须使用 required_providers 锁定 provider 版本？不锁版本会引发哪些具体问题？请给出一个完整的锁定配置示例

### tech:基础设施即代码 · 2 条
- `xq-o-562` (a=1077字, easy) 请完整描述 Terraform 的核心工作流（init/plan/apply/destroy），并解释每个阶段的作用。为什么说 plan 是
- `xq-o-698` (a=639字, easy) 请解释 Terraform 的核心工作流（init/plan/apply/destroy），并说明每个步骤的作用和顺序是否可以调整？为什么？

### tech:监控与可观测 · 2 条
- `xq-o-377` (a=876字, medium) 可观测性三支柱（Metrics/Logs/Traces）分别解决什么问题？为什么单独使用任何一个都是“盲人摸象”？请结合一个真实排障场景说明
- `xq-o-378` (a=717字, easy) 可观测性三支柱（Metrics、Logs、Traces）分别解决什么问题？为什么说单看任何一个都是“盲人摸象”？请结合一个实际排障场景说明三

### tech:监控与可观测 · 2 条
- `xq-o-437` (a=1020字, medium) 在金丝雀发布中，除了"服务起来了"（Pod Running/Ready），还应该监控哪些关键指标来决策是否继续放量？请给出具体的指标体系和阈
- `xq-o-788` (a=1104字, medium) 金丝雀发布中，除了"服务起来了"（Pod Running/Ready），还应该监控哪些指标来决定是否继续放量？请给出具体的监控指标和放量决策

### tech:监控与可观测 · 2 条
- `xq-o-686` (a=818字, easy) 请解释 SLI、SLO、SLA 三者的区别与联系，并说明为什么 SLO 通常比 SLA 更严格？
- `xq-o-687` (a=688字, easy) 请解释 SLI、SLO、SLA 三者的定义与关系，并说明为什么 SLO 通常比 SLA 更严格？

### tech:监控与可观测 · 2 条
- `xq-sre-c4-s1-1` (a=767字, easy) Prometheus 为什么采用 Pull（拉取）模型而不是 Push（推送）模型？这种设计带来了哪些优势和局限？
- `xq-sre-c3-s3-3` (a=1003字, medium) Prometheus 为什么采用 Pull（拉取）模型而不是 Push？Pull 模型有哪些优势和局限，实际生产中如何弥补局限？

### tech:RAG · 2 条
- `xq-a-75` (a=682字, easy) 为什么 RAG 需要"召回（Retrieval）"和"重排（Rerank）"两阶段？直接用向量检索 Top-5 不行吗？
- `xq-a-77` (a=582字, easy) 为什么 RAG 需要"召回（retrieval）"和"重排（rerank）"两阶段？只用向量检索直接生成不行吗？

### tech:RAG · 2 条
- `xq-a-114` (a=660字, medium) 什么是黄金集（Golden Set）？在 RAG/LLM 应用开发中，它扮演什么角色？请结合"考题库"的比喻解释其核心价值。
- `xq-a-115` (a=634字, medium) 什么是黄金集（Golden Set）？它在 RAG/LLM 应用开发中扮演什么角色？请结合"考题库"的类比说明其核心价值。

### tech:RAG · 2 条
- `xq-a-360` (a=1258字, medium) 请解释 OpenTelemetry 中 `gen_ai.*` 语义约定的设计意图，并给出一个为 RAG 调用链埋点的最小实现示例。
- `xq-a-361` (a=1405字, medium) 请解释 OpenTelemetry 中 gen_ai.* 语义约定的设计意图，并给出一个为 RAG 调用链手动埋点的代码示例（伪代码或 Py

### tech:RAG · 2 条
- `xq-a-365` (a=956字, medium) 请解释 RAG 评估中 Faithfulness（忠实度）与 Answer Relevance（答案相关性）的核心区别，并说明为什么两者可能
- `xq-a-426` (a=806字, medium) 请详细解释 RAG 评估中 Faithfulness（忠实度）与 Answer Relevance（答案相关性）的核心区别，并说明为什么两者

### tech:RAG · 2 条
- `xq-agr-c1-s2-4` (a=893字, medium) LangChain 和 LlamaIndex 在实现 RAG 时各自的抽象层次有何不同？分别适合什么场景？
- `xq-agr-c1-s4-3` (a=894字, medium) LangChain 和 LlamaIndex 在实现第一个 RAG 应用时，核心抽象有何不同？各自适合什么场景？

### tech:服务化架构 · 2 条
- `xq-a-110` (a=1253字, easy) 什么是熔断（Circuit Breaker）？在 LLM API 集成中如何实现？它和重试有什么区别？
- `xq-a-111` (a=1672字, easy) 什么是熔断（circuit breaker）？在 LLM API 集成中如何设计熔断机制？它与超时、重试是什么关系？

### tech:Prompt 工程 · 2 条
- `xq-a-309` (a=735字, easy) 请对比 Zero-shot、Few-shot 和 Chain-of-Thought（CoT）三种提示策略的区别，并说明各自适用的场景。
- `xq-a-310` (a=726字, easy) 请对比 Zero-shot、Few-shot、Chain-of-Thought（CoT）三种提示策略的原理差异与适用场景。

### tech:推理与部署 · 2 条
- `xq-al-c6n-s3-5` (a=568字, easy) TensorFlow Serving 同时支持 gRPC 和 RESTful，生产环境该选哪个？各自的端口和性能差异是什么？
- `xq-al-c6-s3-4` (a=833字, easy) TensorFlow Serving 提供 gRPC 和 RESTful 两套 API，它们各自的适用场景和性能差异是什么？

### tech:推理与部署 · 2 条
- `xq-al-c6-s4-6` (a=1008字, easy) Pusher 组件在 TFX 里做什么？它如何与 TensorFlow Serving 配合完成模型上线？
- `xq-al-c6n-s4-6` (a=870字, easy) Pusher 组件的作用是什么？它如何与 TensorFlow Serving 配合完成模型上线？

### tech:评估与观测 · 2 条
- `xq-al-c6-s4-4` (a=857字, medium) Evaluator 的"模型验证（Blessing）"机制是怎么工作的？它如何决定一个模型能否上线？
- `xq-al-c6n-s4-4` (a=774字, medium) Evaluator 的模型验证（Blessing）机制是如何工作的？它如何决定模型能否上线？

### tech:推理引擎 · 2 条
- `xq-a-93` (a=794字, medium) 什么是 Continuous Batching（连续批处理）？它与传统的静态批处理（Static Batching）有何本质区别？为什么说它
- `xq-inf-c2-s5-2` (a=822字, medium) vLLM 的 Continuous Batching 与传统的 Static Batching 有什么区别？为什么它能显著提升吞吐？

### tech:推理引擎 · 2 条
- `xq-inf-c1-s2-1` (a=775字, easy) 请解释 vLLM 中 PagedAttention 的核心思想，它解决了传统 KV cache 管理的什么问题？
- `xq-inf-c2-s2-1` (a=766字, easy) 什么是 PagedAttention？它解决了传统 KV Cache 管理的什么核心问题？请从操作系统类比的角度解释其设计思想。

### tech:模型与训练 · 2 条
- `xq-al-c1-s6-2` (a=870字, easy) 为什么每个训练 batch 前都必须调用 `optimizer.zero_grad()`？如果不调用，会发生什么？请从 PyTorch 自动
- `xq-al-c1r-s6-1` (a=925字, easy) 在 PyTorch 训练循环中，为什么每个 batch 训练前必须调用 `optimizer.zero_grad()`？如果不调用会发生什么

### tech:模型与训练 · 2 条
- `xq-al-c1-s4-1` (a=803字, easy) 请解释 PyTorch 中优化器的核心工作流程，为什么每次迭代都必须调用 `optimizer.zero_grad()`？如果忘记调用会发生
- `xq-al-c1r-s4-1` (a=871字, easy) 请解释 PyTorch 中优化器的标准训练循环，为什么必须调用 `optimizer.zero_grad()`？如果漏掉会发生什么？

### tech:模型与训练 · 2 条
- `xq-al-c1n-s2-4` (a=820字, medium) 对非标量张量调用 `.backward()` 会发生什么？`grad_tensors` 参数的作用是什么？请举例说明。
- `xq-al-c1r-s2-3` (a=714字, medium) 对一个非标量张量直接调用 `.backward()` 会怎样？`grad_tensors` 参数的作用是什么？

### tech:模型与训练 · 2 条
- `xq-al-c2n-s2-4` (a=599字, medium) AMP 训练中出现 loss 变成 NaN 或一直不下降，你会如何排查？
- `xq-al-c2-s2-6` (a=753字, hard) AMP 训练中出现 loss 变成 NaN 或训练不收敛，你会如何排查？

### tech:模型与训练 · 2 条
- `xq-al-c5-s2-3` (a=838字, easy) `model.compile()` 里的 optimizer、loss、metrics 三者分别控制什么？为什么 metrics 不影响训练
- `xq-al-c5n-s2-5` (a=932字, easy) `model.compile` 中的 `optimizer`、`loss`、`metrics` 三者分别控制什么？为什么 `metrics`

### tech:模型与训练 · 2 条
- `xq-al-c6-s2-2` (a=805字, medium) `MirroredStrategy` 和 `MultiWorkerMirroredStrategy` 在原理上有什么异同？多机场景下 `TF
- `xq-al-c6n-s2-2` (a=767字, medium) MultiWorkerMirroredStrategy 与 MirroredStrategy 有什么本质区别？TF_CONFIG 的作用是什

### tech:模型与训练 · 2 条
- `xq-al-c6-s5-4` (a=892字, easy) `tf.debugging.enable_check_numerics()` 和 `tf.debugging.assert_all_fini
- `xq-al-c6n-s5-6` (a=701字, medium) 请对比 `tf.debugging.assert_all_finite`、`tf.debugging.check_numerics` 和 `

### tech:模型与训练 · 2 条
- `xq-al-c1n-s1-4` (a=742字, medium) `reshape`、`view`、`transpose`、`permute` 有什么区别？什么时候用哪个？
- `xq-al-c1r-s1-4` (a=682字, medium) `reshape`、`view`、`transpose`、`permute` 在底层行为上有何区别？什么情况下 `view` 会失败？

### tech:模型与训练 · 2 条
- `xq-al-c6-s1-1` (a=1206字, easy) 请解释 Keras 中三种构建模型的方式（Sequential、Functional、Subclassing）的区别，并说明什么场景下必须使
- `xq-al-c6n-s1-1` (a=1182字, easy) Keras 提供了 Sequential、Functional、Model Subclassing 三种构建模型的方式。请说明子类化（Sub

### tech:模型与训练 · 2 条
- `xq-al-c1n-s3-5` (a=1175字, medium) PyTorch 默认的层初始化是什么？为什么官方推荐在 `__init__` 中显式初始化权重？请举例说明 `xavier_uniform_
- `xq-al-c1r-s3-5` (a=946字, medium) PyTorch 的默认参数初始化是什么？为什么官方仍建议在 `__init__` 中显式初始化？`xavier_uniform_` 与 `k

### tech:CV · 2 条
- `xq-al-c5-s5-2` (a=564字, easy) 最大池化和平均池化有什么区别？为什么 CNN 中更常用最大池化？池化层有可训练参数吗？
- `xq-al-c5n-s5-2` (a=822字, easy) 最大池化和平均池化有什么区别？为什么 CNN 中最大池化更主流？池化层有可训练参数吗？

### tech:Node.js · 2 条
- `xq-nd-c1-s5-2` (a=1089字, easy) `req.url` 和 `new URL(req.url, 'http://localhost')` 得到的对象有什么区别？为什么第二个参数
- `xq-nd-c3-s1-2` (a=772字, easy) `req.url` 和 `new URL(req.url, 'http://localhost')` 得到的对象有什么区别？为什么路由分发时

## 去重执行结果

- 备份：`devmentor.db.bak-1789490286458`
- 删除重复题：**197** 条（保留每组答案最完整的一条）
- 同步清理：user_questions.result_question_id / user_wrong_items.item_id
- 去重后题库：16453