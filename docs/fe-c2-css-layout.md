# 第二章 · CSS 核心与布局体系（v1 学习层模板 · 已入库）

> 来源方向：官方 MDN，事实不改写；价值层（心智模型/常见坑/对比/自测/面试）由学习层撰写。

---

## 盒模型与文档流

## 心智模型
把每个元素想象成一个**俄罗斯套盒**：最里层是内容（content），往外依次包着内边距（padding）、边框（border）、外边距（margin）。浏览器默认按**文档流（Normal Flow）**把这些盒子从上到下、从左到右依次摆放——这就是"普通流"。你写的 `width` 默认只管最里那层，而视觉上盒子实际占多大，得把四层加起来才算清。

## 核心知识点（锚定 MDN）
- **四层区域**：每个盒由 content edge / padding edge / border edge / margin edge 四道边界围成，背景色默认铺到 border 外缘（可用 `background-clip` 改）。
- **默认 `box-sizing: content-box`**：`width` 只算 content 区，`padding` 和 `border` 额外加在外面 → 实际占地 = `width + padding + border`，常常"设了 100% 又加 padding 就溢出"。
- **`box-sizing: border-box`**：`width` 直接包含 content + padding + border → 实际占地就是 `width`，尺寸完全可控，工程上推荐全局 `* { box-sizing: border-box }`。
- **margin 合并**：相邻**块级**盒子的垂直外边距会**折叠成两者较大值**（不是相加）。但 flex/grid 子项、`overflow` 非 visible、绝对定位的元素，其 margin **不合并**。

## 常见坑 / 雷区
- 忘了 `border-box`，`width:100% + padding:20px` 撑出横向滚动条。
- "我以为两个块间距是 40px，实际只有 20px"——这是 margin 合并（取大值），不是 bug。
- **父子 margin 合并**：子元素 `margin-top` 会和父元素 `margin-top` 合并，表现为父元素"凭空掉下来"，常误以为是定位问题。解法：`overflow:hidden` / `padding` 顶替 / `display:flow-root`。
- 给 **inline 元素**设 `width`/`height` 无效——它的高度由 `line-height` 决定。

## 与"邻居"对比 / 决策表
| 场景 | content-box | border-box |
|---|---|---|
| 设 `width:200px; padding:20px` | 实际 240px | 实际 200px |
| 百分比宽度 + padding | 易溢出 | 安全 |
| 推荐度 | 不推荐 | ✅ 工程默认 |

**margin 合并发生 vs 不发生**：仅块级垂直方向相邻 → 发生；inline、浮动、绝对定位、flex/grid 子项、父子间用 `overflow` 隔断 → 不发生。

## 动手自测
1. 一个 `div` 设 `width:100px; padding:10px; border:2px; box-sizing:content-box`，它占多宽？改成 `border-box` 呢？（答案：前者 124px，后者 100px）
2. 两个相邻 `<p>` 各 `margin:20px`，中间间隙是多少？为什么不是 40px？（答案：20px，合并取大值）

## 面试视角
- "box-sizing 的两种取值有什么区别？为什么推荐 border-box？"
- "什么是 margin 合并？什么场景会触发、怎么避免？"
- "inline 元素设置宽高为什么无效？"

> 来源：MDN — [Introduction to the CSS box model](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Introduction_to_the_CSS_box_model)、[box-sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing)、[Margin collapsing](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Mastering_margin_collapsing)

---

## Flexbox 弹性布局

## 心智模型
Flexbox 像一条**传送带**：你把若干物品（子项）放上去，传送带（容器）沿**主轴（main axis）**把物品排开；你可以控制物品在主轴上怎么分布（justify-content），在垂直的主轴方向（交叉轴 cross axis）上怎么对齐（align-items）。它是**一维**布局——只管一个方向排布。

## 核心知识点（锚定 MDN）
- **主轴由 `flex-direction` 决定**：`row`（默认，水平）/ `row-reverse` / `column`（垂直）/ `column-reverse`；交叉轴永远垂直于主轴。
- **`justify-content`**：主轴对齐 → `flex-start | flex-end | center | space-between | space-around | space-evenly`。
- **`align-items`**：交叉轴对齐（单行情景）→ `stretch`（默认拉伸填满）`| flex-start | flex-end | center | baseline`。
- **`align-content`**：交叉轴**多行**分布，**仅在 `flex-wrap:wrap` 且有多行时生效**，单行无效——这是新手最常踩的"写了没反应"。
- **`flex` 简写 = `flex-grow flex-shrink flex-basis`**：`flex:1` → `1 1 0`（基准 0，按比例长）；`flex:initial` → `0 1 auto`；`flex:auto` → `1 1 auto`；`flex:none` → `0 0 auto`。

## 常见坑 / 雷区
- `align-content` 在没换行时"没效果"，误以为写错——其实它本来就只对多行生效。
- `justify-content`（主轴）和 `align-items`（交叉轴）搞反轴，怎么调都不对。
- `flex:1` 的 `basis` 是 `0` 还是 `auto`，会让最终宽度差很多（`0` 按剩余空间均分，`auto` 含内容基础）。
- 子项内容过长被压缩：默认 `min-width:auto` 不让收缩，想让它收缩需显式 `min-width:0`。

## 与"邻居"对比 / 决策表
| 属性 | 控制轴 | 生效前提 |
|---|---|---|
| `justify-content` | 主轴 | 始终 |
| `align-items` | 交叉轴（单行） | 始终 |
| `align-content` | 交叉轴（多行） | `flex-wrap:wrap` 且多行 |

**经典居中**：`display:flex; justify-content:center; align-items:center;` 即可让子项水平+垂直居中。

## 动手自测
只改容器，让三个子项"水平均匀分布且整体垂直居中"、子项间等间距。写出容器代码，并说出 `flex:1` 和 `flex:initial` 在剩余空间分配上的差异。

## 面试视角
- "用 Flex 实现水平垂直居中。"
- "`flex:1` 展开是哪三个值？`basis` 为 0 意味着什么？"
- "`align-items` 和 `align-content` 有什么区别？`align-content` 什么时候才生效？"

> 来源：MDN — [Basic concepts of flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox)、[align-content](https://developer.mozilla.org/en-US/docs/Web/CSS/align-content)、[flex](https://developer.mozilla.org/en-US/docs/Web/CSS/flex)

---

## CSS Grid 网格布局

## 心智模型
CSS Grid 像一张**智能表格**：你先画好格子（显式轨道），东西往格子里放；格子不够了它会**自动补格**（隐式轨道）。`fr` 这个单位就是"把容器的剩余空间按比例分一份"。它是**二维**布局——同时管行和列。

## 核心知识点（锚定 MDN）
- **`fr` 单位**：代表网格容器**可用空间的一部分**（a fraction of available space），`1fr 1fr 1fr` 三等分，`2fr 1fr 1fr` 分四份首轨占二。
- **显式网格**：由 `grid-template-columns` / `grid-template-rows` 定义的轨道。
- **隐式网格**：内容超出显式轨道时自动生成的行/列，默认 `auto`（随内容撑开）。
- **`grid-auto-rows` / `grid-auto-columns`**：控制隐式轨道尺寸，如 `grid-auto-rows: minmax(100px, auto)`。
- **`minmax(min, max)`**：轨道最小不低于 min、最大不超 max，如 `minmax(100px, 1fr)`。
- **`repeat()`**：重复轨道，`repeat(3, 1fr)` = `1fr 1fr 1fr`；可局部重复 `20px repeat(6, 1fr) 20px`。
- **`gap`**：行列间距，在 `fr` 分配前先扣除，不可放内容。

## 常见坑 / 雷区
- 只设了 `grid-template-columns` 没管行，隐式行 `auto` 高度被内容撑得参差——记得用 `grid-auto-rows` 兜底。
- 以为 `grid-auto-flow` 默认就按你要的顺序排——默认 `row`，内容多时可能和你期待的放置顺序不同，可用 `dense` 回填空隙。
- **选型错配**：一维排布（如导航条）用 Grid 反而重，Flex 更轻；反之二维卡片墙硬用 Flex 会嵌套地狱。

## 与"邻居"对比 / 决策表
| 维度 | Flexbox | Grid |
|---|---|---|
| 布局方向 | 一维（一个轴） | 二维（行列同时） |
| 典型场景 | 导航、工具栏、居中 | 卡片墙、仪表盘、整页骨架 |
| 内容驱动 | 子项流动 | 轨道先行 |

**经验**：先想"要不要同时管行和列"，要→Grid，只要一个方向→Flex。

## 动手自测
1. 写三列等宽、间距 16px 的网格：`grid-template-columns: repeat(3, 1fr); gap:16px;`
2. 预测 `grid-template-columns: minmax(100px, 1fr) 2fr`，当容器 600px 时两列各多宽？（答案：首列至少 100px 上限随剩余，二列占剩余 2/3）

## 面试视角
- "Grid 和 Flex 的核心区别？什么时候选哪个？"
- "`fr` 单位是什么？`minmax` 有什么用？"
- "显式网格和隐式网格的区别？隐式行高度怎么控制？"

> 来源：MDN — [Basic concepts of grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout)、[fr](https://developer.mozilla.org/en-US/docs/Web/CSS/flex_value)、[minmax()](https://developer.mozilla.org/en-US/docs/Web/CSS/minmax)

---

## 定位、层叠与 BFC

## 心智模型
`position` 决定元素**如何脱离或锚定文档流**；`z-index` 决定谁压谁（层叠）；**BFC** 是一块"独立渲染的小王国"——王国内部的布局规矩（比如 margin 合并）不外溢到外面。三者一起，决定了"东西放在哪、谁盖谁、边界怎么算"。

## 核心知识点（锚定 MDN）
- **五个取值**：`static`（默认，top 等偏移无效，按普通流）、`relative`（占原空间，相对自身偏移）、`absolute`（脱离普通流，相对**最近非 static 祖先**）、`fixed`（相对**视口 viewport**）、`sticky`（相对**最近滚动祖先**，需阈值）。
- **`sticky` 关键**：必须至少设一个 `top/right/bottom/left` 为非 `auto` 才会"粘住"，否则退化为 `relative`——最常见不生效原因就是漏了 `top`。
- **层叠上下文（stacking context）**：`position` 非 static **且** `z-index` 非 auto 会创建；`fixed`/`sticky` **始终**创建；`opacity<1`、`transform/filter/perspective` 非 none、`will-change` 也会创建。
- **BFC（Block Formatting Context）**：块级盒布局的渲染部分；由 `overflow` 非 visible、`display:flow-root`、浮动、绝对定位、flex/grid 子项创建；其内部相邻 margin **不与外部折叠**。

## 常见坑 / 雷区
- `absolute` 子元素"跑到页面角落"——因为所有祖先都是 `static`，它相对 viewport 定位了。解法：给父级加 `position:relative`。
- `sticky` 不生效：忘了设 `top`，或父容器 `overflow:hidden` 截断、没有滚动空间。
- `z-index` 写很大却不生效：元素没创建 stacking context，或被父级 context 的层级"封印"了。
- 用 `z-index:99999` 强行压，层级混乱难维护——应从结构层面解决。

## 与"邻居"对比 / 决策表
| 值 | 是否脱流 | 相对谁定位 | 创建层叠上下文 |
|---|---|---|---|
| static | 否 | — | 否 |
| relative | 否（占原空间） | 自身 | z-index≠auto 时 |
| absolute | 是 | 最近非 static 祖先 | z-index≠auto 时 |
| fixed | 是 | viewport | 始终 |
| sticky | 否 | 最近滚动祖先 | 始终 |

## 动手自测
1. 父 `div` 无定位，子 `absolute` 设 `top:0;right:0` 会贴到哪？给父加 `position:relative` 后又贴到哪？
2. 一个 `sticky` 元素只设 `position:sticky` 不生效，缺了什么？（答案：没设 `top` 等阈值）

## 面试视角
- "`absolute` 和 `fixed` 的区别？`absolute` 相对谁定位？"
- "`sticky` 为什么不生效？需要满足什么条件？"
- "什么是 BFC？它解决了什么问题（margin 合并、清除浮动）？"

> 来源：MDN — [position](https://developer.mozilla.org/en-US/docs/Web/CSS/position)、[Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)、[Block formatting context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Block_formatting_context)

---

## 响应式设计与媒体查询

## 心智模型
响应式不是"把网页缩小"，而是**在不同屏幕尺寸下给不同规则**——像同一篇讲稿，对着 10 个人和 100 个人讲法不同。媒体查询（media query）就是那个开关："当视口宽度 ≥ 768px 时，改用这套样式"。

## 核心知识点（锚定 MDN）
- **`@media`**：根据视口/设备等条件应用样式，最常用 `min-width` / `max-width`（基于视口宽度）。
- **移动优先（mobile-first）**：默认写小屏样式，用 `min-width` **向上叠加**大屏规则——推荐，维护简单、优先级清晰。
- **断点（breakpoint）**：应在"内容撑不住/开始难看"的尺寸切，而不是按某个设备型号（如 iPhone 375px）硬编码。
- **`<meta name="viewport">` 是前提**：没有它，手机会按桌面宽度（约 980px）渲染，媒体查询在真机上"不触发"。
- **响应式三支柱**：弹性布局（flex/grid）+ 弹性媒体（`max-width:100%`）+ 媒体查询。

## 常见坑 / 雷区
- 忘了 viewport meta 标签，媒体查询在手机上完全不生效（最经典坑）。
- 按设备尺寸（375/414/768）硬设断点，换台设备就错位——应按**内容**断点。
- 桌面优先用 `max-width` 向下覆盖，越改越乱、优先级打架。
- 只改了列数没改字号/间距，小屏依旧挤成一团。

## 与"邻居"对比 / 决策表
| 策略 | 写法 | 优点 | 风险 |
|---|---|---|---|
| 移动优先 | 默认小屏 + `min-width` 向上 | 维护简单、移动端默认快 | 需想清断点 |
| 桌面优先 | 默认大屏 + `max-width` 向下 | 从已有 PC 版改造快 | 覆盖层叠易乱 |

**通用断点参考**（内容驱动，非设备）：`≥640` 平板、`≥1024` 桌面、`≥1280` 大屏。

## 动手自测
写出"小屏单列、视口 ≥768px 变两列等宽、间距 16px"的媒体查询代码，并确认 `<head>` 里有 viewport meta。

## 面试视角
- "什么是响应式设计？移动优先是什么意思？"
- "viewport meta 标签有什么作用？不加会怎样？"
- "媒体查询的断点应该怎么定？为什么不建议按设备型号？"

> 来源：MDN — [Responsive design](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Responsive_design)、[Using media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries)、[viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)

---

## CSS 变量与现代化特性

## 心智模型
CSS 变量（自定义属性）像**全局便签**：你在 `:root` 写一张 `--primary:#3b82f6`，全站哪里都能用 `var(--primary)` 贴这张便签；改一处，全站跟着变。它不是"预处理器变量"，而是浏览器原生、运行时可变的真变量。

## 核心知识点（锚定 MDN）
- **自定义属性**以 `--` 开头（如 `--space:16px`），用 `var()` 引用：`color: var(--primary)`。
- **作用域**：定义在 `:root` 即全局可用；也可定义在任意选择器内形成局部，内层覆盖外层。
- **fallback**：`var(--x, #999)` 在 `--x` 未定义时使用 `#999`。
- **可继承**：自定义属性像普通 CSS 一样向下继承。
- **配套现代特性**：`calc()`（计算）、`clamp(MIN, PREF, MAX)`（响应式尺寸夹取）、`aspect-ratio`（宽高比）、`:is()/:where()`（选择器分组）、`color-mix()`（颜色混合）。

## 常见坑 / 雷区
- **变量名区分大小写**：`--color` 和 `--Color` 是两个不同变量。
- fallback 的误解：`var(--x, #999)` 只在 `--x` **未定义**时回退；若 `--x` 被显式设为无效值，不会回退。
- **不能在媒体查询条件里用 `var()`**：媒体查询在解析阶段无法读取变量值（如 `@media (min-width: var(--bp))` 不行，断点仍要写具体值）。
- 变量值本质是"替换文本"，`--gap: 10px 20px` 这类可整体代入，但不能在变量里做加减（需 `calc`）。

## 与"邻居"对比 / 决策表
| 对比 | 原生 CSS 变量 | 预处理器变量（$/SCSS） |
|---|---|---|
| 解析时机 | 浏览器运行时 | 编译期静态替换 |
| 能否 JS 改 | ✅ 可 `el.style.setProperty` | ❌ 编译后定死 |
| 能否主题切换 | ✅ 实时 | ❌ 需重新编译 |

**`clamp()` 示例**：`font-size: clamp(14px, 2vw, 20px)` → 最小 14、最大 20、理想随视口 2vw。

## 动手自测
用 `:root { --space: 12px }` 统一卡片内边距，再写 `@media (min-width:768px){ :root{ --space:24px } }`，说出改后所有用了 `var(--space)` 的元素间距如何变化。

## 面试视角
- "CSS 变量是什么？相比 SCSS 变量有什么优势？"
- "媒体查询里能用 `var()` 吗？为什么？"
- "`clamp()` 是做什么的？举个例子。"

> 来源：MDN — [Custom properties (CSS variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)、[var()](https://developer.mozilla.org/en-US/docs/Web/CSS/var)、[clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)

---

