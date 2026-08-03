// PM2 部署配置（决策 #4 备选方案，与 Docker 二选一）
module.exports = {
  apps: [{
    name: 'mentorloop',
    script: '.output/server/index.mjs',
    exec_mode: 'cluster',
    instances: 1, // better-sqlite3 为单写；日后换 Postgres 需另立迁移（B8 为 schema 迁移机制，与数据库选型解耦）可提升到 2-4
    env: { NODE_ENV: 'production' }
  }]
}
