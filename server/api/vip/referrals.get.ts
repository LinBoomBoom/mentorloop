// H4 内推资源库：VIP 专属，列表（可按方向/城市/级别筛选）+ 我的申请
export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const q = getQuery(event)
  const list = listReferrals({ track: q.track, city: q.city, level: q.level })
  const mine = listMyApplications(user.id)
  return json(event, 200, { list, mine })
})
