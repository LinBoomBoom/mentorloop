// M5 运维 VIP 卷 · 笔试题
export const opWritten = [
  { id: 'm5-op3-w1', q: '请设计一套 K8s 上的高可用 Web 服务部署方案，涵盖 Deployment/Service/Ingress、资源限制、健康检查与滚动更新策略。',
    points: ['Deployment 多副本 + 反亲和打散节点', 'Service ClusterIP + Ingress 七层路由/TLS', 'resources requests/limits 防饿死', 'liveness/readiness 探针', '滚动更新 maxSurge/maxUnavailable 与就绪门控'],
    reference: 'Deployment 起多副本并用 podAntiAffinity 打散到不同节点/可用区；Service(ClusterIP) 聚合后端，Ingress 做域名路由与 TLS 终止；requests/limits 避免资源争抢与节点雪崩；liveness 探针重启异常容器、readiness 探针控制流量接入；滚动更新设 maxSurge/maxUnavailable 并用 readiness 门控，确保新版本就绪后才切流、失败可自动回滚。' },
  { id: 'm5-op3-w2', q: '一个 Pod 处于 CrashLoopBackOff，请给出系统化排查路径与常见根因。',
    points: ['看 kubectl describe 事件与退出码', '看容器日志与上次退出原因', '检查就绪/存活探针配置', '查资源限制/OOMKilled', '查依赖与配置/Secret 挂载'],
    reference: '路径：① kubectl describe pod 看 Events（拉镜像失败、探针失败、调度失败）；② kubectl logs --previous 看上一次崩溃日志与退出码；③ 退出码 137=OOM，需调大 limits 或优化内存；④ 探针阈值过严会误杀，需放宽 initialDelay；⑤ 配置/Secret 缺失或依赖服务不通导致启动即退。定位后用 kubectl exec 或临时 sleep 镜像进容器复核。' },
  { id: 'm5-op3-w3', q: '请设计一条生产级 CI/CD 流水线，包含代码扫描、测试、镜像构建、多环境发布与质量门禁。',
    points: ['代码扫描（lint/SCA/secret 检测）', '单元/集成测试 + 覆盖率门禁', '多阶段构建镜像并推仓库', '预发验证 + 金丝雀/蓝绿发布', '发布审批与一键回滚'],
    reference: '阶段：1) 提交触发 lint + 依赖漏洞(SCA) + 密钥泄露扫描，失败阻断；2) 单元/集成测试，覆盖率不达标阻断；3) 多阶段构建镜像，打 tag 推私有仓库；4) 部署预发做冒烟，再按金丝雀/蓝绿放量到生产；5) 关键发布加人工审批，且保留上一个可用版本支持一键回滚；全链路指标驱动。' },
  { id: 'm5-op3-w4', q: '如何为微服务集群搭建可观测体系？请说明指标、日志、链路三类数据如何采集、关联与落地告警。',
    points: ['指标：Prometheus 拉取 + Grafana 看板', '日志：采集结构化日志集中检索', '链路：OpenTelemetry 注入 traceId', '用 traceId/资源标签关联三类', '基于 SLO 配置告警与Error Budget'],
    reference: '指标用 Prometheus 拉取 exporter、Grafana 出看板；日志侧采集结构化日志入 ES/Loki 并打 service/pod 标签；链路用 OpenTelemetry 自动注入 traceId 贯穿请求。三类通过 traceId 与资源标签关联，实现“指标告警→链路定位慢调用→日志看上下文”的闭环。告警基于 SLI/SLO，配 Error Budget 防止过度告警。' },
  { id: 'm5-op3-w5', q: '请描述一次典型生产事故的标准响应流程（Incident Response），含角色分工、沟通与复盘。',
    points: ['检测与确认（监控/告警）', '指定 Incident Commander 与角色', '止血（回滚/扩容/限流）优先于根因', '实时沟通与状态页', '事后无责复盘（Timeline/根因/Action）'],
    reference: '流程：①监控/用户报障触发告警，确认影响面；②拉起应急响应，指定 Incident Commander 统筹，分工通信/修复/干系人沟通；③优先止血（回滚、扩容、降级、限流），而非当场查根因；④通过状态页/群同步进展；⑤事后 48h 内无责复盘（blameless postmortem），梳理 Timeline、根因、 corrective actions 并跟进闭环。' }
]
