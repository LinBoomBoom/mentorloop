# 第五章 · DOM 与浏览器 API（v1 学习层模板 · 已入库）

> 来源方向：官方 MDN / DOM 规范，事实不改写；价值层（心智模型/常见坑/对比/自测/面试）由学习层撰写。

---

## 选择器与节点操作

# 选择器与节点操作

## 心智模型
把 DOM 想成一座图书馆：`document` 是馆，每个标签是书。选择器就是"按索书号找书"（按 CSS 规则匹配），节点操作就是"把书放进书架 / 取走 / 换标签"。真正的难点从来不是"怎么找到"，而是"找到之后怎么安全地改，又不把整座馆弄乱"。

## 官方事实（MDN）
- `document.querySelector(selector)`：返回**第一个**匹配的元素，没有则 `null`；`querySelectorAll(selector)` 返回**静态 NodeList（类数组快照，不实时）**。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector>、<https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll>
- `getElementById` / `getElementsByClassName` / `getElementsByTagName` 返回 **HTMLCollection，是实时的**（DOM 变动会立刻反映到集合里）；而 `querySelectorAll` 是静态快照。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById>
- 节点增删改：`createElement`、`appendChild`（移动而非复制节点）、`append`（可一次加多个/文本节点）、`insertBefore`、`remove`、`cloneNode(deep)`、`replaceChild`。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement>
- 内容写入：`textContent`（只写文本，自动转义，安全）、`innerHTML`（解析 HTML，有 XSS 风险）。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent>、<https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML>
- 属性/类操作：`classList.add/remove/toggle/contains`、`dataset`（读写 `data-*`）、`setAttribute/getAttribute`。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Element/classList>、<https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset>
- 向上查找：`closest(selector)` 从自身开始向上找**最近的匹配祖先（含自身）**，是事件委托的利器。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Element/closest>

## 为什么重要 / 何时用
一切动态界面（渲染列表、增删元素、绑定交互）都从"选中谁、改他什么"开始。选择器选得准，后续代码才稳。

## 常见坑（雷区）
- **静态 vs 实时搞混**：`querySelectorAll` 拿到的是那一刻的快照，之后 DOM 变了它不更新；`getElementsByXxx` 是活的，循环里删元素时集合会同步收缩，容易导致 `i` 错位漏删。
- **`appendChild` 是移动，不是复制**：同一个节点再 `appendChild` 到别处，它会从原位置消失（要复制得先用 `cloneNode(true)`）。
- **`innerHTML` 拼用户输入 = XSS**：`el.innerHTML = '<img src=x onerror=alert(1)>'` 会执行；用户输入一律用 `textContent`，或先经 DOMPurify 等转义。
- **`cloneNode(false)` 只克隆自身、不克隆子节点**：想要整棵子树要传 `true`。

## 对比 / 决策表
| 场景 | 用 |
|---|---|
| 按 CSS 规则选中、需要静态集合 | `querySelector` / `querySelectorAll` |
| 频繁增删、基于类名批量操作且要实时反映 | `getElementsByClassName` |
| 只想要一个 id 元素（最快） | `getElementById` |
| 写用户输入文本 | `textContent`（安全） |
| 写可信 HTML 结构 | `innerHTML` |
| 动态内容里定位业务元素 | `closest`（从 target 往上找） |

## 动手自测
1. 给定 `<ul><li class="a">1</li><li class="a">2</li></ul>`，`document.querySelectorAll('.a').length` 是 2；现在 `ul.removeChild(ul.firstChild)` 后再查，结果仍是 2（因为快照不变）。把这行换成 `ul.getElementsByTagName('li')` 再查，结果是 1——体会实时与静态差异。
2. 合上想一想：`appendChild(node)` 把一个已挂在 B 处的节点 append 到 A，B 处还有它吗？

## 面试视角
高频题：`querySelectorAll` 返回的是数组吗？（不是，是 NodeList，有 `forEach` 但旧浏览器无 `map`，可 `Array.from` 转数组）；`innerHTML` 与 `textContent` 的安全差异；`getElementsByXxx` 与 `querySelectorAll` 的实时性区别；事件委托里为什么常用 `closest` 而非 `e.target` 直接判断。

---

---

## 事件机制与事件委托

# 事件机制与事件委托

## 心智模型
事件像一滴水，从 `window` 顶端落下经过各层（**捕获阶段**），触到最底下的目标元素（**目标阶段**），再一路冒回 `window`（**冒泡阶段**）。沿途任何一层只要装了"接水器"（监听器），都能接住这滴水。

## 官方事实（MDN）
- 事件流三阶段：**捕获（capture）** 从 `window` 往下到目标父级；**目标（target）** 在目标元素本身；**冒泡（bubble）** 从目标父级回到 `window`。来源：<https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener>
- `addEventListener(type, fn, useCapture)`：第三参为 `true` 表示在**捕获阶段**监听；省略/为 `false` 则在冒泡阶段。来源同上。
- `event.target`：事件**实际发生**的元素（最深的那层）；`event.currentTarget`：**监听器所绑定的**元素（处理事件时 `this` 等于它）。点击子元素时 `target` 是子、`currentTarget` 是绑了监听的祖先。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Event/target>、<https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget>
- `stopPropagation()`：**阻止事件在捕获和冒泡阶段进一步传播**（父/子不再收到），但**不阻止同元素上的其他监听器**（那要用 `stopImmediatePropagation`），也**不阻止默认行为**（那要用 `preventDefault`）。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation>、<https://developer.mozilla.org/en-US/docs/Web/API/Event/stopImmediatePropagation>
- `preventDefault()`：阻止浏览器默认行为（如表单提交跳转、链接跳转）。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault>
- 事件委托：在**共同祖先**上绑一个监听器，靠 `e.target` + 匹配判断，统一处理所有子元素事件——适合列表、动态内容、减少监听器数。

## 为什么重要 / 何时用
页面交互、列表点按、动态渲染后的元素绑定，全靠事件机制。不会委托，列表一变就得重新绑；不懂传播，就修不好"点了 A 却触发了 B"。

## 常见坑（雷区）
- **把监听绑错层级**：太靠上（如 `document`）→ `target` 判断复杂、易误伤；太靠下 → 失去委托意义、动态新增的子元素没绑定。
- **忘了 `target` 可能是内层**：`<li><span>文字</span></li>` 点击可能命中 `span`，要用 `e.target.closest('li')` 找回业务行。
- **`onclick=` 属性会覆盖**：多次赋值只留最后一个；而 `addEventListener` 同一事件可叠加多个，互不覆盖（移除要用同名函数引用）。
- **`stopPropagation` 用错**：想阻止默认行为却调了它（无效）；想阻止同元素其他监听器却只调了它（无效，应 `stopImmediatePropagation`）。

## 对比 / 决策表
| 方式 | 特点 | 建议 |
|---|---|---|
| `el.onclick = fn` | 会覆盖、只能一个、可控制 phase 否 | 不推荐（MDN 指为过时写法）|
| `addEventListener` | 可叠加、可捕获/冒泡、可 `once`/`passive`/`signal` | 现代标准写法 |
| 委托（祖先监听） | 减少监听数、兼容动态节点 | 列表/重复结构首选 |

## 动手自测
1. 给 `<ul>` 绑 `click` 监听，点 `<ul><li><b>x</b></li></ul>` 里的 `b`：`e.target` 是 `b`，`e.currentTarget` 是 `ul`。`e.target.closest('li')` 才是业务行。
2. 在 `ul` 的监听器里调 `e.stopPropagation()`，父级 `document` 上的同类型监听还会触发吗？（不会——已阻止冒泡到父级；但 `ul` 上若还有另一个 `click` 监听仍会执行，因为 `stopPropagation` 不拦同元素其他监听。）

## 面试视角
必考：事件流三阶段；`target` 与 `currentTarget` 区别；`stopPropagation` vs `stopImmediatePropagation`；事件委托的原理、优势与"动态元素无需重绑"；`addEventListener` 第三参数。

---

---

## 浏览器存储

# 浏览器存储

## 心智模型
浏览器给页面准备了几个"抽屉"：
- `localStorage` = 永久抽屉，关浏览器还在；
- `sessionStorage` = 会话抽屉，关标签页就清空；
- Cookie = 出门必带的便签，每次请求都跟着走；
- `IndexedDB` = 大仓库，能存海量结构化数据。

## 官方事实（MDN）
- `localStorage` / `sessionStorage`：同源、同步 API，键值对都是 **UTF-16 字符串**，约 5MB。区别：`localStorage` **无过期时间**；`sessionStorage` 在**页面会话结束（标签页关闭）时清除**；无痕模式下，最后一个无痕标签关闭也会清掉 `localStorage`。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>、<https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage>
- 同源与协议：`localStorage` 按**协议**区分，HTTP 与 HTTPS 同名站点拿到的是不同对象；若用户禁 Cookie，浏览器可能连 `localStorage` 也禁（抛 `SecurityError`）。
- `StorageEvent`：**只在其他同源标签页**触发，当前标签页写入不会收到自己的事件（跨 tab 同步的常见误区）。
- Cookie：约 **4KB**，随**每次 HTTP 请求**（含图片/`fetch`）自动带上；可设 `expires`/`Max-Age`、`secure`、`httpOnly`（JS 读不到）、`SameSite`。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie>
- `IndexedDB`：异步、可存**大量结构化数据**、事务模型，容量远大于 Web Storage。来源：<https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API>

## 为什么重要 / 何时用
登录态、购物车、草稿、偏好设置都要落地。选错存储 = 要么刷新就丢，要么把 Token 暴露给 XSS，要么大数组把主线程卡死。

## 常见坑（雷区）
- **存对象忘了 `JSON.stringify`**：Web Storage 只存字符串，直接 `setItem('k', {})` 会变成 `"[object Object]"`。
- **同步写入阻塞主线程**：循环写上千条到 `localStorage` 会卡 UI；大数据用 `IndexedDB`（异步）。
- **把 Token 放 `localStorage`**：任何 XSS 都能 `localStorage.getItem('token')` 盗走；敏感凭证优先 `httpOnly` Cookie（仍有 CSRF，需配合 `SameSite`）。
- **误以为当前 tab 能收到 `StorageEvent`**：只能靠轮询或 `storage` 监听"其他 tab"的变更。
- **容量超限**：`setItem` 超 5MB 抛 `QuotaExceededError`，需 `try/catch`。

## 对比 / 决策表
| 维度 | localStorage | sessionStorage | Cookie | IndexedDB |
|---|---|---|---|---|
| 生命周期 | 永久（除非清） | 关 tab 清 | 可设过期 | 永久 |
| 容量 | ~5MB | ~5MB | ~4KB | 很大（百 MB 级）|
| 同步/异步 | 同步 | 同步 | 同步 | 异步 |
| 随请求发送 | 否 | 否 | 是 | 否 |
| 服务端可读 | 否 | 否 | 是 | 否 |
| 典型用途 | 偏好/缓存 | 单会话态 | 凭证/跟踪 | 离线数据/大对象 |

## 动手自测
1. 在标签页 A 写 `localStorage.setItem('k','1')`，新开标签页 B 读得到吗？（同域读得到）；在 A 再开 tab 写后，B 监听 `window.addEventListener('storage', e=>...)` 能收到吗？A 自己写入时 A 能收到吗？（A 收不到，只有其他 tab 收得到。）
2. 关闭 tab 后 `sessionStorage` 还在吗？（不在）；`localStorage` 呢？（在。）

## 面试视角
必考：四种存储的区别；`localStorage` 容量与"同步阻塞"隐患；为什么 Token 不该存 `localStorage`；Cookie 的 `secure`/`httpOnly`/`SameSite` 各自防什么；`StorageEvent` 的跨 tab 限制。

---

---

## History API 与路由原理

# History API 与路由原理

## 心智模型
浏览器的历史记录是一摞卡片。`pushState` 是往最上面**叠一张新卡片**（改 URL、不刷新）；`replaceState` 是**换掉当前这张**；`popstate` 是你手动翻回旧卡片（前进/后退）时触发的回调。

## 官方事实（MDN）
- `history.pushState(state, title, url)`：向历史栈**压入一条新记录、修改 URL、不刷新页面、且不触发 `popstate`**。来源：<https://developer.mozilla.org/en-US/docs/Web/API/History/pushState>
- `history.replaceState(state, title, url)`：替换当前记录（不新增历史）。
- `popstate` 事件：仅在用户**前进/后退**（或 `history.back/forward/go`）**切换历史记录时**触发；`pushState`/`replaceState` **不会**触发它。可通过 `history.state` 读取当前状态。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event>
- 约束：`pushState` 的 URL **必须同源**，否则抛 `SecurityError`；哈希路由则用 `hashchange` 事件。

## 为什么重要 / 何时用
单页应用（SPA）靠它实现"URL 变了页面不刷新"的无缝导航。不懂原理就会写出"前进后退白屏""刷新 404"的路由。

## 常见坑（雷区）
- **以为 `pushState` 会触发 `popstate`**：不会。只有用户导航（前进/后退）才触发——所以"监听 popstate 来渲染"是对的，但"期望 push 后自动渲染对应视图"得自己手动调渲染函数。
- **刷新 404**：`pushState` 改的 URL 在刷新时会真的去请求服务器，若服务器没把未知路径 fallback 到 `index.html`，就 404。需要服务端做 history fallback（或改用 hash 路由免服务端配置）。
- **跨域 pushState 报错**：目标 URL 必须同源。
- **`title` 参数普遍被忽略**：多数浏览器不真的用第二参做标题，传 `''` 或 `null` 即可。

## 对比 / 决策表
| 维度 | History 路由（pushState） | Hash 路由（#/path） |
|---|---|---|
| URL 美观度 | 干净（无 #） | 带 # |
| 需服务器 fallback | 是（否则刷新 404） | 否（hash 不发给服务器）|
| 兼容性 | 现代浏览器足够 | 更老也行 |
| 事件 | `popstate` | `hashchange` |

## 动手自测
1. 控制台 `history.pushState(null,'','/foo')` 后，`location.pathname` 变了吗？（变了）；`popstate` 触发了吗？（没触发）；点浏览器后退，`popstate` 触发了吗？（触发了，且 `history.state` 回到上一条。）
2. 在 `/a` pushState 到 `/b` 后刷新页面，服务器返回什么？（请求的是 `/b` 的真实资源；无 fallback 则 404。）

## 面试视角
常考：`pushState` 与 `replaceState` 区别；`popstate` 何时触发、`pushState` 为何不触发；SPA history 路由刷新 404 的原因与解决方案（服务端 fallback / 用 hash）；history 路由与 hash 路由的取舍。

---

---

## 视口、尺寸与滚动

# 视口、尺寸与滚动

## 心智模型
每个元素是个盒子，测量它有三种口径：
- `client*` = 盒内"能看到的内容区+内边距"（不含边框、不含溢出、不含滚动条）；
- `offset*` = 连边框也算上；
- `scroll*` = 把溢出滚走的那部分内容也算进来（真实总高）。

## 官方事实（MDN）
- `clientHeight`：内容区 + `padding`，**不含 border、滚动条、溢出部分**。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Element/clientHeight>
- `offsetHeight`：`border + padding + 内容 + 横向滚动条`，含边框。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Element/offsetHeight>
- `scrollHeight`：元素**所有内容（含溢出不可见部分）的实际高度**。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight>
- `getBoundingClientRect()`：返回**相对视口**的 `top/right/bottom/left/width/height`，**会随滚动变化**。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect>
- 滚动控制：`scrollTop`/`scrollLeft`（可读写）、`scrollIntoView()`、`window.scrollTo()`、`element.scrollBy()`。
- 视口：`window.visualViewport` 反映可视视口（处理缩放、虚拟键盘）。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API>
- 观察者：`IntersectionObserver`（**异步**观察元素进出视口，替代频繁 scroll 监听）、`ResizeObserver`（观察尺寸变化）。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API>

## 为什么重要 / 何时用
无限滚动、吸顶导航、懒加载图片、判断"元素是否进入视口"、计算滚动进度——全都依赖这几组尺寸 API。

## 常见坑（雷区）
- **混用三种口径**：`scrollHeight - clientHeight` 才是可滚动的最大距离；拿 `offsetHeight` 算会差一截。
- **`getBoundingClientRect().top` 是相对视口**：它会随滚动变；要"相对文档"得加上 `window.scrollY`。
- **scroll 监听里频繁 `getBoundingClientRect` + 重排**：触发强制同步布局，卡顿；改用 `IntersectionObserver` 异步回调。
- **`scrollTop` 取值对象**：标准模式读 `document.documentElement.scrollTop`，混杂模式读 `document.body.scrollTop`，别写死。

## 对比 / 决策表
| 属性 | 是否含 border | 是否含溢出内容 | 相对 |
|---|---|---|---|
| `clientHeight` | 否 | 否 | 自身盒 |
| `offsetHeight` | 是 | 否 | 自身盒 |
| `scrollHeight` | 否 | 是 | 自身盒 |
| `getBoundingClientRect()` | — | — | 视口 |

## 动手自测
1. 一个 `overflow:auto`、`clientHeight=300`、内容总高 1000 的 div，其 `scrollHeight` 约 1000+padding；最大可滚动 `scrollTop ≈ scrollHeight - clientHeight ≈ 700`。
2. 元素在页面顶部下方 500px，初始 `rect.top=500`；向下滚 200 后 `rect.top` 变多少？（变成 300——因为相对视口在减小。）

## 面试视角
常考：`clientHeight` / `offsetHeight` / `scrollHeight` 三者包含范围差异；`getBoundingClientRect` 返回什么、相对什么（视口，非文档）；如何判断元素是否在视口内（IntersectionObserver 优于 scroll 监听）；`scrollTop` 最大值的计算。

---

---

## 定时器与动画

# 定时器与动画

## 心智模型
- `setTimeout` = 预约外卖：**最短** 30 分钟到，但厨房忙可能更晚；
- `setInterval` = 每 30 分钟提醒一次：**不管**上一次做完没，到点就响（可能堆叠）；
- `requestAnimationFrame`（RAF）= 跟着**屏幕刷新节拍**走的节拍器，屏幕 60Hz 就每秒 60 下、120Hz 就 120 下。

## 官方事实（MDN）
- `setTimeout(fn, delay)`：延迟**只是最小值**，实际更晚（主线程忙时排队等待）；嵌套调用达 **5 次后，最小延迟被钳制为 ≥4ms**；`delay=0` 也只是排到**下一轮事件循环**，非立即；返回整数 id 给 `clearTimeout`；**后台/非活动标签页节流到 ≥1000ms**。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout>
- `setInterval`：同样有最小延迟与后台节流；风险是**回调可能堆积**（上一次没跑完，下一次到点又排进队列）。
- `requestAnimationFrame(cb)`：在**下次重绘前**调用回调，频率**匹配屏幕刷新率**（常见 60Hz，也有 75/120/144Hz）；**后台标签/隐藏 iframe 会暂停**；是**一次性**的，要连续动画须递归再调；回调接收 `timestamp` 参数；用 `cancelAnimationFrame(id)` 取消；**在高刷新率屏上若用固定步长而非 `timestamp` 算进度，动画会更快**。来源：<https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame>、<https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelAnimationFrame>

## 为什么重要 / 何时用
轮询、防抖、延迟执行、倒计时用 `setTimeout`/`setInterval`；而**任何视觉动画都应优先用 RAF**——它和屏幕刷新同步，不浪费重绘、不掉帧、后台自动停。

## 常见坑（雷区）
- **用 `setInterval` 做动画**：帧率不跟屏幕、易掉帧、回调堆积导致"一次跳好几帧"。
- **`setTimeout(fn,0)` 当立即**：它是宏任务，排在同步代码之后，下一轮才执行。
- **递归 `setTimeout` vs `setInterval`**：前者等上一次跑完再排下一次（节奏稳），后者到点就排（可能堆积）——模拟轮询/节奏推荐前者。
- **忘记清理**：不 `clearTimeout` / `cancelAnimationFrame`，组件卸载后回调仍在跑 → 内存泄漏、状态更新报错。
- **高刷新率屏动画变快**：RAF 回调要用 `timestamp` 算 `elapsed` 推进，而非每帧固定 `+step`。

## 对比 / 决策表
| 维度 | setTimeout | setInterval | requestAnimationFrame |
|---|---|---|---|
| 时机 | 延迟后一次 | 每间隔一次 | 下次重绘前 |
| 频率 | 手动 | 固定间隔（后台节流）| 跟刷新率 |
| 后台 | 节流≥1s | 节流≥1s | 暂停 |
| 取消 | `clearTimeout` | `clearInterval` | `cancelAnimationFrame` |
| 动画适用 | 否 | 差（堆积） | 是（首选）|

## 动手自测
1. 同步代码后 `setTimeout(()=>console.log('t'),0)`：先打印同步的 `After`，再打印 `t`——证明 0 延迟也是下一轮。
2. 隐藏标签页后，`setInterval(fn,100)` 实际间隔被拉到约 1000ms；RAF 在隐藏时几乎停摆——这正是省电行为。

## 面试视角
常考：`setTimeout` 延迟精确吗？（不，只是最小值；嵌套 5 次后 ≥4ms）；`setTimeout(0)` 何时执行（下一轮宏任务）；RAF 与 `setInterval` 做动画的优劣（RAF 跟刷新率、不堆积、后台暂停）；如何在高刷新率屏保证 RAF 动画速度一致（用 `timestamp` 算 `elapsed`）。

---

