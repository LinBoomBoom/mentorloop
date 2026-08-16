# MentorLoop 部署镜像（决策 #4：单实例 Node server + 持久卷）
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
ENV NODE_ENV=production
EXPOSE 3000
# 数据卷挂载点：data/（SQLite）与 .env 由宿主机/secret 提供，容器自身无状态
VOLUME ["/app/data"]
CMD ["node", ".output/server/index.mjs"]
