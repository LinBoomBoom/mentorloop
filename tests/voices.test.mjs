// 语音全量音色：断言各 provider 暴露平台支持的全部音色（不再焊死 3 个）。
import { describe, it, expect } from 'vitest'
import {
  ALIYUN_VOICE_CATALOG,
  EDGE_VOICE_CATALOG,
  listAliyunVoices,
  listEdgeVoices,
  listPiperVoices,
  listVoicesByProvider,
  VOICE_PORTRAITS
} from '../server/utils/speech'
import { voiceAppearance, renderAvatarForVoice } from '../app/utils/avatarEngine'

describe('voices: 平台全部音色暴露', () => {
  it('阿里云烘焙 cosyvoice-v3-flash 全部预置音色（>40，含男女声）', () => {
    const vs = ALIYUN_VOICE_CATALOG
    expect(vs.length).toBeGreaterThan(40)
    expect(vs.filter((v) => v.gender === 'female').length).toBeGreaterThan(10)
    expect(vs.filter((v) => v.gender === 'male').length).toBeGreaterThan(5)
    // 3 个推荐人格标记 recommended
    const rec = vs.filter((v) => v.recommended)
    expect(rec.map((v) => v.id).sort()).toEqual(['chaowen', 'huayan', 'xiao_ya'])
  })

  it('Edge 烘焙中文 Neural 精选集（>10）', () => {
    expect(EDGE_VOICE_CATALOG.length).toBeGreaterThan(10)
    expect(EDGE_VOICE_CATALOG.some((v) => v.id === 'zh-CN-XiaoxiaoNeural')).toBe(true)
  })

  it('listVoicesByProvider 按 provider 返回对应全集', () => {
    expect(listVoicesByProvider('aliyun')).toBe(listAliyunVoices())
    expect(listVoicesByProvider('edge')).toBe(listEdgeVoices())
    expect(Array.isArray(listPiperVoices())).toBe(true)
  })

  it('每个音色元信息字段完整（id/label/gender）', () => {
    for (const v of [...ALIYUN_VOICE_CATALOG, ...EDGE_VOICE_CATALOG]) {
      expect(typeof v.id).toBe('string')
      expect(typeof v.label).toBe('string')
      expect(['female', 'male']).toContain(v.gender)
    }
  })
})

describe('voices: 任意 voice 稳定出脸（avatarEngine）', () => {
  it('已知 3 人格用既定风格（女→lorelei/personas，男→openPeeps）', () => {
    expect(voiceAppearance('huayan').style).toBe('lorelei')
    expect(voiceAppearance('xiao_ya').style).toBe('personas')
    expect(voiceAppearance('chaowen').style).toBe('openPeeps')
  })

  it('未知 voice id 按性别选风格 + seed 稳定', () => {
    const f1 = voiceAppearance('longcheng_v3', 'male')
    const f2 = voiceAppearance('longcheng_v3', 'male')
    expect(f1).toEqual(f2) // 稳定
    expect(f1.style).toBe('openPeeps') // 男→openPeeps
    const ff = voiceAppearance('longyuan_v3', 'female')
    expect(ff.style).toBe('lorelei') // 女→lorelei
    // 不同 id 产生不同脸
    expect(voiceAppearance('aaa').seed).not.toBe(voiceAppearance('bbb').seed)
  })

  it('renderAvatarForVoice 产出合法 SVG（含 <svg）', () => {
    const meta = renderAvatarForVoice('longxiaochun', 'female')
    expect(meta.svg).toMatch(/<svg/)
    expect(meta.portraitId).toMatch(/:/)
  })
})
