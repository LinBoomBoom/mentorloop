// 当前用户信息
export default defineEventHandler((event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  return json(event, 200, { user: publicUser(user) })
})
