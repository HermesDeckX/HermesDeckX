const n="上下文裁剪",t="启用 cache-ttl 模式自动清理过期的工具调用结果，减少不必要的 Token 消耗",e={body:`## 什么是上下文裁剪？

在长对话中，AI 的上下文会积累大量工具调用结果（如文件内容、命令输出），这些结果往往只在当时有用。上下文裁剪可以自动移除过期的工具结果，释放宝贵的 token 空间。

## 裁剪模式

| 模式 | 说明 |
|------|------|
| **off** | 不裁剪（默认） |
| **cache-ttl** | 基于 TTL（存活时间）自动裁剪过期内容 |

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「上下文裁剪」区域：

### 核心参数

- **mode** — 选择 \`cache-ttl\` 启用
- **ttl** — 内容存活时间（如 "30m" 表示 30 分钟后可被裁剪）
- **keepLastAssistants** — 保留最近 N 条 AI 回复不被裁剪

### 裁剪策略

裁剪分两级，逐步降级：

1. **软裁剪（Soft Trim）** — 当上下文达到 \`softTrimRatio\`（默认 0.7，即 70%）时触发
   - 将大段工具结果截断为 headChars + tailChars
   - 保留开头和结尾，中间用省略号替代

2. **硬清除（Hard Clear）** — 当达到 \`hardClearRatio\`（默认 0.9，即 90%）时触发
   - 完全移除过期的工具结果
   - 用 placeholder 文本替代

### 工具过滤

可以指定只裁剪特定工具的输出：
- **tools.allow** — 只裁剪这些工具的输出
- **tools.deny** — 排除这些工具（其输出不会被裁剪）

## 推荐配置

\`\`\`json
"contextPruning": {
  "mode": "cache-ttl",
  "ttl": "20m",
  "keepLastAssistants": 3,
  "softTrimRatio": 0.65,
  "hardClearRatio": 0.85
}
\`\`\`

## 配置字段

对应配置路径：\`agents.defaults.contextPruning\``},o={name:n,description:t,content:e};export{e as content,o as default,t as description,n as name};
