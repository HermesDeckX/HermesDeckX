const n="模型备用链",e="配置备用模型（fallbacks），当主模型不可用时自动切换，确保 AI 助手永不掉线",t={body:`## 为什么需要备用模型？

AI 提供商可能因为限流（rate limit）、服务中断或账户余额不足而暂时不可用。配置备用链可以让 HermesAgent 在主模型失败时自动尝试下一个模型，保证 AI 助手始终在线。

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 模型」
2. 在「备用模型」区域，点击「添加备用模型」
3. 从下拉列表中选择已配置的提供商和模型
4. 可以添加多个备用模型，按优先级排列

## 推荐搭配策略

| 主模型 | 备用 1 | 备用 2 |
|--------|--------|--------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**最佳实践：**
- 主模型和备用模型使用**不同提供商**，避免同一家服务中断时全部失效
- 备用模型可以选择更便宜的型号（如 gpt-4o-mini），在降级时节省成本
- 至少配置 1 个备用模型，推荐配置 2 个

## 配置字段

对应配置路径：\`agents.defaults.model.fallbacks\`

值为模型名称数组，如：
\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
