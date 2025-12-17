# 更新日志

## v1.0.2 (2025-12-17)

### 安全修复
- SSRF 防护：禁止访问私有 IP、内网地址、localhost
- 限制只允许 http/https 协议
- 检查重定向目标，防止重定向到内网（最多 3 次重定向）
- Docker 容器使用非 root 用户运行

### 重要修复
- 数据持久化：从内存存储改为 SQLite 数据库，重启后数据不再丢失
- 密码/Token 持久化：首次生成后保存到数据库，重启后保持不变
- Session 持久化：登录状态保存到数据库，重启后不会被登出
- 登录失败记录持久化：重启后登录限制不会被重置
- 配置优先级：环境变量 > 数据库存储 > 自动生成

### 优化
- 登录失败时显示具体错误信息，不再显示"未登录"
- 日志清理策略优化：每 100 次插入清理一次，而非每次都清理

## v1.0.1 (2025-12-17)

### 修复
- 修复 Clash/Mihomo 节点无法连接的问题
- vless/vmess 节点添加 `servername`、`skip-cert-verify`、`client-fingerprint` 字段
- ws-opts 添加 `headers.Host` 字段
- hysteria2 节点添加 `alpn` 字段
- tuic 节点添加 `congestion-controller`、`udp-relay-mode` 默认值

## v1.0.0 (2025-12-17)

### 新功能
- 支持多种订阅格式转换：Clash、SingBox、Surge、Loon、Quantumult X
- 支持多种协议：VMess、VLESS、Shadowsocks、Trojan、Hysteria2、TUIC
- 订阅源管理和聚合
- 节点去重功能
- 完整的 Clash 分流规则配置
- 白棕色主题 UI 设计
- 深色/浅色模式切换

### 安全
- 生产环境禁用跨域
- Cookie 安全配置
- Session 验证增强
