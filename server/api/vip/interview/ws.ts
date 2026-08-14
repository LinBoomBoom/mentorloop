// P3 实时流式面试 WebSocket 端点（Nitro crossws）
// 路径：/api/vip/interview/ws（同域连接，浏览器自动带 ml_token Cookie 完成鉴权）
//
// 消息协议（JSON）：
//   客户端 → 服务端：
//     { type: 'speech_start' }            候选人有声（前端 VAD 触发，用于打断）
//     { type: 'speech_final', text }      一轮语音转写定稿（浏览器 Web Speech 路径）
//     { type: 'barge_in' }                候选人插话，要求立即打断 AI 发言
//     { type: 'ping' }                     保活
//     { type: 'hello', stt, sampleRate }  能力协商：stt='webspeech'|'server'（server=无 Web Speech，走服务端 ASR）；sampleRate=audioCtx.sampleRate（默认 44100）
//     { type: 'audio_chunk', data }       音频块（base64 的 16-bit PCM，服务端 ASR 路径，~100ms 一块）
//     { type: 'speech_end_audio' }        客户端 VAD 判定说话结束 → 刷新 ASR 最终转写
//   服务端 → 客户端：
//     { type: 'error', message }
//     { type: 'interim', text }            候选人本轮定稿转写（回显"你说：…"）
//     { type: 'asr_partial', text }        服务端 ASR 流式中间结果（实时字幕预览，不入库）
//     { type: 'turn_eval', ... }           本轮结构化评测（分数/反馈/解析/是否结束），供前端评测卡
//     { type: 'ai_token', text }           AI 口播逐句（与流式 TTS 同步）
//     { type: 'audio', data: base64, mime, ext }  TTS 音频块（流式，按句）
//     { type: 'barge_ack' }                已收到打断，停止 AI 发言
//     { type: 'turn_end' }                 一轮对话自然结束（AI 说完，转听候选人）
//     { type: 'pong' }                     保活响应
//
// 编排核心在 server/utils/interviewRealtime.ts（经 Nitro 自动导入），本文件仅做：
// 建连鉴权、peer.context 维护 per-connection 状态、协议分发。严禁相对 import server/utils（见 server-imports 闸门）。

import { defineWebSocketHandler } from 'h3'

// 从升级请求构造最小 h3-like event，复用 getUser（读 ml_token Cookie）
function peerEvent(peer: any) {
  const cookie = peer?.request?.headers?.get?.('cookie') || ''
  return { node: { req: { headers: { cookie } } } }
}

function sendJson(peer: any, obj: unknown) {
  try { peer.send(JSON.stringify(obj)) } catch { /* 连接已关闭则忽略 */ }
}

function safeB64(s: any): Buffer {
  try { return Buffer.from(String(s || ''), 'base64') } catch { return Buffer.alloc(0) }
}

export default defineWebSocketHandler({
  open(peer) {
    const user = getUser(peerEvent(peer))
    if (!user) {
      sendJson(peer, { type: 'error', message: '未登录' })
      peer.close(4001, 'unauthorized')
      return { context: { authed: false } }
    }
    const url = new URL(peer.request.url)
    const sessionId = url.searchParams.get('sessionId') || ''
    const conn = createRealtimeConn(user.id, sessionId)
    return { context: { authed: true, conn } }
  },

  async message(peer, message) {
    const ctx = (peer.context || {}) as any
    if (!ctx.authed) return
    const conn = ctx.conn
    if (!conn) return
    let msg: any
    try {
      msg = message.json()
    } catch {
      return
    }
    const type = msg?.type

    if (type === 'ping') {
      sendJson(peer, { type: 'pong' })
      return
    }

    // 候选人开口 / 插话：立即取消在播 TTS，回 barge_ack（AI 停播，转听候选人）
    if (type === 'speech_start' || type === 'barge_in') {
      const wasSpeaking = handleBarge(conn)
      sendJson(peer, { type: 'barge_ack' })
      void wasSpeaking
      return
    }

    if (type === 'speech_final') {
      const text = String(msg?.text || '').trim()
      if (!text) return
      // 回显候选人定稿转写（前端展示"你说：…"）
      sendJson(peer, { type: 'interim', text })
      // 异步编排：评测 + 流式口播 + 音频；并发的 barge 消息会置 conn.ttsCancelled 中断在播音频。
      // 不 await 阻塞后续消息处理——crossws 会在事件循环空闲时调度 barge，从而实时打断。
      await handleSpeechFinal(conn, text, { send: (m) => sendJson(peer, m) })
      return
    }

    // 能力协商：客户端声明自身 STT 能力（webspeech / server）+ 采集率 sampleRate。
    // 若声明走服务端 ASR 但服务端无可用厂商，立即提示降级文字输入。
    if (type === 'hello') {
      const stt = String(msg?.stt || 'webspeech')
      const sampleRate = Number(msg?.sampleRate) || 44100
      if (stt === 'server') {
        conn.sttSampleRate = sampleRate
        if (!getStreamAsr()) {
          sendJson(peer, { type: 'error', message: '服务端语音识别未配置（请在 .env 设置 ASR_PROVIDER=aliyun 并配置 ALIYUN_* 凭证，或设 ASR_PROVIDER=mock 跑通链路）' })
        }
      }
      return
    }

    // 服务端 ASR 路径（Safari / Firefox 等无 Web Speech 的浏览器）：收到 PCM 音频块 → 推入 ASR 会话。
    if (type === 'audio_chunk') {
      const data = safeB64(msg?.data)
      if (!data.length) return
      handleAudioChunk(conn, data, { send: (m) => sendJson(peer, m) })
      return
    }

    // 客户端 VAD 判定候选人说话结束 → 刷新 ASR 最终转写 → 触发评分编排。
    if (type === 'speech_end_audio') {
      endAsrSession(conn)
      return
    }
  },

  close(peer) {
    const ctx = (peer.context || {}) as any
    const conn = ctx?.conn
    if (conn) closeRealtimeConn(conn)
  },

  error(_peer, _error) {
    // 错误已在各分支兜底，这里留空避免未处理异常上抛
  }
})
