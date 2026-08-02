// 支付子系统：可插拔通道（sandbox / wechat / alipay）
// 设计目标：业务层只依赖 PaymentProvider 接口，切换真实通道仅需在 .env 配置商户密钥。
// sandbox 为完整可测试的演示通道；wechat/alipay 为按官方规范实现的真实适配器（配密钥即启用）。
import crypto from 'node:crypto'
import { VIP_ENABLED } from './plans'

export interface ChargeInput {
  orderId: string
  amountCents: number // 单位：分
  subject: string
  description?: string
  openid?: string
}
export interface ChargeResult {
  provider: string
  payUrl?: string // 跳转/扫码支付地址（真实通道）
  qrContent?: string // 二维码内容（native 支付）
  prepayId?: string
}
export interface CallbackResult {
  orderId: string
  transactionId?: string
  paid: boolean
  paidAt?: number
}

export interface PaymentProvider {
  name: string
  createCharge(input: ChargeInput): Promise<ChargeResult>
  // 解析并校验支付回调；返回 null 表示无法识别/校验失败
  verifyCallback(headers: Record<string, string>, rawBody: string | Buffer): CallbackResult | null
}

/* ---------------- Sandbox（完整可测试） ---------------- */
class SandboxProvider implements PaymentProvider {
  name = 'sandbox'
  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    // 演示通道：前端在 /vip/pay/:orderId 展示「模拟支付」按钮，点击后调用内部确认接口完成闭环
    return { provider: 'sandbox', payUrl: `/vip/pay/${input.orderId}`, qrContent: input.orderId }
  }
  verifyCallback() {
    return null // sandbox 通过内部 /api/payment/sandbox/confirm 完成，不走外部回调
  }
}

/* ---------------- 微信支付 v3（Native 扫码，按官方规范实现） ---------------- */
class WechatPayProvider implements PaymentProvider {
  name = 'wechat'
  private mchid = process.env.WECHAT_MCH_ID || ''
  private appid = process.env.WECHAT_APP_ID || ''
  private apiV3Key = process.env.WECHAT_API_V3_KEY || ''
  private serialNo = process.env.WECHAT_SERIAL_NO || ''
  private privateKey = process.env.WECHAT_PRIVATE_KEY || ''
  private siteUrl = process.env.SITE_URL || 'https://mentorloop.example.com'

  private authorization(body: any): string {
    const method = 'POST'
    const urlPath = '/v3/pay/transactions/native'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(8).toString('hex')
    const canonical = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`
    const signature = crypto.sign('RSA-SHA256', Buffer.from(canonical), this.privateKey).toString('base64')
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    const body = {
      appid: this.appid,
      mchid: this.mchid,
      description: input.subject,
      out_trade_no: input.orderId,
      notify_url: `${this.siteUrl}/api/payment/webhook`,
      amount: { total: input.amountCents, currency: 'CNY' }
    }
    const res: any = await (globalThis as any).fetch('https://api.mch.weixin.qq.com/v3/pay/transactions/native', {
      method: 'POST',
      headers: { Authorization: this.authorization(body), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then((r: any) => r.json())
    if (!res.code_url) throw new Error('微信下单失败：' + (res.message || '未知错误'))
    return { provider: 'wechat', payUrl: res.code_url, qrContent: res.code_url }
  }

  verifyCallback(headers: Record<string, string>, rawBody: string | Buffer): CallbackResult | null {
    const resource = JSON.parse(rawBody as string).resource
    if (!resource?.ciphertext) return null
    const buf = Buffer.from(resource.ciphertext, 'base64')
    const authTag = buf.subarray(buf.length - 16)
    const data = buf.subarray(0, buf.length - 16)
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.apiV3Key, resource.nonce as string)
    decipher.setAuthTag(authTag)
    if (resource.associated_data) decipher.setAAD(Buffer.from(resource.associated_data))
    const plain = decipher.update(data).toString('utf8') + decipher.final('utf8')
    const obj = JSON.parse(plain)
    if (obj.trade_state !== 'SUCCESS') return null
    return {
      orderId: obj.out_trade_no,
      transactionId: obj.transaction_id,
      paid: true,
      paidAt: obj.success_time ? Date.parse(obj.success_time) : Date.now()
    }
  }
}

/* ---------------- 支付宝（当面付扫码，RSA2 签名） ---------------- */
class AlipayProvider implements PaymentProvider {
  name = 'alipay'
  private appId = process.env.ALIPAY_APP_ID || ''
  private privateKey = process.env.ALIPAY_PRIVATE_KEY || ''
  private publicKey = process.env.ALIPAY_PUBLIC_KEY || ''
  private siteUrl = process.env.SITE_URL || 'https://mentorloop.example.com'

  private sign(params: Record<string, string>): string {
    const sorted = Object.keys(params).filter((k) => k !== 'sign' && params[k] !== '').sort()
      .map((k) => `${k}=${params[k]}`).join('&')
    return crypto.createSign('RSA-SHA256').update(sorted, 'utf8').sign(this.privateKey, 'base64')
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    const params: Record<string, string> = {
      app_id: this.appId,
      method: 'alipay.trade.precreate',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
      version: '1.0',
      notify_url: `${this.siteUrl}/api/payment/webhook`,
      biz_content: JSON.stringify({ out_trade_no: input.orderId, total_amount: (input.amountCents / 100).toFixed(2), subject: input.subject })
    }
    params.sign = this.sign(params)
    const query = new URLSearchParams(params).toString()
    const res: any = await (globalThis as any).fetch(`https://openapi.alipay.com/gateway.do?${query}`).then((r: any) => r.json())
    const qr = res?.alipay_trade_precreate_response?.qr_code
    if (!qr) throw new Error('支付宝下单失败')
    return { provider: 'alipay', payUrl: qr, qrContent: qr }
  }

  verifyCallback(headers: Record<string, string>, rawBody: string | Buffer): CallbackResult | null {
    const obj = JSON.parse(rawBody as string)
    const notify = obj?.alipay_trade_status_sync_response || obj
    if (notify?.trade_status !== 'TRADE_SUCCESS') return null
    return { orderId: notify.out_trade_no, transactionId: notify.trade_no, paid: true, paidAt: Date.now() }
  }
}

let providerInstance: PaymentProvider | null = null
export function getProvider(): PaymentProvider {
  if (providerInstance) return providerInstance
  const kind = (process.env.PAY_PROVIDER || 'sandbox').toLowerCase()
  if (kind === 'wechat') providerInstance = new WechatPayProvider()
  else if (kind === 'alipay') providerInstance = new AlipayProvider()
  else providerInstance = new SandboxProvider()
  return providerInstance
}

export const USING_REAL_PAY = VIP_ENABLED && (process.env.PAY_PROVIDER === 'wechat' || process.env.PAY_PROVIDER === 'alipay')
