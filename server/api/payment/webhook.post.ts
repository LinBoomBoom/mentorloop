// 支付回调（真实通道：微信/支付宝推送）。校验签名 + 解密后开通会员。
export default defineEventHandler(async (event) => {
  const provider = getProvider()
  const raw = (await readRawBody(event, 'utf8').catch(() => '')) || ''
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(event.node.req.headers)) {
    if (typeof v === 'string') headers[k.toLowerCase()] = v
  }
  const result = provider.verifyCallback(headers, raw)
  if (!result || !result.paid) {
    // 微信要求返回 200 + {code:'FAIL'} 才不重试；这里返回 200 避免死循环重试
    return json(event, 200, { code: 'FAIL', message: '验签失败' })
  }
  const ok = fulfillOrder(result.orderId, result.transactionId, result.paidAt)
  return json(event, 200, { code: 'SUCCESS', message: ok ? 'ok' : 'processed' })
})
