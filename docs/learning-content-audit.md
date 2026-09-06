# 学习中心内容完整性审计清单

> 生成时间：2026-09-06 ｜ 数据源：`data/seed-content.json`（modules 4 个 / 章节 409 / 小节 1802）

## 完整性判定口径（Rubric）

每个小节（section）视为「完整」需满足：
- content 非空、含「## 核心知识点（锚定官方）」（已核验：**100% 全覆盖，0 缺失**）
- 含下列教学块：**为什么重要/何时会用到、常见坑、动手自测、面试视角**（必填）
- 含「## 相关知识图谱」为**可选**跨链增强，不计入不完整（当前覆盖率仅 16.4%，单独标注）
- 小节 `direction`（学习目标）字段非空（元数据）

## 总体统计

| 缺失项 | 缺失小节数 | 占比 | 性质 |
|---|---|---|---|
| 为什么重要/何时会用到 | 88 | 4.9% | 必填 |
| 常见坑 | 1 | 0.1% | 必填 |
| 动手自测 | 52 | 2.9% | 必填 |
| 面试视角 | 739 | 41.0% | 必填 |
| 相关知识图谱 | 1507 | 83.6% | 可选 |
| direction 字段 | 129 | 7.2% | 元数据 |

**至少缺失 1 个必填教学块的小节：827 个**
**至少缺失 1 个必填块或 direction 的小节：904 个**

## 各模块 → 章节 → 小节 不完整清单

### frontend（前端开发）— 138 个章节存在不完整小节

#### fe-c16 · 工程化 · Node.js 基础与服务端 JS 〔engineering〕
- `fe-c16-s1`（Node 运行时与事件循环）：缺 direction缺失
- `fe-c16-s2`（模块系统：CommonJS 与 ESM）：缺 direction缺失
- `fe-c16-s3`（流 Stream 与管道）：缺 direction缺失
- `fe-c16-s4`（文件系统 fs）：缺 direction缺失
- `fe-c16-s5`（HTTP 与原生服务器）：缺 direction缺失
- `fe-c16-s6`（进程、子进程与多核）：缺 direction缺失
- `fe-c16-s7`（错误处理与异常兜底）：缺 direction缺失
- `fe-c16-s8`（BFF 与 SSR 运行时）：缺 direction缺失
- `fe-c16-s9`（包管理与依赖治理）：缺 direction缺失

#### fe-c17 · 工程化 · 前端设计模式与架构 〔engineering〕
- `fe-c17-s1`（设计模式总览与选型）：缺 direction缺失
- `fe-c17-s2`（观察者模式与发布订阅）：缺 direction缺失
- `fe-c17-s3`（模块模式与命名空间）：缺 direction缺失
- `fe-c17-s4`（组合模式与组件组合）：缺 direction缺失
- `fe-c17-s5`（单例与服务定位）：缺 direction缺失
- `fe-c17-s6`（状态管理范式）：缺 direction缺失
- `fe-c17-s7`（微前端架构）：缺 direction缺失
- `fe-c17-s8`（模块联邦 Module Federation）：缺 direction缺失
- `fe-c17-s9`（Monorepo 工程化）：缺 direction缺失

#### fe-c18 · 工程化 · 动画与交互动效 〔engineering〕
- `fe-c18-s1`（CSS 过渡 transition 基础）：缺 direction缺失
- `fe-c18-s2`（CSS 关键帧动画 @keyframes）：缺 direction缺失
- `fe-c18-s3`（动画性能与合成层）：缺 direction缺失
- `fe-c18-s4`（Web Animations API）：缺 direction缺失
- `fe-c18-s5`（缓动函数与物理动效）：缺 direction缺失
- `fe-c18-s6`（滚动驱动与 Intersection Observer）：缺 direction缺失
- `fe-c18-s7`（手势与交互动效）：缺 direction缺失
- `fe-c18-s8`（动画可访问性）：缺 direction缺失
- `fe-c18-s9`（动效设计原则）：缺 direction缺失

#### hm-c1 · 鸿蒙 · HarmonyOS 概述与开发环境 〔harmony〕
- `hm-c1-s1`（HarmonyOS 系统简介）：缺 —
- `hm-c1-s2`（开发工具与环境搭建）：缺 —
- `hm-c1-s3`（ArkTS 语言基础）：缺 —

#### hm-c2 · 鸿蒙 · ArkUI 声明式开发基础 〔harmony〕
- `hm-c2-s1`（ArkUI 概述与开发范式）：缺 —
- `hm-c2-s2`（基础组件与布局）：缺 —
- `hm-c2-s3`（状态管理）：缺 面试
- `hm-c2-s4`（事件处理与交互）：缺 面试

#### hm-c3 · 鸿蒙 · ArkUI 进阶组件与布局 〔harmony〕
- `hm-c3-s1`（高级组件（List、Grid、Stack等））：缺 面试
- `hm-c3-s2`（自定义组件与组件化）：缺 —
- `hm-c3-s3`（响应式布局与屏幕适配）：缺 —
- `hm-c3-s4`（动画与视觉效果）：缺 面试

#### hm-c4 · 鸿蒙 · 应用模型与生命周期 〔harmony〕
- `hm-c4-s1`（应用模型概述）：缺 —
- `hm-c4-s2`（UIAbility 与页面生命周期）：缺 面试
- `hm-c4-s3`（应用上下文与资源管理）：缺 面试

#### hm-c5 · 鸿蒙 · 数据管理与持久化 〔harmony〕
- `hm-c5-s1`（本地存储（Preferences））：缺 —
- `hm-c5-s2`（关系型数据库（RDB））：缺 —
- `hm-c5-s3`（分布式数据管理）：缺 面试

#### hm-c6 · 鸿蒙 · 网络与媒体能力 〔harmony〕
- `hm-c6-s1`（网络请求（HTTP/WebSocket））：缺 —
- `hm-c6-s2`（图像与多媒体处理）：缺 面试
- `hm-c6-s3`（文件与数据访问）：缺 面试

#### hm-c7 · 鸿蒙 · 设备能力与分布式特性 〔harmony〕
- `hm-c7-s1`（设备能力调用（传感器、蓝牙等））：缺 —
- `hm-c7-s2`（分布式软总线与跨设备协同）：缺 —
- `hm-c7-s3`（原子化服务与元服务）：缺 面试

#### hm-c8 · 鸿蒙 · 调试、测试与发布 〔harmony〕
- `hm-c8-s1`（调试工具与日志分析）：缺 面试
- `hm-c8-s2`（单元测试与UI测试）：缺 面试
- `hm-c8-s3`（应用打包与上架）：缺 —

#### nat-c1 · 原生 · 平台基础与开发环境 〔native〕
- `nat-c1-s1`（iOS开发环境与Xcode入门）：缺 —
- `nat-c1-s2`（Android开发环境与Android Studio入门）：缺 —
- `nat-c1-s3`（平台架构与生命周期）：缺 面试

#### nat-c2 · 原生 · 用户界面与交互 〔native〕
- `nat-c2-s1`（SwiftUI界面构建）：缺 —
- `nat-c2-s2`（Jetpack Compose界面构建）：缺 —
- `nat-c2-s3`（主题与样式）：缺 —

#### nat-c3 · 原生 · 数据持久化与网络 〔native〕
- `nat-c3-s1`（本地数据持久化）：缺 —
- `nat-c3-s2`（网络请求与API集成）：缺 面试
- `nat-c3-s3`（异步编程与并发）：缺 —

#### nat-c4 · 原生 · 系统服务与硬件集成 〔native〕
- `nat-c4-s1`（相机与媒体）：缺 面试
- `nat-c4-s2`（定位与地图）：缺 —
- `nat-c4-s3`（传感器与硬件访问）：缺 面试

#### nat-c5 · 原生 · 应用架构与设计模式 〔native〕
- `nat-c5-s1`（MVVM架构模式）：缺 面试
- `nat-c5-s2`（依赖注入）：缺 面试
- `nat-c5-s3`（模块化与组件化）：缺 面试

#### nat-c6 · 原生 · 测试与调试 〔native〕
- `nat-c6-s1`（单元测试）：缺 —
- `nat-c6-s2`（UI测试）：缺 —
- `nat-c6-s3`（调试与性能分析）：缺 —

#### nat-c7 · 原生 · 发布与分发 〔native〕
- `nat-c7-s1`（iOS应用发布）：缺 —
- `nat-c7-s2`（Android应用发布）：缺 —
- `nat-c7-s3`（持续集成与交付）：缺 —

#### mp-c1 · 小程序 · 小程序基础与开发准备 〔miniprogram〕
- `mp-c1-s1`（小程序简介与注册）：缺 —
- `mp-c1-s2`（开发工具与项目创建）：缺 面试
- `mp-c1-s3`（项目结构与配置）：缺 —

#### mp-c2 · 小程序 · 小程序框架核心 〔miniprogram〕
- `mp-c2-s1`（逻辑层与页面生命周期）：缺 面试
- `mp-c2-s2`（视图层与WXML）：缺 —
- `mp-c2-s3`（样式与WXSS）：缺 —
- `mp-c2-s4`（事件系统）：缺 —

#### mp-c3 · 小程序 · 组件系统 〔miniprogram〕
- `mp-c3-s1`（基础组件）：缺 面试
- `mp-c3-s2`（表单与媒体组件）：缺 —
- `mp-c3-s3`（自定义组件）：缺 面试

#### mp-c4 · 小程序 · API调用与数据交互 〔miniprogram〕
- `mp-c4-s1`（网络请求）：缺 —
- `mp-c4-s2`（数据缓存）：缺 —
- `mp-c4-s3`（文件与媒体API）：缺 —
- `mp-c4-s4`（位置与设备API）：缺 —

#### mp-c5 · 小程序 · 路由与页面导航 〔miniprogram〕
- `mp-c5-s1`（路由基础）：缺 —
- `mp-c5-s2`（参数传递与页面通信）：缺 —
- `mp-c5-s3`（tabBar与页面导航栏）：缺 面试

#### mp-c6 · 小程序 · 数据绑定与状态管理 〔miniprogram〕
- `mp-c6-s1`（数据绑定与更新）：缺 —
- `mp-c6-s2`（计算属性与观察者）：缺 —
- `mp-c6-s3`（全局状态管理）：缺 —

#### mp-c7 · 小程序 · 组件进阶与交互 〔miniprogram〕
- `mp-c7-s1`（动画与过渡）：缺 —
- `mp-c7-s2`（交互反馈）：缺 —
- `mp-c7-s3`（下拉刷新与上拉加载）：缺 —

#### mp-c8 · 小程序 · 网络与数据安全 〔miniprogram〕
- `mp-c8-s1`（合法域名与HTTPS）：缺 —
- `mp-c8-s2`（数据加密与安全）：缺 —
- `mp-c8-s3`（用户登录与鉴权）：缺 —

#### mp-c9 · 小程序 · 性能优化与发布 〔miniprogram〕
- `mp-c9-s1`（性能优化基础）：缺 面试
- `mp-c9-s2`（分包加载）：缺 —
- `mp-c9-s3`（发布与上线）：缺 —

#### mp-c10 · 小程序 · 综合实战与最佳实践 〔miniprogram〕
- `mp-c10-s1`（项目规划与设计）：缺 —
- `mp-c10-s2`（代码组织与模块化）：缺 面试
- `mp-c10-s3`（调试与测试）：缺 —
- `mp-c10-s4`（发布与运营）：缺 —

#### ht-c1 · Web · HTML 基础与文档结构 〔web〕
- `ht-c1-s1`（HTML 简介）：缺 面试
- `ht-c1-s2`（文档结构）：缺 —
- `ht-c1-s3`（元数据与头部元素）：缺 —
- `ht-c1-s4`（文本内容与排版）：缺 —

#### ht-c2 · Web · 语义化 HTML 〔web〕
- `ht-c2-s1`（语义化概述）：缺 —
- `ht-c2-s2`（文档大纲与分区元素）：缺 面试
- `ht-c2-s3`（内容分组与文本级语义）：缺 面试
- `ht-c2-s4`（链接与导航语义）：缺 —

#### ht-c3 · Web · 表单与用户输入 〔web〕
- `ht-c3-s1`（表单基础）：缺 —
- `ht-c3-s2`（输入类型与控件）：缺 面试
- `ht-c3-s3`（表单验证）：缺 面试
- `ht-c3-s4`（表单无障碍）：缺 面试

#### ht-c4 · Web · 多媒体与嵌入 〔web〕
- `ht-c4-s1`（图像嵌入）：缺 —
- `ht-c4-s2`（音频与视频）：缺 —
- `ht-c4-s3`（嵌入外部内容）：缺 面试
- `ht-c4-s4`（Canvas 与 SVG）：缺 面试

#### ht-c5 · Web · 无障碍（Accessibility） 〔web〕
- `ht-c5-s1`（无障碍概述）：缺 —
- `ht-c5-s2`（ARIA 基础）：缺 —
- `ht-c5-s3`（键盘可访问性）：缺 —
- `ht-c5-s4`（语义化与无障碍的结合）：缺 面试
- `ht-c5-s5`（多媒体无障碍）：缺 —

#### cs-c1 · CSS · CSS 基础与盒模型 〔css〕
- `cs-c1-s1`（CSS 简介与语法）：缺 —
- `cs-c1-s2`（选择器与优先级）：缺 —
- `cs-c1-s3`（层叠与继承）：缺 —
- `cs-c1-s4`（盒模型）：缺 —
- `cs-c1-s5`（值与单位）：缺 —

#### cs-c2 · CSS · 布局基础：Flexbox 与 Grid 〔css〕
- `cs-c2-s1`（Flexbox 核心概念）：缺 面试
- `cs-c2-s2`（Flexbox 高级特性）：缺 —
- `cs-c2-s3`（Grid 核心概念）：缺 面试
- `cs-c2-s4`（Grid 放置与对齐）：缺 面试
- `cs-c2-s5`（Grid 高级模式）：缺 面试

#### cs-c3 · CSS · 响应式设计与媒体查询 〔css〕
- `cs-c3-s1`（响应式设计原则）：缺 面试
- `cs-c3-s2`（媒体查询）：缺 —
- `cs-c3-s3`（现代响应式特性）：缺 —
- `cs-c3-s4`（响应式布局实践）：缺 面试

#### cs-c4 · CSS · CSS 动画与过渡 〔css〕
- `cs-c4-s1`（过渡（Transitions））：缺 —
- `cs-c4-s2`（关键帧动画（Keyframes））：缺 —
- `cs-c4-s3`（变换（Transforms））：缺 面试
- `cs-c4-s4`（动画性能优化）：缺 —

#### cs-c5 · CSS · CSS 架构与方法论 〔css〕
- `cs-c5-s1`（CSS 方法论）：缺 —
- `cs-c5-s2`（CSS 预处理器）：缺 —
- `cs-c5-s3`（CSS 后处理器与工具）：缺 —
- `cs-c5-s4`（CSS 架构模式）：缺 —

#### cs-c6 · CSS · 现代 CSS 特性与进阶 〔css〕
- `cs-c6-s1`（自定义属性（CSS 变量））：缺 —
- `cs-c6-s2`（CSS 函数与数学运算）：缺 —
- `cs-c6-s3`（高级伪类与伪元素）：缺 面试
- `cs-c6-s4`（CSS 嵌套与原生模块）：缺 —
- `cs-c6-s5`（新布局与显示特性）：缺 —

#### cs-c7 · CSS · CSS 性能与调试 〔css〕
- `cs-c7-s1`（CSS 性能优化）：缺 —
- `cs-c7-s2`（浏览器开发者工具）：缺 —
- `cs-c7-s3`（兼容性与降级）：缺 —

#### vu-c1 · Vue · Vue 3 核心基础 〔vue〕
- `vu-c1-s1`（Vue 3 简介与安装）：缺 —
- `vu-c1-s2`（模板语法与指令）：缺 面试
- `vu-c1-s3`（响应式基础）：缺 面试
- `vu-c1-s4`（Class 与 Style 绑定）：缺 —
- `vu-c1-s5`（表单输入绑定）：缺 —

#### vu-c2 · Vue · 组件基础 〔vue〕
- `vu-c2-s1`（组件注册与 Props）：缺 —
- `vu-c2-s2`（组件事件与 v-model）：缺 —
- `vu-c2-s3`（插槽 Slots）：缺 —
- `vu-c2-s4`（组件生命周期）：缺 —
- `vu-c2-s5`（组件边界情况）：缺 —

#### vu-c3 · Vue · 组合式 API 进阶 〔vue〕
- `vu-c3-s1`（setup 函数与 <script setup>）：缺 —
- `vu-c3-s2`（响应式工具函数）：缺 —
- `vu-c3-s3`（组合式函数 (Composables)）：缺 —
- `vu-c3-s4`（依赖注入）：缺 —

#### vu-c4 · Vue · 内置组件与过渡动画 〔vue〕
- `vu-c4-s1`（内置组件）：缺 —
- `vu-c4-s2`（过渡动画）：缺 面试

#### vu-c5 · Vue · Vue Router 路由管理 〔vue〕
- `vu-c5-s1`（路由基础与安装）：缺 —
- `vu-c5-s2`（路由导航）：缺 —
- `vu-c5-s3`（路由参数与查询）：缺 面试
- `vu-c5-s4`（路由守卫）：缺 面试
- `vu-c5-s5`（路由进阶）：缺 —

#### vu-c6 · Vue · Pinia 状态管理 〔vue〕
- `vu-c6-s1`（Pinia 基础与安装）：缺 —
- `vu-c6-s2`（State 与 Getters）：缺 —
- `vu-c6-s3`（Actions）：缺 面试
- `vu-c6-s4`（Pinia 插件与持久化）：缺 —

#### vu-c7 · Vue · 工程化与最佳实践 〔vue〕
- `vu-c7-s1`（Vue 3 工具链）：缺 —
- `vu-c7-s2`（TypeScript 支持）：缺 —
- `vu-c7-s3`（测试）：缺 面试
- `vu-c7-s4`（部署与生态）：缺 —

#### sc-c1 · 安全 · Web 安全基础 〔security〕
- `sc-c1-s1`（安全目标与威胁模型）：缺 —
- `sc-c1-s2`（OWASP 与安全资源）：缺 —
- `sc-c1-s3`（Web 攻击分类）：缺 面试

#### sc-c2 · 安全 · 跨站脚本攻击（XSS） 〔security〕
- `sc-c2-s1`（XSS 原理与危害）：缺 —
- `sc-c2-s2`（反射型 XSS）：缺 —
- `sc-c2-s3`（存储型 XSS）：缺 —
- `sc-c2-s4`（DOM 型 XSS）：缺 —
- `sc-c2-s5`（XSS 防御策略）：缺 —
- `sc-c2-s6`（XSS 检测与测试）：缺 面试

#### sc-c3 · 安全 · 跨站请求伪造（CSRF） 〔security〕
- `sc-c3-s1`（CSRF 原理与攻击流程）：缺 —
- `sc-c3-s2`（CSRF 攻击场景）：缺 —
- `sc-c3-s3`（CSRF 防御机制）：缺 面试
- `sc-c3-s4`（CSRF 检测与测试）：缺 —

#### sc-c4 · 安全 · 认证与授权 〔security〕
- `sc-c4-s1`（认证基础）：缺 —
- `sc-c4-s2`（会话管理）：缺 面试
- `sc-c4-s3`（授权模型）：缺 —
- `sc-c4-s4`（认证与授权漏洞）：缺 —
- `sc-c4-s5`（安全认证实践）：缺 —
- `sc-c4-s6`（OAuth 与 OpenID Connect）：缺 —

#### sc-c5 · 安全 · 综合防御与安全开发 〔security〕
- `sc-c5-s1`（安全响应头）：缺 面试
- `sc-c5-s2`（输入验证与输出编码）：缺 面试
- `sc-c5-s3`（安全开发生命周期（SDL））：缺 —
- `sc-c5-s4`（安全测试与工具）：缺 —
- `sc-c5-s5`（应急响应与漏洞管理）：缺 —

#### pf-c1 · 性能 · 性能基础与核心概念 〔performance〕
- `pf-c1-s1`（什么是Web性能）：缺 —
- `pf-c1-s2`（性能指标概览）：缺 面试
- `pf-c1-s3`（性能工具与测量方法）：缺 面试

#### pf-c2 · 性能 · 关键渲染路径 〔performance〕
- `pf-c2-s1`（渲染路径概述）：缺 —
- `pf-c2-s2`（优化DOM与CSSOM）：缺 —
- `pf-c2-s3`（JavaScript对渲染的影响）：缺 —
- `pf-c2-s4`（布局与绘制优化）：缺 面试

#### pf-c3 · 性能 · Web Vitals 核心指标 〔performance〕
- `pf-c3-s1`（Largest Contentful Paint (LCP)）：缺 —
- `pf-c3-s2`（Interaction to Next Paint (INP)）：缺 —
- `pf-c3-s3`（Cumulative Layout Shift (CLS)）：缺 —
- `pf-c3-s4`（其他Web Vitals指标）：缺 —

#### pf-c4 · 性能 · 资源加载优化 〔performance〕
- `pf-c4-s1`（图片优化）：缺 面试
- `pf-c4-s2`（视频与动画优化）：缺 —
- `pf-c4-s3`（字体加载优化）：缺 面试
- `pf-c4-s4`（代码分割与按需加载）：缺 —

#### pf-c5 · 性能 · 网络与传输优化 〔performance〕
- `pf-c5-s1`（HTTP缓存策略）：缺 —
- `pf-c5-s2`（压缩与内容编码）：缺 —
- `pf-c5-s3`（预连接与预加载）：缺 面试
- `pf-c5-s4`（CDN与边缘计算）：缺 —

#### pf-c6 · 性能 · 渲染与交互性能 〔performance〕
- `pf-c6-s1`（减少主线程工作）：缺 面试
- `pf-c6-s2`（优化事件处理）：缺 面试
- `pf-c6-s3`（动画与合成）：缺 —
- `pf-c6-s4`（虚拟滚动与列表优化）：缺 面试

#### pf-c7 · 性能 · 性能测试与监控 〔performance〕
- `pf-c7-s1`（性能预算）：缺 —
- `pf-c7-s2`（实验室测试与自动化）：缺 —
- `pf-c7-s3`（真实用户监控（RUM））：缺 —
- `pf-c7-s4`（性能问题诊断与调试）：缺 —

#### pf-c8 · 性能 · 性能优化实践与案例 〔performance〕
- `pf-c8-s1`（前端框架性能优化）：缺 —
- `pf-c8-s2`（静态站点与SSR性能）：缺 —
- `pf-c8-s3`（移动端性能优化）：缺 —
- `pf-c8-s4`（性能优化案例分析）：缺 —

#### rx-c1 · React · 快速开始 〔react〕
- `rx-c1-s1`（创建和嵌套组件）：缺 —
- `rx-c1-s2`（使用JSX编写标记）：缺 —
- `rx-c1-s3`（添加样式）：缺 —
- `rx-c1-s4`（显示数据）：缺 —
- `rx-c1-s5`（条件渲染）：缺 —
- `rx-c1-s6`（渲染列表）：缺 —

#### rx-c2 · React · 响应事件 〔react〕
- `rx-c2-s1`（添加事件处理器）：缺 —
- `rx-c2-s2`（更新状态）：缺 —
- `rx-c2-s3`（状态提升）：缺 —
- `rx-c2-s4`（状态管理）：缺 —

#### rx-c3 · React · 管理状态 〔react〕
- `rx-c3-s1`（状态与UI）：缺 —
- `rx-c3-s2`（状态结构）：缺 —
- `rx-c3-s3`（状态共享）：缺 —
- `rx-c3-s4`（状态持久化）：缺 —

#### rx-c4 · React · 转义舱口 〔react〕
- `rx-c4-s1`（使用Ref）：缺 —
- `rx-c4-s2`（Effects）：缺 —
- `rx-c4-s3`（自定义钩子）：缺 面试
- `rx-c4-s4`（与外部系统同步）：缺 —

#### rx-c5 · React · API参考：Hooks 〔react〕
- `rx-c5-s1`（状态Hooks）：缺 —
- `rx-c5-s2`（上下文Hooks）：缺 面试
- `rx-c5-s3`（Ref Hooks）：缺 —
- `rx-c5-s4`（Effect Hooks）：缺 —
- `rx-c5-s5`（性能Hooks）：缺 面试
- `rx-c5-s6`（其他Hooks）：缺 面试

#### rx-c6 · React · API参考：组件 〔react〕
- `rx-c6-s1`（内置组件）：缺 —
- `rx-c6-s2`（组件属性）：缺 —

#### rx-c7 · React · API参考：工具函数 〔react〕
- `rx-c7-s1`（React API）：缺 —
- `rx-c7-s2`（React DOM API）：缺 —

#### rx-c8 · React · API参考：组件生命周期 〔react〕
- `rx-c8-s1`（挂载阶段）：缺 —
- `rx-c8-s2`（更新阶段）：缺 —
- `rx-c8-s3`（卸载阶段）：缺 面试

#### ua-c1 · uni-app · 基础入门 〔uniapp〕
- `ua-c1-s1`（uni-app 简介）：缺 —
- `ua-c1-s2`（环境搭建与创建项目）：缺 —
- `ua-c1-s3`（项目目录结构与配置）：缺 —

#### ua-c2 · uni-app · 页面与路由 〔uniapp〕
- `ua-c2-s1`（页面创建与导航）：缺 —
- `ua-c2-s2`（页面生命周期）：缺 面试
- `ua-c2-s3`（路由拦截与权限）：缺 面试

#### ua-c3 · uni-app · 视图与样式 〔uniapp〕
- `ua-c3-s1`（内置组件）：缺 —
- `ua-c3-s2`（样式与响应式）：缺 面试
- `ua-c3-s3`（样式预处理器与主题）：缺 面试

#### ua-c4 · uni-app · 数据绑定与逻辑 〔uniapp〕
- `ua-c4-s1`（模板语法）：缺 面试
- `ua-c4-s2`（事件处理）：缺 面试
- `ua-c4-s3`（计算属性与侦听器）：缺 —

#### ua-c5 · uni-app · 组件化开发 〔uniapp〕
- `ua-c5-s1`（自定义组件）：缺 —
- `ua-c5-s2`（组件通信）：缺 —
- `ua-c5-s3`（插槽与复用）：缺 面试

#### ua-c6 · uni-app · 网络与数据请求 〔uniapp〕
- `ua-c6-s1`（发起网络请求）：缺 —
- `ua-c6-s2`（封装请求工具）：缺 —
- `ua-c6-s3`（状态管理）：缺 面试

#### ua-c7 · uni-app · 本地存储与缓存 〔uniapp〕
- `ua-c7-s1`（同步与异步存储）：缺 —
- `ua-c7-s2`（存储应用场景）：缺 —

#### ua-c8 · uni-app · 跨端兼容与条件编译 〔uniapp〕
- `ua-c8-s1`（条件编译语法）：缺 —
- `ua-c8-s2`（平台差异处理）：缺 面试
- `ua-c8-s3`（跨端最佳实践）：缺 —

#### ua-c9 · uni-app · 原生能力与插件 〔uniapp〕
- `ua-c9-s1`（原生 API 调用）：缺 —
- `ua-c9-s2`（原生插件与扩展）：缺 —

#### ua-c10 · uni-app · 调试与发布 〔uniapp〕
- `ua-c10-s1`（调试工具）：缺 —
- `ua-c10-s2`（多端发布）：缺 —
- `ua-c10-s3`（性能优化与监控）：缺 面试

#### mb-c1 · 移动端 · 响应式设计基础 〔mobile〕
- `mb-c1-s1`（什么是响应式设计）：缺 —
- `mb-c1-s2`（移动优先设计）：缺 —
- `mb-c1-s3`（视口与屏幕尺寸）：缺 —

#### mb-c2 · 移动端 · 媒体查询与断点 〔mobile〕
- `mb-c2-s1`（媒体查询语法）：缺 —
- `mb-c2-s2`（断点选择策略）：缺 面试
- `mb-c2-s3`（媒体查询实践）：缺 面试

#### mb-c3 · 移动端 · 流体布局与弹性单位 〔mobile〕
- `mb-c3-s1`（相对单位：em, rem, %）：缺 面试
- `mb-c3-s2`（流体网格布局）：缺 —
- `mb-c3-s3`（弹性图片与媒体）：缺 —

#### mb-c4 · 移动端 · 响应式布局模式 〔mobile〕
- `mb-c4-s1`（多列流动布局）：缺 面试
- `mb-c4-s2`（网格响应式布局）：缺 面试
- `mb-c4-s3`（圣杯布局与混合模式）：缺 面试

#### mb-c5 · 移动端 · 响应式排版与间距 〔mobile〕
- `mb-c5-s1`（流式字体大小）：缺 —
- `mb-c5-s2`（行高与段落宽度）：缺 —
- `mb-c5-s3`（响应式间距系统）：缺 —

#### mb-c6 · 移动端 · 响应式组件与导航 〔mobile〕
- `mb-c6-s1`（响应式导航栏）：缺 面试
- `mb-c6-s2`（卡片与列表切换）：缺 面试
- `mb-c6-s3`（表格的响应式处理）：缺 —

#### mb-c7 · 移动端 · 响应式图片与媒体 〔mobile〕
- `mb-c7-s1`（srcset与sizes）：缺 —
- `mb-c7-s2`（picture元素与艺术指导）：缺 面试
- `mb-c7-s3`（视频与iframe的响应式）：缺 —

#### mb-c8 · 移动端 · 性能与可访问性 〔mobile〕
- `mb-c8-s1`（移动性能优化）：缺 —
- `mb-c8-s2`（触控与交互适配）：缺 —
- `mb-c8-s3`（可访问性考虑）：缺 面试

#### mb-c9 · 移动端 · 测试与调试 〔mobile〕
- `mb-c9-s1`（浏览器开发者工具）：缺 —
- `mb-c9-s2`（真实设备测试）：缺 —
- `mb-c9-s3`（常见问题排查）：缺 —

#### mb-c10 · 移动端 · 现代响应式进阶 〔mobile〕
- `mb-c10-s1`（容器查询）：缺 —
- `mb-c10-s2`（CSS函数与新特性）：缺 面试
- `mb-c10-s3`（响应式设计模式库）：缺 面试

#### nd-c1 · Node 全栈 · Node.js 入门与基础 〔nodefull〕
- `nd-c1-s1`（Node.js 简介与安装）：缺 —
- `nd-c1-s2`（Node.js 全局对象与模块系统）：缺 —
- `nd-c1-s3`（事件循环与异步编程基础）：缺 —
- `nd-c1-s4`（核心模块：文件系统与路径）：缺 面试
- `nd-c1-s5`（核心模块：HTTP 与 URL）：缺 —

#### nd-c2 · Node 全栈 · Node.js 核心概念进阶 〔nodefull〕
- `nd-c2-s1`（流（Streams））：缺 面试
- `nd-c2-s2`（事件模块（Events））：缺 面试
- `nd-c2-s3`（网络模块：TCP 与 UDP）：缺 面试
- `nd-c2-s4`（子进程与进程管理）：缺 —
- `nd-c2-s5`（全局对象与工具模块）：缺 面试

#### nd-c3 · Node 全栈 · Node.js 与 Web 开发 〔nodefull〕
- `nd-c3-s1`（HTTP 服务器进阶）：缺 面试
- `nd-c3-s2`（Express 框架入门）：缺 面试
- `nd-c3-s3`（中间件与错误处理）：缺 面试
- `nd-c3-s4`（模板引擎与静态资源）：缺 面试
- `nd-c3-s5`（会话与状态管理）：缺 —

#### nd-c4 · Node 全栈 · 数据库集成与数据持久化 〔nodefull〕
- `nd-c4-s1`（连接数据库（SQL））：缺 —
- `nd-c4-s2`（ORM 与查询构建器）：缺 面试
- `nd-c4-s3`（NoSQL 数据库：MongoDB）：缺 面试
- `nd-c4-s4`（缓存与 Redis）：缺 —
- `nd-c4-s5`（数据校验与事务）：缺 面试

#### nd-c5 · Node 全栈 · RESTful API 设计与实现 〔nodefull〕
- `nd-c5-s1`（REST 架构原则）：缺 面试
- `nd-c5-s2`（API 版本控制与错误处理）：缺 —
- `nd-c5-s3`（API 文档与测试）：缺 —
- `nd-c5-s4`（认证与授权）：缺 面试
- `nd-c5-s5`（API 安全最佳实践）：缺 面试

#### nd-c6 · Node 全栈 · BFF 模式与微服务基础 〔nodefull〕
- `nd-c6-s1`（BFF 概念与架构）：缺 —
- `nd-c6-s2`（构建 BFF 层）：缺 面试
- `nd-c6-s3`（GraphQL 与 BFF）：缺 —
- `nd-c6-s4`（服务间通信）：缺 面试
- `nd-c6-s5`（BFF 安全与性能）：缺 面试

#### nd-c7 · Node 全栈 · 测试与调试 〔nodefull〕
- `nd-c7-s1`（单元测试）：缺 —
- `nd-c7-s2`（集成测试）：缺 —
- `nd-c7-s3`（端到端测试）：缺 —
- `nd-c7-s4`（调试技巧）：缺 —
- `nd-c7-s5`（日志与监控）：缺 —

#### nd-c8 · Node 全栈 · 部署与运维 〔nodefull〕
- `nd-c8-s1`（环境准备与配置管理）：缺 面试
- `nd-c8-s2`（进程管理（PM2））：缺 —
- `nd-c8-s3`（容器化部署（Docker））：缺 —
- `nd-c8-s4`（CI/CD 流水线）：缺 —
- `nd-c8-s5`（性能优化与监控）：缺 面试

#### nd-c9 · Node 全栈 · 安全最佳实践 〔nodefull〕
- `nd-c9-s1`（常见 Web 攻击与防御）：缺 面试
- `nd-c9-s2`（认证与会话安全）：缺 面试
- `nd-c9-s3`（依赖安全与代码审计）：缺 —
- `nd-c9-s4`（传输安全与加密）：缺 面试
- `nd-c9-s5`（安全日志与合规）：缺 面试

#### nd-c10 · Node 全栈 · 性能优化与扩展 〔nodefull〕
- `nd-c10-s1`（性能分析工具）：缺 面试
- `nd-c10-s2`（内存管理与泄漏排查）：缺 面试
- `nd-c10-s3`（并发与负载均衡）：缺 面试
- `nd-c10-s4`（缓存策略）：缺 —
- `nd-c10-s5`（异步性能优化）：缺 面试

#### nd-c11 · Node 全栈 · Node.js 生态与工具 〔nodefull〕
- `nd-c11-s1`（包管理器与发布）：缺 面试
- `nd-c11-s2`（常用框架与库）：缺 面试
- `nd-c11-s3`（TypeScript 与 Node.js）：缺 —
- `nd-c11-s4`（GraphQL 与实时通信）：缺 面试
- `nd-c11-s5`（微服务与 Serverless）：缺 —

#### xp-c1f · 跨端 · Flutter 开发基础与环境搭建 〔flutter〕
- `xp-c1f-s1`（跨端开发简介）：缺 —
- `xp-c1f-s2`（Flutter环境搭建）：缺 面试
- `xp-c1f-s3`（开发工具与调试）：缺 面试

#### xp-c2f · 跨端 · Flutter UI 组件与布局 〔flutter〕
- `xp-c2f-s1`（Flutter Widget基础）：缺 面试
- `xp-c2f-s2`（Flutter布局与样式）：缺 —
- `xp-c2f-s3`（列表与滚动视图）：缺 面试

#### xp-c3f · 跨端 · Flutter 状态管理 〔flutter〕
- `xp-c3f-s1`（Flutter状态管理基础）：缺 面试
- `xp-c3f-s2`（Flutter进阶状态管理）：缺 —

#### xp-c4f · 跨端 · Flutter 导航与路由 〔flutter〕
- `xp-c4f-s1`（Flutter导航基础）：缺 —
- `xp-c4f-s2`（Flutter高级导航）：缺 —

#### xp-c5f · 跨端 · Flutter 网络与数据持久化 〔flutter〕
- `xp-c5f-s1`（Flutter网络请求）：缺 —
- `xp-c5f-s2`（Flutter数据持久化）：缺 —

#### xp-c6f · 跨端 · Flutter 原生能力集成 〔flutter〕
- `xp-c6f-s1`（Flutter平台通道）：缺 面试
- `xp-c6f-s2`（Flutter常用插件）：缺 面试

#### xp-c7f · 跨端 · Flutter 测试与调试 〔flutter〕
- `xp-c7f-s1`（Flutter测试基础）：缺 —
- `xp-c7f-s2`（Flutter集成测试与调试）：缺 面试

#### xp-c8f · 跨端 · Flutter 性能优化与发布 〔flutter〕
- `xp-c8f-s1`（Flutter性能优化）：缺 —
- `xp-c8f-s2`（Flutter应用打包与发布）：缺 —

#### dt-c1e · 桌面 · Electron 应用开发基础 〔electron〕
- `dt-c1e-s1`（桌面应用开发概述）：缺 —
- `dt-c1e-s2`（Electron 架构与核心概念）：缺 面试
- `dt-c1e-s3`（开发环境搭建与项目初始化）：缺 —

#### dt-c2 · 桌面 · Electron 核心功能深入 〔electron〕
- `dt-c2-s1`（窗口与界面管理）：缺 —
- `dt-c2-s2`（进程间通信（IPC））：缺 面试
- `dt-c2-s3`（系统集成与原生能力）：缺 面试
- `dt-c2-s4`（数据持久化与文件操作）：缺 —
- `dt-c2-s5`（菜单、托盘与快捷键）：缺 面试

#### dt-c4e · 桌面 · Electron 前端集成与构建优化 〔electron〕
- `dt-c4e-s1`（前端框架集成）：缺 —
- `dt-c4e-s2`（Electron 打包与分发）：缺 面试
- `dt-c4e-s3`（性能优化与调试）：缺 面试

#### dt-c5e · 桌面 · Electron 安全与高级实践 〔electron〕
- `dt-c5e-s1`（安全最佳实践）：缺 面试
- `dt-c5e-s2`（自动化测试）：缺 —
- `dt-c5e-s3`（持续集成与交付（CI/CD））：缺 面试
- `dt-c5e-s4`（应用更新与分发策略）：缺 —

#### dt-c1t · 桌面 · Tauri 应用开发基础 〔tauri〕
- `dt-c1t-s1`（桌面应用开发概述）：缺 —
- `dt-c1t-s2`（Tauri 架构与核心概念）：缺 面试
- `dt-c1t-s3`（开发环境搭建与项目初始化）：缺 —

#### dt-c3 · 桌面 · Tauri 核心功能深入 〔tauri〕
- `dt-c3-s1`（命令系统（Commands））：缺 —
- `dt-c3-s2`（事件系统（Events））：缺 —
- `dt-c3-s3`（文件系统与路径访问）：缺 —
- `dt-c3-s4`（窗口管理与系统集成）：缺 面试
- `dt-c3-s5`（Rust 与前端数据交互进阶）：缺 —

#### dt-c4t · 桌面 · Tauri 前端集成与构建优化 〔tauri〕
- `dt-c4t-s1`（前端框架集成）：缺 —
- `dt-c4t-s2`（Tauri 打包与分发）：缺 —
- `dt-c4t-s3`（性能优化与调试）：缺 面试

#### dt-c5t · 桌面 · Tauri 安全与高级实践 〔tauri〕
- `dt-c5t-s1`（安全最佳实践）：缺 面试
- `dt-c5t-s2`（自动化测试）：缺 —
- `dt-c5t-s3`（持续集成与交付（CI/CD））：缺 面试
- `dt-c5t-s4`（应用更新与分发策略）：缺 —

#### xp-c1r · 跨端 · React Native 开发基础与环境搭建 〔reactnative〕
- `xp-c1r-s1`（跨端开发简介）：缺 —
- `xp-c1r-s2`（React Native环境搭建）：缺 —
- `xp-c1r-s3`（开发工具与调试）：缺 面试

#### xp-c2r · 跨端 · React Native UI 组件与布局 〔reactnative〕
- `xp-c2r-s1`（React Native核心组件）：缺 —
- `xp-c2r-s2`（React Native布局与样式）：缺 面试
- `xp-c2r-s3`（列表与滚动视图）：缺 面试

#### xp-c3r · 跨端 · React Native 状态管理 〔reactnative〕
- `xp-c3r-s1`（React Native状态管理基础）：缺 面试
- `xp-c3r-s2`（React Native进阶状态管理）：缺 面试

#### xp-c4r · 跨端 · React Native 导航与路由 〔reactnative〕
- `xp-c4r-s1`（React Native导航基础）：缺 —
- `xp-c4r-s2`（React Native高级导航）：缺 —

#### xp-c5r · 跨端 · React Native 网络与数据持久化 〔reactnative〕
- `xp-c5r-s1`（React Native网络请求）：缺 —
- `xp-c5r-s2`（React Native数据持久化）：缺 —

#### xp-c6r · 跨端 · React Native 原生能力集成 〔reactnative〕
- `xp-c6r-s1`（React Native原生模块）：缺 面试
- `xp-c6r-s2`（React Native常用库）：缺 —

#### xp-c7r · 跨端 · React Native 测试与调试 〔reactnative〕
- `xp-c7r-s1`（React Native测试基础）：缺 —
- `xp-c7r-s2`（React Native集成测试与调试）：缺 —

#### xp-c8r · 跨端 · React Native 性能优化与发布 〔reactnative〕
- `xp-c8r-s1`（React Native性能优化）：缺 —
- `xp-c8r-s2`（React Native应用打包与发布）：缺 —

#### vz-c1e · 可视化 · 可视化基础与 ECharts 概览 〔echarts〕
- `vz-c1e-s1`（数据可视化导论）：缺 —
- `vz-c1e-s2`（ECharts 概览）：缺 面试

#### vz-c2 · 可视化 · ECharts 基础图表与配置 〔echarts〕
- `vz-c2-s1`（ECharts 快速上手）：缺 —
- `vz-c2-s2`（折线图与面积图）：缺 面试
- `vz-c2-s3`（柱状图与条形图）：缺 —
- `vz-c2-s4`（饼图与环形图）：缺 —
- `vz-c2-s5`（散点图与气泡图）：缺 —

#### vz-c3 · 可视化 · ECharts 高级功能与交互 〔echarts〕
- `vz-c3-s1`（图例与提示框）：缺 —
- `vz-c3-s2`（数据缩放与区域选择）：缺 面试
- `vz-c3-s3`（动画与过渡）：缺 —
- `vz-c3-s4`（主题与自定义）：缺 —
- `vz-c3-s5`（性能优化与大数据量）：缺 面试

#### vz-c1d · 可视化 · 可视化基础与 D3 概览 〔d3〕
- `vz-c1d-s1`（数据可视化导论）：缺 —
- `vz-c1d-s2`（D3 概览）：缺 —

#### vz-c4 · 可视化 · D3 核心：选择集与数据绑定 〔d3〕
- `vz-c4-s1`（选择集与 DOM 操作）：缺 —
- `vz-c4-s2`（数据绑定与 enter/exit）：缺 —
- `vz-c4-s3`（比例尺（Scales））：缺 面试
- `vz-c4-s4`（坐标轴（Axes））：缺 面试

#### vz-c5 · 可视化 · D3 数据可视化实践 〔d3〕
- `vz-c5-s1`（绘制折线图与面积图）：缺 面试
- `vz-c5-s2`（绘制柱状图与散点图）：缺 面试
- `vz-c5-s3`（布局（Layouts））：缺 面试
- `vz-c5-s4`（过渡与动画）：缺 —

#### vz-c1w · 可视化 · 可视化基础与 WebGL 概览 〔webgl〕
- `vz-c1w-s1`（数据可视化导论）：缺 —
- `vz-c1w-s2`（WebGL 与可视化）：缺 面试

#### vz-c6 · 可视化 · WebGL 可视化基础 〔webgl〕
- `vz-c6-s1`（WebGL 渲染管线）：缺 面试
- `vz-c6-s2`（绘制基本图形）：缺 —
- `vz-c6-s3`（变换与矩阵）：缺 面试
- `vz-c6-s4`（颜色与纹理）：缺 —

#### vz-c7 · 可视化 · 高级 WebGL 与可视化集成 〔webgl〕
- `vz-c7-s1`（光照与材质）：缺 面试
- `vz-c7-s2`（大规模数据渲染）：缺 面试
- `vz-c7-s3`（与 D3 集成）：缺 面试
- `vz-c7-s4`（与 ECharts 集成）：缺 面试

#### fts-c1 · TypeScript · TypeScript 入门 〔typescript〕
- `fts-c1-s1`（什么是 TypeScript）：缺 —
- `fts-c1-s2`（安装与配置）：缺 —
- `fts-c1-s3`（第一个 TypeScript 程序）：缺 —

#### fts-c2 · TypeScript · 基础类型系统 〔typescript〕
- `fts-c2-s1`（原始类型）：缺 —
- `fts-c2-s2`（数组与元组）：缺 面试
- `fts-c2-s3`（类型注解与推断）：缺 面试
- `fts-c2-s4`（枚举）：缺 —
- `fts-c2-s5`（any、unknown、never）：缺 面试

#### fts-c3 · TypeScript · 接口与类型别名 〔typescript〕
- `fts-c3-s1`（接口定义）：缺 —
- `fts-c3-s2`（接口扩展）：缺 —
- `fts-c3-s3`（类型别名）：缺 —
- `fts-c3-s4`（类型断言）：缺 —

#### fts-c4 · TypeScript · 泛型 〔typescript〕
- `fts-c4-s1`（泛型基础）：缺 —
- `fts-c4-s2`（泛型约束）：缺 —
- `fts-c4-s3`（泛型类与接口）：缺 面试
- `fts-c4-s4`（泛型工具类型）：缺 动手自测, 面试

#### fts-c5 · TypeScript · 高级类型 〔typescript〕
- `fts-c5-s1`（联合类型与交叉类型）：缺 —
- `fts-c5-s2`（类型守卫）：缺 —
- `fts-c5-s3`（条件类型）：缺 —
- `fts-c5-s4`（映射类型）：缺 —
- `fts-c5-s5`（模板字面量类型）：缺 面试

#### fts-c6 · TypeScript · 类与面向对象 〔typescript〕
- `fts-c6-s1`（类基础）：缺 —
- `fts-c6-s2`（继承与实现）：缺 —
- `fts-c6-s3`（修饰符）：缺 面试
- `fts-c6-s4`（抽象类）：缺 —

### backend（后端开发）— 106 个章节存在不完整小节

#### be-test · Java 后端 · 后端测试与质量保障 〔java〕
- `be-test-s1`（测试金字塔与分层）：缺 direction缺失
- `be-test-s2`（JUnit 5 单元测试）：缺 direction缺失
- `be-test-s3`（Mockito 模拟与隔离）：缺 direction缺失
- `be-test-s4`（测试替身：stub/mock/spy/fake）：缺 direction缺失
- `be-test-s5`（集成测试与测试容器）：缺 direction缺失
- `be-test-s6`（契约测试）：缺 direction缺失
- `be-test-s7`（TDD 与测试驱动开发）：缺 direction缺失
- `be-test-s8`（覆盖率与质量门禁）：缺 direction缺失
- `be-test-s9`（测试数据与夹具）：缺 direction缺失

#### be-api · 系统设计 · API 设计与演进 〔system〕
- `be-api-s1`（REST 成熟度与资源建模）：缺 direction缺失
- `be-api-s2`（HTTP 语义与状态码）：缺 direction缺失
- `be-api-s3`（API 版本化策略）：缺 direction缺失
- `be-api-s4`（OpenAPI 与文档即契约）：缺 direction缺失
- `be-api-s5`（GraphQL 适用与权衡）：缺 direction缺失
- `be-api-s6`（gRPC 与 Protobuf）：缺 direction缺失
- `be-api-s7`（分页/过滤/排序与幂等）：缺 direction缺失
- `be-api-s8`（API 层认证与授权）：缺 direction缺失
- `be-api-s9`（API 演进与兼容性）：缺 direction缺失

#### dbs-c1 · 数据库 · MySQL 基础与架构 〔mysql〕
- `dbs-c1-s1`（MySQL 简介与安装）：缺 —
- `dbs-c1-s2`（MySQL 逻辑架构与存储引擎）：缺 面试
- `dbs-c1-s3`（数据库与表的基本操作）：缺 面试
- `dbs-c1-s4`（SQL 基础：查询与过滤）：缺 面试
- `dbs-c1-s5`（SQL 进阶：连接与子查询）：缺 —

#### dbs-c2 · 数据库 · MySQL 索引与优化 〔mysql〕
- `dbs-c2-s1`（索引基础与类型）：缺 面试
- `dbs-c2-s2`（创建与管理索引）：缺 面试
- `dbs-c2-s3`（索引失效场景与优化）：缺 —
- `dbs-c2-s4`（查询优化器与执行计划）：缺 —
- `dbs-c2-s5`（索引设计实践）：缺 —

#### dbs-c3 · 数据库 · MySQL 事务与并发控制 〔mysql〕
- `dbs-c3-s1`（事务基础与 ACID）：缺 —
- `dbs-c3-s2`（隔离级别）：缺 面试
- `dbs-c3-s3`（锁机制）：缺 —
- `dbs-c3-s4`（MVCC（多版本并发控制））：缺 —
- `dbs-c3-s5`（事务日志与持久性）：缺 动手自测, 面试

#### dbs-c4 · 数据库 · PostgreSQL 基础与特性 〔postgresql〕
- `dbs-c4-s1`（PostgreSQL 简介与安装）：缺 面试
- `dbs-c4-s2`（数据库与表管理）：缺 面试
- `dbs-c4-s3`（高级数据类型）：缺 面试
- `dbs-c4-s4`（SQL 查询与函数）：缺 面试
- `dbs-c4-s5`（索引与性能）：缺 面试

#### dbs-c5 · 数据库 · PostgreSQL 事务与并发 〔postgresql〕
- `dbs-c5-s1`（事务与隔离级别）：缺 面试
- `dbs-c5-s2`（MVCC 实现）：缺 —
- `dbs-c5-s3`（锁机制）：缺 —
- `dbs-c5-s4`（序列与并发控制）：缺 —
- `dbs-c5-s5`（逻辑复制与流复制）：缺 —

#### dbs-c6 · 数据库 · Redis 基础与数据结构 〔dbredis〕
- `dbs-c6-s1`（Redis 简介与安装）：缺 —
- `dbs-c6-s2`（字符串与哈希）：缺 —
- `dbs-c6-s3`（列表与集合）：缺 —
- `dbs-c6-s4`（有序集合与位图）：缺 —
- `dbs-c6-s5`（键管理与过期策略）：缺 —

#### dbs-c7 · 数据库 · Redis 持久化与高可用 〔dbredis〕
- `dbs-c7-s1`（RDB 持久化）：缺 —
- `dbs-c7-s2`（AOF 持久化）：缺 —
- `dbs-c7-s3`（主从复制）：缺 —
- `dbs-c7-s4`（哨兵模式）：缺 面试
- `dbs-c7-s5`（集群模式）：缺 面试

#### dbs-c8 · 数据库 · Redis 事务与 Lua 脚本 〔dbredis〕
- `dbs-c8-s1`（Redis 事务基础）：缺 面试
- `dbs-c8-s2`（WATCH 与乐观锁）：缺 面试
- `dbs-c8-s3`（Lua 脚本基础）：缺 —
- `dbs-c8-s4`（Lua 脚本进阶）：缺 —
- `dbs-c8-s5`（事务与脚本的对比）：缺 —

#### dbs-c9 · 数据库 · 存储引擎与索引综合对比 〔dbnosql〕
- `dbs-c9-s1`（关系型 vs NoSQL 存储模型）：缺 —
- `dbs-c9-s2`（索引机制对比）：缺 面试
- `dbs-c9-s3`（事务与一致性对比）：缺 面试
- `dbs-c9-s4`（性能与扩展性）：缺 —
- `dbs-c9-s5`（选型决策指南）：缺 —

#### dbs-c10 · 数据库 · 实践项目与综合应用 〔mysql〕
- `dbs-c10-s1`（项目设计：电商系统数据层）：缺 面试
- `dbs-c10-s2`（事务一致性实现）：缺 —
- `dbs-c10-s3`（缓存与数据库一致性）：缺 —
- `dbs-c10-s4`（高可用部署）：缺 面试
- `dbs-c10-s5`（性能调优与监控）：缺 面试

#### bd-c1 · 大数据 · Apache Spark 核心基础 〔offlinedw〕
- `bd-c1-s1`（Spark 概述与架构）：缺 面试
- `bd-c1-s2`（RDD 编程模型）：缺 面试
- `bd-c1-s3`（DataFrame 与 Spark SQL）：缺 面试
- `bd-c1-s4`（Spark 数据源与读写）：缺 面试
- `bd-c1-s5`（数据仓库建模与 Hive 实践）：缺 面试

#### bd-c2 · 大数据 · Spark 进阶与性能调优 〔offlinedw〕
- `bd-c2-s1`（Spark 作业执行原理）：缺 —
- `bd-c2-s2`（性能调优实践）：缺 面试
- `bd-c2-s3`（Structured Streaming 基础）：缺 面试
- `bd-c2-s4`（Spark 在离线数仓中的应用模式）：缺 面试
- `bd-c2-s5`（Spark 性能调优）：缺 动手自测, 面试

#### bd-c3 · 大数据 · Apache Kafka 核心与实时数据管道 〔realtime〕
- `bd-c3-s1`（Kafka 架构与核心概念）：缺 面试
- `bd-c3-s2`（生产者 API 与消息发送）：缺 面试
- `bd-c3-s3`（消费者 API 与消费组）：缺 面试
- `bd-c3-s4`（Kafka 存储与可靠性）：缺 动手自测, 面试
- `bd-c3-s5`（Kafka Connect 与流处理集成）：缺 面试
- `bd-c3-s6`（Kafka 在实时数仓中的角色）：缺 面试

#### bd-c4 · 大数据 · Apache Hive 数据仓库基础 〔offlinedw〕
- `bd-c4-s1`（Hive 架构与安装部署）：缺 —
- `bd-c4-s2`（Hive 数据模型与 DDL）：缺 动手自测, 面试
- `bd-c4-s3`（HiveQL 查询基础）：缺 面试
- `bd-c4-s4`（Hive 数据格式与文件存储）：缺 动手自测, 面试
- `bd-c4-s5`（Hive 与 Spark 集成）：缺 面试

#### bd-c5 · 大数据 · Hive 进阶与数仓建模实践 〔offlinedw〕
- `bd-c5-s1`（Hive 查询优化）：缺 动手自测, 面试
- `bd-c5-s2`（Hive 事务与 ACID 支持）：缺 面试
- `bd-c5-s3`（数仓分层架构设计）：缺 动手自测, 面试
- `bd-c5-s4`（Hive 数据质量与治理）：缺 面试

#### bd-c6 · 大数据 · 离线实时一体化与 BI 供数 〔offlinedw〕
- `bd-c6-s1`（离线与实时链路整合）：缺 面试
- `bd-c6-s2`（实时数仓分层实现）：缺 面试
- `bd-c6-s3`（BI 供数架构与数据服务）：缺 面试
- `bd-c6-s4`（数据一致性与延迟保障）：缺 面试
- `bd-c6-s5`（数据安全与权限管控）：缺 动手自测, 面试
- `bd-c6-s6`（全链路监控与运维）：缺 —

#### gm-c1 · 游戏服务端 · Colyseus 入门 〔gameserver〕
- `gm-c1-s1`（Colyseus 简介与安装）：缺 —
- `gm-c1-s2`（第一个房间与客户端连接）：缺 —
- `gm-c1-s3`（房间生命周期与状态同步）：缺 面试
- `gm-c1-s4`（Buffer、Stream 与事件发射器）：缺 面试
- `gm-c1-s5`（HTTP 模块与路由基础）：缺 —
- `gm-c1-s6`（调试与性能监控基础）：缺 面试

#### gm-c2 · 游戏服务端 · Colyseus 状态同步与 Schema 〔gameserver〕
- `gm-c2-s1`（Schema 定义与类型）：缺 —
- `gm-c2-s2`（状态变更与补丁同步）：缺 面试
- `gm-c2-s3`（房间内消息与广播）：缺 —
- `gm-c2-s4`（状态验证与授权）：缺 面试
- `gm-c2-s5`（错误处理与健壮性设计）：缺 —

#### gm-c3 · 游戏服务端 · Colyseus 房间管理与扩展 〔gameserver〕
- `gm-c3-s1`（房间匹配与创建）：缺 面试
- `gm-c3-s2`（房间生命周期管理）：缺 —
- `gm-c3-s3`（多房间与进程扩展）：缺 面试
- `gm-c3-s4`（性能优化与监控）：缺 —
- `gm-c3-s5`（消息处理与通信）：缺 —

#### gm-c4 · 游戏服务端 · Node.js 基础与异步编程 〔gameserver〕
- `gm-c4-s1`（Node.js 事件循环与异步模型）：缺 —
- `gm-c4-s2`（Buffer 与流）：缺 —
- `gm-c4-s3`（网络编程与 Socket）：缺 面试
- `gm-c4-s4`（Cluster 模块与多进程）：缺 —

#### gm-c5 · 游戏服务端 · Node.js 与 WebSocket 实时通信 〔gameserver〕
- `gm-c5-s1`（WebSocket 协议与握手）：缺 面试
- `gm-c5-s2`（WebSocket 客户端与心跳）：缺 —
- `gm-c5-s3`（广播与房间实现）：缺 —
- `gm-c5-s4`（与 Colyseus 集成）：缺 面试

#### gm-c6 · 游戏服务端 · 高并发与性能优化 〔gameserver〕
- `gm-c6-s1`（负载均衡与反向代理）：缺 面试
- `gm-c6-s2`（数据库与缓存优化）：缺 面试
- `gm-c6-s3`（内存与垃圾回收调优）：缺 面试
- `gm-c6-s4`（压力测试与基准测试）：缺 面试
- `gm-c6-s5`（扩展性与负载均衡）：缺 —

#### gm-c7 · 游戏服务端 · 实时同步应用实战 〔gameserver〕
- `gm-c7-s1`（项目设计与架构）：缺 —
- `gm-c7-s2`（实现核心同步逻辑）：缺 面试
- `gm-c7-s3`（前端集成与用户体验）：缺 —
- `gm-c7-s4`（部署与运维）：缺 —
- `gm-c7-s5`（性能调优与压力测试）：缺 —

#### gm-c8 · 游戏服务端 · 综合实战：构建实时同步应用 〔gameserver〕
- `gm-c8-s1`（项目需求与架构设计）：缺 —
- `gm-c8-s2`（实现服务器端逻辑）：缺 面试
- `gm-c8-s3`（实现客户端交互）：缺 —
- `gm-c8-s4`（测试与优化）：缺 面试
- `gm-c8-s5`（部署与运维）：缺 —

#### sd-c1 · SDET · 入门与安装 〔sdet〕
- `sd-c1-s1`（自动化测试概述）：缺 —
- `sd-c1-s2`（Playwright安装与配置）：缺 —
- `sd-c1-s3`（Selenium安装与配置）：缺 —

#### sd-c2 · SDET · 浏览器自动化基础 〔sdet〕
- `sd-c2-s1`（启动与关闭浏览器）：缺 —
- `sd-c2-s2`（页面导航与URL处理）：缺 面试
- `sd-c2-s3`（定位元素基础）：缺 —
- `sd-c2-s4`（基础交互操作）：缺 面试

#### sd-c3 · SDET · 等待与同步策略 〔sdet〕
- `sd-c3-s1`（等待机制概述）：缺 —
- `sd-c3-s2`（Playwright中的等待）：缺 面试
- `sd-c3-s3`（Selenium中的等待）：缺 面试

#### sd-c4 · SDET · 元素交互与表单处理 〔sdet〕
- `sd-c4-s1`（表单元素操作）：缺 —
- `sd-c4-s2`（文件上传与下载）：缺 面试
- `sd-c4-s3`（鼠标与键盘高级操作）：缺 面试

#### sd-c5 · SDET · 页面对象模型（POM） 〔sdet〕
- `sd-c5-s1`（POM设计模式）：缺 —
- `sd-c5-s2`（实现页面对象）：缺 —
- `sd-c5-s3`（POM在Playwright与Selenium中的应用）：缺 动手自测, 面试

#### sd-c6 · SDET · 高级浏览器操作 〔sdet〕
- `sd-c6-s1`（多标签与多窗口管理）：缺 —
- `sd-c6-s2`（弹窗与对话框处理）：缺 —
- `sd-c6-s3`（执行JavaScript）：缺 面试

#### sd-c7 · SDET · 网络与浏览器上下文 〔sdet〕
- `sd-c7-s1`（浏览器上下文与用户会话）：缺 面试
- `sd-c7-s2`（网络拦截与模拟）：缺 —
- `sd-c7-s3`（Cookies与存储管理）：缺 面试

#### sd-c8 · SDET · 测试框架集成与断言 〔sdet〕
- `sd-c8-s1`（测试框架选择与集成）：缺 面试
- `sd-c8-s2`（编写测试用例与断言）：缺 面试
- `sd-c8-s3`（测试组织与运行）：缺 —

#### sd-c9 · SDET · 视觉测试与截图 〔sdet〕
- `sd-c9-s1`（截图功能）：缺 —
- `sd-c9-s2`（视觉回归测试）：缺 —

#### sd-c10 · SDET · 移动端与响应式测试 〔sdet〕
- `sd-c10-s1`（设备模拟与视口设置）：缺 —
- `sd-c10-s2`（触摸与手势模拟）：缺 面试

#### sd-c11 · SDET · 持续集成与云测试 〔sdet〕
- `sd-c11-s1`（CI/CD集成）：缺 —
- `sd-c11-s2`（云测试平台）：缺 面试

#### sd-c12 · SDET · 性能与最佳实践 〔sdet〕
- `sd-c12-s1`（测试性能优化）：缺 —
- `sd-c12-s2`（代码质量与可维护性）：缺 面试
- `sd-c12-s3`（测试策略与反模式）：缺 —

#### sd-c13 · SDET · 高级主题与扩展 〔sdet〕
- `sd-c13-s1`（API测试与集成）：缺 —
- `sd-c13-s2`（并行测试执行）：缺 面试
- `sd-c13-s3`（处理动态内容与SPA）：缺 —

#### sd-c14 · SDET · 调试与故障排查 〔sdet〕
- `sd-c14-s1`（调试工具与技巧）：缺 —
- `sd-c14-s2`（日志与报告分析）：缺 —

#### bw-c1 · Java · Java 基础与语言特性 〔java〕
- `bw-c1-s1`（Java 语言入门与开发环境）：缺 —
- `bw-c1-s2`（面向对象编程（OOP））：缺 面试
- `bw-c1-s3`（异常处理与断言）：缺 —
- `bw-c1-s4`（泛型与集合框架）：缺 面试
- `bw-c1-s5`（Lambda 表达式与流式编程）：缺 面试

#### bw-c2 · Java · JVM 内存模型与性能调优 〔java〕
- `bw-c2-s1`（JVM 内存区域与对象访问）：缺 面试
- `bw-c2-s2`（垃圾回收（GC）机制）：缺 面试
- `bw-c2-s3`（类加载机制与字节码）：缺 动手自测, 面试
- `bw-c2-s4`（JVM 调优与故障排查）：缺 面试

#### bw-c3 · Java · Java 并发编程 〔java〕
- `bw-c3-s1`（线程基础与生命周期）：缺 —
- `bw-c3-s2`（线程安全与同步机制）：缺 面试
- `bw-c3-s3`（并发工具类与原子类）：缺 面试
- `bw-c3-s4`（线程池与异步编程）：缺 面试

#### bw-c4 · Java · Spring 框架核心 〔java〕
- `bw-c4-s1`（Spring 概述与 IoC 容器）：缺 面试
- `bw-c4-s2`（依赖注入（DI）与 Bean 生命周期）：缺 面试
- `bw-c4-s3`（面向切面编程（AOP））：缺 面试
- `bw-c4-s4`（Spring 事务管理）：缺 面试
- `bw-c4-s5`（Spring 测试与 Web 集成）：缺 面试

#### bw-c5 · Java · Spring Boot 与微服务 〔java〕
- `bw-c5-s1`（Spring Boot 入门与自动配置）：缺 面试
- `bw-c5-s2`（Spring Boot Starter 与 Web 开发）：缺 面试
- `bw-c5-s3`（Spring Boot Actuator 与监控）：缺 面试
- `bw-c5-s4`（微服务架构与 Spring Cloud）：缺 —
- `bw-c5-s5`（Spring Cloud 配置中心与消息驱动）：缺 面试

#### bw-c6 · Java · 数据访问与持久化 〔java〕
- `bw-c6-s1`（Spring JDBC 与 JdbcTemplate）：缺 —
- `bw-c6-s2`（JPA 与 Hibernate）：缺 面试
- `bw-c6-s3`（MyBatis 集成）：缺 —
- `bw-c6-s4`（事务与数据一致性）：缺 动手自测, 面试
- `bw-c6-s5`（数据库性能优化）：缺 面试

#### bw-c7 · Java · Spring Security 与安全 〔java〕
- `bw-c7-s1`（Spring Security 基础）：缺 面试
- `bw-c7-s2`（认证与授权进阶）：缺 面试
- `bw-c7-s3`（OAuth2 与 JWT）：缺 动手自测, 面试
- `bw-c7-s4`（安全防护与最佳实践）：缺 面试

#### bw-c8 · Java · Spring 生态扩展与云原生 〔java〕
- `bw-c8-s1`（Spring Cloud 高级组件）：缺 面试
- `bw-c8-s2`（Spring Cloud Data Flow）：缺 —
- `bw-c8-s3`（Spring Native 与 GraalVM）：缺 面试
- `bw-c8-s4`（云原生部署与容器化）：缺 面试

#### bm-c1 · 微服务 · 微服务架构模式概述 〔micro〕
- `bm-c1-s1`（微服务架构的动机与定义）：缺 —
- `bm-c1-s2`（微服务架构模式分类）：缺 面试
- `bm-c1-s3`（微服务分解模式）：缺 —

#### bm-c2 · 微服务 · 服务通信模式 〔micro〕
- `bm-c2-s1`（同步通信模式）：缺 面试
- `bm-c2-s2`（异步通信模式）：缺 —
- `bm-c2-s3`（服务发现与路由）：缺 面试

#### bm-c3 · 微服务 · 服务治理与配置管理 〔micro〕
- `bm-c3-s1`（服务注册与发现）：缺 —
- `bm-c3-s2`（客户端负载均衡）：缺 面试
- `bm-c3-s3`（容错模式：熔断与隔离）：缺 面试
- `bm-c3-s4`（配置管理）：缺 面试

#### bm-c4 · 微服务 · API网关与边缘服务 〔micro〕
- `bm-c4-s1`（API网关模式）：缺 —
- `bm-c4-s2`（Spring Cloud Gateway）：缺 面试
- `bm-c4-s3`（网关与前端模式）：缺 —

#### bm-c5 · 微服务 · 数据管理模式 〔micro〕
- `bm-c5-s1`（数据库 per 服务模式）：缺 —
- `bm-c5-s2`（Saga 分布式事务模式）：缺 面试
- `bm-c5-s3`（CQRS 与事件溯源）：缺 面试

#### bm-c6 · 微服务 · 可观测性与监控 〔micro〕
- `bm-c6-s1`（日志聚合）：缺 —
- `bm-c6-s2`（指标监控）：缺 面试
- `bm-c6-s3`（分布式追踪）：缺 面试

#### bm-c7 · 微服务 · 安全与弹性 〔micro〕
- `bm-c7-s1`（身份认证与授权）：缺 —
- `bm-c7-s2`（安全通信）：缺 —
- `bm-c7-s3`（弹性模式与自愈）：缺 面试

#### bm-c8 · 微服务 · 部署与运维模式 〔micro〕
- `bm-c8-s1`（容器化部署）：缺 —
- `bm-c8-s2`（容器编排）：缺 —
- `bm-c8-s3`（持续集成与持续部署（CI/CD））：缺 —

#### bm-c9 · 微服务 · 服务网格与高级治理 〔micro〕
- `bm-c9-s1`（服务网格基础）：缺 —
- `bm-c9-s2`（流量管理）：缺 面试
- `bm-c9-s3`（安全与可观测性增强）：缺 —

#### bm-c10 · 微服务 · 测试与演进 〔micro〕
- `bm-c10-s1`（微服务测试策略）：缺 面试
- `bm-c10-s2`（部署与发布策略）：缺 面试
- `bm-c10-s3`（架构演进与重构）：缺 —

#### bg-c1 · 大数据 · Apache Spark 核心与结构化流处理 〔realtime〕
- `bg-c1-s1`（Spark 概述与架构）：缺 —
- `bg-c1-s2`（Spark SQL 与 DataFrame API）：缺 动手自测, 面试
- `bg-c1-s3`（Structured Streaming 基础）：缺 —
- `bg-c1-s4`（Structured Streaming 进阶）：缺 面试
- `bg-c1-s5`（Spark 性能调优与生产化）：缺 面试

#### bg-c2 · 大数据 · Apache Kafka 消息中间件与数据管道 〔realtime〕
- `bg-c2-s1`（Kafka 核心概念与架构）：缺 面试
- `bg-c2-s2`（生产者与消费者API）：缺 面试
- `bg-c2-s3`（Kafka 存储与可靠性）：缺 面试
- `bg-c2-s4`（Kafka Connect 与流处理集成）：缺 面试
- `bg-c2-s5`（Kafka 运维与监控）：缺 —

#### bg-c3 · 大数据 · Apache Flink 流处理与实时计算 〔realtime〕
- `bg-c3-s1`（Flink 架构与执行模型）：缺 面试
- `bg-c3-s2`（Flink 状态管理与容错）：缺 动手自测, 面试
- `bg-c3-s3`（Flink SQL 与 Table API）：缺 面试
- `bg-c3-s4`（Flink 连接器与数据集成）：缺 面试
- `bg-c3-s5`（Flink 高级特性与调优）：缺 面试

#### bg-c4 · 大数据 · 实时数仓与BI供数架构实践 〔realtime〕
- `bg-c4-s1`（实时数仓分层设计）：缺 面试
- `bg-c4-s2`（实时数据管道搭建）：缺 面试
- `bg-c4-s3`（BI供数接口与OLAP存储）：缺 —
- `bg-c4-s4`（实时指标计算与窗口聚合）：缺 面试
- `bg-c4-s5`（案例实战与性能优化）：缺 面试

#### sr-c1 · 搜索中间件 · Elasticsearch 入门 〔es〕
- `sr-c1-s1`（Elasticsearch 简介）：缺 —
- `sr-c1-s2`（安装与配置）：缺 面试
- `sr-c1-s3`（索引与文档操作）：缺 —
- `sr-c1-s4`（基础搜索）：缺 面试

#### sr-c2 · 搜索中间件 · 映射与分析 〔es〕
- `sr-c2-s1`（字段映射）：缺 面试
- `sr-c2-s2`（分析器）：缺 —
- `sr-c2-s3`（分词器与过滤器）：缺 面试

#### sr-c3 · 搜索中间件 · 查询 DSL 〔es〕
- `sr-c3-s1`（全文查询）：缺 面试
- `sr-c3-s2`（词项级查询）：缺 面试
- `sr-c3-s3`（复合查询）：缺 —
- `sr-c3-s4`（过滤与排序）：缺 —

#### sr-c4 · 搜索中间件 · 聚合分析 〔es〕
- `sr-c4-s1`（聚合基础）：缺 —
- `sr-c4-s2`（嵌套聚合）：缺 面试
- `sr-c4-s3`（管道聚合）：缺 动手自测, 面试

#### sr-c5 · 搜索中间件 · 分布式架构与集群管理 〔es〕
- `sr-c5-s1`（节点与集群）：缺 面试
- `sr-c5-s2`（分片与副本）：缺 —
- `sr-c5-s3`（集群监控与调优）：缺 面试

#### sr-c6 · 缓存中间件 Redis 基础 〔redis〕
- `sr-c6-s1`（Redis 简介与安装）：缺 —
- `sr-c6-s2`（通用命令与配置）：缺 —
- `sr-c6-s3`（字符串与哈希）：缺 面试
- `sr-c6-s4`（列表与集合）：缺 面试
- `sr-c6-s5`（有序集合与流）：缺 —

#### sr-c7 · 缓存中间件 Redis 持久化与高可用 〔redis〕
- `sr-c7-s1`（RDB 持久化）：缺 面试
- `sr-c7-s2`（AOF 持久化）：缺 —
- `sr-c7-s3`（主从复制）：缺 —
- `sr-c7-s4`（集群模式）：缺 面试

#### sr-c8 · 缓存中间件 Redis 缓存设计与优化 〔redis〕
- `sr-c8-s1`（缓存策略）：缺 面试
- `sr-c8-s2`（事务与 Lua 脚本）：缺 面试
- `sr-c8-s3`（性能优化）：缺 —

#### go-c1 · Go 基础与并发模型 〔go〕
- `go-c1-s1`（语言入门与开发环境）：缺 为什么重要
- `go-c1-s2`（变量、类型与零值）：缺 为什么重要
- `go-c1-s3`（结构体与方法）：缺 为什么重要
- `go-c1-s4`（Goroutine 与 Channel）：缺 为什么重要
- `go-c1-s5`（并发安全与同步机制）：缺 direction缺失
- `go-c1-s6`（Channel 高级模式）：缺 面试, direction缺失
- `go-c1-s7`（并发设计与性能调优）：缺 动手自测, 面试, direction缺失

#### go-c2 · Gin Web 框架核心 〔go〕
- `go-c2-s1`（路由与请求处理）：缺 为什么重要
- `go-c2-s2`（中间件机制）：缺 为什么重要
- `go-c2-s3`（参数绑定与校验）：缺 为什么重要
- `go-c2-s4`（统一错误处理与响应）：缺 为什么重要
- `go-c2-s5`（请求生命周期与上下文管理）：缺 direction缺失
- `go-c2-s6`（路由分组与版本控制）：缺 面试, direction缺失
- `go-c2-s7`（文件上传与静态资源服务）：缺 面试, direction缺失

#### py-c1 · Python 基础与异步 〔python〕
- `py-c1-s1`（环境管理与虚拟环境）：缺 为什么重要
- `py-c1-s2`（类型标注与 dataclass）：缺 为什么重要
- `py-c1-s3`（asyncio 异步模型）：缺 为什么重要
- `py-c1-s4`（项目结构与模块组织）：缺 为什么重要
- `py-c1-s5`（异步调试与性能分析）：缺 面试, direction缺失
- `py-c1-s6`（异步与同步代码的桥接）：缺 面试, direction缺失
- `py-c1-s7`（异步测试与错误处理）：缺 面试, direction缺失

#### py-c2 · FastAPI Web 框架核心 〔python〕
- `py-c2-s1`（路由与请求处理）：缺 为什么重要
- `py-c2-s2`（依赖注入系统）：缺 为什么重要
- `py-c2-s3`（Pydantic 数据校验）：缺 为什么重要
- `py-c2-s4`（中间件与异常处理）：缺 为什么重要
- `py-c2-s5`（异步数据库集成与事务管理）：缺 面试, direction缺失
- `py-c2-s6`（认证与授权机制）：缺 面试, direction缺失
- `py-c2-s7`（WebSocket 实时通信）：缺 面试, direction缺失

#### go-c3 · Go 并发实战与模式 〔go〕
- `go-c3-s1`（Context 与取消传播）：缺 为什么重要
- `go-c3-s2`（sync 同步原语）：缺 为什么重要
- `go-c3-s3`（并发模式）：缺 为什么重要
- `go-c3-s4`（并发安全与竞态检测）：缺 为什么重要
- `go-c3-s5`（错误处理与恢复机制）：缺 面试, direction缺失
- `go-c3-s6`（工作池与任务调度）：缺 面试, direction缺失
- `go-c3-s7`（并发性能调优与基准测试）：缺 面试, direction缺失

#### go-c4 · GORM 数据库访问 〔go〕
- `go-c4-s1`（连接与连接池）：缺 为什么重要
- `go-c4-s2`（模型定义与自动迁移）：缺 为什么重要
- `go-c4-s3`（CRUD 与查询）：缺 为什么重要
- `go-c4-s4`（事务与关联）：缺 为什么重要
- `go-c4-s5`（高级查询与性能优化）：缺 动手自测, 面试, direction缺失
- `go-c4-s6`（钩子与自定义数据类型）：缺 面试, direction缺失
- `go-c4-s7`（测试与迁移策略）：缺 面试, direction缺失

#### go-c5 · Go Web 安全与认证 〔go〕
- `go-c5-s1`（JWT 认证中间件）：缺 为什么重要
- `go-c5-s2`（密码哈希与登录）：缺 为什么重要
- `go-c5-s3`（CORS 与基础防护）：缺 为什么重要
- `go-c5-s4`（限流与输入防护）：缺 为什么重要
- `go-c5-s5`（安全响应头与点击劫持防护）：缺 面试, direction缺失
- `go-c5-s6`（基于角色的访问控制（RBAC））：缺 面试, direction缺失
- `go-c5-s7`（安全日志与审计追踪）：缺 direction缺失

#### py-c3 · Python 并发实战 〔python〕
- `py-c3-s1`（asyncio 进阶：任务与超时）：缺 为什么重要
- `py-c3-s2`（异步 HTTP 与数据库）：缺 为什么重要
- `py-c3-s3`（线程池与多进程）：缺 为什么重要
- `py-c3-s4`（并发安全与队列）：缺 为什么重要
- `py-c3-s5`（协程间通信与信号传播）：缺 面试, direction缺失
- `py-c3-s6`（背压控制与限流模式）：缺 direction缺失
- `py-c3-s7`（多进程与事件循环的融合实践）：缺 面试, direction缺失

#### py-c4 · SQLAlchemy ORM 〔python〕
- `py-c4-s1`（引擎与会话）：缺 为什么重要
- `py-c4-s2`（模型与映射）：缺 为什么重要
- `py-c4-s3`（CRUD 与查询）：缺 为什么重要
- `py-c4-s4`（关系与事务）：缺 为什么重要
- `py-c4-s5`（高级查询技巧）：缺 面试, direction缺失
- `py-c4-s6`（异步 ORM 与生产实践）：缺 面试, direction缺失
- `py-c4-s7`（数据迁移与 Schema 管理）：缺 面试, direction缺失

#### py-c5 · FastAPI 安全与认证 〔python〕
- `py-c5-s1`（OAuth2 密码流）：缺 为什么重要
- `py-c5-s2`（JWT 签发与校验）：缺 为什么重要
- `py-c5-s3`（密码哈希与登录）：缺 为什么重要
- `py-c5-s4`（权限与作用域）：缺 为什么重要
- `py-c5-s5`（OAuth2 隐式流与授权码流对比）：缺 面试, direction缺失
- `py-c5-s6`（依赖注入实现全局认证与用户上下文）：缺 direction缺失
- `py-c5-s7`（JWT 刷新令牌与令牌撤销）：缺 面试, direction缺失

#### go-c6 · Go 测试与质量保障 〔go〕
- `go-c6-s1`（表驱动测试）：缺 为什么重要
- `go-c6-s2`（基准与覆盖率）：缺 为什么重要
- `go-c6-s3`（testify 与 mock）：缺 为什么重要
- `go-c6-s4`（集成与 CI 测试策略）：缺 为什么重要
- `go-c6-s5`（测试代码的组织与可维护性）：缺 面试, direction缺失
- `go-c6-s6`（模糊测试与随机测试）：缺 面试, direction缺失
- `go-c6-s7`（测试中的依赖注入与接口隔离）：缺 面试, direction缺失

#### go-c7 · 容器化与部署 〔go〕
- `go-c7-s1`（多阶段 Docker 构建）：缺 为什么重要
- `go-c7-s2`（配置与优雅退出）：缺 为什么重要
- `go-c7-s3`（Kubernetes 基础编排）：缺 为什么重要
- `go-c7-s4`（可观测性入门）：缺 为什么重要
- `go-c7-s5`（镜像安全与供应链加固）：缺 direction缺失
- `go-c7-s6`（蓝绿发布与金丝雀发布实战）：缺 面试, direction缺失
- `go-c7-s7`（容器网络与服务发现）：缺 面试, direction缺失

#### go-c8 · 微服务与 gRPC 〔go〕
- `go-c8-s1`（Protobuf 契约定义）：缺 为什么重要
- `go-c8-s2`（gRPC 服务端与客户端）：缺 为什么重要
- `go-c8-s3`（错误处理与状态码）：缺 为什么重要
- `go-c8-s4`（微服务边界与通信）：缺 为什么重要
- `go-c8-s5`（gRPC 流式通信模式）：缺 direction缺失
- `go-c8-s6`（拦截器与认证）：缺 面试, direction缺失
- `go-c8-s7`（gRPC-Gateway 与 REST 集成）：缺 面试, direction缺失

#### py-c6 · 测试与质量保障 〔python〕
- `py-c6-s1`（pytest 基础）：缺 为什么重要
- `py-c6-s2`（fixture 与依赖管理）：缺 为什么重要
- `py-c6-s3`（mock 与异步测试）：缺 为什么重要
- `py-c6-s4`（覆盖率与 CI）：缺 为什么重要
- `py-c6-s5`（测试数据驱动与参数化）：缺 面试, direction缺失
- `py-c6-s6`（测试分层与用例组织策略）：缺 面试, direction缺失
- `py-c6-s7`（测试替身进阶：桩、伪对象与间谍）：缺 面试, direction缺失

#### py-c7 · 容器化与部署 〔python〕
- `py-c7-s1`（Python 镜像构建）：缺 为什么重要
- `py-c7-s2`（WSGI 与 ASGI 服务器）：缺 为什么重要
- `py-c7-s3`（优雅退出与信号）：缺 为什么重要
- `py-c7-s4`（K8s 部署与探针）：缺 为什么重要
- `py-c7-s5`（多阶段构建与镜像优化）：缺 面试, direction缺失
- `py-c7-s6`（容器编排基础）：缺 direction缺失
- `py-c7-s7`（镜像安全与依赖锁定）：缺 面试, direction缺失

#### py-c8 · 微服务与异步任务 〔python〕
- `py-c8-s1`（异步任务队列）：缺 为什么重要
- `py-c8-s2`（消息队列解耦）：缺 为什么重要
- `py-c8-s3`（服务间 HTTP 通信）：缺 为什么重要
- `py-c8-s4`（微服务边界与数据自治）：缺 为什么重要
- `py-c8-s5`（任务状态追踪与结果存储）：缺 面试, direction缺失
- `py-c8-s6`（异步任务编排与工作流）：缺 面试, direction缺失
- `py-c8-s7`（任务重试与失败处理策略）：缺 面试, direction缺失

#### go-c9 · Go 运行时与性能剖析 〔go〕
- `go-c9-s1`（内存分配与逃逸分析）：缺 为什么重要
- `go-c9-s2`（垃圾回收与 GC 调优）：缺 为什么重要
- `go-c9-s3`（GMP 调度模型）：缺 为什么重要
- `go-c9-s4`（pprof 性能剖析）：缺 为什么重要
- `go-c9-s5`（内存模型与同步原语）：缺 面试, direction缺失
- `go-c9-s6`（编译器优化与内联）：缺 direction缺失
- `go-c9-s7`（性能剖析与优化实战）：缺 面试, direction缺失

#### go-c10 · Go 数据结构与算法 〔go〕
- `go-c10-s1`（复杂度分析与切片底层）：缺 为什么重要
- `go-c10-s2`（线性结构：栈、队列与链表）：缺 为什么重要
- `go-c10-s3`（映射与集合：map 原理）：缺 为什么重要
- `go-c10-s4`（排序、查找与算法范式）：缺 为什么重要
- `go-c10-s5`（树与二叉树：遍历、堆与优先队列）：缺 面试, direction缺失
- `go-c10-s6`（图：表示、遍历与最短路径）：缺 面试, direction缺失
- `go-c10-s7`（字符串匹配与动态规划入门）：缺 面试, direction缺失

#### go-c11 · Go 网络编程与 IO 模型 〔go〕
- `go-c11-s1`（TCP/IP 与 Socket 编程）：缺 为什么重要
- `go-c11-s2`（IO 多路复用与 netpoller）：缺 为什么重要
- `go-c11-s3`（HTTP 协议与 net/http 服务端）：缺 为什么重要
- `go-c11-s4`（高性能网络实践）：缺 为什么重要
- `go-c11-s5`（UDP 与面向消息的 Socket 编程）：缺 direction缺失
- `go-c11-s6`（TLS/SSL 与安全网络通信）：缺 面试, direction缺失
- `go-c11-s7`（网络超时与上下文控制）：缺 面试, direction缺失

#### py-c9 · Python 运行时与性能剖析 〔python〕
- `py-c9-s1`（对象模型与内存管理）：缺 为什么重要
- `py-c9-s2`（GIL 与并发模型选择）：缺 为什么重要
- `py-c9-s3`（性能剖析与测量）：缺 为什么重要
- `py-c9-s4`（优化策略与常见陷阱）：缺 为什么重要
- `py-c9-s5`（内存剖析与泄漏检测）：缺 direction缺失
- `py-c9-s6`（JIT 编译器与加速库）：缺 面试, direction缺失
- `py-c9-s7`（异步编程与运行时调度）：缺 面试, direction缺失

#### py-c10 · Python 数据结构与算法 〔python〕
- `py-c10-s1`（复杂度与容器时间开销）：缺 为什么重要
- `py-c10-s2`（线性结构与 collections）：缺 为什么重要
- `py-c10-s3`（哈希结构：dict 与 set 原理）：缺 为什么重要
- `py-c10-s4`（排序、堆与二分）：缺 为什么重要
- `py-c10-s5`（链式结构：链表、双向链表与跳表）：缺 direction缺失
- `py-c10-s6`（树结构基础：二叉树、BST与平衡树）：缺 direction缺失
- `py-c10-s7`（图结构入门与遍历）：缺 面试, direction缺失

#### py-c11 · Python 网络编程与 IO 模型 〔python〕
- `py-c11-s1`（Socket 编程与 TCP 基础）：缺 为什么重要
- `py-c11-s2`（IO 多路复用与 selectors）：缺 为什么重要
- `py-c11-s3`（asyncio 事件循环）：缺 为什么重要
- `py-c11-s4`（HTTP 客户端与连接池）：缺 为什么重要
- `py-c11-s5`（非阻塞 IO 与协程调度原理）：缺 direction缺失
- `py-c11-s6`（高级协议实现：自定义协议与流式处理）：缺 面试, direction缺失
- `py-c11-s7`（异步安全与并发控制）：缺 面试, direction缺失

#### bmq-c1 · 消息队列 · RabbitMQ 基础与消息模型 〔mq〕
- `bmq-c1-s1`（RabbitMQ 核心概念）：缺 —
- `bmq-c1-s2`（交换器类型与路由机制）：缺 面试
- `bmq-c1-s3`（队列与消息属性）：缺 —
- `bmq-c1-s4`（发布确认与消费确认）：缺 面试
- `bmq-c1-s5`（RabbitMQ 高级特性：死信队列与延迟队列）：缺 常见坑, 动手自测, 面试

#### bmq-c2 · 消息队列 · RabbitMQ 集群与可靠性 〔mq〕
- `bmq-c2-s1`（集群架构与节点类型）：缺 —
- `bmq-c2-s2`（镜像队列与仲裁队列）：缺 面试
- `bmq-c2-s3`（持久化与消息可靠性保障）：缺 面试
- `bmq-c2-s4`（集群故障处理与网络分区）：缺 面试

#### bmq-c3 · 消息队列 · Kafka 核心架构与消息模型 〔mq〕
- `bmq-c3-s1`（Kafka 基本概念与设计哲学）：缺 —
- `bmq-c3-s2`（生产者（Producer）与分区策略）：缺 面试
- `bmq-c3-s3`（消费者（Consumer）与消费组）：缺 动手自测, 面试
- `bmq-c3-s4`（Kafka 存储机制与日志管理）：缺 动手自测, 面试
- `bmq-c3-s5`（副本机制与 ISR）：缺 动手自测, 面试

#### bmq-c4 · 消息队列 · Kafka 可靠性保障与高级特性 〔mq〕
- `bmq-c4-s1`（消息投递语义与可靠性配置）：缺 面试
- `bmq-c4-s2`（Kafka 事务与 Exactly-Once）：缺 面试
- `bmq-c4-s3`（Kafka 副本同步与故障恢复）：缺 动手自测, 面试
- `bmq-c4-s4`（Kafka 集群扩展与分区重分配）：缺 —

#### bmq-c5 · 消息队列 · NATS 消息模型与核心机制 〔mq〕
- `bmq-c5-s1`（NATS 核心概念与通信模式）：缺 动手自测, 面试
- `bmq-c5-s2`（NATS 服务质量与消息投递）：缺 —
- `bmq-c5-s3`（JetStream 持久化与流模型）：缺 —
- `bmq-c5-s4`（JetStream 消费者与消息确认）：缺 面试
- `bmq-c5-s5`（NATS 可靠性：持久化与高可用）：缺 面试

#### bmq-c6 · 消息队列 · NATS 安全与运维 〔mq〕
- `bmq-c6-s1`（NATS 认证与授权）：缺 —
- `bmq-c6-s2`（TLS 加密与安全连接）：缺 面试
- `bmq-c6-s3`（NATS 监控与系统管理）：缺 面试

#### dbp-c1 · PostgreSQL · 关系型存储基础 〔postgresql〕
- `dbp-c1-s1`（数据模型与表结构）：缺 —
- `dbp-c1-s2`（索引与存储结构）：缺 面试
- `dbp-c1-s3`（表分区与分片）：缺 面试
- `dbp-c1-s4`（事务与ACID特性）：缺 —
- `dbp-c1-s5`（数据完整性约束）：缺 面试

#### dbp-c2 · PostgreSQL · 高级类型系统 〔postgresql〕
- `dbp-c2-s1`（枚举与复合类型）：缺 面试
- `dbp-c2-s2`（范围类型与多范围类型）：缺 面试
- `dbp-c2-s3`（JSON与JSONB类型）：缺 面试
- `dbp-c2-s4`（数组与用户自定义类型）：缺 面试
- `dbp-c2-s5`（类型转换与函数）：缺 动手自测, 面试

#### dbp-c3 · PostgreSQL · MVCC（多版本并发控制） 〔postgresql〕
- `dbp-c3-s1`（MVCC基本概念）：缺 —
- `dbp-c3-s2`（事务隔离级别）：缺 —
- `dbp-c3-s3`（快照与可见性规则）：缺 动手自测, 面试
- `dbp-c3-s4`（清理（VACUUM）与死元组）：缺 面试
- `dbp-c3-s5`（锁与并发控制机制）：缺 动手自测, 面试
- `dbp-c3-s6`（MVCC与性能优化）：缺 —

#### dbn-c1 · NoSQL · MongoDB 核心概念与数据模型 〔dbnosql〕
- `dbn-c1-s1`（文档数据库基础）：缺 面试
- `dbn-c1-s2`（CRUD 操作与查询语言）：缺 面试
- `dbn-c1-s3`（索引与查询性能）：缺 —
- `dbn-c1-s4`（聚合框架）：缺 面试
- `dbn-c1-s5`（数据模型设计模式）：缺 面试

#### dbn-c2 · NoSQL · MongoDB 复制集与高可用 〔dbnosql〕
- `dbn-c2-s1`（复制集架构）：缺 —
- `dbn-c2-s2`（故障转移与选举）：缺 —
- `dbn-c2-s3`（读写关注与一致性）：缺 —
- `dbn-c2-s4`（复制集运维）：缺 —

#### dbn-c3 · NoSQL · MongoDB 分片集群与扩展 〔dbnosql〕
- `dbn-c3-s1`（分片集群组件）：缺 —
- `dbn-c3-s2`（分片策略）：缺 —
- `dbn-c3-s3`（分片集群管理）：缺 —
- `dbn-c3-s4`（分片与高可用结合）：缺 面试

#### dbn-c4 · NoSQL · MongoDB 事务与最终一致性 〔dbnosql〕
- `dbn-c4-s1`（多文档事务）：缺 —
- `dbn-c4-s2`（最终一致性场景）：缺 面试
- `dbn-c4-s3`（变更流（Change Streams））：缺 —
- `dbn-c4-s4`（一致性权衡实践）：缺 动手自测, 面试

#### dbn-c5 · NoSQL · Cassandra 核心概念与数据模型 〔dbnosql〕
- `dbn-c5-s1`（宽列存储架构）：缺 动手自测, 面试
- `dbn-c5-s2`（CQL 基础）：缺 —
- `dbn-c5-s3`（主键与数据分布）：缺 面试
- `dbn-c5-s4`（查询与索引）：缺 面试
- `dbn-c5-s5`（数据类型与集合）：缺 —

### devops（运维 / DevOps）— 72 个章节存在不完整小节

#### op-c6 · Linux · 数据库运维（DBA 视角） 〔linux〕
- `op-c6-s1`（MySQL 备份与恢复）：缺 direction缺失
- `op-c6-s2`（MySQL 主从复制运维）：缺 direction缺失
- `op-c6-s3`（Redis 持久化与高可用）：缺 direction缺失
- `op-c6-s4`（慢查询治理与索引优化）：缺 direction缺失
- `op-c6-s5`（参数调优）：缺 direction缺失
- `op-c6-s6`（高可用架构）：缺 direction缺失
- `op-c6-s7`（在线 schema 变更）：缺 direction缺失
- `op-c6-s8`（容量规划与监控）：缺 direction缺失
- `op-c6-s9`（容灾与恢复演练）：缺 direction缺失

#### op-c7 · Linux · 基础设施即代码与公有云 〔linux〕
- `op-c7-s1`（IaC 理念与价值）：缺 direction缺失
- `op-c7-s2`（Terraform 核心：HCL 与生命周期）：缺 direction缺失
- `op-c7-s3`（Terraform 状态与后端）：缺 direction缺失
- `op-c7-s4`（模块化与可复用）：缺 direction缺失
- `op-c7-s5`（公有云计算与网络）：缺 direction缺失
- `op-c7-s6`（对象存储与 CDN）：缺 direction缺失
- `op-c7-s7`（Serverless 与函数计算）：缺 direction缺失
- `op-c7-s8`（GitOps 与 IaC 的 CI/CD）：缺 direction缺失
- `op-c7-s9`（多环境与状态隔离）：缺 direction缺失

#### k8-c1 · Kubernetes · Kubernetes 基础概念 〔k8s〕
- `k8-c1-s1`（Kubernetes 是什么）：缺 —
- `k8-c1-s2`（Kubernetes 组件）：缺 面试
- `k8-c1-s3`（Kubernetes API 与对象）：缺 面试
- `k8-c1-s4`（工作负载资源）：缺 动手自测, 面试
- `k8-c1-s5`（服务、负载均衡与网络）：缺 面试
- `k8-c1-s6`（存储）：缺 —

#### k8-c2 · Kubernetes · 集群管理 〔k8s〕
- `k8-c2-s1`（集群架构与安装）：缺 面试
- `k8-c2-s2`（认证与授权）：缺 面试
- `k8-c2-s3`（安全与合规）：缺 面试
- `k8-c2-s4`（集群维护与生命周期）：缺 面试
- `k8-c2-s5`（扩展与资源管理）：缺 —

#### k8-c3 · Kubernetes · 应用开发与部署 〔k8s〕
- `k8-c3-s1`（Pod 设计模式）：缺 面试
- `k8-c3-s2`（配置与密钥管理）：缺 面试
- `k8-c3-s3`（应用部署策略）：缺 面试
- `k8-c3-s4`（服务发现与负载均衡）：缺 —
- `k8-c3-s5`（可观测性）：缺 面试

#### k8-c4 · Kubernetes · 网络与存储进阶 〔k8s〕
- `k8-c4-s1`（网络模型与插件）：缺 面试
- `k8-c4-s2`（服务网格）：缺 面试
- `k8-c4-s3`（存储类与动态供给）：缺 面试
- `k8-c4-s4`（有状态应用管理）：缺 面试

#### k8-c5 · Kubernetes · 扩展与自定义 〔k8s〕
- `k8-c5-s1`（自定义资源（CRD））：缺 面试
- `k8-c5-s2`（控制器与 Operator）：缺 —
- `k8-c5-s3`（准入控制与动态准入）：缺 面试
- `k8-c5-s4`（聚合 API 与扩展 API Server）：缺 面试

#### k8-c6 · Kubernetes · 生产实践与生态 〔k8s〕
- `k8-c6-s1`（高可用与容灾）：缺 面试
- `k8-c6-s2`（性能调优与成本优化）：缺 面试
- `k8-c6-s3`（CI/CD 集成）：缺 面试
- `k8-c6-s4`（云原生生态与平台）：缺 面试

#### cl-c1 · 云平台 · 云治理基础与框架 〔cloud〕
- `cl-c1-s1`（云治理概述与驱动力）：缺 面试
- `cl-c1-s2`（AWS Well-Architected Framework与治理支柱）：缺 —
- `cl-c1-s3`（Microsoft Cloud Adoption Framework (CAF)与治理方法论）：缺 面试

#### cl-c2 · 云平台 · 身份与访问管理治理 〔cloud〕
- `cl-c2-s1`（AWS IAM核心概念与策略管理）：缺 面试
- `cl-c2-s2`（Azure Entra ID与RBAC治理）：缺 动手自测, 面试
- `cl-c2-s3`（跨云身份治理与联合身份）：缺 动手自测, 面试

#### cl-c3 · 云平台 · 资源组织与层级结构治理 〔cloud〕
- `cl-c3-s1`（AWS Organizations与OU设计）：缺 —
- `cl-c3-s2`（Azure管理组与订阅治理）：缺 面试
- `cl-c3-s3`（跨云资源层级与策略统一）：缺 面试

#### cl-c4 · 云平台 · 网络资源治理与安全 〔cloud〕
- `cl-c4-s1`（AWS VPC与网络ACL治理）：缺 面试
- `cl-c4-s2`（Azure虚拟网络与网络安全组治理）：缺 面试
- `cl-c4-s3`（混合云网络与私有云连接治理）：缺 面试

#### cl-c5 · 云平台 · 数据资源治理与合规 〔cloud〕
- `cl-c5-s1`（AWS数据存储治理）：缺 面试
- `cl-c5-s2`（Azure数据存储治理）：缺 面试
- `cl-c5-s3`（数据合规与隐私治理）：缺 面试

#### cl-c6 · 云平台 · 成本治理与优化 〔cloud〕
- `cl-c6-s1`（AWS成本管理工具与预算）：缺 —
- `cl-c6-s2`（Azure成本管理与优化）：缺 —
- `cl-c6-s3`（跨云成本治理策略）：缺 面试

#### cl-c7 · 云平台 · 合规与审计治理 〔cloud〕
- `cl-c7-s1`（AWS合规与审计服务）：缺 动手自测, 面试
- `cl-c7-s2`（Azure合规与审计服务）：缺 面试
- `cl-c7-s3`（持续合规与自动化审计）：缺 面试

#### cl-c8 · 云平台 · 私有云治理与混合云策略 〔cloud〕
- `cl-c8-s1`（私有云治理基础）：缺 面试
- `cl-c8-s2`（Azure Stack与AWS Outposts治理）：缺 —
- `cl-c8-s3`（混合云治理架构设计）：缺 面试

#### cl-c9 · 云平台 · 自动化治理与基础设施即代码 〔cloud〕
- `cl-c9-s1`（AWS CloudFormation与治理自动化）：缺 —
- `cl-c9-s2`（Azure Resource Manager与Bicep治理）：缺 面试
- `cl-c9-s3`（跨云IaC与治理流水线）：缺 —

#### cl-c10 · 云平台 · 治理运营与持续改进 〔cloud〕
- `cl-c10-s1`（AWS治理运营监控）：缺 面试
- `cl-c10-s2`（Azure治理运营监控）：缺 面试
- `cl-c10-s3`（持续治理改进与成熟度模型）：缺 —

#### os-c1 · 安全运维 · 安全基础与威胁建模 〔secops〕
- `os-c1-s1`（安全基础概念）：缺 面试
- `os-c1-s2`（威胁建模基础）：缺 —
- `os-c1-s3`（风险与漏洞管理）：缺 —

#### os-c2 · 安全运维 · 防护策略与技术 〔secops〕
- `os-c2-s1`（网络防护）：缺 面试
- `os-c2-s2`（应用安全防护）：缺 面试
- `os-c2-s3`（身份与访问管理）：缺 面试
- `os-c2-s4`（数据安全与加密）：缺 —

#### os-c3 · 安全运维 · 检测机制与监控 〔secops〕
- `os-c3-s1`（日志管理与分析）：缺 —
- `os-c3-s2`（入侵检测系统（IDS））：缺 —
- `os-c3-s3`（安全信息和事件管理（SIEM））：缺 —
- `os-c3-s4`（威胁情报与检测）：缺 —

#### os-c4 · 安全运维 · 响应流程与事件处理 〔secops〕
- `os-c4-s1`（事件响应准备）：缺 —
- `os-c4-s2`（检测与初步分析）：缺 —
- `os-c4-s3`（遏制、根除与恢复）：缺 —
- `os-c4-s4`（事后复盘与改进）：缺 —

#### os-c5 · 安全运维 · 合规、标准与最佳实践 〔secops〕
- `os-c5-s1`（安全标准与框架）：缺 —
- `os-c5-s2`（法规与合规要求）：缺 —
- `os-c5-s3`（安全度量与持续改进）：缺 —

#### sre-c1 · SRE · SRE 基础与核心理念 〔sre〕
- `sre-c1-s1`（SRE 的起源与定义）：缺 —
- `sre-c1-s2`（SRE 的核心原则）：缺 —
- `sre-c1-s3`（SRE 的职责与团队模型）：缺 动手自测, 面试
- `sre-c1-s4`（SRE 的实践框架）：缺 面试

#### sre-c2 · SRE · SLI 与 SLO 的定义与设计 〔sre〕
- `sre-c2-s1`（SLI（服务水平指标））：缺 —
- `sre-c2-s2`（SLO（服务水平目标））：缺 —
- `sre-c2-s3`（错误预算策略）：缺 —
- `sre-c2-s4`（SLI/SLO 的落地实践）：缺 面试

#### sre-c3 · SRE · 可观测性基础与三大支柱 〔sre〕
- `sre-c3-s1`（可观测性概念与重要性）：缺 面试
- `sre-c3-s2`（日志（Logs））：缺 —
- `sre-c3-s3`（指标（Metrics））：缺 面试
- `sre-c3-s4`（分布式追踪（Tracing））：缺 面试
- `sre-c3-s5`（三大支柱的整合与关联）：缺 —

#### sre-c4 · SRE · Prometheus 监控系统 〔sre〕
- `sre-c4-s1`（Prometheus 架构与核心组件）：缺 面试
- `sre-c4-s2`（指标采集与 Exporter）：缺 面试
- `sre-c4-s3`（PromQL 查询语言）：缺 —
- `sre-c4-s4`（告警规则与 Alertmanager）：缺 面试
- `sre-c4-s5`（Prometheus 与可观测性生态）：缺 —

#### sre-c5 · SRE · 故障响应与事件管理 〔sre〕
- `sre-c5-s1`（故障响应流程）：缺 —
- `sre-c5-s2`（告警管理与升级策略）：缺 面试
- `sre-c5-s3`（事件沟通与协作）：缺 面试
- `sre-c5-s4`（事后总结（Postmortem））：缺 面试
- `sre-c5-s5`（故障演练与混沌工程）：缺 —

#### sre-c6 · SRE · SRE 实践与持续改进 〔sre〕
- `sre-c6-s1`（SRE 的日常运营）：缺 面试
- `sre-c6-s2`（SLO 驱动的开发流程）：缺 面试
- `sre-c6-s3`（可观测性驱动的故障排查）：缺 面试
- `sre-c6-s4`（SRE 文化的推广与落地）：缺 —
- `sre-c6-s5`（案例研究与前沿趋势）：缺 动手自测, 面试

#### dop-c1 · Docker · Docker 基础与核心概念 〔docker〕
- `dop-c1-s1`（Docker 概述与安装）：缺 —
- `dop-c1-s2`（Docker 镜像与容器基础）：缺 —
- `dop-c1-s3`（Docker 数据管理）：缺 —
- `dop-c1-s4`（Docker 网络基础）：缺 面试
- `dop-c1-s5`（Dockerfile 入门）：缺 面试

#### dop-c2 · Docker · 镜像构建进阶 〔docker〕
- `dop-c2-s1`（Dockerfile 最佳实践）：缺 面试
- `dop-c2-s2`（多阶段构建）：缺 —
- `dop-c2-s3`（BuildKit 与高级构建功能）：缺 面试
- `dop-c2-s4`（构建上下文与远程构建）：缺 面试
- `dop-c2-s5`（镜像安全与扫描）：缺 —

#### dop-c3 · Docker · 容器运行时深入 〔docker〕
- `dop-c3-s1`（容器运行时架构）：缺 面试
- `dop-c3-s2`（容器资源限制与监控）：缺 面试
- `dop-c3-s3`（容器安全加固）：缺 面试
- `dop-c3-s4`（容器日志与调试）：缺 面试
- `dop-c3-s5`（容器编排基础）：缺 —

#### dop-c4 · Docker · 编排与集群管理 〔docker〕
- `dop-c4-s1`（Kubernetes 核心概念）：缺 面试
- `dop-c4-s2`（Pod 与工作负载管理）：缺 动手自测, 面试
- `dop-c4-s3`（服务发现与网络）：缺 面试
- `dop-c4-s4`（配置与密钥管理）：缺 面试
- `dop-c4-s5`（存储与持久化）：缺 面试
- `dop-c4-s6`（集群运维与扩展）：缺 动手自测, 面试

#### doc-c1 · CI/CD · GitHub Actions 基础 〔cicd〕
- `doc-c1-s1`（Actions 概述）：缺 —
- `doc-c1-s2`（快速开始）：缺 —
- `doc-c1-s3`（工作流语法）：缺 —
- `doc-c1-s4`（事件与触发器）：缺 —

#### doc-c2 · CI/CD · GitHub Actions 进阶 〔cicd〕
- `doc-c2-s1`（环境与上下文）：缺 面试
- `doc-c2-s2`（作业与矩阵）：缺 —
- `doc-c2-s3`（缓存与依赖）：缺 —
- `doc-c2-s4`（安全与权限）：缺 —

#### doc-c3 · CI/CD · GitHub Actions 实践 〔cicd〕
- `doc-c3-s1`（构建与测试）：缺 —
- `doc-c3-s2`（发布与部署）：缺 —
- `doc-c3-s3`（监控与调试）：缺 —
- `doc-c3-s4`（最佳实践）：缺 —

#### doc-c4 · CI/CD · GitLab CI/CD 基础 〔cicd〕
- `doc-c4-s1`（CI/CD 概述）：缺 —
- `doc-c4-s2`（配置 .gitlab-ci.yml）：缺 —
- `doc-c4-s3`（Pipeline 与 Job）：缺 —
- `doc-c4-s4`（Runner 管理）：缺 —

#### doc-c5 · CI/CD · GitLab CI/CD 进阶 〔cicd〕
- `doc-c5-s1`（环境与变量）：缺 面试
- `doc-c5-s2`（缓存与工件）：缺 面试
- `doc-c5-s3`（多项目与子流水线）：缺 面试
- `doc-c5-s4`（安全与合规）：缺 —

#### doc-c6 · CI/CD · GitLab CI/CD 实践 〔cicd〕
- `doc-c6-s1`（构建与测试自动化）：缺 面试
- `doc-c6-s2`（部署与发布）：缺 —
- `doc-c6-s3`（监控与日志）：缺 —
- `doc-c6-s4`（最佳实践）：缺 面试

#### ot-c1 · Linux · Linux 命令行与文件系统基础 〔linux〕
- `ot-c1-s1`（Shell 与命令行入门）：缺 面试
- `ot-c1-s2`（文件系统层次标准 (FHS)）：缺 动手自测, 面试
- `ot-c1-s3`（文件与目录操作命令）：缺 动手自测, 面试
- `ot-c1-s4`（文本处理与管道）：缺 —
- `ot-c1-s5`（用户与权限管理）：缺 面试

#### ot-c2 · Linux · 进程管理与系统监控 〔linux〕
- `ot-c2-s1`（进程基础与查看）：缺 面试
- `ot-c2-s2`（进程控制与信号）：缺 面试
- `ot-c2-s3`（系统资源监控）：缺 面试
- `ot-c2-s4`（日志管理与分析）：缺 —

#### ot-c3 · Linux · 网络基础与 TCP/IP 协议 〔network〕
- `ot-c3-s1`（网络模型与协议栈）：缺 动手自测, 面试
- `ot-c3-s2`（IP 地址与子网划分）：缺 面试
- `ot-c3-s3`（TCP 与 UDP 协议）：缺 面试
- `ot-c3-s4`（DNS 与域名解析）：缺 —
- `ot-c3-s5`（HTTP/HTTPS 协议）：缺 面试

#### ot-c4 · Linux · Linux 网络配置与管理 〔network〕
- `ot-c4-s1`（网络接口配置）：缺 —
- `ot-c4-s2`（路由与默认网关）：缺 —
- `ot-c4-s3`（DNS 与主机名配置）：缺 —
- `ot-c4-s4`（网络服务管理）：缺 面试
- `ot-c4-s5`（网络故障排查）：缺 面试

#### ot-c5 · Linux · 网络服务与安全基础 〔network〕
- `ot-c5-s1`（SSH 远程管理）：缺 —
- `ot-c5-s2`（防火墙与 iptables）：缺 —
- `ot-c5-s3`（DHCP 与网络自动配置）：缺 —
- `ot-c5-s4`（Web 服务基础（Apache/Nginx））：缺 面试
- `ot-c5-s5`（网络安全基础）：缺 面试

#### sre2-c1 · SRE · SRE 基础与核心理念 〔sre〕
- `sre2-c1-s1`（SRE 的起源与定义）：缺 —
- `sre2-c1-s2`（可靠性目标与错误预算）：缺 —
- `sre2-c1-s3`（风险与容量管理）：缺 —
- `sre2-c1-s4`（监控与告警的哲学）：缺 面试

#### sre2-c2 · SRE · SRE 实践：发布与变更管理 〔sre〕
- `sre2-c2-s1`（渐进式发布策略）：缺 面试
- `sre2-c2-s2`（变更管理与自动化）：缺 —
- `sre2-c2-s3`（事故响应与应急处理）：缺 面试

#### sre2-c3 · SRE · 可观测性基础：指标、日志与追踪 〔sre〕
- `sre2-c3-s1`（可观测性三大支柱）：缺 —
- `sre2-c3-s2`（高基数数据与维度）：缺 —
- `sre2-c3-s3`（上下文传播与关联）：缺 面试

#### sre2-c4 · SRE · Prometheus 核心概念与架构 〔sre〕
- `sre2-c4-s1`（Prometheus 架构与组件）：缺 面试
- `sre2-c4-s2`（数据模型与指标类型）：缺 面试
- `sre2-c4-s3`（PromQL 基础查询）：缺 —
- `sre2-c4-s4`（配置与部署）：缺 —

#### sre2-c5 · SRE · Prometheus 进阶：服务发现与告警 〔sre〕
- `sre2-c5-s1`（动态服务发现）：缺 面试
- `sre2-c5-s2`（PromQL 高级查询与聚合）：缺 面试
- `sre2-c5-s3`（告警规则与 Alertmanager）：缺 面试
- `sre2-c5-s4`（Prometheus 高可用与扩展）：缺 面试

#### sre2-c6 · SRE · 可观测性深度实践：集成与关联 〔sre〕
- `sre2-c6-s1`（指标与日志的协同）：缺 面试
- `sre2-c6-s2`（分布式追踪与 Prometheus）：缺 面试
- `sre2-c6-s3`（SLO 监控与错误预算告警）：缺 面试
- `sre2-c6-s4`（容量规划与性能分析）：缺 面试

#### k82-c1 · Kubernetes · Kubernetes 基础概念 〔k8s〕
- `k82-c1-s1`（Kubernetes 是什么）：缺 —
- `k82-c1-s2`（Kubernetes 组件）：缺 动手自测, 面试
- `k82-c1-s3`（Kubernetes API 与对象）：缺 面试
- `k82-c1-s4`（Kubernetes 集群架构）：缺 面试

#### k82-c2 · Kubernetes · 集群管理 〔k8s〕
- `k82-c2-s1`（集群创建与配置）：缺 —
- `k82-c2-s2`（节点管理）：缺 —
- `k82-c2-s3`（集群安全）：缺 面试
- `k82-c2-s4`（资源管理）：缺 面试

#### k82-c3 · Kubernetes · 工作负载 〔k8s〕
- `k82-c3-s1`（Pod 概述）：缺 动手自测, 面试
- `k82-c3-s2`（工作负载资源）：缺 面试
- `k82-c3-s3`（自动伸缩）：缺 面试
- `k82-c3-s4`（工作负载管理最佳实践）：缺 面试

#### k82-c4 · Kubernetes · 服务、负载均衡和网络 〔k8s〕
- `k82-c4-s1`（服务（Service））：缺 面试
- `k82-c4-s2`（Ingress 与 Ingress Controller）：缺 面试
- `k82-c4-s3`（网络策略）：缺 面试
- `k82-c4-s4`（服务网格与高级网络）：缺 面试

#### k82-c5 · Kubernetes · 存储 〔k8s〕
- `k82-c5-s1`（卷（Volumes））：缺 面试
- `k82-c5-s2`（持久卷（PersistentVolume）与持久卷声明（PersistentVolumeClaim））：缺 面试
- `k82-c5-s3`（存储类（StorageClass））：缺 面试
- `k82-c5-s4`（存储最佳实践）：缺 面试

#### k82-c6 · Kubernetes · 配置 〔k8s〕
- `k82-c6-s1`（ConfigMap）：缺 面试
- `k82-c6-s2`（Secret）：缺 面试
- `k82-c6-s3`（环境变量与容器参数）：缺 面试
- `k82-c6-s4`（配置管理最佳实践）：缺 面试

#### k82-c7 · Kubernetes · 安全 〔k8s〕
- `k82-c7-s1`（安全概述与威胁模型）：缺 —
- `k82-c7-s2`（Pod 安全）：缺 面试
- `k82-c7-s3`（RBAC 授权）：缺 —
- `k82-c7-s4`（网络安全与策略）：缺 面试
- `k82-c7-s5`（镜像与供应链安全）：缺 动手自测, 面试

#### k82-c8 · Kubernetes · 可观测性 〔k8s〕
- `k82-c8-s1`（监控与指标）：缺 面试
- `k82-c8-s2`（日志）：缺 —
- `k82-c8-s3`（追踪与 APM）：缺 —
- `k82-c8-s4`（事件与审计）：缺 面试

#### k82-c9 · Kubernetes · 扩展性 〔k8s〕
- `k82-c9-s1`（自定义资源（CRD））：缺 面试
- `k82-c9-s2`（控制器与 Operator）：缺 面试
- `k82-c9-s3`（准入控制器与 Webhook）：缺 面试
- `k82-c9-s4`（API 聚合与扩展 API 服务器）：缺 面试

#### k82-c10 · Kubernetes · 参考与工具 〔k8s〕
- `k82-c10-s1`（kubectl 命令行工具）：缺 —
- `k82-c10-s2`（API 参考）：缺 —
- `k82-c10-s3`（Helm 与包管理）：缺 —
- `k82-c10-s4`（其他常用工具）：缺 面试

#### os2-c1 · 安全运维 · 安全基础与威胁模型 〔secops〕
- `os2-c1-s1`（安全运维概述）：缺 —
- `os2-c1-s2`（威胁建模与风险分析）：缺 面试
- `os2-c1-s3`（常见攻击类型与攻击面）：缺 —

#### os2-c2 · 安全运维 · 安全架构与设计原则 〔secops〕
- `os2-c2-s1`（安全架构基础）：缺 —
- `os2-c2-s2`（安全设计模式）：缺 —
- `os2-c2-s3`（OWASP 安全设计指南）：缺 —

#### os2-c3 · 安全运维 · 安全配置与加固 〔secops〕
- `os2-c3-s1`（系统加固）：缺 —
- `os2-c3-s2`（网络设备与防火墙配置）：缺 —
- `os2-c3-s3`（应用安全配置）：缺 —

#### os2-c4 · 安全运维 · 身份与访问管理 〔secops〕
- `os2-c4-s1`（身份认证机制）：缺 面试
- `os2-c4-s2`（授权与访问控制模型）：缺 —
- `os2-c4-s3`（身份生命周期管理）：缺 —

#### os2-c5 · 安全运维 · 数据安全与隐私保护 〔secops〕
- `os2-c5-s1`（数据分类与加密）：缺 —
- `os2-c5-s2`（数据防泄漏（DLP））：缺 面试
- `os2-c5-s3`（隐私法规与合规）：缺 面试

#### os2-c6 · 安全运维 · 安全监控与日志管理 〔secops〕
- `os2-c6-s1`（日志收集与管理）：缺 面试
- `os2-c6-s2`（安全监控与告警）：缺 面试
- `os2-c6-s3`（入侵检测与防御）：缺 —

#### os2-c7 · 安全运维 · 漏洞管理与渗透测试 〔secops〕
- `os2-c7-s1`（漏洞扫描与评估）：缺 —
- `os2-c7-s2`（渗透测试方法论）：缺 —
- `os2-c7-s3`（漏洞披露与协调）：缺 —

#### os2-c8 · 安全运维 · 事件响应与应急处理 〔secops〕
- `os2-c8-s1`（事件响应计划）：缺 面试
- `os2-c8-s2`（事件检测与分析）：缺 —
- `os2-c8-s3`（遏制、根除与恢复）：缺 面试

#### os2-c9 · 安全运维 · 业务连续性与灾难恢复 〔secops〕
- `os2-c9-s1`（业务影响分析）：缺 面试
- `os2-c9-s2`（灾难恢复策略）：缺 —
- `os2-c9-s3`（演练与持续改进）：缺 —

#### os2-c10 · 安全运维 · 安全合规与审计 〔secops〕
- `os2-c10-s1`（安全合规框架）：缺 —
- `os2-c10-s2`（安全审计流程）：缺 —
- `os2-c10-s3`（安全治理与风险管理）：缺 —

#### os2-c11 · 安全运维 · 安全运营工具与自动化 〔secops〕
- `os2-c11-s1`（SIEM 与 SOAR 平台）：缺 面试
- `os2-c11-s2`（安全自动化脚本）：缺 —
- `os2-c11-s3`（云安全运维）：缺 —

#### os2-c12 · 安全运维 · 安全意识与培训 〔secops〕
- `os2-c12-s1`（安全意识计划设计）：缺 —
- `os2-c12-s2`（钓鱼模拟与社交工程防御）：缺 —
- `os2-c12-s3`（安全文化建设）：缺 —

### ai（AI 工程）— 61 个章节存在不完整小节

#### inf-c1 · AI Infra · 推理引擎基础与架构 〔deploy〕
- `inf-c1-s1`（推理引擎概述）：缺 面试
- `inf-c1-s2`（vLLM核心概念）：缺 动手自测, 面试
- `inf-c1-s3`（ONNX Runtime核心概念）：缺 —
- `inf-c1-s4`（TensorRT核心概念）：缺 面试

#### inf-c2 · AI Infra · 显存优化技术 〔deploy〕
- `inf-c2-s1`（显存管理基础）：缺 面试
- `inf-c2-s2`（vLLM显存优化）：缺 面试
- `inf-c2-s3`（ONNX Runtime显存优化）：缺 面试
- `inf-c2-s4`（TensorRT显存优化）：缺 动手自测, 面试
- `inf-c2-s5`（通用显存优化技巧）：缺 —

#### inf-c3 · AI Infra · 吞吐优化技术 〔deploy〕
- `inf-c3-s1`（吞吐量指标与瓶颈分析）：缺 面试
- `inf-c3-s2`（vLLM吞吐优化）：缺 动手自测, 面试
- `inf-c3-s3`（ONNX Runtime吞吐优化）：缺 —
- `inf-c3-s4`（TensorRT吞吐优化）：缺 —
- `inf-c3-s5`（端到端吞吐调优案例）：缺 —

#### inf-c4 · AI Infra · 高级优化与部署实践 〔deploy〕
- `inf-c4-s1`（模型量化与低精度推理）：缺 —
- `inf-c4-s2`（多GPU与分布式推理）：缺 面试
- `inf-c4-s3`（推理服务化与性能监控）：缺 面试
- `inf-c4-s4`（性能调优实战与案例分析）：缺 面试

#### mlp-c1 · MLOps · MLflow 基础与实验追踪 〔mlflow〕
- `mlp-c1-s1`（MLflow 概述与安装）：缺 面试
- `mlp-c1-s2`（实验追踪基础）：缺 面试
- `mlp-c1-s3`（实验比较与可视化）：缺 —
- `mlp-c1-s4`（跟踪服务器与后端存储）：缺 —

#### mlp-c2 · MLOps · MLflow 模型注册与模型管理 〔mlflow〕
- `mlp-c2-s1`（模型注册表概述）：缺 —
- `mlp-c2-s2`（模型版本与阶段管理）：缺 —
- `mlp-c2-s3`（模型部署与推理）：缺 —
- `mlp-c2-s4`（模型注册表高级特性）：缺 —

#### mlp-c3 · MLOps · MLflow 项目与流水线 〔mlflow〕
- `mlp-c3-s1`（MLflow Projects 规范）：缺 —
- `mlp-c3-s2`（环境与依赖管理）：缺 —
- `mlp-c3-s3`（MLflow 与流水线集成）：缺 面试

#### mlp-c4 · MLOps · Kubeflow 基础与核心组件 〔kubeflow〕
- `mlp-c4-s1`（Kubeflow 概述与架构）：缺 —
- `mlp-c4-s2`（Kubeflow 安装与配置）：缺 面试
- `mlp-c4-s3`（Kubeflow Notebooks）：缺 —

#### mlp-c5 · MLOps · Kubeflow Pipelines 与持续训练 〔kubeflow〕
- `mlp-c5-s1`（Kubeflow Pipelines 概念）：缺 面试
- `mlp-c5-s2`（使用 SDK 构建流水线）：缺 —
- `mlp-c5-s3`（流水线参数与数据传递）：缺 面试
- `mlp-c5-s4`（持续训练与调度）：缺 面试
- `mlp-c5-s5`（Katib 超参数调优）：缺 面试

#### mlp-c6 · MLOps · 模型部署与监控（Kubeflow + MLflow） 〔kubeflow〕
- `mlp-c6-s1`（KFServing 模型推理）：缺 面试
- `mlp-c6-s2`（模型监控与漂移检测）：缺 —
- `mlp-c6-s3`（MLflow 与 Kubeflow 的集成实践）：缺 面试

#### td-c1 · 训练数据 · 数据集基础与加载 〔traindata〕
- `td-c1-s1`（数据集加载入门）：缺 面试
- `td-c1-s2`（数据集结构与信息）：缺 面试
- `td-c1-s3`（数据集迭代与访问）：缺 —
- `td-c1-s4`（数据集拆分与重组）：缺 面试

#### td-c2 · 训练数据 · 数据预处理与转换 〔traindata〕
- `td-c2-s1`（映射与批处理）：缺 面试
- `td-c2-s2`（过滤与选择）：缺 面试
- `td-c2-s3`（数据增强与变换）：缺 面试
- `td-c2-s4`（类型转换与数值化）：缺 面试
- `td-c2-s5`（数据混洗与批次生成）：缺 —

#### td-c3 · 训练数据 · 特征工程与特征列 〔traindata〕
- `td-c3-s1`（特征类型与表示）：缺 面试
- `td-c3-s2`（TensorFlow 特征列）：缺 —
- `td-c3-s3`（特征交叉与组合）：缺 面试
- `td-c3-s4`（特征存储与版本管理）：缺 面试
- `td-c3-s5`（特征仓库与在线服务）：缺 —

#### td-c4 · 训练数据 · 数据标注与标签处理 〔traindata〕
- `td-c4-s1`（标注工具与格式）：缺 面试
- `td-c4-s2`（标签编码）：缺 面试
- `td-c4-s3`（多标签与层次标签）：缺 面试
- `td-c4-s4`（标注质量控制）：缺 —

#### td-c5 · 训练数据 · 数据集版本管理与缓存 〔traindata〕
- `td-c5-s1`（版本控制与脚本）：缺 面试
- `td-c5-s2`（缓存与内存优化）：缺 面试
- `td-c5-s3`（离线数据集与本地文件）：缺 —
- `td-c5-s4`（数据集与模型仓库协同）：缺 面试

#### td-c6 · 训练数据 · 自定义数据集与数据加载器 〔traindata〕
- `td-c6-s1`（Hugging Face 自定义数据集）：缺 —
- `td-c6-s2`（TensorFlow 自定义数据集）：缺 面试
- `td-c6-s3`（数据管道与性能调优）：缺 面试
- `td-c6-s4`（性能剖析与调优）：缺 —

#### td-c7 · 训练数据 · 数据集评估与验证 〔traindata〕
- `td-c7-s1`（数据分布分析）：缺 —
- `td-c7-s2`（数据划分与交叉验证）：缺 面试
- `td-c7-s3`（模型评估与基准）：缺 面试
- `td-c7-s4`（最佳实践与案例研究）：缺 面试

#### td-c8 · 训练数据 · 高级主题与生态集成 〔traindata〕
- `td-c8-s1`（分布式数据加载）：缺 面试
- `td-c8-s2`（多模态数据集）：缺 面试
- `td-c8-s3`（社区与共享）：缺 —

#### ed-c1 · 端侧AI · TensorFlow Lite 入门与核心概念 〔edgeai〕
- `ed-c1-s1`（TensorFlow Lite 概述）：缺 面试
- `ed-c1-s2`（TensorFlow Lite 架构与组件）：缺 —
- `ed-c1-s3`（模型转换与优化基础）：缺 —
- `ed-c1-s4`（开发环境搭建与工具链）：缺 面试

#### ed-c2 · 端侧AI · TensorFlow Lite 模型推理与集成 〔edgeai〕
- `ed-c2-s1`（Android 平台集成）：缺 面试
- `ed-c2-s2`（iOS 平台集成）：缺 —
- `ed-c2-s3`（Python 与边缘设备推理）：缺 —
- `ed-c2-s4`（硬件加速与委托（Delegate））：缺 —

#### ed-c3 · 端侧AI · TensorFlow Lite 模型优化与量化 〔edgeai〕
- `ed-c3-s1`（量化技术详解）：缺 —
- `ed-c3-s2`（模型剪枝与蒸馏）：缺 面试
- `ed-c3-s3`（模型转换与兼容性调试）：缺 —
- `ed-c3-s4`（性能基准测试与调优）：缺 面试
- `ed-c3-s5`（性能优化与系统集成）：缺 面试

#### ed-c4 · 端侧AI · Apple 机器学习框架概述（Core ML） 〔edgeai〕
- `ed-c4-s1`（Core ML 简介与架构）：缺 —
- `ed-c4-s2`（模型转换工具：Core ML Tools）：缺 —
- `ed-c4-s3`（在 iOS 应用中集成 Core ML）：缺 —
- `ed-c4-s4`（性能优化与硬件加速）：缺 —

#### ed-c5 · 端侧AI · 跨平台部署与高级主题 〔edgeai〕
- `ed-c5-s1`（车机系统部署实践）：缺 面试
- `ed-c5-s2`（IoT 设备部署与边缘计算）：缺 面试
- `ed-c5-s3`（模型生命周期管理）：缺 面试
- `ed-c5-s4`（隐私与安全）：缺 面试
- `ed-c5-s5`（前沿趋势与工具生态）：缺 面试

#### al-c1 · 算法 · PyTorch 基础 〔cv〕
- `al-c1-s1`（张量（Tensor））：缺 面试
- `al-c1-s2`（自动微分（Autograd））：缺 —
- `al-c1-s3`（神经网络模块（nn.Module））：缺 面试
- `al-c1-s4`（优化器与损失函数）：缺 面试
- `al-c1-s5`（数据加载与预处理）：缺 面试
- `al-c1-s6`（训练循环与验证）：缺 面试

#### al-c2 · 算法 · PyTorch 进阶 〔cv〕
- `al-c2-s1`（自定义 autograd 函数）：缺 —
- `al-c2-s2`（混合精度训练）：缺 面试
- `al-c2-s3`（分布式训练）：缺 面试
- `al-c2-s4`（TorchScript 与模型部署）：缺 面试
- `al-c2-s5`（性能优化与调试）：缺 面试

#### al-c5 · 算法 · TensorFlow 基础 〔cv〕
- `al-c5-s1`（TensorFlow 核心概念）：缺 —
- `al-c5-s2`（Keras 模型构建）：缺 面试
- `al-c5-s3`（数据输入管道（tf.data））：缺 —
- `al-c5-s4`（模型训练与评估）：缺 面试
- `al-c5-s5`（卷积神经网络（CNN））：缺 面试
- `al-c5-s6`（循环神经网络（RNN））：缺 —

#### al-c6 · 算法 · TensorFlow 进阶 〔cv〕
- `al-c6-s1`（自定义模型与训练）：缺 面试
- `al-c6-s2`（分布式训练）：缺 动手自测, 面试
- `al-c6-s3`（模型部署与 Serving）：缺 面试
- `al-c6-s4`（TensorFlow Extended (TFX)）：缺 面试
- `al-c6-s5`（性能优化与调试）：缺 面试

#### al-c7 · 算法 · CV 应用实战 〔cv〕
- `al-c7-s1`（图像分类实战）：缺 面试
- `al-c7-s2`（目标检测）：缺 —
- `al-c7-s3`（图像分割）：缺 面试
- `al-c7-s4`（图像生成与 GAN）：缺 面试
- `al-c7-s5`（视频理解）：缺 —

#### al-c1n · 算法 · PyTorch 基础 〔nlp〕
- `al-c1n-s1`（张量（Tensor））：缺 面试
- `al-c1n-s2`（自动微分（Autograd））：缺 —
- `al-c1n-s3`（神经网络模块（nn.Module））：缺 面试
- `al-c1n-s4`（优化器与损失函数）：缺 面试
- `al-c1n-s5`（数据加载与预处理）：缺 面试
- `al-c1n-s6`（训练循环与验证）：缺 面试

#### al-c2n · 算法 · PyTorch 进阶 〔nlp〕
- `al-c2n-s1`（自定义 autograd 函数）：缺 —
- `al-c2n-s2`（混合精度训练）：缺 面试
- `al-c2n-s3`（分布式训练）：缺 面试
- `al-c2n-s4`（TorchScript 与模型部署）：缺 面试
- `al-c2n-s5`（性能优化与调试）：缺 面试

#### al-c5n · 算法 · TensorFlow 基础 〔nlp〕
- `al-c5n-s1`（TensorFlow 核心概念）：缺 —
- `al-c5n-s2`（Keras 模型构建）：缺 面试
- `al-c5n-s3`（数据输入管道（tf.data））：缺 —
- `al-c5n-s4`（模型训练与评估）：缺 面试
- `al-c5n-s5`（卷积神经网络（CNN））：缺 面试
- `al-c5n-s6`（循环神经网络（RNN））：缺 —

#### al-c6n · 算法 · TensorFlow 进阶 〔nlp〕
- `al-c6n-s1`（自定义模型与训练）：缺 面试
- `al-c6n-s2`（分布式训练）：缺 动手自测, 面试
- `al-c6n-s3`（模型部署与 Serving）：缺 面试
- `al-c6n-s4`（TensorFlow Extended (TFX)）：缺 面试
- `al-c6n-s5`（性能优化与调试）：缺 面试

#### al-c8 · 算法 · NLP 应用实战 〔nlp〕
- `al-c8-s1`（文本分类）：缺 面试
- `al-c8-s2`（序列标注）：缺 面试
- `al-c8-s3`（机器翻译）：缺 面试
- `al-c8-s4`（语言模型与文本生成）：缺 —
- `al-c8-s5`（问答系统）：缺 面试

#### al-c3 · 算法 · scikit-learn 基础 〔rec〕
- `al-c3-s1`（估计器（Estimator）API）：缺 —
- `al-c3-s2`（数据预处理）：缺 面试
- `al-c3-s3`（数据集划分与交叉验证）：缺 面试
- `al-c3-s4`（监督学习：分类与回归）：缺 面试
- `al-c3-s5`（模型评估与选择）：缺 面试
- `al-c3-s6`（无监督学习）：缺 面试

#### al-c4 · 算法 · scikit-learn 进阶 〔rec〕
- `al-c4-s1`（管道（Pipeline））：缺 面试
- `al-c4-s2`（特征选择与提取）：缺 面试
- `al-c4-s3`（模型集成）：缺 面试
- `al-c4-s4`（模型解释与可解释性）：缺 —
- `al-c4-s5`（文本与分类数据处理）：缺 —

#### al-c1r · 算法 · PyTorch 基础 〔rec〕
- `al-c1r-s1`（张量（Tensor））：缺 面试
- `al-c1r-s2`（自动微分（Autograd））：缺 —
- `al-c1r-s3`（神经网络模块（nn.Module））：缺 面试
- `al-c1r-s4`（优化器与损失函数）：缺 面试
- `al-c1r-s5`（数据加载与预处理）：缺 面试
- `al-c1r-s6`（训练循环与验证）：缺 面试

#### al-c9 · 算法 · 推荐模型实战 〔rec〕
- `al-c9-s1`（推荐系统基础）：缺 面试
- `al-c9-s2`（传统协同过滤）：缺 面试
- `al-c9-s3`（基于内容的推荐）：缺 面试
- `al-c9-s4`（深度学习推荐模型）：缺 —
- `al-c9-s5`（序列推荐）：缺 —
- `al-c9-s6`（推荐系统实战与部署）：缺 动手自测, 面试

#### agt-c1 · AI Agent · 智能体与工具调用基础 〔agent〕
- `agt-c1-s1`（智能体定义与运行循环）：缺 —
- `agt-c1-s2`（工具定义与注册）：缺 —
- `agt-c1-s3`（工具调用机制）：缺 —

#### agt-c2 · AI Agent · 上下文管理与记忆 〔agent〕
- `agt-c2-s1`（上下文窗口与消息历史）：缺 —
- `agt-c2-s2`（短期记忆与长期记忆）：缺 面试
- `agt-c2-s3`（状态管理与持久化）：缺 面试

#### agt-c3 · AI Agent · 多步骤工作流与编排 〔agent〕
- `agt-c3-s1`（顺序工作流）：缺 面试
- `agt-c3-s2`（条件分支与循环）：缺 —
- `agt-c3-s3`（并行执行与扇出）：缺 面试

#### agt-c4 · AI Agent · 多智能体协作模式 〔agent〕
- `agt-c4-s1`（多智能体架构概览）：缺 面试
- `agt-c4-s2`（工作流协作模式）：缺 面试
- `agt-c4-s3`（对话式协作模式）：缺 面试

#### agt-c5 · AI Agent · 高级工具调用与集成 〔agent〕
- `agt-c5-s1`（结构化输出与工具参数）：缺 —
- `agt-c5-s2`（动态工具集与工具选择）：缺 面试
- `agt-c5-s3`（外部API与Web服务集成）：缺 面试

#### agt-c6 · AI Agent · 安全与合规 〔agent〕
- `agt-c6-s1`（提示注入防护）：缺 —
- `agt-c6-s2`（权限与访问控制）：缺 —
- `agt-c6-s3`（数据隐私与合规）：缺 面试

#### agr-c1 · RAG · RAG 基础与架构 〔rag〕
- `agr-c1-s1`（RAG 概念与动机）：缺 面试
- `agr-c1-s2`（RAG 系统架构）：缺 —
- `agr-c1-s3`（LangChain 与 LlamaIndex 概览）：缺 面试
- `agr-c1-s4`（第一个 RAG 应用）：缺 面试

#### agr-c2 · RAG · 文档加载与预处理 〔rag〕
- `agr-c2-s1`（文档加载器）：缺 —
- `agr-c2-s2`（文本清洗与规范化）：缺 面试
- `agr-c2-s3`（文本切分策略）：缺 动手自测, 面试
- `agr-c2-s4`（元数据管理）：缺 面试

#### agr-c3 · RAG · 向量化与嵌入模型 〔rag〕
- `agr-c3-s1`（嵌入模型基础）：缺 —
- `agr-c3-s2`（常用嵌入模型）：缺 面试
- `agr-c3-s3`（嵌入生成与缓存）：缺 面试
- `agr-c3-s4`（向量质量评估）：缺 面试

#### agr-c4 · RAG · 向量存储与索引 〔rag〕
- `agr-c4-s1`（向量数据库概览）：缺 面试
- `agr-c4-s2`（索引构建与配置）：缺 面试
- `agr-c4-s3`（向量检索操作）：缺 面试
- `agr-c4-s4`（混合检索与过滤）：缺 面试

#### agr-c5 · RAG · 检索器与高级检索策略 〔rag〕
- `agr-c5-s1`（检索器接口与类型）：缺 面试
- `agr-c5-s2`（相似度检索与最大边际相关性）：缺 面试
- `agr-c5-s3`（上下文压缩与重排序）：缺 面试
- `agr-c5-s4`（查询转换与多查询检索）：缺 面试
- `agr-c5-s5`（递归检索与文档层次结构）：缺 面试

#### agr-c6 · RAG · 索引与查询引擎 〔rag〕
- `agr-c6-s1`（LlamaIndex 索引类型）：缺 面试
- `agr-c6-s2`（查询引擎与响应合成）：缺 动手自测, 面试
- `agr-c6-s3`（LangChain 检索链）：缺 面试
- `agr-c6-s4`（查询规划与多步推理）：缺 面试

#### agp-c1 · Prompt 工程 · 提示工程概述 〔prompt〕
- `agp-c1-s1`（什么是提示工程）：缺 —
- `agp-c1-s2`（提示工程的应用场景）：缺 —
- `agp-c1-s3`（提示工程的核心原则）：缺 —

#### agp-c2 · Prompt 工程 · 基础提示技巧 〔prompt〕
- `agp-c2-s1`（明确指令）：缺 —
- `agp-c2-s2`（提供示例（Few-shot））：缺 —
- `agp-c2-s3`（角色设定）：缺 —
- `agp-c2-s4`（分隔符与结构化提示）：缺 —

#### agp-c3 · Prompt 工程 · 高级提示策略 〔prompt〕
- `agp-c3-s1`（思维链（Chain-of-Thought））：缺 —
- `agp-c3-s2`（自我一致性（Self-Consistency））：缺 —
- `agp-c3-s3`（反思与自我修正）：缺 —
- `agp-c3-s4`（分解复杂任务）：缺 —

#### agp-c4 · Prompt 工程 · 结构化输出 〔prompt〕
- `agp-c4-s1`（JSON输出）：缺 —
- `agp-c4-s2`（表格与列表输出）：缺 —
- `agp-c4-s3`（代码与函数签名输出）：缺 —
- `agp-c4-s4`（约束输出范围）：缺 —

#### agp-c5 · Prompt 工程 · 护栏设计 〔prompt〕
- `agp-c5-s1`（内容过滤与安全）：缺 —
- `agp-c5-s2`（防止提示注入）：缺 面试
- `agp-c5-s3`（处理敏感信息）：缺 —
- `agp-c5-s4`（输出合规性检查）：缺 —

#### agp-c6 · Prompt 工程 · 评测与迭代 〔prompt〕
- `agp-c6-s1`（评测指标）：缺 —
- `agp-c6-s2`（测试集构建）：缺 面试
- `agp-c6-s3`（A/B测试与对比）：缺 —
- `agp-c6-s4`（迭代优化流程）：缺 —

#### lle-c1 · MLOps · LLM 评估 · RAGAS 入门与核心概念 〔llmeval〕
- `lle-c1-s1`（RAGAS 简介与安装）：缺 面试
- `lle-c1-s2`（评估指标概览）：缺 面试
- `lle-c1-s3`（数据集准备与格式）：缺 —

#### lle-c2 · MLOps · LLM 评估 · RAGAS 指标深入 〔llmeval〕
- `lle-c2-s1`（忠实度 (Faithfulness)）：缺 —
- `lle-c2-s2`（答案相关性 (Answer Relevance)）：缺 —
- `lle-c2-s3`（上下文相关性 (Context Relevance)）：缺 面试
- `lle-c2-s4`（其他指标与自定义）：缺 动手自测, 面试

#### lle-c3 · MLOps · LLM 评估 · RAGAS 评估流程与集成 〔llmeval〕
- `lle-c3-s1`（构建评估流水线）：缺 —
- `lle-c3-s2`（与 LangChain 集成）：缺 面试
- `lle-c3-s3`（结果可视化与报告）：缺 —

#### lle-c4 · MLOps · LLM 评估 · LangChain 评估框架 〔llmeval〕
- `lle-c4-s1`（LangChain 评估概览）：缺 面试
- `lle-c4-s2`（字符串评估器 (String Evaluators)）：缺 —
- `lle-c4-s3`（轨迹评估器 (Trajectory Evaluators)）：缺 面试
- `lle-c4-s4`（评估数据集与基准）：缺 面试

#### lle-c5 · MLOps · LLM 评估 · LLM-as-judge 实践 〔llmeval〕
- `lle-c5-s1`（LLM-as-judge 原理）：缺 面试
- `lle-c5-s2`（使用 LangChain 实现 LLM 裁判）：缺 —
- `lle-c5-s3`（设计有效的评估提示）：缺 —
- `lle-c5-s4`（处理裁判偏差与校准）：缺 面试

#### lle-c6 · MLOps · LLM 评估 · Tracing 与可观测性 〔llmeval〕
- `lle-c6-s1`（追踪基础概念）：缺 面试
- `lle-c6-s2`（LangSmith 集成）：缺 —
- `lle-c6-s3`（追踪数据用于评估）：缺 —
- `lle-c6-s4`（生产环境监控与持续评估）：缺 面试
