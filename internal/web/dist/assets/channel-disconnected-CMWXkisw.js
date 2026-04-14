const n="频道断开连接",e="排查消息频道（Telegram、Discord、WhatsApp 等）断开连接或无法收发消息的问题",o={question:"消息频道断开连接或无法收发消息怎么办？",answer:`## 排查步骤

### 1. 检查仪表盘频道状态
打开 HermesDeckX 仪表盘，查看频道列表中的状态指示灯：
- 🟢 已连接 — 正常
- 🔴 已断开 — 需要排查
- 🟡 连接中 — 等待或重试中

### 2. 检查 Token 是否有效
前往「配置中心 → 频道」，检查对应频道的 Token：
- **Telegram** — Token 可能被 BotFather 重置过。前往 BotFather 确认
- **Discord** — Token 可能被 Developer Portal 重置。前往 discord.com/developers 检查
- **WhatsApp** — 扫码会话可能过期，需要重新扫码

### 3. 检查网络连接
- Telegram 和 Discord 需要能访问其 API 服务器
- WhatsApp 使用 WebSocket 连接，需要稳定网络
- 如果在代理环境下，确认代理配置正确

### 4. 检查频道配置
- 确认频道的 \`enabled\` 未被设为 false
- 确认没有被 \`allowFrom\` 规则误拦截（如果你的用户 ID 不在白名单中）

### 5. 重新连接
- 在仪表盘中点击频道的「重新连接」按钮
- 或在「配置中心 → 频道」中保存一次配置触发重连
- 最后手段：重启网关

### 6. WhatsApp 特殊情况
- WhatsApp 连接基于 Web 协议，手机需要保持网络连接
- 如果长时间未使用，可能需要重新扫码
- 检查手机上是否弹出「已在其他设备上登录」的提示

## 快速修复

运行「健康中心」诊断 → 查看 channel.connected 检查项 → 按提示操作。`},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
