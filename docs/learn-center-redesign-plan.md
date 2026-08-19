# 学习中心 · 方向分类重构方案（v2，决策已确认）

> 状态：技术方案 + 任务拆解（v2）。**尚未改动任何代码**。
> 背景：用户指出"技术方向"滚动 tab 不满意，根因是对"方向领域归类"本身不满意。经核对，根因是**同一套四大模块被三套互不相容的分类法切分**，且学习中心这套内部混了多种分类轴、与真实内容严重错位。
> v2 变化：根据 4 个决策点（见 §8）把"统一拍平到路线图 subTrack"升级为**两层分类（大类 → 子方向）**；平台赛道（尤其小程序）从"转官方文档"改为"建为真实大类 + 子方向"。

---

## 1. 问题复盘（证据，已用真实数据校对）

### 1.1 三套互不相容的分类法
| 位置 | 来源 | 前端示例 |
|---|---|---|
| 学习中心 / 首页模块卡 | `app/data/moduleSubtracks.ts` | web/css/js/ts/react/vue/工程化/性能/安全/鸿蒙/原生/跨端/小程序/桌面/可视化（15 项，混 4 种轴） |
| 题库·技能树 / /roadmap | `skillRoadmap.ts` 的 `subTracks` | fe-web / fe-mobile / fe-app / fe-native / fe-harmony / fe-miniprogram / fe-desktop / fe-viz … |
| 题库·技术筛选 | `interview_questions.tech` 自由文本 | JavaScript / 工程化·构建 / 浏览器·渲染 / CSS / React / 性能优化 / 安全 …（39 个取值） |

三套彼此无法映射，用户跨页被迫重新理解分类。

### 1.2 学习中心内部混轴 + 与内容错位（DB 实测）
- **前端（70 章）混 4 种轴**：语言(JS/TS) + 框架(React/Vue) + 关注点(工程化/性能/安全) + 平台(鸿蒙/小程序/跨端/桌面/原生/可视化)。
- **内容倒挂**：小程序 10 / Vue 8 / 鸿蒙 8 / 跨端 8 / 可视化 7 / 原生 7 / 工程化 7 / 桌面 5 / JS 4，而 **web/CSS/TS/React/性能/安全 各仅 1 章**——15 个平级 tab 暗示"同等重要"，实则 90% 堆在平台赛道。
- **phantom tab（配置 0 章）**：后端 `nodejs`/`redis`；运维 `k8s`。
- 单 `subtrack` 字段强制每章只属一个方向，"性能/安全/工程化"等跨切面关注点被迫塞进某框架，归类生硬。

---

## 2. 核心决策（v2）：两层分类（大类 → 子方向）

把"方向"统一到**单一权威数据模型 `LEARNING_TAXONOMY`**（新增，取代 `moduleSubtracks.ts`），结构为：

```
模块 (frontend/backend/devops/ai)
 └─ 大类 DirectionGroup（单轴一致，如"小程序""Web 基础与框架""鸿蒙"）
      └─ 子方向 Direction（每个有独立身份/内容）
           ├─ select: 'nav'   单选子导航（如小程序的微信/支付宝/抖音/uni-app/Taro）
           └─ select: 'filter' 多选筛选 chip（如 fe-web 的 React/Vue/TS 作为筛选，不单独成 tab）
           └─ chapterSubtracks[] 关联 chapters.subtrack 取值（聚合计数）
           └─ techTags[]        关联 interview_questions.tech 取值（题库归并）
```

**为什么是两层而不是一层拍平：**
1. **根治混轴**：大类内部单轴一致（"小程序"下全是小程序技术，"Web 基础与框架"下全是 Web 技术），不再把语言/框架/关注点/平台压平一行。
2. **顺手消灭横向滚动条**：前端从 15 个平级 tab → **8 个大类**；每个大类下子方向用"可换行 chip 组 / 左栏二级导航"呈现，不再横向 scroller。
3. **回应"小程序是大类"**：小程序作为大类，下挂 微信小程序(原生) / 支付宝小程序 / 抖音小程序 / uni-app / Taro——既有名也有实，而非转成空官方文档卡。
4. **React/Vue 降级**：归入 `fe-web` 大类，作为 `filter` 筛选 chip（决策 1），不再占顶级 tab，但仍是可点的内容筛选维度。
5. **题库三处统一**：`LEARNING_TAXONOMY` 同时驱动学习中心方向、/roadmap 技能树、题库技术筛选（tech 列按 `techTags` 归一，决策 3）。

---

## 3. 目标分类树（两层）

> 括号内为当前 `chapters.subtrack` 真实章节数（实测）。`nav`=单选子导航；`filter`=多选筛选。

### frontend（8 大类，替代原 15 平级）
| 大类 | 子方向（select 模式） | 关联 subtrack（章节数） |
|---|---|---|
| **Web 基础与框架** `fe-web` | React `filter`、Vue `filter`、JavaScript `filter`、TypeScript `filter`、CSS `filter`、Web基础 `filter`、工程化 `filter`、性能 `filter`、安全 `filter` | react(1)/vue(8)/javascript(4)/typescript(1)/css(1)/web(1)/engineering(7)/performance(1)/security(1) |
| **小程序** `fe-miniprogram` | 微信小程序(原生) `nav`、支付宝小程序 `nav`、抖音小程序 `nav`、uni-app `nav`、Taro `nav` | miniprogram(10)（P5 按框架拆子方向） |
| **鸿蒙** `fe-harmony` | ArkTS/ArkUI `nav`、元服务 `nav` | harmony(8) |
| **跨端** `fe-cross` | React Native `nav`、Flutter `nav` | cross(8) |
| **原生客户端** `fe-native` | Android/Kotlin `nav`、iOS/Swift `nav` | native(7) |
| **桌面端** `fe-desktop` | Electron `nav`、Tauri `nav`、Qt `nav` | desktop(5) |
| **可视化** `fe-viz` | Canvas/SVG `nav`、WebGL/Three.js `nav`、ECharts/D3 `nav` | visualization(7) |
| **移动端 H5/响应式** `fe-mobile` | 视口适配 `filter`、响应式 `filter`、Hybrid/JSBridge `filter` | （路线图已有，内容待补，先作官方/路线图入口） |

### backend（3 大类，替代原 7 平级 + 消除 nodejs/redis phantom）
| 大类 | 子方向（filter） | 关联 subtrack |
|---|---|---|
| **服务端开发** `be-web` | Java、Python、Go、Node.js | java(7)/nodejs(0→删或官方) |
| **数据存储** `be-data` | MySQL、Redis、MongoDB | mysql(2)/redis(0→删或官方) |
| **架构与中间件** `be-arch` | 微服务、消息队列、系统设计 | micro(2)/mq(1)/system(4) |

### devops（4 大类，替代原 6 + 消除 k8s phantom）
| 大类 | 子方向（filter） | 关联 subtrack |
|---|---|---|
| **系统与网络** `do-os` | Linux、网络 | linux(4)/network(1) |
| **容器与编排** `do-container` | Docker、K8s | docker(1)/k8s(0→官方/待补) |
| **CI/CD** `do-cicd` | CI/CD | cicd(1) |
| **SRE/可观测** `do-sre` | SRE | sre(1) |

### ai（1 大类，5 子方向——路线图已单轴一致）
| 大类 | 子方向（nav） | 关联 subtrack |
|---|---|---|
| **AI 应用工程** `ai-app` | Prompt、RAG、Agent、Eval、部署与成本 | prompt(2)/rag(2)/agent(1)/eval(1)/deploy(1) |

---

## 3.5 小程序（及平台赛道）更好的归类方案

用户原话："小程序方向其实有很多技术方向，比如 uniapp、taro、原生小程序等，严格来说这是一个大类。"

**v1 方案的不足**：把 `fe-miniprogram` 等平台赛道拍平成路线图 subTrack、或"转官方文档入口"——丢失了"小程序内部还有 uniapp/taro/原生"这一真实结构，用户必然觉得仍不对。

**v2 方案（本方案采用）**：
- **小程序 = 一个大类（`fe-miniprogram`）**，下挂 5 个子方向：`微信小程序(原生)` / `支付宝小程序` / `抖音小程序` / `uni-app` / `Taro`。
- 这 5 个子方向是 `nav` 模式（单选子导航），每个有独立身份；当前 10 章 `miniprogram` 内容在 P5 按框架拆分子方向归属，P1–P3 阶段先整体挂在 `fe-miniprogram` 大类下（不丢内容、不转空官方卡）。
- 同理泛化到其它平台赛道：`fe-harmony`/`fe-cross`/`fe-native`/`fe-desktop`/`fe-viz` 都是"大类 + 子方向"，与小程序同构——**统一心智模型**：看到一个大类中含多个 `nav` 子方向，就知道这是一个"技术族"。
- `fe-web` 是反例对照：它下面是 `filter` 筛选 chip（React/Vue/TS 是同一 Web 技术栈的不同切面，应可多选叠加筛选，而非互斥导航），用 `select` 模式区分两种语义，避免一刀切。

此方案的额外收益：**横向滚动条彻底消失**（前端 8 大类 → 可换行 chip；每个大类内子方向也用换行 chip / 左栏二级导航，不再 15 卡横滑）。

---

## 4. 数据层改造

### 4.1 新增 `app/data/learningTaxonomy.ts`（取代 `moduleSubtracks.ts`）
- 导出 `LEARNING_TAXONOMY: Record<ModuleId, DirectionGroup[]>`（见 §3 树）。
- 每个 `Direction` 带 `chapterSubtracks[]` 与 `techTags[]`，供聚合与题库归并使用。
- 保留 `getSubtracks(moduleId)` / `getSubtrack(...)` 兼容签名（内部转读新结构），降低页面改动面。

### 4.2 `interview_questions.tech` 规范化（决策 3：一起规范，非仅展示层）
- 建立 `tech → directionId` 全量映射（覆盖现有 39 个 tech 取值；未命中者保留原值并告警）。
- 一次性迁移脚本改写库内 `tech` 为规范方向名（如 `工程化/构建`→`fe-web·工程化`、`浏览器/渲染`→`fe-web·性能/浏览器`、`Kubernetes`→`do-container·K8s`）。
- 校验：改写后每个 `tech` 必须能解析到 `LEARNING_TAXONOMY` 某 `Direction`，否则中止并回滚。

### 4.3 `chapters.subtrack` 重映射
- 旧 id（`web/css/javascript/...`）→ 新 `chapterSubtracks` 取值（按 §3 映射）。
- 迁移脚本带 **校验 + 回滚**：先备份 `devmentor.db`，再改写；`--dry-run` 只校验覆盖率不落库；`--rollback` 还原备份。

### 4.4 废弃 `moduleSubtracks.ts`
- 页面/接口方向来源改为 `LEARNING_TAXONOMY`，消除第二套分类。

---

## 5. 接口与页面改造

### 5.1 `/api/modules`（server/api/modules.get.ts）
- 按 `LEARNING_TAXONOMY` 聚合：返回 `groups[{ id,name,color, directions:[{id,name,select,count}] }]`，`count` 来自 `chapters.subtrack` 命中 `chapterSubtracks` 的章节数（含 0 → 前端标记 phantom 并隐藏）。

### 5.2 学习中心页面
- `app/pages/learn/index.vue`：模块卡方向标签取 `LEARNING_TAXONOMY`，与模块页一致（消除"首页 6 个 +N / 模块页全量"不一致）。
- `app/pages/learn/[module]/index.vue`：
  - 一级导航 = **大类 chip 组（可换行，无横滑）**；
  - 选大类后，二级 = 该大类 `directions`：`nav` 渲染为子方向 tab/左栏，`filter` 渲染为多选筛选 chip；
  - **彻底删除"横向 scroller + 左右箭头 + 渐变遮罩"**；
  - "全部" tab 颜色跟随模块色，不再硬编码品牌色；
  - 模块网格 `md:grid-cols-3` → `md:grid-cols-2 lg:grid-cols-4`，消除孤儿卡。

### 5.3 题库一致性
- `InterviewBank.vue` 技能树模式按 `LEARNING_TAXONOMY` 渲染（与学习中心同源）；"按技术筛选"直接读规范后的 `tech`（决策 3 已归一），三处方向名天然一致。

---

## 6. 内容重平衡（前端核心补章，P5）
- `fe-web` 当前由多个 1 章 stub 组成，需按路线图 `fe-web` 技能点扩写为合理章节（目标每核心技能 1–3 章），让"方向"既有名也有实。
- 平台赛道章节（小程序 10 / 鸿蒙 8 / 跨端 8 等）在 P5 按子方向拆分归属（如小程序 10 章 → 微信/支付宝/抖音/uni-app/Taro 各自归属）。

---

## 7. 分阶段任务拆解（checkpoint 制）

- **P0 方案确认**：本 v2 文件（§8 决策已确认）。
- **P1 数据模型 + 迁移（含 tech 归一）**：写 `app/data/learningTaxonomy.ts` → 写 `scripts/migrate-learning-taxonomy.mjs`（dry-run/apply/rollback + 校验）→ 先 `--dry-run` 验证覆盖率 → 确认后 `--apply`。库内 `subtrack`/`tech` 全部合法且归一。
  - **P1 实际执行范围（2026-08-19）**：已建 `learningTaxonomy.ts` 与迁移脚本；**仅执行 `tech` 列归一（4073 行）**。`chapters.subtrack` **暂不迁移**——保留旧值由 `taxonomy.chapterSubtracks` 引用，避免学习中心页面（仍读 `moduleSubtracks` 旧 id）出现空计数半成品态。subtrack 迁移留待 P2/P3 页面+接口同步改造时原子化进行（届时需将 `chapterSubtracks` 改为新 id）。仅 `综合`（9 行）按方案保留原值并告警。回滚点：`data/.bak/devmentor.db.20260819-133508`。
- **P2 接口层**：`/api/modules` 按新结构聚合 + 返回 phantom 标记。
  - **实际执行（2026-08-19）**：**未改 API 契约**。经核对，`/api/modules` 与 `/api/modules/[id]` 已返回 `subtracks: { [subtrack]: {chapterCount, sectionCount} }`，而 `LEARNING_TAXONOMY` 的 `chapterSubtracks` 引用的正是这些旧 subtrack 值，因此分组/计数/筛选全部在**客户端基于统一分类模型**完成，单一数据源、零 API 风险。此偏差较 §5.1 更安全且等价，已采用。
- **P3 学习中心页面**：两层导航（大类 chip + 子方向 tab/筛选）；去横滑；颜色/网格修正。
  - **实际执行（2026-08-19）**：已重写 `app/pages/learn/index.vue`（模块卡方向标签改从 `LEARNING_TAXONOMY` 计算，phantom 隐藏，深链 `?group=&direction=`）与 `app/pages/learn/[module]/index.vue`（大类 wrap chip 组 + 二级子方向：`nav` 单选 tab / `filter` 多选 chip；章节按 `direction→chapterSubtracks→chapter.subtrack` 过滤；彻底删除横向 scroller/箭头/遮罩；"全部"色随模块色；`official` 方向显示占位卡引导至路线图；移动端统一为响应式布局）。
  - **已删除** `app/data/moduleSubtracks.ts`（第二套分类，方案 §4.4；确认仅其自身与 `scripts/gen-learn.mjs`（自带 SUBTRACKS 常量）引用，删除无副作用）。
  - **验证**：`nuxt dev` 启动后 SSR 渲染 `/learn` 与 `/learn/{frontend,backend,devops,ai}` 均返回 200；新标记（方向大类 / Web 基础与框架 / 移动端 H5 等）存在、旧横滑控件（dir-nav/dir-fade/direction-card）为 0；初判的 TypeError/Cannot read 实为章节正文教学内容，非组件报错。
- **P4 题库展示归并**：`InterviewBank` 改读 `LEARNING_TAXONOMY`，验证三处一致。
- **P5 内容补齐**：fe-web 核心扩章 + 平台赛道按子方向拆章。
- **P6 联调回归**：三处方向一致；phantom 清零；视觉走查；单测（subtrack 合法性、modules 接口、tech 映射覆盖率）。

每阶段结束给可审查 checkpoint，不一次性 bulk 输出。

---

## 8. 决策点（已确认）

1. **方向粒度**：✅ 接受 React/Vue 降级为 `fe-web` 的 `filter` 筛选 chip（不再顶级方向）。
2. **平台赛道（小程序等）**：✅ 不做成"官方文档空卡"，**建成真实大类 + 子方向**。小程序 = 大类，下挂 微信小程序(原生)/支付宝小程序/抖音小程序/uni-app/Taro（§3.5）。
3. **题库 `tech` 列**：✅ 本次**一起规范**（连库内原始值归一），不只展示层归并。
4. **优先级**：✅ 先做 **P1–P3**（分类统一 + 布局止血）即可上线改善，P4–P5 内容补齐后续分批。

---

## 9. 验收标准
- 学习中心、题库·技能树、题库·技术筛选三处"方向"命名一致、可互相映射（同源 `LEARNING_TAXONOMY`）。
- 无 phantom tab（配置方向必有内容，或明确为官方/路线图入口）。
- 前端方向从 15 平级 → 8 大类，桌面端方向导航**无横向滚动条**。
- `interview_questions.tech` 全部归一为规范方向名，映射覆盖率 100%（未命中保留并告警）。
- 前端核心方向（fe-web 内 JS/CSS/TS/框架/工程化/性能/安全）章节数合理（P5 后不再全是 1 章）。
