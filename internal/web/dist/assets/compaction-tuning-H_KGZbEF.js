const n="压缩策略调优",e="优化上下文压缩策略，在对话质量和 Token 成本之间找到最佳平衡",s={body:`## 什么是上下文压缩？

当对话历史超过模型的上下文窗口限制时，HermesAgent 会自动压缩（summarize）旧的对话内容，保留关键信息。压缩策略直接影响 AI 的「记忆力」和 Token 成本。

## 压缩模式

| 模式 | 说明 |
|------|------|
| **default** | 标准压缩，适用大多数场景 |
| **safeguard** | 安全模式，压缩前额外检查，防止丢失重要信息 |

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「压缩」区域：

### 关键参数

- **reserveTokens** — 为新对话保留的 token 数量。增大此值可以让 AI 有更多空间回复，但会更频繁地触发压缩
- **keepRecentTokens** — 保留最近的 token 数量不被压缩。增大可以保留更多近期上下文
- **maxHistoryShare** — 历史对话占总上下文的最大比例（0.1-0.9）。设为 0.7 表示 70% 用于历史，30% 保留给系统提示和新回复

### 质量守卫

启用 \`qualityGuard\` 可以在压缩后检查摘要质量，如果质量不达标会自动重试：
- **enabled** — 是否启用
- **maxRetries** — 最大重试次数

### 记忆冲刷（Memory Flush）

\`memoryFlush\` 是一个重要功能，在压缩即将发生时自动将重要信息保存到 MEMORY.md：
- **enabled** — 是否启用（**强烈推荐开启**）
- **softThresholdTokens** — 提前触发阈值
- **forceFlushTranscriptBytes** — 强制冲刷的对话大小阈值

## 推荐配置

**日常聊天（平衡模式）：**
- reserveTokens: 4000
- keepRecentTokens: 8000
- memoryFlush.enabled: true

**编程助手（保留更多上下文）：**
- reserveTokens: 8000
- keepRecentTokens: 16000
- maxHistoryShare: 0.8

## 配置字段

对应配置路径：\`agents.defaults.compaction\``},o={name:n,description:e,content:s};export{s as content,o as default,e as description,n as name};
