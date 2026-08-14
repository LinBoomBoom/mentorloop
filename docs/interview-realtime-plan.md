# P3 实时流式面试技术方案（MentorLoop）

> 承接 `interview-voice-video-plan.md` 的 P0–P2（已实现：语音/视频回合制，TTS=Piper 默认，STT=浏览器 Web Speech + Safari 走服务端 Whisper）。
> 本文件专攻 **P3 实时流式对话（WebSocket 串联 STT→LLM→TTS，支持打断/插话）**，给出可逐步审查的落地方案。

---

## 1. 目标与范围

**做：**
- 一场面试会话内，候选人与 AI 面试官**实时双向对话**，不必每轮点「提交」。
- 候选人开口 → 实时转写（含 interim 中间结果）→ AI 边想边说（流式 LLM）→ 声音边生成边播（流式/句级 TTS）。
- **打断（barge-in）**：AI 正在说，候选人插话 → 立即打断 AI 发言、转回听候选人。

**不做（本期）：**
- 数字人视频（P4，图+音频→口型视频）。
- 音视频长期归档落库（v19 `interview_media` 已预留，本期仍可「不留存」）。
- 多实例横向扩展（单实例 Nitro 足够，Redis 适配留作 future）。

---

## 2. 与现有架构的衔接

| 现有模块 | P3 如何复用 / 改造 |
|---|---|
| `server/utils/llm.ts` `chat()` | **新增** `chatStream(): AsyncIterable<string>`，`stream:true` 走 Deepseek SSE；`chat()` 保留供给分/复盘等回合制场景。 |
| `server/utils/speech.ts` `TtsProvider` | 新增 `synthesizeStream()`（流式）；**Edge 走 WebSocket 真流式**，**Piper 整段合成按句切**（Piper 本身不支持逐 token 流）。默认仍 Piper，但 P3 实时模式建议用 Edge 流式降延迟（Piper 每句需起子进程，句级延迟可接受）。 |
| `server/utils/asr.ts` `AsrProvider` | 新增 `streamTranscribe()`（流式 interim 结果）。当前 `OpenAiWhisperProvider` 是整段转写，**P3 需新增流式 STT 厂商**（阿里云实时语音识别 / 讯飞实时转写 / OpenAI Realtime），否则只能「录完再转」（退化为近实时，无 interim）。 |
| `server/utils/interview.ts` `answerInterview` | **不改动**评分核心。流式场景把「最终 transcript」按现有 `answer` 字段传入即可；评分/下一题逻辑全盘复用。流式仅影响「对话传输形态」，不影响「评分逻辑」。**实现落点**：新建 `server/utils/interviewRealtime.ts`（编排核心，server/utils 可相对 import）`handleSpeechFinal()` 调 `answerInterview` 拿结构化评测 → 拼成自然口播文案 → `getTts().synthesizeStream()` 按句流式推音频；`handleBarge()` 置 `ttsCancelled` 实现打断。路由 `ws.ts` 经 Nitro 自动导入调用，保持 route 文件零相对 import（通过 server-imports 闸门）。 |
| `server/utils/llm.ts` `chatStream` | **本期 ws 编排不直接用** `chatStream` 做 token 流式播报——若用需在第 2 次 LLM 调用里把结构化评测改写成自然口语，反而增加延迟/成本且重复。改为「1 次 LLM（评分）+ 句级 TTS 流式」，已足够实时观感（`ai_token` 按句 emit 作为字幕）。`chatStream` 仍保留，供后续「真·LLM 逐字流式」增强。 |
| `server/api/vip/interview/tts.get.ts` `asr.post.ts` | 回合制仍用。P3 走新 `ws.ts`，不复用这两个。 |
| `app/pages/interview/sim.vue` | 新增「实时」模式（第三种，与 text/voice/video 并列或用 `mode=realtime`）。复用摄像头/口型动画/字幕组件。 |
| 前端 Web Speech STT | Chrome/Edge 已有 interim 结果（`SpeechRecognition.interimResults=true`）——**这是最便宜的流式 STT**，P3 优先用浏览器端流式，仅在 Safari/Firefox 回退到服务端流式或整段 ASR。 |

**关键判断**：P3 的流式 STT **首选浏览器端 Web Speech（Chrome/Edge）**，零成本、有 interim；服务端流式 STT（阿里云/讯飞）仅作 Safari 增强或「更稳的中文实时转写」可选件。这样 P3 在**不引入任何按量计费 STT** 的前提下即可上线核心体验，与 P0–P2 的「免费跑通」基调一致。

---

## 3. 实时链路（单轮）

```
候选人麦克风 ──getUserMedia──> [VAD 端点检测]
        │ 说话开始                 │
        ▼                          ▼
[流式 STT] ──interim 文本──> 客户端实时字幕("你说：…")
        │ 说话结束(final)
        ▼
[LLM chatStream] ──token 流──> 服务端缓冲到句边界("。！？")
        │                           │
        │                      [TTS synthesizeStream / 按句合成]
        ▼                           ▼
   客户端字幕("面试官：…")     音频块 ──> 客户端播放队列
                                   │
                          [同时继续监听 VAD]
                                   │ 候选人插话
                                   ▼
                          barge-in: 中止 LLM token 迭代 + 取消 TTS + 客户端停播 → 回到 [流式 STT]
```

---

## 4. 状态机（服务端 per 连接）

```
IDLE ──(候选人开始说话)──> LISTENING
LISTENING ──(VAD 静音阈值触发 final)──> THINKING
THINKING ──(LLM 流式启动)──> SPEAKING
SPEAKING ──(候选人 barge-in)──> LISTENING      ← 打断
SPEAKING ──(本轮说完)──> LISTENING             ← 自然轮转
LISTENING/SPEAKING ──(会话结束/异常)──> CLOSED
```

服务端维护 `sessionId`、`turn`、`currentAbort`（LLM 流的 `AbortController`）、`ttsCancelled` 标志。

---

## 5. 后端模块设计

### 5.1 `server/api/vip/interview/ws.ts`（新增，Nitro `defineWebSocketHandler`）
- 连接即校验登录（`getUser(event)`），绑定 `sessionId`（前端建连时带 token + sessionId）。
- 消息协议（JSON）：
  - `→` 客户端→服务端：`{type:'speech_start'|'speech_final', text?}`（浏览器流式 STT 时，文本由客户端转写好直接发，服务端不碰音频；Safari 走服务端流式 STT 时发音频块 `{type:'audio_chunk', data:base64}`，后续接入）/ `{type:'barge_in'}`（插话打断）/ `{type:'ping'}`（保活）。
  - `←` 服务端→客户端：`{type:'interim', text}`（候选人定稿转写回显"你说：…"）/ `{type:'turn_eval', evaluation, analysis, nextQuestion, isLast, score, summary}`（结构化评测卡，与口播解耦）/ `{type:'ai_token', text}`（AI 口播逐句字幕）/ `{type:'audio', data:base64, mime, ext}`（TTS 音频块，按句）/ `{type:'barge_ack'}`（已打断、停播）/ `{type:'turn_end'}`（本轮自然结束，AI 说完转听候选人）/ `{type:'pong'}`（保活响应）。
- **Caddy 透传**：`Caddyfile` 需 `reverse_proxy` 下保留 WebSocket（`upgrade` 头）并放宽 `proxy_read_timeout`（长连接）。当前 Caddyfile 若无 WS 段需补。

### 5.2 `server/utils/llm.ts`（改造，非重写）
```ts
export interface LlmClient {
  model: string
  chat(messages: ChatMessage[], opts?): Promise<string>          // 现有
  chatStream(messages: ChatMessage[], opts?, signal?): AsyncIterable<string>  // 新增
}
```
- `DeepseekClient.chatStream`：`fetch(... stream:true)`，按 SSE `data:` 行 `yield` `choices[0].delta.content`；支持 `AbortSignal` 供打断。
- 复用现有缓存统计日志（`[LLM][cache]`）。

### 5.3 `server/utils/speech.ts`（改造）
- `TtsProvider` 新增可选 `synthesizeStream?(text, opts): AsyncIterable<{chunk:Buffer,mime}>`.
  - `EdgeTtsProvider`：用 edge-tts 的 WebSocket 流式输出（命中即 `yield` 音频段）。
  - `PiperTtsProvider`：整段合成后**按句切分 yield**（句级延迟，可接受），保持离线零成本。
  - `MockTtsProvider`：整段蜂鸣 yield（测试用）。
- 复用 `ttsCacheKey`/`synthesizeWithCache` 思路：句级文本命中题库缓存则跳过合成。

### 5.4 `server/utils/asr.ts`（改造，可选增强）
- 新增流式厂商 `AliyunRealtimeProvider`（WebSocket 实时语音识别，返回 interim+final）；非必做，优先级低于「浏览器端流式 STT」。
- 若不做，`asr.ts` 维持整段转写，Safari 在 P3 退化为「录完一段再发」（仍可对话，只是无实时 interim）。

---

## 6. 前端设计（`sim.vue` 实时模式）

组件复用：`InterviewerPanel`(口型动画+字幕)、`CandidateCamera`、`LiveCaptions`、`TtsPlayer`，全部沿用 P2。

新增/改造：
- **VAD（端点检测）**：用 Web Audio `AnalyserNode` 做音量阈值 + 静音计时（如连续 800ms 低于阈值=说话结束）。也可用 `vad()`（@ricky0123/vad-web，Silero 模型，效果好但需下载 ~数 MB 模型，可后续加）。
- **流式 STT（Chrome/Edge）**：`SpeechRecognition` 开 `interimResults=true`、`continuous=true`，`onresult` 把 interim/final 实时发往 ws。这是 P3 默认路径。
- **播放队列**：收到 `audio` 块 push 进 `AudioBufferQueue` 顺序播放；`barge-in` 时清空队列并 `audioEl.pause()`。
- **打断交互**：VAD 检测到说话开始 → 立即发 `{type:'speech_start'}` → 服务端中止 LLM/TTS → 客户端停播。需在前端做 ~150ms 去抖避免误触。
- **回波消除（AEC）**：`getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})` 由浏览器/系统处理；AI 声音从扬声器出、麦克风收，靠 AEC 抑制。若仍串音，可在播放 AI 音频时临时 `disable` 麦克风上传（简单但丢打断灵敏度）——作为兜底开关。

---

## 7. 关键技术风险与对策

| 风险 | 对策 |
|---|---|
| **延迟（LLM 首 token + TTS 首包）** | 句级合成（LLM 出句即合成该句）+ Edge 流式 TTS；Piper 句级延迟约 100–300ms/句，可接受。 |
| **打断误触 / 漏触** | VAD 去抖 + 播放期间「说话开始即打断」；提供「手动打断按钮」兜底。 |
| **回波（AI 声音被自己麦克风收成 input）** | 浏览器 AEC + 播放时可选静麦；服务端流式 STT 仅 Safari 用，同样依赖 AEC。 |
| **单实例状态** | 每连接独立 `AbortController` + 内存状态，单实例足够；**多实例才需 Redis 会话路由**（future）。 |
| **Caddy 拦截 WS / 超时** | Caddyfile 补 `header_up Upgrade` + `proxy_read_timeout 3600s`；本地 dev（Nitro 直连）无此问题。 |
| **沙箱无法实测 WS** | 本项目沙箱**拦截 WebSocket**（见 P0–P2 文档），故 P3 只能**代码 + 本地 `npm run dev` 浏览器验收**，CI 单测仅覆盖 `llm.chatStream` 解析、`ws` 消息编解码等纯逻辑。 |
| **Deepseek 流式稳定性** | `chatStream` 包 try/catch + 超时；流中断时服务端发 `{type:'turn_end'}` 让前端兜底。 |

---

## 8. 实施步骤（拆子任务，逐步可审查）

1. **`llm.chatStream`**（纯后端，可单测）：SSE 解析 + AbortSignal。补 `tests/llm-stream.test.mjs`。 ✅ 已完成
2. **`speech.synthesizeStream`**（Edge 流式 + Piper 句切）：补单测（mock 路径）。 ✅ 已完成
3. **`ws.ts` 骨架 + 消息协议**：建连/鉴权/ping-pong/关闭。 ✅ 已完成
4. **ws 编排核心**：新建 `server/utils/interviewRealtime.ts`（`handleSpeechFinal` 调 `answerInterview` 评测 → 拼口播 → `synthesizeStream` 按句推音频 + `ai_token` 字幕；`handleBarge` 置 `ttsCancelled` 打断）；`ws.ts` 改为经自动导入的薄封装；`startInterview` 接受 `mode='realtime'`。补 `tests/interview-realtime.test.mjs`。 ✅ 已完成
5. **前端实时模式**：`sim.vue` 接 ws + VAD + 播放队列 + 打断 UI。（待做）
6. **Caddyfile WS 段** + 本地端到端验收（Chrome/Edge）。（待做）
7. **（可选）`asr.ts` 流式厂商**：Safari 真实时转写。（待做，优先级低）

每步独立 commit，可单独 review；步骤 1–3 不依赖浏览器即可单测，优先完成防回归。

---

## 9. 验收标准

- Chrome/Edge 打开实时模式：开口即实时字幕，AI 边说边出声；中途插话 AI 立即停、转听你。
- 单实例连续 10 轮对话无连接泄漏（ws 关闭释放 `AbortController`/AudioContext）。
- `llm.chatStream` / `ws` 编解码单测通过；语音单测（speech/asr）仍 8/8 通过。
- Caddy 部署后 WS 不断开（长连接透传）。

---

## 10. 成本与隐私

- **默认零额外成本**：流式 STT 用浏览器 Web Speech（免费）；TTS 用 Piper（离线）或 Edge（免费）。
- 仅在用户选「更稳的中文实时 STT（阿里云/讯飞）」时才按量计费，且为可选件。
- 沿用 `consent_at` 授权；实时模式仍需勾选麦克风/摄像头授权；不强制留存音视频。

---

## 11. 需用户拍板的决策点

1. **默认 TTS 在实时模式用 Piper（离线、零成本、句级延迟）还是 Edge 流式（更低延迟、需联网）？** 建议：实时模式默认 Edge 流式，离线时回退 Piper。
2. **是否同步做 Safari 服务端流式 STT（阿里云/讯飞，按量）？** 还是 Safari 在 P3 先退化为「录段发送」？建议：先退化，验证主路径后再加。
3. **VAD 用轻量 Web Audio 阈值（零依赖、够用）还是 Silero `@ricky0123/vad-web`（更准、需下载模型）？** 建议：先用轻量阈值，后续可换。
4. **实时模式是否作为第四种 `mode` 还是并入 `voice`？** 建议：独立 `mode='realtime'`，与现有 text/voice/video 并列，便于数据分析与灰度。
