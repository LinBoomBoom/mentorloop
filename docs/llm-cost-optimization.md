# LLM 成本优化：Deepseek 缓存命中率提升方案（落地记录）

> 评审对象：`server/utils/llm.ts`、`server/utils/studyplan.ts`、`server/utils/interview.ts`、`server/api/interview/ask.post.ts`、`server/utils/db.ts`（v15 迁移）。
> 结论一句话：**Deepseek 上下文缓存本就默认开启，根因是 studyplan 把动态内容写进 system（前缀缓存失效）+ 完全无测量 + 提问答案无跨用户复用；本次已按性价比全量落地，提交 `85d130e..1f59bdc`，22 项测试通过。**

---

## 一、问题背景

观察到 LLM（Deepseek）命中率过低、费用消耗过快。先澄清一个常见误解：

- Deepseek 的 **上下文缓存（Context Cache / KV Cache）默认开启**，无需主动开关。
- 命中规则是 **前缀精确 token 匹配**：相同请求前缀（如固定的 system 提示词）会被自动缓存并跨请求复用。
- 响应中返回 `usage.prompt_cache_hit_tokens` / `usage.prompt_cache_miss_tokens`，这是量化命中率的唯一权威来源。

因此「命中率低」不是「没开缓存」，而是 **prompt 结构 + 缺少测量** 综合导致的。

---

## 二、根因诊断（按调用点）

| 调用点 | system 是否含动态内容 | 动态数据位置 | 共享前缀质量 | 量级 |
|---|---|---|---|---|
| `resume.diagnoseResume` | ❌ 纯静态（~200 tok） | user=简历（每人不同） | ✅ 系统前缀全用户共享 | 中 |
| `studyplan.generatePlan` | ⚠️ **曾把 weakText+章节列表插值进 system** | user="请生成学习计划。"（空） | ❌ 每用户 system 不同 → 前缀缓存几乎 0 命中 | 低（但 prewarm 集中触发） |
| `interview.systemPrompt` | 仅插值 track/level/goal（共 12 组合，goal 多为空） | user=回答（动态） | ✅ 同组合 system 共享 | **高（每答一次）** |
| `ask.post.ts` 解答/标题 | ✅ 纯静态 | user=问题（动态） | ✅ 系统前缀全共享 | 中 |

**最致命的一处**：`studyplan.generatePlan` 曾把「用户薄弱点 `weakText`」和「章节列表 `chapText`」直接拼进 **system 提示词**，导致每个用户的 system 都不同，Deepseek 前缀缓存完全失效；`prewarmTracks` 一次连发 4 个方向时，这 4 次调用本可共享同一长前缀，却 0 命中。

---

## 三、结构性事实（必须说清，避免误判）

命中率按 token 计算（`hit / (hit+miss)`）：

- **简历诊断**：system（~200）能命中，但简历正文（~8000）必然不命中 → 比值天然只有 ~2.5%，这是合理的，省的就是那 200 token 前缀。
- **面试逐题评分**：system 前缀共享，但对话历史每人不同 → 比值随轮次增长而下降，正常。
- 真正能大幅拉高整体比值、直接砍费用的，是下面两项结构性修复，而非纠结「绝对命中率数字」。

Deepseek 缓存是 **best-effort**，闲置几小时~几天会自动清，流量稀疏时前缀易冷——这更凸显 **应用层缓存**（你们简历 / 学习计划已做 7 天 DB 缓存）的价值，而「提问答案缓存」正好补上这个缺口。

---

## 四、优化方案与落地状态（按性价比排序）

| 优先级 | 方案 | 文件 | 状态 |
|---|---|---|---|
| **P0** | 埋点测量：解析 `prompt_cache_hit/miss_tokens`，打日志 + `getLlmCacheStats()` | `server/utils/llm.ts` | ✅ 已落地 |
| **P0** | 修 studyplan 前缀：动态内容移出 system，改纯静态 | `server/utils/studyplan.ts` | ✅ 已落地 |
| **P1** | 提问答案跨用户缓存：按 `sha256(track\|归一化问题)` 复用，TTL 7 天 | `ask.post.ts` + `db.ts`（v15 建表） | ✅ 已落地 |
| **P1** | interview 缓存键稳定：`systemPrompt` 记忆化（字节级一致） | `server/utils/interview.ts` | ✅ 已落地 |
| **P2** | 确认模型为 `deepseek-chat`（V3，最便宜），未用更贵的 `deepseek-reasoner` | 配置 | ✅ 已确认，无需改动 |
| **P2** | 确认 temperature 不影响缓存，现有 0.3~0.9 配置不动 | 配置 | ✅ 已确认，无需改动 |
| **P2** | best-effort 缓存机制说明 | — | 说明性内容，无代码改动 |

---

## 五、改动明细

### 1. `server/utils/llm.ts` — 缓存命中埋点
- `chat()` 在解析响应后读取 `data.usage`，提取 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`（缺失则跳过，不影响主流程）。
- 累加进程内 `cacheStats`，并打一行结构化日志：`[LLM][cache] model=.. hit=.. miss=.. hitRatio=..%`，便于 `grep "[LLM][cache]"` 量化。
- 新增 `getLlmCacheStats()` 返回 `{ calls, hitTokens, missTokens, hitRatio }`，供运维 / 调试读取累计值。
- **不改变 `chat()` 返回类型**，调用方无感，现有测试不受影响。

### 2. `server/utils/studyplan.ts` — 修复前缀缓存
- `generatePlan` 不再把 `weakText` / `chapText` 插值进 system；system 改为**纯静态指令**（"仅从用户提供的章节中筛选"等）。
- 动态内容（薄弱点、章节列表、方向名）全部放入 **user 消息**：`候选人的技术方向：...\n薄弱知识点：\n...\n已有章节：\n...\n\n请生成学习计划。`
- 效果：所有用户 / 所有方向的 system 前缀完全一致 → `prewarmTracks` 连发 4 方向时第 2–4 次直接命中长前缀，跨用户复用成立。

### 3. `server/utils/interview.ts` — systemPrompt 记忆化
- 模块级 `systemPromptCache = new Map()`，键 `track|level|goal`，值即生成的 system 字符串。
- 相同参数返回**字节级一致**字符串，确保 Deepseek 前缀缓存键稳定（同组合跨用户复用）。
- 设 `SYSTEM_PROMPT_CACHE_CAP = 256`，超限 `clear()` 防 goal 自由文本导致键值无限增长。

### 4. `server/api/interview/ask.post.ts` — AI 答案跨用户缓存（直接降本）
- 题库未命中、走 LLM **之前**，先算 `qHash = sha256(\`${track||'all'}|${qNorm}\`)`（`qNorm` 复用既有 `norm()`：去空格与常见标点、小写，中英文混合下字符级归一化）。
- 查 `ai_answer_cache`（TTL 7 天：`created_at > now - 7d`），命中则直接返回 `source: 'ai-cache'`、跳过 LLM。
- LLM 成功生成后 `INSERT OR REPLACE` 写入缓存（失败仅告警、不阻断主流程）。
- 命中缓存时仍收录到该用户「待补充池」（`collectUserQuestion`），不影响主响应，但不再消耗 LLM。
- 前端仅依赖 `answer.matched` / `answer.track`，不分支 `source`，故返回 `source: 'ai-cache'` 安全。

### 5. `server/utils/db.ts` — v15 迁移建表
```sql
CREATE TABLE IF NOT EXISTS ai_answer_cache (
  q_hash TEXT PRIMARY KEY,
  track TEXT,
  answer TEXT NOT NULL,
  enhanced TEXT,
  model TEXT,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_aianswer_created ON ai_answer_cache(created_at);
```
- 幂等 `IF NOT EXISTS`，随 `runMigrations` 自动执行（已通过 `interview-bank.test.mjs` 验证新表创建无报错）。

---

## 六、如何验证生效

1. **看命中率**：服务器日志 `grep "[LLM][cache]"`，观察 `hitRatio` 是否随流量上升。修复 studyplan 后，学习路径生成的 system 前缀应几乎全命中。
2. **看成本**：对比 Deepseek 账单中 `prompt_cache_hit_tokens` 占比，与「提问解答」调用次数是否下降（热门问题命中 `ai_answer_cache` 后不再计费）。
3. **代码读累计值**：`getLlmCacheStats()` → `{ calls, hitTokens, missTokens, hitRatio }`。
4. **回归**：`vitest run tests/llm.test.mjs tests/audit-fixes.test.mjs tests/interview-bank.test.mjs`（已通过，共 22 项）。

---

## 七、后续待办 / 风险

- **线上观察**：需在线上跑几天，用日志 + 账单确认命中率与费用的实际下降幅度（本机无法读线上数据）。这是验证的最后一步，非代码改动。
- **缓存失效边界**：`ai_answer_cache` 按问题哈希命中，若同一问题后续答案需更新（如模型升级、知识更新），靠 7 天 TTL 自然过期；如需立即刷新可手动清表或缩短 TTL 常量 `AI_ANSWER_TTL`。
- **前缀冷启动**：Deepseek 缓存 best-effort，流量稀疏时仍可能冷；应用层答案缓存（7 天）已作为兜底，二者互补。
- **未做项**：本次未引入更激进的缓存（如向量近邻复用相似问题答案），当前 `norm()` 字符级归一化已覆盖「缩略 / 标点差异」场景，如需进一步降本可后续评估。

---

## 八、相关文件清单

| 文件 | 角色 |
|---|---|
| `server/utils/llm.ts` | Deepseek 客户端 + 缓存埋点 |
| `server/utils/studyplan.ts` | 学习路径生成（前缀修复） |
| `server/utils/interview.ts` | 模拟面试 systemPrompt 生成（记忆化） |
| `server/api/interview/ask.post.ts` | 提问解答 + 跨用户答案缓存 |
| `server/utils/db.ts` | v15 迁移（`ai_answer_cache` 表） |
