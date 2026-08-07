import { grp, COMMON, type Direction } from './types'

export const ai: Direction = {
  id: 'ai',
  name: 'AI 工程',
  color: '#8b5cf6',
  subTracks: [
    {
      id: 'ai-app',
      name: 'AI 应用工程师（LLM / RAG / Agent）',
      icon: 'robot',
      summary: '把大模型能力落地为可产品化的应用，转型门槛最低、需求增长最快的 AI 岗位。',
      levels: [
        grp('junior', [
          { name: 'Prompt 工程', desc: '清晰指令、Few-shot、角色设定、思维链与输出约束。', must: true },
          { name: '大模型 API 调用', desc: 'OpenAI 兼容接口、流式输出、token 计费与超时重试。', must: true },
          { name: '基础 RAG 检索问答', desc: '文档切分、向量化、相似检索并拼接上下文回答。' },
          { name: '向量数据库入门', desc: 'Chroma / Milvus / pgvector 的写入、检索与元数据过滤。' },
          { name: 'AI 应用界面开发', desc: '对话式交互、流式渲染、会话管理与错误提示。' },
        ]),
        grp('mid', [
          { name: 'RAG 进阶优化', desc: '切分策略、查询改写、重排序、混合检索与引用溯源。', must: true },
          { name: 'Agent 工具调用与规划', desc: 'Function Calling、ReAct 与规划循环、失败重试与终止条件。', must: true },
          { name: '多轮对话与记忆管理', desc: '上下文压缩、长期记忆存储、会话状态与人设一致性。' },
          { name: 'AI 效果评估与回流', desc: '评测集构建、自动打分与人工标注、badcase 闭环。' },
          { name: 'AI 应用工程化', desc: '缓存与限流、超时降级、可观测与成本监控。' },
          { name: '结构化输出与容错', desc: 'JSON Schema 约束、解析失败兜底、字段级校验。' },
        ]),
        grp('senior', [
          { name: '多 Agent 编排架构', desc: '角色分工与协作协议、任务拆解、状态机与人工介入点。', must: true },
          { name: '模型选型与成本优化', desc: '开闭源对比、路由分级调用、蒸馏与缓存降本。' },
          { name: '私有化部署与合规', desc: '本地模型部署、数据不出域、审计与内容安全。' },
          { name: 'AI 评测基准与方法论', desc: '业务化评测指标、回归基准、团队规范沉淀。' },
        ]),
      ],
    },
    {
      id: 'ai-algo',
      name: '算法工程师（CV / NLP / 推荐）',
      icon: 'brain',
      summary: '研究与落地机器学习模型，偏科研与建模，通常要求相关专业背景。',
      levels: [
        grp('junior', [
          { name: '数学与机器学习基础', desc: '线性代数、概率统计、梯度下降与经典监督模型。', must: true },
          { name: '深度学习框架', desc: 'PyTorch 张量与自动求导、训练循环与数据加载。', must: true },
          { ...COMMON.python },
          { name: '经典模型与损失函数', desc: 'CNN / RNN / Transformer 结构与常用损失设计。' },
          { name: '实验管理与复现', desc: '随机种子、配置管理、实验记录与结果可复现。' },
        ]),
        grp('mid', [
          { name: '模型训练与调参', desc: '学习率策略、正则与过拟合、混合精度与分布式基础。', must: true },
          { name: '领域方向深入', desc: 'CV / NLP / 推荐 任选其一的主流方案与业界实践。' },
          { name: '特征工程与数据增强', desc: '特征构造与筛选、样本不均衡、增强策略设计。' },
          { name: '模型评估与指标设计', desc: '离线指标与业务指标对齐、AB 实验与显著性。' },
          { name: '模型导出与推理服务化', desc: 'ONNX / TorchScript 导出、服务封装与延迟优化。' },
        ]),
        grp('senior', [
          { name: '端到端算法方案设计', desc: '问题定义、数据方案、模型迭代路线与上线闭环。', must: true },
          { name: '预训练与微调', desc: 'SFT / LoRA / RLHF、数据配比与训练稳定性。' },
          { name: '多模态与前沿跟进', desc: '图文语音统一建模、论文复现与技术选型判断。' },
          { name: '算法业务价值度量', desc: '收益归因、成本收益比、与业务方对齐目标。' },
        ]),
      ],
    },
    {
      id: 'ai-mlops',
      name: 'MLOps / 机器学习平台',
      icon: 'pipeline',
      summary: '让模型可训练、可部署、可监控地规模化运行，连接算法与工程。',
      levels: [
        grp('junior', [
          { name: '训练脚本工程化', desc: '配置化、参数管理、日志与产物规范化输出。', must: true },
          { ...COMMON.docker },
          { ...COMMON.k8sCore },
          { name: '实验跟踪工具', desc: 'MLflow / W&B 记录参数指标与产物，支持对比。' },
        ]),
        grp('mid', [
          { name: '分布式训练与任务调度', desc: '数据并行与模型并行、多机多卡、GPU 队列调度。', must: true },
          { name: '模型仓库与版本管理', desc: '模型注册、阶段流转、灰度与一键回滚。' },
          { name: '模型服务部署与扩缩容', desc: '在线推理服务、批量推理、弹性伸缩与灰度发布。' },
          { name: '数据与模型流水线编排', desc: 'Kubeflow / Airflow 编排训练评估上线全流程。' },
          { name: '模型监控与漂移检测', desc: '预测分布监控、数据漂移告警、自动触发重训。' },
        ]),
        grp('senior', [
          { name: 'MLOps 端到端体系', desc: '从数据到上线的自动化链路、标准与治理规范。', must: true },
          { name: '特征平台建设', desc: '离线在线特征一致、特征复用与穿越问题防控。' },
          { name: 'GPU 算力调度与成本', desc: '资源池化、抢占与配额、利用率提升与账单优化。' },
          { name: '模型合规与可追溯', desc: '训练数据溯源、模型审计、备案与风险评估。' },
        ]),
      ],
    },
    {
      id: 'ai-data',
      name: '训练数据 / 标注平台工程师',
      icon: 'database',
      summary: '为模型准备高质量语料与特征，建设标注、清洗与数据版本能力（区别于面向 BI 的数仓岗位）。',
      levels: [
        grp('junior', [
          { name: '数据采集与清洗', desc: '爬取与接口获取、去重与过滤、脏数据识别。', must: true },
          { name: '数据标注规范与质检', desc: '标注指南编写、一致性校验、抽检与返工机制。', must: true },
          { ...COMMON.python },
          { name: '数据集划分与偏差认知', desc: '训练验证测试划分、分布偏移与采样偏差。' },
        ]),
        grp('mid', [
          { name: '大规模语料处理与去重', desc: '分布式清洗、MinHash 近似去重、质量打分与过滤。', must: true },
          { name: '特征工程与特征仓库', desc: '特征定义与复用、离线在线一致性、时效性管理。' },
          { name: '向量化与嵌入存储', desc: 'Embedding 生成、批量入库、索引构建与更新。' },
          { name: '数据版本管理', desc: 'DVC / LakeFS 管理数据集版本，与模型版本对应。' },
          { name: '合成数据与增强策略', desc: '模型生成数据、规则扩增、质量与多样性控制。' },
        ]),
        grp('senior', [
          { name: '训练数据体系与标注平台', desc: '标注工具链、任务分发与验收、人机协同标注。', must: true },
          { name: '数据隐私与合规脱敏', desc: 'PII 识别与脱敏、授权与留存、跨境合规要求。' },
          { name: '数据飞轮与持续迭代', desc: '线上反馈回流、难例挖掘、数据驱动的模型迭代。' },
        ]),
      ],
    },
    {
      id: 'ai-infra',
      name: 'AI Infra / 推理优化工程师',
      icon: 'rocket',
      summary: '让大模型跑得更快更省：推理引擎、显存与算力优化，是当前薪资天花板最高的 AI 岗位之一。',
      levels: [
        grp('junior', [
          { name: 'GPU 与显存基础', desc: '显卡架构、显存占用构成、nvidia-smi 与常见 OOM 原因。', must: true },
          { name: '推理框架入门', desc: 'vLLM / TGI / TensorRT-LLM 的部署与基本参数。', must: true },
          { ...COMMON.linux },
          { name: '模型格式与转换', desc: 'safetensors / GGUF / ONNX 转换与精度验证。' },
        ]),
        grp('mid', [
          { name: '推理性能优化', desc: '连续批处理、KV Cache、PagedAttention 与吞吐延迟权衡。', must: true },
          { name: '模型量化与压缩', desc: 'INT8 / INT4、AWQ 与 GPTQ、精度损失评估。' },
          { name: '分布式推理与并行', desc: '张量并行、流水并行、多卡多机部署与通信开销。' },
          { name: 'CUDA 与算子基础', desc: '核函数与内存层级、算子融合、Profiling 工具使用。' },
          { name: '推理服务压测与调优', desc: '并发模型、首 token 延迟、吞吐曲线与容量规划。' },
        ]),
        grp('senior', [
          { name: '大规模推理集群架构', desc: '多模型多租户调度、弹性伸缩、成本与 SLA 平衡。', must: true },
          { name: '训练框架与并行优化', desc: 'DeepSpeed / Megatron、ZeRO 与梯度检查点、训练加速。' },
          { name: '异构算力与国产芯片适配', desc: '昇腾 / 寒武纪等适配、算子迁移与性能对齐。' },
        ]),
      ],
    },
    {
      id: 'ai-edge',
      name: '端侧 AI 工程师',
      icon: 'phone',
      summary: '把模型塞进手机 / 车机 / IoT 设备，在端上低功耗离线运行，AI 与客户端的交叉红利岗。',
      levels: [
        grp('junior', [
          { name: '端侧推理框架', desc: 'TFLite / NCNN / MNN / CoreML 的集成与基本调用。', must: true },
          { name: '端侧模型部署流程', desc: '训练产物到端上可执行的完整链路与验证方法。', must: true },
          { name: '端侧模型格式转换', desc: '算子支持度检查、转换失败排查与精度对齐。' },
          { name: '端侧硬件与算力认知', desc: 'CPU / GPU / NPU 的能力边界与选型依据。' },
        ]),
        grp('mid', [
          { name: '模型剪枝与轻量化', desc: '结构化剪枝、蒸馏、轻量骨干网络选择。', must: true },
          { name: '端侧量化', desc: 'INT8 / FP16 量化、校准数据集、精度与速度平衡。' },
          { name: 'NPU 与硬件加速适配', desc: '厂商 SDK 接入、算子下沉、多后端回退策略。' },
          { name: '端侧内存与功耗优化', desc: '内存复用、推理调度、发热与续航影响控制。' },
          { name: '端云协同推理', desc: '端上快响应与云端强能力的分工、离线降级。' },
        ]),
        grp('senior', [
          { name: '端侧 AI 架构与调度', desc: '多模型共存、资源竞争仲裁、统一推理中台设计。', must: true },
          { name: '多硬件平台适配体系', desc: '机型分级、能力探测、自动选择最优后端。' },
          { name: '端侧模型更新与灰度', desc: '模型热更新、版本灰度、回滚与效果监控。' },
        ]),
      ],
    },
  ],
}
