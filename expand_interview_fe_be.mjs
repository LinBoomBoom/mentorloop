/* 面试题扩量 · 前端 + 后端（幂等）
 * 仅向 seed-content.json 的 content.interview 追加，不改 schema、不改其他表。
 * 重跑安全：已存在的 id 自动跳过。
 */
import fs from 'fs'
const SEED = './data/seed-content.json'
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'))

// 前端 hot fq15..fq41
const feHot = [
  { id: 'fq15', q: '重排（reflow）与重绘（repaint）的区别？如何减少？', keywords: ['重排', 'reflow', '重绘', 'repaint', '性能'],
    a: '**区别**：重排是几何属性变化（宽高、位置）触发布局重新计算，代价大；重绘是颜色等外观变化，跳过布局，代价较小。\n\n**触发**：改 width/top/offset 会重排；改 color/background 仅重绘；重排必然引发重绘。\n\n**优化**：\n- 批量 DOM 操作（DocumentFragment / 离线 DOM）\n- 用 transform/opacity 触发合成层，避开重排重绘\n- 避免频繁读 offset 写样式（强制同步布局）；读写分离\n- 复杂动画用 will-change 提升为独立图层' },
  { id: 'fq16', q: '浏览器跨域及 CORS 解决方案', keywords: ['跨域', 'CORS', '同源', 'options'],
    a: '**同源策略**：协议/域名/端口三者相同才同源；跨域限制读响应。\n\n**CORS（主流）**：服务端响应头 `Access-Control-Allow-Origin`。简单请求（GET/POST+特定头）直接带 Origin；非简单请求先发 OPTIONS 预检，确认后才发真实请求。\n\n**其他方案**：\n- 开发代理（Vite/webpack devServer proxy）\n- Nginx 反向代理（同源部署）\n- JSONP（仅 GET，已被 CORS 替代）\n- 带凭证需 `withCredentials` + `Allow-Credentials:true`，此时 Origin 不能为 `*`' },
  { id: 'fq17', q: '防抖（debounce）与节流（throttle）的区别与实现', keywords: ['防抖', 'debounce', '节流', 'throttle'],
    a: '**防抖**：事件停止触发 N 毫秒后才执行（如搜索输入、窗口 resize 落定）。\n\n**节流**：固定时间内只执行一次（如滚动、拖拽、按钮连点）。\n\n**实现要点**：\n- 防抖：用 timer，每次触发清除重设\n- 节流：时间戳法（首次即执行）或定时器法（尾部执行）；可用 `leading/trailing` 组合\n- 现代可用 `lodash.debounce/throttle`，或 `AbortController` 取消\n\n**选型**：输入联想用防抖，滚动加载/限频用节流。' },
  { id: 'fq18', q: '虚拟 DOM 与 diff 算法原理', keywords: ['虚拟DOM', 'vdom', 'diff', 'patch'],
    a: '**虚拟 DOM**：用 JS 对象描述 UI 树，避免频繁直接操作真实 DOM。\n\n**diff 思想**（以 Vue/React 为代表）：\n- 同层比较，不跨层移动（时间复杂度 O(n)）\n- 同类型节点才复用，不同类型直接替换整棵\n- 列表用 `key` 识别复用，避免错位（key 用稳定 id 而非 index）\n- 文本/属性变化才打补丁\n\n**价值**：把"声明式"映射到最小真实 DOM 操作；diff 是手段，最终仍操作 DOM。注意：vdom 不等于永远比原生快，胜在可预测与跨平台。' },
  { id: 'fq19', q: '前端路由原理：hash 与 history 模式的区别', keywords: ['路由', 'hash', 'history', 'SPA'],
    a: '**hash 模式**：URL 中 `#/path`，改变 hash 不刷新页面、不向服务端发请求，靠 `hashchange` 事件驱动；兼容性好、无需服务端配置。\n\n**history 模式**：用 HTML5 `pushState/replaceState` + `popstate`，URL 更干净（无 #）；但刷新或直接访问 `/path` 会向服务端请求该路径，**必须服务端兜底返回 index.html**（Nginx `try_files $uri /index.html`）。\n\n**取舍**：追求美观与 SEO 用 history；担心部署成本用 hash。' },
  { id: 'fq20', q: 'Webpack 与 Vite 的构建差异与优化手段', keywords: ['webpack', 'vite', '构建', '打包'],
    a: '**核心差异**：Webpack 基于 bundler，启动时全量打包（项目大则慢）；Vite 开发期用浏览器原生 ESM + esbuild 预构建依赖，按需编译，启动极快；生产仍用 Rollup 打包。\n\n**通用优化**：\n- 路由级代码分割（动态 import）\n- Tree Shaking（ESM、sideEffects 标记）\n- 拆 vendor、开启 gzip/brotli\n- 图片/字体用 asset module 或 CDN\n- 分析包体积（webpack-bundle-analyzer / rollup-plugin-visualizer）' },
  { id: 'fq21', q: 'CSS 盒模型与 BFC', keywords: ['盒模型', 'box-sizing', 'BFC'],
    a: '**盒模型**：content + padding + border + margin。标准盒 `width` 仅含 content（`box-sizing:content-box`）；IE 盒 `width` 含 padding+border（`border-box`，推荐全局设置）。\n\n**BFC（块级格式化上下文）**：独立渲染区域，内部布局不影响外部。触发：float、overflow≠visible、display:flex/grid/inline-block、position:absolute/fixed。\n\n**用途**：清除浮动、防止 margin 塌陷/重叠、实现自适应两栏。' },
  { id: 'fq22', q: 'PWA（渐进式 Web 应用）核心是什么？', keywords: ['PWA', 'service worker', 'manifest', '离线'],
    a: '**三大支柱**：\n1. **Web App Manifest**：定义图标/名称/启动方式，可"添加到主屏"接近原生\n2. **Service Worker**：独立于页面的脚本，拦截网络请求，实现离线缓存、推送\n3. **HTTPS**：SW 仅在安全上下文运行\n\n**能力**：离线可用（Cache API 缓存壳与静态资源）、后台同步、消息推送。\n\n**局限**：iOS 支持有限（推送/部分 API 受限），不适合重交互原生场景。' },
  { id: 'fq23', q: '前端安全：XSS / CSRF / 点击劫持的防御', keywords: ['XSS', 'CSRF', '点击劫持', '安全', 'CSP'],
    a: '**XSS**（注入脚本）：输入转义 + 输出编码（不要用 v-html 渲染不可信内容）+ CSP 限制脚本源 + HttpOnly Cookie。\n\n**CSRF**（借身份发请求）：同源检测（Origin/Referer）+ CSRF Token（Synchronizer Token）+ SameSite Cookie（Lax/Strict）+ 重要操作二次校验。\n\n**点击劫持**：`X-Frame-Options: DENY` 或 CSP `frame-ancestors none` 禁止被 iframe 嵌套。' },
  { id: 'fq24', q: 'Service Worker 的生命周期与缓存策略', keywords: ['service worker', '生命周期', '缓存'],
    a: '**生命周期**：register → install（预缓存资源，用 skipWaiting 立即激活）→ activate（清理旧缓存，用 clients.claim 接管）→ 运行态拦截 fetch。\n\n**缓存策略**：\n- 缓存优先（Cache First，静态资源）\n- 网络优先（Network First，易变数据，失败回退缓存）\n-  stale-while-revalidate（先返回缓存同时后台更新）\n- 仅网络（Network Only）\n\n注意更新机制与版本化缓存名，避免脏缓存。' },
  { id: 'fq25', q: 'CommonJS 与 ES Module 的区别', keywords: ['CommonJS', 'ESM', 'module', 'import'],
    a: '**CommonJS**（Node 传统）：运行时加载、`require`/`module.exports`、同步、值拷贝（导出对象缓存）；不适合浏览器原生。\n\n**ESM**（标准）：编译期静态分析、`import`/`export`、异步、绑定引用（只读视图，改原模块反映到导入方）；支持 Tree Shaking。\n\n**关键差异**：ESM 的 `import` 是绑定（live binding），CJS 是值拷贝；ESM 有 `default` 与命名导出；循环依赖处理不同（ESM 用绑定更优雅）。' },
  { id: 'fq26', q: '深拷贝与浅拷贝，如何实现深拷贝？', keywords: ['深拷贝', '浅拷贝', 'clone'],
    a: '**浅拷贝**：只复制一层引用（Object.assign、展开运算符、slice），嵌套对象仍共享。\n\n**深拷贝**：完全独立副本。实现：\n- `structuredClone`（现代浏览器/Node17+，支持 Map/Set/Date，不支持函数）\n- `JSON.parse(JSON.stringify())`：最简单但有坑（丢函数、undefined、循环引用报错、Date 变字符串）\n- 手写递归：处理循环引用（WeakMap 记录已拷贝）、各类型（正则/Date/Map/Set）\n\n**选型**：无函数/循环引用用 JSON 最快；有则用 structuredClone 或成熟库（lodash.cloneDeep）。' },
  { id: 'fq27', q: 'Promise 与 async/await 的错误处理', keywords: ['promise', 'async', 'await', '错误处理', 'try'],
    a: '**Promise**：`.then` 处理成功，`.catch` 捕获链上任意 reject；`Promise.all` 任一失败即整体 reject。\n\n**async/await**：用 `try/catch` 包裹 await 捕获异常，写法像同步更易读。\n\n**要点**：\n- await 后最好接 `.catch` 或外层 try，否则未捕获会变为 unhandledRejection\n- 并行用 `Promise.all`/`allSettled`（后者不短路，适合批量互不依赖）\n- `Promise.all` 部分失败可用 `Promise.allSettled` 拿每个结果状态' },
  { id: 'fq28', q: '前端状态管理方案对比（Redux / Pinia / Zustand / 原生）', keywords: ['状态管理', 'redux', 'pinia', 'zustand', 'store'],
    a: '**Redux**：单一 store + reducer 纯函数 + action，强约束、可时间旅行调试；样板多，常与 RTK 简化。\n\n**Pinia**（Vue）：去 mutations、支持 Composition API、TS 友好、按需热更新，中大型 Vue 首选。\n\n**Zustand**（React）：极简 hook 式 store，无 Provider 嵌套，轻量。\n\n**选型原则**：小型用 useState/provide-inject；跨组件共享、需调试回溯用 Pinia/Zustand；强流程约束或生态要求用 Redux。核心：状态要"可预测、可追踪、最小必要"。' },
  { id: 'fq29', q: '浏览器存储方案对比（cookie / localStorage / sessionStorage / IndexedDB）', keywords: ['存储', 'cookie', 'localStorage', 'indexedDB'],
    a: '**cookie**：每次请求自动携带，容量 ~4KB，可设过期/HttpOnly/SameSite，适合鉴权 token；有性能与安全风险。\n\n**localStorage**：~5MB，永久（手动清），同源共享，仅字符串，适合轻量持久化。\n\n**sessionStorage**：同标签页生命周期，关闭即清。\n\n**IndexedDB**：结构化大数据、异步、支持事务与索引，适合离线缓存/大文件。\n\n**选型**：鉴权用 cookie（HttpOnly）；简单偏好用 localStorage；大数据用 IndexedDB。' },
  { id: 'fq30', q: 'CSS 实现水平垂直居中的多种方案', keywords: ['居中', 'flex', 'grid', 'transform'],
    a: '**flex**：`display:flex; align-items:center; justify-content:center`（最常用）。\n\n**grid**：`display:grid; place-items:center`。\n\n**绝对定位 + transform**：`top/left:50%; transform:translate(-50%,-50%)`（不知尺寸时）。\n\n**绝对定位 + margin:auto**：已知宽高时 `top/right/bottom/left:0; margin:auto`。\n\n**line-height**（单行文本）：`text-align:center; line-height:容器高`。\n\n现代项目首选 flex/grid。' },
  { id: 'fq31', q: 'requestAnimationFrame 与 setTimeout 的区别', keywords: ['raf', 'requestAnimationFrame', 'setTimeout', '动画'],
    a: '**rAF**：浏览器在下一次重绘前调用，与刷新率同步（通常 60fps），页面隐藏时暂停，适合动画。\n\n**setTimeout**：按延时入宏任务队列，受事件循环与节流影响，精度差、后台仍跑，易丢帧或空转。\n\n**结论**：动画/逐帧更新用 rAF；定时轮询或延时逻辑用 setTimeout/setInterval。rAF 回调里改样式更顺滑、更省电。' },
  { id: 'fq32', q: '前端监控与错误上报怎么做？', keywords: ['监控', '错误上报', 'sentry', '性能'],
    a: '**错误捕获**：`window.onerror` / `error` 事件（资源加载错）+ `unhandledrejection`（Promise 未捕获）+ 框架钩子（Vue errorHandler / React 错误边界）。\n\n**性能监控**：`Performance API`、`web-vitals`（LCP/INP/CLS/FCP/TTFB）。\n\n**上报**：`navigator.sendBeacon`（页面卸载也能发，不阻塞）+ 采样降频 + 去重。\n\n**实践**：接 Sentry/自研采集，附上下文（版本、路由、UA、堆栈 sourcemap 映射），用 Source Map 还原压缩后错误。' },
  { id: 'fq33', q: '大文件上传与断点续传如何实现？', keywords: ['大文件', '断点续传', '切片', '上传'],
    a: '**切片上传**：File.slice 把文件切成块（如 5MB），并发/串行上传，后端按 offset 合并。\n\n**断点续传**：上传前先计算文件 hash（如 spark-md5），向后端查"已上传哪些分片"，只传缺失部分。\n\n**加速**：并发分片 + 失败重试；大文件用 Web Worker 计算 hash 避免卡 UI。\n\n**校验**：全部分片到位后合并并比对总 hash 防止损坏。秒传：hash 已存在直接返回完成。' },
  { id: 'fq34', q: 'Web Components 是什么？与主流框架关系？', keywords: ['web components', 'custom elements', 'shadow dom'],
    a: '**三件套**：Custom Elements（自定义标签）、Shadow DOM（封装样式/结构隔离）、HTML Templates（<template>）。原生标准，框架无关、可跨项目复用。\n\n**与框架关系**：框架（Vue/React）是"编译/运行时生态"，Web Components 是"浏览器原生组件"。二者可互嵌（Vue 可编译为 Web Component 发布）。\n\n**适用**：需要跨技术栈复用的基础组件（设计系统）、第三方嵌入 widget。局限：生态与 DX 不如框架成熟。' },
  { id: 'fq35', q: 'Tree Shaking 的原理与前提', keywords: ['tree shaking', '摇树', 'ESM', 'dead code'],
    a: '**原理**：打包器在编译期通过静态分析 ESM 的 import/export 依赖图，标记并剔除"未被引用的导出代码"（dead code elimination）。\n\n**前提**：\n- 必须用 ESM（`import/export`），CJS 因运行时加载无法静态分析\n- `package.json` 设 `"sideEffects": false`（或列出有副作用文件），否则打包器保守保留\n- 避免动态导入破坏静态性\n\n**验证**：构建后用分析器看是否真删掉了未用导出。' },
  { id: 'fq36', q: '首屏性能优化指标与手段（FCP/LCP/INP/CLS）', keywords: ['首屏', '性能', 'LCP', 'INP', 'CLS', '指标'],
    a: '**核心 Web 指标**：FCP（首次内容绘制）、LCP（最大内容绘制，<2.5s）、INP（交互延迟，<200ms，替代 FID）、CLS（视觉稳定性，<0.1）、TTFB（首字节）。\n\n**手段**：\n- 路由懒加载、关键 CSS 内联、非关键资源 defer/async\n- 图片响应式 + WebP/AVIF + 懒加载 + 占位避免 CLS\n- 预连接/preload 关键资源、CDN、HTTP2\n- 减少长任务（拆分、Web Worker），交互即时反馈降 INP' },
  { id: 'fq37', q: 'JS 原型链与继承的实现方式', keywords: ['原型链', 'prototype', '__proto__', '继承'],
    a: '**原型链**：对象通过 `__proto__`（即 [[Prototype]]）指向其构造函数的 `prototype`，属性查找沿链向上，直到 `Object.prototype` 为null。\n\n**继承方式**：\n- 构造函数 + `Child.prototype = Object.create(Father.prototype)`（经典，需修复 constructor）\n- ES6 `class extends`（语法糖，底层仍是原型）\n- 组合/寄生组合继承避免多次调用父类\n\n**注意**：优先用 class；共享引用类型属性要小心；`instanceof` 基于原型链判断。' },
  { id: 'fq38', q: '事件委托（事件代理）的原理与优势', keywords: ['事件委托', '事件代理', '冒泡'],
    a: '**原理**：利用事件冒泡，把子元素事件统一绑定到父容器，通过 `event.target` 判断实际触发元素。\n\n**优势**：\n- 减少监听器数量（性能、内存）\n- 动态增删子元素无需重新绑定\n- 代码更简洁\n\n**注意**：不是所有事件都冒泡（focus/blur 不冒泡，可用 focusin/focusout 替代）；阻止冒泡要谨慎。适合列表/表格等大量同类子节点。' },
  { id: 'fq39', q: 'CSS 优先级与层叠规则', keywords: ['优先级', 'specificity', '层叠', '!important'],
    a: '**优先级（specificity）**：内联样式 > ID(#) > 类/属性/伪类(.) > 元素/伪元素。同级后者覆盖前者。\n\n**!important**：强制最高，但滥用难维护；覆盖 !important 需更高优先级 + !important 或内联 + !important。\n\n**层叠顺序**：来源权重（作者 > 用户 > 浏览器默认）；同权重看 specificity；再同看声明顺序。\n\n**实践**：用 class 而非内联，避免 !important，用 BEM 降低冲突。' },
  { id: 'fq40', q: '单点登录（SSO）的实现思路', keywords: ['SSO', '单点登录', 'OAuth', 'CAS', 'token'],
    a: '**目标**：一次登录，多系统通行。\n\n**主流方案**：\n- **CAS/中心认证**：未登录跳转认证中心，登录后带 Ticket，各系统用 Ticket 换用户信息\n- **OAuth2/OIDC**：第三方授权（微信/Google 登录），OIDC 在其上加身份令牌 id_token\n- **JWT + 网关**：登录发 JWT，各服务/网关校验签名，无状态\n\n**跨域 Cookie**：用 SameSite=None;Secure 或中心域种 Cookie + 子域共享。注意 token 安全（HTTPS、短时效、刷新）。' },
  { id: 'fq41', q: '微前端架构及其落地方案', keywords: ['微前端', 'micro-frontend', 'qiankun', 'module federation'],
    a: '**动机**：巨应用中按团队/业务拆分独立开发部署、技术栈无关。\n\n**核心问题**：路由隔离、JS 沙箱（防全局污染）、样式隔离（Shadow DOM / 加前缀）、应用通信（props/自定义事件/全局 store）。\n\n**方案**：\n- qiankun（基于 single-spa，HTML Entry）\n- Webpack 5 Module Federation（模块级共享，运行时组合）\n- Web Components 封装\n\n**权衡**：增加复杂度与性能开销，中小项目不必上；先考虑模块/monorepo 拆分。' },
]
// 前端 special fs7..fs15
const feSpecial = [
  { id: 'fs7', q: '如何实现一个高性能的无限滚动列表（虚拟列表）？', keywords: ['虚拟列表', 'virtual list', '性能'],
    a: '**核心**：只渲染可视区 + 缓冲区的少量 DOM，而非全量。\n\n**步骤**：\n1. 容器定高（或动态测量），算出总高度撑出滚动条\n2. 根据 scrollTop 与每项高度，计算 startIndex/endIndex\n3. 仅渲染 [start-buffer, end+buffer] 的节点，用 transform: translateY 定位偏移\n4. 滚动时节流更新区间\n\n**变体**：定高（最简单）、不定高（用预估+实测修正偏移）。库：vue-virtual-scroller / react-window。' },
  { id: 'fs8', q: '设计一个前端鉴权方案（登录态、路由守卫、刷新）', keywords: ['鉴权', 'token', 'refresh', '路由守卫'],
    a: '**方案**：访问令牌 accessToken（短时效，放内存/请求头）+ 刷新令牌 refreshToken（长时效，放 HttpOnly Cookie）。\n\n**流程**：请求带 accessToken；401 用 refreshToken 静默换新；换新失败跳转登录。\n\n**路由守卫**：进入受保护页先校验登录态，未登录重定向；结合权限表控制可见菜单。\n\n**注意**：HTTPS 传输、防 XSS 盗 token（accessToken 不放 localStorage 更安全）、refresh 防并发重放。' },
  { id: 'fs9', q: '实现一个并发限制的 Promise 调度器（如并发 3）', keywords: ['调度器', '并发限制', 'promise', 'pool'],
    a: '**思路**：维护一个正在执行的计数与等待队列。\n\n```js\nclass Scheduler {constructor(n){this.max=n;this.run=0;this.q=[]}\nasync add(task){return new Promise(res=>{this.q.push({task,res});this._run()})}\n_run(){while(this.run<this.max&&this.q.length){const{任务,res}=this.q.shift();this.run++;任务().then(res).finally(()=>{this.run--;this._run()})}}}\n```\n\n**考察**：用队列 + 计数替代粗暴 `Promise.all`（后者不等空闲槽），常用于批量请求限流。' },
  { id: 'fs10', q: '大表单（上百字段）性能优化', keywords: ['大表单', '性能', '受控', 'rerender'],
    a: '**痛点**：受控组件每次输入触发整页 re-render。\n\n**优化**：\n- 拆分表单为子组件 + React.memo，缩小重渲染范围\n- 用非受控（ref 取值）或局部 state 隔离高频字段\n- 虚拟列表渲染长选项；懒校验（失焦/提交时）\n- 防抖提交；用 Form 库（Formik/vee-validate）统一管理与校验\n- 字段多时分步骤（Wizard）降低单次 DOM 量' },
  { id: 'fs11', q: '实现一个可撤销/重做的操作栈', keywords: ['撤销', '重做', 'undo', '命令模式'],
    a: '**命令模式**：每个操作封装为 {do, undo}，压入 undoStack；撤销时 pop 执行 undo 并压入 redoStack；新操作清空 redoStack。\n\n**简化（快照法）**：对状态做不可变快照存栈（适合小状态）。\n\n**边界**：限制栈深防内存膨胀；连续同类操作可合并（如拖拽只记起止）。\n\n典型应用：富文本编辑器、画布、表单草稿。' },
  { id: 'fs12', q: '页面白屏如何排查？', keywords: ['白屏', '排查', '崩溃', '空白'],
    a: '**分层定位**：\n1. 看 Network：资源 404/JS 报错/大文件超时？看 Console 是否有未捕获异常导致 Vue/React 根挂掉\n2. 看 HTML 是否渲染（DOM 有无根节点）——区分"JS 崩溃"与"路由/数据问题"\n3. 慢白屏：首屏过大、接口阻塞、死循环\n4. 用骨架屏/错误边界兜底；接入监控（白屏检测：定时采样根节点子节点数）\n\n**常见根因**：打包 chunk 加载失败、全局变量污染、死循环、SSR 注水不匹配。' },
  { id: 'fs13', q: '设计一个前端多级缓存策略', keywords: ['缓存策略', 'memory', 'localStorage', 'sw'],
    a: '**分层**：\n1. 内存缓存（Map/变量）：最快，页面生命周期内\n2. localStorage/sessionStorage：跨刷新、跨请求，轻量\n3. Service Worker + Cache API：离线/网络回退\n4. HTTP 缓存：协商/强缓存（配合后端）\n\n**策略**：读顺序 内存→SW→localStorage→网络；写回逐层；设 TTL 与版本号防脏数据；敏感数据不落本地。适合"配置/字典/静态数据"类。' },
  { id: 'fs14', q: '实现一个发布-订阅（EventBus）模式', keywords: ['发布订阅', 'eventbus', '观察者'],
    a: '**结构**：一个中心对象维护 `events: { type: [handlers] }`。\n- `on(type, fn)` 订阅；`off(type, fn)` 取消；`emit(type, payload)` 通知全部；`once` 一次性。\n\n**要点**：事件名规范避免冲突；组件卸载务必 off 防内存泄漏与重复触发；可加错误处理包裹 handler。\n\n**应用**：跨组件轻量通信、SDK 回调。中大型建议用状态管理或框架原生机制替代裸 EventBus。' },
  { id: 'fs15', q: '手写一个 LRU 缓存', keywords: ['LRU', '缓存', 'Map', '算法'],
    a: '**思想**：最近使用的放前面，超容量时淘汰最久未用。\n\n**实现（JS）**：用 `Map` 的有序性——`get` 命中时 `delete` 再 `set`（移到末尾）；`set` 超限时 `Map.keys().next().value` 删除最旧。\n\n```js\nclass LRU{constructor(n){this.n=n;this.m=new Map()}\nget(k){if(!this.m.has(k))return -1;const v=this.m.get(k);this.m.delete(k);this.m.set(k,v);return v}\nset(k,v){if(this.m.has(k))this.m.delete(k);this.m.set(k,v);if(this.m.size>this.n)this.m.delete(this.m.keys().next().value)}}\n```' },
]
// 后端 hot bq15..bq41
const beHot = [
  { id: 'bq15', q: 'REST 与 GraphQL 的区别与选型', keywords: ['REST', 'GraphQL', 'API', '选型'],
    a: '**REST**：以资源 URL + HTTP 动词，多端点、固定返回结构，缓存友好（HTTP 缓存）、生态成熟。\n\n**GraphQL**：单一端点，客户端用 schema 精确声明所需字段，解决"过度/不足获取"。\n\n**取舍**：前端多端字段差异大、聚合多数据源 → GraphQL 省往返；简单 CRUD、强缓存需求、公开 API → REST 更省心。GraphQL 需自己解决 N+1（DataLoader）、限流、缓存复杂度。' },
  { id: 'bq16', q: '为什么 MySQL 索引用 B+ 树而不是 B 树或哈希？', keywords: ['索引', 'B+树', 'B树', '哈希'],
    a: '**B+ 树优势**：\n- 非叶子节点只存 key，单节点能放更多索引项 → 树更矮、IO 更少\n- 叶子节点用链表串联，范围查询/全表扫描极快（B 树数据散落各层，范围查询要中序遍历）\n- 查询稳定（都落到叶子层）\n\n**哈希索引**：等值极快，但不支持范围/排序/最左前缀，故仅 Memory/适配特定场景。\n\n**结论**：B+ 树在"范围+排序+磁盘友好"上综合最优，契合关系型查询。' },
  { id: 'bq17', q: '乐观锁与悲观锁的区别与实现', keywords: ['乐观锁', '悲观锁', 'version', 'CAS'],
    a: '**悲观锁**：操作前先加锁（SELECT ... FOR UPDATE、synchronized），假设冲突多，安全但并发低。\n\n**乐观锁**：不加锁，提交时校验（版本号/时间戳/CAS）。如 `UPDATE ... SET ver=ver+1 WHERE id=? AND ver=old`，影响行数为 0 即冲突重试。\n\n**选型**：读多写少、冲突少 → 乐观锁（高并发）；冲突频繁/强一致 → 悲观锁。库存扣减常用"乐观锁 + 重试"或 Redis 预扣。' },
  { id: 'bq18', q: 'Redis 常用数据结构与应用场景', keywords: ['Redis', '数据结构', 'zset', '应用'],
    a: '**String**：缓存、计数器（INCR）、分布式锁（SET NX）。\n**Hash**：对象属性（用户资料）。\n**List**：队列、最新列表（LPUSH+LRANGE）。\n**Set**：去重、共同好友（SINTER）、抽奖。\n**ZSet（有序集合）**：排行榜（ZADD+ZREVRANGE）、延迟队列（score=执行时间）、优先级任务。\n**BitMap/HyperLogLog/Geo**：签到、UV 估算、附近的人。\n\n**要点**：按场景选结构，善用过期与内存淘汰策略。' },
  { id: 'bq19', q: '缓存与数据库一致性如何保证？', keywords: ['一致性', '双写', '延迟双删', 'canal'],
    a: '**更新策略**（优先级从高）：\n1. 先更新 DB，再删缓存（Cache-Aside，读时回填）；最常用\n2. 延迟双删：更新 DB → 删缓存 → 延时(几百ms)再删一次，防旧值回填\n3. 订阅 binlog（Canal）异步删/更新缓存，解耦\n\n**为什么删不是写**：避免"写缓存与写 DB 时序导致脏数据"。\n\n**强一致**：用分布式锁或事务型缓存（如阿里 Tair），代价高，大多数业务最终一致即可。' },
  { id: 'bq20', q: '限流算法：令牌桶与漏桶', keywords: ['限流', '令牌桶', '漏桶', '滑动窗口'],
    a: '**令牌桶**：按固定速率往桶里放令牌，请求取令牌才放行，空则拒绝/排队；支持突发（桶里攒的令牌）。\n\n**漏桶**：请求入桶，以恒定速率流出处理，桶满则丢弃；平滑输出，不支持突发。\n\n**其他**：计数器/滑动窗口（统计时间窗内请求数，防突刺）。\n\n**落地**：网关层（Nginx/网关）、Sentinel/Guava RateLimiter；令牌桶最常用（兼顾限流与突发）。' },
  { id: 'bq21', q: 'CAP 理论 与 BASE 理论', keywords: ['CAP', 'BASE', '一致性', '可用性'],
    a: '**CAP**：分布式系统在**网络分区(P)**发生时，只能在**一致性(C)**与**可用性(A)**间二选一。CA（无分区）理想但现实必有分区，故常选 AP 或 CP。\n\n**BASE**：基本可用(BA)、软状态(S)、最终一致(E)——对 CAP 中 AP 的延伸，接受短期不一致换高可用。\n\n**实践**：金融核心选 CP（强一致，如 ZooKeeper）；电商/社交选 AP + 最终一致（如 DynamoDB/Cassandra）。' },
  { id: 'bq22', q: '负载均衡策略有哪些？', keywords: ['负载均衡', '轮询', '一致性哈希', 'LB'],
    a: '**策略**：轮询、加权轮询、随机、最少连接、源 IP 哈希（会话保持）、响应时间优先、一致性哈希（扩缩容时最小化 key 重映射）。\n\n**层级**：L4（传输层，IP/端口，快）、L7（应用层，URL/Header，灵活）。\n\n**组件**：Nginx/HAProxy/LVS、云 ALB、Service Mesh sidecar。\n\n**要点**：无状态服务用轮询/最少连接；有状态/缓存命中敏感用一致性哈希。' },
  { id: 'bq23', q: '如何设计一个短链系统？', keywords: ['短链', '设计', '发号器', '301'],
    a: '**核心**：长链 → 短码（如 6 位 62 进制），存映射，访问短链 301/302 跳转到长链。\n\n**发号**：自增 ID 转 62 进制；或分布式发号器（雪花/号段）。\n\n**优化**：长链哈希去重（同长链复用短码）；缓存热点映射（Redis）；301（永久，省流量但难统计）/302（可统计点击）。\n\n**容量**：6 位 62 进制 ≈ 568 亿，足够。注意防遍历/滥用与黑名单。' },
  { id: 'bq24', q: 'JWT 的原理、结构与优缺点', keywords: ['JWT', 'token', '签名', '认证'],
    a: '**结构**：Header.Payload.Signature，三段 Base64Url。Signature = HMAC/RSA(Header.Payload, 密钥)，防篡改。\n\n**优点**：无状态（服务端不存会话）、易跨服务、适合分布式/网关校验。\n\n**缺点**：\n- 签发后难主动失效（需短时效 + 黑名单/刷新机制）\n- Payload 仅 Base64 可解码，**不要放敏感信息**\n- 体积比 sessionId 大\n\n**实践**：accessToken 用 JWT 短时效，refreshToken 用服务端可吊销方案。' },
  { id: 'bq25', q: 'MySQL 慢查询如何排查与优化？', keywords: ['慢查询', 'explain', '索引', '优化'],
    a: '**定位**：开启慢查询日志（slow_query_log + long_query_time），用 `EXPLAIN` 看执行计划（关注 type 是否 ALL 全表、key 是否走索引、rows 估算、Extra 的 Using filesort/temp）。\n\n**优化**：\n- 加合适的索引（最左前缀、覆盖索引避免回表）\n- 避免索引失效（函数/隐式转换/前导模糊 `%x`）\n- 减少 `SELECT *`、分页深翻用游标/延迟关联\n- 大表拆分、读写分离、SQL 重写\n\n**验证**：优化后对比 cost/rows 与真实耗时。' },
  { id: 'bq26', q: '分库分表的设计与落地', keywords: ['分库分表', 'sharding', '水平拆分', 'MyCat'],
    a: '**为何**：单表过大（千万级+）致索引膨胀、写入瓶颈。\n\n**垂直拆分**：按业务/字段拆（冷热分离）。\n**水平拆分**：按分片键（user_id 哈希、时间范围）把行分到多表/库。\n\n**分片键选择**：高基数的查询维度，避免跨片查询。\n\n**痛点**：分布式事务、跨片 JOIN、全局唯一 ID（雪花）、聚合统计难。\n\n**工具**：ShardingSphere/MyCat；能用分区表/读写分离先别急着分表。' },
  { id: 'bq27', q: 'Kafka / RabbitMQ / RocketMQ 的选型差异', keywords: ['消息队列', 'Kafka', 'RabbitMQ', 'RocketMQ'],
    a: '**Kafka**：高吞吐、持久化、流式（日志/埋点/大数据管道），分区有序、消费组水平扩展；事务消息弱。\n\n**RabbitMQ**：低延迟、灵活路由（Exchange 多种模式）、易用，适合业务级任务队列；吞吐量中等。\n\n**RocketMQ**：阿里系，高可用+事务消息+定时/延迟消息，强一致场景（订单、金融），Java 生态友好。\n\n**选型**：日志/流 → Kafka；复杂路由业务 → RabbitMQ；电商事务 → RocketMQ。' },
  { id: 'bq28', q: '如何设计一个高并发秒杀系统？', keywords: ['秒杀', '高并发', '库存', '削峰'],
    a: '**分层削峰**：\n1. 前端：按钮防重复、答题/验证码、静态化\n2. 网关：限流、黑名单、风控\n3. 后端：Redis 预扣库存（原子 DECR）+ 消息队列异步下单，数据库只在最终落单介入\n4. 库存：用 Redis 原子扣减，扣减成功才进 MQ，失败直接返回售罄\n\n**防超卖**：Redis Lua 原子校验+扣减；落库用乐观锁/行锁兜底。\n\n**要点**：读多写少、把流量挡在 DB 之前。' },
  { id: 'bq29', q: 'TCP 三次握手与四次挥手', keywords: ['TCP', '三次握手', '四次挥手', '连接'],
    a: '**三次握手（建连）**：SYN → SYN+ACK → ACK。防止历史连接、确认双方收发能力。\n\n**四次挥手（断连）**：FIN → ACK → FIN → ACK。因为 TCP 全双工，关闭需双向各发 FIN；被动方可能还有数据要发，故 ACK 与 FIN 分两次。\n\n**TIME_WAIT**：主动关闭方最后等 2MSL，确保对端收到 ACK、让旧报文消散；高并发短连接易堆积，可调 `tcp_tw_reuse` 或端口复用。' },
  { id: 'bq30', q: 'HTTPS 的加密流程（TLS 握手）', keywords: ['HTTPS', 'TLS', '握手', '证书'],
    a: '**目标**：用非对称协商出对称密钥，再用对称加密传数据（兼顾安全与性能）。\n\n**RSA 版流程**：客户端 Hello → 服务端发证书（含公钥）→ 客户端验证证书（CA 链）→ 用公钥加密 premaster 发回 → 双方算出对称密钥 → 加密通信。\n\n**ECDHE 版（现代）**：用 DH 交换得到共享密钥，提供前向安全（私钥泄露也无法解密历史流量）。\n\n**证书**：CA 签名保证服务端身份，防中间人。' },
  { id: 'bq31', q: '进程、线程、协程的区别', keywords: ['进程', '线程', '协程', 'goroutine'],
    a: '**进程**：资源分配最小单位，独立地址空间，切换开销大，隔离强。\n**线程**：CPU 调度最小单位，同进程内共享内存，切换比进程轻，但需处理竞态（锁）。\n**协程（goroutine/async）**：用户态轻量线程，由运行时调度，创建成本极低（KB 级）、切换不进内核，适合高并发 IO。\n\n**取舍**：CPU 密集用多进程/多线程；IO 密集用协程/异步（Go/Python asyncio）百万级并发。' },
  { id: 'bq32', q: '数据库事务的 ACID 是什么？', keywords: ['ACID', '事务', '隔离', '持久性'],
    a: '**A 原子性**：事务内操作要么全成要么全败（undo log 回滚）。\n**C 一致性**：事务前后数据满足约束（业务层+DB 约束共同保证）。\n**I 隔离性**：并发事务互不干扰，由隔离级别 + 锁/MVCC 实现。\n**D 持久性**：提交后数据永久保存（redo log + 刷盘）。\n\n**落地**：InnoDB 用 undo log 保原子/一致、redo log 保持久、MVCC+锁保隔离。' },
  { id: 'bq33', q: '什么是幂等性？如何保证接口幂等？', keywords: ['幂等', 'idempotent', '防重', 'token'],
    a: '**定义**：同一请求重复提交，结果一致、副作用只发生一次。\n\n**保证手段**：\n- 天然幂等：GET/查询、带唯一约束的 INSERT\n- 唯一键 + 冲突忽略（如订单号唯一）\n- token 机制：下单前发 token，提交校验并删除，防重复提交\n- 状态机：只在特定状态才允许流转（已支付不再扣）\n- 乐观锁 version 校验\n- 去重表/Redis SETNX 标记已处理请求号\n\n**场景**：支付、下单、消息消费（MQ 至少一次需消费侧幂等）。' },
  { id: 'bq34', q: 'Spring 中 Bean 的作用域与线程安全', keywords: ['bean', 'scope', 'singleton', '线程安全'],
    a: '**作用域**：singleton（默认，单例）、prototype（每次新实例）、request/session/application（Web 作用域）。\n\n**线程安全**：singleton Bean 被多线程共享，若含可变成员状态（如类字段计数器）则非线程安全；无状态 Bean（仅方法、无共享可变字段）天然安全。\n\n**实践**：Controller/Service 多为无状态单例；需要状态用 prototype 或 ThreadLocal；避免在单例里写可变共享字段。' },
  { id: 'bq35', q: '什么是 N+1 查询问题？如何解决？', keywords: ['N+1', 'ORM', '预加载', 'join'],
    a: '**问题**：ORM 查 N 条主记录后，逐条再查关联（共 N+1 次 SQL），性能灾难。\n\n**解决**：\n- 预加载/Eager Load（JOIN 一次查出，如 Hibernate fetch / Laravel with / TypeORM leftJoinAndSelect）\n- 批量查询（IN (…) 一次取关联）\n- GraphQL 用 DataLoader 合并\n- 冗余字段/缓存关联数据\n\n**识别**：开启 SQL 日志看循环里的查询；用 APM 抓慢点。' },
  { id: 'bq36', q: '如何设计一个限流 + 熔断 + 降级的稳定性体系？', keywords: ['熔断', '降级', '限流', '稳定性'],
    a: '**限流**：挡住超额流量（令牌桶/网关），保护系统。\n**熔断**（如 Sentinel/Hystrix）：错误率/慢调用超阈值则"开路"快速失败，半开试探恢复，防雪崩。\n**降级**：非核心功能在压力下关闭或返回兜底（默认数据/静态页）。\n\n**配合**：限流在前、熔断在中、降级兜底；配合超时、重试（带退避）、舱壁隔离（线程池隔离防互相拖垮）。核心是"fail fast + 有损服务保主流程"。' },
  { id: 'bq37', q: 'DNS 解析过程', keywords: ['DNS', '解析', '递归', '迭代'],
    a: '**链路**：浏览器缓存 → 系统 hosts → 本地 DNS  resolver → 根域 → 顶级域(.com) → 权威域，逐层拿到 IP。\n\n**递归 vs 迭代**：客户端到本地 DNS 通常是递归（替你查到底）；本地 DNS 向上游多用迭代（问根"你去问 .com"）。\n\n**优化**：DNS 缓存（TTL）、DNS 预解析（<link rel=dns-prefetch>）、HTTPDNS 防劫持/提速（App 常用）。' },
  { id: 'bq38', q: '正向代理与反向代理的区别', keywords: ['代理', '正向代理', '反向代理', 'nginx'],
    a: '**正向代理**：代表**客户端**访问外部（隐藏客户端、翻墙、内网出网），客户端感知、服务端不知真实用户。\n\n**反向代理**：代表**服务端**接收请求（Nginx 负载均衡、SSL 卸载、缓存、隐藏后端、安全防护），客户端以为在连它。\n\n**一句话**：正向代理藏 client，反向代理藏 server。' },
  { id: 'bq39', q: '什么是雪花算法（Snowflake）？', keywords: ['雪花算法', '分布式ID', 'snowflake'],
    a: '**目标**：分布式下生成全局唯一、趋势递增的 64 位 ID。\n\n**结构**：1 位符号 + 41 位时间戳（ms，可用 ~69 年）+ 10 位机器 ID（机房+节点）+ 12 位序列号（同 ms 内 4096 个）。\n\n**优点**：不依赖 DB、高性能、有序利于索引。\n**缺点**：依赖时钟，时钟回拨会冲突（需校验/等待）。\n**替代**：号段模式（Leaf-segment）、UUID（无序、量大索引慢）。' },
  { id: 'bq40', q: '数据库死锁的产生与排查', keywords: ['死锁', '锁', '排查', '事务'],
    a: '**产生**：两个事务互相等待对方持有的锁（如 A 锁行1等行2，B 锁行2等行1），形成循环等待。\n\n**排查**：`SHOW ENGINE INNODB STATUS` 看最近死锁；开启 `innodb_print_all_deadlocks`；慢日志/APM 抓异常。\n\n**预防**：\n- 约定统一加锁顺序（都先锁 A 再锁 B）\n- 缩短事务、尽快提交\n- 降低隔离级别（RC 减少锁）\n- 单次锁更少行、用索引避免锁升级\n- 捕获死锁异常重试' },
  { id: 'bq41', q: '如何做服务的优雅下线（graceful shutdown）？', keywords: ['优雅下线', 'graceful', '信号', 'drain'],
    a: '**目标**：停止接收新请求、处理完在途请求、释放资源后再退出，避免 502/数据中断。\n\n**步骤**：\n1. 收到 SIGTERM 先摘流量（从注册中心/负载均衡下线，健康检查失败）\n2. 停止 accept 新连接，等待活跃请求完成（设超时上限）\n3. 关闭连接池、释放文件/锁\n4. 超时强制退出\n\n**K8s**：preStop hook + readinessProbe=false 先排空再停容器。' },
]
// 后端 special bs7..bs15
const beSpecial = [
  { id: 'bs7', q: '设计一个支持百万并发的长连接（IM/推送）网关', keywords: ['长连接', 'IM', '推送', 'netty', '网关'],
    a: '**连接层**：用 Netty/Go 百万级 epoll 单线程多路复用，每连接内存压到 KB 级（避免线程-per-connection）。\n\n**会话**：连接与用户映射存内存（分片）+ 心跳保活（60s）；多节点用一致性哈希定位用户所在网关。\n\n**消息投递**：网关间用 MQ/内部 RPC 转发；下行经连接所在节点 push。\n\n**可用性**：连接打散到多节点、故障自动重连；消息用 QoS（至少一次/至多一次）保证可达。\n\n**扩展**：协议用 WebSocket/自定义二进制，TLS 卸载在 LB。' },
  { id: 'bs8', q: '实现一个分布式锁（Redis / ZooKeeper）', keywords: ['分布式锁', 'redis', 'redlock', 'zookeeper'],
    a: '**Redis 版**：`SET key val NX EX ttl` 原子加锁；解锁用 Lua 脚本校验持有者再删（防误删别人锁）；锁需有唯一 token + 看门狗自动续期（如 Redisson）。\n\n**隐患**：主从切换可能丢锁 → Redlock（多实例多数派）但仍有争议；要求不绝对可接受的场景够用。\n\n**ZK/etcd 版**：临时顺序节点 + 最小者获锁 + watch 前一节点，会话断自动释放，更严谨但吞吐低。\n\n**选型**：高并发弱一致用 Redis；强一致用 ZK/etcd。' },
  { id: 'bs9', q: '设计一个短网址 + 访问统计系统', keywords: ['短链', '统计', '计数', '设计'],
    a: '**短链**：见基础题发号 + 映射存储（Redis 缓存 + DB 持久）。\n\n**统计**：点击量异步上报，写 MQ → 消费端累加（Redis INCR + 定时落库）；明细用列式/ES 做多维分析（时间/地域/来源）。\n\n**高并发写入**：本地聚合 + 批量刷；或写 Kafka 再按分钟窗口统计。\n\n**展示**：近实时用 Redis 计数，历史用预聚合表。注意 UV 用 HyperLogLog 近似、去重。' },
  { id: 'bs10', q: '如何保证消息队列不重复消费、不丢失？', keywords: ['MQ', '幂等', '不丢失', 'ack'],
    a: '**不丢失**：\n- 生产者：确认机制（RabbitMQ confirm / Kafka acks=all + 重试）+ 本地消息表兜底\n- Broker：多副本同步刷盘（ISR）\n- 消费者：先处理业务再手动 ack，崩溃重投\n\n**不重复（消费幂等）**：利用 MQ"至少一次"特性，消费侧必须幂等——唯一键/去重表/Redis 标记 requestId/状态机。\n\n**顺序**：单分区单消费线程，或按业务 key 路由同一分区。' },
  { id: 'bs11', q: '设计一个配置中心（如 Nacos/Apollo）', keywords: ['配置中心', 'nacos', '动态配置', 'watch'],
    a: '**能力**：配置集中管理、动态推送、灰度、版本回滚、环境隔离。\n\n**结构**：服务端存配置（DB）+ 长连接/长轮询推送变更；客户端监听 + 本地缓存（断网可用）+ 变更回调热更新。\n\n**一致性**：配置发布用版本号/MD5 比对；推送失败客户端定时拉取兜底。\n\n**安全**：配置加密（敏感项）、权限控制。\n\n**价值**：避免改配置重发版，支持动态限流/开关。' },
  { id: 'bs12', q: '百万级数据如何做分页而不慢？', keywords: ['分页', '深翻页', '游标', 'keyset'],
    a: '**传统 LIMIT offset 深翻**：offset 越大越慢（要扫过前面所有行）。\n\n**优化**：\n- **游标/keyset 分页**：`WHERE id > lastId ORDER BY id LIMIT n`，走索引，稳定快（只能下一页）\n- **延迟关联**：先查主键 `SELECT id ... LIMIT 100000,10` 再 JOIN 取详情，减少回表\n- **覆盖索引**：查询字段全在索引内避免回表\n- 前端"无限滚动"用游标取代页码跳页\n- 极深历史用时间分区 + 归档' },
  { id: 'bs13', q: '设计一个短任务调度系统（类似 cron + 分布式）', keywords: ['调度', 'cron', 'quartz', '分布式'],
    a: '**单机**： Quartz/Timer 按 cron 触发。\n**分布式防重复**：用 DB/Redis 行锁或 ZK 选主，仅 leader 触发；或分片（每台机器负责部分任务 hash）。\n\n**可靠性**：任务执行记录 + 失败重试 + 超时告警；支持手动触发与暂停。\n\n**大规模**：时间轮（Netty HashedWheelTimer）做延时任务；XXL-JOB/Elastic-Job 提供分片、失败转移、可视化。\n\n**要点**：幂等（重复触发不重复执行）+ 可观测。' },
  { id: 'bs14', q: '如何做数据库读写分离与数据同步？', keywords: ['读写分离', '主从', 'binlog', '延迟'],
    a: '**架构**：一主多从，写走主库、读走从库，提升读吞吐。\n\n**同步**：主库 binlog → 从库 relay log → 重放（异步/半同步）。半同步降低数据丢失风险。\n\n**问题**：主从延迟导致"刚写读不到"——关键读（如支付后查余额）走主库；用强制走主注解。\n\n**路由**：中间件（MyCat/ShardingSphere/ProxySQL）按 SQL 类型自动分流；或代码层注解。\n\n**注意**：从库只读、监控延迟、从库故障自动剔除。' },
  { id: 'bs15', q: '设计一个短链 + 防刷的开放 API', keywords: ['开放API', '签名', '防刷', '限流'],
    a: '**鉴权**：API Key + 签名（防篡改：参数+timestamp+nonce 排序后 HMAC，服务端校验 timestamp 防重放、nonce 防重复）。\n\n**限流**：按 key/IP 令牌桶限流，超额返回 429。\n\n**防刷**：风控（行为/频率/设备指纹）、验证码/人机校验、IP 黑名单、WAF。\n\n**稳定性**：限流+熔断+降级；敏感操作二次校验。\n\n**可观测**：调用日志、成功率、P99 监控、异常告警。' },
]

function append(track, arr, key) {
  const bank = s.interview[track]
  if (!bank) { console.log('track missing:', track); return 0 }
  let n = 0
  for (const q of arr) {
    if (bank[key].some(x => x.id === q.id)) { console.log('skip(exists):', q.id); continue }
    bank[key].push(q); n++
  }
  return n
}
let added = 0
added += append('frontend', feHot, 'hot')
added += append('frontend', feSpecial, 'special')
added += append('backend', beHot, 'hot')
added += append('backend', beSpecial, 'special')

fs.writeFileSync(SEED, JSON.stringify(s, null, 2))
const counts = ['frontend', 'backend', 'devops'].map(t => {
  const b = s.interview[t]; return `${t}=${b.hot.length + b.special.length}`
}).join(' ')
console.log('ADDED fe+be:', added, '| current:', counts)
