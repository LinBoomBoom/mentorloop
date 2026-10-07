# MentorLoop 部署镜像（M1 双驱动：云端注入 MYSQL_HOST 走 mysql2 连接池；本地挂载 data/ 走 SQLite）
# 构建阶段
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段（与本地托管运行时 Node 22 对齐，避免 better-sqlite3 原生 ABI 跨版本差异）
FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/package*.json ./
# 容器内运维/smoke 脚本（部署后在 WebShell 执行 node scripts/cloud-smoke.mjs 验证 mysql2→云 MySQL 全链路）
COPY --from=build /app/scripts/cloud-smoke.mjs ./scripts/cloud-smoke.mjs
# 种子内容（46MB）：云端首查询前自举用（seedIfEmpty 仅补空表，INSERT OR IGNORE 与已导入内容按 id 对齐）
COPY --from=build /app/data/seed-content.json ./data/seed-content.json
ENV NODE_ENV=production
# 云托管规范：监听 0.0.0.0，端口由平台注入 PORT（Nitro node-server 默认 3000）
ENV HOST=0.0.0.0
EXPOSE 3000
# SQLite 数据目录（仅本地/自托管形态挂载宿主机目录；云端走 Serverless MySQL，无持久盘依赖）
CMD ["node", ".output/server/index.mjs"]
