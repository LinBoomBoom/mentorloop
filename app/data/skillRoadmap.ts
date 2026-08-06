// 技能路线图数据集 —— 方向 → 细分赛道 → 等级(初级/中级/高级) → 技能点
// 用途：/roadmap 页面的「树形图(ECharts)」与「路线图(卡片)」两种视图共用。
// 设计原则（活运营宪章 1.4）：只覆盖「能过面试 + 真实能力」的技术栈，刻意不覆盖软技能/管理。

export type LevelKey = 'junior' | 'mid' | 'senior'

export interface SkillNode {
  name: string
  desc?: string
  must?: boolean // 该等级「必会」项（面试高频 / 岗位硬门槛）
}

export interface LevelGroup {
  level: LevelKey
  title: string // 初级 / 中级 / 高级
  stance: string // 该等级能力定位（一句话）
  skills: SkillNode[]
}

export interface SubTrack {
  id: string
  name: string
  icon: string // Icon 组件名
  summary: string
  levels: LevelGroup[]
}

export interface Direction {
  id: string
  name: string
  color: string
  subTracks: SubTrack[]
}

const LEVELS: Record<LevelKey, { title: string; stance: string }> = {
  junior: { title: '初级', stance: '在指导下完成被分配的具体功能，掌握基础语法与工具，理解核心概念。' },
  mid: { title: '中级', stance: '独立负责模块，懂框架原理，能做性能优化与复杂问题排查，理解基础系统设计。' },
  senior: { title: '高级', stance: '主导架构与技术选型，攻克难点，沉淀方法论，跨团队协作并带人。' },
}

function grp(level: LevelKey, skills: SkillNode[]): LevelGroup {
  return { level, title: LEVELS[level].title, stance: LEVELS[level].stance, skills }
}

export const roadmap: Direction[] = [
  // ===================== 前端 =====================
  {
    id: 'frontend',
    name: '前端',
    color: '#ff5e7e',
    subTracks: [
      {
        id: 'fe-web',
        name: 'Web 开发工程师',
        icon: 'code',
        summary: '面向 PC + 移动端浏览器，构建通用 Web 站点与中后台系统。',
        levels: [
          grp('junior', [
            { name: 'HTML 语义化与标签', desc: 'form / table / 无障碍属性，结构清晰可 SEO。' },
            { name: 'CSS 布局', desc: 'Flex / Grid / 盒模型 / 定位，能还原设计稿。', must: true },
            { name: 'JavaScript 基础', desc: '变量/作用域/闭包/原型链/DOM 操作/事件。', must: true },
            { name: 'ES6+ 常用语法', desc: 'let/const、解构、箭头函数、Promise、模块化。' },
            { name: '一种主流框架入门', desc: 'Vue 或 React 组件化、props/state 基础用法。', must: true },
            { name: '浏览器调试', desc: 'DevTools 看 console / network / 元素样式。' },
            { name: 'Git 基础协作', desc: 'clone/commit/push/pull/分支，能提 PR。' },
          ]),
          grp('mid', [
            { name: '框架原理与响应式', desc: 'Vue 响应式 / React 调和，懂 diff 与更新机制。', must: true },
            { name: '状态管理', desc: 'Pinia / Redux / Zustand，跨组件共享与数据流。' },
            { name: '前端路由', desc: 'history/hash 模式、懒加载、鉴权守卫。' },
            { name: '工程化构建', desc: 'Vite / Webpack，理解打包、Tree-shaking、HMR。', must: true },
            { name: 'TypeScript', desc: '类型系统、泛型、接口，项目级落地。', must: true },
            { name: '性能优化', desc: '首屏/白屏、资源压缩、懒加载、重排重绘。' },
            { name: '组件设计与复用', desc: '高内聚低耦合、受控/非受控、可配置组件。' },
            { name: '接口联调与 Mock', desc: 'REST/请求封装、拦截器、错误统一处理。' },
          ]),
          grp('senior', [
            { name: '前端架构设计', desc: '微前端、模块联邦、多包_monorepo、灰度方案。', must: true },
            { name: '性能体系化', desc: '指标(CWV)、监控、长列表/虚拟滚动、内存泄漏治理。' },
            { name: '跨端方案', desc: 'WebView / RN / Taro / uni-app 选型与取舍。' },
            { name: '工程效能', desc: 'CI/CD、组件库、设计系统、自动化测试体系。' },
            { name: '复杂状态与并发', desc: '原子化状态、并发渲染、SSR/流式渲染。' },
            { name: '技术选型与沉淀', desc: '带团队定规范、Code Review、新人培养。', must: true },
          ]),
        ],
      },
      {
        id: 'fe-mobile',
        name: '移动端工程师（H5 / 响应式）',
        icon: 'phone',
        summary: '专注移动浏览器与混合环境，做响应式与移动体验优化。',
        levels: [
          grp('junior', [
            { name: '移动端视口与适配', desc: 'viewport、rem/vw、1px 边框、安全区。', must: true },
            { name: '响应式布局', desc: '媒体查询、流式布局、移动优先设计。' },
            { name: '移动端事件', desc: 'touch / 手势 / 点击穿透 / 滚动穿透。' },
            { name: '基础框架用法', desc: 'Vue/React 在移动端的组件开发。' },
          ]),
          grp('mid', [
            { name: '移动性能专项', desc: '滚动卡顿、GPU 合成层、长列表优化。', must: true },
            { name: 'Hybrid 通信', desc: 'JSBridge 原理、与 Native 双向调用。' },
            { name: '移动端适配方案', desc: 'postcss-px-to-viewport、多分辨率兼容。' },
            { name: 'PWA / 离线缓存', desc: 'Service Worker、manifest、离线可用。' },
            { name: '移动端调试', desc: '真机调试、vConsole、抓包。' },
          ]),
          grp('senior', [
            { name: '移动端架构', desc: '混合容器方案、包体积治理、动态化。', must: true },
            { name: '体验度量体系', desc: 'FMP/INP 采集、AB、卡顿监控。' },
            { name: '跨端选型决策', desc: 'H5 vs 小程序 vs RN 的成本收益评估。' },
          ]),
        ],
      },
      {
        id: 'fe-app',
        name: 'APP 工程师（跨端原生体验）',
        icon: 'app',
        summary: '用 React Native / Flutter 等产出接近原生的多端 App。',
        levels: [
          grp('junior', [
            { name: '跨端框架入门', desc: 'React Native 或 Flutter 组件与布局。', must: true },
            { name: '原生基础概念', desc: 'iOS/Android 生命周期、权限、打包。' },
            { name: '路由与导航', desc: '栈式导航、tab、页面传参。' },
            { name: '基础原生桥接', desc: '调用相机/定位等原生能力的封装。' },
          ]),
          grp('mid', [
            { name: '原生模块开发', desc: '编写原生 Module/插件、桥接通信。', must: true },
            { name: '性能与原生体验', desc: '列表复用、首屏、动画 60fps。' },
            { name: '热更新 / OTA', desc: 'Code Push、差量更新、灰度。' },
            { name: '多端一致性', desc: 'iOS/Android/各厂商适配。' },
          ]),
          grp('senior', [
            { name: '跨端架构', desc: '桥接层抽象、动态化、多 App 复用内核。', must: true },
            { name: '包体积与启动治理', desc: '拆包、懒加载、启动耗时优化。' },
            { name: '发版与运维', desc: '应用商店合规、崩溃监控、回滚。' },
          ]),
        ],
      },
      {
        id: 'fe-uniapp',
        name: 'uni-app 工程师',
        icon: 'layers',
        summary: '一套代码编译到小程序 / App / H5，适合多端快速铺量。',
        levels: [
          grp('junior', [
            { name: 'uni-app 基础', desc: 'pages.json、条件编译、vue 页面写法。', must: true },
            { name: '小程序平台差异', desc: '微信/支付宝/抖音小程序的 API 差异。' },
            { name: 'rpx 与样式', desc: '自适应单位、组件样式隔离。' },
            { name: '基础 API', desc: '路由、storage、网络请求封装。' },
          ]),
          grp('mid', [
            { name: '多端兼容', desc: '条件编译、平台特有能力抹平。', must: true },
            { name: '原生能力扩展', desc: 'uni.requireNativePlugin、原生模块接入。' },
            { name: '性能优化', desc: '首屏、包体积、setData 频率。' },
            { name: '状态与工程化', desc: 'Pinia、分包、自动化构建。' },
          ]),
          grp('senior', [
            { name: '跨端架构', desc: '插件化、多 App 复用、混合栈集成。', must: true },
            { name: '原生插件开发', desc: 'iOS/Android 原生插件编写与发布。' },
            { name: '质量体系', desc: '多端监控、灰度、热修复。' },
          ]),
        ],
      },
      {
        id: 'fe-miniprogram',
        name: '小程序工程师',
        icon: 'grid',
        summary: '专做微信/支付宝/抖音等平台小程序与生态。',
        levels: [
          grp('junior', [
            { name: '小程序框架', desc: 'WXML/WXSS/JS、双线程模型。', must: true },
            { name: '页面与路由', desc: '页面栈、跳转、参数传递。' },
            { name: '组件与 API', desc: '官方组件、授权、网络请求。' },
            { name: '云开发入门', desc: '云函数 / 云数据库基础。' },
          ]),
          grp('mid', [
            { name: '自定义组件', desc: 'behaviors、slot、组件通信。', must: true },
            { name: '性能与体验', desc: 'setData 优化、分包、骨架屏。' },
            { name: '登录与支付', desc: 'openid、session、支付闭环。' },
            { name: '多平台适配', desc: 'Taro/uni 跨端小程序。' },
          ]),
          grp('senior', [
            { name: '小程序架构', desc: '复杂状态、插件体系、跨端复用。', must: true },
            { name: '生态与商业化', desc: '广告、直播、私域、合规。' },
            { name: '质量保障', desc: '监控、灰度、回滚预案。' },
          ]),
        ],
      },
      {
        id: 'fe-arch',
        name: '前端架构 / 工程化专家',
        icon: 'rocket',
        summary: '建设脚手架、组件库、设计系统与研发效能平台。',
        levels: [
          grp('junior', [
            { name: '构建工具使用', desc: 'Vite/Webpack 配置、脚本编写。', must: true },
            { name: '代码规范', desc: 'ESLint/Prettier/EditorConfig 落地。' },
            { name: '基础组件封装', desc: '可复用 UI 组件。' },
          ]),
          grp('mid', [
            { name: '脚手架与设计系统', desc: 'CLI、组件库、主题 token。', must: true },
            { name: 'CI/CD', desc: '流水线、自动化测试、发布门禁。' },
            { name: 'Monorepo', desc: 'pnpm workspace / turborepo 多包管理。' },
            { name: '埋点与监控', desc: '前端监控 SDK、错误上报。' },
          ]),
          grp('senior', [
            { name: '研发效能体系', desc: '低代码、物料市场、度量平台。', must: true },
            { name: '架构治理', desc: '技术债、依赖治理、演进路线。' },
            { name: '组织赋能', desc: '规范沉淀、培训、工具推广。' },
          ]),
        ],
      },
      {
        id: 'fe-viz',
        name: '可视化 / 图形工程师',
        icon: 'chart',
        summary: '图表、大屏、3D / Canvas / WebGL 渲染方向。',
        levels: [
          grp('junior', [
            { name: 'Canvas / SVG 基础', desc: '绘制图形、动画入门。', must: true },
            { name: '图表库使用', desc: 'ECharts / D3 基础图表。' },
            { name: 'CSS 动画', desc: 'keyframes、transition、transform。' },
          ]),
          grp('mid', [
            { name: '可视化框架', desc: 'ECharts 深度 / D3 数据绑定。', must: true },
            { name: 'WebGL 入门', desc: 'Three.js / 着色器基础。' },
            { name: '性能与大数据', desc: '海量点渲染、分片、离屏。' },
          ]),
          grp('senior', [
            { name: '渲染引擎', desc: '自研渲染管线、GPU 优化。', must: true },
            { name: '三维与交互', desc: '3D 场景、拾取、后处理。' },
            { name: '可视化架构', desc: '可配置大屏、低代码搭建。' },
          ]),
        ],
      },
      {
        id: 'fe-node',
        name: 'Node.js 全栈工程师',
        icon: 'server',
        summary: '以前端为主、用 Node 打通 BFF 与服务端。',
        levels: [
          grp('junior', [
            { name: 'Node 基础', desc: '事件循环、模块、npm。', must: true },
            { name: 'Web 框架', desc: 'Express / Koa / Nest 写接口。' },
            { name: '数据库 CRUD', desc: 'MySQL/Redis 基本读写。' },
          ]),
          grp('mid', [
            { name: 'BFF 层设计', desc: '接口聚合、鉴权、网关。', must: true },
            { name: 'SSR', desc: 'Nuxt/Next 服务端渲染与同构。' },
            { name: 'Node 性能', desc: '内存、CPU Profiling、Cluster。' },
            { name: '安全基础', desc: '防注入、限流、输入校验。' },
          ]),
          grp('senior', [
            { name: '服务端架构', desc: '微服务、消息队列、缓存设计。', must: true },
            { name: '全栈工程化', desc: '前后端一体脚手架、部署。' },
            { name: '稳定性', desc: '容灾、限流降级、可观测。' },
          ]),
        ],
      },
    ],
  },

  // ===================== 后端 =====================
  {
    id: 'backend',
    name: '后端',
    color: '#14b8a6',
    subTracks: [
      {
        id: 'be-web',
        name: 'Web 后端工程师',
        icon: 'server',
        summary: '用 Java / Go / Python 等构建服务端接口与业务系统。',
        levels: [
          grp('junior', [
            { name: '一门语言精通', desc: 'Java/Go/Python 语法、集合、并发基础。', must: true },
            { name: 'Web 框架', desc: 'Spring Boot / Gin / FastAPI 写 CRUD。' },
            { name: '数据库基础', desc: 'SQL 增删改查、索引入门。', must: true },
            { name: '接口设计', desc: 'RESTful、参数校验、状态码。' },
            { name: '版本控制', desc: 'Git 协作、分支模型。' },
          ]),
          grp('mid', [
            { name: '数据库进阶', desc: '事务、锁、慢 SQL 优化、分库分表。', must: true },
            { name: '缓存设计', desc: 'Redis 数据结构、缓存一致性、击穿/雪崩。' },
            { name: '消息队列', desc: 'Kafka/RabbitMQ、异步解耦。' },
            { name: '并发编程', desc: '线程池、锁、无锁结构。', must: true },
            { name: '认证授权', desc: 'JWT/OAuth2、Session 方案。' },
            { name: '单元测试', desc: 'Mock、覆盖率、集成测试。' },
          ]),
          grp('senior', [
            { name: '系统架构设计', desc: '高并发、高可用、领域建模(DDD)。', must: true },
            { name: '分布式', desc: '分布式事务、一致性、注册中心。' },
            { name: '性能与容量', desc: '压测、容量规划、瓶颈治理。' },
            { name: '稳定性体系', desc: '限流降级、熔断、可观测。', must: true },
            { name: '技术领导力', desc: '方案评审、规范、带人。' },
          ]),
        ],
      },
      {
        id: 'be-micro',
        name: '微服务 / 架构师',
        icon: 'network',
        summary: '服务拆分、治理与平台化建设。',
        levels: [
          grp('junior', [
            { name: '服务化基础', desc: 'RPC 概念、接口契约。' },
            { name: '容器入门', desc: 'Docker 镜像、基本命令。' },
          ]),
          grp('mid', [
            { name: '微服务框架', desc: 'Spring Cloud / gRPC / Dubbo。', must: true },
            { name: '服务治理', desc: '注册发现、配置中心、网关。' },
            { name: '链路追踪', desc: 'Trace、日志聚合。' },
          ]),
          grp('senior', [
            { name: '架构演进', desc: '单体到微服务的拆分策略与边界。', must: true },
            { name: '中台 / 平台', desc: '能力复用、多租户。' },
            { name: '治理与标准', desc: '规范、灰度、混沌工程。' },
          ]),
        ],
      },
      {
        id: 'be-data',
        name: '大数据工程师',
        icon: 'database',
        summary: '离线 / 实时数据管线与数仓建设。',
        levels: [
          grp('junior', [
            { name: 'SQL 与 Hive', desc: '数仓建模、ETL 基础。', must: true },
            { name: 'Linux / Shell', desc: '基本运维与调度。' },
          ]),
          grp('mid', [
            { name: '计算引擎', desc: 'Spark / Flink 离线实时。', must: true },
            { name: '消息与存储', desc: 'Kafka、HDFS、HBase。' },
            { name: '调度系统', desc: 'DolphinScheduler / Airflow。' },
          ]),
          grp('senior', [
            { name: '数据架构', desc: '湖仓一体、实时数仓、治理。', must: true },
            { name: '性能调优', desc: '倾斜、吞吐、成本。' },
            { name: '数据资产', desc: '指标体系、数据质量。' },
          ]),
        ],
      },
      {
        id: 'be-db',
        name: '数据库 / 存储工程师',
        icon: 'database',
        summary: '关系型与 NoSQL 的运维、调优与高可用。',
        levels: [
          grp('junior', [
            { name: 'SQL 熟练', desc: '复杂查询、 join、窗口函数。', must: true },
            { name: '备份恢复', desc: '逻辑/物理备份基础。' },
          ]),
          grp('mid', [
            { name: '性能调优', desc: '执行计划、索引、参数。', must: true },
            { name: '高可用', desc: '主从、集群、故障切换。' },
            { name: 'NoSQL', desc: 'Redis/MongoDB/ES 场景选型。' },
          ]),
          grp('senior', [
            { name: '架构与容灾', desc: '多活、分片、容量规划。', must: true },
            { name: '内核与源码', desc: '存储引擎原理、调优深入。' },
          ]),
        ],
      },
    ],
  },

  // ===================== 运维 =====================
  {
    id: 'devops',
    name: '运维',
    color: '#f59e0b',
    subTracks: [
      {
        id: 'op-trad',
        name: '运维工程师（传统）',
        icon: 'settings',
        summary: '保障服务器、网络与业务系统稳定运行。',
        levels: [
          grp('junior', [
            { name: 'Linux 基础', desc: '常用命令、权限、服务管理。', must: true },
            { name: '网络基础', desc: 'TCP/IP、DNS、HTTP。' },
            { name: '脚本能力', desc: 'Shell / Python 自动化。' },
          ]),
          grp('mid', [
            { name: '监控告警', desc: 'Prometheus / Zabbix、指标与阈值。', must: true },
            { name: '中间件运维', desc: 'Nginx、MySQL、Redis 部署调优。' },
            { name: '故障处理', desc: '排查链路、应急响应。' },
          ]),
          grp('senior', [
            { name: '稳定性体系', desc: 'SLA、容灾、演练。', must: true },
            { name: '容量与成本', desc: '规划、压测、优化。' },
            { name: '规范与流程', desc: '变更、复盘、值班体系。' },
          ]),
        ],
      },
      {
        id: 'op-sre',
        name: 'SRE 工程师',
        icon: 'activity',
        summary: '以软件工程手段提升系统可靠性与效率。',
        levels: [
          grp('junior', [
            { name: '可观测基础', desc: '日志/指标/链路初探。' },
            { name: '自动化脚本', desc: '用代码替代手工操作。', must: true },
          ]),
          grp('mid', [
            { name: 'SLO/SLI', desc: '错误预算、健康度。', must: true },
            { name: '自动化运维', desc: 'IaC、自愈、编排。' },
            { name: '容量管理', desc: '评估与扩容策略。' },
          ]),
          grp('senior', [
            { name: '可靠性工程', desc: '混沌工程、韧性设计。', must: true },
            { name: '效能平台建设', desc: '发布、灰度、度量。' },
            { name: '组织推动', desc: '错误文化、跨团队协作。' },
          ]),
        ],
      },
      {
        id: 'op-cloud',
        name: '云平台工程师',
        icon: 'cloud',
        summary: '公有云 / 私有云的资源、网络与安全治理。',
        levels: [
          grp('junior', [
            { name: '云产品使用', desc: 'ECS、OSS、RDS 等基础。', must: true },
            { name: '网络基础', desc: 'VPC、子网、安全组。' },
          ]),
          grp('mid', [
            { name: 'IaC', desc: 'Terraform / 云 SDK 编排。', must: true },
            { name: '云网络', desc: '负载均衡、专线、CDN。' },
            { name: '成本治理', desc: '资源账单、优化。' },
          ]),
          grp('senior', [
            { name: '云架构', desc: '多账号、多区域、混合云。', must: true },
            { name: '安全合规', desc: '权限、审计、合规基线。' },
          ]),
        ],
      },
      {
        id: 'op-devops',
        name: '运维开发 / DevOps 平台',
        icon: 'git',
        summary: '建设 CI/CD、流水线与企业研发效能平台。',
        levels: [
          grp('junior', [
            { name: 'CI 基础', desc: 'GitLab CI / Jenkins 流水线。', must: true },
            { name: '脚本能力', desc: 'Python/Go 写工具。' },
          ]),
          grp('mid', [
            { name: '流水线设计', desc: '构建/测试/发布门禁。', must: true },
            { name: '制品与镜像', desc: 'Harbor、制品库、签名。' },
            { name: '环境管理', desc: '多环境一致、配置分离。' },
          ]),
          grp('senior', [
            { name: '研发效能平台', desc: '一站式 DevOps 平台。', must: true },
            { name: '度量与改进', desc: 'DORA 指标、持续交付。' },
          ]),
        ],
      },
      {
        id: 'op-sec',
        name: '安全运维工程师',
        icon: 'shield',
        summary: '防护、检测与响应，保障系统与数据安全。',
        levels: [
          grp('junior', [
            { name: '安全基础', desc: '常见漏洞、加固基线。', must: true },
            { name: '日志审计', desc: '收集与初筛。' },
          ]),
          grp('mid', [
            { name: '防护体系', desc: 'WAF、防火墙、主机安全。', must: true },
            { name: '漏洞管理', desc: '扫描、修复、跟踪。' },
            { name: '入侵检测', desc: 'IDS/IPS、异常分析。' },
          ]),
          grp('senior', [
            { name: '安全架构', desc: '零信任、纵深防御。', must: true },
            { name: '应急响应', desc: '事件处置、溯源、复盘。' },
          ]),
        ],
      },
    ],
  },

  // ===================== AI 工程 =====================
  {
    id: 'ai',
    name: 'AI 工程',
    color: '#8b5cf6',
    subTracks: [
      {
        id: 'ai-app',
        name: 'AI 应用工程师（LLM / RAG / Agent）',
        icon: 'robot',
        summary: '把大模型能力落地为可产品化的应用。',
        levels: [
          grp('junior', [
            { name: 'Prompt 工程', desc: '清晰指令、Few-shot、角色设定。', must: true },
            { name: '模型 API 调用', desc: 'OpenAI/DeepSeek 接口、流式输出。' },
            { name: '基础 RAG', desc: '向量库检索 + 拼上下文问答。' },
            { name: '应用开发', desc: '用前端/后端包一层对话界面。' },
          ]),
          grp('mid', [
            { name: 'RAG 进阶', desc: '切分/重排/混合检索/引用溯源。', must: true },
            { name: 'Agent 设计', desc: '工具调用、规划、记忆。' },
            { name: '评估体系', desc: '效果评测、badcase 回流。' },
            { name: '工程化', desc: '可观测、缓存、降级、限流。', must: true },
          ]),
          grp('senior', [
            { name: 'AI 系统架构', desc: '多 Agent 编排、网关、私有化部署。', must: true },
            { name: '效果与成本', desc: '模型选型、蒸馏、量化、降本。' },
            { name: '方法论沉淀', desc: '评测基准、工程规范、团队赋能。' },
          ]),
        ],
      },
      {
        id: 'ai-algo',
        name: '算法工程师（CV / NLP / 推荐）',
        icon: 'brain',
        summary: '研究与落地机器学习模型。',
        levels: [
          grp('junior', [
            { name: '数学与 ML 基础', desc: '线性代数、概率、经典模型。', must: true },
            { name: '深度学习框架', desc: 'PyTorch/TF 训练推理。' },
            { name: '数据处理', desc: '清洗、增强、特征工程。' },
          ]),
          grp('mid', [
            { name: '模型训练调优', desc: '调参、过拟合、指标。', must: true },
            { name: '领域模型', desc: 'CV/NLP/推荐 至少一个深入。' },
            { name: '上线部署', desc: '模型导出、服务化、推理加速。' },
          ]),
          grp('senior', [
            { name: '算法架构', desc: '端到端方案、模型迭代体系。', must: true },
            { name: '前沿落地', desc: '预训练/微调/多模态。' },
            { name: '业务驱动', desc: '指标对齐、价值证明。' },
          ]),
        ],
      },
      {
        id: 'ai-mlops',
        name: 'MLOps / 机器学习平台',
        icon: 'pipeline',
        summary: '让模型可训练、可部署、可监控地规模化运行。',
        levels: [
          grp('junior', [
            { name: 'Pipeline 基础', desc: '训练脚本工程化。', must: true },
            { name: '容器与编排', desc: 'Docker / K8s 基础。' },
          ]),
          grp('mid', [
            { name: '训练平台', desc: '任务调度、分布式训练。', must: true },
            { name: '模型仓库', desc: '版本、注册、回滚。' },
            { name: '推理服务', desc: ' serving、扩缩容、监控。' },
          ]),
          grp('senior', [
            { name: 'MLOps 体系', desc: '端到端自动化、特征平台。', must: true },
            { name: '成本与治理', desc: '算力调度、合规。' },
          ]),
        ],
      },
      {
        id: 'ai-data',
        name: '数据工程师（AI 方向）',
        icon: 'database',
        summary: '为模型准备高质量、规模化的训练与特征数据。',
        levels: [
          grp('junior', [
            { name: '数据采集清洗', desc: '爬虫/接口、去重、标注。', must: true },
            { name: 'SQL/Python', desc: '数据处理基础。' },
          ]),
          grp('mid', [
            { name: '特征工程', desc: '特征仓库、离线在线一致。', must: true },
            { name: '数据管线', desc: '大规模 ETL、质量监控。' },
          ]),
          grp('senior', [
            { name: '数据体系', desc: '数据湖仓、标注平台。', must: true },
            { name: '数据治理', desc: '合规、隐私、溯源。' },
          ]),
        ],
      },
    ],
  },
]

// 等级配色（与品牌主色协调，且深浅对比清晰）
export const levelColor: Record<LevelKey, string> = {
  junior: '#22c55e',
  mid: '#3b82f6',
  senior: '#a855f7',
}

export const levelLabel: Record<LevelKey, string> = {
  junior: '初级',
  mid: '中级',
  senior: '高级',
}

// 统计：每个方向 / 赛道 / 等级的技能数量，供页面汇总展示
export function countSkills(d: Direction): number {
  return d.subTracks.reduce((n, s) => n + s.levels.reduce((m, l) => m + l.skills.length, 0), 0)
}

// ===================== 视图构建（纯函数，可测试、无 Vue 依赖） =====================

export function matches(s: SkillNode, k: string): boolean {
  if (!k) return true
  const q = k.toLowerCase()
  return s.name.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q)
}

export interface BoardSubTrack extends SubTrack {
  levels: Array<LevelGroup & { skills: SkillNode[] }>
}
export interface BoardGroup {
  direction: Direction
  subTracks: BoardSubTrack[]
}

// ECharts 树节点（带 _meta 供点击查看详情 / _type 控制符号大小）
interface TreeNode {
  name: string
  _type: 'root' | 'subtrack' | 'level' | 'skill'
  _meta: any
  itemStyle: { color: string }
  children?: TreeNode[]
}

function buildSkillNode(s: SkillNode, lv: LevelGroup, st: SubTrack, d: Direction): TreeNode {
  return {
    name: s.name,
    _type: 'skill',
    _meta: { kind: 'skill', name: s.name, desc: s.desc, must: s.must, level: lv.level, levelTitle: levelLabel[lv.level], subtrack: st.name, direction: d.name },
    itemStyle: { color: levelColor[lv.level] }
  }
}
function buildLevelNode(lv: LevelGroup, st: SubTrack, d: Direction, kw: string): TreeNode | null {
  const skills = lv.skills.filter(s => matches(s, kw))
  if (!skills.length) return null
  return {
    name: lv.title,
    _type: 'level',
    _meta: { kind: 'level', level: lv.level, title: lv.title, stance: lv.stance, count: skills.length, subtrack: st.name, direction: d.name, skills: skills.map(s => s.name) },
    itemStyle: { color: levelColor[lv.level] },
    children: skills.map(s => buildSkillNode(s, lv, st, d))
  }
}
function buildSubNode(st: SubTrack, d: Direction, kw: string): TreeNode | null {
  const levels = st.levels.map(lv => buildLevelNode(lv, st, d, kw)).filter(Boolean) as TreeNode[]
  if (!levels.length) return null
  const total = levels.reduce((n, l) => n + l._meta.count, 0)
  const counts: Record<LevelKey, number> = {
    junior: st.levels.find(l => l.level === 'junior')?.skills.filter(s => matches(s, kw)).length || 0,
    mid: st.levels.find(l => l.level === 'mid')?.skills.filter(s => matches(s, kw)).length || 0,
    senior: st.levels.find(l => l.level === 'senior')?.skills.filter(s => matches(s, kw)).length || 0
  }
  return {
    name: st.name,
    _type: 'subtrack',
    _meta: { kind: 'subtrack', name: st.name, summary: st.summary, total, direction: d.name, counts },
    itemStyle: { color: d.color },
    children: levels
  }
}
function buildDirectionNode(d: Direction, kw: string): TreeNode | null {
  const subs = d.subTracks.map(st => buildSubNode(st, d, kw)).filter(Boolean) as TreeNode[]
  if (!subs.length) return null
  const total = subs.reduce((n, s) => n + s._meta.total, 0)
  return {
    name: d.name,
    _type: 'root',
    _meta: { kind: 'direction', name: d.name, color: d.color, total, subCount: subs.length },
    itemStyle: { color: d.color },
    children: subs
  }
}

// 树形图数据：activeDir='all' 时根节点为「技能路线图」，下挂四个方向
export function buildTreeData(activeDir = 'all', kw = ''): TreeNode[] {
  if (activeDir === 'all') {
    const children = roadmap.map(d => buildDirectionNode(d, kw)).filter(Boolean) as TreeNode[]
    if (!children.length) return []
    return [{ name: '技能路线图', _type: 'root', _meta: { kind: 'root', name: '技能路线图' }, itemStyle: { color: '#ff5e7e' }, children }]
  }
  const node = buildDirectionNode(roadmap.find(d => d.id === activeDir)!, kw)
  return node ? [node] : []
}

// 路线图（卡片）数据
export function buildBoardView(activeDir = 'all', kw = ''): BoardGroup[] {
  const list = activeDir === 'all' ? roadmap : roadmap.filter(d => d.id === activeDir)
  return list.map(d => {
    const subTracks = d.subTracks.map(st => {
      const levels = st.levels
        .map(lv => ({ ...lv, skills: lv.skills.filter(s => matches(s, kw)) }))
        .filter(l => l.skills.length)
      return levels.length ? { ...st, levels } : null
    }).filter(Boolean) as BoardSubTrack[]
    return { direction: d, subTracks }
  }).filter(v => v.subTracks.length)
}

// 全局统计（供汇总卡片）
export function globalStats() {
  let skills = 0, subs = 0, must = 0
  for (const d of roadmap) {
    subs += d.subTracks.length
    for (const st of d.subTracks) {
      for (const lv of st.levels) {
        skills += lv.skills.length
        must += lv.skills.filter(s => s.must).length
      }
    }
  }
  return { directions: roadmap.length, subTracks: subs, skills, must }
}

