<!-- title: 动画与交互动效 -->
<!-- goal: 掌握 CSS 与 JS 两套动画体系、动画性能优化、滚动/手势驱动动效与可访问性，做出流畅且有意义的界面动效。 -->

# fe-c18-s1 | CSS 过渡 transition 基础
> 状态变化时的平滑过渡，是性价比最高的"轻动效"。

## 心智模型
transition 像**电梯的缓启缓停**：你按楼层（改属性值），电梯不会瞬间闪现到目标层，而是用设定的时间和节奏滑过去。你只声明"哪些属性要平滑、用多久、什么节奏"，浏览器自动补中间帧。

## 核心知识点（锚定官方）
- **`transition` 简写（MDN transition）**：`property duration timing-function delay`；可针对多个属性分别设置。
- **可过渡属性**：必须是可插值的数值/颜色/transform，如 `width`、`opacity`、`transform`；`display` 不可过渡。
- **触发方式**：hover、class 切换、`:checked`、JS 改 style 都会触发。

## 为什么重要
绝大多数 UI 微交互（按钮高亮、卡片悬浮、菜单展开）用 transition 就能实现，零 JS、性能好。它是动效入门与日常 80% 场景的首选。

## 常见坑
- 只对 `transition` 声明了属性却忘了加在元素初始态，导致首次无动画。
- 过渡 `height:auto`（不可插值）无效，需用 `max-height` 技巧或 JS/Grid 方案。
- 过渡时间太长显拖沓、太短显突兀。

## 动手自测
1. 写一个按钮，hover 时 `transform: translateY(-2px)` + `box-shadow` 平滑过渡。
2. 用 `max-height` 技巧实现"高度auto"的折叠菜单过渡。

## 面试视角
"transition 作用在哪些属性？为什么 height:auto 不能过渡？触发条件？"——讲清可插值性、max-height 技巧。

# fe-c18-s2 | CSS 关键帧动画 @keyframes
> 多关键帧、可循环的复杂动画，用 @keyframes 编排。

## 心智模型
@keyframes 像**动画的分镜脚本**：你写下"第 0% 在哪、50% 在哪、100% 在哪"，浏览器按 `animation` 指定的时长/次数/方向逐帧播放这段脚本。

## 核心知识点（锚定官方）
- **`@keyframes` + `animation`（MDN CSS animation）**：`name duration timing-function delay iteration-count direction fill-mode`。
- **`iteration-count: infinite`** 循环；**`alternate`** 往返；**`fill-mode`** 控制首尾停留。
- **`animation-play-state: paused`** 可暂停，配合交互。

## 为什么重要
加载动画、轮播、背景动效、loading 骨架都靠 keyframes。它是比 transition 更可控的多段动画工具。

## 常见坑
- 忘记 `animation-name` 与 `@keyframes` 名一致。
- `infinite` 动画一直占合成线程，过多会掉帧（见 s3 性能）。
- 用 `left/top` 做位移动画触发重排，应用 `transform`。

## 动手自测
1. 写一个无限旋转的 loading 圈（@keyframes rotate + transform）。
2. 用 `alternate` 做一个呼吸式透明度脉冲。

## 面试视角
"@keyframes 与 transition 区别？iteration-count/alternate 作用？为什么动画要用 transform？"——讲清多段编排 vs 两态过渡、性能。

# fe-c18-s3 | 动画性能与合成层
> 不是所有属性动画都便宜，transform/opacity 走 GPU 合成层才丝滑。

## 心智模型
浏览器渲染像**工厂流水线三车间**：布局（Layout/重排）→ 绘制（Paint）→ 合成（Composite）。改 `width` 要重跑前两车间（贵），改 `transform`/`opacity` 只动第三车间（便宜，走 GPU）。动画要选"只动合成层"的属性。

## 核心知识点（锚定官方）
- **只触发布局的属性**：`width/height/top/left`（便宜→贵，需重排）。
- **只触发合成的属性（MDN 渲染性能）**：`transform`、`opacity` 通常只走 composite，GPU 加速。
- **`will-change`**：提前提示浏览器为某属性建合成层，但勿滥用（占内存）。

## 为什么重要
卡顿的动画直接毁掉体验。懂渲染管线才能写出 60fps 丝滑动效，而不是"能动但卡"。

## 常见坑
- 用 `top/left` 做位移导致每帧重排，列表滚动卡死。
- 滥用 `will-change` 反而吃光内存、引发层爆炸。
- 同时动画上百个元素，合成压力也顶不住。

## 动手自测
1. 分别用 `left` 和 `transform: translateX` 做位移动画，用 DevTools Performance 对比帧率。
2. 给频繁动画元素加 `will-change: transform` 观察是否提升。

## 面试视角
"为什么 transform 动画更快？重排重绘合成区别？will-change 注意点？"——讲清渲染管线、合成层、GPU。

# fe-c18-s4 | Web Animations API
> 想用 JS 精确控制动画（时序、暂停、回调），用 WAAPI 而非手写 rAF。

## 心智模型
WAAPI（Web Animations API）像**给 CSS 动画装了编程接口**：你用 JS `element.animate(keyframes, options)` 创建动画，返回的 `Animation` 对象能 `play()/pause()/reverse()/onfinish`，既能享受浏览器合成性能，又能被代码精准指挥。

## 核心知识点（锚定官方）
- **`element.animate(keyframes, options)`（MDN Web Animations API）**：keyframes 是 `[{transform:'...'},{...}]`，options 含 duration/easing/fill。
- **`Animation` 对象**：`currentTime`、`playState`、`pause()`、`finish()`、`onfinish` 回调。
- **与 CSS 互补**：声明式用 CSS，需动态编排/同步多动画用 WAAPI。

## 为什么重要
复杂交互动效（拖拽跟手、进度动画、多段编排）用 WAAPI 比 `setInterval` 改 style 更准更顺，且自动走合成层。

## 常见坑
- 用 `setInterval` 改 style 做动画，掉帧且难同步——应优先 WAAPI/CSS。
- 忘记 `fill: 'forwards'` 动画结束回弹到初始态。
- 频繁 `animate` 不清理旧动画，累积内存。

## 动手自测
1. 用 `element.animate` 做一个可暂停/反向播放的卡片翻转动画。
2. 用 `onfinish` 链式触发下一个动画，拼出多段序列。

## 面试视角
"WAAPI 是什么？和 CSS 动画比何时用？为什么不用 setInterval 做动画？"——讲清编程控制、合成性能、场景选择。

# fe-c18-s5 | 缓动函数与物理动效
> 线性运动很机械，合适的缓动让动效"有生命"。

## 心智模型
缓动（easing）像**物体的自然加减速**：现实里东西不会瞬间以匀速启动又瞬间停（那像机器人），它会缓启、冲过一点再回弹（弹性）。`cubic-bezier` 就是描述这条"速度曲线"的数学配方。

## 核心知识点（锚定官方）
- **预置关键字（MDN timing-function）**：`ease`/`ease-in`/`ease-out`/`ease-in-out`/`linear`。
- **`cubic-bezier(x1,y1,x2,y2)`**：自定义贝塞尔曲线，y 可超出 [0,1] 实现回弹（overshoot）。
- **物理动效**：弹簧（spring）曲线模拟真实惯性，比固定时长更自然。

## 为什么重要
动效的"高级感"大半来自缓动。线性运动显廉价，恰当的 ease/spring 让人感觉产品在"回应"自己。

## 常见坑
- 全程 `linear` 显得机械呆板。
- 回弹 overshoot 过度，元素"弹飞"出界。
- 同一界面缓动风格不统一，显得杂乱。

## 动手自测
1. 对比 `linear` 与 `cubic-bezier(.34,1.56,.64,1)`（带回弹）同一动画的观感。
2. 用工具（cubic-bezier.com）调一条"急启缓停"曲线并应用。

## 面试视角
"easing 作用？cubic-bezier 怎么读？为什么弹簧动效更自然？"——讲清速度曲线、自然感、统一风格。

# fe-c18-s6 | 滚动驱动与 Intersection Observer
> 元素进入视口再触发动画，靠 Intersection Observer，而不是 scroll 监听。

## 心智模型
Intersection Observer 像**商场门口的感应器**：你不用一直盯着门口（scroll 事件），感应器在"有人进店"时主动通知你。元素滚进视口这一刻，回调触发，你再让它播放入场动画。

## 核心知识点（锚定官方）
- **`IntersectionObserver`（MDN）**：`observe(target)` 监视，回调拿到 `entry.isIntersecting` 与交叉比例 `intersectionRatio`。
- **滚动驱动动画（CSS scroll-driven animations，较新）**：`animation-timeline: view()` 让动画进度绑定滚动位置。
- **性能**：observer 在独立线程，避免 scroll 主线程抖动。

## 为什么重要
无限列表懒加载、滚动揭示（reveal on scroll）、视差都依赖它。用 scroll 监听 + 手动计算既卡又易错，IO 是官方推荐解法。

## 常见坑
- 在 scroll 事件里直接读 `getBoundingClientRect` 触发重排，卡顿——改用 IO。
- 只 `observe` 不 `unobserve`，元素已处理完仍反复回调。
- 入场动画元素初始 `opacity:0` 但 JS 失败导致永久不可见——要兜底。

## 动手自测
1. 用 IO 实现"滚动到视口时元素淡入上移"的 reveal 效果。
2. 元素动画播完后 `unobserve` 它，避免重复触发。

## 面试视角
"IO 相比 scroll 监听优势？intersectionRatio 用途？滚动动画怎么做？"——讲清线程外计算、懒加载、性能。

# fe-c18-s7 | 手势与交互动效
> 触摸/指针拖拽的跟手反馈，靠 Pointer Events 驱动。

## 心智模型
Pointer Events 像**把鼠标、触摸、手写笔统一成一支"通用笔"**：你只监听 `pointerdown/move/up`，不用分别处理 mouse 和 touch，拖拽时元素"黏"在手指上，松手按位移/速度决定吸附或回弹。

## 核心知识点（锚定官方）
- **Pointer Events（MDN）**：`pointerdown/move/up/cancel`，统一鼠标/触摸/笔；`setPointerCapture` 保证拖出元素仍收到事件。
- **跟手动效**：用 `transform` 实时跟随指针，松手用 WAAPI/transition 回弹。
- **`touch-action`**：CSS 声明哪类手势由 JS 处理、哪类交给浏览器滚动，避免冲突。

## 为什么重要
滑块、拖拽排序、 swipe 卡片、画板都依赖指针交互。处理不好会出现"拖一半丢了事件""和页面滚动打架"。

## 常见坑
- 只监听 mouse 事件，移动端触摸无效——用 Pointer Events 统一。
- 拖出元素边界后收不到 move——要用 `setPointerCapture`。
- 没设 `touch-action`，拖拽时页面跟着滚。

## 动手自测
1. 用 Pointer Events 做一个可拖拽卡片，松手回弹到原位。
2. 给容器设 `touch-action: none` 验证拖拽不再触发页面滚动。

## 面试视角
"Pointer Events 解决什么？为什么用 setPointerCapture？touch-action 作用？"——讲清统一输入、事件捕获、滚动冲突。

# fe-c18-s8 | 动画可访问性
> 部分用户会因动画产生不适，必须尊重 `prefers-reduced-motion`。

## 心智模型
可访问性像**为晕车的人提供平稳模式**：有些人看大幅位移/闪烁会眩晕或引发前庭不适。系统里有个"减少动态效果"开关（`prefers-reduced-motion`），你的动效要"看到这个开关就自动收敛"。

## 核心知识点（锚定官方）
- **`@media (prefers-reduced-motion: reduce)`（MDN）**：在此媒体查询内关闭/弱化动画、改用瞬时切换。
- **禁用范围**：避免视差、长位移、闪烁（闪烁还可能触发光敏癫痫，需避开高频闪）。
- **WAAPI/CSS 都该响应**：不仅是 CSS，JS 动画也要检测该偏好。

## 为什么重要
可访问性既是合规（WCAG 2.3.3 动画/2.2.2 暂停）也是基本素养。忽视它会让部分用户直接无法使用你的产品。

## 常见坑
- 全站炫酷动效但对 `prefers-reduced-motion` 毫无响应。
- 用高频闪烁（>3次/秒）触发光敏风险。
- 只关 CSS 动画，JS（WAAPI）动画仍在跑。

## 动手自测
1. 在系统开启"减少动态效果"，验证你的页面动画自动降级为瞬时。
2. 用 `@media` 把 `transition/animation` 设为 `none` 或极短。

## 面试视角
"为什么要有 reduced-motion？WCAG 相关要求？CSS 怎么实现？"——讲清前庭安全、媒体查询、JS 也需响应。

# fe-c18-s9 | 动效设计原则
> 动效不是装饰，是"帮用户理解状态变化"的语言。

## 心智模型
好的动效像**好的肢体语言**：它告诉你"东西从哪来、到哪去、现在处于什么状态"。差的动效像吵闹的装饰——喧宾夺主。原则就一句：动效应服务理解，而非炫技。

## 核心知识点（锚定官方）
- **功能先行（Material Motion / Apple HIG Motion）**：引导注意力、解释空间关系、提供操作反馈。
- **时机与节奏**：时长 200–500ms 为宜，过短像没动、过长显拖沓；统一缓动风格。
- **避免无意义的装饰动画**：首屏大量自动播放动效会分散注意力、拖慢感知性能。

## 为什么重要
动效是体验的"软实力"。用对的动效能降低认知负荷、提升专业感；滥用则显得廉价、甚至惹人烦。

## 常见坑
- 为了"酷"加满自动播放大动画，拖慢首屏、干扰阅读。
- 同一产品动效风格/时长不一致，显得业余。
- 动效遮挡关键内容或阻断操作（如全屏遮罩动画无法跳过）。

## 动手自测
1. 给一个列表增删项加"插入/移除"过渡，让用户清楚"谁变了"。
2. 审查自己页面的自动播放动画，去掉纯装饰、保留功能性动效。

## 面试视角
"动效设计的核心原则？如何避免动效过度？时长怎么定？"——讲清功能导向、克制、节奏统一。
