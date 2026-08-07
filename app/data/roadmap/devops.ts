import { grp, COMMON, type Direction } from './types'

export const devops: Direction = {
  id: 'devops',
  name: '运维',
  color: '#f59e0b',
  subTracks: [
    {
      id: 'op-trad',
      name: '运维工程师（传统）',
      icon: 'settings',
      summary: '保障服务器、网络与业务系统稳定运行，运维入行的通用底座。',
      levels: [
        grp('junior', [
          { ...COMMON.linux, must: true },
          { ...COMMON.shell, must: true },
          { ...COMMON.net },
          { name: '服务器与机房基础', desc: '硬件构成、RAID、IPMI 带外管理与基础巡检。' },
          { name: 'Nginx 部署与配置', desc: '反向代理、负载均衡、HTTPS 证书与常用调优。' },
        ]),
        grp('mid', [
          { name: '监控告警体系', desc: 'Prometheus / Zabbix 指标采集、告警规则与降噪。', must: true },
          { ...COMMON.docker },
          { name: '中间件运维调优', desc: 'MySQL / Redis / 消息队列的部署、参数与巡检。' },
          { name: '备份与容灾演练', desc: '备份策略、异地容灾、恢复演练与 RTO / RPO。' },
          { name: '故障排查与应急响应', desc: '按链路分层定位、常用排查命令、止血优先原则。' },
        ]),
        grp('senior', [
          { name: '稳定性与 SLA 保障', desc: 'SLA 定义、可用性度量、重大保障与预案体系。', must: true },
          { name: '容量规划与成本优化', desc: '资源基线、压测评估、下线与规格优化。' },
          { name: '变更管理与值班流程', desc: '变更三板斧、审批与灰度、值班交接与复盘机制。' },
          { name: '自动化运维平台推广', desc: '批量作业、堡垒机、配置管理与人工操作收敛。' },
        ]),
      ],
    },
    {
      id: 'op-k8s',
      name: '云原生 / Kubernetes 工程师',
      icon: 'cloud',
      summary: '以 Kubernetes 为核心的容器平台建设与运维 —— 2026 云原生运维岗位的硬门槛，JD 普遍写明「K8s 必须」。',
      levels: [
        grp('junior', [
          { ...COMMON.docker, must: true },
          { ...COMMON.k8sCore, must: true },
          { name: 'kubectl 与 YAML 编排', desc: '声明式配置、apply 与 diff、常用排查命令组合。' },
          { name: 'Pod 生命周期与探针', desc: '初始化容器、启动 / 存活 / 就绪探针、重启策略与退出码。' },
          { name: '容器镜像与仓库管理', desc: '多阶段构建、镜像瘦身、私有仓库与拉取凭证。' },
        ]),
        grp('mid', [
          { name: 'Deployment 与滚动发布', desc: '副本控制、滚动更新与回滚、StatefulSet 与 DaemonSet 差异。', must: true },
          { name: 'Service 与 Ingress 流量入口', desc: 'ClusterIP / NodePort / LoadBalancer、Ingress Controller 与路由规则。', must: true },
          { name: '配置与密钥管理', desc: 'ConfigMap / Secret 挂载与热更新、外部密钥管理集成。' },
          { name: '存储卷与 CSI', desc: 'PV / PVC 与 StorageClass、动态供给、有状态应用数据持久化。' },
          { name: 'RBAC 与命名空间隔离', desc: 'ServiceAccount、Role 与 Binding、多租户资源隔离。' },
          { name: 'Helm 包管理', desc: 'Chart 结构与模板语法、values 分环境、发布与回滚。' },
          { name: 'HPA 与资源配额', desc: 'requests / limits、自动扩缩容、ResourceQuota 与 LimitRange。' },
        ]),
        grp('senior', [
          { name: 'K8s 调度与亲和性策略', desc: '调度器原理、节点亲和与反亲和、污点容忍与拓扑分布。', must: true },
          { name: 'CNI 网络模型与排障', desc: 'Pod 网络与 Service 转发链路、Calico / Cilium、跨节点通信问题定位。', must: true },
          { name: 'Operator 与 CRD 扩展', desc: '自定义资源、控制器循环、用代码沉淀运维经验。' },
          { name: '多集群与联邦管理', desc: '集群规划、跨集群发布与容灾、统一控制面。' },
          { name: '服务网格 Istio', desc: 'Sidecar 流量治理、mTLS、灰度与可观测能力。' },
        ]),
      ],
    },
    {
      id: 'op-sre',
      name: 'SRE 工程师',
      icon: 'activity',
      summary: '以软件工程手段提升系统可靠性与效率，用代码而非人力兜底稳定性。',
      levels: [
        grp('junior', [
          { name: '可观测三支柱', desc: '日志 / 指标 / 链路的定位差异与采集方式。', must: true },
          { ...COMMON.shell },
          { ...COMMON.k8sCore },
          { name: '告警响应与值班', desc: '告警分级、响应时效、上报路径与信息同步。' },
        ]),
        grp('mid', [
          { name: 'SLO 与错误预算', desc: 'SLI 选取、SLO 设定、错误预算消耗驱动发布节奏。', must: true },
          { name: '基础设施即代码 IaC', desc: 'Terraform / Ansible 声明式管理，环境可重建可审计。' },
          { name: '自动化故障自愈', desc: '自愈脚本与预案编排、幂等与安全边界。' },
          { name: '容量评估与弹性伸缩', desc: '压测建模、峰值预估、自动扩缩与冗余度设计。' },
          { name: '发布策略与灰度', desc: '蓝绿、金丝雀、特性开关与快速回滚。' },
        ]),
        grp('senior', [
          { name: '混沌工程与韧性设计', desc: '故障注入实验、稳态假设、韧性架构与降级设计。', must: true },
          { name: '故障复盘与改进闭环', desc: '无指责复盘、根因分析、改进项跟踪与验证。' },
          { name: '可观测平台建设', desc: '统一采集与存储、指标标准化、成本与查询性能。' },
          { name: '可靠性文化推动', desc: '跨团队协作机制、稳定性考核、经验沉淀与培训。' },
        ]),
      ],
    },
    {
      id: 'op-cloud',
      name: '云平台工程师',
      icon: 'server',
      summary: '公有云 / 私有云的资源、网络、成本与安全治理。',
      levels: [
        grp('junior', [
          { name: '云计算基础与常用产品', desc: 'IaaS / PaaS 概念、计算存储网络三大类产品的选型。', must: true },
          { name: 'VPC 与安全组配置', desc: '网段规划、子网与路由、安全组与网络 ACL。', must: true },
          { name: '云主机与存储运维', desc: '实例规格、镜像与快照、对象存储与生命周期。' },
          { name: '云监控与告警配置', desc: '云厂商监控指标、告警通道与自定义监控上报。' },
        ]),
        grp('mid', [
          { name: 'Terraform 基础设施编排', desc: 'HCL 语法、state 管理、模块复用与变更评审。', must: true },
          { name: '托管 Kubernetes 服务', desc: 'ACK / TKE / EKS 的集群运维、节点池与云组件集成。' },
          { name: '云上负载均衡与 CDN', desc: '四层七层负载、健康检查、CDN 缓存与回源策略。' },
          { name: '云成本分析与优化', desc: '账单拆分、预留与竞价实例、闲置资源识别。' },
          { name: '云上备份与容灾', desc: '快照策略、跨区域复制、灾备切换演练。' },
        ]),
        grp('senior', [
          { name: '多账号多区域云架构', desc: '账号体系与统一权限、跨区域部署与流量调度。', must: true },
          { name: '混合云与专线互联', desc: '专线 / VPN 组网、混合部署与统一运维视图。' },
          { name: '云安全合规基线', desc: '最小权限、审计日志、合规检查与自动修复。' },
          { name: '云原生迁移方案设计', desc: '上云评估、迁移路径、割接方案与回退预案。' },
        ]),
      ],
    },
    {
      id: 'op-devops',
      name: '运维开发 / DevOps 平台',
      icon: 'git',
      summary: '建设 CI/CD、流水线与企业研发效能平台，把运维能力产品化。',
      levels: [
        grp('junior', [
          { name: 'CI 流水线基础', desc: 'Jenkins / GitLab CI 的 Job、Runner、构建与产物。', must: true },
          { ...COMMON.git, must: true },
          { name: '运维工具脚本开发', desc: '用 Python / Go 编写自动化工具与运维小平台。' },
          { name: '制品与版本管理', desc: '版本号规范、制品库、构建可追溯。' },
        ]),
        grp('mid', [
          { name: '流水线设计与发布门禁', desc: '多阶段编排、并行与缓存、质量门禁与审批卡点。', must: true },
          { name: 'GitOps 与 ArgoCD', desc: '声明式发布、集群状态同步、Git 作为唯一事实源。' },
          { name: '镜像仓库与制品安全', desc: 'Harbor 权限与复制、镜像扫描与签名验签。' },
          { name: '多环境配置管理', desc: '配置分离与模板化、环境一致性、密钥注入。' },
          { name: '自动化测试接入流水线', desc: '单元与接口测试编排、报告归档、失败拦截策略。' },
        ]),
        grp('senior', [
          { name: '一站式研发效能平台', desc: '需求到发布全链路打通、自助化与权限模型。', must: true },
          { name: 'DORA 指标与持续交付', desc: '部署频率、变更前置时间、失败率与恢复时长度量。' },
          { name: '平台化与自助服务', desc: '内部开发者平台 IDP、模板化交付与黄金路径。' },
          { name: '工具链整合与推广', desc: '工具选型与打通、迁移方案、落地度量与培训。' },
        ]),
      ],
    },
    {
      id: 'op-sec',
      name: '安全运维工程师',
      icon: 'shield',
      summary: '防护、检测与响应，保障系统与数据安全，满足等保与合规要求。',
      levels: [
        grp('junior', [
          { name: '常见漏洞与加固基线', desc: '系统与服务加固、端口收敛、补丁管理与基线检查。', must: true },
          { ...COMMON.owasp },
          { name: '安全日志采集与审计', desc: '日志集中收集、留存要求、初筛与可疑行为识别。' },
          { name: '安全设备与策略基础', desc: '防火墙、堡垒机、终端防护的部署与策略配置。' },
        ]),
        grp('mid', [
          { name: '主机与网络防护', desc: 'WAF 规则、DDoS 防护、主机入侵防护与微隔离。', must: true },
          { name: '漏洞扫描与修复闭环', desc: '资产测绘、定期扫描、风险定级与修复跟踪。' },
          { name: '入侵检测与异常分析', desc: 'IDS / HIDS 告警研判、行为基线与威胁情报。' },
          { name: '容器与镜像安全', desc: '镜像漏洞扫描、运行时防护、K8s 安全策略。' },
          { name: '密钥与凭证管理', desc: 'Vault / KMS、密钥轮转、代码与配置中的密钥泄露治理。' },
        ]),
        grp('senior', [
          { name: '零信任与纵深防御架构', desc: '身份为中心的访问控制、分层防护与最小权限落地。', must: true },
          { name: '安全应急响应与溯源', desc: '事件分级处置、取证与溯源、止损与复盘。' },
          { name: '等保合规与安全审计', desc: '等保 2.0 要求、合规差距分析与整改推进。' },
          { name: '安全左移与研发融合', desc: 'SAST / DAST / SCA 接入流水线、安全需求与设计评审。' },
        ]),
      ],
    },
  ],
}
