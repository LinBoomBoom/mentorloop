// PM2 部署配置（决策 #4 备选方案，与 Docker 二选一）
module.exports = {
  apps: [{
    name: 'mentorloop',
    script: '.output/server/index.mjs',
    exec_mode: 'cluster',
    instances: 1, // better-sqlite3 为单写；日后换 Postgres（见 B8）可提升到 2-4
    env: { NODE_ENV: 'production' }
  }]
}
