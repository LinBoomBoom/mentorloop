# 面试业务语音 & 视频深化方案（MentorLoop）

> 目标：在现有「纯文本 LLM 面试」基础上，叠加**语音（说/听）**与**视频（面对面）**能力，
> 让模拟面试从「打字问答」升级为「真面试体验」，同时严格控制风险、成本与隐私。

---

## 1. 现状与差距

当前面试链路（已读源码确认）：

- 前端 `app/pages/interview/sim.vue`：文字输入 → 提交。
- 后端 `server/api/vip/interview/start|answer` → `server/utils/interview.ts`：
  - `startInterview`：从题库抽首题（或 LLM 生成），落库 `interview_sessions`。
  - `answerInterview`：把回答文本喂给 Deepseek，返回「评分 + 改进建议 + 答案解析 + 下一题」，最多 6 题后给综合评估。
- 存储：`interview_sessions.messages` 存 JSON 对话；单实例 Nitro + better-sqlite3；`.env` 配 `DEEPSEEK_API_KEY`。
- LLM 层 `server/utils/llm.ts`：已实现**可插拔 `LlmClient` 工厂 + 惰性读 env + 跨用户缓存**。

差距：**只有文本通道**。没有语音输入（STT）、没有语音输出（TTS）、没有摄像头/视频、没有实时流式对话。

---

## 2. 目标体验（三层递进）

1. **语音面试**：候选人「按住说话」→ 语音转写 → 走现有评分 → 面试官问题用语音朗读出来。
2. **视频面试**：在语音基础上，左侧显示候选人摄像头，右侧是「面试官面板」（头像 + 随 TTS 振幅做口型动画）+ 实时字幕，营造面对面感。
3. **（可选/付费）数字人面试官**：用「肖像图 + TTS 音频」驱动口型视频，完全面对面。

---

## 3. 总体架构

见随附架构图（目标架构 + 回合制流程）。要点：

- **前端**只负责采集（getUserMedia 麦克风/摄像头）与播放（TTS 音频、字幕、口型动画）。
- **服务端**复用 `interview.ts` 的评分与出题逻辑，新增 `speech.ts`（STT/TTS 可插拔工厂）与少量 API；不改动评分核心。
- **外部服务**：Deepseek（已有）+ STT 厂商 + TTS 厂商 +（Phase 4）数字人服务。
- **存储**：`interview_sessions` 扩展 + 两张新表（transcripts / media），仍是 SQLite。

---

## 4. 关键设计决策

### 4.1 交互模式：回合制优先，实时流式后置
- **回合制（推荐首发）**：完全复用 `start`/`answer` 请求-响应模型。语音只是「把麦克风音频变文本喂给 answer」「把返回的题用 TTS 读出来」。**风险最低、最快上线、零架构改动**。
- **实时流式（Phase 3）**：WebSocket 串联 流式 STT（ interim 结果）→ 流式 LLM（Deepseek `stream:true`）→ 流式 TTS，支持打断/插话，更自然但复杂度高（端点检测 VAD、回波消除、状态机）。单实例 Nitro 用 `defineWebSocketHandler` 即可，Caddy 透传 WS。

### 4.2 语音链路：可插拔工厂（沿用 LlmClient 模式）
定义接口，env 切换实现，默认免费跑通、生产可换云厂：

```ts
interface SttProvider { transcribe(audio: Buffer|Readable): Promise<{ text: string; confidence: number }> }
interface TtsProvider { synthesize(text: string, opts?): Promise<{ audio: Buffer|Readable; mime: string }> }
```

- **MVP 默认（零成本）**：
  - TTS：`Edge TTS`（微软，免费、流式、中文音色优质，无需密钥）——开发/低成本首选。
  - STT：浏览器端 **Web Speech API**（`SpeechRecognition`）——零后端、零密钥；缺点是 Chrome 系支持好、中文偶有波动、无说话人分离。
- **生产可选（按量计费、中文更稳）**：
  - STT：阿里云实时语音识别（Paraformer）/ 讯飞开放平台实时转写。
  - TTS：阿里云 CosyVoice / 阿里云 TTS / 讯飞语音合成（流式）。
- **抽象价值**：`STT_PROVIDER` / `TTS_PROVIDER` 环境变量切换；`speech.ts` 惰性读 env（同 `llm.ts`）；未来换厂不碰业务代码。

### 4.3 视频方案
- **MVP（Phase 2）**：候选人 `getUserMedia` 摄像头 + 「面试官面板」（静态头像 + Web Audio API 取 TTS 振幅驱动嘴部开合动画）+ 实时字幕。**无口型模型、无 GPU、零额外成本**。
- **数字人（Phase 4，可选/付费）**：`server/utils/avatar.ts` 接数字人服务（图+音频→口型视频）：SaaS（D-ID / HeyGen / 腾讯智影 / 硅基智能）按分钟计费，或本地开源（MuseTalk / SadTalker）需 GPU。建议先留接口，等业务验证后再上。

### 4.4 实时传输（Phase 3）
- Nitro `defineWebSocketHandler` 于 `/api/vip/interview/ws`，每连接绑定一场会话，服务端编排：STT 流 → LLM 流 → TTS 流，向客户端推音频块 + 文本增量。
- 单实例足够；Caddy 增加 `proxy_read_timeout` / 长连接透传。**多实例再考虑 Redis 适配**。

---

## 5. 后端模块设计（新增，不改动评分核心）

- `server/utils/speech.ts`：`SttProvider`/`TtsProvider` 接口 + 工厂（env 切换）+ `EdgeTtsProvider` / `WebSpeechSttProvider`（浏览器侧实现，服务端仅存适配）/ `AliyunSttProvider` / `CosyVoiceTtsProvider`。惰性读 env。
- `server/api/vip/interview/tts.post.ts`：给定文本→返回音频（回合制播放）。**题目来自题库→TTS 结果可缓存**（复用 `ai_answer_cache` 思路，按 `track|问题` 哈希，题库题不变则零重合成）。
- `server/api/vip/interview/stt.post.ts`：接收音频→返回转写（云端 STT 用；浏览器 STT 则可省）。
- `server/api/vip/interview/ws.ts`：Phase 3 实时流式。
- `server/utils/avatar.ts`：Phase 4 数字人（可插拔）。
- **复用**：`answerInterview` 不改动——把「语音转写的文本」当作 `answer` 字段原样传入即可；评分/下一题逻辑全盘复用。

---

## 6. 数据模型（迁移 v19，幂等）

`interview_sessions` 增加列：
- `mode` TEXT（'text' | 'voice' | 'video'）默认 'text'
- `recording_url` TEXT（候选人视频/音频归档，可选）
- `duration_ms` INTEGER
- `consent_at` INTEGER（摄像头/麦克风授权时间戳，**合规必填**）

新表 `interview_transcripts`（每轮 ASR 文本 + 置信度，供复盘与可选表达评分）：
```
id, session_id, turn, role, text, confidence, audio_url, created_at
```

新表 `interview_media`（媒体归档）：
```
id, session_id, kind('candidate_video'|'tts_audio'), url, created_at
```

- 媒体存 `data/media/`（已 gitignore，持久卷）；文档化后续可迁 OSS/S3。
- 迁移沿用 `MIGRATIONS` 数组（幂等 `ALTER TABLE ... ADD COLUMN` + `CREATE TABLE IF NOT EXISTS`），版本号顺延（当前 v18→v19）。

---

## 7. 前端

- 改造/新增 `app/pages/interview/room.vue`：顶部「模式」切换（文字 / 语音 / 视频），复用现有 setup 表单与门禁（VIP/登录）。
- 组件：
  - `InterviewerPanel`：头像 + 波形/口型动画 + 播放控制。
  - `CandidateCamera`：`getUserMedia` 摄像头预览（视频模式）。
  - `VoiceControls`：按住说话 / VAD 自动停止 / 重试。
  - `LiveCaptions`：实时字幕（你说了什么 + 面试官说了什么）。
  - `TtsPlayer`：流式播放 TTS 音频。
- **严格沿用现有 UI 设计系统**：`.btn-primary` / `.chip-tab` / `.page-title` / 品牌色 `#e11d48`，不引入新色板。

---

## 8. 评分增强（可选，不破坏现有）

- 在 `systemPrompt` 增加可选「表达/沟通」维度：仅当本轮存在 transcript（语音模式）时，让 Deepseek 额外输出 `communication`（清晰度、口头禅、结构），与现有 `score` 并列，前端可选展示。
- **视频行为分析（情绪/专注度）标记 future/可选**：涉及隐私与算力，需明确授权，本期不做。

---

## 9. 成本与隐私

- TTS/STT 按量计费；**MVP 用 Edge TTS（免费）+ 浏览器 STT（免费）**，零成本跑通；题库题目 TTS 缓存复用降本。
- **摄像头/麦克风前必须显式授权勾选**（写入 `consent_at`），并补全隐私条款（A13 已存在，需追加音视频采集说明）。
- 原始音视频尽量不长期留存；transcript 足以支撑复盘与评分。媒体路径在持久卷，文档化 OSS 迁移路径。

---

## 10. 分阶段交付（模块化、每阶段可审查，契合项目节奏）

| 阶段 | 内容 | 复杂度 | 风险 |
|------|------|--------|------|
| **P0 脚手架** | `speech.ts` 可插拔 + 迁移 v19 + 一个「试听 TTS」按钮 | 低 | 低（可演示） |
| **P1 语音面试** | 麦克风 STT→answer→TTS 朗读问题（核心 MVP） | 中 | 低 |
| **P2 视频面试** | 候选人摄像头 + 动画面试官 + 字幕 | 中 | 中（权限/兼容性） |
| **P3 实时流式** | WebSocket 串联 STT→LLM→TTS，可打断 | 高 | 中 |
| **P4 数字人（可选）** | 图+音频→口型视频，付费/高阶 | 高 | 中（成本/GPU） |

---

## 11. 已确认决策（2026-08-11）

1. **语音供应商**：免费可跑 MVP — **Edge TTS**（服务端合成）+ **浏览器 Web Speech STT**（客户端转写）；接口可插拔，后续可换阿里云/讯飞/CosyVoice。
2. **视频深度**：后续 P2 用**摄像头 + 动画面试官**（头像随 TTS 振幅做口型动画 + 字幕），不直上数字人。
3. **交互模式**：**回合制**首发（复用现有 start/answer），P3 再做实时流式 WebSocket。
4. **本期范围**：**启动 P0 + P1 实现**（语音面试 MVP）。

## 12. 本期落地（P0 + P1，已完成代码与单测）

- `server/utils/speech.ts`：STT/TTS 可插拔工厂，Edge TtsProvider（lazy import `edge-tts/out/index.js` 的函数式 `tts()`——1.0.1 入口错指 `index.ts`，实际发布产物为 `out/index.js`；API 为 `tts(text,{voice})` 返回音频 Buffer）+ MockTtsProvider（离线合法 WAV）+ 文件缓存。
- `server/utils/db.ts` 迁移 **v19**：`interview_sessions` 加 `mode/recording_url/duration_ms/consent_at`；新增 `interview_transcripts`、`interview_media` 两表。
- `server/api/vip/interview/tts.get.ts`：文本→音频（登录门禁 + 503 降级）。
- `app/pages/interview/sim.vue`：语音模式（麦克风 Web Speech STT→自动提交；面试官问题 TTS 朗读；开启前授权勾选）。
- `app/components/Icon.vue`：补 `mic`/`pause`/`volume` 图标。
- 测试：`tests/speech.test.mjs`（4 通过）、迁移测试（4 通过）、SFC 离线编译校验通过。
- **运行时依赖**：网络恢复后 `edge-tts` 已成功安装（默认走淘宝镜像）。⚠️ 关键坑：edge-tts 1.0.1 是**函数式** `tts(text,{voice})` API（返回音频 Buffer），非 `EdgeTTS` 类——已据此修正 `speech.ts`。当前 Agent 沙箱网络放行普通 HTTPS GET（已验证 `getVoices()` 返回 322 种声音、含 `zh-CN-XiaoxiaoNeural`），但**拦截 WebSocket**，故沙箱内无法实测真实朗读；本地 `npm run dev`（无此代理）应能正常发声。TTS 端点不可用时仍返回 503、前端降级为纯文字。
- **待浏览器验证**：麦克风采集、Web Speech 识别准确率、Edge TTS 朗读需真实浏览器 + 麦克风权限 + 联网确认。

## 13. 本轮新增（P2 视频面试 + 兼容 Safari 语音输入，已完成代码与单测）

**A. 兼容 Safari 的语音输入（服务端 ASR 回退）**
- `server/utils/asr.ts`：可插拔 `AsrProvider` 工厂（沿用 speech.ts 惰性 env 风格）。`OpenAiWhisperProvider` 走 **OpenAI 兼容 Whisper** 端点（`POST {ASR_BASE_URL}/v1/audio/transcriptions`，默认 `https://api.openai.com/v1`，model 默认 `whisper-1`），可经 env 指向任意兼容服务（硅基流动 / Groq / 本地 whisper-server）；`MockAsrProvider` 离线回显用于测试。Node 全局 `FormData`/`File` 直连，无需额外依赖。
- `server/api/vip/interview/asr.post.ts`：登录门禁 + `readMultipartFormData` 取音频 → 转写 → `{text}`；未配置/失败返回 503，前端降级为手动文字输入。
- 前端 `sim.vue` **双通道**：`SpeechRecognition` 可用（Chrome/Edge）→ 浏览器端实时转写；不支持（Safari/Firefox）→ `MediaRecorder` 录音 → `POST /asr` 转写回填。文案由误导性的"按住说话"改为"点击说话 / 录音作答"。

**B. 视频面试（摄像头 + 动画面试官）**
- `sim.vue` 新增 **视频模式**：开启候选人**摄像头实时预览** + **AI 面试官面板**（头像随 TTS 播放振幅做口型/律动动画，由 `AudioContext` AnalyserNode 驱动）+ **实时字幕**（朗读文本同步显示）。
- `startInterview` 现接收并落库 `mode`（`text`/`voice`/`video`）与 `consent_at`（授权时间戳，v19 已建列）。
- 视频模式需勾选「摄像头+麦克风」授权；`onUnmounted` 释放摄像头与 AudioContext。

**C. 设备自检页增强**
- `app/pages/dev/media-check.vue` 新增「录音上传识别（服务端 ASR）」卡片：Safari 桌面可一键验证「录音 → ASR → 文字」整条链路（未配置 `ASR_API_KEY` 时返回 503 并提示，属预期）。

**D. 配置与测试**
- `.env.example` 新增 `ASR_API_KEY` / `ASR_BASE_URL` / `ASR_MODEL` / `ASR_LANG` 说明。
- `tests/asr.test.mjs`（4 通过，覆盖 mock 转写 + 未配置 key 抛错）。`sim.vue`、`media-check.vue` 经 `vue/compiler-sfc` 离线编译通过。

**E. 本地验收步骤**
1. `npm install && npm run dev`，用 **Chrome/Edge 桌面**访问 `http://localhost:3000`（localhost 才允许设备采集）。
2. 先开 `/dev/media-check`：麦克风音量条、摄像头预览、TTS 试听、录音上传 ASR（Safari 在此验证）。
3. 进面试模拟页 → 选**语音/视频**模式 → 勾选授权 → 开始：
   - Chrome/Edge：说一句自动转写提交、面试官问题朗读。
   - Safari：点「录音作答」→ 说话 → 停止 → 服务端转写回填（需 `.env` 配 `ASR_API_KEY`）。
   - 视频模式：右侧看到自己摄像头、左侧面试官头像随朗读律动 + 字幕。
4. 要让 Safari 真正语音输入：`.env` 配 `ASR_API_KEY`（任意 OpenAI 兼容 Whisper 端点）；未配则 Safari 仅能采集、提示改用 Chrome 或手动输入。

**F. 已知边界**
- ASR 走 HTTPS，不受沙箱 WebSocket 拦截影响；但需用户自备 `ASR_API_KEY`（Deepseek 不支持音频，故复用 OpenAI 兼容端点）。
- 本期视频面试仅做**实时预览 + 动画 + 字幕**，音视频录制落库（v19 `interview_media` 表已预留）留作后续。
