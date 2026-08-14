import { describe, it, expect } from 'vitest'
import { LinearResampler, resamplePcm16 } from '../server/utils/asrResample'

describe('LinearResampler', () => {
  it('44100 → 16000 输出长度精确为 16000（整数倍率）', () => {
    const rs = new LinearResampler(44100, 16000)
    const out = rs.process(new Int16Array(44100))
    rs.flush()
    expect(out.length).toBe(16000)
  })

  it('48000 → 16000 输出长度精确为 16000', () => {
    const rs = new LinearResampler(48000, 16000)
    const out = rs.process(new Int16Array(48000))
    rs.flush()
    expect(out.length).toBe(16000)
  })

  it('重采样正弦波：长度按比例、幅度保真、分块与一次性一致（容差）', () => {
    // 构造低频正弦（采样率 44100，频率 ~200Hz），重采样到 16000 应仍是同相位的较低密度正弦。
    const N = 44100
    const inArr = new Int16Array(N)
    for (let i = 0; i < N; i++) inArr[i] = Math.round(8000 * Math.sin((2 * Math.PI * 200 * i) / 44100))
    const oneShot = new LinearResampler(44100, 16000).process(inArr)
    expect(oneShot.length).toBe(16000)

    // 幅度保真：输出峰值应接近输入峰值（线性插值不显著衰减）
    let inPeak = 0, outPeak = 0
    for (let i = 0; i < N; i++) inPeak = Math.max(inPeak, Math.abs(inArr[i]))
    for (let i = 0; i < oneShot.length; i++) outPeak = Math.max(outPeak, Math.abs(oneShot[i]))
    expect(outPeak).toBeGreaterThan(inPeak * 0.8)

    // 分块喂入：长度与一次性一致（允许 ±2 取整余量），且逐点误差在合理容差内
    const rs = new LinearResampler(44100, 16000)
    let chunked = new Int16Array(0)
    for (let off = 0; off < N; off += 2000) {
      const o = rs.process(inArr.subarray(off, off + 2000))
      const merged = new Int16Array(chunked.length + o.length)
      merged.set(chunked, 0); merged.set(o, chunked.length)
      chunked = merged
    }
    rs.flush()
    expect(Math.abs(chunked.length - oneShot.length)).toBeLessThanOrEqual(2)
    const n = Math.min(chunked.length, oneShot.length)
    let maxDiff = 0
    for (let i = 0; i < n; i++) maxDiff = Math.max(maxDiff, Math.abs(chunked[i] - oneShot[i]))
    // 分块边界有 ≤1 样本的子采样偏移 + 线性插值抖动，容差放宽到峰值的一成
    expect(maxDiff).toBeLessThanOrEqual(inPeak * 0.1 + 5)
  })

  it('保留单调趋势（线性上升序列重采样后依旧上升）', () => {
    const rs = new LinearResampler(44100, 16000)
    const ramp = new Int16Array(44100)
    for (let i = 0; i < ramp.length; i++) ramp[i] = i % 30000
    const out = rs.process(ramp)
    rs.flush()
    let inc = 0
    for (let i = 1; i < out.length; i++) if (out[i] >= out[i - 1]) inc++
    expect(inc).toBeGreaterThan(out.length * 0.95)
  })

  it('小于一个输出样本的小块不报错、返回空（输入 < ratio 个样本）', () => {
    const rs = new LinearResampler(44100, 16000)
    const out = rs.process(new Int16Array(2)) // 2/2.75625 < 1 → 0 输出
    expect(out.length).toBe(0)
    rs.flush()
  })

  it('resamplePcm16 对 Buffer 生效且长度比例正确', () => {
    const src = new Int16Array(44100)
    for (let i = 0; i < src.length; i++) src[i] = ((i * 13) % 2000) - 1000
    const buf = Buffer.from(src.buffer, src.byteOffset, src.byteLength)
    const out = resamplePcm16(buf, 44100, 16000)
    expect(out.length).toBe(32000) // 16000 样本 * 2 字节
  })

  it('同速率直接透传、空/单样本安全', () => {
    const buf = Buffer.from(new Int16Array([1, 2, 3, 4]).buffer)
    expect(resamplePcm16(buf, 16000, 16000).equals(buf)).toBe(true)
    expect(resamplePcm16(Buffer.alloc(0), 44100, 16000).length).toBe(0)
  })
})
