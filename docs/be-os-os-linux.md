# 第5章 · 操作系统与 Linux 基础

> 目标：建立进程/线程、虚拟内存、文件系统、IPC 的心智模型，掌握 Linux 排查命令与 Shell，理解信号与容器底层（namespace/cgroup）。

> 来源：clone(2)/fork(2) · namespaces(7) · signal(7) · cgroup v2 内核文档 · VFS/inode 通用模型 · Bash 手册 · TLPI 排查工具

---


## 1. 进程、线程与调度

> 引导：建立进程=资源容器、线程=执行流的心智，理解 clone/fork 与 Linux 调度模型

## 心智模型
进程是"资源的容器"，线程是"容器里的执行流"。把进程想象成一间带独立地址空间、文件描述符表、信号处理表的房间；线程则是房间里同时干活的多个工人，共享房间里的所有东西，只各自拥有独立的栈和程序计数器。一句话：进程管"资源隔离"，线程管"并发执行"。

## 核心知识点（锚定官方）
Linux 创建进程/线程都靠 `clone(2)` 系统调用（man7.org/linux/man-pages/man2/clone.2.html）。`fork(2)` 可视为不共享任何上下文的 clone 特例；线程则是 `clone()` 带上 `CLONE_VM`（共享地址空间）+ `CLONE_FILES`（共享文件表）+ `CLONE_SIGHAND`（共享信号表）+ `CLONE_THREAD`（同一线程组）来创建。调度上 Linux 默认用 CFS（完全公平调度器），按"虚拟运行时间"公平分配 CPU；普通进程用 `nice` 值（-20 最高优先级 ~ 19 最低，默认 0）微调权重，实时进程用 `SCHED_FIFO`/`SCHED_RR` 抢占普通进程。

## 为什么重要
这是理解"为什么 Java 一个线程 OOM 会拖垮整个进程""为什么多进程比多线程更稳定但更耗内存""为什么容器里 kill 1 号进程等于停容器"的地基。后端几乎所有并发模型（线程池、协程、Reactor）都建立在对进程/线程区别的清晰认知上。

## 常见坑
1. 混淆"进程切换"与"线程切换"开销：线程切换不切页表所以更轻，但争用同一把锁时一样会卡。
2. 以为 `fork()` 会拷贝全部内存——其实 Linux 用写时复制（Copy-On-Write），只有真正写入才复制物理页。
3. 多线程共享地址空间，一个线程的野指针会段错误（SIGSEGV）整进程，而非只崩一个线程。

## 动手自测
1. 用 `ps -eLf` 观察某个 Java 进程的线程数（NLWP 列），对比 `top -H` 看到的线程。
2. 写个小程序 `fork()` 后父子各改一个全局变量，验证 COW：父子看到的值不同但物理内存未立即翻倍。
3. `man 2 clone` 列出所有 CLONE_* 标志，挑 5 个查它们共享了什么。

## 面试视角
高频题："进程和线程的区别？""fork 和 clone 什么关系？""线程崩溃会影响进程吗？"进阶会问 CFS 公平性、nice 值影响、实时调度场景。答法要落到"共享什么/隔离什么"+ 一个实际后果（如 OOM 传播）。

## 2. 进程间通信 IPC

> 引导：梳理管道、共享内存、消息队列、信号量、信号、Unix 域套接字的取舍

## 心智模型
IPC 是进程之间"传话"和"共享黑板"的方式。有的像写信（管道、消息队列），有的像共用一块白板（共享内存），有的像举手示意（信号），有的像内部电话（Unix 域套接字）。选哪种，取决于你要的是"顺序可靠"还是"极致速度"。

## 核心知识点（锚定官方）
POSIX/Linux 提供多种 IPC（见 man7.org 各页）：匿名管道 `pipe(2)` 是父子间单向字节流；命名管道 `mkfifo(3)` 可跨无亲缘关系进程；共享内存 `shmget/shmat` 把同一块物理内存映射到多个进程虚拟地址，速度最快但需自己加锁同步；消息队列（System V `msgget` 或 POSIX `mq_*`）按消息边界传递；信号量 `sem_*` 用于进程间互斥/同步；信号 `signal(7)` 是轻量事件通知；Unix 域套接字 `socketpair(2)`/`AF_UNIX` 支持双向可靠字节流，性能优于 TCP 环回。

## 为什么重要
微服务里进程间通信本质就是 IPC 的工程放大：本地共享内存近似于同机无序列化调用，Socket/管道近似于网络 RPC。理解每种 IPC 的"拷贝次数"和"同步负担"，才能解释为什么某些架构选共享内存、某些选 gRPC。

## 常见坑
1. 共享内存最快但"零同步"会出竞态——必须配信号量/互斥锁，否则数据错乱比慢更可怕。
2. 管道是字节流不是消息流，多次 `write` 可能被一次 `read` 合并，应用层要自定边界（长度前缀/分隔符）。
3. 管道满时 `write` 阻塞、空时 `read` 阻塞，误用会导致死锁（如父子互相等对方先写）。

## 动手自测
1. 用 `mkfifo` 建命名管道，一个终端 `cat` 它、另一个 `echo` 写入，观察阻塞-唤醒。
2. 写两个程序通过 `shmget` 共享一个计数器，故意不加锁并发自增 100 万次，看结果是否小于预期。
3. `ipcs -m/-q/-s` 查看系统现存共享内存/消息队列/信号量。

## 面试视角
"共享内存和管道比哪个快？为什么？""消息队列相比 Socket 有什么优势？"核心答点：共享内存零拷贝但需自同步，管道有内核缓冲拷贝。常延伸到"为什么 Kafka 用文件+零拷贝而非纯共享内存"。

## 3. 虚拟内存与内存管理

> 引导：理解虚拟地址、页表、缺页中断、写时复制与 OOM killer 的因果链

## 心智模型
虚拟内存让每个进程都以为自己独占一整块从 0 开始的连续大内存，实际物理内存是大家抢的"公共水池"。MMU（内存管理单元）拿着页表当翻译官，把虚拟地址实时翻成物理地址。进程看到的"内存"和物理条上的"内存"是两本账。

## 核心知识点（锚定官方）
程序只用虚拟地址；CPU 访存经 MMU 查页表翻译成物理地址。内存按"页"管理，x86 通常 4KB 一页。访问的页不在物理内存时触发**缺页中断（page fault）**，内核分配物理页并建立映射（或触发 swap 换入、或报 SIGSEGV）。`fork()` 用写时复制，父子共享物理页直到一方写入。`free` 命令里的 buff/cache 是页缓存，可随时回收，不等于"可用内存很少"。

## 为什么重要
OOM、内存泄漏、swap 抖动、大页（hugepage）、堆外内存（Netty 的 DirectBuffer、JVM 元空间）全建立在这套机制上。看不懂虚拟内存，就解释不了"为什么容器设了 2G 限制还会被宿主机 OOM 杀"。

## 常见坑
1. 误把 buff/cache 当"已用内存"——它可回收，真实压力看 available。
2. 以为 `malloc` 成功就一定有物理内存——其实只是拿到虚拟地址，真正占物理页在首次写入（overcommit 场景更明显）。
3. 堆外内存（DirectBuffer、mmap）不计入 JVM 堆，监控只看堆会漏掉它导致 OOM。

## 动手自测
1. `cat /proc/self/maps` 看自己进程的虚拟地址空间布局（堆、栈、动态库、vsyscall）。
2. 故意写个不断 `malloc` 但不释放的 C 程序，用 `top` 观察 RSS 增长，再用 `echo 3 > /proc/sys/vm/drop_caches` 看 cache 变化。
3. `vmstat 1` 观察 si/so（swap 换入换出），制造内存压力看是否抖动。

## 面试视角
"什么是虚拟内存？""缺页中断有几种？""为什么要有分页？"延伸到"MMU/TLB""写时复制""swap 与 OOM killer"。答法要能串起：虚拟地址→页表→MMU→物理页→缺页→swap→OOM。

## 4. 文件系统与磁盘 IO

> 引导：从 VFS、inode 到页缓存与 fsync，解释一次 read/write 的真实链路

## 心智模型
Linux 里"一切皆文件"。一次 `read()` 不是"直接读磁盘"，而是走 VFS→具体文件系统→页缓存→（未命中才）磁盘的链路。页缓存（page cache）是性能命脉：读过的数据留在内存，下次命中就免了磁盘 IO。

## 核心知识点（锚定官方）
VFS 抽象出统一文件接口，具体由 ext4/XFS 等实现，文件元数据在 **inode**，目录项在 dentry，数据在 block。现代 Linux 把"文件内容缓存"和"块设备缓冲"统一为 **page cache**。读文件时若页已在 cache 则直接返回（cache hit），否则从磁盘读入并填充 cache。写入默认"写回"（write-back），数据进 cache 由内核异步刷盘，故 `write` 返回快但不代表落盘——需 `fsync(2)`/`fdatasync(2)` 强刷。新接口 `io_uring` 用提交/完成队列大幅降低系统调用开销。

## 为什么重要
数据库、消息队列的吞吐几乎由"怎么用页缓存和 fsync"决定。理解"写回 vs 直写""O_DIRECT 绕过缓存""fsync 成本"，才能解释为什么 MySQL 要 double write、Kafka 靠顺序写+page cache。

## 常见坑
1. 以为 `write` 返回就安全——宕机可能丢数据，重要数据必须 `fsync`。
2. 大量随机小文件把 page cache 冲掉，反而拖慢顺序读（缓存污染）。
3. `O_DIRECT` 绕过缓存但要求内存对齐、长度对齐，用错反而更慢。

## 动手自测
1. `dd if=/dev/zero of=test bs=1M count=100` 写后 `cat test > /dev/null` 再读，用 `time` 对比第二次（命中 cache 极快）。
2. `vmstat 1` 看 bi/bo（块设备读写），观察 `fdatasync` 前后 bo 跳动。
3. `ls -i` 查看文件的 inode 号，理解"硬链接共享 inode"。

## 面试视角
"一次 read 系统调用发生了什么？""page cache 是什么？""为什么 Kafka 快？"答点要落到 VFS→cache→磁盘 链路 + 顺序 IO 友好 + cache 命中。延伸到 fsync/崩溃一致性。

## 5. Linux 常用命令与排查

> 引导：形成 CPU/内存/IO/网络/句柄的排查套路与工具地图

## 心智模型
Linux 排查像"医生看病"：先量体温（整体资源），再定位患处（哪个进程/线程），最后做检查（专项工具）。有一套约定俗成的排查路径，而不是乱敲命令。

## 核心知识点（锚定官方）
CPU：`top`/`htop` 看整体与单进程，`top -H` 看线程；`mpstat -P ALL` 看每核。`pidstat` 看进程级 CPU/IO。内存：`free -h` 看 available，`vmstat` 看 si/so。`iostat -x 1` 看磁盘util/await。网络：`ss -tunlp`（替代淘汰的 netstat）看监听与连接，`netstat -i` 看丢包。打开文件：`lsof -p PID` 查句柄泄漏。系统调用：`strace -p PID` 看进程在 syscall 上卡哪。`dmesg`/`journalctl` 看内核日志（OOM、硬件错误）。抓包：`tcpdump`/`wireshark`。

## 为什么重要
这是面试区分"会不会用 Linux"的硬指标，也是线上排障的肌肉记忆。后端工程师的价值很大一块体现在"服务挂了你能不能 5 分钟内定位是 CPU、内存、IO 还是网络"。

## 常见坑
1. 只看 `free` 的 used 不看 available，误判内存不足。
2. `top` 默认按 CPU 排序，IO 瓶颈时 CPU 可能很低，要用 `iotop`/`iostat` 才暴露。
3. 容器里 `top` 看到的是宿主机数据（未隔离 /proc），要用 `kubectl top` 或 cgroup 读数。

## 动手自测
1. 起一个死循环 `while true; do :; done`，`top -H` 找到它，确认占满一个核。
2. `ss -tunlp | grep :8080` 确认服务监听，再用 `curl` 触发连接后 `ss -tn` 看状态（ESTABLISHED/TIME_WAIT）。
3. `strace -f -e trace=network,read,write -p <pid>` 看一个进程的网络/IO 系统调用。

## 面试视角
"CPU 飚高怎么排查？""服务响应慢怎么定位是网络还是 DB？"答法给套路：top 定进程→top -H 定线程→perf/火焰图→结合日志。强调"先量化再下结论"。

## 6. Shell 与脚本基础

> 引导：掌握重定向、管道、引号差异、glob 与防御性脚本写法

## 心智模型
Shell 既是"命令解释器"（你敲它执行），也是"脚本语言"（可写 `.sh` 自动化）。把它当成一个带有变量、分支、循环、管道的小语言，而不是一堆零散命令。

## 核心知识点（锚定官方）
Bash（参考 GNU Bash 手册 gnu.org/software/bash/manual）：重定向 `>` 覆盖、`>>` 追加、`<` 输入、`<<`  here-doc；管道 `|` 把前一个命令 stdout 接后一个 stdin。变量 `var=1`（**等号两侧不能有空格**），引用用 `$var`；引号区别关键：`''` 单引号不展开、`""` 双引号展开变量但防分词、`` `cmd` `` 或 `$(cmd)` 命令替换。**glob**（通配）`*` `?` 由 shell 展开而非程序。作业控制：`&` 后台、`jobs`、`fg`/`bg`；`export` 把变量放进环境给子进程。

## 为什么重要
运维脚本、CI 流水线、容器 ENTRYPOINT 几乎都是 Shell。一个小引号错误就能让部署脚本删错目录或静默失败。理解 shell 展开规则，是写出"可预测"脚本的前提。

## 常见坑
1. `var = 1` 报错——等号两侧空格被解析成命令+参数。`var=1` 才对。
2. `rm -rf $DIR/` 当 `DIR` 为空时变成 `rm -rf /`——务必给默认值 `${DIR:-/tmp}` 并加引号。
3. 管道里 `cd` 无效：管道右侧在子 shell，父 shell 目录不变。
4. 单引号里写 `$var` 不会被替换，常导致"变量没生效"。

## 动手自测
1. 写脚本对比 `echo '$HOME'` 与 `echo "$HOME"` 输出差异。
2. 用 `for f in *.log; do ...` 批量压缩日志，注意文件名含空格时加引号。
3. `set -euo pipefail` 开头让脚本遇错即停，体会它如何避免静默失败。

## 面试视角
"Shell 单双引号区别？""`$?` 是什么？"常作为运维/DevOps 岗基础题，也会让手写备份/日志清理脚本。答点落在"展开规则 + 防御性写法（set -euo pipefail、引号包裹变量）"。

## 7. 信号与同步原语

> 引导：区分信号语义与 SIGKILL/SIGSTOP 不可拦截性，连接优雅停机与锁设计

## 心智模型
信号是内核发给进程的"轻量事件通知"，像按门铃：有的礼貌（SIGTERM 请你退出）、有的强拆（SIGKILL 直接终止）、有的报警（SIGSEGV 非法内存）。同步原语则是多线程之间"排队""加锁""等条件"的协同机制。

## 核心知识点（锚定官方）
`signal(7)` 定义标准信号：SIGHUP=1、SIGINT=2（Ctrl+C）、SIGQUIT=3、SIGKILL=9、SIGSEGV=11、SIGCHLD=17、SIGSTOP=19、SIGCONT=18、SIGTERM=15。关键规则：**SIGKILL 和 SIGSTOP 不能被捕获、阻塞或忽略**（man7 原文）；信号处置（disposition）是进程级属性，多线程进程里所有线程相同，`fork` 继承、`execve` 重置。发送用 `kill(2)`。POSIX 线程同步原语：互斥锁 `pthread_mutex`、条件变量 `pthread_cond`、读写锁、信号量 `sem_*`——用于保护共享数据与等待条件。

## 为什么重要
"优雅停机"本质是捕获 SIGTERM 做清理再退出；`kill -9` 是最后手段因为它不给清理机会（可能丢数据、不留 socket 文件）。多线程服务里锁设计直接决定并发安全与吞吐。

## 常见坑
1. 信号处理器里只能调用"异步信号安全"函数（async-signal-safe），在里面 `printf`/`malloc` 可能死锁——标准做法是只设一个 flag，主循环去处理。
2. 误用 SIGKILL 强杀数据库进程导致数据损坏，应优先 SIGTERM 等优雅退出。
3. 条件变量必须配互斥锁且用 while 而非 if 检查条件，防虚假唤醒。

## 动手自测
1. 写程序用 `sigaction` 捕获 SIGTERM 打印日志后退出，用 `kill -15 PID` 触发，对比 `kill -9` 的立即终止。
2. 验证 SIGKILL 无法捕获：注册 handler 后 `kill -9`，确认无效。
3. 写两个线程抢一把 mutex 计数，用 `pthread_mutex` 保证结果正确。

## 面试视角
"SIGTERM 和 SIGKILL 区别？""为什么 SIGKILL 不能捕获？""条件变量为什么用 while？"答点：SIGKILL 不可拦截故不能做清理；优雅停机靠 SIGTERM handler。常延伸到"僵尸进程与 SIGCHLD""信号处理中的重入问题"。

## 8. 容器底层：namespace 与 cgroups

> 引导：用 namespace（隔离视图）+ cgroup（资源限额）解释 Docker 本质

## 心智模型
容器不是"新操作系统"，而是用 Linux 两大原语"化装"出来的隔离环境：**namespace 决定你能看到什么，cgroup 决定你能用多少**。namespace 像给进程戴了 VR 眼镜（看到独立的网络/进程/PID），cgroup 像给进程装了水电表（限制 CPU/内存）。

## 核心知识点（锚定官方）
`namespaces(7)` 定义 8 类命名空间：`mount`(CLONE_NEWNS)、`pid`、`net`、`ipc`、`uts`、`user`、`cgroup`、`time`，各自把全局资源包装成"看起来独立的一份"，是容器的基石（"One use of namespaces is to implement containers"）。通过 `clone(2)` 带 `CLONE_NEW*` 或 `unshare(2)` 进入新 namespace。`cgroup v2`（kernel.org/doc/html/latest/admin-guide/cgroup-v2.html）采用**单一统一层级**（区别于 v1 每控制器一棵树），进程以树状组织，cpu/memory/io/pids 等控制器通过 `cgroup.subtree_control` 启用，用 `cpu.max`/`memory.max`/`pids.max` 设限额；内存触顶会触发该 cgroup 的 OOM killer。

## 为什么重要
看懂 namespace+cgroup，就懂了"为什么容器里 `ps` 只看到自己进程""为什么设了 2G 内存限制超了会被杀""为什么 Docker 镜像层能共享"。这是排查容器资源问题、设计 K8s 资源 request/limit 的地基。

## 常见坑
1. 以为 namespace 隔离了资源用量——它只隔离"视图"，真正限额靠 cgroup，二者缺一不可。
2. 容器里 `top`/`free` 读的是宿主机 /proc（除非用 lxcfs 等挂载），会误以为资源很充裕。
3. cgroup v1 与 v2 接口不同（v1 每控制器独立目录，v2 统一），混用会配错限额。

## 动手自测
1. `ls -l /proc/$$/ns` 看当前进程所属的各类 namespace 符号链接。
2. `unshare -u -m -p -f --mount-proc bash` 进入新 uts/mnt/pid namespace，再 `ps -ef` 看 PID 从 1 开始。
3. `mkdir /sys/fs/cgroup/test && echo 100000 > test/cpu.max` 体验 v2 限额写法（需 v2 挂载）。

## 面试视角
"Docker 底层原理？""namespace 和 cgroup 各自负责什么？""容器和虚拟机区别？"答点：namespace=隔离视图、cgroup=资源限额、镜像层=只读+可写层。常延伸到"容器逃逸""cgroup OOM vs 宿主机 OOM"。
