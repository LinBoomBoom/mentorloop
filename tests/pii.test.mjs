import { describe, it, expect } from 'vitest'
import { redactSensitive } from '../server/utils/pii'

describe('PII 敏感信息脱敏', () => {
  it('手机号被脱敏且计入报告', () => {
    const { text, report } = redactSensitive('联系电话：13812345678，方便时联系。')
    expect(text).toContain('[手机号已隐藏]')
    expect(text).not.toContain('13812345678')
    expect(report.phone).toBe(1)
  })

  it('18 位身份证（合法日期）脱敏，非法日期的 18 位数字不误伤', () => {
    const ok = redactSensitive('身份证 11010519900307203X 出生')
    expect(ok.text).toContain('[身份证已隐藏]')
    expect(ok.report.idCard).toBe(1)
    const bad = redactSensitive('流水号 123456789012345678 仅数字')
    expect(bad.text).toContain('123456789012345678')
    expect(bad.report.idCard).toBe(0)
  })

  it('邮箱被脱敏', () => {
    const { text, report } = redactSensitive('邮箱 zhangsan@example.com 谢谢')
    expect(text).toContain('[邮箱已隐藏]')
    expect(text).not.toContain('zhangsan@example.com')
    expect(report.email).toBe(1)
  })

  it('微信 / QQ 被脱敏', () => {
    const { text, report } = redactSensitive('微信 wxid_abc123def 或 QQ 123456789')
    expect(text).toContain('[微信已隐藏]')
    expect(text).toContain('[QQ已隐藏]')
    expect(report.wechat).toBeGreaterThanOrEqual(2)
  })

  it('住址（含行政区划）被脱敏', () => {
    const { text, report } = redactSensitive('现居北京市海淀区中关村大街1号某某小区3栋')
    expect(text).toContain('[住址已隐藏]')
    expect(report.address).toBeGreaterThanOrEqual(1)
  })

  it('银行卡被脱敏', () => {
    const { text, report } = redactSensitive('工资卡 6222021234567890123 到账')
    expect(text).toContain('[银行卡已隐藏]')
    expect(report.bankCard).toBe(1)
  })

  it('正常简历文本不被破坏', () => {
    const t = '负责 React 项目，性能提升 30%，Q3 上线，团队 5 人。'
    const { text, report } = redactSensitive(t)
    expect(text).toBe(t)
    expect(report.total).toBe(0)
  })

  it('报告 total 为各项之和', () => {
    const { report } = redactSensitive('电话 13900001111 邮箱 a@b.com')
    expect(report.total).toBe(report.phone + report.email)
  })
})
