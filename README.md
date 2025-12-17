# QianKui 聚合

简洁优雅的节点订阅转换聚合服务

---

## ✨ 功能特性

🔄 **多格式支持**
- 输入：Base64、Clash、SingBox 格式订阅源
- 输出：Base64、Clash、Stash、Surge、Loon、Quantumult X、SingBox

🌐 **多协议支持**
- VMess、VLESS、Shadowsocks、Trojan
- Hysteria2、TUIC、WireGuard

📦 **订阅管理**
- 添加、编辑、删除订阅源
- 拖拽排序
- 混合输入（订阅链接 + 节点 URI）
- 自动去重

🎨 **现代化界面**
- 白棕配色，简洁优雅
- 深色/浅色主题切换
- 响应式设计
- 二维码生成

🔒 **安全特性**
- 渐进式登录限制
- Session 认证
- Token 保护订阅链接

## 🚀 快速部署

### Docker 一键部署（推荐）

```bash
docker run -d \
  --name qiankui-sub \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.io/qiankuishe/qiankui-sub:latest

# 查看初始密码
docker logs qiankui-sub
```

### Docker Compose 部署

```bash
git clone https://github.com/qiankuishe/qiankui-sub.git
cd qiankui-sub
docker-compose up -d
docker-compose logs  # 查看初始密码
```

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | 随机生成 |
| `SUB_TOKEN` | 订阅 Token | 随机生成 |

> 💡 首次启动时，随机生成的密码会显示在日志中（仅显示一次）

## 📖 使用说明

### 订阅链接格式

```
# 自适应（根据客户端自动选择格式）
https://your-server.com/sub?{token}

# 指定格式
https://your-server.com/sub?{token}&clash
https://your-server.com/sub?{token}&singbox
https://your-server.com/sub?{token}&surge
https://your-server.com/sub?{token}&loon
https://your-server.com/sub?{token}&qx
https://your-server.com/sub?{token}&base64
https://your-server.com/sub?{token}&stash
```

### 支持的客户端

| 客户端 | 格式 | 自动识别 |
|--------|------|----------|
| Clash / Clash Meta | clash | ✅ |
| Stash | stash | ✅ |
| Surge | surge | ✅ |
| Loon | loon | ✅ |
| Quantumult X | qx | ✅ |
| Shadowrocket | base64 | ✅ |
| SingBox | singbox | ✅ |

## 🛠️ 本地开发

```bash
# 安装依赖
pnpm install

# 启动后端
pnpm --filter @qiankui-sub/server run dev

# 启动前端
pnpm --filter @qiankui-sub/web run dev

# 运行测试
pnpm --filter @qiankui-sub/server run test
```

## 🏗️ 技术栈

- **后端**: TypeScript + Fastify
- **前端**: Vue 3 + Vite + Element Plus + Pinia
- **部署**: Docker

## 📁 项目结构

```
qiankui-sub/
├── packages/
│   ├── server/           # 后端服务
│   │   └── src/
│   │       ├── routes/       # API 路由
│   │       ├── services/     # 业务逻辑
│   │       │   ├── parser/       # 订阅解析
│   │       │   ├── converter/    # 格式转换
│   │       │   └── aggregator/   # 节点聚合
│   │       └── types/        # 类型定义
│   └── web/              # 前端应用
│       └── src/
│           ├── views/        # 页面
│           ├── stores/       # 状态管理
│           └── api/          # API 封装
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 📄 License

MIT © [qiankuishe](https://github.com/qiankuishe)
