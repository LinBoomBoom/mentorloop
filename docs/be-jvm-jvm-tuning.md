# 第二章 · JVM 原理与性能调优

> 目标：理解 JVM 内存模型、类加载、对象布局与垃圾回收，掌握 G1 调优与线上排障工具链。

> 来源：JVMS §2.5 / JLS §12 / HotSpot 对象布局 / Java 17 GC Tuning Guide / JDK 诊断工具文档

---


## 1. JVM 运行时数据区：线程私有 vs 共享

> 引导：先分清哪些区域是每人一份、哪些是公共仓库，这是所有内存/OOM 问题的地基。

## 心智模型
把 JVM 想象成一家工厂：堆（Heap）是公共仓库，所有工人（线程）共享；每个工人有自己的工具腰带（JVM 栈）和一张当前工序单（pc 寄存器）；方法区是墙上挂的“总图纸”（类结构）。理解内存问题，先分清哪些是“公用的”、哪些是“每人一份的”。

## 核心知识点（锚定官方）
- JVM 在运行时划分若干**运行时数据区**（Run-Time Data Areas，JVMS §2.5）。
- **线程私有**：pc 寄存器、JVM 栈（存放栈帧/局部变量/操作数栈）、本地方法栈。
- **线程共享**：堆（Heap，所有类实例与数组的分配地，由 GC 自动回收）、方法区（Method Area，存每个类的结构：运行时常量池、字段/方法数据、方法代码）。
- 规范明确：方法区在逻辑上属于堆的一部分，但实现可独立管理。
来源：Java Virtual Machine Specification SE 17, §2.5 Run-Time Data Areas https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.5

## 为什么重要
OOM 和 StackOverflow 直接对应这些区域：堆满 → `OutOfMemoryError: Java heap space`；栈满 → `StackOverflowError`；方法区（元空间）满 → `OutOfMemoryError: Metaspace`。分不清区域，就调不准 `-Xmx`/`-Xss`/`-XX:MaxMetaspaceSize`。

## 常见坑
- 误以为“栈”和“堆”是唯二区域，忽略方法区/元空间，调优时漏配 Metaspace 导致上线后元空间 OOM。
- 把“线程私有”理解成“线程之间完全隔离”——实际上线程私有的是栈帧，但栈里的对象引用仍指向共享堆。
- 本地方法栈与 JVM 栈是两回事，native 方法调用走前者。

## 动手自测
1. 写个无限递归 `void f(){ f(); }` 观察 `StackOverflowError`（验证 JVM 栈线程私有且深度有限）。
2. 用 `jmap -heap <pid>` 或 `jcmd <pid> VM.native_memory` 实地看各区域占用。

## 面试视角
“堆和栈的区别？”“Metaspace 和永久代（PermGen）的区别？”“为什么方法区逻辑上属于堆却没有被 GC 压缩？”——这类题本质都在考你对运行时数据区的划分是否清晰。

## 2. 类加载机制：双亲委派与初始化时机

> 引导：理解类如何从 .class 变成可用对象，以及为什么核心类不能被替换。

## 心智模型
类加载像“图书入库”：你不能直接翻一本还没登记的书。JVM 用一套“先问长辈、再自己办”的规则（双亲委派）决定谁能把 .class 变成可用的类，既避免同一个类被加载两次，也防止你篡改核心类。

## 核心知识点（锚定官方）
- 类的生命周期：加载（Loading）→ 链接（Linking：验证/准备/解析）→ 初始化（Initialization）→ 使用 → 卸载（JLS §12）。
- **双亲委派模型（Parent Delegation）**：除启动类加载器（Bootstrap）外，每个收到请求都先委派父加载器，父加载不了才自己尝试。保证核心类（如 java.lang.Object）唯一、不被替换。
- 三类加载器：Bootstrap（加载 rt.jar 等核心）、Extension（扩展）、Application（classpath 上的应用类）。
- **初始化时机**：JLS §12.4.1 规定首次“主动使用”（如 new、调用静态方法、读非编译期常量静态字段）才触发；仅引用类名不会初始化。
来源：Java Language Specification SE 17, §12 Execution / §12.4 Initialization https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html

## 为什么重要
- 理解 `ClassNotFoundException` vs `NoClassDefFoundError`（前者加载阶段失败，后者链接/初始化阶段失败）。
- 热部署、插件化、Tomcat 多 WebApp 隔离都依赖**破坏/定制双亲委派**（如线程上下文类加载器）。

## 常见坑
- 以为“访问类的 static final 常量”会触发初始化——若常量在编译期可确定（字面量），它已被内联进调用方，不会触发该类初始化。
- 自定义类加载器忘了委派父加载器，导致加载出“两个同名类”，`instanceof` 互判为 false。

## 动手自测
1. 写个自定义 `ClassLoader` 重写 `loadClass`，打印委派链路，加载一个自定义类观察顺序。
2. 故意让父加载器找不到类，验证“父不行才自己来”。

## 面试视角
“双亲委派是什么、为什么要、怎么破坏？”“Tomcat 如何实现 WebApp 隔离？”“一个类的 `<clinit>` 什么时候执行？”都围绕这套机制。

## 3. 对象创建与内存布局（对象头/对齐/压缩指针）

> 引导：对象头藏着 GC 与锁的全部秘密，是理解 synchronized 与内存占用的关键。

## 心智模型
`new Object()` 不是凭空变出对象：先在堆上“画好格子”（分配内存），贴上“身份铭牌”（对象头，含锁/分代年龄/类型指针），再填字段，最后把钥匙（引用）给你。对象头里藏着 GC 和锁的全部秘密。

## 核心知识点（锚定官方）
- 创建对象流程：类加载检查 → 分配内存（指针碰撞/空闲列表）→ 零值初始化 → 设对象头 → 执行 `<init>`。
- **对象内存布局（HotSpot）**：对象头（Object Header，含 Mark Word + 类型指针 Klass Pointer）+ 实例数据（Instance Data）+ 对齐填充（Padding，按 8 字节对齐）。
- **指针压缩**：64 位 JVM 默认 `-XX:+UseCompressedOops`，把 64 位引用压成 32 位，省内存、提升缓存命中；堆超过约 32GB 时自动失效。
- 对象大小可用 `java.lang.instrument.Instrumentation.getObjectSize` 或 OpenJDK JOL 工具观测。
来源：OpenJDK HotSpot 对象头与压缩指针；JVM Specification §2.7 Representation of Objects https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.7

## 为什么重要
- 对象头里的 Mark Word 同时承载**哈希码、GC 分代年龄、锁状态标志、偏向线程**——这是 synchronized 锁升级（无锁→偏向→轻量→重量）的物理基础。
- 理解布局能解释“为什么空对象也占 16 字节”“为什么字段顺序影响大小”。

## 常见坑
- 以为“对象大小 = 字段大小之和”——漏算对象头（通常 12~16 字节）和对齐填充。
- 盲目把堆开到 40GB 想“省 GC”，结果压缩指针失效，对象引用变大、反而更慢。

## 动手自测
1. 用 OpenJDK JOL（`org.openjdk.jol`）打印一个对象的内存布局，看对象头与对齐。
2. 对比 `-XX:+UseCompressedOops` 开/关时同一对象的大小。

## 面试视角
“一个空 Object 占多少字节？”“synchronized 的锁信息存在哪？”“压缩指针什么情况下失效？”——答案都在对象头与内存布局里。

## 4. 垃圾回收基础：可达性分析与四种引用

> 引导：从 GC Roots 出发的可达性是现代 GC 的统一基础，引用类型决定缓存与泄漏行为。

## 心智模型
GC 像图书馆的“自动清书”系统：它不会逐页翻每本书判断要不要扔，而是从“还书台/借阅登记”（GC Roots）出发，凡能顺着引用链摸到的书都还在用，摸不到的就是无主垃圾，可回收。

## 核心知识点（锚定官方）
- **可达性分析（Reachability）**：从 GC Roots（活动线程栈帧中的引用、静态字段、JNI 引用等）出发，可达的对象存活，不可达的判定为垃圾（JLS §12.6 规定对象何时可被回收）。
- **四种引用**（java.lang.ref）：强（Strong，绝不回收）、软（Soft，内存不足时回收，适合缓存）、弱（Weak，下次 GC 必回收，如 WeakHashMap）、虚（Phantom，仅用于回收跟踪）。
- **分代收集假说**：弱分代假说（多数对象朝生夕死）、强分代假说（老对象少引用新对象）。由此诞生 Young/Old 分代。
来源：Java Language Specification SE 17 §12.6 / java.lang.ref 包文档 https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/package-summary.html

## 为什么重要
- 引用类型决定了缓存、内存泄漏排查、ThreadLocal 泄漏等行为的底层机制。
- 可达性分析是几乎所有现代 GC 判定存活的统一基础，理解它才能看懂各种收集器。

## 常见坑
- 认为 `obj = null` 会“立即回收”——它只是断开引用，回收由 GC 在合适时机触发。
- 用强引用做缓存导致 OOM；改用 `WeakReference`/`SoftReference` 才符合“内存紧张就让位”的语义。
- `finalize()` 不可靠且拖慢 GC，Java 9+ 已标记为 deprecated。

## 动手自测
1. 用 `WeakHashMap` 放键值，触发 GC 后观察条目被自动清除。
2. 制造“静态 Map 持有大对象”的泄漏，用 MAT/jvisualvm 看它为何可达而清不掉。

## 面试视角
“哪些对象可作为 GC Root？”“强/软/弱/虚引用的区别和用途？”“为什么要有分代？”是高频题，答出“从 Root 出发可达性”就立住了。

## 5. 经典 GC 算法与收集器（Serial/Parallel/CMS/G1/ZGC）

> 引导：不同收集器是停顿与吞吐之间的取舍，选型决定接口延迟与成本。

## 心智模型
不同收集器像不同的“环卫方案”：单线程扫楼（Serial）、多车并行扫（Parallel）、边营业边清理（CMS，但会留碎片）、分区承包+定目标（G1）、并发整理不暂停（ZGC）。选哪个取决于你更怕“停顿”还是“吞吐”。

## 核心知识点（锚定官方）
- **标记-清除**：简单但产生内存碎片。
- **标记-整理**：存活对象向一端移动，无碎片但搬运成本高。
- **复制算法**：把存活对象拷到空白半区，无碎片、快，但浪费一半空间，常用于 Young 区。
- **收集器**（HotSpot，Java 17）：Serial（单线程，client）、Parallel/Throughput（多线程，重吞吐）、CMS（并发标记清除，低停顿但已受限/废弃）、**G1**（服务端默认，Region 化、可预测停顿）、**ZGC**（亚毫秒级停顿、并发整理，JDK 15+ 生产可用）、Shenandoah。
来源：Java 17 HotSpot Garbage Collection Tuning Guide https://docs.oracle.com/en/java/javase/17/gctuning/

## 为什么重要
- 收集器决定应用的**停顿时间（STW）**与**吞吐量**之间的取舍，直接关系接口延迟和成本。
- Java 17 起 G1 为默认；理解各收集器适用场景才能合理选型与调参。

## 常见坑
- 默认收集器随 JDK 版本变化（旧版默认 Parallel，新版默认 G1），按老经验配参可能无效。
- 误以为“并发收集器完全不 Stop-The-World”——G1/ZGC 仍有极短 Root 扫描等 STW，只是远短于老收集器。
- 盲目追求 ZGC 的低延迟，却忽略其更高的 CPU/内存开销。

## 动手自测
1. 用 `-XX:+UseG1GC` / `-XX:+UseZGC` 分别跑同一压测，对比 GC 日志里的停顿时长。
2. 故意制造大对象/高分配率，观察不同收集器的表现差异。

## 面试视角
“G1 和 CMS 的区别？”“ZGC 为什么能做到亚毫秒停顿？”“Young 区为什么用复制算法？”——本质都在考你对算法取舍和收集器演进的理解。

## 6. G1 收集器深入：Region/混合回收/Remember Set

> 引导：G1 是 Java 9+ 默认收集器，理解它才能做对服务端 GC 调优。

## 心智模型
G1 把大仓库切成很多小格子（Region），平时谁空着就往谁那搬货；回收时优先挑“垃圾最多”的格子（回收收益最大），并在你设的“停顿预算”内收手——像限时清洁，先扫最脏的房间。

## 核心知识点（锚定官方）
- **Region 化堆**：G1 将堆划分为多个大小相等的 Region（默认约 2048 个，1MB~32MB），不再固定分代，而是逻辑上区分 Eden/Survivor/Old/Humongous（大对象）。
- **Young/Old 混合收集**：年轻代用复制；老年代通过**混合回收（Mixed GC）**按“预测停顿时间”选取收益最高的若干 Old Region 一起回收。
- **Evacuation（疏散）暂停**：把存活对象复制到新 Region，回收旧 Region；这是 G1 的主要 STW 来源，但时长受 `-XX:MaxGCPauseMillis` 目标约束（只是目标，非硬保证）。
- **Remember Set / Card Table**：记录跨 Region 引用，避免全堆扫描；由写屏障（Write Barrier）维护。
来源：Java 17 GC Tuning Guide, Garbage-First (G1) https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1.html

## 为什么重要
- G1 是 Java 9+ 默认收集器，绝大多数服务端应用的 GC 调优对象就是它。
- 理解 Region/Remember Set/停顿目标，才能解释“为什么大对象会直接进 Humongous”“为什么停顿偶尔超标”。

## 常见坑
- 以为 `MaxGCPauseMillis` 是“上限保证”——它只是**期望目标**，G1 尽力逼近，极端情况下仍可能超时。
- 大量“大对象”（超过 Region 一半）会独占多个 Humongous Region 且回收昂贵，易引发停顿。
- 把 G1 当 CMS 调（如一味增大堆、忽视 Region 行为），效果反而差。

## 动手自测
1. 开启 `-Xlog:gc*=info` 观察 G1 的 Young/Mixed GC、Region 分配与停顿时间。
2. 制造一个超过 Region 一半的大数组，看它如何落入 Humongous 区。

## 面试视角
“G1 为什么可预测停顿？”“Remember Set 解决什么问题？”“Humongous 对象是什么、有何代价？”——G1 是后端面试 GC 章节的必考题。

## 7. JVM 调优与排查工具链（OOM/jstack/jmap/JFR/Arthas）

> 引导：生产排障靠工具链而非猜，这是把前面所有知识串起来的综合能力。

## 心智模型
线上 OOM/卡顿像机器故障：你不能靠猜，得有“仪表盘+听诊器”。JVM 自带一套诊断工具（jstack/jmap/jstat/JFR），再加上 Arthas 这种“在线把脉”神器，才能在不动重启的情况下定位问题。

## 核心知识点（锚定官方）
- **常见 OOM**：`Java heap space`（堆满）、`Metaspace`（类元数据满）、`GC overhead limit exceeded`（98% 时间在做 GC 却回收 <2% 空间）、`Unable to create new native thread`（线程数超限）。
- **命令行工具**（JDK 自带）：`jps`（进程）、`jstat`（GC/类加载统计）、`jmap`（堆转储/直方图）、`jstack`（线程栈/死锁）、`jcmd`（全能）、`jinfo`（参数）。
- **可视化/在线**：`jvisualvm`/`MAT`（分析 hprof）、`JFR`（Java Flight Recorder，低开销持续记录）、`Arthas`（阿里开源，线上动态观测/热修）。
- **GC 日志**：`-Xlog:gc*`（JDK 9+ 统一日志）是调优第一手资料。
来源：Java 17 Troubleshooting / Monitoring Guides；Java Flight Recorder https://docs.oracle.com/en/java/javase/17/troubleshoot/

## 为什么重要
- 生产问题往往“不能重启、要快速定位”——掌握工具链是后端排障的基本功。
- 调优不是拍参数，而是“看指标→定位瓶颈→小步验证”的闭环。

## 常见坑
- OOM 后第一反应是“加内存”，不抓堆转储（hprof）就重启，现场灭失、问题复发。
- 只看“吞吐量”忽略停顿，导致接口偶发长延迟被用户感知。
- 在容器（K8s）里不配 `-XX:+UseContainerSupport`（Java 8u191+ 默认开），JVM 读到宿主机内存而 OOM 被 kill。

## 动手自测
1. 故意让一个线程死锁，用 `jstack <pid>` 抓栈，找 `Found one Java-level deadlock`。
2. 制造堆 OOM，配 `-XX:+HeapDumpOnOutOfMemoryError` 自动留 hprof，用 MAT 分析占用最大的类。

## 面试视角
“线上 CPU 飙升/频繁 Full GC 怎么排查？”“OOM 有哪几种、各自怎么定位？”“Arthas 用过哪些命令？”——这是把前面所有知识串起来的综合题。
