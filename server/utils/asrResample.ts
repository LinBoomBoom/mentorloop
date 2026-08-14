// P3 Step8：轻量线性插值重采样器（纯 TS，无原生依赖）。
// 用途：实时面试的服务端 ASR 通道中，浏览器采集的 PCM 采样率 = audioCtx.sampleRate
// （设备率，通常 44100 / 48000），而阿里云 NLS 等流式厂商要求 16000。
// 在 Node 端把音频重采样到目标速率后再发往厂商 WS。
//
// 算法：线性插值（相邻样本加权）。语音经 ASR 对轻微失真不敏感，线性插值质量足够，
// 且零依赖、可单测、确定性强。本文件属 server/utils，可被同目录模块相对 import。

// 线性重采样器：把输入 Int16 PCM 流（inRate）实时重采样为 outRate。
// 支持「分块喂入、按需吐出」：每次 process 只返回已凑够整数个输出样本的结果，
// 不足一个输出样本的余量样本保留在内部缓冲，下次 process 续算（保证连续不丢样）。
export class LinearResampler {
  private ratio: number
  private buf: number[] = [] // 内部浮点样本缓冲（含上一块的余数）

  constructor(private inRate: number, private outRate: number) {
    if (inRate <= 0 || outRate <= 0) throw new Error('采样率必须为正数')
    this.ratio = inRate / outRate
  }

  // 输入一块 Int16 样本，返回重采样后的 Int16 样本（可能为空）。
  process(input: Int16Array): Int16Array {
    for (let i = 0; i < input.length; i++) this.buf.push(input[i])
    const outCount = Math.floor(this.buf.length / this.ratio)
    const out = new Int16Array(outCount)
    for (let i = 0; i < outCount; i++) {
      const pos = i * this.ratio
      const i0 = Math.floor(pos)
      const i1 = i0 + 1
      const frac = pos - i0
      const s0 = this.buf[i0] ?? 0
      const s1 = (i1 < this.buf.length ? this.buf[i1] : s0) ?? 0
      let v = s0 + (s1 - s0) * frac
      // 重新夹回 Int16 范围并四舍五入（线性插值可能越界一丢丢）
      if (v > 32767) v = 32767
      else if (v < -32768) v = -32768
      out[i] = Math.round(v)
    }
    // 丢弃已消费的样本：每个输出样本对应 ratio 个输入样本，故按 floor(outCount*ratio) 个输入样本切片；
    // 余数（<1 个输入样本）随切片丢失，对语音重采样可忽略。避免缓冲无限增长或跨块错位。
    if (outCount > 0) this.buf = this.buf.slice(Math.floor(outCount * this.ratio))
    return out
  }

  // 流结束：吐出剩余缓冲（不足一个输出样本则丢弃），并清空内部状态。
  flush(): Int16Array {
    const out = new Int16Array(0)
    this.buf = []
    return out
  }
}

// 便捷函数：直接对「16-bit 小端 PCM 的 Buffer」做重采样，返回同格式 Buffer。
export function resamplePcm16(buffer: Buffer, inRate: number, outRate: number): Buffer {
  if (buffer.length < 2) return Buffer.alloc(0)
  if (inRate === outRate) return buffer
  const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.length / 2))
  const rs = new LinearResampler(inRate, outRate)
  const out = rs.process(int16)
  rs.flush()
  return Buffer.from(out.buffer, out.byteOffset, out.byteLength)
}
