/**
 * 技能树宪章 · 机器可读配置
 * 这是 docs/skill-tree-charter.md 的可执行副本。修改本文件必须同步修改宪章正文，反之亦然。
 * 消费者：skilltree_audit.mjs（审计）、freshness_tag.mjs（时效打标）
 */

/* ── 宪章第 2.4 条 · 现行分层表（trunk 24 / branch 19 = 43 章） ── */
export const LAYER_MAP = {
  // 前端 trunk 9
  'fe-c1': 'trunk', 'fe-c2': 'trunk', 'fe-c3': 'trunk', 'fe-c4': 'trunk',
  'fe-c5': 'trunk', 'fe-c6': 'trunk', 'fe-c13': 'trunk', 'fe-c14': 'trunk', 'fe-c17': 'trunk',
  // 前端 branch 9
  'fe-c7': 'branch', 'fe-c8': 'branch', 'fe-c9': 'branch', 'fe-c10': 'branch',
  'fe-c11': 'branch', 'fe-c12': 'branch', 'fe-c15': 'branch', 'fe-c16': 'branch', 'fe-c18': 'branch',
  // 后端 trunk 11
  'be-c1': 'trunk', 'be-dsa': 'trunk', 'be-net': 'trunk', 'be-os': 'trunk',
  'be-dist': 'trunk', 'be-c4': 'trunk', 'be-c5': 'trunk', 'be-sec': 'trunk',
  'be-test': 'trunk', 'be-api': 'trunk', 'be-msa': 'trunk',
  // 后端 branch 5
  'be-jvm': 'branch', 'be-c2': 'branch', 'be-mq': 'branch', 'be-c3': 'branch', 'be-nosql': 'branch',
  // 运维 trunk 3
  'op-c1': 'trunk', 'op-c2': 'trunk', 'op-c5': 'trunk',
  // 运维 branch 5（含 op-c8 平台工程与 IDP）
  'op-c3': 'branch', 'op-c4': 'branch', 'op-c6': 'branch', 'op-c7': 'branch', 'op-c8': 'branch',
  // AI 工程 trunk 1
  'ai-c1': 'trunk',
};

/* ── 宪章第 4.2 条 · 风险分级复核 SLA（天） ── */
export const SLA_DAYS = { 高: 90, 中: 180, 低: 365 };

/* ── 宪章第 4.3 条 · 默认风险推定（按层级） ── */
export const DEFAULT_RISK = { trunk: '低', branch: '中' };

/**
 * 宪章第 4.2 条 · 高风险章白名单
 * 版本迭代最快、最容易过期的 branch 章，强制 90 天复核。
 */
export const HIGH_RISK_CHAPTERS = new Set([
  'fe-c8',  // 工程化与构建工具（Vite/Webpack/Rollup 迭代快）
  'fe-c9',  // React
  'fe-c10', // Vue
  'fe-c16', // Node.js
  'be-c3',  // Spring 生态
  'be-nosql', // NoSQL 与搜索（ES 版本敏感）
  'op-c3',  // Docker 与 Kubernetes
  'op-c7',  // IaC 与公有云（云厂商 API 变更频繁）
  'op-c8',  // 平台工程与 IDP（平台工程 2.0 / IDP 框架迭代快）
  'ai-c1',  // AI 工程（模型/工具/SLA 迭代极快，强制 90 天复核）
]);

/** 给定章 id → 应标注的风险等级 */
export function riskOf(chapterId) {
  if (HIGH_RISK_CHAPTERS.has(chapterId)) return '高';
  return DEFAULT_RISK[LAYER_MAP[chapterId]] || '中';
}

/* ── 宪章第 8.5 条 · 章命名规范 ──
 * 须带「第N章 · 」前缀；同一模块内数字体例保持一致。
 * frontend 用中文数字（第十六章），backend / devops 用阿拉伯数字（第14章）。
 */
export const CHAPTER_NAME_RE = /^第.+?章\s*·\s*\S/;
export const MODULE_NUMERAL = { frontend: 'cn', backend: 'ar', devops: 'ar' };

const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

/** 按模块体例生成章号前缀，如 (frontend, 16) → "第十六章 · " */
export function chapterPrefix(moduleId, index1) {
  const style = MODULE_NUMERAL[moduleId] || 'ar';
  const n = style === 'cn' ? (CN_NUM[index1] || String(index1)) : String(index1);
  return `第${n}章 · `;
}

/* ── 宪章第 4.1 条 · 时效元数据块 ── */
export const FRESH_RE = /^>\s*时效\s*\|(.+)$/m;

/** 生成时效块（置于 content 最顶部） */
export function freshBlock({ checked, risk, version, source = '官方' }) {
  const parts = [`> 时效 | 核验=${checked}`, `风险=${risk}`];
  if (version) parts.push(`版本=${version}`);
  parts.push(`来源=${source}`);
  return parts.join(' | ');
}

/** 解析时效块字段 */
export function parseFresh(content) {
  const m = content.match(FRESH_RE);
  if (!m) return null;
  return Object.fromEntries(
    m[1].split('|').map((p) => p.trim().split('='))
      .filter((a) => a.length === 2)
      .map(([k, v]) => [k.trim(), v.trim()])
  );
}

/* ── 宪章第七条 · 红线阈值 ── */
export const REDLINE = {
  v1Rate: 1.0,          // V1 六段式达标率必须 100%
  badLinks: 0,          // 失效 doc: 互链必须为 0
  minTrunkRatio: 0.4,   // trunk 章占比不得低于 40%
};

/* ── V1 六段式 ── */
export const V1_SECTIONS = ['心智模型', '核心知识点（锚定官方）', '为什么重要', '常见坑', '动手自测', '面试视角'];

/** 本地日期 YYYY-MM-DD（不用 toISOString，避免 UTC 差一天） */
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
