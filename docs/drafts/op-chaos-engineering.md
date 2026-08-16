# 试点草稿 · 混沌工程与故障演练：AWS FIS 与 Game Day（op-c11）

> 状态：W3.2 批量草稿（第 2 批）· 待审阅 · 生成日期 2026-08-16
> 生产方式：基于官方站**真实抓取资料**组织 v1 学习层（代行策展），非凭训练记忆编造。
> 抓取来源（HTTP 200，已抓取真实正文）：
> - AWS Fault Injection Service 文档「What is AWS FIS?」— `https://docs.aws.amazon.com/fis/latest/userguide/what-is.html`（5384 字）
> - 说明：混沌工程通用"原则框架"（稳定状态假设 / 真实世界事件变量 / 生产环境运行 / 最小化爆炸半径）属业界广泛引用的公共方法论，其权威出处为 `principlesofchaos.org`；本稿**未抓取该站**（沙箱未探活），仅作为补充参考标注，**未据其编造具体事实**。

---

## 第11章 · 混沌工程与故障演练

**章目标**：理解混沌工程不是"搞破坏"而是"受控体检"——能用 AWS FIS 这类官方托管服务把混沌原则落成可执行的故障注入实验；掌握实验解剖（模板/动作/目标/停止条件/护栏）；把故障演练（Game Day）变成与 SRE 稳定性衔接的定期组织行为。

---

### op-c11-s1 · 混沌工程是什么（基于 AWS FIS 的官方定义）

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方（AWS FIS）

> 心智模型：混沌工程像**"给系统做受控压力体检"**——不等它真崩，而是主动制造**可控的小故障**，看系统在真实扰动下是否还按预期工作；发现弱点，再加固，让它在真实事故里更扛造。

## 心智模型
混沌工程（chaos engineering）的核心，是**通过对系统注入故障来主动发现弱点**。AWS 官方的定位最直接：AWS Fault Injection Service (AWS FIS) 是一项托管服务，能对你的 AWS 工作负载执行**故障注入（fault injection）实验**；而故障注入**"基于混沌工程的原则"**——通过制造干扰事件给应用加压，让你观察应用如何响应，进而改进性能与弹性（resiliency），使其行为符合预期。

## 核心知识点（锚定官方）
- **故障注入实验的目的**：制造真实世界的扰动条件，暴露平时难以发现的应用问题。
- **AWS FIS 是托管故障注入服务**：基于混沌工程原则，对 AWS 资源执行真实动作。
- **生产护栏**：AWS FIS 提供在生产运行实验所需的**控制与护栏**（如满足特定条件时自动回滚/停止实验）。
- **强烈建议先规划、先在 pre-prod 跑**：AWS FIS 会对你系统里的**真实 AWS 资源执行真实动作**，生产前务必完成规划阶段并在预生产环境验证。
- **业界通用原则框架（补充参考，非本次抓取源）**：建立稳定状态假设、用真实世界事件的变量、在生产或类生产环境运行、最小化爆炸半径。本稿仅作框架性提示，具体事实请以 `principlesofchaos.org` 等官方资料为准（待补抓取）。

> 来源：[AWS FIS · What is AWS Fault Injection Service?](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html)

## 为什么重要 / 何时会用到
你永远无法在"一切正常"的测试里证明系统在"故障中"也正常。混沌工程把"我们觉得它很稳"变成"我们真的验证过它在某些故障下仍稳"——这是 SRE/稳定性（op-c5 已建 SLO）从理论走向验证的关键手段。

## 常见坑
- **把混沌工程当"随机搞破坏"**：没有假设、没有观测指标、没有护栏，只是制造事故。
- **只在测试环境跑、从不逼近生产**：测出的"稳"不等于生产稳（数据/流量/依赖都不同）。
- **没有护栏就上生产**：缺少自动停止条件，小故障被放大成真事故。
- **和 SRE 脱节**：演练不与 SLO/错误预算挂钩，发现的问题没人跟进加固。

## 动手自测
1. 读 AWS FIS 文档「Planning your experiments」，为自己负责的一个服务写一条"稳定状态假设"（如"在注入 CPU 压力期间，p99 延迟不超过 X、错误率不超过 Y"）。
2. 在 pre-prod 用 AWS FIS 跑一个最小实验（如终止一个非关键实例），验证观测与回滚链路可用。
3. 把实验结论回填到该服务的 SLO 评估，确认是否需要调整告警阈值或扩容策略。

## 面试视角
"什么是混沌工程？和普通的故障测试有什么区别？"答：混沌工程是基于假设的受控故障注入，目的是在真实扰动下验证系统韧性，而非验证某个具体 bug；关键是有假设、有观测、有护栏、逼近生产。"为什么需要停止条件？"答：防止演练本身演变成真实事故，爆炸半径必须可控。

## 相关知识图谱
- [op-c5 SRE 与稳定性](doc:devops/op-c5/op-c5-sX) — SLO/错误预算是演练的验收标尺
- [op-c11-s2 故障注入实验解剖](doc:devops/op-c11/op-c11-s2) — 把原则落成可执行实验
- [op-c11-s3 故障演练与 Game Day](doc:devops/op-c11/op-c11-s3) — 组织化落地

---

### op-c11-s2 · 故障注入实验解剖（AWS FIS 实验模板 / 动作 / 目标 / 停止条件）

> 时效 | 核验=2026-08-16 | 风险=低 | 来源=官方（AWS FIS）

> 心智模型：一个故障注入实验像**"一份带护栏的破坏剧本"**——剧本（experiment template）写清楚要打谁（targets）、怎么打（actions）、打到什么程度必须喊停（stop conditions），照着演，且随时能一键 cut。

## 心智模型
在 AWS FIS 里，你通过**在 AWS 资源上运行实验来检验"系统在故障条件下会如何表现"的假设**。运行实验前先创建 **experiment template（实验模板）**——它是实验的蓝图（blueprint），包含 **actions（动作）/ targets（目标）/ stop conditions（停止条件）**。实验在模板所有 action 都跑完后结束。

## 核心知识点（锚定官方）
- **experiment template = 蓝图**：包含 actions、targets、stop conditions 三要素。
- **actions（动作）**：AWS FIS 在实验中对 AWS 资源执行的活动；按资源类型提供**预配置动作集**；每个 action 运行指定**时长**，或直到你手动停止；可**顺序或并行（simultaneously）**执行。
- **targets（目标）**：被施加 action 的一个或多个 AWS 资源；可按**标签（tags）或状态（state）**等条件选择一组资源，也可指定具体资源。
- **stop conditions（停止条件）**：用 **Amazon CloudWatch alarm 阈值**定义的机制；实验运行中一旦触发，AWS FIS **自动停止**实验——这是生产护栏的核心。
- **guardrails**：AWS FIS 提供在生产运行实验所需的控制与护栏（自动回滚/停止）。
- **multi-account experiments**：target 可跨不同 AWS 账户（单账户实验要求目标与实验同账户）。
- **访问方式**：AWS 管理控制台 / CLI（fis）/ CloudFormation / SDK / HTTPS API。

> 来源：[AWS FIS · What is AWS Fault Injection Service?](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html)

## 为什么重要 / 何时会用到
把"混沌原则"落成可审计、可重复、可紧急中止的工程动作。没有这套解剖结构，故障演练就会退化成不可控的手动操作；有了 template + stop conditions，你才能在生产安全做验证。

## 常见坑
- **只配 actions 不配 stop conditions**：实验一旦失控无法自动止血。
- **targets 选太宽**：一个标签匹配到整个生产集群，爆炸半径失控。
- **动作时长估错**：action duration 设太长，故障窗口超出可接受范围。
- **不先 pre-prod 验证模板**：模板逻辑错误直接在生产触发大面积故障。

## 动手自测
1. 在 AWS FIS 控制台创建一条 experiment template：target 用 `env=staging` 标签、action 为终止一个实例、stop condition 绑定一个"该服务错误率"CloudWatch alarm。
2. 先对一个 staging 资源运行，确认 stop condition 能在 alarm 触发时自动停。
3. 把 action 改成并行（simultaneously）多个只读型扰动，验证"顺序 vs 并行"对观测的影响。

## 面试视角
"AWS FIS 实验由哪几部分组成？"答：experiment template 含 actions（对资源执行的预配置动作，可顺序/并行、有 duration）、targets（按 tag/state 选中的资源）、stop conditions（CloudWatch alarm 触发的自动停止）。"护栏怎么保证不上生产就出事？"答：stop conditions 自动止血 + 官方强烈建议先 pre-prod 规划验证。

## 相关知识图谱
- [op-c11-s1 混沌工程是什么](doc:devops/op-c11/op-c11-s1) — 原则落到实验
- [op-c11-s3 故障演练与 Game Day](doc:devops/op-c11/op-c11-s3) — 实验的组织化运营
- [op-c5 SRE 与稳定性](doc:devops/op-c5/op-c5-sX) — 停止条件常绑 SLO 告警

---

### op-c11-s3 · 故障演练与 Game Day 落地（与 SRE 稳定性衔接）

> 时效 | 核验=2026-08-16 | 风险=中 | 来源=官方（AWS FIS 护栏部分）+ 通用 SRE 实践（建议补官方资料）

> 心智模型：Game Day 像**"定期的消防演习"**——把混沌工程从一次性的技术实验，变成团队约定好的、有剧本有复盘的训练；演习完了要改真问题，否则就是演给领导看。

## 心智模型
故障演练（failure drill / Game Day）是把混沌工程**变成定期组织行为**：团队约定时间、按剧本注入可控故障、全员观测与响应、事后复盘并跟进加固项。它和 SRE 稳定性（op-c5 的 SLO / 错误预算）天然衔接——演练验证的是"在故障下 SLO 是否仍能守住"。

## 核心知识点（锚定官方 + 通用实践标注）
- **AWS FIS 官方护栏要点（已抓取）**：实验前必须规划、先在 pre-production 环境运行；对真实资源执行真实动作；用 stop conditions 兜底自动停止；支持 multi-account 演练。
- **Game Day 通用落地要点（通用 SRE 实践，非本次抓取，建议补各云官方 SRE/可靠性资料）**：
  - **递进式**：先在 pre-prod 验证 → 再类生产 → 最后生产；不要一上来就生产全量。
  - **最小化爆炸半径**：小范围 target + 明确 stop condition，确保可控。
  - **明确假设与观测**：演练前写清"我们假设 X 故障下，指标 Y 不超阈"，演练中盯 Y。
  - **事后复盘 + 跟进**：产出加固项并排入 backlog，闭环才叫演练，否则是表演。
  - **与 SLO 挂钩**：用错误预算决定演练频率与激进程度，避免演练本身耗尽预算。

## 为什么重要 / 何时会用到
很多团队"平时测得好好的，一故障就手忙脚乱"——因为从没在受控环境下练过响应。Game Day 把"应急响应"从临场发挥变成肌肉记忆，也让 SLO 从纸面指标变成真实验证。

## 常见坑
- **只演练不跟进**：复盘结论没人落地，下次同样翻车。
- **爆炸半径失控**：没有 stop condition / target 过宽，演习变事故。
- **和 SLO 脱节**：不拿错误预算约束，演练频率/激进度全凭感觉。
- **只技术不组织**：只让平台组跑，业务/ONCALL 不参与，真出事仍不会协同。

## 动手自测
1. 选一个核心服务，约一次 1 小时 Game Day：写假设（注入依赖延迟后错误率 < 5%）、配 AWS FIS 实验（小 target + stop condition）、全员观测、复盘写 3 条加固项。
2. 把加固项接入该服务 backlog，并在下个迭代回顾里确认关闭。
3. 用错误预算决定是否下月提高演练激进度（如从单实例终止到多可用区网络分区）。

## 面试视角
"Game Day 和一次混沌实验的区别？"答：Game Day 是组织化的定期演练，含剧本、全员响应、复盘闭环，并和 SLO/错误预算挂钩；单次实验偏技术验证。"怎么保证演练不出事？"答：递进式环境 + 最小爆炸半径 + stop condition 自动止血 + 明确假设与观测。

## 相关知识图谱
- [op-c11-s1 混沌工程是什么](doc:devops/op-c11/op-c11-s1) — 原则
- [op-c11-s2 故障注入实验解剖](doc:devops/op-c11/op-c11-s2) — 可执行实验
- [op-c5 SRE 与稳定性](doc:devops/op-c5/op-c5-sX) — SLO/错误预算是验收标尺

---

## 代行策展说明（供你审阅）
- 事实锚定已抓取的 **AWS FIS 官方正文**（HTTP 200）：故障注入定义、experiment template/actions/targets/stop conditions、护栏与 pre-prod 建议均源自该文档。
- "混沌工程通用原则框架"与"Game Day 通用落地要点"属业界公共方法论/通用 SRE 实践，**明确标注为补充参考、非本次抓取源、未编造具体事实**；建议后续补 `principlesofchaos.org` 及各云官方 SRE 资料以强化信源。
- 若认可，我将在你确认后按现有 seed schema 写入 `data/seed-content.json` 的 `devops` 模块下 `op-c11`，并跑 `_reseed.mjs` 校验无漂移。
