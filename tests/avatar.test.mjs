import { describe, it, expect } from 'vitest'

// 数字人提供方工厂 + 默认本地实现（纯逻辑，无 DOM / 无网络）
const { getAvatarProvider, LocalSvgAvatar, SaaSAvatarProvider, DIGITAL_HUMAN_PORTRAITS, portraitById } =
  await import('../server/utils/avatar')

describe('avatar provider', () => {
  it('默认（AVATAR_PROVIDER 未设）返回 LocalSvgAvatar', () => {
    delete process.env.AVATAR_PROVIDER
    expect(getAvatarProvider()).toBeInstanceOf(LocalSvgAvatar)
  })

  it('AVATAR_PROVIDER=local 返回 LocalSvgAvatar', () => {
    process.env.AVATAR_PROVIDER = 'local'
    expect(getAvatarProvider()).toBeInstanceOf(LocalSvgAvatar)
  })

  it('未实现厂商（如 did）回退为 SaaSAvatarProvider 且不崩溃，generate 抛明确错误', async () => {
    process.env.AVATAR_PROVIDER = 'did'
    const p = getAvatarProvider()
    expect(p).toBeInstanceOf(SaaSAvatarProvider)
    expect(p.kind).toBe('did')
    await expect(p.generate(DIGITAL_HUMAN_PORTRAITS[0], 'x')).rejects.toThrow(/未实现/)
  })

  it('LocalSvgAvatar.generate 返回 provider=local（不发起服务端请求）', async () => {
    const r = await new LocalSvgAvatar().generate(DIGITAL_HUMAN_PORTRAITS[0], 'anything')
    expect(r.provider).toBe('local')
    expect(r.videoUrl).toBeUndefined()
  })

  it('portraitById 命中则返回对应肖像，缺失回退默认（华嫣）', () => {
    expect(portraitById('chaowen').gender).toBe('male')
    expect(portraitById('not-exist').id).toBe('huayan')
  })

  it('肖像列表含 3 个按音色 gender 对齐的条目', () => {
    expect(DIGITAL_HUMAN_PORTRAITS.map((p) => p.id)).toEqual(['huayan', 'xiao_ya', 'chaowen'])
    expect(DIGITAL_HUMAN_PORTRAITS.filter((p) => p.gender === 'female').length).toBe(2)
  })
})
