# 更新日志

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
