// P3 Step7：服务端流式 ASR 抽象（供实时面试模式给「无 Web Speech 的浏览器」做语音转写）。
//
// 与 server/utils/asr.ts（回合制 MediaRecorder 上传识别，供 voice/video 模式）**相互独立、互不复用**：
// - asr.ts 是「整段音频 → 转写文本」（OpenAI 兼容 Whisper），被 /api/vip/interview/asr 使用；
// - 本文件是「流式 PCM 块 → interim/final 转写」（WebSocket 流式厂商，供实时 ws 的 audio_chunk 路径）。
// 两者命名/职责分离，避免与 asr.ts 的 getAsr()/AsrProvider 冲突。
//
// 设计取舍（与 docs/interview-realtime-plan.md 对齐）：
// - 接口极简：push(音频块) + end() + 异步迭代产出 {text,isFinal}。真实厂商（Azure/讯飞/Whisper 流式）
//   是 WebSocket 长连接，本期不实现具体厂商，仅留 getStreamAsr() 工厂钩子。
// - 无厂商时（开发/测试）：返回确定性 MockStreamAsr，让本地无需 ASR 密钥即可验证整条实时链路
//   （Safari/Firefox 也能跑通「录音→服务端转写→评分→口播」的演示）。生产环境若无真实厂商，
//   返回 null → 客户端干净降级为文字输入（绝不发假稿）。
//
// 本文件属 server/utils，可被同目录模块相对 import；路由 ws.ts 经 Nitro 自动导入调用 getStreamAsr。

export interface AsrChunk {
  text: string
  isFinal: boolean
}

export interface StreamingAsr {
  // 推入一块浏览器采集的音频（16-bit PCM，采样率由实现自行决定）
  push(chunk: Buffer): void
  // 标记说话结束：刷新并产出最终转写（isFinal=true）
  end(): void
  // 异步产出转写：若干 interim（isFinal=false）+ 最终 {isFinal:true}
  [Symbol.asyncIterator](): AsyncIterator<AsrChunk>
}

// 确定性 MockStreamAsr：push 时产出 interim 进度，end 时产出固定 finalText。
// 内部用「待消费队列 + resolver 栈」实现真正的异步迭代，便于单测驱动。
export class MockStreamAsr implements StreamingAsr {
  private chunks: Buffer[] = []
  private ended = false
  private pending: (AsrChunk | null)[] = []
  private waiters: ((r: IteratorResult<AsrChunk>) => void)[] = []
  private finalText: string

  constructor(opts?: { finalText?: string }) {
    this.finalText = opts?.finalText || '这是一段模拟的语音识别结果。'
  }

  push(chunk: Buffer) {
    this.chunks.push(chunk)
    // 每收到一块音频，给前端一条"识别中"的 interim 反馈（带进度）
    this.enqueue({ text: `（识别中 ${this.chunks.length}）`, isFinal: false })
  }

  end() {
    if (this.ended) return
    this.ended = true
    this.enqueue({ text: this.finalText, isFinal: true })
    this.enqueue(null) // 终止信号（done:true）
  }

  private enqueue(v: AsrChunk | null) {
    this.pending.push(v)
    this.drain()
  }

  private drain() {
    while (this.waiters.length && this.pending.length) {
      const resolve = this.waiters.shift()!
      const v = this.pending.shift()!
      resolve(v === null ? { done: true, value: undefined } : { done: false, value: v })
    }
  }

  next(): Promise<IteratorResult<AsrChunk>> {
    if (this.pending.length) {
      const v = this.pending.shift()!
      return Promise.resolve(v === null ? { done: true, value: undefined } : { done: false, value: v })
    }
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  [Symbol.asyncIterator]() {
    return this
  }
}

export interface StreamAsrFactory {
  create(): StreamingAsr
}

// 工厂：返回可用的流式 ASR 工厂，或 null（不可用 → 客户端降级文字输入）。
// - 配置了 ASR_API_KEY 但本期未实现具体流式厂商 → 返回 null（真实厂商留作后续接入；注意该 Key 当前仅驱动
//   回合制 Whisper 上传识别，与流式实时识别是两回事）。
// - 其余环境：开发/测试用确定性 MockStreamAsr（便于本地验证）；生产环境无真实流式厂商则返回 null。
export function getStreamAsr(): StreamAsrFactory | null {
  // 真实流式 ASR 厂商（Azure Speech / 讯飞 / Whisper 流式）待接入；配置 Key 即视为「已启用但实现未就绪」
  if (process.env.ASR_API_KEY) {
    // TODO(real-vendor): 接入 WS 流式 ASR，构造 VendorStreamAsr 返回。当前返回 null 让客户端干净降级。
    return null
  }
  // 显式强制 mock（测试/演示）：ASR_MOCK=1
  if (process.env.ASR_MOCK === '1') return { create: () => new MockStreamAsr() }
  // 生产环境无真实流式厂商 → 不可用（不发假稿），客户端降级文字输入
  if (process.env.NODE_ENV === 'production') return null
  // 开发/测试默认：确定性 MockStreamAsr，本地无需密钥即可跑通实时链路
  return { create: () => new MockStreamAsr() }
}
