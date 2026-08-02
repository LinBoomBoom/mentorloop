# 第一章 · Web 基础：HTML 语义化与结构（v1 学习层模板 · 已入库）

> 来源方向：官方 MDN / WHATWG HTML 规范，事实不改写；价值层（心智模型/常见坑/对比/自测/面试）由学习层撰写。

---

## HTML 语义化与文档结构

## 心智模型
语义化 HTML 就像**用对的词说对的话**：`<nav>` 是"导航"、`<article>` 是"一篇文章"、`<time>` 是"某个时间"。浏览器、屏幕阅读器、搜索引擎都靠这些"词"理解页面——你写 `<div class="nav">` 人能看懂，但机器只看到一个没意义的盒子。语义化的本质，是**给内容贴上机器也能读懂的标签**。

## 核心知识点（锚定 MDN）
- **语义元素 vs 表现元素**：`<header>/<nav>/<main>/<article>/<section>/<aside>/<footer>` 描述"是什么"；`<div>/<span>` 是**无语义容器**，仅在没更合适的语义标签时才用。
- **内容分区**：`<main>` 是页面主导内容（一个页面应只有一个）；`<article>` 是可独立分发的内容；`<section>` 是通用区块（应有标题）；`<aside>` 是与主内容间接相关的侧栏。
- **标题层级**：`<h1>`–`<h6>` 代表六级章节标题，h1 最高。**不要跳级**（h1 直接跳 h3 会破坏大纲）。
- **语义化替代表现标签**：强调用 `<strong>`（重要性）/<em>`（重读），别用 `<b>/<i>`；`<font>/<center>` 等纯表现标签已 **obsolete，新项目禁用**。

> 来源：[MDN · HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)

## 为什么重要 / 何时会用到
语义是**无障碍和 SEO 的地基**：屏幕阅读器靠它生成"可访问性树"，搜索引擎靠它判断内容结构。写页面结构时永远先问"这段内容的语义是什么"，再选标签。

## 常见坑
- **div 汤（div soup）**：整页用 div + class 堆砌，机器读不到结构，SEO 与读屏全废。
- **用 `<b>/<i>` 表达语义**：它们只是视觉样式（粗体/斜体），`strong/em` 才是语义强调。
- **alt 与标题缺失**：图片无 `alt`、区块无标题，读屏用户直接卡住。

## 动手自测
下面哪处不对？
```html
<div class="header"><div class="title">首页</div></div>
<h1>文章</h1>
<h3>小节</h3>
```
答案：应用 `<header>`+`<h1>` 替代 div；h1 后直接 h3 **跳级**了（中间缺 h2）。

## 面试视角
*"为什么要用语义化标签？"* 答：三点——无障碍（读屏可解析结构）、SEO（搜索引擎理解内容）、可维护性（结构自解释）。追问：`<div>` 和 `<section>` 区别？答：div 无语义，section 表达"有标题的通用区块"。

---

---

## 表单与无障碍输入

## 心智模型
表单是**你和用户之间的一份"对话表格"**：每个输入框都得能被人看懂（有标签）、被机器读懂（有 name/type）、被合理校验（有规则）。缺了任何一环，用户填得懵、后端收得乱。

## 核心知识点（锚定 MDN）
- **可访问命名**：每个 `<input>` 都要有 `<label for="id">` 与之关联（id 对应），否则屏幕阅读器**读不出这个框是干嘛的**。`<fieldset>`+`<legend>` 用于分组（如"收货地址"一组）。
- **原生输入类型**：`text / email / url / number / date / checkbox / radio / tel` 等；`type="email"` 浏览器**自动按邮箱格式校验**。
- **原生验证属性**（无需 JS 即生效）：`required`（必填）、`minlength/maxlength`（长度）、`min/max`（数值/日期范围）、`pattern`（正则）、`type=email/url` 自带格式校验。
- **CSS 伪类**：`:valid` / `:invalid` / `:required` 可直接样式化校验状态。
- **Constraint Validation API**：`checkValidity()`、`reportValidity()`、`setCustomValidity(msg)`、`validationMessage` 可在 JS 里精细控制。
- **安全红线**：客户端验证**可被绕过**，MDN 明确警告 *"Never trust data passed to your server from the client"*——**服务端必须再验一次**。

> 来源：[MDN · Client-side form validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation) · [MDN · <label>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label)

## 为什么重要 / 何时会用到
任何登录、注册、下单、搜索都靠表单。无障碍表单决定残障用户能否用，原生校验决定垃圾数据能否被前端拦下。

## 常见坑
- **`placeholder` 不是 `label`**：占位符在输入后消失，且无障读屏不把它当标签；**可见的 `<label>` 不能省**。
- **只信前端校验**：攻击者改请求绕过 `required`/`pattern`，后端不验就中招（注入、脏数据）。
- **邮箱用 `type=text`**：失去自动格式校验和移动端邮箱键盘。

## 动手自测
补全让下方输入框可被读屏识别且必填：
```html
<label for="email">邮箱</label>
<input id="email" type="email" required>
```
少 `for`/`id` 任一则关联失效；少 `type="email"` 则无格式校验。

## 面试视角
*"前端表单校验够安全吗？"* 答：不够。原生/JS 校验只在客户端，可被篡改跳过，所以**必须服务端二次校验**。追问：如何做无障碍表单？答：每个 input 配 `<label for>`，分组用 fieldset/legend，错误用 aria 或 :invalid 显式提示。

---

---

## 多媒体与嵌入内容

## 心智模型
多媒体元素像**"会占位的观众"**：图片、视频、iframe 都会抢带宽和布局。你得告诉浏览器——这图"说什么"（alt）、这视频"要不要自动响"（controls/autoplay）、这个外链"能不能乱动我的页面"（sandbox）。

## 核心知识点（锚定 MDN）
- **`<img>`**：`alt` 描述图片内容，**无障碍与 SEO 都依赖它**；缺失时读屏只能报"图片"。`loading="lazy"` 可延迟加载视口外图片。
- **`<picture>` + `<source srcset>`**：按设备分辨率/屏幕尺寸提供不同图源，实现响应式图片。
- **`<video>`**：`controls` 显示播放控件；`autoplay` 通常需 `muted` 才能自动播放；`<track kind="captions">` 提供字幕（无障碍）。
- **`<iframe>`**：嵌入第三方页面；`sandbox` 限制其权限（防它改父页面/弹窗）；`loading="lazy"` 延后加载。

> 来源：[MDN · <img>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) · [MDN · <video>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) · [MDN · <iframe>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)

## 为什么重要 / 何时会用到
图片视频是页面体积大头；处理不好要么加载慢、要么无障碍缺失、要么被第三方 iframe 拖垮安全。

## 常见坑
- **图片没 `alt`**：读屏用户完全不知道图里是什么；装饰图也至少 `alt=""`（标记为无意义，读屏跳过）。
- **`autoplay` 没 `muted`**：多数浏览器直接禁止自动播放，形同失效。
- **iframe 不 `sandbox`**：嵌入不可信来源时，它能操作父页面、发起弹窗，是 XSS/钓鱼隐患。
- **首屏大图不懒加载**：拖慢首屏渲染。

## 动手自测
```html
<img src="chart.png" alt="2025 各渠道转化率柱状图">
<video controls muted>
  <source src="intro.mp4" type="video/mp4">
  <track kind="captions" src="intro.vtt" srclang="zh" label="中文字幕">
</video>
```
若删掉 `alt`，读屏失去图片语义；若删 `controls`，用户无法播放。

## 面试视角
*"img 的 alt 有什么用？什么时候留空？"* 答：alt 给读屏和 SEO 提供图片语义；**纯装饰图**应设 `alt=""` 让读屏跳过而非念文件名。追问：iframe 为什么要 sandbox？答：限制嵌入页权限，防其篡改父页面或作恶。

---

---

## 元数据与 SEO 基础

## 心智模型
元数据是**网页递给机器的一张"名片/简历"**：`<title>` 是标题，`<meta description>` 是摘要，`viewport` 是"在手机上怎么缩放"。用户先看到内容，但**搜索引擎和浏览器先读这张名片**。

## 核心知识点（锚定 MDN）
- **`<title>`**：浏览器标签栏显示的文档标题，也是搜索结果的主标题，**每个页面应有唯一且描述性的 title**。
- **`<meta charset="utf-8">`**：声明字符编码，避免中文乱码，应放在 `<head>` 最前。
- **`<meta name="viewport" content="width=device-width, initial-scale=1">`**：让页面在移动端按设备宽度渲染，**不做会触发桌面版缩放**。
- **`<meta name="description">`**：页面摘要，常作为搜索结果描述（非排名直接因素，但影响点击）。
- **语言与社交**：`<html lang="zh-CN">` 帮助读屏选对发音语言；Open Graph（`og:title/og:image` 等）控制分享到社交平台时的卡片样式。
- **结构化数据（JSON-LD）**：用 `<script type="application/ld+json">` 给搜索引擎喂结构化信息（文章/商品等），提升富结果展示。

> 来源：[MDN · <meta>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) · [MDN · <title>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title)

## 为什么重要 / 何时会用到
SEO 和社交分享的第一印象都在 `<head>` 里。技术 SEO、埋点、移动端适配都从这里开始。

## 常见坑
- **漏 `viewport`**：移动端网站被缩成桌面小窗，体验崩坏。
- **漏 `lang`**：读屏可能用错语言朗读；也是基础可访问性要求。
- **关键词堆砌**：早年"keywords"黑帽已失效甚至有害，现代 SEO 看内容与体验，不看堆词。
- **所有页 title 相同**：搜索结果无法区分，CTR 低。

## 动手自测
```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>前端学习路径 · MentorLoop</title>
  <meta name="description" content="从 HTML 到框架的系统前端学习路径">
  <html lang="zh-CN"> <!-- 实际写在 <html> 上 -->
</head>
```
缺 `viewport` 移动端会缩放异常；缺 `lang` 读屏可能读错音。

## 面试视角
*"viewport 是做什么的？不写会怎样？"* 答：声明页面按设备宽度渲染、初始缩放 1。不写时移动浏览器按约 980px 桌面宽度排版再整体缩放到屏幕，导致点击区域过小、体验差。追问：lang 属性作用？答：指定内容语言，辅助读屏/翻译选择正确语言。

---

---

## HTML5 新特性与渐进增强

## 心智模型
**渐进增强**就像盖楼：**先保证毛坯能住人（无 JS 也能看内容、能提交）**，再装修（用 JS 加交互、动画、局部刷新）。反过来"先豪华装修、毛坯不能住"就是错误路子——一旦 JS 挂了，整页崩。

## 核心知识点（锚定 MDN）
- **HTML5 新能力**（相对旧 HTML4）：新增语义标签（`<header>/<nav>/<main>`…）、新表单类型（`email/date/range`）、`<canvas>`（绘图）、`<svg>`（矢量）、`localStorage`/`sessionStorage`（本地存储）、Web Workers（后台线程）。
- **渐进增强（Progressive Enhancement）**：先构建**结构完整、无 JS 也能用**的基线，再用 CSS/JS 增强体验。与"优雅降级"（先做强的、再兼容弱的）方向相反。
- **`localStorage` 边界**：同源下约 **5MB**，仅存字符串（`JSON.stringify`），**任何用户可改、不可存敏感信息**（token 别放这）。
- **安全**：`element.innerHTML = 用户输入` 是经典 **XSS** 入口，应转义或用 `textContent`。

> 来源：[MDN · Progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_enhancement) · [MDN · HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)

## 为什么重要 / 何时会用到
决定页面在弱网、JS 报错、老浏览器下的健壮性；也是 SSR/SEO 友好的根基（内容在 HTML 里就能被爬）。

## 常见坑
- **假设 JS 永远在**：把关键内容/提交逻辑全绑在 JS 上，JS 一旦失败（CDN 挂、报错）页面变空白。
- **`localStorage` 存 token**：可被 XSS 偷走、用户能改，敏感凭据应走 httpOnly Cookie。
- **`innerHTML` 拼用户输入**：产生存储型/反射型 XSS。

## 动手自测
```js
// 危险：XSS
el.innerHTML = '<b>' + userInput + '</b>';
// 安全：用 textContent
el.textContent = userInput;
```
若 `userInput` 是 `<img src=x onerror=alert(1)>`，前者会执行脚本，后者只当文本。

## 面试视角
*"渐进增强和优雅降级的区别？"* 答：渐进增强从"最小可用基线"向上增强；优雅降级从"完整功能"向下兼容。前者更稳健。追问：localStorage 能存 JWT 吗？答：不建议——XSS 可窃取、用户可篡改，敏感令牌用 httpOnly Cookie。

---

