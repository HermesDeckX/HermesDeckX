const n="Token 费用过高",e="分析和优化 AI 使用费用的常见方法和配置技巧",o={question:"Token 消耗太高，怎么降低费用？",answer:`## 费用优化策略（按效果排序）

### 1. 心跳使用低成本模型（节省 50-80%）
心跳是最大的隐性费用来源。前往「配置中心 → 代理 → 心跳」：
- 将心跳模型设为低成本模型（如 gpt-4o-mini、claude-haiku、gemini-flash）
- 增大心跳间隔（every: "1h" 代替默认 "30m"）
- 设置活跃时段（activeHours），非工作时间停止心跳
- 启用 lightContext 减少心跳的上下文大小

### 2. 子代理使用低成本模型（节省 60-90%）
前往「配置中心 → 代理 → 子代理」：
- 设置 subagents.model 为低成本模型
- 限制 maxSpawnDepth 为 1，避免子代理嵌套产生指数级费用

### 3. 启用上下文裁剪（节省 20-40%）
前往「配置中心 → 代理 → 上下文裁剪」：
- 启用 cache-ttl 模式，自动清理过期的工具调用结果
- 设置 ttl 为 20-30 分钟

### 4. 优化压缩策略
前往「配置中心 → 代理 → 压缩」：
- 减小 keepRecentTokens，减少每次发送给模型的上下文量
- 启用 memoryFlush，重要信息保存到 MEMORY.md 而非保留在上下文中

### 5. 关闭不需要的思考模式
前往「配置中心 → 代理」：
- 将 thinkingDefault 设为 off 或 minimal（思考模式会消耗额外 token）
- 仅在需要深度推理时用 /think 命令临时启用

### 6. 配置会话自动重置
前往「配置中心 → 会话 → 自动重置」：
- 启用每日重置（daily），防止上下文无限累积

### 7. 限制媒体处理
前往「配置中心 → 代理」：
- 减小 mediaMaxMb 限制媒体文件大小
- 减小 imageMaxDimensionPx 降低图片分辨率

## 费用监控

大部分 AI 提供商控制台都提供用量仪表盘。建议定期查看：
- OpenAI: platform.openai.com/usage
- Anthropic: console.anthropic.com
- Google: console.cloud.google.com`},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
