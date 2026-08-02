import fs from 'node:fs';

// 幂等增强：在 op-c5（trunk）追加 DevSecOps 小节（op-c5-s10）
// 不覆盖现有 9 节；已存在则跳过。零 schema 漂移，只新增一个 section 对象。
const SEED = './data/seed-content.json';
const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'));
const mod = s.modules.find((m) => m.id === 'devops');
const ch = mod.chapters.find((c) => c.id === 'op-c5');
if (!ch) { console.error('op-c5 not found'); process.exit(1); }

const NEW_ID = 'op-c5-s10';
if (ch.sections.some((x) => x.id === NEW_ID)) {
  console.log(`[SKIP] ${NEW_ID} 已存在，跳过`);
  process.exit(0);
}

const content = `> 时效 | 核验=2026-08-02 | 风险=低 | 来源=官方

## 心智模型
安全不该是"上线前过一道闸"的终点检查，而是**从写第一行代码起就嵌进开发运维全流程**的实践——这就是"安全左移（Shift-Left）"。把安全卡在最后，漏一个洞就是生产事故；把安全检查前置到提交即跑，问题在 cheapest 的环节被拦下。

## 核心知识点（锚定官方）
- **OWASP DevSecOps**：将安全实践融入 DevOps 生命周期，强调"人人对安全负责、安全自动化内建"。
- **安全左移（Shift-Left）**：在需求/编码/构建阶段就做安全，而非上线前才测；越早发现，修复成本越低。
- **软件供应链安全**：**SLSA**（Supply-chain Levels for Software Artifacts，Google 发起）给出制品来源与完整性的分级；**SBOM**（Software Bill of Materials，软件物料清单）列清"我到底依赖了哪些组件"，便于漏洞爆发时快速定位（如 Log4j 事件）。
- **CI 内安全门禁**：在 CI 流水线挂 **SAST**（静态应用安全测试）、**DAST**（动态）、**依赖/镜像扫描**（如 Trivy）、** secrets 扫描**，不通过不让合并/发布（详见 op-c4）。
- **最小权限（呼应 op-c5-s1）**：平台与流水线默认最小权限，密钥走保管而非硬编码。

## 为什么重要
现代系统 70%+ 代码来自开源依赖，供应链已成头号攻击面（SolarWinds、Log4j 等）。DevSecOps 把"靠人记着做安全"变成"流水线自动卡安全"，是合规（等保，见 op-c5-s3）与抗攻击的双重底座。

## 常见坑
- 安全门禁太严、误报多，开发者学会"一键跳过" → 门禁形同虚设。
- 只做 SAST 不做依赖扫描，供应链漏洞全漏。
- 把 DevSecOps 当"买个扫描工具"，忽视文化（人人负责）与流程（左移）。

## 动手自测
1. 在一条 CI 里加 SAST + 依赖扫描两步，故意提交一段含已知弱点的代码，验证被拦。
2. 生成项目的 SBOM（如用 Syft），找出现在依赖里是否有已知 CVE。

## 面试视角
"什么是 DevSecOps？安全左移解决什么？SLSA/SBOM 是什么？CI 里怎么挂安全门禁？"——讲清"左移 + 供应链 + 自动化门禁 + 最小权限"。

## 相关知识图谱
- [op-c5-s1 最小权限](doc:devops/op-c5/op-c5-s1) — DevSecOps 的权限底座
- [op-c4-s1 CI/CD](doc:devops/op-c4/op-c4-s1) — 安全门禁挂在 CI 内
- [op-c8-s1 黄金路径](doc:devops/op-c8/op-c8-s1) — 安全门禁应内建进平台黄金路径
- [ai-c1-s5 安全与合规](doc:ai/ai-c1/ai-c1-s5) — 提示注入/数据泄露同属安全边界

### 进阶
SLSA 从构建溯源（Provenance）到防篡改分级；SBOM 在漏洞响应时价值最大——"已知漏洞爆发→秒级查出谁用了它"。

### 专家
NIST SSDF（安全软件开发框架）与 SLSA 互补：前者管开发过程、后者管制品完整性；成熟 DevSecOps 两者皆落地，并接入平台黄金路径做到"默认安全"。`;

const maxPos = Math.max(...ch.sections.map((x) => x.position ?? 0));
ch.sections.push({
  id: NEW_ID,
  title: 'DevSecOps 与安全左移',
  direction: '安全不是上线前的闸，而是贯穿开发运维全流程的左移实践：供应链、SBOM、CI 安全门禁、最小权限。',
  content,
  position: maxPos + 1,
});
fs.writeFileSync(SEED, JSON.stringify(s, null, 2));
console.log(`[ADD] ${NEW_ID} 已追加到 op-c5（现 ${ch.sections.length} 节），pos=${maxPos + 1}`);
