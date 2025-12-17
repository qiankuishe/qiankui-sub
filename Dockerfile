# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 pnpm 和编译工具（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm

# 复制所有配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY packages/server ./packages/server
COPY packages/web ./packages/web
COPY tsconfig.base.json ./

# 构建前端
RUN pnpm --filter @qiankui-sub/web build

# 运行阶段 - 使用 tsx 直接运行 TypeScript
FROM node:20-alpine
WORKDIR /app

# 安装 pnpm 和编译工具（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm

# 复制配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/

# 安装所有依赖（包括 tsx）
RUN pnpm install --frozen-lockfile

# 复制后端源代码
COPY packages/server ./packages/server
COPY tsconfig.base.json ./

# 复制前端构建产物
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# 创建数据目录
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 使用 tsx 运行 TypeScript
CMD ["npx", "tsx", "packages/server/src/index.ts"]
