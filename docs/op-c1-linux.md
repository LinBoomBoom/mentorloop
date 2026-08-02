<!-- title: Linux 与 Shell -->
<!-- goal: 掌握在命令行下完成文件、进程、权限、软件包与 Shell 脚本操作的能力，脱离图形界面独立完成日常运维与排障。 -->

# op-c1-s1 | Linux 文件系统层级与 FHS
> direction: 把 Linux 文件系统理解为一棵从 / 开始的统一逻辑树，"一切皆文件"。

## 心智模型
Linux 的文件系统是一张**从根目录 `/` 开始的统一树**。无论机器上有几块物理磁盘、几个分区，用户看到的始终是同一棵逻辑树——磁盘只是被"挂载"（mount）到了树的某个节点上。另一个关键直觉是**一切皆文件**：普通文件、目录、设备（/dev/sda）、管道、socket、甚至内核参数（/proc、/sys）都以文件形式暴露，读写文件就是和系统对话。

## 核心知识点（锚定官方）
- **FHS（Filesystem Hierarchy Standard）** 规定了根下各目录的语义。核心路径：`/bin`、`/sbin`（基础命令）、`/etc`（配置）、`/var`（可变数据如日志 `/var/log`、缓存）、`/usr`（用户程序与库）、`/home`（家目录）、`/tmp`（临时，重启可能清空）、`/opt`（第三方软件）。
- **`/proc` 与 `/sys` 是内核暴露的虚拟文件系统**，不占磁盘：例如 `/proc/cpuinfo`、`/proc/meminfo`、`/proc/<pid>/cmdline`、`/proc/<pid>/fd/`。`man7 hier(7)` 给出完整目录语义。
- **挂载**：`mount /dev/sdb1 /data` 把设备挂到 `/data`；`df -h` 看挂载与容量，`mount` 看当前挂载表。
来源：Filesystem Hierarchy Standard 3.0 https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html ；man7 hier(7) https://man7.org/linux/man-pages/man7/hier.7.html

## 为什么重要
熟悉层级才能秒级定位：配置在 `/etc`、日志在 `/var/log`、可执行在 `/usr/bin`。排障时知道"该去哪找"比记住命令更重要。容器里 `/proc` 可能不完整，理解虚拟文件系统能避免误判。

## 常见坑
- 把重要数据写进 `/tmp` 以为持久，结果重启或被 systemd-tmpfiles 清理后丢失。
- 混淆 `/bin` 与 `/usr/bin`、`/lib` 与 `/usr/lib`（现代发行版多通过 symlink 合并，但概念要分清）。
- 在容器/无特权环境里读取 `/proc` 受限，别把它当绝对可靠。

## 动手自测
```bash
man hier                 # 阅读目录规范
ls -l /                 # 观察顶层结构
cat /proc/1/cmdline | tr '\0' ' '; echo   # 看 PID 1 的启动命令
df -h                   # 各挂载点容量
```
问：如何确认某个目录属于哪块磁盘？答：`df -h /path` 显示该路径所在的挂载点与设备。

## 面试视角
- 解释 `/etc`、`/var/log`、`/proc` 的区别与用途。
- "一切皆文件"的含义？设备、socket、管道为何是文件？
- 软链接与硬链接的本质差异（inode、跨文件系统、删原文件后是否可用）。

# op-c1-s2 | 文件与目录操作
> direction: ls/cp/mv/rm/ln/find/tar 是每天高频使用的"手指记忆"级命令。

## 心智模型
把目录当成带抽屉的柜子：你做的每件事情要么是**看**（ls）、**复制**（cp）、**移动/改名**（mv）、**删除**（rm）、**建快捷方式**（ln），要么是**在大柜子里翻找**（find）和**打包搬家**（tar）。危险动作（rm、find -delete）先"演习"再执行，是职业习惯。

## 核心知识点（锚定官方）
- **ls**：`-l` 长格式、`-a` 含隐藏、`-h` 人类可读、`-t` 按时间排；`-i` 看 inode。
- **cp/mv/rm**：`cp -r` 递归目录；`mv` 同分区是改名、跨分区才是复制+删；`rm -r` 递归，`rm -rf` 极其危险。
- **ln**：`ln -s 源 目标` 软链接（存路径，可跨文件系统，原文件删则失效）；`ln 源 目标` 硬链接（同 inode，删原文件仍可用，不能跨文件系统、不能链目录）。
- **find**：按名 `-name`、按时间 `-mtime -1`（1天内）、按大小 `-size +100M`、对结果执行 `-exec cmd {} \;` 或 `-delete`。
- **tar**：`tar czf a.tgz dir/` 打包+gzip；`tar xzf a.tgz -C /opt` 解包到指定目录。
来源：GNU Coreutils Manual https://www.gnu.org/software/coreutils/manual/coreutils.html ；man1 ln(1)/find(1)/tar(1)

## 为什么重要
这些是"下限命令"——不会就寸步难行。精确使用 find/tar 能在不装额外工具时完成备份、迁移、批量改名。

## 常见坑
- `rm` 删前没确认范围就 `-rf`，尤其 `rm -rf $DIR/` 变量为空变成 `rm -rf /`。
- `find ... -delete` 没先空跑确认，误删大量文件。
- 软链接循环：对含软链接的目录 `cp -r` 可能复制出意外结构，注意 `-L`/`-P`。
- `mv` 跨文件系统大目录慢且非原子，别当"瞬间改名"用。

## 动手自测
```bash
# 找出 7 天内修改、大于 10M 的日志并打包
find /var/log -name '*.log' -mtime -7 -size +10M -print0 | tar czf biglogs.tgz --null -T -
# 安全删除演习：先打印再决定
find /tmp -mtime +30 -print   # 确认无误后再加 -delete
```

## 面试视角
- 软硬链接区别与应用场景。
- `rm -rf` 为何危险，如何防御变量为空？
- 如何在不破坏软链接语义下备份目录？

# op-c1-s3 | 文本处理三剑客 grep / sed / awk
> direction: 日志与配置分析的三大件，能拼出极强的单行脚本。

## 心智模型
把文本流想成一条**流水线**：`grep` 负责**过滤行**（按模式挑出想要的），`sed` 负责**改行内文本**（替换、删除、插入），`awk` 负责**按列计算**（把每行切字段、统计聚合）。三者通过管道 `|` 串联，构成 Unix "小工具组合"哲学的核心。

## 核心知识点（锚定官方）
- **grep**：`-E` 用扩展正则、`-i` 忽略大小写、`-v` 反选、`-n` 行号、`-r` 递归、`-c` 计数；`grep -E 'ERROR|WARN' app.log`。
- **sed**：`s/old/new/` 替换（默认只换每行首个，`g` 全局）；`sed -i` 就地改；`d` 删行、`p` 打印（配 `-n`）；`sed -n '10,20p'` 取行范围。
- **awk**：默认按空白分列 `$1..$NF`，`NR` 行号，`NF` 列数；`awk '{print $1}'`；统计 `awk '{c[$1]++} END{for(k in c) print k,c[k]}'`；`BEGIN{}`/`END{}` 块用于初始化与收尾。
来源：man1 grep(1)/sed(1)/awk(1)；POSIX.1-2017 Utilities https://pubs.opengroup.org/onlinepubs/9699919799/utilities/contents.html

## 为什么重要
线上排障 80% 在做"从海量日志里挑出异常并聚合"。一条 `awk+sort+uniq` 能秒级给出 TOP IP / TOP 接口，比打开 Excel 快几个数量级。

## 常见坑
- `sed` 默认只替换每行第一个匹配，忘记加 `g` 导致"为什么没全换"。
- 正则里 `.`、`*`、`()` 在 BRE（sed 默认）与 ERE（grep -E）语义不同，括号要转义或用 `-E`/`sed -r`。
- `awk` 字段分隔符默认是空白，`-F:` 才能按冒号切（如 `/etc/passwd`）。
- 在 `for` 循环里反复启动 awk/grep 处理大文件，性能极差；应一次性管道处理。

## 动手自测
```bash
# Nginx 访问日志中请求数 TOP10 的 IP（假设第1列为IP）
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10
# 把配置里 DEBUG 行注释掉
sed -i 's/^DEBUG/#DEBUG/' app.conf
# 统计每个状态码出现次数
awk '{print $9}' access.log | sort | uniq -c | sort -rn
```

## 面试视角
- 写一条命令统计访问日志 IP TOP10（经典题）。
- grep 的 `-v`、`-E` 用途；sed 全局替换怎么写。
- awk 的 `NR`/`NF`/`$0` 含义；如何用 awk 做聚合统计。

# op-c1-s4 | 权限模型 rwx / chmod / 特殊权限
> direction: 权限是安全的地基，最小权限原则从 chmod 开始。

## 心智模型
Linux 权限是一张三元组：**对谁（u 属主 / g 属组 / o 其他人）+ 能做什么（r 读 / w 写 / x 执行）**。数字表示法 `755` 是 `rwxr-xr-x` 的压缩写法。特殊权限（SUID/SGID/Sticky）则是"打破常规三元组"的进阶开关，能力越强越要审慎。

## 核心知识点（锚定官方）
- **基础位**：`r=4 w=2 x=1`；`chmod 755 file` 等价于 `u=rwx,go=rx`；`chmod u+x` 仅给属主加执行。`chown` 改属主/组，`chgrp` 改组。
- **umask**：新建文件/目录的默认权限掩码；`umask 022` 下目录默认 `755`、文件 `644`（文件默认去 x）。
- **SUID（4）**：执行时以**文件属主**身份运行，如 `/usr/bin/passwd`（属主 root），允许用户改自己的密码。`chmod u+s`。
- **SGID（2）**：对目录——新建文件继承目录的组；对文件——以文件属组身份运行。
- **Sticky Bit（1）**：仅目录（如 `/tmp`），用户只能删**自己**的文件，不能删别人的。`chmod +t`。
来源：man1 chmod(1)；man2 chmod(2)/stat(2)；POSIX 权限模型 https://pubs.opengroup.org/onlinepubs/9699919799/

## 为什么重要
权限配置错误 = 安全漏洞。Web 目录被设 `777`、SUID 二进制被滥用提权，都是真实事故根源。理解位运算才能精准授权而非"777 了事"。

## 常见坑
- 习惯性 `chmod 777` 图省事，等于对任何用户开放读写执行，极危险。
- 误以为 `chmod +x` 对脚本"可执行"就安全——解释器路径与文件本身权限都要对。
- 一位同事对 `/tmp` 误删 Sticky Bit，导致用户间可互删文件。

## 动手自测
```bash
stat -c '%a %n' /etc/passwd    # 看数字权限
umask 022; touch a; ls -l a     # 验证新建文件 644
chmod u+s /path/bin            # 设 SUID（仅演示，谨慎）
find / -perm -4000 -type f 2>/dev/null   # 列出系统所有 SUID 文件做审计
```

## 面试视角
- 数字 `755`/`644` 对应的字母权限。
- SUID 是什么、有什么风险、如何审计。
- umask 如何影响新建文件默认权限；Sticky Bit 解决什么问题。

# op-c1-s5 | 进程管理与信号
> direction: 进程是运行的程序，信号是与进程对话的语言。

## 心智模型
程序是**躺在磁盘上的文件**，进程是**跑起来的实例**（一个程序可多进程）。每个进程有唯一 PID。你想让进程"优雅停下""立刻杀死""重新读配置"，不是去拔电源，而是**发信号**——信号是内核与进程之间的异步通知机制。

## 核心知识点（锚定官方）
- **查看**：`ps aux` 全量进程；`top`/`htop` 实时；关注 `RES`（常驻内存）、`VIRT`、`%CPU`、load average（1/5/15 分钟平均负载）。
- **信号**：`SIGTERM(15)` 请求终止，进程可捕获做清理（优雅退出）；`SIGKILL(9)` 强制立即终止，**不可捕获、不给清理机会**，是最后手段；`SIGHUP(1)` 传统用于"重载配置"；`SIGINT(2)` 来自 Ctrl+C。
- **发信号**：`kill -15 PID`、`kill -9 PID`、`pkill -f nginx`、`killall`。
- **后台**：`cmd &` 后台运行；`nohup cmd &` 忽略 SIGHUP（断开终端不中断）；`jobs`/`fg`/`bg` 管理。
- **systemd**：`systemctl start/stop/restart/status/enable` 管理服务单元；`journalctl -u nginx` 看服务日志。
来源：man7 signal(7) https://man7.org/linux/man-pages/man7/signal.7.html ；systemd https://www.freedesktop.org/wiki/Software/systemd/

## 为什么重要
重启服务该用 `restart` 还是 `kill -9`？前者走优雅退出保留数据，后者可能丢内存态。理解信号是正确运维服务的前提。

## 常见坑
- 一遇到问题就 `kill -9`，导致未刷盘数据丢失、socket 文件残留、锁未释放。
- 把 load average 当成 CPU 使用率——高负载可能源于 IO 等待而非 CPU 满。
- `nohup ... &` 后没重定向输出，日志写满当前终端或丢失。
- 用 `kill` 默认信号（TERM）杀不掉的僵尸进程——僵尸不可被杀，需杀其父进程。

## 动手自测
```bash
ps aux --sort=-%cpu | head        # CPU 占用 TOP
kill -15 1234                      # 先优雅终止
kill -9 1234                       # 仍有残留再强制
systemctl status nginx             # 看服务状态与最近日志
journalctl -u nginx -n 50 --no-pager
```

## 面试视角
- SIGTERM 与 SIGKILL 区别？为什么优先 TERM？
- 什么是僵尸进程、孤儿进程？如何处理？
- load average 高但 CPU 低，可能原因（IO 等待、D 状态进程）？

# op-c1-s6 | 软件包管理
> direction: 用包管理器装软件，比手动编译更可控、可回滚、可审计。

## 心智模型
软件包管理器像一个**受管的应用商店 + 依赖求解器**：你只说"我要 nginx"，它自动解决 nginx 依赖哪些库、从哪个仓库下载、装到哪个标准路径，并记录清单以便卸载和回滚。手动编译则是"自己动手"，灵活但难维护。

## 核心知识点（锚定官方）
- **Debian 系（apt）**：`apt update` 刷新索引、`apt install`、`apt remove`、`apt list --installed`、`apt-cache policy nginx` 看可装版本；底层 `dpkg -l` 列已装包、`dpkg -i pkg.deb` 装本地包。
- **RHEL 系（dnf/yum）**：`dnf install`、`dnf remove`、`rpm -qa` 列包、`rpm -ql nginx` 看包内文件；`dnf history` 可回滚事务。
- **仓库与 GPG**：官方源经 GPG 签名校验，避免装到被篡改的包；加第三方源需导入其 key。
- **源码编译**：`./configure && make && make install`，装到 `/usr/local`；优势是可定制，劣势是脱离包管理、升级卸载麻烦。
来源：apt(8) https://manpages.debian.org/apt ；dnf(8) https://dnf.readthedocs.io/ ；FHS `/usr/local` 约定

## 为什么重要
生产环境必须用包管理器保证一致性：同样的 `apt install` 在百台机器得到相同结果，且能审计来源。手动编译的二进制难回滚、难复现，是运维债。

## 常见坑
- 混用 pip/conda 装的包与系统 apt 包冲突，覆盖系统 Python 库导致命令崩。
- 直接 `make install` 覆盖系统关键文件，且无法用包管理器卸载。
- 没锁版本，`apt upgrade` 把 running 服务升到不兼容新版引发故障；关键组件应 pin 版本。
- 用 `rm -rf /usr` 误清系统目录（极端但真实），无备份无法恢复。

## 动手自测
```bash
apt list --installed | grep nginx     # 已装版本
dnf history                            # 看事务可回滚
rpm -ql nginx                          # 包释放了哪些文件
apt-mark hold nginx                    # 锁定版本防止误升级
```

## 面试视角
- apt 与 dnf/yum 的核心区别？为什么用包管理器而非编译？
- 如何回滚一次有问题的升级？
- 为什么生产要锁关键组件版本（hold/pin）？

# op-c1-s7 | Shell 变量、引号与展开
> direction: 引号用错，脚本就会在空格和特殊字符上翻车。

## 心智模型
Shell 在执行命令前会做几道**"预处理"**：变量展开（`$VAR` → 值）、命令替换（`$(...)` → 输出）、文件名展开（glob `*`）。引号的作用就是**控制哪些展开该发生、哪些要原样保留**。双引号"放生变量、压住空格"，单引号"全压住"，不加引号"全放开还可能按空格劈开"。

## 核心知识点（锚定官方）
- **变量**：`VAR=value`（等号两侧无空格！）；`$VAR` 或 `${VAR}` 引用；`export VAR` 导出为环境变量，子进程可见。
- **引号**：双引号 `"$VAR"` 保留值内空格、仍展开变量；单引号 `'$VAR'` 原样、不展开；不加引号时值按空白分词、且 `*` 等会 glob 展开。
- **命令替换**：`$(command)`（推荐，可嵌套）优于反引号 `` `command` ``。
- **PATH**：命令搜索路径，`echo $PATH`；把自定义脚本目录加入 `export PATH=$PATH:/opt/bin`。
- **heredoc**：`cat <<'EOF' ... EOF`（引号化 EOF 则内部不展开）。
来源：GNU Bash Manual https://www.gnu.org/software/bash/manual/ ；POSIX Shell Command Language https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html

## 为什么重要
90% 的 Shell 脚本 bug 来自引号与展开：含空格的文件名被劈成多参数、变量为空变成 `rm -rf /`。掌握引号规则等于避开了绝大多数坑。

## 常见坑
- `VAR = value` 写成赋值却被当成"运行 VAR 命令带参数"，等号两侧不能有空格。
- `rm -rf $DIR/` 当 `DIR` 为空变成 `rm -rf /`（应 `"$DIR"/` 并先判空）。
- `for f in $(ls)` 遇含空格文件名断裂，应 `for f in *` 或用 `find -print0`。
- 在双引号里写正则，`*` 不会被 glob（好），但 `$` 仍展开（注意 `$1` 等）。

## 动手自测
```bash
file="my report.txt"
echo "$file"        # 正确：整段作为一个参数
echo $file          # 危险：被劈成两个词
grep "$pattern" "$file"   # 始终给变量加双引号
PATH="$PATH:/opt/bin"     # 安全追加
```

## 面试视角
- 双引号与单引号区别？何时必须用双引号包 `$VAR`？
- `$(...)` 与反引号区别？
- 为什么 `rm -rf $DIR/` 危险，如何写才安全？

# op-c1-s8 | Shell 控制流与函数
> direction: 脚本从"命令序列"升级为"程序"，靠控制流与函数。

## 心智模型
把 Shell 脚本看成一台**流水线控制器**：`if` 做分支决策，`for/while` 做循环搬运，`case` 做多路匹配，函数把复用逻辑打包成"自定义命令"。再配上一个"严格模式"开关，让脚本在出错时立刻停下而非带着错误继续——这是从玩具脚本到可靠脚本的分水岭。

## 核心知识点（锚定官方）
- **条件**：`if [ "$a" -eq 1 ]; then ... fi`（注意 `[` 是命令，两侧留空格）；字符串用 `=`、`!=`，数值用 `-eq/-ne/-gt`；`[[ ]]`（bash）支持 `&&`、`||`、正则 `=~` 且更安全。
- **循环**：`for i in 1 2 3` / `for f in *.log`；`while read line; do ... done < file`。
- **case**：`case $x in pattern1) ...;; pattern2) ...;; esac`，常用于参数分发。
- **函数**：`myfunc(){ ...; }`，参数用 `$1 $2`，返回值用 `return`（0=成功），输出用 `echo`。
- **严格模式**：`set -euo pipefail`——`-e` 出错即停、`-u` 用未定义变量即错、`-o pipefail` 管道任一段失败则整体失败。
来源：GNU Bash Manual（条件/循环/函数）https://www.gnu.org/software/bash/manual/ ；POSIX Shell https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html

## 为什么重要
无严格模式的脚本会在半路失败后"假装成功"继续跑，造成静默数据损坏。`set -euo pipefail` 是运维脚本的"安全带"，几乎应默认开启。

## 常见坑
- `[ $a -eq 1 ]` 当 `a` 为空变成 `[ -eq 1 ]` 语法错；应 `[ "$a" -eq 1 ]`。
- `for f in $(ls)` 空格劈裂（见上章）。
- 在 `while read` 管道里修改变量，循环结束后变量"丢失"——因管道在子 shell；改用 `< file` 重定向避免子 shell。
- 忘记 `return` 用 `exit`，导致函数里 `exit` 直接结束整个脚本。

## 动手自测
```bash
set -euo pipefail
backup() {
  local src="$1"; local dst="$2"
  [ -d "$src" ] || { echo "no such dir: $src"; return 1; }
  tar czf "$dst/$(date +%F).tgz" "$src"
}
for d in /etc /var/www; do backup "$d" /backups; done
```

## 面试视角
- `set -euo pipefail` 各自作用？为什么运维脚本要开？
- `[ ]` 与 `[[ ]]` 区别？
- 为什么 `for f in $(ls)` 不好，正确写法？

# op-c1-s9 | 定时任务与日志轮转
> direction: 让任务按计划自动跑，并让日志不撑爆磁盘。

## 心智模型
**cron 是系统的闹钟**：你写"每天 3 点跑备份"，内核的 cron 守护进程到点就执行。但任务会源源不断产生日志，**logrotate 是保洁员**：按大小/时间把旧日志归档压缩、删除过期的，防止磁盘被写满把服务拖垮。两者配合，系统才能长期无人值守稳定运行。

## 核心知识点（锚定官方）
- **cron 格式**：`分 时 日 月 周 命令`（如 `0 3 * * * /usr/local/bin/backup.sh`）。`crontab -e` 编辑当前用户任务，`crontab -l` 列出，`/etc/crontab` 与 `/etc/cron.d/` 为系统级。
- **环境变量陷阱**：cron 的 PATH 极小（常仅 `/usr/bin:/bin`），脚本里命令要用**绝对路径**或在脚本内 `export PATH`。
- **输出**：cron 把任务 stdout/stderr 邮件给 owner；一般需要重定向 `>> /var/log/x.log 2>&1` 或 `> /dev/null 2>&1`。
- **logrotate**：配置文件 `/etc/logrotate.d/*`；关键指令 `daily/weekly`、`rotate N`（保留份数）、`size`、`compress`、`copytruncate`（不重开文件句柄，适合不能 reload 的进程）。
- **systemd 定时器**：现代替代 cron 的方案，`OnCalendar=*-*-* 03:00:00` 配 `.service`，日志统一进 journald。
来源：man5 crontab(5) https://man7.org/linux/man-pages/man5/crontab.5.html ；man8 logrotate(8) ；systemd.timer https://www.freedesktop.org/wiki/Software/systemd/

## 为什么重要
备份、清理、报表都靠 cron；而日志不轮转曾是导致磁盘 100%、全线服务不可用的头号原因。两者是"自动化运维"的入门双翼。

## 常见坑
- cron 任务因 PATH 太小找不到命令，脚本手动能跑、cron 跑不了——用绝对路径解决。
- 任务报错被邮寄走（或被丢弃），问题潜伏数周才发现。
- logrotate 用 `create` 但进程不重开日志文件，导致继续写旧 inode；对不能 reload 的服务用 `copytruncate`。
- 忘记 `2>&1` 把错误吞掉，排障时无迹可寻。

## 动手自测
```bash
crontab -l                              # 看当前任务
# 每天 3:00 备份并重定向日志
echo '0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1' | crontab -
# 验证 logrotate 配置语法
logrotate -d /etc/logrotate.d/nginx     # -d 演练不真执行
journalctl --since '1 hour ago'         # systemd 日志
```

## 面试视角
- cron 五段格式？为什么 cron 里命令要用绝对路径？
- logrotate 的 `copytruncate` 解决什么问题，与 `create` 区别？
- 磁盘被日志写满的应急处理与根治手段？
