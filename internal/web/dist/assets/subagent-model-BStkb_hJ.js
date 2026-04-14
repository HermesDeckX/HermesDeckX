const n="子代理模型优化",e="为子代理设置独立的低成本模型，在保持主代理高质量的同时降低整体费用",t={body:`## 什么是子代理？

当 AI 助手需要执行复杂任务时，它可以「分派」（spawn）子代理来并行处理子任务。例如：
- 主代理分析需求，子代理分别去搜索资料、编写代码、执行测试
- 多个子代理可以同时运行，加速任务完成

## 优化策略：子代理使用低成本模型

子代理通常执行较简单的子任务，不需要最强的模型。为子代理设置低成本模型可以显著降低费用：

| 模型搭配 | 主代理 | 子代理 | 预估节省 |
|----------|--------|--------|----------|
| 方案 A | claude-sonnet | claude-haiku | ~70% |
| 方案 B | gpt-4o | gpt-4o-mini | ~80% |
| 方案 C | gemini-pro | gemini-flash | ~90% |

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「子代理」区域：

1. 在「子代理模型」中选择一个低成本模型
2. 设置并发限制（maxConcurrent，默认 3）
3. 设置最大嵌套深度（maxSpawnDepth，默认 1 = 不嵌套）

### 关键参数

- **model** — 子代理使用的模型（可以和主模型不同）
- **maxConcurrent** — 同时运行的最大子代理数
- **maxSpawnDepth** — 最大嵌套深度（1-5，不建议超过 2）
- **maxChildrenPerAgent** — 单个代理最多产生的子代理数（1-20，默认 5）
- **runTimeoutSeconds** — 子代理运行超时时间
- **archiveAfterMinutes** — 子代理完成后多久自动归档
- **thinking** — 子代理的思考模式（建议设为 off 或 minimal 以节省 token）

## 配置字段

对应配置路径：\`agents.defaults.subagents\`

\`\`\`json
"subagents": {
  "model": "gpt-4o-mini",
  "maxConcurrent": 3,
  "maxSpawnDepth": 1,
  "thinking": "off"
}
\`\`\``},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
