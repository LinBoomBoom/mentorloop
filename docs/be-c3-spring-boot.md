# 第8章 · Spring 生态与 Boot 原理

> 目标：掌握 Spring IoC/DI 容器、Bean 作用域与生命周期、AOP 代理机制、声明式事务、Boot 自动装配与启动流程、MVC 请求链路、常用注解与事件机制，以及循环依赖与三级缓存原理——建立后端主力框架的完整心智。

> 来源：Spring Framework 7.x 官方 Reference(IoC/Beans、AOP、Transaction)、Spring Boot 官方文档(Auto-configuration)、Spring MVC 文档；Spring Cloud 项目页。

---


## 1. Spring IoC 与 DI 容器

> 引导：先建立控制反转与依赖注入的底层心智，理解 ApplicationContext 是管理 bean 的工厂，这是后续所有 Spring 模块的地基。

## 心智模型
把 Spring 想成一家「对象工厂 + 装配流水线」。你自己 new 对象时,对象之间的依赖关系由你手写代码硬编码;用了 Spring,你只声明"我需要什么"(构造函数参数、字段),工厂在启动时就把它造好、连好、交给你。这种"把控制权从对象自身反转给容器"的做法,就叫 Inversion of Control(控制反转,IoC)。而"工厂按声明把依赖塞进来"这一步,叫 Dependency Injection(依赖注入,DI)——DI 是 IoC 的一种具体实现。

一句话锚定:**IoC 是思想,DI 是手段,Spring 容器(ApplicationContext)是干活的那个工厂。**

## 核心知识点（锚定官方）
Spring 官方文档对 IoC/DI 的定义非常精确(https://docs.spring.io/spring-framework/reference/core/beans/introduction.html):
- `org.springframework.context.ApplicationContext` 是 Spring IoC 容器的代表;它是 `BeanFactory` 的子接口,在其基础上增加了 AOP 集成、国际化消息、事件发布、Web 环境等能力。`BeanFactory` 提供基础配置框架,`ApplicationContext` 是其完整超集,日常基本都用后者。
- DI 是 IoC 的一种专门形式:对象只通过「构造器参数、工厂方法参数,或构造后/工厂返回后设置的属性」来声明它依赖的其他对象,**容器在创建该 bean 时注入这些依赖**。
- 这一过程的"反转"体现在:bean 不再自己用 `new` 或 Service Locator 去定位/实例化依赖,而是由容器反过来把依赖送进来。
- 由容器实例化、装配、管理的对象称为 **bean**;bean 及其相互依赖关系,都体现在容器所使用的配置元数据里。

## 为什么重要
- 解耦:类只依赖接口/抽象,具体实现由容器注入,便于替换与单测(mock)。
- 统一管理:对象的生命周期、作用域、初始化/销毁由容器统一掌控。
- 横切关注点:事务、日志、安全等能力通过容器(AOP)无侵入织入,不用污染业务代码。
- 这是理解 Spring Boot、Spring MVC、Spring 事务、自动装配的底层地基——后面所有模块都建立在"IoC 容器管理 bean"之上。

## 常见坑
- **以为 `@Component` 一定会生效**:类必须在被组件扫描的包路径下,且没被 `@ComponentScan` 的 `excludeFilters` 排除;配置类上的 `@ComponentScan` 默认只扫其所在包及子包。
- **把 ApplicationContext 当 Service Locator 用**:在 bean 里 `ctx.getBean(X.class)` 取依赖,等于退回了 IoC 之前的手工定位,违背 DI 初衷,也让测试更麻烦。
- **混淆 BeanFactory 与 ApplicationContext**:在极轻量场景才用 `BeanFactory`;绝大多数应用(尤其 Web)都用 `ApplicationContext`。
- **过早优化 XML/注解之争**:现代项目直接用 `@Component`/`@Bean` 注解配置即可,不要为了"显得专业"强行回到 XML。

## 动手自测
1. 写两个类 `ServiceA`、`ServiceB`,让 `ServiceA` 通过**构造器注入**依赖 `ServiceB`,启动 Spring 后从容器取 `ServiceA` 并调用,确认 `ServiceB` 已被注入。
2. 把注入方式从构造器改成 **字段 + `@Autowired`**,观察效果差异(字段注入无 final、难测)。
3. 故意把 `ServiceB` 移出组件扫描包,启动观察报错信息(No qualifying bean),理解"容器找不到依赖"的提示长什么样。

## 面试视角
- "什么是 IoC/DI?"——用"工厂+反转控制"讲清:IoC 是思想,DI 是实现,容器负责实例化与装配。
- "ApplicationContext 和 BeanFactory 区别?"——前者是后者的超集,多了 AOP、事件、国际化、Web 上下文。
- "构造器注入 vs 字段注入,你选哪个?"——优先构造器注入:不可变(final)、必填依赖明确、易测、能暴露循环依赖。
- 高频追问:为什么推荐构造器注入?(强制依赖、避免 `NullPointerException`、利于单元测试、Spring 官方也推荐。)

---

## 2. Bean 作用域与生命周期

> 引导：搞清单例与多例的差别，以及对象从实例化到销毁的关键钩子，避免有状态对象被单例共享污染。

## 心智模型
bean 的"作用域"决定它在容器里是「全国唯一(单例)」还是「每次都要新建(原型)」;而"生命周期"是它的「出生 → 配置 → 使用 → 销毁」全过程。理解这两点,你才知道对象什么时候被创建、什么时候该释放资源、为什么有时改了配置不生效。

## 核心知识点（锚定官方）
- **作用域(Scope)**:Spring 默认所有 bean 是 **singleton**(整个容器共享一个实例)。`prototype` 表示每次请求(注入或 `getBean`)都新建一个。`web` 场景下还有 `request`/`session`/`application`/`websocket`(由 Spring MVC 提供)。
- **生命周期回调**:实现 `InitializingBean`/`DisposableBean`,或用 `@PostConstruct`/`@PreDestroy` 注解,或 XML 的 `init-method`/`destroy-method`,可指定初始化后、销毁前要做的事。
- **完整流程(简化)**:实例化(构造)→ 填充属性(依赖注入)→ 若实现 `Aware` 接口则回调(`BeanNameAware` 等)→ `BeanPostProcessor` 前置 → `@PostConstruct`/初始化 → `BeanPostProcessor` 后置 → 就绪可用 → 容器关闭时 `@PreDestroy`/销毁。
- `BeanPostProcessor` 是"在 bean 初始化前后做加工"的扩展点,Spring 自身大量用它(AOP、@Autowired 解析都经由此)。

## 为什么重要
- 单例省资源但**有状态要小心**:单例 bean 若持有可变成员变量,多线程下会共享污染;无状态或只读最安全。
- 资源类(连接池、线程池、文件句柄)必须在销毁时释放,否则泄漏。
- 生命周期钩子是框架集成的入口(比如启动后预热缓存、关闭时优雅下线)。

## 常见坑
- **单例里存用户状态**:把请求级数据放进单例 bean 的字段,导致串号。请求级数据应放 `request` 作用域或方法参数。
- **prototype 的销毁不被容器管**:容器只负责创建 prototype,**不负责销毁**(除非你手动调),`@PreDestroy` 对 prototype 不一定会被调用。
- **@PostConstruct 与 afterPropertiesSet 顺序**:`@PostConstruct` 在 `InitializingBean.afterPropertiesSet` 之前执行;混用时别假设顺序反了。
- **在构造器里调用被 @Autowired 注入的字段**:构造阶段字段还没注入,会得到 null。

## 动手自测
1. 定义一个单例 bean,在 `@PostConstruct` 打印"初始化",在 `@PreDestroy` 打印"销毁",启动后正常退出,观察输出顺序。
2. 把作用域改成 `prototype`,连续 `getBean` 两次,确认是两个不同实例。
3. 在单例 bean 里放一个 `static AtomicInteger` 计数器,起两个线程各调 1000 次方法自增,观察是否出现竞争(引出线程安全讨论)。

## 面试视角
- "Spring bean 默认作用域?"——singleton;prototype 每次新建;web 还有 request/session。
- "singleton bean 是线程安全的吗?"——bean 实例本身线程安全与否取决于你写的代码;单例只代表"一个实例",有可变状态时多线程共享就会出问题。
- "说说 bean 生命周期"——实例化→注入→Aware→BeanPostProcessor 前后→初始化→可用→销毁,能点到 `BeanPostProcessor` 加分。
- 高频:单例 bean 里能放 `List` 缓存吗?(若只读/线程安全集合可;可变状态需同步或用 `ConcurrentHashMap` 等。)

---

## 3. Spring AOP 与代理机制

> 引导：理解横切关注点如何用代理织入，重点记住同类自调用不触发切面的坑。

## 心智模型
AOP(面向切面编程)解决的是"横切关注点"——像日志、事务、权限这类**横跨很多类、很多方法**的功能。如果把这些代码塞进每个业务方法,会又臭又重复。AOP 把它抽出来做成一个"切面",在方法执行的前/后/周围自动织入。Spring AOP 的本质:**用代理包住你的 bean,代理在调用真正方法前后插入切面逻辑。**

## 核心知识点（锚定官方）
Spring 官方对 AOP 的定位(https://docs.spring.io/spring-framework/reference/core/aop.html):
- AOP 是对 OOP 的补充:OOP 的模块化单位是类,AOP 的模块化单位是**切面(aspect)**;切面把"横切多个类型和对象的关注点(如事务管理)"模块化。
- Spring AOP 是**基于代理**的:对接口用 JDK 动态代理,对类用 CGLIB 子类代理。它是运行时通过代理织入,且**只对 Spring 容器管理的 bean 生效**。
- 一个切面由 **切点(pointcut,在哪儿)** + **通知(advice,做什么/何时)** 组成。通知类型:`@Before`(前)、`@After`(后,无论成败)、`@AfterReturning`(正常返回后)、`@AfterThrowing`(抛异常后)、`@Around`(环绕,最灵活,可控制是否执行目标方法)。
- Spring 自身大量用 AOP 提供声明式服务,最重要的是**声明式事务管理**。

## 为什么重要
- 把日志、鉴权、重试、监控等从业务代码剥离,业务方法更纯净、更易维护。
- 声明式事务(@Transactional)就是 AOP 的典型应用——你写 `@Transactional`,框架在方法前后自动开启/提交/回滚事务。
- 理解代理机制,才能解释"为什么某处切面没生效"。

## 常见坑
- **同类方法自调用不触发切面**:`this.innerMethod()` 调用绕过了代理,`@Transactional`/`@Async` 等基于代理的注解都**不会生效**。必须经由容器注入的代理对象调用,或用 `AopContext.currentProxy()`。
- **private 方法无法被代理增强**:CGLIB 通过子类化代理,private/final 方法不能被重写增强。
- **切点表达式太宽**:`execution(* com.x..*(..))` 误伤无关方法,造成性能与逻辑问题。
- **@Around 忘了调 `proceed()`**:会直接导致目标方法不执行。
- **同一个切点多个切面顺序不清**:用 `@Order` 控制,否则执行顺序不确定。

## 动手自测
1. 写一个 `@Aspect`,对 `service` 包下所有方法用 `@Around` 打印入参、耗时、出参。
2. 故意在 service 内部 `this` 调另一个被切面增强的方法,观察切面"丢失",理解代理边界。
3. 给两个切面加 `@Order(1)`/`@Order(2)`,验证执行先后。

## 面试视角
- "Spring AOP 底层?"——基于代理,JDK 动态代理(JDK)或 CGLIB(类)。
- "JDK 动态代理和 CGLIB 区别?"——前者要求目标实现接口、生成接口代理;后者通过继承子类化、不能代理 final 类/方法。Spring Boot 2.x 起默认对类也用 CGLIB(`proxyTargetClass` 语义调整)。
- "为什么 @Transactional 在同类自调用不生效?"——自调用走 this 不经过代理,切面的开启/提交逻辑被跳过。
- 高频:@Around 和 @Before/@After 的区别?(Around 能完全控制目标方法是否执行、可改参数与返回值,最强但最易出错。)

---

## 4. Spring 声明式事务

> 引导：掌握 @Transactional 的传播、隔离与回滚规则，尤其是默认只对未检查异常回滚这一反直觉点。

## 心智模型
事务就是"一组操作要么全成、要么全不成"。Spring 的事务管理给你一个**统一抽象**:不管底层是 JDBC、JPA 还是 JTA,你都用同一套 `@Transactional` 注解和 `PlatformTransactionManager` 接口,不用关心各家 API 差异。它把"开启连接、设置自动提交、提交/回滚、还原"这些样板代码全包了,你只管声明"这个方法要事务"。

## 核心知识点（锚定官方）
Spring 事务文档(https://docs.spring.io/spring-framework/reference/data-access/transaction.html)的核心事实:
- Spring 提供**一致的事务抽象**,跨 JDBC、JPA、Hibernate、JTA 等;支持**声明式事务管理**(`@Transactional`)和编程式事务(`TransactionTemplate`)。
- 声明式事务通过 AOP 实现:方法前后由拦截器开启/提交/回滚事务。
- **传播行为(propagation)** 决定"已有事务时怎么办":`REQUIRED`(默认,加入现有事务,没有就新建)、`REQUIRES_NEW`(挂起现有、新建独立事务)、`NESTED`、`SUPPORTS`、`NOT_SUPPORTED`、`MANDATORY`、`NEVER` 等。
- **隔离级别**映射到数据库隔离级别(READ_UNCOMMITTED→SERIALIZABLE)。
- **回滚规则**:默认只对**未检查异常(RuntimeException/Error)回滚**,受检异常(checked)默认**不回滚**——这点常被踩。

## 为什么重要
- 一致抽象让你换 ORM/数据源时事务代码不必重写。
- 声明式事务把样板降到一行注解,业务可读性强。
- 传播行为与隔离级别是处理"嵌套调用""并发脏读"的关键旋钮。

## 常见坑
- **受检异常不回滚**:抛 `Exception`(checked)默认提交;需要 `rollbackFor = Exception.class`。
- **同类自调用事务失效**:同 SECTION_3,`this.method()` 绕过代理,`@Transactional` 不生效。
- **REQUIRES_NEW 的坑**:它会挂起外层事务,内层提交外层仍可能回滚,导致"部分提交",数据不一致需谨慎。
- **只读事务不是万能优化**:`@Transactional(readOnly=true)` 对 MySQL 的 InnoDB 主要是给优化器提示,并非绝对不写。
- **事务方法内做远程调用/长耗时 IO**:事务持有 DB 连接时间长,易拖垮连接池。

## 动手自测
1. 两个 `@Transactional` 方法 A 调 B,默认 `REQUIRED`,在 B 抛 `RuntimeException`,观察 A、B 是否都回滚(整体原子)。
2. 把 B 改成 `REQUIRES_NEW`,在 B 提交后 A 抛异常,观察 B 已落库而 A 回滚。
3. 方法抛受检 `IOException`,不加 `rollbackFor`,观察事务**提交**(反直觉,务必记住)。

## 面试视角
- "@Transactional 默认回滚哪些异常?"——仅 RuntimeException/Error,checked 不回滚,可用 `rollbackFor` 改。
- "REQUIRED 和 REQUIRES_NEW 区别?"——前者加入或新建,后者挂起外层新建独立事务。
- "为什么事务不生效?"——自调用、方法非 public、异常类型不匹配、数据源没配事务管理器,都是高频原因。
- 高频:长事务有什么危害?(连接占用、锁持有久、并发下降、可能触发超时。)

---

## 5. Spring Boot 自动装配原理

> 引导：理解约定优于配置落地机制：条件注解加候选清单文件，用户 bean 优先而自动配置退让。

## 心智模型
Spring Boot 的"自动装配"就像你搬进一套精装房:你只需要在 `pom.xml` 里加一个依赖 jar(相当于"我买了空调"),Boot 看到 classpath 下有这个 jar,就自动把对应的配置(空调的安装、接线)都帮你做好,开箱即用。如果你自己想换品牌(自定义 bean),它就**自动退让(backs off)**,用你的配置。这一切靠 `@Conditional` 系列注解 + 一份"候选清单文件"驱动。

## 核心知识点（锚定官方）
Spring Boot 自动配置文档(https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.developing-auto-configuration)的关键事实:
- 自动配置类用 `@AutoConfiguration`(本质含 `@Configuration`)标注,并配合 `@Conditional` 约束生效时机;**常用 `@ConditionalOnClass`(类在 classpath 才生效)和 `@ConditionalOnMissingBean`(你没有自定义 bean 才生效)**。
- `@ConditionalOnMissingBean` 让你能覆盖默认:当你声明了自己的 `@Configuration`,自动配置就 backs off。
- 注册机制:Spring Boot 在 jar 内查找 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 文件,逐行列出自动配置类名;**自动配置只能靠这个 imports 文件被发现,绝不能被组件扫描扫到**。
- (历史版本用 `META-INF/spring.factories` 的 `EnableAutoConfiguration` 键,新版已迁移到上述 imports 文件——面试答新机制更准。)

## 为什么重要
- 这是"约定优于配置"的落地:几乎零配置就能跑起 Web、数据源、安全等。
- 理解自动装配,你才知道"为什么加个 starter 就有 RT 了""为什么我的配置没生效"。
- `@ConditionalOnMissingBean` 是扩展与排错的钥匙:自定义优先于默认。

## 常见坑
- **自定义 bean 仍被自动配置覆盖**:通常是你的 `@Configuration` 没被扫描到,或包路径不在 `@SpringBootApplication` 扫描范围内,导致 `@ConditionalOnMissingBean` 判断"用户没配"而生效默认。
- **starter 冲突**:两个 starter 都提供了某 bean 且都满足条件,可能 `NoUniqueBeanDefinitionException`,需用 `@Primary` 或 `@Qualifier`。
- **误用 spring.factories 旧路径**:新版 Boot 自动配置走 imports 文件,照搬老教程会失效。
- **@ConditionalOnProperty 的 matchIfMissing**:忘记设值时该条件默认行为,导致配置"莫名不生效"。

## 动手自测
1. 引入 `spring-boot-starter-data-redis`,启动后从容器取 `RedisTemplate`,确认无需手写配置即得(自动装配生效)。
2. 自己定义一个 `RedisTemplate` bean,再启动,确认你的实例覆盖了默认(体现 `@ConditionalOnMissingBean` 退让)。
3. 用 `spring.autoconfigure.exclude` 或 `@SpringBootApplication(exclude=...)` 关掉某个自动配置,观察行为变化。

## 面试视角
- "Spring Boot 自动装配原理?"——类路径扫描 + `@Conditional` 条件 + `AutoConfiguration.imports` 候选清单,按需装配,用户 bean 优先(backs off)。
- "@ConditionalOnClass 和 @ConditionalOnMissingBean 各管什么?"——前者管"依赖是否存在",后者管"用户是否已自定义"。
- "自动配置类怎么被发现的?"——`META-INF/spring/...AutoConfiguration.imports`,非组件扫描。
- 高频:为什么你的 @Bean 能覆盖 starter 的默认?(因为你定义了,`@ConditionalOnMissingBean` 使自动配置退让。)

---

## 6. Spring Boot 启动流程与 starter

> 引导：把 run 方法想成开机自检到进桌面的过程，理解 refresh 与内嵌服务器，以及 starter 如何消除依赖地狱。

## 心智模型
`SpringApplication.run()` 像按下电脑开机键:它先"自检"(读环境、找配置)、再"加载系统"(创建容器、扫 bean、跑自动装配)、最后"进入桌面"(启动内嵌 Tomcat、开始接请求)。理解启动流程,你才能在"项目起不来"时知道卡在哪一步。而 **starter** 就是"功能套餐"——一个依赖引入一整套开箱即用的自动配置。

## 核心知识点（锚定官方）
- `SpringApplication.run()` 主要阶段:准备 `Environment`(读取 profile、命令行、配置文件等)→ 创建 `ApplicationContext` → **调用 `refresh()`** 完成容器初始化(这一步做 bean 定义加载、BeanFactory 后置处理、注册 BeanPostProcessor、初始化单例 bean、触发 `ContextRefreshedEvent`)→ 执行 `ApplicationRunner`/`CommandLineRunner` → 调用 `refresh` 后的 web 服务器启动(内嵌 Tomcat 等)。
- **starter** 是依赖描述符:`spring-boot-starter-web` 这类命名约定(`spring-boot-starter-*` 是官方,`*-spring-boot-starter` 是第三方),它把一组相关依赖和自动配置打包,引入即获得对应能力。
- `spring-boot-starter-parent` 提供依赖管理与插件约定(版本兜底),不是必须的,但能省心。

## 为什么重要
- 启动流程是排查"起不来/起得慢"的地图:是配置没读到(Environment 阶段)、还是 bean 冲突(refresh 阶段)、还是端口被占(Tomcat 启动)。
- starter 机制让你不用手动拼十几个依赖与版本,降低"依赖地狱"。

## 常见坑
- **refresh 阶段循环依赖报错**:`BeanCurrentlyInCreationException`,Spring 默认不支持构造器循环依赖(单例字段循环可经三级缓存解决,见 SECTION_10)。
- **main 类位置不对**:`@SpringBootApplication` 所在类的包应是最上层,否则子包 bean 扫不到。
- **profile 没激活导致配置没加载**:`spring.profiles.active` 没设,读不到 `application-prod.yml`。
- **starter 版本与 Boot 版本不兼容**:乱升 starter 可能破坏自动配置契约,尽量用 Boot 管理的 BOM。

## 动手自测
1. 在 `ApplicationRunner` 里打印一句,启动观察它在 Tomcat 起来之后执行。
2. 故意把 `server.port` 设成一个被占用的端口,启动观察报错出现在哪一步(Tomcat 绑定失败)。
3. 用 `spring-boot-starter-web` 跑一个最小接口,确认未写任何 Tomcat 配置却能启动并响应(体会 starter + 自动装配)。

## 面试视角
- "Spring Boot 启动过程?"——`run()` 准备 Environment → 创建/刷新 ApplicationContext(refresh 是核心,做 bean 加载与单例初始化)→ 启动内嵌 web 服务器 → 执行 Runner。
- "starter 是什么?"——把一组相关依赖 + 自动配置打包的约定命名依赖,引入即获能力。
- "refresh() 干了什么?"——容器初始化的核心:加载 bean 定义、处理后置处理器、初始化单例、发布刷新事件。
- 高频:为什么加 web starter 不用配 Tomcat?(自动装配检测到 web 依赖,创建并启动内嵌服务器。)

---

## 7. Spring MVC 请求处理流程

> 引导：抓住 DispatcherServlet 这个前端控制器，理清 HandlerMapping 到 ViewResolver 的组件链。

## 心智模型
Spring MVC 是"请求驱动的中央控制器"模式:所有 HTTP 请求先打到同一个门卫 **DispatcherServlet**,由它派活——找哪个控制器处理(HandlerMapping)、用适配器调用(HandlerAdapter)、出错了交给异常解析器、最后用视图解析器渲染响应。你写的 `@Controller` 方法只是"被派去干活的工人",真正调度不归你管。

## 核心知识点（锚定官方）
Spring MVC 文档(https://docs.spring.io/spring-framework/reference/web/webmvc.html)定位:
- 它是**构建在 Servlet API 之上的请求驱动、前端控制器(front-controller) Web 框架**,正式名来自模块 `spring-webmvc`,俗称 Spring MVC。
- 核心就是 **DispatcherServlet**:它把请求依次委托给 `HandlerMapping`(找 handler)、`HandlerAdapter`(执行 handler)、`HandlerExceptionResolver`(异常处理)、`ViewResolver`(视图解析)等组件。
- 你用 `@Controller`/`@RestController` + `@RequestMapping`/`@GetMapping` 等把请求映射到方法;请求生命周期:`HandlerMapping` 定位 handler → `HandlerAdapter` 调用 → 异常由 `HandlerExceptionResolver` 处理 → `ViewResolver` 渲染(REST 多直接 `@ResponseBody` 或 `@RestController` 写回 JSON,不走视图)。

## 为什么重要
- 理解这套组件链,你才能解释"参数怎么绑定的""异常为什么统一处理了""拦截器在哪插"。
- 它是所有 Spring Web 项目(含 Spring Boot Web)的运行时骨架。

## 常见坑
- **@ResponseBody/@RestController 漏了**:返回对象被当成视图名去找 JSP/模板,报 404/视图找不到。
- **日期/枚举参数绑定失败**:前端传的格式与默认转换器不符,需 `@DateTimeFormat` 或自定义 `Converter`/`Formatter`。
- **拦截器(HandlerInterceptor)与过滤器(Filter)混用**:Filter 在 Servlet 容器层、Interceptor 在 Spring MVC 层,执行时机与能拿到的上下文不同。
- **@RequestMapping 路径冲突/重复**:同路径同方法多个 handler 会启动报错或行为不确定。

## 动手自测
1. 写一个 `@RestController`,`@GetMapping("/hello")` 返回字符串,用 curl 调通,理解 `@RestController` = `@Controller`+`@ResponseBody`。
2. 加一个 `HandlerInterceptor` 在 `preHandle` 打印请求 URI,观察它在 controller 之前执行。
3. 故意抛一个运行时异常,加 `@ExceptionHandler`/`@ControllerAdvice` 统一返回错误体,理解异常解析链路。

## 面试视角
- 高频:DispatcherServlet 里几个核心组件?(HandlerMapping、HandlerAdapter、HandlerExceptionResolver、ViewResolver,能补充 LocaleResolver/ThemeResolver 加分。)
- Spring MVC 和 WebFlux 区别?(前者基于 Servlet 同步阻塞栈,后者响应式非阻塞,适用高并发 IO 场景。)

---

## 8. 常用注解与条件化配置

> 引导：区分 @Component 与 @Bean、@Configuration 全模式与 Lite 模式，以及 @Profile/@Value/@ConfigurationProperties 的配置注入。

## 心智模型
Spring 的注解体系是一套"标签语言":`@Component` 是"我是容器要管的对象"的总标签,`@Service`/`@Repository`/`@Controller` 是它的语义子标签(功能一样,只是名字帮你区分层);`@Bean` 是"这个对象得我用代码亲手造,交给容器保管";`@Configuration` 是"这是一个配置类,里面 @Bean 方法的调用要被容器接管(保证单例)"。把它们想成"声明身份 + 声明制造方式"。

## 核心知识点（锚定官方）
- ** stereotype 注解**:`@Component` 及其特化 `@Service`、`@Repository`、`@Controller`/`@RestController`,被组件扫描识别并注册为 bean;`@Repository` 还额外做持久层异常的翻译(把 JPA/JDBC 异常转成 Spring 统一 `DataAccessException`)。
- **@Bean vs @Component**:`@Bean` 用在 `@Configuration` 方法上,适合"第三方类你控制不了源码、需手动 new 并配置"的场景(如 `RestTemplate`、`DataSource`)。
- **@Configuration 的特殊性**:`@Configuration`(全模式)下的 `@Bean` 方法是"被代理的"——方法间互相调用返回的是同一容器 bean(单例),而 `@Component` 里写 `@Bean` 则是 Lite 模式、互调会新建。优先用 `@Configuration`。
- **条件化与配置**:`@Profile`(按环境激活不同 bean)、`@PropertySource`(引入 properties)、`@Value("${key}")`(注入配置项)、`@ConfigurationProperties`(把一组配置绑定到对象,类型安全、推荐用于复杂配置)。

## 为什么重要
- 注解是日常写 Spring 最高频的"语法",选错会导致扫描不到、重复实例、配置读不到。
- `@ConfigurationProperties` 让配置从"散 `@Value`"变成"结构化对象",更易维护与校验。

## 常见坑
- **@Component 里写 @Bean 是 Lite 模式**:方法互调不会返回单例,新手常误以为等价 `@Configuration`。
- **@Value 取不到值**:key 拼写错、没在 Environment 里(配置文件没加载/没 `@PropertySource`)。
- **@ConfigurationProperties 前缀写错**:绑定静默失败,字段全 null,需开启 `@EnableConfigurationProperties` 或让类被扫描。
- **@Profile 忘了激活**:bean 不注册,报 NoSuchBean。

## 动手自测
1. 用 `@Configuration` + `@Bean` 定义一个 `RestTemplate`,在 service 里注入使用。
2. 把同一 `@Configuration` 里的两个 `@Bean` 互相调用,打印是否为同一实例(确认全模式单例)。
3. 用 `@ConfigurationProperties("app")` 把 `app.name`/`app.timeout` 绑定到一个类,对比 `@Value` 写法优劣。

## 面试视角
- "@Component 和 @Bean 区别?"——前者注解在类上靠扫描,后者注解在方法上手动造(用于第三方/复杂构造)。
- "@Configuration 和 @Component 里写 @Bean 有何不同?"——前者全模式方法调用返回同一 bean,后者 Lite 模式可能新建。
- "为什么推荐 @ConfigurationProperties 而不是一堆 @Value?"——类型安全、结构化、支持校验与元数据提示。

---

## 9. 事件机制与发布订阅

> 引导：把内部事件总线当作解耦主流程与副流程的工具，并理解事务提交后触发事件的用法。

## 心智模型
事件机制是 Spring 内部的"发布-订阅"总线:某个组件干完一件事(比如容器刷新完、用户注册成功),就往总线发一条"事件消息";其他关心这件事的组件订阅后自动收到通知去干活。它把"主流程"和"顺带要做的副流程"解耦——注册成功后要不要发邮件、记日志、加积分,主流程不用知道,只管发事件。

## 核心知识点（锚定官方）
- Spring 提供 `ApplicationEvent`(事件基类)与 `ApplicationEventPublisher`(发布器)、`ApplicationListener`(监听器)三件套;也可直接用 `@EventListener` 注解方法订阅,`@TransactionalEventListener` 还能绑定到事务阶段(如事务提交后触发)。
- 内置事件:`ContextRefreshedEvent`(容器刷新完成)、`ContextStartedEvent`、`ContextStoppedEvent`、`ContextClosedEvent`、`RequestHandledEvent` 等。
- 监听器默认**同步**执行(在发布线程内),可结合 `@Async` 变为异步;异常若未捕获会传播回发布者。
- 这是 Spring 实现"松耦合扩展点"的常用手段,也是很多 starter 内部协调机制。

## 为什么重要
- 解耦主业务与旁路逻辑(审计、通知、缓存预热),避免方法里塞一堆 `if/调用`。
- 与事务结合(`@TransactionalEventListener(phase=AFTER_COMMIT)`)可保证"事务成功提交后才发通知",避免脏读/回滚后仍通知。
- 理解它,才看得懂很多框架(如 Spring Cloud Bus 用事件跨节点传播)的底层。

## 常见坑
- **监听器默认同步**:监听器抛异常会中断发布者流程;耗时逻辑阻塞主线程,必要时 `@Async`。
- **事件监听器顺序**:多个 `@EventListener` 用 `@Order` 控制;否则顺序不确定。
- **事务边界**:普通 `@EventListener` 在发布时事务可能尚未提交,读到的是"未提交"或回滚风险;改用 `@TransactionalEventListener` 指定 `AFTER_COMMIT`。
- **事件类未被扫描**:`@EventListener` 方法所在类需是 Spring bean。

## 动手自测
1. 定义一个 `UserRegisteredEvent`,注册成功后 `publisher.publishEvent(...)` 发布。
2. 写两个 `@EventListener` 分别"发欢迎邮件""记审计日志",确认注册主流程不直接调用它们也能触发。
3. 把其中一个改成 `@TransactionalEventListener(phase=AFTER_COMMIT)`,在事务回滚时观察它不触发。

## 面试视角
- "Spring 事件机制?"——`ApplicationEvent`/`Publisher`/`Listener`(或 `@EventListener`),发布-订阅解耦。
- "监听器是同步还是异步?"——默认同步,可 `@Async` 异步;异常会传回发布者。
- "如何保证事务提交后才发通知?"——`@TransactionalEventListener(phase=AFTER_COMMIT)`。
- 高频:事件和直接方法调用比,好处?(解耦、可插拔多个订阅者、可结合事务与异步。)

---

## 10. 循环依赖与三级缓存

> 引导：用三级缓存理解单例字段循环为何能被救活，以及为何构造器循环依赖直接报错，进而明白为何推荐构造器注入。

## 心智模型
"循环依赖"就是 A 要 B、B 又要 A,互相掐着脖子。Spring 用**三级缓存**这套"半成品寄存处"来解决:先把 A 的"早期引用"(哪怕还没完全造好)登记上,让 B 能先拿到 A 去完成自己,等 B 好了再回过头把 A 补全。注意这只对**单例 + 字段/setter 注入**有效,**构造器循环依赖直接报错**。

## 核心知识点（锚定官方）
- Spring 容器用三级缓存管理单例创建:
  - 一级 `singletonObjects`:完全初始化好的成品 bean。
  - 二级 `earlySingletonObjects`:提前曝光的早期(半成品)bean。
  - 三级 `singletonFactories`:生成早期引用的工厂(用于 AOP 场景提前暴露代理)。
- **解决流程(简化)**:创建 A → 实例化(构造)后把"早期引用工厂"放进三级缓存 → 填充属性发现要 B → 创建 B → B 填充属性要 A → 从三级缓存拿 A 的早期引用(若需 AOP 则在这步生成代理)注入 B → B 完成进入一级缓存 → 回到 A 注入 B → A 完成。
- **构造器注入循环**:A 构造就要 B、B 构造就要 A,连"实例化"这步都过不去(没有早期引用可暴露),Spring 直接抛 `BeanCurrentlyInCreationException`。
- 因此官方更推荐**构造器注入**:它让循环依赖在启动期就暴露报错,而不是藏着等运行期出问题。

## 为什么重要
- 这是 Spring 面试几乎必考的机制题,也是理解"为什么有时能跑有时报错"的关键。
- 它解释了"为什么推荐构造器注入"——能利用编译/启动期把循环依赖逼出来,避免隐藏的半成品引用隐患。

## 常见坑
- **构造器循环依赖直接失败**:不要指望三级缓存救构造器循环,它只救单例字段/setter 循环。
- **@Async/@Transactional 代理 + 循环依赖**:早期引用是原始对象,后续 AOP 代理可能导致"注入的是原始对象而非代理",出现事务/异步不生效;Spring 有 `getEarlyBeanReference` 机制缓解但仍需注意。
- **prototype 作用域不支持循环依赖解决**:每次新建,无缓存可用,直接报错。
- **过度依赖三级缓存"兜底"**:业务上应优先消除循环依赖(拆出公共依赖、用事件/接口解耦),而非依赖框架补丁。

## 动手自测
1. 写 A、B 用字段 `@Autowired` 互相依赖,启动成功,打印 A 里的 B 与 B 里的 A,理解字段循环被三级缓存救活。
2. 改成**构造器**互相注入,启动观察 `BeanCurrentlyInCreationException`,确认构造器循环不被救。
3. (进阶)在循环依赖 bean 上加 `@Async`,观察是否出现"注入的是非代理实例"导致异步失效的警告/异常。

## 面试视角
- "Spring 怎么解决循环依赖?"——三级缓存:成品/早期bean/早期引用工厂;单例字段循环经"提前曝光早期引用"救活。
- "为什么构造器注入循环会报错?"——构造阶段无法暴露早期引用,实例化就卡住。
- "三级缓存每一级是什么?"——singletonObjects / earlySingletonObjects / singletonFactories。
- 高频:三级缓存为什么需要第三级(工厂)?(为在需要时(如 AOP)统一生成早期代理,避免重复创建与不一致的代理引用。)
