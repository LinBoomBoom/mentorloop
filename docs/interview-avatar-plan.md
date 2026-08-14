# P4 数字人面试官技术方案（MentorLoop）

> 承接 P0–P3（文字/语音/视频回合制 + 实时流式）。本文件专攻 **P4 数字人面试官**：用「肖像 + TTS 音频 → 口型动画」呈现一个面对面的 AI 面试官，先把本地零成本方案跑通，SaaS（D-ID/HeyGen/腾讯智影/硅基）留可插拔接口后续再上。

---

## 1. 目标与范围

**做（本期 MVP）：**
- 一个**本地 SVG 动画数字人面试官**：随 TTS 音频**真实振幅（RMS）**开合嘴型，非正弦波假律动；空闲时有呼吸/眨眼微动画。
- 口型由**真实播放音频**驱动（voice/realtime 模式均可），覆盖 Piper 离线、Edge 云端、ws 流式音频；浏览器 `SpeechSynthesis` 兜底路径用"按字数估算时长"的开合动画。
- 三种面试呈现层级清晰：**语音**（仅音频）→ **数字人**（数字人脸 + 你语音/文字）→ **视频**（数字人 + 你摄像头，面对面）。
- 顺手修掉你反馈的"视频模块各种状态不对"：用统一的状态标签机，每个 mode 显式区分 `setup/连接中/聆听中/正在讲话/正在聆听/打断中/评分中/已完成`。

**不做（本期）：**
- 真·SaaS 数字人（图+音频→口型视频，按分钟计费，需 API 密钥 + 资质）。仅留 `DigitalHumanProvider` 接口与 `server/utils/avatar.ts` 占位，验证业务后再接。
- 本地开源 talking-head（MuseTalk/SadTalker，需 GPU）。沙箱/本机均无 GPU，不做。
- 用户上传真人照片生成数字人（涉及肖像权/合规，留 future）。本期数字人用内置 SVG 角色（按音色匹配性别：华嫣/小雅=女、朝文=男）。

---

## 2. 与现有架构的衔接

| 现有模块 | P4 如何复用 / 改造 |
|---|---|
| `app/pages/interview/sim.vue` | 现有 `mouthOpen`（正弦波假律动，428-436）+ 56px 小头像（92-97）替换为 `DigitalHuman.vue` 组件；音频播放从 `<audio>` 元素改成 `AudioBufferSourceNode` 路径以便挂 `AnalyserNode` 取真实 RMS。 |
| `playTts()`（442-485）/ `replayTts()`（653-687） | 服务端返回 blob 后**不再用 `<audio>.src`**，改为 `decodeAudioData` → `AudioBufferSourceNode → AnalyserNode → destination`，RMS 驱动 `mouthOpen`。解决"createMediaElementSource 弄哑元素"的旧坑。 |
| `pumpQueue()`（911-928，realtime） | 在 `src.connect(audioCtx.destination)` 前插入 `analyser`，已有 `AudioBufferSourceNode` 路径，改动极小。 |
| `speakFallback()`（402-425，浏览器 TTS） | 无法取振幅 → 保留"按字数估算时长"的开合动画（fallback），不接 analyser。 |
| `startMouthAnim()/stopMouthAnim()`（428-436） | 改写为：真实音频播放时由 analyser RAF 循环驱动 `mouthOpen`；无 analyser 时（浏览器 TTS 兜底）用原正弦/估算逻辑。 |
| `server/utils/avatar.ts`（**新增**） | `DigitalHumanProvider` 接口 `{ generate(portrait, audioUrl): Promise<{videoUrl}> }`；`LocalSvgAvatar`（默认，纯前端渲染，不发起服务端请求）；`DIdProvider`/`HeyGenProvider` 仅留接口签名 + env 开关（`AVATAR_PROVIDER`），未配置则为 local。`getAvatar()` 工厂。 |
| 三种模式 UI | `sim.vue` 顶部 tab 增「数字人」；`video` 模式改为"数字人（左）+ 你摄像头（右）"面对面布局。 |

**关键判断**：P4 MVP 的口型动画**完全在客户端**（SVG + Web Audio RMS），不依赖任何服务端/第三方，零成本、零密钥、离线可用，与"免费层极厚"基调一致。SaaS 数字人仅作为未来付费升级的接口占位。

---

## 3. 数字人渲染方案（本地 SVG）

`app/components/DigitalHuman.vue`（纯 SVG + Vue 响应式，无需 window，SSR 安全）：
- **结构**：头部/发型/眉/眼/嘴。`mouthOpen`（0..1）驱动嘴部路径高度（或椭圆 `ry`）。
- **性别匹配**：`gender` prop 来自当前 `selectedVoice` 的 gender（华嫣/小雅=female、朝文=male）→ 切换发型/配色，呈现"对应嗓音的数字人"。
- **空闲动画**：`speaking=false` 时轻微缩放（呼吸）+ 定时眨眼（CSS/RAF），避免"死人脸"。
- **讲话**：`speaking=true` 且 `mouthOpen>0` 时嘴随音频开合。

口型映射（纯函数，可单测）：`mapRmsToMouth(rms)`：RMS 0→0，超过阈值线性/平滑映射到 0..1（带 attack/release 平滑，避免抖动）。

---

## 4. 真实音频 RMS 驱动（口型引擎）

统一入口 `playAudioBuffer(buffer, { onEnd })`（client-only composable `useLipSync` 或 sim.vue 内函数）：
```
AudioBufferSourceNode → AnalyserNode → audioCtx.destination
                              │
                         RAF 轮询: getByteTimeDomainData → RMS → mouthOpen（带平滑）
```
- voice 模式：`fetch('/api/vip/interview/tts')` 拿 blob → `decodeAudioData` → `playAudioBuffer`。替代旧的 `<audio>.src` 路径，顺带修掉"元素哑火"旧坑。
- realtime 模式：ws `audio` 块解码后入队，`pumpQueue` 里 `src → analyser → destination`。
- 浏览器 TTS 兜底：`SpeechSynthesisUtterance` 无 analyser → `startMouthAnim` 用「字数/语速估算」开合（保留现有 fallback 思路，但改为更自然的随句开合）。

这样 voice / realtime / 数字人 / 视频 四种模式共用同一口型引擎，状态一致。

---

## 5. 模式与状态标签机（修"状态不对"）

每个 mode 显式状态：`setup`（未开始）/ `connecting`（实时握手中）/ `idle`（等你说）/ `listening`（聆听中）/ `speaking`（面试官讲话）/ `barge`（打断中）/ `evaluating`（评分中）/ `done`（完成）。
- 顶部状态条按 `mode + phase + rtState + interviewerSpeaking + listening/recording` 推导单一标签，避免多种状态文字叠一起造成的"各种状态都不对"。
- 实时模式：`rtState==='speaking'` → "面试官正在说话…（开口可打断）"；否则 `wsConnected?'聆听中…':'连接中…'`。
- 语音/视频：`listening||recording` → "正在聆听…/录音中…"；`interviewerSpeaking` → "面试官正在讲话…"。
- 数字人模式：复用语音的音频路径 + 数字人视觉，状态同语音。

---

## 6. 实施步骤（拆子任务，逐步可审查）

1. **`server/utils/avatar.ts`**：`DigitalHumanProvider` 接口 + `LocalSvgAvatar` 默认实现（无服务端请求）+ `getAvatar()` 工厂 + `AVATAR_PROVIDER` env 开关；SaaS 厂商仅签名占位。补 `tests/avatar.test.mjs`（接口契约 + getAvatar 默认返回 local）。
2. **`app/components/DigitalHuman.vue`**：SVG 脸，`mouthOpen/speaking/gender` props，空闲呼吸/眨眼；`mapRmsToMouth` 纯函数（可导出单测）。`@vue/compiler-sfc` 校验编译。
3. **口型引擎**：`useLipSync` composable（`playAudioBuffer` + analyser RAF + 平滑 `mouthOpen`）；改 `playTts/replayTts` 走 buffer 路径挂 analyser；改 `pumpQueue` 插 analyser。
4. **sim.vue 装配**：顶部增「数字人」tab（`mode='avatar'`）；用 `<DigitalHuman>` 替换 56px 小头像；`video` 模式改"数字人+摄像头"面对面；状态标签机统一；粤语问题若仍需顺手在 `pickBrowserVoice` 加 `zh-CN`/`zh-Hans` 优先（你此前未强制，留作可选）。
5. **校验**：`@vue/compiler-sfc` 编译 sim.vue + DigitalHuman.vue；跑相关单测（avatar + 现有 speech/asr/interview-realtime 防回归）；本机 `npm run dev` 浏览器看数字人开合与状态。

每步独立 commit，可单独 review。

---

## 7. 关键技术风险与对策

| 风险 | 对策 |
|---|---|
| `createMediaElementSource` 弄哑 `<audio>` | 不再用 `<audio>` 元素播 TTS；改用 `decodeAudioData` + `AudioBufferSourceNode → analyser → destination`，天然可挂 analyser 且不哑。 |
| 浏览器 TTS 无振幅 | fallback 用"字数/语速估算"开合动画，不接 analyser。 |
| RMS 抖动（嘴乱颤） | `mapRmsToMouth` 加 attack/release 指数平滑（如 `mouth += (target-mouth)*0.3`）。 |
| SVG 数字人"假" | 用性别匹配 + 呼吸/眨眼微动画提升真实感；明确告知这是"动画数字人"非真人视频，避免过度承诺。 |
| 状态文字叠一起"各种不对" | 单一状态标签机，每 mode 只显示一条主状态。 |
| 沙箱无法实测音视频 | 同 P3：仅本机 `npm run dev` 浏览器验收；CI 单测覆盖纯逻辑（mapRmsToMouth、avatar 工厂、SFC 编译）。 |

---

## 8. 验收标准

- 数字人模式下，面试官说话时嘴随真实音频开合（非正弦假律动）；静音时闭嘴 + 轻微呼吸/眨眼。
- voice/realtime/数字人/视频 四种模式状态条各只显示一条准确状态，无矛盾叠字。
- 视频模式呈现"数字人（左）+ 你摄像头（右）"面对面；数字人模式无摄像头、专注数字人脸。
- `avatar.test.mjs` + 现有 speech/asr/interview-realtime 单测全绿；sim.vue + DigitalHuman.vue SFC 编译通过。
- 本机 `npm run dev` 浏览器实测：数字人开合自然、状态切换正确、打断/评分流程无视觉错乱。

---

## 9. 需用户拍板的决策点

1. **数字人形态**：本地 SVG 动画（推荐，免费离线，RMS 真口型） vs 仅预留 SaaS 接口、暂不接真脸。 → 建议本地 SVG。
2. **模式接入**：新增独立「数字人」tab + video 改面对面（推荐，audio→avatar→video 三级清晰） vs 仅升级 voice 模式内嵌、不新增 tab。 → 建议新增 tab。
3. **肖像来源**：内置 SVG 角色（按音色匹配性别，推荐，零合规风险） vs 允许用户上传照片（涉及肖像权，留 future）。 → 建议内置。
