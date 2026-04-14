const n="多 Agent 协作",e="不同场景用不同 Agent，各自独立的人格、记忆和技能配置",t={body:`## 什么是多 Agent？

多 Agent 让你创建多个独立的 AI 角色，每个 Agent 有自己的：

- **IDENTITY.md** — 独立的身份和人格
- **SOUL.md** — 独立的行为规则
- **MEMORY/** — 独立的记忆系统
- **技能** — 独立的技能配置

## 使用场景

| 场景 | Agent 示例 |
|------|------------|
| 工作 vs 生活 | 「工作助手」处理邮件和代码，「生活助手」管理日程和购物 |
| 中文 vs 英文 | 一个 Agent 用中文，另一个用英文 |
| 不同项目 | 每个项目一个 Agent，记忆和上下文完全隔离 |
| 团队共享 | 不同团队成员各自的专属 Agent |

## 配置方法

### 1. 创建新 Agent

在配置中心 → Agent → 新建 Agent，设置名称和 emoji。

### 2. 分配频道

每个 Agent 可以绑定到不同的频道，比如：
- 工作 Agent → Slack
- 生活 Agent → Telegram

### 3. 独立配置

为每个 Agent 配置独立的 IDENTITY.md、SOUL.md 和技能。

## 高级：Agent 间协作

多个 Agent 可以通过以下方式协作：

- **共享记忆** — 部分记忆文件可以跨 Agent 共享
- **消息路由** — 根据消息内容自动分配到合适的 Agent
- **工作流** — 多 Agent 按流程协作完成复杂任务

## 最佳实践

- 从 2 个 Agent 开始（如工作 + 生活），逐步扩展
- 每个 Agent 的 IDENTITY.md 要有明确的角色区分
- 使用 HermesDeckX 的「多 Agent 管理」面板统一管理`},g={name:n,description:e,content:t};export{t as content,g as default,e as description,n as name};
