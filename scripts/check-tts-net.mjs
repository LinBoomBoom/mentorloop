// 本机网络自检：判断 Edge TTS（云端）在你本机到底能不能连微软端点。
// 用法（在你自己机器、项目根目录）：  node scripts/check-tts-net.mjs
// 注意：本脚本必须在「用户本机」运行，沙箱/服务器运行结果不代表你本机情况。
import dns from 'node:dns/promises'
import net from 'node:net'

const HOST = 'speech.platform.bing.com'

console.log('=== Edge TTS 连通性自检 ===\n')

// 1) DNS 解析
console.log('[1] DNS 解析', HOST, '...')
let dnsOk = false
try {
  const addrs = await dns.lookup(HOST, { all: true })
  console.log('    OK ->', addrs.map((a) => a.address).join(', '))
  dnsOk = true
} catch (e) {
  console.log('    FAIL', e.message)
  console.log('    => 本机 DNS 无法解析微软端点（被墙 / 被代理拦截 / 离线）')
}

// 2) TCP 443 连通
console.log('\n[2] TCP 443 连通性 ...')
let tcpOk = false
await new Promise((resolve) => {
  if (!dnsOk) { console.log('    跳过（DNS 未通过）'); return resolve() }
  const sock = net.connect(443, HOST)
  const done = (msg) => { console.log(msg); resolve() }
  sock.setTimeout(6000)
  sock.on('connect', () => { tcpOk = true; console.log('    OK 端口可达'); sock.destroy(); resolve() })
  sock.on('timeout', () => done('    TIMEOUT 6s 内未连上（被防火墙/运营商拦截）'))
  sock.on('error', (e) => done('    FAIL ' + e.message))
})

// 3) edge-tts 实际合成
console.log('\n[3] edge-tts 实际合成测试 ...')
try {
  const { tts } = await import('edge-tts/out/index.js')
  const buf = await tts('面试语音连通性测试。', { voice: 'zh-CN-XiaoxiaoNeural' })
  console.log('    EDGE_OK 合成成功 bytes =', buf.length)
  console.log('    => 你本机可正常走云端 Edge TTS（有感情、16 种音色即时生效）')
} catch (e) {
  const m = String(e?.message || e)
  console.log('    EDGE_FAIL', m.slice(0, 160))
  if (/403|Unexpected server response/.test(m)) {
    console.log('    => 网络可达但被服务端拒绝（典型：沙箱/代理/企业网关拦截）。本机若也如此，云端 TTS 不可用。')
  } else if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo/.test(m)) {
    console.log('    => 到不了微软端点（DNS/防火墙/运营商拦截）。云端 TTS 不可用。')
  }
  console.log('    => 建议改用本地方案：①本机装微软中文神经语音包（浏览器合成）；②服务端本地 Piper 离线合成。')
}

console.log('\n=== 自检结束 ===')
