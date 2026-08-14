import { describe, it, expect } from 'vitest'

// 离线测试：stub globalThis.fetch 返回 SSE 流，验证 chatStream 解析 + 中断。
process.env.DEEPSEEK_API_KEY = 'test-key'
const { getLlm } = await import('../server/utils/llm')

function sseResponse(chunks) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    }
  })
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

// 永不产出 body、且尊重 signal 中断的 fetch（用于 abort 测试）
function hangingFetch(_url, init) {
  const sig = init?.signal
  const stream = new ReadableStream({
    start(controller) {
      if (!sig) return
      if (sig.aborted) controller.error(new DOMException('aborted', 'AbortError'))
      else sig.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')), { once: true })
    }
  })
  return new Response(stream, { status: 200 })
}

describe('llm chatStream', () => {
  it('解析 SSE delta 并拼接内容，且解析最终 usage 日志', async () => {
    const saved = globalThis.fetch
    globalThis.fetch = async () => sseResponse([
      'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"，世界"}}]}\n\n',
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_cache_hit_tokens":10,"prompt_cache_miss_tokens":2}}\n\n',
      'data: [DONE]\n\n'
    ])
    try {
      const out = []
      for await (const piece of getLlm().chatStream([{ role: 'user', content: 'hi' }])) {
        out.push(piece)
      }
      expect(out.join('')).toBe('你好，世界')
    } finally {
      globalThis.fetch = saved
    }
  })

  it('缺少 DEEPSEEK_API_KEY 时抛错', async () => {
    const savedKey = process.env.DEEPSEEK_API_KEY
    delete process.env.DEEPSEEK_API_KEY
    try {
      const gen = getLlm().chatStream([{ role: 'user', content: 'x' }])
      await expect((async () => { for await (const _ of gen) {} })()).rejects.toThrow(/缺少 DEEPSEEK_API_KEY/)
    } finally {
      process.env.DEEPSEEK_API_KEY = savedKey
    }
  })

  it('通过 signal 可中断流式', async () => {
    const saved = globalThis.fetch
    globalThis.fetch = hangingFetch
    const ac = new AbortController()
    const gen = getLlm().chatStream([{ role: 'user', content: 'x' }], {}, ac.signal)
    const p = (async () => { for await (const _ of gen) {} })()
    ac.abort()
    await expect(p).rejects.toThrow()
    globalThis.fetch = saved
  })
})
