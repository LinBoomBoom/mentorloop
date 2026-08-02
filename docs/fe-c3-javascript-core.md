# 第三章 · JavaScript 语言核心（v1 学习层模板 · 已入库）

> 来源方向：官方 MDN，事实不改写；价值层（心智模型 / 常见坑 / 对比 / 自测 / 面试）由学习层撰写。

---

## 数据类型与类型转换

> 🎯 一句话心智模型：JS 的变量像"盒子"，盒子本身不限定装什么；真正的类型由"里面的值"决定。而 `==` 比较时 JS 会偷偷帮你"转一下"再比——这就是坑的来源。

**人话讲清楚**
JS 是**弱类型 / 动态类型**：声明变量不用写类型，同一个变量可以先后装数字、字符串、对象。`typeof` 看的是"值"的类型，不是"变量"的类型。最反直觉的是**类型转换**——`==` 会先做隐式转换再比较，`+` 在不同场景下可能是相加也可能是拼接。

**官方定义（MDN，不改写、可溯源）**
> JavaScript 有 7 种原始类型（primitive）：`undefined`、`null`、`boolean`、`number`、`string`、`symbol`、`bigint`；以及 1 种引用类型 `object`（含数组、函数、普通对象等）。原始类型按值访问（不可变），对象按引用访问。
> — MDN · JavaScript data types and data structures

**为什么重要 / 什么时候会用到**
- 区分原始 vs 引用，才能理解"为什么 `const` 对象能改属性""为什么两个 `{}` 不相等"。
- 类型转换无处不在：`if(x)` 的 truthy/falsy 判断、`+` 拼接、模板字符串、`Number()` 显转。

**常见坑**
```js
console.log([] == ![]);        // true 😱：![] 是 false，[] 转成 ''，'' == false → true
console.log(0 == '');          // true（都转成 0）
console.log(null == undefined);// true（特例），但 null === undefined 是 false
console.log(NaN === NaN);      // false（NaN 不等于任何值，包括自己）
```
口诀：**比较用 `===`，除非你明确要利用 `==` 的隐式转换**。

**对比 / 决策：`==` 还是 `===`？**
| 场景 | 用 | 原因 |
|---|---|---|
| 绝大多数比较 | `===` | 不隐式转换，行为可预测 |
| 判空（null/undefined 都算空） | `== null` | 简洁且同时命中两者 |
| 需要数值/字符串归一 | 先 `Number()`/`String()` 显转再比 | 意图明确 |

**动手自测（合上想 10 秒）**
预测：`'5' - 3` 与 `'5' + 3` 分别等于？`Boolean([])` 与 `Boolean('')` 分别等于？（提示：`-` 强制转数字；`+` 遇字符串走拼接；`[]` truthy、`''` falsy。）

**面试视角**
"JS 有几种数据类型""`typeof null` 为什么是 `'object'`（历史 bug）""`==` 和 `===` 区别""`0.1 + 0.2 !== 0.3` 为什么（number 是 IEEE-754 双精度浮点）"。

**来源**：MDN · JavaScript data types and data structures · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures

---

## 变量作用域与提升

> 🎯 一句话心智模型：声明像"预订座位"——`var` 一进函数就把所有座位预订完（提升 + 初始化 undefined），`let/const` 只预订却不许坐（TDZ），得等到声明那行才"开门"。

**人话讲清楚**
"提升（hoisting）"指：JS 引擎在真正执行代码前，会先把 `var` 声明和 `function` 声明"挪到作用域顶部"。但 `var` 提升后**初始化为 undefined**（提前访问不报错），`let/const` 虽也提升却处于"暂时性死区（TDZ）"——声明语句求值之前访问直接抛错。

**官方定义（MDN）**
> `var` declarations are hoisted and initialized with `undefined`. `let` and `const` declarations are hoisted but not initialized — accessing them before the declaration is evaluated throws a `ReferenceError`? 不，是 `ReferenceError`（准确术语）。更准确：throws a `ReferenceError` because of the temporal dead zone.
> — MDN · let / const / var

**为什么重要**
作用域规则决定"哪里能拿到这个变量"，直接关系闭包、循环陷阱、模块封装。理解提升能解释很多"明明赋值了却读到 undefined"的怪事。

**常见坑**
```js
console.log(a); // undefined（var 提升 + 初始化）
var a = 1;
console.log(b); // ReferenceError: Cannot access 'b' before initialization（TDZ）
let b = 2;

// 函数声明整体提升，调用在前也能跑
foo(); function foo() { console.log('ok'); }
// 函数表达式不会提升函数体
bar(); const bar = () => {}; // TypeError: bar is not a function
```

**对比 / 决策：默认用哪个？**
| 需求 | 选 | 理由 |
|---|---|---|
| 不重新绑定 | `const` | 默认首选 |
| 需重新赋值 | `let` | 块级、无意外提升 |
| 几乎不用 | `var` | 作用域与提升行为易错 |

**动手自测**
```js
for (let i = 0; i < 3; i++) {
  const j = i;
  setTimeout(() => console.log(j), 0);
} // 预测输出顺序与值
```

**面试视角**
"`var/let/const` 区别""什么是 TDZ""为什么推荐 `const` 优先""函数声明与表达式的提升差异"。

**来源**：MDN · let / const / var · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let

---

## 闭包与高阶函数

> 🎯 一句话心智模型：闭包 = 函数"带着出生时的环境一起走"，像出门把家门钥匙揣兜里，以后随时能回去取东西。

**人话讲清楚**
`makeCounter()` 内部有变量 `count`，每调一次返回的函数，`count` 就 +1。外层函数早执行完了，`count` 却没消失——因为返回的内部函数"记住"了它出生时所处的词法环境。这不是 bug 是特性：函数与它定义时的词法作用域绑定，即使外层已返回，绑定依然有效。

**官方定义（MDN，不改写、可溯源）**
> A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function's scope from an inner function. In JavaScript, closures are created every time a function is created, at function creation time.
> — MDN · Closures

**为什么重要 / 什么时候会用到**
- 数据私有化（模块模式实现"私有变量"）、工厂 / 柯里化、回调与事件（记住上下文）、函数式（`map`/`filter` 的 predicate 捕获状态）。

**常见坑**
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3 3 3（var 共享同一个 i）
}
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0 1 2（let 每次迭代新建绑定）
}
```
反向印证：闭包捕获的是"词法环境（绑定）"，不是"值"。

**对比 / 决策：闭包 vs IIFE vs 普通作用域**
| 场景 | 用 | 原因 |
|---|---|---|
| 需"记住"外层变量并多次访问 | 闭包 | 内部函数持续引用外层绑定 |
| 只需执行一次隔离 | IIFE | 无需返回函数 |
| 只是访问全局 | 普通作用域 | 不必捕获 |

**动手自测（合上想 10 秒）**
```js
function outer() { let x = 10; return function inner() { x++; return x; }; }
const f = outer(); console.log(f(), f(), f()); // 预测：___
```

**面试视角**
"解释闭包""var/let 循环区别""写私有计数器""实现 once 函数"——本质都考函数是否捕获正确的词法环境、捕获的是绑定还是值。

**来源**：MDN · Closures · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures

---

## this 绑定规则

> 🎯 一句话心智模型：`this` 不是"函数定义在哪"，而是"函数被怎么调用"——像一句台词的"主语"，取决于谁在说话，不取决于剧本写哪。

**人话讲清楚**
`this` 的值在**调用时**确定，不在定义时。普通函数四种绑定按优先级从低到高：默认（独立调用）→ 隐式（对象方法）→ 显式（call/apply/bind）→ new。箭头函数例外：它没有自己的 `this`，继承自定义时外层作用域的 `this`。

**官方定义（MDN，不改写、可溯源）**
> The value of `this` in JavaScript depends on how a function is invoked (runtime binding), not how it is defined. Arrow functions do not have their own `this` binding; they inherit `this` from the parent scope at the time they are defined.
> — MDN · this

**为什么重要**
回调、事件处理、类方法中 `this` 指向错位是头号 bug 来源。理解规则才能正确绑定（尤其 React 事件、定时器回调里丢失 `this`）。

**常见坑**
```js
const obj = { name: 'A', fn() { console.log(this.name); } };
const f = obj.fn;
f();                  // undefined（独立调用，this = undefined / 全局）
setTimeout(obj.fn, 0);// undefined（回调里 this 丢失）
// 解决：bind / 箭头函数
setTimeout(() => obj.fn(), 0); // 'A'
```

**对比 / 决策：四种绑定谁优先？**
| 绑定方式 | 触发 | this 指向 |
|---|---|---|
| new | `new Fn()` | 新实例 |
| 显式 | call/apply/bind | 传入的对象 |
| 隐式 | `obj.fn()` | 调用者 obj |
| 默认 | `fn()` | undefined（严格）/ 全局（非严格） |

箭头函数：忽略上述所有，恒用外层 `this`。

**动手自测（合上想 10 秒）**
```js
const o = { x: 1, getX() { return function () { return this.x; }; } };
console.log(o.getX()()); // 预测：___ （提示：返回的函数独立调用）
```

**面试视角**
"`this` 是什么、怎么确定""call/apply/bind 区别""箭头函数 `this` 与普通函数区别""React 里为什么要用箭头 / 绑定"。

**来源**：MDN · this · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this

---

## 原型链与继承

> 🎯 一句话心智模型：每个对象身后都拴着一条" ancestor 链"——找属性时自己没有，就顺着链往"爹""爷"一路问，问到 `null` 为止。

**人话讲清楚**
JS 的"类"式继承其实是**原型式**的：每个对象内部有个隐藏链接 `[[Prototype]]`（用 `Object.getPrototypeOf` 看），指向它的原型对象。访问 `obj.foo` 时，先查自己，没有就查原型、原型的原型……直到 `null`。构造函数 `new` 出来的实例，其 `[[Prototype]]` 指向 `构造器.prototype`，典型链：`实例 → 构造器.prototype → Object.prototype → null`。

**官方定义（MDN，不改写、可溯源）**
> When trying to access a property of an object, the property will not only be sought on the object, but also on the prototype of the object, the prototype of the prototype, and so on, until either a property with a matching name is found or the end of the prototype chain is reached. `null` has no prototype and acts as the final link in this prototype chain.
> — MDN · Inheritance and the prototype chain

**为什么重要**
这是 JS 实现"共享方法 / 复用"的机制：`Array.prototype.map` 之所以所有数组都能用，就是因为方法在原型上。理解它能解释继承、方法查找、`instanceof` 的原理。

**常见坑**
```js
function Box() {}
Box.prototype = { color: 'red' }; // 重赋值 prototype，忘了设 constructor
const b = new Box();
console.log(b.constructor); // Object，而不是 Box！（constructor 丢失）
console.log(b instanceof Box); // true（基于 [[Prototype]]，仍成立）

// 性能：链太长 / 查不存在的属性会遍历整条链
// 检查"自有属性"要用 hasOwn
console.log(Object.hasOwn(b, 'color')); // false（color 在原型上）
```

**对比 / 决策：自有属性 vs 原型属性**
| 想做的事 | 用 | 原因 |
|---|---|---|
| 只判断对象自己有没有 | `Object.hasOwn(obj, k)` | 不误判原型上的属性 |
| 判断"是不是某类实例" | `instanceof` / `Object.getPrototypeOf` | 基于原型链 |
| 现代继承写法 | `class extends` | 语法糖，底层仍是原型链 |

**动手自测（合上想 10 秒）**
```js
const arr = [1, 2, 3];
console.log(Object.getPrototypeOf(arr) === Array.prototype); // ?
console.log(Object.getPrototypeOf(Array.prototype) === Object.prototype); // ?
console.log(Object.getPrototypeOf(Object.prototype)); // ?
```

**面试视角**
"`[[Prototype]]` 与 `prototype` 属性区别""原型链怎么查找属性""`instanceof` 原理""class 继承底层是什么""为什么少用 `__proto__` 动态改原型（破坏引擎优化）"。

**来源**：MDN · Inheritance and the prototype chain · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain

---

## ES6+ 现代语法

> 🎯 一句话心智模型：ES6+ 是给 JS "补装备"——解构像"拆快递"、箭头函数像"自动绑定 this 的短函数"、可选链 `?.` 像"安全问路"，让代码更短更稳。

**人话讲清楚**
ES2015（ES6）及之后每年一个小版本，带来一批写起来更省、更不易出错的语法：`let/const`、箭头函数、模板字符串、解构、默认参数、`Promise`/`async`、`class`、模块（`import/export`）、可选链 `?.`、空值合并 `??` 等。它们大多不改变语言本质，只是让常见模式更表达化。

**官方定义（MDN）**
> ECMAScript 2015 (ES6) introduced major syntax: `let`/`const`, arrow functions, classes, modules, template literals, destructuring, default/rest/spread, `Promise`, generators, etc. Later editions added `async/await`, optional chaining `?.`, nullish coalescing `??`, etc.
> — MDN · New in JavaScript

**为什么重要**
现代框架（Vue/React）与构建工具默认就是 ES6+ 写法；`?.`/`??` 能省掉大量判空样板；解构让函数参数和返回值更易读。不会这些等于看不懂现在的前端代码。

**常见坑**
```js
// ?? 只在 null/undefined 时生效，不像 || 会把 0/'' 也当 falsy
const a = 0 ?? 10;  // 0（保留 0）
const b = 0 || 10;  // 10（0 被当成 falsy）

// 解构默认值只对 undefined 触发，不触发 null
const [x = 1] = [undefined]; // 1
const [y = 1] = [null];      // null

// 扩展运算符是浅拷贝
const o = { a: { b: 1 } };
const c = { ...o }; c.a.b = 2; console.log(o.a.b); // 2（共享内层引用）
```

**对比 / 决策：`||` 还是 `??`？**
| 场景 | 用 | 原因 |
|---|---|---|
| 只要 null/undefined 给默认值 | `??` | 不误伤 0 / '' / false |
| 任意 falsy 都兜底 | `||` | 语义就是"假值替换" |

**动手自测（合上想 10 秒）**
预测：`const obj = { user: { name: 'Tom' } }; console.log(obj.user?.address?.city ?? '未知')` 输出？为什么不会报错？

**面试视角**
"`?.` 和 `&&` 链的区别""`??` 与 `||` 区别""解构 / 扩展运算符是深拷贝吗""`var` 与 `let` 在 for 循环里的差异（见第二节）"。

**来源**：MDN · New in JavaScript · https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript

---

