const n="Session 管理",e="掌握会话重置、上下文压缩和作用域设置，让对话更高效",s={body:`## Session 基础

每次对话都在一个 Session 中进行。Session 会记住上下文，但太长的上下文会增加成本和延迟。

## 常用命令

| 命令 | 作用 |
|------|------|
| \`/new\` | 重置当前会话，清空上下文 |
| \`/compact\` | 手动压缩上下文，保留关键信息 |
| \`/undo\` | 撤销上一条消息 |

## 压缩阈值（Compaction）

当 Session 的 token 数超过阈值时，AI 会自动压缩上下文：

- **推荐值**：\`50000\`（50K tokens）
- **低成本**：\`20000\`（更频繁压缩，但节省 token）
- **高质量**：\`100000\`（更少压缩，保留更多上下文）

## 作用域设置

- **per-sender** — 每个用户独立 Session（默认，推荐）
- **per-channel** — 每个频道/群组共享 Session

## 记忆刷新（Memory Flush）

开启 \`memoryFlush\` 后，Session 压缩时会自动将重要信息保存到长期记忆文件中，防止关键信息因压缩而丢失。

## 最佳实践

- 长时间不同话题的对话，主动用 \`/new\` 重置
- 开启 memoryFlush 防止重要信息丢失
- 根据你的模型 context window 大小调整压缩阈值`},o={name:n,description:e,content:s};export{s as content,o as default,e as description,n as name};
