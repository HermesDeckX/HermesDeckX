const n="消息状态表情",s="启用状态表情反馈，让用户通过消息上的表情实时了解 AI 的处理阶段",e={body:`## 什么是状态表情？

状态表情（Status Reactions）是 HermesAgent 在处理消息时自动添加到用户消息上的 emoji 反应。不同的 emoji 表示不同的处理阶段，让用户无需等待就能知道 AI 正在做什么。

## 默认状态表情

| 阶段 | 默认 Emoji | 含义 |
|------|-----------|------|
| thinking | 🤔 | AI 正在思考 |
| tool | 🔧 | AI 正在使用工具 |
| coding | 💻 | AI 正在编写代码 |
| web | 🌐 | AI 正在搜索网络 |
| done | ✅ | 处理完成 |
| error | ❌ | 处理出错 |
| stallSoft | ⏳ | 处理较慢 |
| stallHard | ⚠️ | 处理卡住 |

## 在 HermesDeckX 中配置

前往「配置中心 → 消息」→ 找到「状态表情」区域：

1. 打开「启用状态表情」开关
2. 自定义每个阶段的 emoji（可选）
3. 调整时间参数（可选）

## 时间参数

- **debounceMs** — 防抖延迟，避免频繁切换表情（默认 500ms）
- **stallSoftMs** — 多久后显示「处理较慢」表情（默认 30000ms = 30 秒）
- **stallHardMs** — 多久后显示「处理卡住」表情（默认 120000ms = 2 分钟）
- **doneHoldMs** — 完成表情保持多久后移除（默认 5000ms = 5 秒）
- **errorHoldMs** — 错误表情保持多久后移除

## 其他消息优化

- **ackReaction** — 收到消息时的确认表情（如 👀），让用户知道消息已收到
- **removeAckAfterReply** — 回复后自动移除确认表情
- **suppressToolErrors** — 抑制工具错误的详细信息（对用户更友好）

## 配置字段

对应配置路径：\`messages.statusReactions\``},o={name:n,description:s,content:e};export{e as content,o as default,s as description,n as name};
