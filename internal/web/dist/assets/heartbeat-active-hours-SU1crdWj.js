const n="心跳活跃时段",e="设置心跳的活跃时间段，在非工作时间自动停止心跳，节省 API 费用",t={body:`## 什么是心跳？

心跳（Heartbeat）是 HermesAgent 的定期主动检查机制。AI 助手会按设定的间隔（默认 30 分钟）主动执行一次「检查」，通常用于：
- 检查新邮件并汇报
- 执行 HEARTBEAT.md 中定义的周期性任务
- 定时推送天气/新闻等信息

## 问题：24 小时心跳浪费资源

如果不设置活跃时段，心跳会在凌晨和深夜也持续运行，产生不必要的 API 调用费用。

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「心跳」区域：

1. 在「活跃时段」区域，设置 **开始时间** 和 **结束时间**（24 小时制，如 08:00 - 22:00）
2. 设置 **时区**（如 Asia/Shanghai、America/New_York）
3. 活跃时段外，心跳自动暂停

### 其他心跳参数

- **every** — 心跳间隔（如 "30m" 表示每 30 分钟一次）
- **model** — 心跳使用的模型（推荐用便宜的模型，如 gpt-4o-mini）
- **lightContext** — 启用轻量上下文模式，减少心跳的 token 消耗
- **directPolicy** — 私聊中的心跳策略：allow（允许）或 block（仅在群组中心跳）

## 推荐配置

**上班族：**
- activeHours: 08:00 - 23:00
- every: 30m
- model: gpt-4o-mini

**夜猫子：**
- activeHours: 10:00 - 24:00
- every: 45m

## 配置字段

对应配置路径：\`agents.defaults.heartbeat.activeHours\`

\`\`\`json
"heartbeat": {
  "every": "30m",
  "model": "gpt-4o-mini",
  "activeHours": {
    "start": "08:00",
    "end": "23:00",
    "timezone": "Asia/Shanghai"
  }
}
\`\`\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
