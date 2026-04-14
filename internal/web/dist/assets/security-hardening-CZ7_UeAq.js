const n="安全加固",o="通过白名单、访问控制和沙箱模式保护你的 AI 助手",e={body:`## 为什么需要安全加固？

如果你的 AI 助手连接了公开的聊天平台（如 Telegram、Discord），任何人都可能尝试与它对话。安全加固确保只有授权用户才能使用。

## 三层安全防护

### 1. allowFrom 白名单

限制哪些用户或群组可以与 AI 对话：

\`\`\`yaml
channels:
  telegram:
    allowFrom:
      - "user:123456789"    # 特定用户
      - "group:-100xxxx"    # 特定群组
\`\`\`

### 2. dmPolicy 访问控制

控制私聊权限：

- **\`open\`** — 任何人都可以私聊（不推荐用于生产）
- **\`allowlist\`** — 只有白名单用户可以私聊（推荐）
- **\`closed\`** — 禁止所有私聊

### 3. 网关认证

保护 Web UI 和 API 接口：

- **Token 认证** — 设置一个访问 Token
- **密码认证** — 设置用户名和密码
- **TLS 加密** — 生产环境强烈建议启用

## 沙箱模式

限制 AI 可以执行的操作：

- 禁用文件系统写入
- 禁用命令执行
- 限制网络访问范围

## 最佳实践

- **生产环境必须** 设置 allowFrom 和 dmPolicy
- 使用 Token 或密码保护网关 API
- 定期检查访问日志，确认没有异常访问
- 使用健康中心的安全诊断验证配置`},l={name:n,description:o,content:e};export{e as content,l as default,o as description,n as name};
