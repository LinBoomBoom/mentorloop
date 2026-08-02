<!-- title: Docker 与 Kubernetes -->
<!-- goal: 理解容器底层原理与镜像构建，并掌握 Kubernetes 的核心对象（Pod/Deployment/Service/Ingress/ConfigMap/Secret）、健康检查、滚动发布与资源调度，能独立完成容器化部署与排障。 -->

# op-c3-s1 | 容器原理与镜像概念
> direction: 容器不是虚拟机，而是被"隔离 + 限制"的普通进程。

## 心智模型
容器像给进程套上**两道墙**：一道是 **Namespace（命名空间）**——让进程以为自己独占整台机器（独立的 PID、网络、挂载、UTS）；另一道是 **cgroups（控制组）**——给这道墙外的资源（CPU、内存、IO）设上限。所以它本质是"被隔离和限额的进程"，启动秒级、几乎零额外开销，不同于要跑完整内核的虚拟机。

## 核心知识点（锚定官方）
- **Namespace（man7 namespaces(7)）**：IPC、Mount、PID、Network、User、UTS、Time 七类，构成容器的"视图隔离"。
- **cgroups v2（man7 cgroups(7)）**：统一层级，按 controller（cpu、memory、pids、io）限制与统计资源；v1 多层级、v2 单层级。
- **镜像（OCI Image Spec）**：分层（layer）只读文件系统，每层是上一层的 diff；`FROM` 基础层 + 各指令产生新层；可写层（容器层）在运行时叠加。
- **联合挂载（overlayfs）**：把多层叠成单一可写视图；写时复制（copy-on-write）保证下层只读复用。
- **运行时**：Docker 早期用 `runc`（OCI runtime）创建容器；Kubernetes 用 `containerd`/`cri-o` 接 OCI 运行时。
来源：man7 namespaces(7) https://man7.org/linux/man-pages/man7/namespaces.7.html ；cgroups(7) https://man7.org/linux/man-pages/man7/cgroups.7.html ；OCI Image Spec https://github.com/opencontainers/image-spec

## 为什么重要
"容器为什么轻""为什么进程 PID 是 1""为什么资源超了会被 OOM Kill"——这些都源于 Namespace/cgroups。不懂原理就会误把容器当小 VM，做出错误容量与隔离假设。

## 常见坑
- 误以为容器=虚拟机，期待独立内核或完整 init，结果 PID 1 退出容器即停。
- 在容器里跑多个无关进程又没 proper init（如 `tini`），僵尸进程堆积、信号收不到。
- 把数据写进容器可写层，容器一删数据全没（应挂 volume）。
- cgroups v1/v2 混用导致资源限制不生效（如某些发行版默认 v1）。

## 动手自测
```bash
docker run -it --rm alpine sh -c 'echo $$'     # 容器内 PID 1
ls -l /proc/self/ns/                          # 看当前进程加入了哪些 namespace
cat /sys/fs/cgroup/cgroup.controllers         # cgroups v2 控制器
docker image history myimage:latest            # 看镜像分层
```

## 面试视角
- 容器与虚拟机的本质区别？Namespace 与 cgroups 各管什么？
- 镜像分层的意义？copy-on-write 怎么工作？
- 为什么容器 PID 1 退出容器就停？僵尸进程问题怎么解？

# op-c3-s2 | Dockerfile 与镜像优化
> direction: 写好 Dockerfile，让镜像既小又可复现、构建又快。

## 心智模型
Dockerfile 是镜像的**配方**：每一行指令"烤"出一层。好的配方遵循三条铁律——**层要少而稳**（频繁变的放后面、复用缓存）、**身子要瘦**（用 alpine/slim 基础、多阶段只留运行所需）、**别把脏东西烤进去**（.dockerignore 排除本地垃圾）。镜像越小，拉取越快、攻击面越小。

## 核心知识点（锚定官方）
- **指令**：`FROM`（基础）、`RUN`（执行并固化层）、`COPY`/`ADD`（拷文件，`COPY` 优先、`ADD` 会自动解压 url/压缩包需谨慎）、`ENV`、`EXPOSE`、`CMD`（容器默认命令，可被覆盖）、`ENTRYPOINT`（不可变入口，常配 `CMD` 传参）。
- **层缓存**：Docker 自底向上复用未变层的缓存；把**不常变**的（依赖安装）放前面、**常变**的（源码拷贝）放后面以最大化命中。
- **多阶段构建（multi-stage）**：`FROM ... AS build` 编译，`FROM slim` 再 `COPY --from=build` 只取产物，最终镜像不含编译工具链。
- **.dockerignore**：排除 `node_modules`、`.git`、本地配置，避免无谓打层与泄露。
- **最小化**：优先 `debian:slim`/`alpine`；`npm ci` 而非 `npm install` 保证锁版本可复现。
来源：Dockerfile reference https://docs.docker.com/reference/dockerfile/ ；Best practices https://docs.docker.com/build/building/best-practices/

## 为什么重要
镜像从 1.2GB 降到 80MB，意味着 CI 拉取、节点分发、启动都快一个数量级，且 CVE 暴露面骤减。多阶段构建是不把编译器带进生产的硬性要求。

## 常见坑
- 把所有指令写进一个 `RUN` 或反之每层都 `apt-get update` 导致缓存失效、镜像臃肿。
- 用 `ADD` 拉远程包却不校验，或把整个上下文 `COPY . .` 把密钥、缓存全烤进去。
- 忘了 `.dockerignore`，`node_modules` 被重复打入、覆盖镜像内依赖。
- `CMD` 写成 `CMD ["sh"]` 覆盖导致 `ENTRYPOINT` 收不到参数；混淆 `CMD` 与 `ENTRYPOINT` 语义。

## 动手自测
```dockerfile
# 多阶段构建示例
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node","dist/server.js"]
```
```bash
docker build -t app:1.0 . && docker images app   # 看最终体积
```

## 面试视角
- 层缓存规则？怎么排指令顺序最大化复用？
- 多阶段构建解决了什么问题？
- `CMD` 与 `ENTRYPOINT` 区别？`.dockerignore` 为何重要？

# op-c3-s3 | Docker 网络与存储卷
> direction: 容器间怎么互通、数据怎么不随容器消失。

## 心智模型
Docker 网络像给容器接**虚拟交换机**：默认 `bridge` 模式每个容器拿到独立 IP，通过网桥互通；`host` 模式则直接共用宿主机网络栈（无隔离、性能高）。存储则像给容器外接**移动硬盘（volume）**——数据写在盘上，容器删了盘还在，下次换个容器照样挂。

## 核心知识点（锚定官方）
- **网络驱动**：`bridge`（默认，docker0 网桥 + 容器 veth）、`host`（共享宿主机网络命名空间）、`none`（无网络）、`overlay`（跨主机，Swarm/K8s 用）、`macvlan`。
- **端口映射**：`-p 8080:80` 把宿主机 8080 转到容器 80；`-P` 随机映射 `EXPOSE` 端口。
- **卷（volume）**：`docker volume create`、`-v myvol:/data` 由 Docker 管理的持久存储，独立于容器生命周期；优于 `bind mount`（直接挂宿主机目录，权限/路径易乱）。
- **tmpfs**：`--tmpfs /tmp` 仅内存，敏感临时数据不落盘。
- **数据持久化原则**：任何需保留的状态（DB、日志、上传）必须挂 volume，绝不写容器层。
来源：Docker network https://docs.docker.com/network/ ；Docker volumes https://docs.docker.com/storage/volumes/ ；storage drivers https://docs.docker.com/storage/storagedriver/

## 为什么重要
容器层是易逝的——重启可能丢数据、扩缩容数据不跟随。搞错网络驱动会导致服务不可达或端口冲突；搞错存储会导致"数据库里数据一夜没了"。

## 常见坑
- 把数据库数据写进容器可写层，容器重建后数据全失。
- `bind mount` 用宿主机路径却权限不符（容器 uid 与宿主机不一），写入失败。
- `host` 网络模式端口冲突，或多容器抢同一宿主机端口。
- 在 overlay 网络未正确初始化时跨主机容器不通，误判为应用问题。

## 动手自测
```bash
docker network ls                          # 看网络
docker run -d --name db -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=x postgres
docker inspect db -f '{{json .Mounts}}'    # 确认卷挂载
docker run --rm --network host nginx       # host 模式
```

## 面试视角
- bridge 与 host 网络区别与适用场景？
- volume 与 bind mount 区别，为什么生产用 volume？
- 容器数据怎么持久化，写容器层会怎样？

# op-c3-s4 | Kubernetes 架构与核心组件
> direction: K8s 是一个声明式、自愈的"数据中心操作系统"。

## 心智模型
Kubernetes 像一家**自动化工厂的调度中枢**：你只递交"我要 3 个这样的容器常驻"的工单（声明），工厂自己找空地（节点）、拉起容器、坏了就重建、负载变了就扩缩。它由一堆各司其职的"部门"（控制平面组件）协作，目标是**让实际状态无限逼近你声明的期望状态**。

## 核心知识点（锚定官方）
- **控制平面（Control Plane）**：`kube-apiserver`（唯一入口、鉴权、CRUD）、`etcd`（唯一事实存储，强一致 KV）、`kube-scheduler`（按资源/亲和把 Pod 调度到节点）、`kube-controller-manager`（一堆控制器循环，如 ReplicaSet 控制器维持副本数）、`cloud-controller-manager`（对接云厂商）。
- **节点组件**：`kubelet`（节点代理，管本机 Pod 生命周期、上报状态）、`kube-proxy`（维护节点上的网络规则/iptables+IPVS，实现 Service 转发）、容器运行时（containerd/cri-o）。
- **声明式**：`kubectl apply -f` 提交期望；控制循环持续 reconcile。
- **Addons**：DNS（CoreDNS）、CNI 网络插件、Dashboard、Ingress Controller。
来源：Kubernetes 架构 https://kubernetes.io/docs/concepts/architecture/ ；Components https://kubernetes.io/docs/concepts/overview/components/ ；kube-apiserver

## 为什么重要
排障要知道"卡在 scheduler 还是 kubelet"；理解 etcd 是唯一存储就知道备份它等于备份整个集群状态；理解 reconcile 循环才能解释"为什么我删了 Pod 它又起来"。

## 常见坑
- etcd 没定期备份，控制平面故障后无法恢复集群状态（etcd 是单一事实源）。
- 以为 `kubectl delete pod` 能永久删掉——ReplicaSet 控制器会立刻重建，应改删上层 Workload。
- 控制平面组件（尤其 apiserver/etcd）资源受限，高负载下雪崩。
- CNI 插件未装或异常，导致 Pod 拿不到 IP、跨节点不通。

## 动手自测
```bash
kubectl get componentstatuses        # 老版本看控制面健康
kubectl get pods -n kube-system     # 系统组件
kubectl describe node <node>         # 看节点容量与已分配
etcdctl snapshot save snap.db       # 备份 etcd
```

## 面试视角
- 控制平面有哪些组件、各自职责？
- 为什么删了 Pod 又起来？reconcile 循环是什么？
- etcd 在 K8s 里扮演什么角色，为什么必须备份？

# op-c3-s5 | Pod 与 Workload 控制器
> direction: Pod 是最小调度单位，控制器决定"怎么跑、跑几个、要不要有状态"。

## 心智模型
**Pod 是 K8s 的最小原子**——一组共享网络/存储的紧密协作容器（如主容器+日志sidecar）。Pod 本身是"易逝的"（随时被调度走、被杀），所以你几乎不直接管 Pod，而是交给**控制器**当"保姆"：Deployment 管无状态多副本、StatefulSet 管有状态有序、DaemonSet 每节点一个、Job/CronJob 管一次性/定时任务。

## 核心知识点（锚定官方）
- **Pod**：共享 `localhost` 网络与 `volumes`；`restartPolicy`（Always/OnFailure/Never）；`initContainers` 先于主容器顺序执行。
- **Deployment**：通过 `ReplicaSet` 维持 `replicas` 副本数；支持滚动更新与回滚；`strategy: RollingUpdate` 配 `maxSurge`/`maxUnavailable`。
- **StatefulSet**：稳定网络标识（`pod-0/1` 固定名）、稳定持久存储（PVC 按序绑定）、有序部署/缩容；适合 DB、ZooKeeper。
- **DaemonSet**：每个（或匹配）节点跑一份，常用于日志采集、监控 agent。
- **Job/CronJob**：Job 跑完即止（`backoffLimit` 重试），CronJob 按 `schedule` 定时。
来源：K8s Pods https://kubernetes.io/docs/concepts/workloads/pods/ ；Workloads https://kubernetes.io/docs/concepts/workloads/controllers/

## 为什么重要
选错 Workload 类型会酿祸：把有状态服务用 Deployment 跑，Pod 重建后身份/存储乱套；用 DaemonSet 跑 Web 服务则每节点都暴露一份。理解差异是正确部署的前提。

## 常见坑
- 把数据库用 Deployment 跑，Pod 重建后 PVC 不匹配/数据错乱（应 StatefulSet）。
- `replicas` 设了但没配 `resource requests`，调度器无法合理排布，节点超卖。
- 混淆 `terminationGracePeriodSeconds` 默认 30s，长关闭任务被杀。
- 用 `kubectl run` 临时 Pod 当长期服务，无控制器托管，重启即失。

## 动手自测
```bash
kubectl create deployment web --image=nginx --replicas=3
kubectl scale deployment web --replicas=5
kubectl rollout status deployment/web
kubectl get pods -l app=web -o wide
```

## 面试视角
- Pod 与容器的关系？为什么需要 sidecar？
- Deployment 与 StatefulSet 区别与选型？
- ReplicaSet 如何维持期望副本数？

# op-c3-s6 | Service 与网络模型
> direction: Pod IP 会变，Service 给一组 Pod 一个稳定入口。

## 心智模型
Pod 像临时工，IP 随时变；**Service 是前台总机**——它有一个固定虚拟 IP（ClusterIP）和 DNS 名，把请求智能转发给背后当前存活的 Pod 们。对外暴露则像在总机前接了**不同型号的转接台**：NodePort（每节点开端口）、LoadBalancer（云厂商外部 IP）、Ingress（HTTP 路由层，按域名/路径分发）。

## 核心知识点（锚定官方）
- **Service 类型**：`ClusterIP`（集群内可达，默认）、`NodePort`（在每节点开 30000-32767 端口）、`LoadBalancer`（云厂商配外部 IP）、`ExternalName`（CNAME 到外部域名）。
- **kube-proxy**：实现 Service→Pod 转发，模式 `iptables`（默认、规则多时慢）或 `IPVS`（哈希、性能优）。
- **Endpoints/EndpointSlice**：Service 后端 Pod 的 IP 列表，由控制器按 `selector` 维护。
- **DNS**：CoreDNS 给 Service 解析 `<svc>.<ns>.svc.cluster.local`；同命名空间可省。
- **Ingress**：七层路由（host/path→Service），需 Ingress Controller（nginx/traefik）；`IngressClass` 指定实现。
来源：K8s Services https://kubernetes.io/docs/concepts/services-networking/service/ ；Ingress https://kubernetes.io/docs/concepts/services-networking/ingress/ ；DNS https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## 为什么重要
"服务间怎么调用""外部怎么进来""为什么有时请求到已死的 Pod"——都靠 Service 与 Endpoints 机制。配错 selector 会导致 Service 无后端（503），配错 Ingress 路径会路由错乱。

## 常见坑
- Service 的 `selector` 与 Pod 的 `labels` 不匹配，Endpoints 为空，调用 503。
- 用 NodePort 又在前端硬编码节点 IP，节点漂移后失联（应走 LoadBalancer/Ingress）。
- `sessionAffinity` 误用导致流量不均。
- Ingress `pathType` 用 `Prefix` 末斜杠语义错（`/foo` 与 `/foo/` 匹配范围不同），路由落空。

## 动手自测
```bash
kubectl expose deployment web --port=80 --target-port=8080
kubectl get svc web            # 看 ClusterIP
kubectl get endpoints web      # 看后端 Pod IP
kubectl run curlpod --rm -it --image=curlimages/curl -- sh -c 'curl http://web:80'
```

## 面试视角
- 为什么需要 Service，Pod IP 直接调用不行吗？
- ClusterIP/NodePort/LoadBalancer 区别？
- Service selector 不匹配会怎样？Ingress 与 Service 关系？

# op-c3-s7 | 配置与密钥管理
> direction: 把"会变的东西"从镜像里抽出来，配置与密钥分离。

## 心智模型
镜像应是**无味的可执行**，"哪个环境连哪个库、密钥是什么"不该烤进镜像。K8s 用 **ConfigMap** 装配置（非敏感，如配置文件、环境变量），用 **Secret** 装密钥（密码、token、证书）。它们像两张不同的便签，运行时贴到 Pod 上变成环境变量或挂载文件——改便签不必重打包镜像。

## 核心知识点（锚定官方）
- **ConfigMap**：`kubectl create configmap app --from-file=app.conf` 或 `--from-literal=k=v`；Pod 中以 `envFrom`/`valueFrom` 注入环境变量，或以 `volume` 挂载为文件（支持 `subPath` 单文件）。
- **Secret**：类型 `Opaque`（默认任意）、`docker-registry`、`tls`、`service-account-token`；数据 base64 编码（**非加密**，仅编码！）；etcd 中需开启静态加密（`kube-apiserver --encryption-provider-config`）。
- **不可变**：`immutable: true` 防止误改引发大面积滚动（K8s 1.19+）。
- **挂载更新**：挂载为 volume 的 CM/Secret 默认约 1 分钟（sync 周期）热更新；环境变量方式不自动更新，需重启。
- **敏感信息**：禁止把 Secret 写进镜像或 Git；用外部密钥管理（Vault、云 KMS/SealedSecrets/External Secrets）。
来源：K8s ConfigMap https://kubernetes.io/docs/concepts/configuration/configmap/ ；Secret https://kubernetes.io/docs/concepts/configuration/secret/ ；Secrets 安全 https://kubernetes.io/docs/concepts/configuration/secret/#security-properties

## 为什么重要
把密码烤进镜像会随镜像流传到任意人手里；把环境配置硬编码导致"换环境必须重打包"。CM/Secret 让"一份镜像，多环境配置"成为现实，且密钥可集中轮换。

## 常见坑
- 误以为 Secret base64 是加密，把明文密码当安全存进 Git（base64 一解就出）。
- 把大配置文件塞进 `--from-literal` 单行，难维护；应 `--from-file`。
- 改了 ConfigMap 但 Pod 用环境变量引用，没重启不生效，误以为配置没加载。
- Secret 未开启 etcd 静态加密，磁盘/备份泄露即泄密。

## 动手自测
```bash
kubectl create configmap app --from-file=app.conf
kubectl create secret generic db --from-literal=password=xxx
kubectl get secret db -o jsonpath='{.data.password}' | base64 -d; echo
kubectl describe pod mypod | grep -i 'config\|secret'   # 确认已挂载
```

## 面试视角
- ConfigMap 与 Secret 区别？Secret 是加密的吗？
- 改了 ConfigMap，Pod 多久感知、为何环境变量方式不自动更新？
- 为什么生产密钥不该进 Git/镜像，外部方案有哪些？

# op-c3-s8 | 健康检查、滚动更新与回滚
> direction: 让 K8s 知道"活着没、能接客没、坏了自动换"。

## 心智模型
K8s 给每个容器装了**两种体检**：`livenessProbe`（"还活着吗"——不通过就重启容器）、`readinessProbe`（"能接客吗"——不通过就从 Service 后端摘掉，但不杀）。发布新版本像**换班**：滚动更新一个个把老 Pod 换成新的，一旦新班体检测出事，立刻 `rollback` 退回上一版——全程用户几乎无感。

## 核心知识点（锚定官方）
- **探针类型**：`exec`（执行命令）、`httpGet`（GET 路径）、`tcpSocket`（端口可达）；参数 `initialDelaySeconds`/`periodSeconds`/`timeoutSeconds`/`failureThreshold`。
- **livenessProbe**：失败→kubelet 重启该容器（注意别把"启动慢"误判死亡导致重启循环）。
- **readinessProbe**：失败→从 Service Endpoints 移除，流量不再进；适合依赖未就绪场景。
- **startupProbe**（1.18+）：保护慢启动，期间禁用 liveness，避免启动期被误杀。
- **发布与回滚**：`kubectl set image` 触发滚动；`maxSurge`/`maxUnavailable` 控节奏；`kubectl rollout status`/`undo` 查看与回滚；`revisionHistoryLimit` 保留历史。
来源：K8s probes https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes ；Deployments rollout https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## 为什么重要
没 readinessProbe，Pod 刚起（依赖还没连上）就被灌流量→大量 5xx；没 livenessProbe，死锁的容器永远挂着不恢复。滚动更新与回滚是零停机发布的基石。

## 常见坑
- liveness 探针用 `/healthz` 但把"依赖 DB 不可达"也算死亡→DB 抖动时所有 Pod 被循环重启、雪崩。
- readiness 阈值 `failureThreshold` 太小，短暂抖动即摘除，流量大幅跳动。
- 滚动更新 `maxUnavailable:0` + `maxSurge` 不足，发布卡住无新 Pod 起来。
- 忘了 `revisionHistoryLimit`，回滚时发现旧 ReplicaSet 已被清掉无法回。

## 动手自测
```yaml
livenessProbe:
  httpGet: { path: /healthz, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /ready, port: 8080 }
  periodSeconds: 5
```
```bash
kubectl set image deploy/web web=nginx:1.27
kubectl rollout status deploy/web
kubectl rollout undo deploy/web --to-revision=2
```

## 面试视角
- liveness 与 readiness 探针的区别与误用后果？
- 滚动更新如何做到零停机？maxSurge/maxUnavailable 含义？
- 发布后发现新版本有 bug，如何快速回滚？

# op-c3-s9 | 资源限制、调度与排障
> direction: 给容器"定粮"、让调度器"排座"、出问题时"看病"。

## 心智模型
K8s 调度像**电影院排座**：你给每个 Pod 申报"最少要多少座（requests）"和"最多占多少（limits）"，调度器据此找能容纳的节点。资源超限会被"请出场"（OOM Kill / CPU 节流）。出问题时用 `kubectl` 这把"听诊器"——看事件、看日志、进容器、查调度失败原因，逐层定位。

## 核心知识点（锚定官方）
- **requests/limits**：`resources.requests.cpu/memory` 用于调度决策与 QoS；`limits` 封顶（CPU 可节流、memory 超限触发 OOM Kill）。单位：`cpu` 用 `100m`=0.1 核，`memory` 用 `Mi/Gi`。
- **QoS 等级**：`Guaranteed`（req=limit）最高优先级、`Burstable`、`BestEffort`（无 req/lim）最易被驱逐。节点内存压力时按 QoS 逐出。
- **调度约束**：`nodeSelector`、`affinity`/`anti-affinity`（Pod 亲和/反亲和，如打散）、`taints`/`tolerations`（节点污点排斥，需容忍才调度上）。
- **排障命令**：`kubectl describe pod`（事件/调度失败原因）、`kubectl logs -f`、`kubectl exec -it -- sh`、`kubectl get events --sort-by=.lastTimestamp`、`kubectl top pod/node`。
来源：K8s 资源管理 https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ ；调度 https://kubernetes.io/docs/concepts/scheduling-eviction/ ；kubectl 排障 https://kubernetes.io/docs/tasks/debug/debug-application/

## 为什么重要
不设 requests 调度器盲排→节点超卖→互相抢资源集体变慢；不设 limits→单个 Pod 吃光节点内存拖垮同机所有负载。懂调度与 QoS 才能既高密度又稳。

## 常见坑
- 只设 limits 不设 requests，调度器按 0 请求排，节点超卖严重。
- memory limits 设太小，流量高峰 OOM Kill 循环；又设太大则节点装不下、Pending。
- `anti-affinity` 表达错导致无法满足，Pod 一直 Pending。
- 排障只看 `logs` 不看 `describe` 的事件，漏掉 "FailedScheduling/ImagePullBackOff" 根因。

## 动手自测
```bash
kubectl top node                 # 节点资源使用
kubectl describe pod web-xxx     # 看 Events 找调度/启动失败
kubectl get events --sort-by=.lastTimestamp -n app
kubectl logs web-xxx -c main --previous   # 看上一个死掉的容器日志
kubectl exec -it web-xxx -c main -- sh
```

## 面试视角
- requests 与 limits 区别？都不设会怎样？
- QoS 三等级与驱逐顺序？
- Pod 一直 Pending，怎么排查（describe events）？
