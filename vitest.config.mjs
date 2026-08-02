import { defineConfig } from 'vitest/config'

// 测试只覆盖纯 Node 脚本与 JSON 数据不变量，不加载 Nuxt，故用 node 环境。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
    testTimeout: 30000,
    pool: 'forks',
    // 测试用临时副本放系统 tmp，避免污染仓库
    tmpDir: '../node_modules/.vitest-tmp',
  },
})
