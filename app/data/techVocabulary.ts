// 技术标签受控词表（L4 归类维度 · 唯一取值域）
//
// 背景（2026-09-09）：`interview_questions.tech` 此前是自由字符串，导致三类事故：
//   1. 赛道声明的 techNames 与题库实际标签交集为空 → 用户点筛选返回 0 条（be-data 全灭）；
//   2. 标签与题面语义脱节 → ai-algo 的「CNN/Transformer」题被打上「部署与成本」；
//   3. 存在不受控脏值（如「综合」）。
//
// 设计原则：
//   - 本文件是 tech 的**唯一权威源**；`learningTaxonomy.ts` 的 techNames 必须与之一致
//     （由 scripts/audit-taxonomy.mjs 的 A1/A2/A9 断言强制）。
//   - 每个 term 归属唯一 module，并声明允许出现的赛道白名单（跨赛道复用需显式列出）。
//   - 同名不同模块（如「网络」在前端/后端/运维含义不同）按 module 分开存，key = `${module}/${id}`。
//   - `general`（综合应用）是合法兜底值，取代历史脏值「综合」。

export interface TechTerm {
  /** 模块内唯一短码 */
  id: string
  /** UI 展示名（中文规范名） */
  name: string
  /** 归属一级模块 */
  module: 'frontend' | 'backend' | 'devops' | 'ai'
  /** 允许出现的赛道白名单；'*' 表示该模块下全部赛道 */
  allowTracks: string[] | '*'
  /** 历史别名，用于回刷旧数据（含脏值） */
  aliases?: string[]
}

export const TECH_VOCABULARY: TechTerm[] = [
  // ---------------- 前端 ----------------
  { id: 'web', name: 'Web 基础', module: 'frontend', allowTracks: ['fe-web', 'fe-mobile', 'fe-node', 'fe-viz'], aliases: ['浏览器/渲染', '浏览器', '渲染'] },
  { id: 'css', name: 'CSS', module: 'frontend', allowTracks: '*', aliases: ['CSS/HTML', 'HTML'] },
  { id: 'javascript', name: 'JavaScript', module: 'frontend', allowTracks: '*', aliases: ['JavaScript/TS', 'JS'] },
  { id: 'typescript', name: 'TypeScript', module: 'frontend', allowTracks: '*', aliases: ['TS'] },
  { id: 'react', name: 'React', module: 'frontend', allowTracks: ['fe-web', 'fe-arch', 'fe-app', 'fe-viz'] },
  { id: 'vue', name: 'Vue', module: 'frontend', allowTracks: ['fe-web', 'fe-arch', 'fe-uniapp'] },
  { id: 'engineering', name: '工程化', module: 'frontend', allowTracks: '*', aliases: ['工程化/构建'] },
  { id: 'performance', name: '性能优化', module: 'frontend', allowTracks: '*' },
  { id: 'security', name: '安全', module: 'frontend', allowTracks: '*' },
  { id: 'network', name: '网络', module: 'frontend', allowTracks: '*', aliases: ['网络/HTTP', 'HTTP'] },
  // —— 赛道本体技术标签（2026-09-13 补）——
  // 此前词表只有「通用前端技术」标签，缺少各赛道的**本体技术**取值，导致
  // Flutter / iOS / Electron / uni-app 题被关键词分类器误落「Web 基础」，
  // Elasticsearch 题被误落「MySQL」，be-db 通用数据库原理题被全部塞进「MySQL」（占 90%）。
  // 这些标签是 A2/A4/A9 三类失败的共同根因。
  { id: 'flutter', name: 'Flutter', module: 'frontend', allowTracks: ['fe-app'], aliases: ['Dart'] },
  { id: 'rn', name: 'React Native', module: 'frontend', allowTracks: ['fe-app'], aliases: ['RN'] },
  { id: 'ios', name: 'iOS', module: 'frontend', allowTracks: ['fe-native'], aliases: ['Swift', 'SwiftUI', 'UIKit', 'Objective-C', 'OC'] },
  { id: 'android', name: 'Android', module: 'frontend', allowTracks: ['fe-native'], aliases: ['Kotlin', 'Jetpack Compose', 'Compose'] },
  { id: 'electron', name: 'Electron', module: 'frontend', allowTracks: ['fe-desktop'], aliases: ['Electron/Tauri'] },
  { id: 'tauri', name: 'Tauri', module: 'frontend', allowTracks: ['fe-desktop'], aliases: ['Rust/Tauri'] },
  { id: 'uniapp', name: 'uni-app', module: 'frontend', allowTracks: ['fe-uniapp'], aliases: ['uniapp', 'uni-app/跨端'] },
  { id: 'harmony', name: 'HarmonyOS', module: 'frontend', allowTracks: ['fe-harmony'], aliases: ['鸿蒙', 'ArkTS', 'ArkUI', 'Harmony'] },
  { id: 'miniprogram', name: '小程序', module: 'frontend', allowTracks: ['fe-miniprogram'], aliases: ['微信小程序', 'MiniProgram'] },
  { id: 'node', name: 'Node.js', module: 'frontend', allowTracks: ['fe-node'], aliases: ['Node', 'Nodejs'] },
  { id: 'echarts', name: 'ECharts', module: 'frontend', allowTracks: ['fe-viz'], aliases: ['echarts', 'Apache ECharts'] },
  { id: 'd3', name: 'D3', module: 'frontend', allowTracks: ['fe-viz'], aliases: ['D3.js'] },
  { id: 'webgl', name: 'WebGL', module: 'frontend', allowTracks: ['fe-viz'], aliases: ['Three.js', 'threejs', 'GLSL', 'OpenGL'] },
  { id: 'canvas', name: 'Canvas', module: 'frontend', allowTracks: ['fe-viz'], aliases: ['SVG', 'Canvas/SVG'] },
  { id: 'vizbase', name: '可视化基础', module: 'frontend', allowTracks: ['fe-viz'], aliases: ['图形基础', '可视化'] },
  { id: 'general', name: '综合应用', module: 'frontend', allowTracks: '*', aliases: ['综合'] },
  // fe-arch 原「工程化」独占 93%：Design Token / 模块联邦 / 端到端测试被硬塞进同一个桶
  { id: 'arch', name: '架构设计', module: 'frontend', allowTracks: ['fe-arch'], aliases: ['前端架构', '架构'] },
  { id: 'testing', name: '测试', module: 'frontend', allowTracks: ['fe-arch', 'fe-web', 'fe-app'], aliases: ['前端测试', '单测', 'E2E'] },

  // ---------------- 后端 ----------------
  { id: 'java', name: 'Java', module: 'backend', allowTracks: ['be-web', 'be-micro', 'be-game', 'be-search', 'be-test'], aliases: ['Java/Spring', 'Spring', '并发/多线程'] },
  { id: 'go', name: 'Go', module: 'backend', allowTracks: ['be-web', 'be-micro'] },
  { id: 'python', name: 'Python', module: 'backend', allowTracks: ['be-web', 'be-data'] },
  { id: 'gin', name: 'Gin', module: 'backend', allowTracks: ['be-web'] },
  { id: 'fastapi', name: 'FastAPI', module: 'backend', allowTracks: ['be-web'] },
  { id: 'system', name: '系统设计', module: 'backend', allowTracks: '*' },
  { id: 'micro', name: '微服务', module: 'backend', allowTracks: '*', aliases: ['分布式/微服务', '分布式'] },
  { id: 'mq', name: '消息队列', module: 'backend', allowTracks: '*', aliases: ['MQ'] },
  { id: 'mysql', name: 'MySQL', module: 'backend', allowTracks: ['be-web', 'be-db', 'be-data', 'be-game', 'be-test', 'be-micro'], aliases: ['MySQL/数据库'] },
  { id: 'postgresql', name: 'PostgreSQL', module: 'backend', allowTracks: ['be-db'], aliases: ['Postgres', 'PG'] },
  { id: 'redis', name: 'Redis', module: 'backend', allowTracks: '*', aliases: ['Redis/缓存'] },
  { id: 'nosql', name: 'NoSQL', module: 'backend', allowTracks: ['be-db'] },
  { id: 'network', name: '网络', module: 'backend', allowTracks: '*', aliases: ['网络/TCP', 'TCP'] },
  { id: 'spark', name: 'Spark', module: 'backend', allowTracks: ['be-data'] },
  { id: 'hive', name: 'Hive', module: 'backend', allowTracks: ['be-data'] },
  { id: 'kafka', name: 'Kafka', module: 'backend', allowTracks: ['be-data'] },
  { id: 'flink', name: 'Flink', module: 'backend', allowTracks: ['be-data'] },
  { id: 'dw', name: '数仓建模', module: 'backend', allowTracks: ['be-data'] },
  { id: 'sched', name: '调度与集成', module: 'backend', allowTracks: ['be-data'] },
  // —— 赛道本体/细分标签（2026-09-13 补）——
  { id: 'es', name: 'Elasticsearch', module: 'backend', allowTracks: ['be-search', 'be-db'], aliases: ['ES', 'ElasticSearch', 'Lucene'] },
  // 「数据库原理」承接跨具体产品的通用数据库题（索引结构 / 事务 / 锁 / MVCC / 存储引擎 /
  // 执行计划 / 分库分表），避免它们被统一塞进「MySQL」导致二级筛选失去区分度。
  { id: 'dbtheory', name: '数据库原理', module: 'backend', allowTracks: ['be-db', 'be-web', 'be-data', 'be-test', 'be-micro'], aliases: ['数据库基础', '存储引擎', '数据库/原理'] },
  { id: 'general', name: '综合应用', module: 'backend', allowTracks: '*', aliases: ['综合'] },
  // be-test（SDET）赛道原本**没有任何测试类标签**，185 道「综合应用」里 141 道是自动化测试题
  //（pytest / Playwright / 断言 / POM），只能往「综合应用」里塞，占赛道 45%。
  { id: 'autotest', name: '自动化测试', module: 'backend', allowTracks: ['be-test'], aliases: ['测试自动化', 'UI 自动化', '接口自动化'] },
  { id: 'testtheory', name: '测试理论', module: 'backend', allowTracks: ['be-test'], aliases: ['用例设计', '测试设计'] },
  { id: 'perftest', name: '性能压测', module: 'backend', allowTracks: ['be-test'], aliases: ['压测', '性能测试'] },

  // ---------------- 运维 ----------------
  { id: 'linux', name: 'Linux', module: 'devops', allowTracks: '*', aliases: ['Linux/排查', '排查'] },
  { id: 'network', name: '网络', module: 'devops', allowTracks: '*', aliases: ['网络/TCP/HTTPS', 'Nginx/网关', 'Nginx', '网关'] },
  // 注意：不要在这里留「监控」别名。现已拆出独立的「监控与可观测」术语，
  // 两个条目同时声明该别名会导致 TECH_RESOLVE 只回解到先注册的 SRE，
  // 使 taxonomy-vocabulary 测试的「别名全覆盖」断言失败。
  { id: 'sre', name: 'SRE', module: 'devops', allowTracks: '*', aliases: ['监控/SRE'] },
  { id: 'docker', name: '容器/Docker', module: 'devops', allowTracks: '*', aliases: ['Docker', '容器'] },
  { id: 'cicd', name: 'CI/CD', module: 'devops', allowTracks: '*', aliases: ['CI/CD/发布', '发布', 'CICD'] },
  { id: 'k8s', name: 'Kubernetes', module: 'devops', allowTracks: '*', aliases: ['K8s', 'k8s'] },
  { id: 'cloud', name: '云平台', module: 'devops', allowTracks: ['op-cloud', 'op-trad', 'op-sre'] },
  // 云平台三细分：原先「云平台」一个标签吃下 op-cloud 65% 的题目（云主机 / OSS / 合规治理
  // 全混在一起），筛选几乎失效。按云产品域拆开，与既有的「安全」「网络」配套使用。
  { id: 'compute', name: '云计算', module: 'devops', allowTracks: ['op-cloud', 'op-trad', 'op-sre'], aliases: ['云计算/云主机'] },
  { id: 'storage', name: '云存储', module: 'devops', allowTracks: ['op-cloud', 'op-trad', 'op-sre'], aliases: ['云存储/OSS'] },
  { id: 'govern', name: '云治理', module: 'devops', allowTracks: ['op-cloud', 'op-trad', 'op-sre'], aliases: ['云治理/合规'] },
  { id: 'security', name: '安全', module: 'devops', allowTracks: ['op-sec', 'op-cloud', 'op-trad'] },
  { id: 'general', name: '综合应用', module: 'devops', allowTracks: '*', aliases: ['综合'] },
  // 三个「被高占比掩盖的错标」：op-sre 的 SRE 桶里混着 56 道数据库题，
  // op-devops 的 CI/CD 桶里混着 60 道 Terraform/IaC 题与 17 道监控题。
  { id: 'db', name: '数据库', module: 'devops', allowTracks: ['op-sre', 'op-trad', 'op-devops'], aliases: ['数据库/存储', '慢查询'] },
  { id: 'cache', name: '缓存', module: 'devops', allowTracks: ['op-sre', 'op-trad', 'op-devops'], aliases: ['Redis', '缓存中间件'] },
  { id: 'observability', name: '监控与可观测', module: 'devops', allowTracks: '*', aliases: ['监控', '可观测', 'Prometheus'] },
  { id: 'iac', name: '基础设施即代码', module: 'devops', allowTracks: ['op-devops', 'op-cloud', 'op-sre'], aliases: ['IaC', 'Terraform'] },

  // ---------------- AI 工程 ----------------
  // 说明：原「部署与成本」单标签覆盖了 43% 的 AI 题目（算法/应用/推理混在一起），
  //       此处按内容语义拆为 train / infra / eval 等可区分的标签。
  // AI 各赛道内容本就高度交叉，除 edge 外一律放开跨赛道使用。
  { id: 'prompt', name: 'Prompt 工程', module: 'ai', allowTracks: '*', aliases: ['提示工程/Prompt', '提示工程', 'Prompt'] },
  { id: 'rag', name: 'RAG', module: 'ai', allowTracks: '*', aliases: ['Embedding/向量', 'Embedding', '向量'] },
  { id: 'agent', name: 'Agent', module: 'ai', allowTracks: '*', aliases: ['Agent/工具调用', '工具调用'] },
  { id: 'train', name: '模型与训练', module: 'ai', allowTracks: '*', aliases: ['模型基础/训练', '模型基础'] },
  { id: 'infra', name: '推理与部署', module: 'ai', allowTracks: '*', aliases: ['应用与部署'] },
  { id: 'eval', name: '评估与观测', module: 'ai', allowTracks: '*', aliases: ['评估/Eval', 'Eval'] },
  { id: 'data', name: '数据与标注', module: 'ai', allowTracks: '*' },
  { id: 'edge', name: '端侧 AI', module: 'ai', allowTracks: ['ai-edge'] },
  // —— 算法赛道本体标签（2026-09-13 补）——
  // ai-algo 赛道名与章节 subtrack 都是 cv / nlp / rec，词表却长期没有对应取值，
  // 导致「CNN / BERT / 双塔召回」这类领域题被并进「模型与训练」（占 63%，A4 失败）。
  { id: 'cv', name: 'CV', module: 'ai', allowTracks: ['ai-algo', 'ai-data'], aliases: ['计算机视觉', '视觉', '图像'] },
  { id: 'nlp', name: 'NLP', module: 'ai', allowTracks: ['ai-algo', 'ai-data'], aliases: ['自然语言处理', '自然语言'] },
  { id: 'rec', name: '推荐系统', module: 'ai', allowTracks: ['ai-algo'], aliases: ['推荐', 'RecSys'] },
  // 推理与部署三细分：原先一个标签吃下 ai-infra 60% 的题（蒸馏量化 / Serving / TensorRT
  // 全混在一起），且正好卡在 A4 的 60% 红线上。按推理栈层次拆开。
  { id: 'engine', name: '推理引擎', module: 'ai', allowTracks: ['ai-infra', 'ai-mlops'], aliases: ['推理框架', 'TensorRT', 'vLLM'] },
  { id: 'serving', name: '服务化架构', module: 'ai', allowTracks: ['ai-infra', 'ai-mlops'], aliases: ['Serving', '模型服务'] },
  { id: 'compress', name: '模型压缩', module: 'ai', allowTracks: ['ai-infra', 'ai-mlops'], aliases: ['量化', '蒸馏', '剪枝'] },
  // 注：「部署与成本」是历史遗留的过度宽泛标签（覆盖 43% 的 AI 题目），**刻意不做别名直映**，
  //     改由 scripts/taxonomy-reclassify.mjs 按题面语义细分；仅规则判不出的才落 general。
  //     （若在此处加别名，等于把 43% 的题重新塞回单一标签，归类区分度会再次崩塌。）
  { id: 'general', name: '综合应用', module: 'ai', allowTracks: '*', aliases: ['综合'] }
]

// ---- 查找辅助 ----

export function techTermsOf (module: string): TechTerm[] {
  return TECH_VOCABULARY.filter(t => t.module === module)
}

/** 某赛道允许使用的技术标签（用于生成/校验 techNames） */
export function techTermsForTrack (module: string, trackId: string): TechTerm[] {
  return techTermsOf(module).filter(t => t.allowTracks === '*' || t.allowTracks.includes(trackId))
}

/** 该赛道是否允许使用某个展示名 */
export function trackAllowsTechName (module: string, trackId: string, techName: string): boolean {
  return techTermsForTrack(module, trackId).some(t => t.name === techName)
}

/** 历史值 → 规范展示名（命中别名表则转换，否则原样返回） */
export function normalizeTechName (module: string, raw: string): string | null {
  if (!raw) return null
  const hit = TECH_VOCABULARY.find(
    t => t.module === module && (t.name === raw || (t.aliases || []).includes(raw))
  )
  return hit ? hit.name : null
}

/* ---------------- 写入前统一收敛（P0 防回归闸口） ----------------
 *
 * 背景：tech 曾经有 4 套互不相干的硬编码分类器（server/utils/db.ts、_reseed.mjs、
 * gen-interview.mjs、gen-interview-roadmap.mjs），各自产出如「应用与部署」「模型基础/训练」
 * 「Embedding/向量」「JavaScript/TS」等非词表标签。任何一处新增题目都会把非受控值写进库，
 * 破坏 A3 断言、并让 UI 二级筛选再次出现「点了没题」。
 *
 * 收敛策略：不推翻各脚本已调优的关键词评分逻辑（避免质量回退），而是在**写入前**统一过闸——
 * 任何来源的 tech 原始值（LLM 直出 / 关键词分类 / 历史脏值）都经 `canonicalizeTech` 转换为
 * 受控词表内的规范名；无法识别者落该模块的「综合应用」兜底，绝不产生词表外取值。
 */

export interface TechResolveEntry {
  /** 规范展示名 */
  name: string
  /** 该规范名允许的赛道白名单 */
  allowTracks: string[] | '*'
}

/** module → (小写的原始值: 名称/别名) → 解析结果。构建期一次算好，供 .mjs 侧整体导出复用。 */
export const TECH_RESOLVE: Record<string, Record<string, TechResolveEntry>> = (() => {
  const out: Record<string, Record<string, TechResolveEntry>> = {}
  for (const t of TECH_VOCABULARY) {
    const bucket = out[t.module] || (out[t.module] = {})
    for (const key of [t.name, ...(t.aliases || [])]) {
      const k = String(key).trim().toLowerCase()
      if (k && !bucket[k]) bucket[k] = { name: t.name, allowTracks: t.allowTracks }
    }
  }
  return out
})()

/** 各模块兜底规范名（统一为「综合应用」，取代历史脏值「综合」） */
export const TECH_FALLBACK: Record<string, string> = {
  frontend: '综合应用',
  backend: '综合应用',
  devops: '综合应用',
  ai: '综合应用'
}

/**
 * 任意来源的 tech 原始值 → 规范展示名。
 * @param trackId 可选；给定时会校验该赛道是否允许此标签，越界视为未识别（返回 null）。
 * @returns 规范名；不在词表内（或该赛道不允许）返回 null，由调用方落兜底。
 */
export function resolveTech (module: string, raw: string | null | undefined, trackId?: string | null): string | null {
  const bucket = TECH_RESOLVE[module]
  if (!bucket || !raw) return null
  const entry = bucket[String(raw).trim().toLowerCase()]
  if (!entry) return null
  if (trackId && entry.allowTracks !== '*' && !(entry.allowTracks as string[]).includes(trackId)) return null
  return entry.name
}

/**
 * 写入 DB 前的最后一道闸：保证返回值一定在受控词表内。
 * 识别失败统一落「综合应用」，杜绝词表外取值入库。
 */
export function canonicalizeTech (module: string, raw: string | null | undefined, trackId?: string | null): string {
  return resolveTech(module, raw, trackId) || TECH_FALLBACK[module] || '综合应用'
}
