const n="Thinking 模式",i="开启深度思考让 AI 处理复杂推理、规划和分析任务",e={body:`## 什么是 Thinking 模式？

开启 Thinking（Extended Thinking）后，AI 在回答前会先进行**深度推理**，类似人类的「先想清楚再说」。

## 适用场景

- **复杂数学推理** — 多步骤计算和证明
- **代码架构设计** — 需要权衡多种方案
- **长文分析** — 阅读长文档并总结关键信息
- **策略规划** — 制定多步骤计划
- **调试复杂问题** — 需要系统性排查

## 配置方法

在配置中心 → 模型 → 开启 \`reasoning\` 选项。

\`\`\`yaml
agents:
  defaults:
    model:
      reasoning: true
\`\`\`

## 支持的模型

不是所有模型都支持 Thinking：

| 模型 | 支持 Thinking |
|------|---------------|
| Claude Opus / Sonnet | ✅ |
| GPT-4o / 4.5 | ✅ |
| Gemini Pro / Ultra | ✅ |
| Claude Haiku | ❌ |
| GPT-4o-mini | ❌ |

## 注意事项

- **成本更高** — Thinking 会产生额外的 token 消耗（thinking tokens）
- **延迟更长** — AI 需要更多时间思考，首次响应会慢几秒
- **不适合简单问答** — 日常闲聊不需要开启

## 最佳实践

- 对于主力工作 Agent 开启 Thinking
- 对于轻量级的生活助手可以关闭以节省成本
- 可以通过 \`/think\` 命令临时触发深度思考，而非全局开启`},t={name:n,description:i,content:e};export{e as content,t as default,i as description,n as name};
