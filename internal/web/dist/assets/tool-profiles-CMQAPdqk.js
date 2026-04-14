const n="工具权限配置",l="通过工具配置文件（profile）控制 AI 助手可以使用哪些工具，平衡能力与安全",o={body:`## 工具配置文件（Profile）

HermesAgent 提供 4 种预设的工具配置文件，控制 AI 可以使用的工具范围：

| Profile | 说明 | 适用场景 |
|---------|------|----------|
| **full** | 所有工具可用（默认） | 个人使用，信任环境 |
| **coding** | 代码编辑、命令执行、文件操作 | 编程助手 |
| **messaging** | 消息发送、基本对话 | 纯聊天场景 |
| **minimal** | 最小权限，仅基本对话 | 高安全要求 |

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 工具」
2. 在「工具配置文件」下拉列表中选择合适的 Profile
3. 如需更精细的控制，使用 allow/deny 列表

## 精细权限控制

- **deny** — 明确禁止的工具列表（黑名单）
- **allow** — 仅允许的工具列表（白名单，覆盖 profile）
- **alsoAllow** — 在 profile 基础上额外允许的工具
- **byProvider** — 按提供商设置不同权限

**注意：** allow 和 alsoAllow 不能同时使用。如果你设置了 allow，它会完全覆盖 profile 的工具列表。

## 按代理设置不同权限

每个代理可以有独立的工具权限。在「配置中心 → 代理」→ 选择代理 → 工具设置中配置。这样你可以让编程代理有完整权限，而聊天代理只有最小权限。

## 配置字段

对应配置路径：\`tools.profile\`

值为 \`minimal\` | \`coding\` | \`messaging\` | \`full\``},e={name:n,description:l,content:o};export{o as content,e as default,l as description,n as name};
