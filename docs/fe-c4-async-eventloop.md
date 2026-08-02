# 第四章 · 异步编程与事件循环（v1 学习层模板 · 已入库）

> 来源方向：官方 MDN / HTML 规范，事实不改写；价值层（心智模型/常见坑/对比/自测/面试）由学习层撰写。

---

## 单线程与事件循环

## 心智模型
把 JS 想象成**只有一个收银员的餐厅**：收银员（调用栈）同一时刻只服务一桌。客人点的"需要后厨做的菜"（setTimeout、fetch、DOM 事件）交给后厨（浏览器/Node 宿主环境），后厨做好后把取餐票放进"取餐架"（队列）。收银员**先把手头这桌结完账**（当前任务运行到完成），再去取餐架——而且**先取小票区（微任务）全部取完，再取大票区（宏任务）**，然后才接待下一桌。这就是"单线程但非阻塞"的本质。

## 核心知识点（锚定 MDN）
- **单线程**：JS 运行时只有一个调用栈（Call Stack），同一时刻只执行一段代码，且遵循 *run-to-completion*——当前任务没跑完，不会被打断。
- **堆与栈**：对象存在堆（Heap）；函数调用形成栈帧，后进先出（LIFO）压入调用栈。
- **宿主提供异步**：DOM、定时器、网络等由宿主环境（浏览器 HTML / Node）实现，不属于 JS 引擎核心。它们完成后把回调放入队列。
- **为什么永不阻塞**：Web 脚本要求不阻塞，I/O 通过事件+回调处理，等待期间主线程仍可响应输入。

> 来源：[MDN · Event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)

## 为什么重要 / 何时会用到
面试必问、也是排查"页面卡死""接口回来了但 UI 没更新"的根因模型。理解它，才看得懂后面微任务/宏任务的执行顺序。

## 常见坑
- 误以为"异步=多线程"——JS 主线程始终是单线程，并发靠的是**把耗时活外包给宿主 + 回调入队**。
- 在同步长循环里做重计算，会**阻塞整个调用栈**，期间任何回调（包括渲染）都进不来 → 页面假死。

## 动手自测
预测输出顺序：
```js
console.log('A');
setTimeout(() => console.log('B'), 0);
console.log('C');
// 答案：A → C → B（setTimeout 是宏任务，排在当前同步代码之后）
```

## 面试视角
高频题：*"JS 是单线程的，为什么还能处理异步？"* 答：单线程指执行线程只有一个；异步靠宿主环境（Web API）完成耗时操作，再把回调挂回队列，由事件循环调度——所以"单线程"和"异步"不矛盾。

---

---

## Promise 与 then/catch/finally

## 心智模型
Promise 是一张**"将来某刻会兑现或作废的取餐小票"**。你拿到小票时还不知道菜好不好吃（值/错误），但你可以在小票上**预先写好**：成功了怎么办（then）、失败了怎么办（catch）、不管怎样都收尾（finally）。小票一旦盖章（settled），结果就定了，再改无效。

## 核心知识点（锚定 MDN）
- **三种状态**：`pending`（待定）→ `fulfilled`（已兑现）或 `rejected`（已拒绝）。
- **不可变**：一旦 settled（fulfilled/rejected），状态与结果就锁定，再调用 resolve/reject 无效。
- **链式**：`then`/`catch`/`finally` 都**返回新的 Promise**，所以可以一直 `.then().then()` 串下去。
- `catch(fn)` 等价于 `then(null, fn)`；`finally(fn)` 无论成败都执行，且不改变原结果（除非 finally 里抛错/返回 rejected）。

> 来源：[MDN · Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

## 为什么重要 / 何时会用到
任何异步 API（fetch、定时、第三方库）的返回值都是 Promise。它是 async/await 的地基，也是组合并发（all/race…）的单元。

## 常见坑
- **吞掉错误**：`p.then(fn)` 里 fn 抛错，会被下游 catch 接住——但若后面没有 catch，错误静默丢失（未处理的 rejected Promise）。务必链尾加 `.catch`。
- **then 里忘了 return**：`p.then(x => x+1)` 若写成 `p.then(x => { x+1 })`（无 return），下游收到 `undefined`。
- `then` 的第二参数 vs `catch`：链中更靠后的 `catch` 才能兜住前面 `then` 的异常；`then(onF, onR)` 的 onR 只兜这一步。

## 动手自测
```js
Promise.resolve(1)
  .then(n => n + 1)
  .then(n => { throw new Error('boom'); })
  .catch(e => 0)
  .then(n => console.log(n));
// 输出：0（catch 把错误转成 0 往下传）
```

## 面试视角
*"Promise 有几种状态？settled 之后还能改吗？"* 答：pending/fulfilled/rejected 三种；settled 后状态与值锁定不可变。追问：`.then` 返回的是原 Promise 还是新的？答：新的。

---

---

## async/await 与错误处理

## 心智模型
`async/await` 是给 Promise 套上**"看起来像同步"的外衣**：`await` 像是给这行代码贴了张"稍后继续"的便利贴——函数在这里**暂停**（把控制权交还调用栈），等 Promise 敲定后再从便利贴处接着跑。注意：暂停的是**这个函数**，不是整个线程，主线程照样去干别的。

## 核心知识点（锚定 MDN）
- `async` 函数**永远返回一个 Promise**（即便你 return 的是普通值，也会被包成 resolved Promise）。
- `await` 会**暂停** async 函数的执行，等右侧 Promise settle 后取出结果，**不阻塞主线程**。
- 错误处理：用 `try/catch` 包裹 `await`（rejected 会作为异常抛出）；或在返回的 Promise 上 `.catch`。

> 来源：[MDN · async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

## 为什么重要 / 何时会用到
让异步代码读起来像从上到下的同步流程，大幅降低"回调地狱"的认知负担；几乎所有现代前端异步逻辑都用它写。

## 常见坑
- **循环里串行 await**：`for` 里每次 `await` 会等上一个完成，变成串行。要并发就用 `Promise.all`（见本章后面的「并发控制与竞态」）。
- **`forEach` 里的 await 不生效**：`forEach` 不会等回调里的 Promise，异步会"漏掉"。要依次执行用 `for...of`，要并发用 `map` + `Promise.all`。
- 忘了 `await`：函数返回的是 Promise 而非值，下游拿到的是"包装盒"而不是"盒子里的内容"。
- `try/catch` 只兜 `await` 那一句；并行 `Promise.all` 抛错要在 `.catch` 或 `try` 外层接。

## 动手自测
```js
async function f() {
  try {
    const r = await Promise.reject(new Error('fail'));
  } catch (e) {
    return 'recovered';
  }
}
f().then(console.log); // 输出：recovered
```

## 面试视角
*"await 会阻塞主线程吗？"* 答：不会。`await` 只暂停当前 async 函数、把栈交还事件循环；主线程继续处理其他任务。追问：`async` 函数 return 的值外面怎么拿？答：通过返回的 Promise 的 `.then` 或外层 `await`。

---

---

## 微任务与宏任务执行顺序

## 心智模型
事件循环每搬完**一桌（一个宏任务）**，就会把**"小票区"（微任务队列）一次性清空**，再去搬下一桌。所以微任务总比后面的宏任务"插队"先执行——就像结账后先把所有小票撕完才接新客。

## 核心知识点（锚定 MDN / HTML 规范）
- **两类队列**：
  - **task（社区俗称"宏任务"）**：`script` 整体代码（第一个 task）、`setTimeout`/`setInterval`、I/O、UI 事件等。
  - task 与 microtask 的划分来自 HTML 事件循环规范；"宏任务"是社区叫法，规范原文用的是 **task**。
- **microtask（微任务）**：`Promise` 的 `then/catch/finally` 回调、`queueMicrotask()`、`MutationObserver`（Node 里 `process.nextTick` 更早）。
- **执行顺序**：每完成一个 task → 进入 **microtask checkpoint**，**清空所有微任务**（包括清空过程中新加的微任务）→ 才取下一个 task，之后才可能渲染。

> 来源：[MDN · Event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) · [HTML 规范 · event loop processing model](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)

## 为什么重要 / 何时会用到
这是"为什么 Promise.then 比 setTimeout 先跑""为什么更新 DOM 后立刻读布局有时不对"的底层原因；也是面试顺序题的判分点。

## 常见坑
- **微任务饿死**：在微任务里不断 `queueMicrotask` / `Promise.then`，会一直清空不完，**永远轮不到宏任务和渲染** → 页面卡死。
- 记反顺序：`setTimeout(0)` 的回调永远晚于当前轮 `Promise.then`，因为 then 是微任务、setTimeout 是 task。

## 动手自测
```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 输出：1 → 4 → 3 → 2
// 解析：同步 1、4 → 微任务 3 → 下一轮 task 的 2
```

## 面试视角
*"setTimeout(fn,0) 和 Promise.then(fn) 谁先执行？"* 答：then 先。前者是 task，后者是 microtask；每轮事件循环先跑完当前 task，再清空微任务队列，最后才取下一个 task。可顺带提：大量微任务可能延迟渲染。

---

---

## fetch 与异步数据流

## 心智模型
`fetch` 像是**网购下单**：你先拿到一个"运单号"（Response 对象，代表请求已发出、有了响应元信息），但要"拆包看商品"得再等一步——调用 `res.json()` 把响应体解析成 JS 值（这步本身又是异步的）。

## 核心知识点（锚定 MDN）
- `fetch(url, options)` 返回一个 **`Promise<Response>`**。
- 拿到 Response 后，用 `res.json()` / `res.text()` / `res.blob()` 解析**响应体**，这些方法**各自又返回 Promise**。
- **关键陷阱**：HTTP 404/500 **不会**让 fetch 的 Promise reject——只有**网络层失败**（断网、跨域被拦、域名解析失败）才会 reject。业务错误要靠 `res.ok`（即 `status` 在 200–299）手动判断。

> 来源：[MDN · Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) · [MDN · Response.ok](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok)

## 为什么重要 / 何时会用到
几乎所有前端网络请求都走 fetch（或封装它的库）；不处理 `res.ok` 是最常见的线上 bug 来源。

## 常见坑
- **忘了 `res.ok` 检查**：后端返回 404，代码却当成功走进 `.then`，解析空体报错。务必 `if (!res.ok) throw...`。
- **重复读 body**：Response 的 body 是一次性流，读一次后（json/text）就耗尽，再读会得到空。
- **超时无内置**：fetch 没有 `timeout` 选项，需要 `AbortController` + `AbortSignal.timeout()`（较新）或 `Promise.race` 自己实现。
- 默认**不带 Cookie**（`credentials: 'same-origin'`），跨域带凭证要显式 `credentials: 'include'`。

## 动手自测
```js
const res = await fetch('/api/user/999');
if (!res.ok) throw new Error('HTTP ' + res.status); // 404 在此被拦下
const data = await res.json();
```
若写成 `const data = await (await fetch(url)).json();` 而接口 500，会拿到脏数据而非报错。

## 面试视角
*"fetch 在什么情况下 reject？404 会 reject 吗？"* 答：只在网络/协议层失败 reject；404/500 仍 resolve，需自行判断 `res.ok`。追问：怎么给 fetch 加超时？答：用 `AbortController` 或 `Promise.race([fetch, timeout])`。

---

---

## 并发控制与竞态

## 心智模型
并发组合器像**不同的"等几个人到齐"规则**：`all` 是"一个迟到（失败）全散"、`allSettled` 是"不管到没到齐都点名记录"、`race` 是"谁先到用谁"、`any` 是"谁先成功用谁，全失败才算输"。

## 核心知识点（锚定 MDN）
| 组合器 | 何时兑现 | 何时拒绝 | 结果形态 | 引入版本 |
|---|---|---|---|---|
| `Promise.all` | **全部**成功 | **任一**失败（快速失败） | 兑现值数组 | ES2015 |
| `Promise.allSettled` | **全部** settled | 永不拒绝 | `{status, value\|reason}[]` | **ES2020** |
| `Promise.race` | 第一个 settle 即定（随其状态） | 随第一个 | 同第一个 | ES2015 |
| `Promise.any` | **任一**成功（取首个） | **全部**失败 → `AggregateError` | 单个兑现值 | **ES2021** |

> 版本提示：现代浏览器/Node 均支持；但 `allSettled`(ES2020)、`any`(ES2021) 在**老旧的构建目标环境**需确认兼容或加 polyfill。
> 来源：[MDN · Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

## 为什么重要 / 何时会用到
同时发多个请求、控制超时、做竞态防护都靠它们；选错组合器会导致"一个挂全挂"或"错误被悄悄吞掉"。

## 常见坑
- **该用 allSettled 却用了 all**：批量上传/多源聚合时，一个失败就让整批 reject，丢失其他成功结果。
- **竞态（race condition）**：搜索联想等场景，后发的请求可能比先发的更早返回，导致 UI 显示旧结果。防护：用"最新请求令牌"或 `AbortController` 取消过期请求。
- `race` 做超时：`Promise.race([fetch(url), timeout(3000)])`，注意 timeout 要先 reject 才能让超时生效。

## 动手自测
```js
const p = Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('err'),
]);
p.then(r => console.log(r));
// 输出：[{status:'fulfilled',value:1},{status:'rejected',reason:'err'}]
// 若换成 Promise.all，则整条以 'err' 拒绝。
```

## 面试视角
*"all / allSettled / race / any 的区别？"* 答：按上表对比，重点说清 all 快速失败、allSettled 永不拒、race 看第一个 settle、any 看第一个成功（全失败 AggregateError）。追问：批量请求"部分失败也要拿到成功结果"用哪个？答：allSettled。

---

