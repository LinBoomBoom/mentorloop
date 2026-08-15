# 语音音色"去限制" + 数字人替代方案 — 技术方案与工作流

> 目标：① 语音音色不再焊死 3 个人格，而是暴露平台支持的**全部**音色；② 数字人寻找更优（更"活"、更好看）的本地/云端替代方案。

## 一、语音：从"3 个人格"改为"平台全部音色"

### 现状（读码确认）
- `server/utils/speech.ts`：`ALIYUN_VOICES` / `EDGE_VOICES` / `PIPER_VOICES` 各只列 3 项；`voices.get.ts` 按 provider 返回这 3 项；`app/pages/interview/sim.vue` 的 `piperVoices` 只渲染这 3 项，`currentVoicePreset()` 也假设只有 3 个。
- 缓存 `ttsCacheKey(text, voice, provider)` 已含 provider+voice 维度，任意 voice 都能正确隔离，无技术障碍。

### 平台真实支持（已查官方文档）
- **阿里云 `cosyvoice-v3-flash`**：官方预置音色 **~45 个**（男女声齐全，含年龄/场景/是否支持情绪 Instruct），例如 longxiaochun(女·温柔)、longwan(男·沉稳)、longanyang(阳光男·支持情绪指令)、longyingmu_v3(优雅知性女)…… 且 DashScope **没有干净的"列举音色" REST API**，规范来源就是官方帮助页的静态清单 → 只能**烘焙成内置目录**。
- **Piper**："磁盘上装了几个模型就应有几个"。当前 `listPiperVoices()` 只认 `PIPER_VOICES` 里 3 个已知 id，多装的 .onnx 不显示 → 改为**扫描 `data/piper/models/*.onnx` 目录动态生成**（已知 id 带性别/中文标签，未知文件用文件名生成兜底标签）。
- **Edge**：`edge_tts.list_voices()` 可拉全部中文 Neural 嗓音；但用户网络实测微软端点 403。为下拉仍可用，烘焙一份**中文 Neural 精选集（~40）**作静态兜底。

### 推荐改动
1. **`speech.ts`**
   - 新增 `ALIYUN_VOICE_CATALOG`：烘焙 `cosyvoice-v3-flash` 全部 ~45 音色 `{param, name, gender, age, scenario, instruct?(bool)}`；`listAliyunVoices(model)` 按 `ALIYUN_TTS_MODEL` 过滤返回全部。
   - `listPiperVoices()` 改为目录扫描（动态全部）。
   - 新增 `listEdgeVoices()` 烘焙中文 Neural 精选集。
   - 每 provider 的 `listVoices()` 对**每个项加 `recommended?: boolean`** —— 3 个人格（huayan/xiao_ya/chaowen）标 `recommended:true` 作默认推荐，但其余全部照常列出。
   - `AliyunTtsProvider.synthesize`：voice 参数直接用前端传来的任意 `param`（不再只认 3 个 id；保留"未知 param 回退默认"兜底）。
2. **`voices.get.ts`**：直接 `return { provider, voices: getTts().listVoices() }`（已在接口里加 `listVoices` 方法到各 Provider，或导出顶层 `listVoicesByProvider()`）。
3. **`sim.vue` 前端**
   - `piperVoices` → 改名 `voiceOptions`；下拉渲染**全部**音色，每项显示 `label · 性别 · 场景`，推荐项加「推荐」徽标。
   - `selectedVoice` 可以是任意 voice param；`currentVoicePreset()` → `currentVoiceMeta()`（按 id 查 meta，查不到用兜底）。
   - 数字人头像的性别/外观由选中 voice 的 gender 派生（见下）。
4. **`DigitalHuman.vue` / `avatarEngine.ts`**
   - 现有 `renderAvatarForVoice(voiceId)` 只认 huayan/xiao_ya/chaowen 三映射。改为 `voiceAppearance(voiceId, gender)`：已知 id 用既定 seed+style；未知 id 用 `hash(voiceId)` 生成稳定 seed + 按 gender 选 lorelei(personas 女)/openPeeps(男)，保证**每个音色都有稳定且可区分的二次元脸**。

### 风险与对策
- 阿里云音色与 model 强绑定（v3-flash 的音色 v3-plus 不一定有）→ 目录按 `model` 分组，切 `ALIYUN_TTS_MODEL` 时只列该 model 支持的音色。
- Edge 静态集可能与实时有出入 → 仅作下拉展示，运行时仍以 `edge-tts` 实际返回为准（误差仅限标签层面）。
- 下拉项变多（~45）→ UI 改为可滚动/分组（男声/女声/推荐），不影响布局对齐（沿用 layout 1200px 容器）。

---

## 二、数字人：替代方案调研

| 方案 | 真实感 | 是否离线 | 密钥/费用 | 实时交互适配 | 工作量 |
|---|---|---|---|---|---|
| **A. 增强当前 DiceBear** | 中（2D 静态脸+嘴斑） | ✅ 离线 | 免费 | 好（已有 RMS 嘴型） | 低 |
| **B. 本地 3D VRM（@pixiv/three-vrm + three.js）** | 高（3D 半身、可转头/眨眼/嘴型） | ✅ 离线 | 免费/开源 | 好（MorphTarget 接现有 RMS） | 中 |
| **C. 云端 talking-head（D-ID / HeyGen / 国内云数字人）** | 最高（照片级） | ❌ 需联网 | 密钥 + 按分钟计费（D-ID $5.9/月起，HeyGen $29/月起） | 一般（流式有 15s 取整/延迟，实时面试略重） | 中（接入） |

### 调研结论
- **A**：最稳，但用户已嫌"太单调/不够活"，天花板低。
- **B（推荐构建，本次采用）**：VRM 是开放格式（three-vrm 为 MIT），可用 VRoid Studio 免费生成/或项目内置一个示例 VRM（放入 `app/public/avatars/`，运行时经 Nitro 以 `/avatars/default.vrm` 提供）；在浏览器用 three.js 加载，把现有 `useLipSync` 的 RMS 接到嘴巴 MorphTarget，再加定时眨眼/待机微动。完全离线、无密钥、视觉"活"很多，与本项目的离线优先基调一致。代价：需引入 `three` + `@pixiv/three-vrm` 依赖，并提供一个默认 VRM 资源。
- **C**：真实感最高，但需密钥+联网+计费，且你网络已挡微软，云端数字人域名同样可能不稳；更适合"生成面试回顾视频"而非实时对话。建议作为**可选的未来 Connector**，本次不默认接。

### 推荐落地
- 以 **B 为本次真正实现目标**（本地 3D VRM），**A 保留为降级兜底**（加载 VRM 失败时回退 DiceBear）。
- 数字人组件抽象为 `DigitalHuman` 统一入口：内部按 `runtimeConfig.public.avatarMode`（`2d|3d`）选择渲染器；`portraitId`/`gender` 仍由选中 voice 派生。

---

## 三、工作流拆解（分阶段、可逐步审查）

### 阶段 1 · 语音全量音色（无外部依赖，可单测优先）
1. `speech.ts`：烘焙 `ALIYUN_VOICE_CATALOG`（~45）、`listEdgeVoices()`（中文精选）、`listPiperVoices()` 改目录扫描；各列表项加 `recommended` 标记。
2. `speech.ts`：新增顶层 `listVoicesByProvider(provider)`；`AliyunTtsProvider.synthesize` 接受任意 voice param。
3. `voices.get.ts`：返回全量。
4. `sim.vue`：`voiceOptions` 全量渲染 + 推荐徽标 + `currentVoiceMeta()`。
5. `avatarEngine.ts`：`voiceAppearance()` 支持任意 id（稳定 seed+按 gender 选风格）。
6. 单测：`tests/voices.test.mjs` 断言各 provider 列表数量/字段；`avatarEngine` 任意 id 不抛、seed 稳定。
7. commit：`feat(tts): 暴露平台全部音色（阿里云~45/Piper 动态扫描/Edge 中文集）`

### 阶段 2 · 数字人本地 3D VRM（B 方案）— 已落地
1. `package.json` 已加 `three@^0.169` + `@pixiv/three-vrm@^3.3` + dev `@types/three`（用户本机 `npm install` 后生效；默认 2D 路径不依赖 three 也能构建）。
2. 默认 VRM 资源位置：`app/public/avatars/default.vrm`（运行时 URL `/avatars/default.vrm`）；该目录已建 `.gitkeep`，`*.vrm` 已加 `.gitignore`（二进制不入库）。资源由用户自备（VRoid Studio 导出或 three-vrm 官方示例）。
3. 新增 `app/components/VrmAvatar.vue`：onMounted 内动态 `import('three')` + `GLTFLoader` + `@pixiv/three-vrm`；加载 VRM 并用 `expressionManager.setValue('aa'|'oh'|'ih'|'blink', …)` 接 `mouthOpen` + 定时眨眼；WebGL/资源失败 `emit('error')`。
4. `DigitalHuman.vue`：按 `runtimeConfig.public.avatarMode` 切换 2D(DiceBear)/3D(VrmAvatar)；`VrmAvatar` `@error` → `vrmFailed` → 回退 2D。纯函数 `resolveEffectiveAvatarMode(mode, {vrmUrl, fallbackVrmUrl, vrmFailed})` 决策（在 `avatarEngine.ts`）。
5. `nuxt.config.ts`：`runtimeConfig.public.avatarMode`（默认 `'2d'`）+ `avatarVrmUrl`（默认 `'/avatars/default.vrm'`），由 `AVATAR_MODE`/`AVATAR_VRM_URL` env 覆盖。
6. 单测：`tests/avatar-mode.test.mjs`（纯函数解析/回退分支，5 条）；`tests/digital-human-tdz.test.mjs` 已更新为同时守卫 2D/3D 两个 ClientOnly 分支。
7. commit：`feat(avatar): 接入本地 3D VRM 数字人（离线、MorphTarget 接 RMS 嘴型），DiceBear 作降级`（待提交）。

### 阶段 3 · 收尾
- 跑相关测试子集确认全绿（沙箱内存限制，分段跑）。
- `docs/preview/` 更新预览（可选）。
- 分模块 commit，待用户本机 `git push`。

---

## 四、决策点（已与用户确认）

> 通过 AskUserQuestion 已拍板：数字人走 **B 本地 3D VRM（推荐）**，音色范围选 **全部平台音色（推荐）**。

1. **数字人方向**：✅ B 本地 3D VRM（DiceBear 作降级）。C 云端方案留作未来可选 Connector。
2. **音色范围**：✅ 全部平台音色（阿里云 `cosyvoice-v3-flash` 全套 ~44 预置 + Piper 扫描磁盘动态全部 + Edge 中文 Neural 精选集；原 3 个人格标「推荐」但不限制选择）。
3. **默认 VRM 资源**：用户自备放入 `app/public/avatars/default.vrm`（已加 `.gitkeep` 与 `*.vrm` 忽略规则）；缺失时自动回退 2D。
