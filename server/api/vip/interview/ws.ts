// P3 实时流式面试 WebSocket 端点（Nitro crossws）
// 路径：/api/vip/interview/ws（同域连接，浏览器自动带 ml_token Cookie 完成鉴权）
//
// 消息协议（JSON）：
//   客户端 → 服务端：
//     { type: 'speech_start' }                         候选人有声（前端 VAD 触发，用于打断）
//     { type: 'speech_final', text }                  一轮语音转写定稿（浏览器 Web Speech 或 Safari 录音回退）
//     { type: 'audio_chunk', data: base64, mime }     Safari/Firefox 走服务端 ASR 时的音频块（后续接入）
//     { type: 'barge_in' }                            候选人插话，要求立即打断 AI 发言
//     { type: 'ping' }                                保活
//   服务端 → 客户端：
//     { type: 'error', message }
//     { type: 'interim', text }                      实时转写中间结果（回显"你说：…"）
//     { type: 'ai_token', text }                     AI 回答逐 token（流式 LLM）
//     { type: 'audio', data: base64, mime }          TTS 音频块（流式，按句）
//     { type: 'barge_ack' }                          已收到打断，停止 AI 发言
//     { type: 'turn_end' }                           一轮对话结束（自然轮转或打断后）
//     { type: 'pong' }                               保活响应
//
// 本文件为「骨架 + 消息协议 + mock echo」，真实编排（STT→LLM→TTS、barge-in 中止）
// 在下一步（ws 编排核心）接入。此处仅做鉴权、解析协议、并用 mock 回环验证通道。

import { defineWebSocketHandler } from 'h3'

// 从升级请求构造最小 h3-like event，复用 getUser（读 ml_token Cookie）
function peerEvent(peer: any) {
  const cookie = peer?.request?.headers?.get?.('cookie') || ''
  return { node: { req: { headers: { cookie } } } }
}

function sendJson(peer: any, obj: unknown) {
  try { peer.send(JSON.stringify(obj)) } catch { /* 连接已关闭则忽略 */ }
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
    return { context: { authed: true, userId: user.id, sessionId } }
  },

  message(peer, message) {
    const ctx = (peer.context || {}) as any
    if (!ctx.authed) return
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
    if (type === 'speech_start') {
      // 候选人开始说话：真实编排里此处触发打断 AI 发言（barge-in）
      sendJson(peer, { type: 'barge_ack' })
      return
    }
    if (type === 'speech_final') {
      const text = String(msg?.text || '').trim()
      if (!text) return
      // mock 回环：回显 interim + 一段 mock AI 回答（逐 token）+ 结束标记
      sendJson(peer, { type: 'interim', text })
      const reply = `（mock）我已收到你的回答：「${text}」。这是实时流式回环验证。`
      for (const t of reply.split(/(?<=[\uff0c\uff0e\uff01\uff1f])/)) {
        sendJson(peer, { type: 'ai_token', text: t })
      }
      sendJson(peer, { type: 'turn_end' })
      return
    }
    if (type === 'barge_in') {
      sendJson(peer, { type: 'barge_ack' })
      return
    }
    // 其余类型（audio_chunk 等）后续接入，先忽略
  },

  close(peer) {
    const ctx = (peer.context || {}) as any
    void ctx
  },

  error(_peer, _error) {
    // 错误已在各分支兜底，这里留空避免未处理异常上抛
  }
})
