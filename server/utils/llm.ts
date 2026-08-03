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
    const res = await (globalThis as any).fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 1500,
        stream: false
      })
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`LLM 请求失败 ${res.status}: ${txt.slice(0, 200)}`)
    }
    const data = await res.json()
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
