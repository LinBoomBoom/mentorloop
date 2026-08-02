# Step 0 试点样本（学习层模板示范）

> 目的：验证"事实锚定官方 + 价值由我们自研"的**学习层模板**是否成立，而非核对格式。  
> 事实全部来自官方信源（已抓取），但呈现方式服务于"人怎么学得会"，而非"官方怎么写"。  
> 每条都含：一句话心智模型 → 官方定义（可引原文、标 URL）→ 为什么重要 → 常见坑 → 对比/决策 → 动手自测 → 面试视角。  
> 评审焦点从"格式对不对"转为："用户 30 秒能否建立心智模型、能否分清易混点、能否动手验证、是否比直接看官方更有用"。

---

## 前端 · 「JavaScript 语言核心」(fe-c3)

### 知识点 A · 闭包（Closure）

> 🎯 一句话心智模型：闭包 = 函数"带着它出生时的环境一起走"。像出门把家门钥匙揣兜里，以后随时能回去取东西。

**人话讲清楚**  
`makeCounter()` 内部有个变量 `count`，每调一次返回的函数，`count` 就 +1。神奇的是：外层函数早执行完了，`count` 居然没消失——因为返回的内部函数"记住"了它出生时所处的词法环境。这不是 bug，是特性：函数与它定义时所处的词法作用域绑定，即使外层已返回，绑定依然有效。

**官方定义（MDN，不改写、可溯源）**

> A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function's scope from an inner function. In JavaScript, closures are created every time a function is created, at function creation time.  
> — MDN Web Docs · Closures

**为什么重要 / 什么时候会用到**

- **数据私有化**：JS 在 `private` 字段出现前，模块模式靠闭包实现"私有变量"。
- **工厂 / 柯里化**：动态生成带预设参数的函数。
- **回调与事件**：异步回调需要"记住"触发时的上下文。
- **函数式**：`map`/`filter` 的 predicate 依赖闭包捕获状态。

**常见坑（官方不 foreground，但实战必踩）**

```js
// ❌ 经典循环陷阱：var 时所有回调共享同一个 i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3 3 3
}
// ✅ let 每次迭代新建词法绑定，闭包各自捕获自己的 i
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0 1 2
}
```

反向印证一句话：闭包捕获的是"词法环境（绑定）"，不是"值"。

**对比 / 决策：闭包 vs IIFE vs 普通作用域**

| 场景             | 用什么   | 原因           |
| -------------- | ----- | ------------ |
| 需"记住"外层变量并多次访问 | 闭包    | 内部函数持续引用外层绑定 |
| 只需执行一次隔离逻辑     | IIFE  | 无需返回函数       |
| 只是访问全局         | 普通作用域 | 不必捕获         |

**动手自测（合上想 10 秒，再跑）**

```js
function outer() {
  let x = 10;
  return function inner() { x++; return x; };
}
const f = outer();
console.log(f(), f(), f()); // 预测：___ 实际：___
```

**面试视角**  
高频题："解释闭包""var/let 在循环里的区别""写一个私有计数器""实现一个 once 函数"。本质都考：函数是否捕获了正确的词法环境、捕获的是绑定还是值。

**来源**：MDN — Closures · <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures>

---

### 知识点 B · 词法作用域与块级作用域（var / let / const）

> 🎯 一句话心智模型：作用域看"变量写在哪"，不看"在哪被调用"；`let/const` 把作用域从"函数"缩到"花括号 {}"。

**官方定义（MDN）**

- `var`：函数作用域或全局作用域；存在变量提升（hoisting），声明前可访问（值为 `undefined`）。
- `let` / `const`：块级作用域；存在"暂时性死区（TDZ）"，声明前访问抛 `ReferenceError`；`const` 绑定不可重新赋值（对象内部属性仍可改）。

**为什么重要**  
作用域规则直接决定"哪些地方能拿到这个变量"。尤其闭包场景下，`let` 的块级作用域天然解决"循环共享变量"问题，省掉一层 IIFE。

**常见坑**

```js
console.log(a); // undefined（var 提升）
var a = 1;
console.log(b); // ReferenceError: Cannot access 'b' before initialization（TDZ）
let b = 2;
```

**对比 / 决策：默认用哪个？**

| 需求    | 选       | 理由             |
| ----- | ------- | -------------- |
| 不重新绑定 | `const` | 默认首选，避免意外改值    |
| 需重新赋值 | `let`   | 块级、无 TDZ 之外的意外 |
| 几乎不用  | `var`   | 作用域与提升行为易出错    |

**动手自测**

```js
for (let i = 0; i < 3; i++) {
  const j = i;
  setTimeout(() => console.log(j), 0); // 预测：___
}
```

**面试视角**  
"var/let/const 区别""什么是 TDZ""const 声明的对象能改属性吗"——常配合闭包题一起考。

**来源**：MDN — Closures（作用域段落）· <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures>

---

## 后端 · 「MySQL 与 Redis」(be-c2)

### 知识点 A · MySQL 如何使用索引（B-Tree）

> 🎯 一句话心智模型：索引像书的目录——没有它，找一页得从头翻到尾；有了它，直接翻到中间那一页。表越大，目录越值钱。

**官方定义（MySQL 8.4 Reference Manual）**

> Indexes are used to find rows with specific column values quickly. Without an index, MySQL must begin a full table scan... The larger the table, the more this costs. If there is an index, MySQL can use it to find the data file in the middle of the table... much faster than reading every row sequentially.  
> — MySQL 8.4 Ref Manual · How MySQL Uses Indexes

**存储结构（事实）**  
大多数 MySQL 索引（`PRIMARY KEY`、`UNIQUE`、`INDEX`、`FULLTEXT`）以 **B-tree** 存储。例外：空间数据用 R-tree；`MEMORY` 表支持 hash 索引；`InnoDB` 的 `FULLTEXT` 用倒排列表。

**为什么重要 / 什么时候用得上**

- 快速定位 `WHERE` 匹配行；多索引时优化器选选择性最高的。
- 联表（JOIN）在类型/大小相同的列上索引效率更高。
- **覆盖索引（covering index）**：查询只需索引树中的列，免回表，更快（见下例）。

**常见坑**

```sql
-- 覆盖索引：key_part3 已在索引树上，无需回表
SELECT key_part3 FROM tbl_name WHERE key_part1 = 1;

-- 小表 / 需访问大部分行的报表查询：全表顺序扫描往往比走索引更快（减少磁盘寻道）
SELECT * FROM small_tbl; -- 优化器可能直接忽略索引
```

**对比 / 决策：什么时候索引帮不上忙？**

| 情况         | 索引有用？ | 原因     |
| ---------- | ----- | ------ |
| 大表按列过滤     | ✅     | 避免全表扫描 |
| 覆盖索引查询     | ✅ 更优  | 免回表    |
| 小表 / 取大部分行 | ❌     | 顺序扫描更快 |

**动手自测**  
给你一张 1000 万行的 `orders(user_id, status, created_at)`，`(user_id, status)` 上有联合索引。预测哪些查询能用上索引：

- `WHERE user_id = 5` → \_\_\_
- `WHERE status = 'paid'` → \_\_\_（提示：最左前缀）
- `WHERE user_id = 5 AND status = 'paid'` → \_\_\_

**面试视角**  
"索引为什么用 B+ 树不用哈希""什么是覆盖索引""什么情况下索引失效""最左前缀是什么"——几乎是后端面试必考题。

**来源**：MySQL 8.4 Reference Manual · <https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html> · <https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html>

---

### 知识点 B · 最左前缀原则与覆盖索引

> 🎯 一句话心智模型：联合索引像"姓+名"的电话簿——先按姓排、再按名排；只凭"名"去找，只能从头翻。

**官方定义（MySQL 8.4）**  
对于联合索引 `(a, b, c)`，查询能利用到的索引范围为：`WHERE a=?`（用到 a）、`WHERE a=? AND b=?`（用到 a,b）、`WHERE a=? AND b=? AND c=?`（用到 a,b,c）；而 `WHERE b=?` 不满足最左前缀，无法利用该联合索引。

**为什么重要**  
索引列顺序直接决定哪些查询能命中。顺序设计错了，建了也白建。

**常见坑**

- 跨类型 / 跨字符集比较（如 `utf8mb4` 列与 `latin1` 列比较）会导致索引失效。
- 对列做函数运算（`WHERE YEAR(created_at)=2026`）会让索引失效——应改为范围比较。

**对比 / 决策：联合索引列顺序怎么排？**

| 原则         | 做法          |
| ---------- | ----------- |
| 区分度高的列在前   | 越早过滤掉越多行    |
| 常作等值过滤的列在前 | 更易命中前缀      |
| 范围查询放最后    | 范围之后无法再用后续列 |

**动手自测**  
`(a, b, c)` 索引下，哪些能用到 `(a,b)` 前缀：`WHERE a=1 AND b=2 AND c>3`？`WHERE a=1 AND c=3`？分别预测。

**面试视角**  
"联合索引 (a,b,c)，`WHERE b=? AND c=?` 走索引吗？""怎么设计索引让某查询免回表？"

**来源**：MySQL 8.4 Ref Manual · Multiple-Column Indexes · <https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html>

---

## 运维 / DevOps · 「Linux 与 Shell」(do-c1)

### 知识点 A · Shell 命令类型（Bash 5.3）

> 🎯 一句话心智模型：Shell 把你的输入按"颗粒度"分成几类——单个词是"简单命令"，用 `|` 串起来是"管道"，用 `; && ||` 排好队是"列表"，带 `if/for/{}` 的是"复合命令"，起个名字复用的是"函数"。

**官方定义（GNU Bash Manual 5.3）**

- **简单命令（Simple Command）**：空白符分隔的单词序列，以控制操作符（`; & && || | |& ( )` 等）终止；首词为命令名，其余为参数。
- **管道（Pipeline）**：一个或多个命令经 `|` 或 `|&` 连接；`|&` 等价 `2>&1 |`。退出状态默认取最后一条命令（启用 `pipefail` 时取最右非零）。
- **命令列表（List）**：管道用 `; & && ||` 分隔；`&&`（前成功才执行后）、`||`（前失败才执行后）优先级高于 `; &`；`&` 后台异步。
- **复合命令（Compound）**：以保留字或控制操作符起止的构造（`if…fi`、`for…done`、`{ list; }`、`( list )`）。
- **函数**：`fname () compound-command` 或 `function fname [()] compound-command`；在**当前 shell 上下文**执行（不新建进程），参数成为位置参数，可用 `return` 返回。

**为什么重要**  
理解命令类型，才能看懂复杂一行流（one-liner）到底在做什么、为什么 `&&` 接的命令没跑、为什么 `|` 之后拿不到错误。

**常见坑**

```bash
# ❌ 以为 && 会管到整条链：实际只连最近两条
cmd1 && cmd2 || cmd3   # cmd3 在 cmd2 失败 OR cmd1 失败时都会跑，语义易混淆
# ✅ 用 { } 明确分组
cmd1 && { cmd2 || cmd3; }
# ❌ 子 shell ( ) 里改的变量回不到外层
( var=1 ); echo $var   # 空
# ✅ { } 在当前 shell 执行
{ var=1; }; echo $var  # 1
```

**对比 / 决策：`( list )` 还是 `{ list; }`？**

| 需求          | 用     | 原因            |
| ----------- | ----- | ------------- |
| 变量/状态要影响外层  | `{ }` | 当前 shell 执行   |
| 隔离副作用（如 cd） | `( )` | 子 shell，不影响外层 |
| 并行后台        | `&`   | 异步            |

**动手自测**  
预测下面输出：

```bash
x=0
( x=1 ); echo "A: $x"
{ x=2; }; echo "B: $x"
```

（提示：子 shell 不回写。）

**面试视角**  
"SHELL 里 `( )` 和 `{ }` 区别""`&&` 与 `||` 优先级""`pipefail` 干什么用"——运维 / SRE 面试常考基础。

**来源**：GNU Bash Manual 5.3 · Shell Commands · <https://www.gnu.org/software/bash/manual/bash.html#Shell-Commands> · Shell Operations · <https://www.gnu.org/software/bash/manual/bash.html#Shell-Operations>

---

### 知识点 B · Shell 解析与执行流程

> 🎯 一句话心智模型：你敲的命令不是"直接跑"，而是先拆词、再解析、再一步步扩展（变量替换、通配符…）、再重定向、最后才执行——理解这串流水线，才能解释"为什么没按我想的跑"。

**官方定义（Bash 5.3 · Shell Operations）**  
Shell 读取并执行命令大致按序：① 读取输入（脚本 / `-c` 字符串 / 终端）② 拆分词与操作符（别名扩展在此步）③ 解析为命令 ④ **Shell 扩展**（花括号/波浪号/参数/命令替换/算术/进程替换/分词/文件名扩展）⑤ 重定向 ⑥ 执行命令 ⑦ 等待并收集退出状态（8 位，最大 255）。

**为什么重要**  
很多"诡异行为"源于扩展顺序：比如变量里带空格没引号，`echo $var` 会被拆成多个词；比如 `*` 在扩展阶段才变成文件列表。

**常见坑**

```bash
# ❌ 不带引号：文件名含空格时被拆成多词
files="a b.txt c.txt"; rm $files   # 实际删了 a、b.txt、c.txt 三个
# ✅ 加引号保留整体
rm "$files"
# 扩展顺序：先参数替换再文件名扩展，故下面先算出 1+2 再通配
echo $((1+2)) *   # 先输出 3，再列出当前目录文件
```

**对比 / 决策：单引号还是双引号？**

| 场景           | 用     | 原因             |
| ------------ | ----- | -------------- |
| 纯字面量、禁止任何扩展  | `' '` | `$`、`*` 都当普通字符 |
| 需变量/命令替换但防分词 | `" "` | 扩展发生，但结果不被拆词   |

**动手自测**  
`name="hello world"`；预测 `echo '$name'` 与 `echo "$name"` 的输出差异。

**面试视角**  
"Shell 执行一条命令经历了哪些阶段""为什么不加引号会出事""单双引号区别"。

**来源**：GNU Bash Manual 5.3 · Shell Operations · <https://www.gnu.org/software/bash/manual/bash.html#Shell-Operations>

---

## 评审焦点（请据此反馈，而非格式清单）

- [x] **心智模型**：30 秒内能否建立直觉？类比是否贴切 / 有无更好比喻？
- [x] **学习价值**：相比直接看官方 MDN/MySQL/Bash 手册，这份是否"更省理解成本"？差在哪？
- [x] **常见坑 / 对比 / 自测**：是否戳中真实学习障碍？是否太绕或太浅？
- [x] **事实准确**：官方引用有无歪曲？来源 URL 是否可追溯？
- [x] **节奏**：这种"每点都带 6 个维度"的密度是否合适，还是该对核心点深、边缘点浅（分级）？
- [x] **模板定稿**：是否据此作为后续逐章模板？哪些维度要增删？

> 你回"通过/调整 XX"，我据此定稿模板并逐章推进；面试题(C2)/考卷(C3)在知识树达一定覆盖后再派生。
