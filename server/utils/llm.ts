// LLM 子系统：可插拔厂商（当前 Deepseek，OpenAI 兼容接口）
// 设计目标：业务层只依赖 getLlm().chat()；切换厂商仅需在 .env 配置 LLM_BASE_URL / LLM_MODEL / 密钥。
// 参考 server/utils/payment.ts 的工厂模式：惰性读取 process.env，不在 import 时联网。

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
export interface ChatOptions {
  temperature?: number
  maxTokens?: number
}
export interface LlmClient {
  model: string
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>
}

/* ---------------- Deepseek（OpenAI 兼容 /v1/chat/completions） ---------------- */
class DeepseekClient implements LlmClient {
  model = process.env.LLM_MODEL || 'deepseek-chat'
  private baseUrl = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')

  // 密钥在调用时读取（而非构造时缓存），便于运行时注入/轮换，也便于测试临时摘除
  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('LLM 未配置：缺少 DEEPSEEK_API_KEY')
    const timeoutMs = opts.timeoutMs ?? 30000
    let res
    try {
      res = await (globalThis as any).fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 1500,
          stream: false
        }),
        signal: AbortSignal.timeout(timeoutMs)
      })
    } catch (e: any) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new Error(`LLM 请求超时（${timeoutMs}ms），请稍后重试`)
      throw e
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`LLM 请求失败 ${res.status}: ${txt.slice(0, 200)}`)
    }
    const data = await res.json()
    // 缓存命中统计：仅 Deepseek 在 usage 中返回 prompt_cache_*_tokens，缺失则跳过（不报错、不影响主流程）
    const usage = data?.usage
    if (usage) {
      const hit = Number(usage.prompt_cache_hit_tokens) || 0
      const miss = Number(usage.prompt_cache_miss_tokens) || 0
      cacheStats.calls++
      cacheStats.hit += hit
      cacheStats.miss += miss
      const total = hit + miss
      const ratio = total ? ((hit / total) * 100).toFixed(1) : '0.0'
      // 单行结构化日志，便于在服务器输出中 grep `[LLM][cache]` 量化命中率
      console.log(`[LLM][cache] model=${this.model} hit=${hit} miss=${miss} hitRatio=${ratio}%`)
    }
    return data?.choices?.[0]?.message?.content?.trim() || ''
  }
}

let instance: LlmClient | null = null
export function getLlm(): LlmClient {
  if (!instance) instance = new DeepseekClient()
  return instance
}
export function llmEnabled(): boolean {
  return !!process.env.DEEPSEEK_API_KEY
}

/* ---------------- 缓存命中统计（诊断用） ----------------
 * Deepseek 默认开启上下文缓存（前缀精确 token 匹配）。本模块在 chat() 内解析
 * usage.prompt_cache_hit_tokens / prompt_cache_miss_tokens，累加进程内统计并打一行日志，
 * 便于量化「命中率」与验证结构优化（如把动态内容移出 system 提示词）的实际效果。
 * 不改变 chat() 返回类型，调用方无感；getLlmCacheStats() 供运维/调试读取累计值。
 */
const cacheStats = { calls: 0, hit: 0, miss: 0 }
export function getLlmCacheStats() {
  const total = cacheStats.hit + cacheStats.miss
  return {
    calls: cacheStats.calls,
    hitTokens: cacheStats.hit,
    missTokens: cacheStats.miss,
    hitRatio: total ? ((cacheStats.hit / total) * 100).toFixed(1) : '0.0'
  }
}
