// H4 申请内推：VIP 专属，落库 referral_applications，供导师/HR 后续处理
export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const body = await readBody(event)
  try {
    const r = await applyReferral(user.id, body)
    return json(event, 200, { ...r })
  } catch (e: any) {
    if (e?.name === 'AlreadyAppliedError') return json(event, 409, { error: '你已申请过该岗位内推' })
    if (e?.name === 'ReferralNotFoundError') return json(event, 404, { error: '内推岗位不存在' })
    return json(event, 400, { error: e?.message || '申请失败' })
  }
})
