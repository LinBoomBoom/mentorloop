// 敏感信息（PII）主动脱敏：在简历送往大模型前，识别并替换可直接定位到个人的信息，
// 确保 AI 不对手机号 / 身份证 / 邮箱 / 微信QQ / 住址 / 银行卡 等敏感字段做分析或处理。
// 返回脱敏后的文本 + 分类计数报告，供前端向用户透明展示「已过滤 N 处敏感信息」。

export interface RedactReport {
  phone: number
  idCard: number
  email: number
  wechat: number // 含微信 / QQ
  address: number
  bankCard: number
  total: number
}

export interface RedactResult {
  text: string
  report: RedactReport
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
// 18 位身份证：6 地区 + 8 出生日期(YYYYMMDD) + 3 顺序 + 1 校验(数字/X)
const ID18 = /(?<!\d)(\d{6})(\d{4})(\d{2})(\d{2})(\d{3})([\dXx])(?!\d)/g
const PHONE = /(?<!\d)1[3-9]\d{9}(?!\d)/g
const WECHAT = /(?:微信|WeChat|wechat|微信号|vx|VX)[\s:：_-]*(?:[A-Za-z][A-Za-z0-9_-]{3,19}|wxid_[A-Za-z0-9_]{6,})/gi
const QQ = /(?:QQ|qq|Qq)[\s:：_-]*\d{5,12}/g
// 住址：行政区划（省/市/区/县 或 京津沪渝）+ 路/街/号/栋/室 等地址词，整体保守匹配
const ADDR = /(?<![一-龥])(?:北京市|天津市|上海市|重庆市|[\u4e00-\u9fa5]{2,8}(?:省|市|区|县|旗|自治州))[^\n，。；、]{0,20}?(?:路|街道|大道|巷|弄|号|栋|幢|单元|室|楼|小区|花园|广场|大厦|公寓|苑|庄|村|号院|别墅)[^\n，。；、]{0,12}/g
// 银行卡：15-19 位、以 3-6 开头（避免误伤 11 位手机号）
const BANK = /(?<!\d)(?:[3-6]\d[\d ]{13,17})(?!\d)/g

export function redactSensitive(input: string): RedactResult {
  let text = String(input || '')
  const report: RedactReport = { phone: 0, idCard: 0, email: 0, wechat: 0, address: 0, bankCard: 0, total: 0 }

  // 1. 邮箱（先做，避免邮箱内数字被手机号规则误伤）
  text = text.replace(EMAIL, () => { report.email++; return '[邮箱已隐藏]' })

  // 2. 身份证号（18 位，带出生日期合法性校验，降低误报）
  text = text.replace(ID18, (_m, _region, y: string, mo: string, d: string) => {
    const mm = Number(mo), dd = Number(d)
    const yr = Number(y)
    if (yr >= 1900 && yr <= 2100 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      report.idCard++
      return '[身份证已隐藏]'
    }
    return _m
  })

  // 3. 手机号
  text = text.replace(PHONE, () => { report.phone++; return '[手机号已隐藏]' })

  // 4. 微信 / QQ
  text = text.replace(WECHAT, () => { report.wechat++; return '[微信已隐藏]' })
  text = text.replace(QQ, () => { report.wechat++; return '[QQ已隐藏]' })

  // 5. 住址（保守匹配，封顶 12 处防止异常长匹配）
  let addrCount = 0
  text = text.replace(ADDR, (m) => {
    if (addrCount < 12) { addrCount++; report.address++; return '[住址已隐藏]' }
    return m
  })

  // 6. 银行卡（仅在 15-19 位区间内才视为卡号）
  text = text.replace(BANK, (m) => {
    const digits = m.replace(/\s/g, '')
    if (digits.length >= 15 && digits.length <= 19) { report.bankCard++; return '[银行卡已隐藏]' }
    return m
  })

  report.total = report.phone + report.idCard + report.email + report.wechat + report.address + report.bankCard
  return { text, report }
}
