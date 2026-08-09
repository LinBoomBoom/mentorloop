import fs from 'node:fs';

// #89 内容深度补强（演进脉络 + ASCII 图示）
// 针对高风险/主干章 ai-c1 / be-dist / op-c8，给目标节追加 V2 深度块。
// 零 schema 漂移：只改 section.content markdown，不新增字段、不新增 section。
// 幂等：已含 `### 演进脉络` / `### 结构图示` 的节跳过；重跑 = 0 变更。
// 支持 --seed <path>：在临时副本上做幂等校验（默认仍用正式 seed）。

const SEED = (() => {
  const i = process.argv.indexOf('--seed');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : './data/seed-content.json';
})();

const FENCE = '```';
const EVO = '### 演进脉络';
const DIAG = '### 结构图示';

// 每节待追加的块（按需选填 evo / diag）
const PLAN = {
  // ===== ai-c1（AI 工程 trunk，高风险）=====
  'ai-c1-s1': {
    evo: `提示工程本身在"模型能力变强"与"工程可复用"两股拉力下演进：早期靠硬编码规则（"不许做 X"），很快被 **few-shot（给示例）** 取代——示例比规则更稳；随后 **思维链（CoT）** 把"先推理再答"显式化，解锁数学/逻辑类任务；再往后，**指令微调（SFT/RLHF）** 把"好提示"固化进权重，让小模型也能学会格式与风格。驱动力始终是：用更少、更稳的提示，拿到更可控的输出。`,
    diag: `一个提示（Prompt）的典型构成：\n${FENCE}text\n┌─────────────────────────────────────────┐\n│ 提示（Prompt）构成                        │\n├─────────────────────────────────────────┤\n│ 1. 系统提示 : 角色 / 边界 / 输出契约      │\n│ 2. 上下文   : 检索结果 / 业务数据         │\n│ 3. 指令     : 任务描述 + few-shot 示例    │\n│ 4. 输出契约 : JSON / 函数 schema          │\n└─────────────────────────────────────────┘\n       ↓ 模型返回结构化结果（含 reason）\n${FENCE}`,
  },
  'ai-c1-s2': {
    diag: `RAG 检索增强生成的端到端流水线：\n${FENCE}text\n用户 Query\n   │  embed（向量化）\n   ▼\n向量库 Top-K 召回 ──► Reranker 重排\n   │                      │\n   └──────┬───────────────┘\n          ▼  拼接 (Query + 上下文)\n      ┌───────────┐\n      │ LLM 生成  │──► 带引用回答 (citation)\n      └───────────┘\n${FENCE}`,
  },
  'ai-c1-s4': {
    diag: `Agent 的工具调用循环（应用层 while，不是模型自动完成）：\n${FENCE}text\n┌──────────── 循环（应用层 while） ────────────┐\n│  Thought  : 模型决定下一步                  │\n│    │                                        │\n│    ▼                                        │\n│  Action   : 产出 tool_call（函数+参数）      │\n│    │  执行外部工具 / API                     │\n│    ▼                                        │\n│  Observation: 工具结果回传模型               │\n│    │                                        │\n│    └──────── 继续 or 最终 Answer            │\n└────────────────────────────────────────────┘\n${FENCE}`,
  },
  // ===== be-dist（分布式系统，backend）=====
  'be-dist-s1': {
    evo: `系统架构随"规模与协作"压力持续演进：单体应用 → SOA（按业务拆服务）→ 微服务（独立部署、独立数据）→ 今天的分布式系统（多副本、跨机房、最终一致）。每一步都在"拆分以换敏捷/可用"，代价是引入网络分区、一致性与时钟等分布式难题。CAP 定理正是这套演进的"底层约束说明"：一旦走网络，分区 P 不可选，只能在 C 与 A 间权衡。`,
    diag: `CAP 三角形：分区不可避免，分区发生时在 C 与 A 间二选一。\n${FENCE}text\n        ┌─────────┐\n        │   CAP   │\n       ┌┴────────┴┐\n       │          │\n   Consistency  Availability\n    (一致)        (可用)\n       │          │\n       └────┬─────┘\n         Partition (分区·不可避免)\n   分区发生时：选 CP（保一致降可用）\n            或选 AP（保可用降一致）\n${FENCE}`,
  },
  'be-dist-s4': {
    diag: `用 fencing token 解决分布式锁的"过期锁迟到写"：\n${FENCE}text\nClient A                 Storage\n  │  write(v, token=5)     │\n  │──────────────────────>│  校验 token 单调递增\n  │                        │  token=5 > 已存4 → 接受\n  │  write(v, token=3)     │  (A 暂停后旧请求迟到)\n  │──────────────────────>│  token=3 < 5 → 拒绝 ✗\n  ▼                        ▼\nfencing token 让"过期锁的迟到写"被存储层识别丢弃\n${FENCE}`,
  },
  'be-dist-s9': {
    diag: `逻辑时钟给出全序，向量时钟额外捕获因果：\n${FENCE}text\nLamport 逻辑时钟（全序）:\n  A:1 ──msg──> B:2 (max+1)   C:3 ──msg──> A:4\n  只保证"先后"，不保证"因果"\n\n向量时钟（捕获因果）:\n  A:[1,0,0] ──> B:[1,1,0] ──> C:[1,1,1]\n  逐分量比较：≤ 则是因，否则并发\n${FENCE}`,
  },
  // ===== op-c8（平台工程与 IDP，devops branch，高风险）=====
  'op-c8-s1': {
    evo: `"怎么高效交付软件"经历了 DevOps（文化：开发运维协作）→ 平台工程（把通用能力产品化）→ 内部开发者平台 IDP（自助式黄金路径）的演进。驱动力很朴素：每个团队都在重复踩"接 CI、配 K8s、查日志"的坑，认知负荷爆炸；与其靠文档和 Slack 求助，不如把最佳实践做成"产品"，让正确路径成为最省力的路径。`,
    diag: `黄金路径：开发者只声明意图，平台吸收底层复杂度。\n${FENCE}text\n开发者\n  │  填服务名 / 选模板\n  ▼\n┌──────── 内部开发者平台(IDP) ──────────┐\n│ 开发者门户(Backstage) → 生成仓库+CI    │\n│         │                             │\n│         ▼                             │\n│ 黄金路径: 提交即跑 CI → 部署 → 可观测  │\n└───────────────────────────────────────┘\n         ▼\n   业务团队只写业务代码（认知负荷被吸收）\n${FENCE}`,
  },
  'op-c8-s3': {
    diag: `IDP 抽象层：声明意图，平台翻译成底层资源，留逃生舱。\n${FENCE}text\n开发者（声明意图）\n   │  Score 规范: "我要一个服务+数据库"\n   ▼\n┌──────── 平台编排层 ────────┐\n│ 把声明翻译成底层资源        │\n│  K8s / Terraform / Helm    │\n└────────────────────────────┘\n   80% 场景走抽象（默认安全）\n   20% 逃生舱: 直接写底层 YAML\n${FENCE}`,
  },
  'op-c8-s5': {
    diag: `DORA 四指标映射到效能档位（精英 / 高 / 中 / 低）：\n${FENCE}text\nDORA 四指标 → 效能档位(精英/高/中/低)\n┌─────────────────────────────────────────┐\n│ 部署频率      (越频繁越好)               │\n│ 交付前置时间  (提交→生产, 越短越好)      │\n│ 变更失败率    (越低越好)                 │\n│ 恢复时间      (故障→恢复, 越短越好)      │\n└─────────────────────────────────────────┘\n   平台目标: 把团队整体往"精英/高"推\n${FENCE}`,
  },
};

const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));
let changed = 0;
let skipped = 0;

function insertAfterGraph(content, block) {
  const marker = '## 相关知识图谱';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    return content.replace(/\s*$/, '') + '\n' + block + '\n';
  }
  const tail = content.slice(idx);
  const m = tail.match(/^## 相关知识图谱[\s\S]*?(?=\n## |\n### |$)/);
  const blockText = m ? m[0] : tail;
  const end = idx + blockText.length;
  return content.slice(0, end) + '\n' + block + content.slice(end);
}

for (const m of s.modules) {
  for (const c of m.chapters) {
    for (const sec of c.sections) {
      const plan = PLAN[sec.id];
      if (!plan) continue;
      let content = sec.content;
      let touched = false;

      if (plan.evo && !content.includes(EVO)) {
        content = insertAfterGraph(content, `${EVO}\n${plan.evo}`);
        touched = true;
      }
      if (plan.diag && !content.includes(DIAG)) {
        content = insertAfterGraph(content, `${DIAG}\n${plan.diag}`);
        touched = true;
      }

      if (touched) {
        sec.content = content;
        changed++;
      } else {
        skipped++;
      }
    }
  }
}

fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log(`#89 增强完成：新增 ${changed} 节深度块，跳过(已存在) ${skipped} 节`);
