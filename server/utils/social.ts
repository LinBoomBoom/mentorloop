// 第三方登录中间态（内存存储，重启清空；生产应改为官方 OAuth 回调）
export const pendingAuth = new Map()
